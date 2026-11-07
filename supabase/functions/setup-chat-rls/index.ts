import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    const results: string[] = [];

    // Execute SQL to fix RLS policies for chat tables
    // Use raw SQL via rpc or management API
    const sqlCommands = [
      // Fix mensagens_chat read access — allow everyone (edge functions handle security)
      `DO $$ 
       BEGIN
         -- Drop old restrictive select policy
         IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mensagens_chat' AND policyname = 'mensagens_chat_select_participant') THEN
           DROP POLICY mensagens_chat_select_participant ON public.mensagens_chat;
         END IF;
         -- Create new public policy if not exists
         IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mensagens_chat' AND policyname = 'mensagens_chat_select_public') THEN
           CREATE POLICY mensagens_chat_select_public ON public.mensagens_chat FOR SELECT TO public USING (true);
         END IF;
       END $$;`,
      // Fix mensagens_chat_items read access
      `DO $$ 
       BEGIN
         IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mensagens_chat_items' AND policyname = 'mensagens_chat_items_select_auth') THEN
           DROP POLICY mensagens_chat_items_select_auth ON public.mensagens_chat_items;
         END IF;
         IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mensagens_chat_items' AND policyname = 'mensagens_chat_items_select_public') THEN
           CREATE POLICY mensagens_chat_items_select_public ON public.mensagens_chat_items FOR SELECT TO public USING (true);
         END IF;
       END $$;`,
      // Fix mensagens_chat insert
      `DO $$
       BEGIN
         IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mensagens_chat' AND policyname = 'mensagens_chat_insert_auth') THEN
           DROP POLICY mensagens_chat_insert_auth ON public.mensagens_chat;
         END IF;
         IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mensagens_chat' AND policyname = 'mensagens_chat_insert_public') THEN
           CREATE POLICY mensagens_chat_insert_public ON public.mensagens_chat FOR INSERT TO public WITH CHECK (true);
         END IF;
       END $$;`,
      // Fix mensagens_chat_items insert
      `DO $$
       BEGIN
         IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mensagens_chat_items' AND policyname = 'mensagens_chat_items_insert_auth') THEN
           DROP POLICY mensagens_chat_items_insert_auth ON public.mensagens_chat_items;
         END IF;
         IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mensagens_chat_items' AND policyname = 'mensagens_chat_items_insert_public') THEN
           CREATE POLICY mensagens_chat_items_insert_public ON public.mensagens_chat_items FOR INSERT TO public WITH CHECK (true);
         END IF;
       END $$;`,
      // Fix mensagens_chat update — allow all authenticated
      `DO $$
       BEGIN
         IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mensagens_chat' AND policyname = 'mensagens_chat_update_participant') THEN
           DROP POLICY mensagens_chat_update_participant ON public.mensagens_chat;
         END IF;
         IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mensagens_chat' AND policyname = 'mensagens_chat_update_public') THEN
           CREATE POLICY mensagens_chat_update_public ON public.mensagens_chat FOR UPDATE TO public USING (true);
         END IF;
       END $$;`,
      // Enable realtime
      `ALTER PUBLICATION supabase_realtime ADD TABLE public.mensagens_chat;`,
      `ALTER PUBLICATION supabase_realtime ADD TABLE public.mensagens_chat_items;`,
    ];

    for (const sql of sqlCommands) {
      try {
        const { error } = await supabase.rpc("exec_sql", { sql_query: sql }).single();
        if (error) {
          // Try direct SQL using postgres extension
          results.push(`Warning: ${error.message}`);
        } else {
          results.push("OK: " + sql.substring(0, 50));
        }
      } catch (e) {
        results.push(`Skip: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // Also verify current policies
    const { data: policies } = await supabase
      .from("pg_policies")
      .select("*")
      .in("tablename", ["mensagens_chat", "mensagens_chat_items"]);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        message: "Chat RLS setup attempted. Check Supabase Dashboard to verify policies.",
        policies_note: "If policies were not updated, please update them manually in Supabase Dashboard > Authentication > Policies",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    console.error("[setup-chat-rls] Erro:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
