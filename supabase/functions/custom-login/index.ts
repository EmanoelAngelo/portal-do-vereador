import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function getEnvUrl(): string {
  for (const c of [Deno.env.get("SUPABASE_URL"), Deno.env.get("VITE_PUBLIC_SUPABASE_URL")]) {
    if (c && c.startsWith("https://")) return c.trim().replace(/\/$/, "");
  }
  return "";
}

function getEnvServiceKey(): string {
  return (Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const log: string[] = [];

  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return new Response(JSON.stringify({ error: "E-mail e senha obrigatorios." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = getEnvUrl();
    const SERVICE_ROLE_KEY = getEnvServiceKey();
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const authKey = ANON_KEY || SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !authKey) {
      log.push("FATAL: env missing");
      return new Response(JSON.stringify({ error: "Erro de configuracao.", log }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, authKey);

    log.push("step1: calling login_with_password RPC");
    const { data: loginResult, error: loginErr } = await supabase.rpc(
      "login_with_password", { p_email: email.trim().toLowerCase(), p_password: password }
    );

    if (loginErr) {
      log.push("step1 error: " + loginErr.message);
      return new Response(JSON.stringify({ error: "Erro SQL: " + loginErr.message, log }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = loginResult as { ok: boolean; error?: string; user_id?: string; email?: string; role?: string; full_name?: string; };

    if (!result.ok) {
      return new Response(JSON.stringify({ error: result.error ?? "E-mail ou senha invalidos.", log }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    log.push("step2: trying signInWithPassword server-side");
    const { data: signData, error: signErr } = await supabase.auth.signInWithPassword({
      email: email.trim(), password,
    });

    if (!signErr && signData?.session) {
      log.push("step2 success");
      return new Response(JSON.stringify({
        success: true, session: signData.session,
        user: { id: result.user_id, email: result.email }, role: result.role, log,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    log.push("step2 failed: " + (signErr?.message ?? "no session"));

    log.push("step3: trying REST /auth/v1/token");
    const tokenRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": authKey, "Authorization": "Bearer " + authKey },
      body: JSON.stringify({ email: email.trim(), password }),
    });

    const tokenRaw = await tokenRes.text();
    log.push("step3 status: " + tokenRes.status);

    let tokenData: Record<string, unknown> = {};
    try { tokenData = JSON.parse(tokenRaw); } catch { /* ignore */ }

    if (tokenRes.ok && tokenData.access_token) {
      log.push("step3 success via REST");
      return new Response(JSON.stringify({
        success: true,
        session: { access_token: tokenData.access_token, refresh_token: tokenData.refresh_token, expires_in: tokenData.expires_in, token_type: tokenData.token_type, user: tokenData.user },
        user: { id: result.user_id, email: result.email }, role: result.role, log,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    log.push("step4: noSession fallback");
    return new Response(JSON.stringify({
      success: true, session: null, noSession: true,
      user: { id: result.user_id, email: result.email }, role: result.role, full_name: result.full_name, log,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    log.push("exception: " + (e as Error).message);
    return new Response(JSON.stringify({ error: "Erro interno: " + (e as Error).message, log }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
