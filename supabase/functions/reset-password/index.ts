import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getEnvUrl(): string {
  for (const c of [Deno.env.get("SUPABASE_URL"), Deno.env.get("VITE_PUBLIC_SUPABASE_URL")]) {
    if (c && c.startsWith("https://")) return c.trim().replace(/\/$/, "");
  }
  return "";
}

function getEnvServiceKey(): string {
  const key = Deno.env.get("SERVICE_ROLE_KEY");
  if (key && key.length > 20) return key.trim();
  return "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { email, code, password } = await req.json();
    if (!email || !code || !password) {
      return new Response(JSON.stringify({ error: "Email, codigo e nova senha sao obrigatorios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = getEnvUrl();
    const supabaseKey = getEnvServiceKey();
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: codes, error: findErr } = await supabase
      .from("verification_codes").select("*")
      .eq("email", email.trim().toLowerCase()).eq("code", code).eq("purpose", "forgot")
      .is("used_at", null).gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }).limit(1);

    if (findErr || !codes || codes.length === 0) {
      return new Response(JSON.stringify({ error: "Codigo invalido ou expirado." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("verification_codes")
      .update({ used_at: new Date().toISOString() }).eq("id", codes[0].id);

    let userId: string | null = null;
    try {
      const { data: rpcData } = await supabase.rpc("get_user_by_email", { email_arg: email.trim().toLowerCase() });
      if (rpcData && rpcData.length > 0) userId = rpcData[0].id;
    } catch (rpcErr) { console.error("RPC error:", rpcErr); }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Usuario nao encontrado." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, { password });
    if (updateErr) {
      return new Response(JSON.stringify({ error: updateErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true, message: "Senha redefinida com sucesso! Faca login com a nova senha.",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});