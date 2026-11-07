
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const results: string[] = [];

  try {
    const dbUrl = Deno.env.get("SUPABASE_DB_URL") ?? "";
    if (!dbUrl) {
      return new Response(
        JSON.stringify({ error: "SUPABASE_DB_URL not set" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const client = new Client(dbUrl);
    await client.connect();

    const statements = [
      `DROP POLICY IF EXISTS "Admin: read all profiles" ON profiles;`,
      `DROP POLICY IF EXISTS "Assessor: read profiles" ON profiles;`,
      `DROP POLICY IF EXISTS "Admin: read all demands" ON demands;`,
      `DROP POLICY IF EXISTS "Admin: update all demands" ON demands;`,
      `DROP POLICY IF EXISTS "Assessor: read all demands" ON demands;`,
      `DROP POLICY IF EXISTS "Assessor: update demands" ON demands;`,
    ];

    for (const sql of statements) {
      try {
        await client.queryObject(sql);
        results.push(`OK: ${sql.slice(0, 60)}...`);
      } catch (e) {
        results.push(`ERRO: ${(e as Error).message}`);
      }
    }

    await client.end();

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message, results }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
