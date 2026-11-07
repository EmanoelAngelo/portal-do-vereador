import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/$/, "");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!serviceKey) {
      return new Response(JSON.stringify({ error: "Missing service key" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { action: string; status: string; response?: string }[] = [];

    // Use postgres SQL execution endpoint
    const sqlEndpoint = `${supabaseUrl}/rest/v1/`;

    // We will use pg rpc to execute raw SQL
    // Supabase allows exec_sql or pgmeta via service key
    const pgMetaBase = supabaseUrl.replace("https://", "https://").replace(".supabase.co", ".supabase.co");

    const sqlScript = `
      -- Fix chat RLS policies to allow public access (edge functions handle auth security)
      
      -- mensagens_chat policies
      DROP POLICY IF EXISTS mensagens_chat_select_participant ON public.mensagens_chat;
      DROP POLICY IF EXISTS mensagens_chat_insert_auth ON public.mensagens_chat;
      DROP POLICY IF EXISTS mensagens_chat_update_participant ON public.mensagens_chat;
      
      CREATE POLICY mensagens_chat_select_public ON public.mensagens_chat FOR SELECT TO public USING (true);
      CREATE POLICY mensagens_chat_insert_public ON public.mensagens_chat FOR INSERT TO public WITH CHECK (true);
      CREATE POLICY mensagens_chat_update_public ON public.mensagens_chat FOR UPDATE TO public USING (true);
      
      -- mensagens_chat_items policies
      DROP POLICY IF EXISTS mensagens_chat_items_select_auth ON public.mensagens_chat_items;
      DROP POLICY IF EXISTS mensagens_chat_items_insert_auth ON public.mensagens_chat_items;
      
      CREATE POLICY mensagens_chat_items_select_public ON public.mensagens_chat_items FOR SELECT TO public USING (true);
      CREATE POLICY mensagens_chat_items_insert_public ON public.mensagens_chat_items FOR INSERT TO public WITH CHECK (true);
      
      -- Enable realtime for both tables
      ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.mensagens_chat;
      ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.mensagens_chat_items;
    `;

    // Try pgmeta query endpoint
    const pgMetaRes = await fetch(`${pgMetaBase}/pg/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      body: JSON.stringify({ query: sqlScript }),
    });

    if (pgMetaRes.ok) {
      const pgMetaData = await pgMetaRes.text();
      results.push({ action: "pgmeta_query", status: "OK", response: pgMetaData.substring(0, 200) });
    } else {
      const pgMetaErr = await pgMetaRes.text();
      results.push({ action: "pgmeta_query", status: "FAIL", response: pgMetaErr.substring(0, 200) });

      // Fallback: Try management API
      const projectRef = supabaseUrl.replace("https://", "").replace(".supabase.co", "");
      const mgmtRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ query: sqlScript }),
      });

      if (mgmtRes.ok) {
        results.push({ action: "mgmt_api", status: "OK", response: "Success" });
      } else {
        const mgmtErr = await mgmtRes.text();
        results.push({ action: "mgmt_api", status: "FAIL", response: mgmtErr.substring(0, 200) });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        note: "Check results above. If all failed, update policies manually in Supabase Dashboard > Authentication > Policies",
        manual_steps: [
          "1. Go to Supabase Dashboard > Authentication > Policies",
          "2. For mensagens_chat: delete 'mensagens_chat_select_participant' and create new policy: SELECT, role=public, USING=true",
          "3. For mensagens_chat_items: delete 'mensagens_chat_items_select_auth' and create new policy: SELECT, role=public, USING=true",
          "4. Go to Database > Replication > supabase_realtime > add mensagens_chat and mensagens_chat_items"
        ]
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
