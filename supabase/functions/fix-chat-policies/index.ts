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

    const results: { sql: string; status: string; error?: string }[] = [];

    // SQL commands to fix RLS policies
    const sqlCommands = [
      // Drop old restrictive policies
      `DROP POLICY IF EXISTS mensagens_chat_select_participant ON public.mensagens_chat`,
      `DROP POLICY IF EXISTS mensagens_chat_insert_auth ON public.mensagens_chat`,
      `DROP POLICY IF EXISTS mensagens_chat_update_participant ON public.mensagens_chat`,
      `DROP POLICY IF EXISTS mensagens_chat_items_select_auth ON public.mensagens_chat_items`,
      `DROP POLICY IF EXISTS mensagens_chat_items_insert_auth ON public.mensagens_chat_items`,
      // Create new open policies (service key protects edge function endpoints)
      `CREATE POLICY IF NOT EXISTS mensagens_chat_select_public ON public.mensagens_chat FOR SELECT TO public USING (true)`,
      `CREATE POLICY IF NOT EXISTS mensagens_chat_insert_public ON public.mensagens_chat FOR INSERT TO public WITH CHECK (true)`,
      `CREATE POLICY IF NOT EXISTS mensagens_chat_update_public ON public.mensagens_chat FOR UPDATE TO public USING (true)`,
      `CREATE POLICY IF NOT EXISTS mensagens_chat_items_select_public ON public.mensagens_chat_items FOR SELECT TO public USING (true)`,
      `CREATE POLICY IF NOT EXISTS mensagens_chat_items_insert_public ON public.mensagens_chat_items FOR INSERT TO public WITH CHECK (true)`,
      // Enable realtime
      `ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.mensagens_chat`,
      `ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.mensagens_chat_items`,
    ];

    for (const sql of sqlCommands) {
      try {
        const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: "POST",
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sql }),
        });
        const data = await res.text();
        results.push({ sql: sql.substring(0, 60) + "...", status: res.ok ? "OK" : "WARN", error: res.ok ? undefined : data });
      } catch (e) {
        results.push({ sql: sql.substring(0, 60) + "...", status: "ERROR", error: e instanceof Error ? e.message : String(e) });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
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
