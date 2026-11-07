import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const report: string[] = [];

  try {
    const supabaseUrl = (Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_PUBLIC_SUPABASE_URL") || "").trim().replace(/\/$/, "");
    report.push("SUPABASE_URL: " + (supabaseUrl ? supabaseUrl.slice(0, 50) + "..." : "MISSING"));

    const serviceKey = Deno.env.get("SERVICE_ROLE_KEY");
    if (!serviceKey) {
      report.push("SERVICE_ROLE_KEY: MISSING (empty/null)");
    } else if (serviceKey.trim().length < 20) {
      report.push("SERVICE_ROLE_KEY: PRESENT but too short (len=" + serviceKey.trim().length + ") - likely INVALID");
    } else {
      report.push("SERVICE_ROLE_KEY: PRESENT (len=" + serviceKey.trim().length + ", starts with " + serviceKey.trim().slice(0, 10) + "...)");
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("VITE_PUBLIC_SUPABASE_ANON_KEY") || "";
    report.push("ANON_KEY: " + (anonKey ? "present (len=" + anonKey.length + ")" : "MISSING"));

    if (supabaseUrl && serviceKey && serviceKey.trim().length > 20) {
      const supabase = createClient(supabaseUrl, serviceKey.trim(), {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data: users, error: usersErr } = await supabase.auth.admin.listUsers({ perPage: 1 });
      if (usersErr) {
        report.push("AUTH TEST (listUsers): FAILED - " + usersErr.message);
        report.push("  => The service_role key is likely INVALID or EXPIRED.");
      } else {
        report.push("AUTH TEST (listUsers): OK - total users: " + (users?.total ?? 0));
      }

      const { data: profiles, error: dbErr } = await supabase.from("profiles").select("id").limit(1);
      if (dbErr) {
        report.push("DB TEST (profiles): FAILED - " + dbErr.message);
      } else {
        report.push("DB TEST (profiles): OK - " + (profiles?.length ?? 0) + " rows");
      }
    } else {
      report.push("SKIPPED connection tests: missing URL or valid key");
    }

    return new Response(JSON.stringify({ status: "ok", report }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    report.push("FATAL: " + (e as Error).message);
    return new Response(JSON.stringify({ status: "error", report }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});