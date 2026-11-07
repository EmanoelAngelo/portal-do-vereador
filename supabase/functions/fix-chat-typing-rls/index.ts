import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (_req: Request) => {
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const results: string[] = [];

  // Allow insert for anyone (anonymous + authenticated)
  const { error: insErr } = await supabaseAdmin.rpc("create_policy_if_not_exists", {
    p_table: "chat_typing",
    p_policy: "chat_typing_insert_all",
    p_cmd: "INSERT",
    p_roles: ["anon", "authenticated"],
    p_check: "true",
    p_using: null,
  });

  if (insErr) {
    // Fallback: execute raw SQL via RPC
    const { error: sqlErr } = await supabaseAdmin.rpc("exec_sql", {
      sql_text: `CREATE POLICY "chat_typing_insert_all" ON chat_typing FOR INSERT TO anon, authenticated WITH CHECK (true);`
    });
    if (sqlErr) {
      results.push(`Insert policy failed: ${sqlErr.message}`);
    } else {
      results.push("Insert policy CREATED via fallback");
    }
  } else {
    results.push("Insert policy CREATED via RPC");
  }

  // Allow select for anyone
  const { error: selErr } = await supabaseAdmin.rpc("create_policy_if_not_exists", {
    p_table: "chat_typing",
    p_policy: "chat_typing_select_all",
    p_cmd: "SELECT",
    p_roles: ["anon", "authenticated"],
    p_check: null,
    p_using: "true",
  });

  if (selErr) {
    const { error: sqlErr } = await supabaseAdmin.rpc("exec_sql", {
      sql_text: `CREATE POLICY "chat_typing_select_all" ON chat_typing FOR SELECT TO anon, authenticated USING (true);`
    });
    if (sqlErr) {
      results.push(`Select policy failed: ${sqlErr.message}`);
    } else {
      results.push("Select policy CREATED via fallback");
    }
  } else {
    results.push("Select policy CREATED via RPC");
  }

  // Verify
  const { data: policies, error: polErr } = await supabaseAdmin
    .from("pg_policies")
    .select("policyname, cmd")
    .eq("tablename", "chat_typing");

  return new Response(JSON.stringify({
    success: true,
    results,
    policies: polErr ? `Error: ${polErr.message}` : policies,
  }), { headers: { "Content-Type": "application/json" } });
});
