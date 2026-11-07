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
    const { email } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: "Email é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = getEnvUrl();
    const supabaseKey = getEnvServiceKey();
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let userExists = false;
    try {
      const { data: rpcData } = await supabase.rpc("get_user_by_email", { email_arg: email.trim().toLowerCase() });
      if (rpcData && rpcData.length > 0) userExists = true;
    } catch (rpcErr) {
      console.error("RPC error:", rpcErr);
    }

    if (!userExists) {
      return new Response(JSON.stringify({ error: "Email não encontrado no sistema." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const code = String(Math.floor(10000 + Math.random() * 90000));

    await supabase.from("verification_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("email", email.trim().toLowerCase())
      .is("used_at", null);

    const { error: insertErr } = await supabase.from("verification_codes").insert({
      email: email.trim().toLowerCase(), code, role: "reset_password",
      purpose: "forgot", expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });

    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY")?.trim() || "";
    let emailSent = false;

    if (resendKey.startsWith("re_")) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": "Bearer " + resendKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "ArthurHalal@emanuel.shop",
            to: email.trim().toLowerCase(),
            subject: "Codigo de recuperacao de senha",
            html: `<div style="font-family:sans-serif;padding:24px"><h2>Recuperacao de Senha</h2><p>Use o codigo:</p><h1 style="font-size:36px;letter-spacing:8px">${code}</h1><p>Valido por 15 minutos.</p></div>`,
          }),
        });
        if (res.ok) emailSent = true;
      } catch (e) { console.error("Resend error:", e); }
    }

    return new Response(JSON.stringify({
      success: true, emailSent,
      message: emailSent ? "Codigo enviado! Verifique seu e-mail." : "Codigo gerado. Verifique seu e-mail.",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});