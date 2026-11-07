import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function generateCode(): string {
  return String(Math.floor(10000 + Math.random() * 90000));
}

function getSupabaseUrl(): string {
  const url = Deno.env.get("SUPABASE_URL");
  if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
    return url.replace(/\/$/, "");
  }
  return "";
}

function getSupabaseKey(): string {
  return (Deno.env.get("SERVICE_ROLE_KEY") || "").trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ success: false, error: "Corpo invalido." });
    }

    const email = String(body.email || "").trim().toLowerCase();
    const role = String(body.role || "citizen");
    const userMetadata = (body.user_metadata as Record<string, unknown>) || {};
    const purpose = String(body.purpose || "register");

    if (!email) return json({ success: false, error: "Email obrigatorio." });

    const supabaseUrl = getSupabaseUrl();
    const supabaseKey = getSupabaseKey();

    if (!supabaseUrl || !supabaseKey) {
      return json({ success: false, error: "Configuracao do servidor incompleta. Configure SERVICE_ROLE_KEY." });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const code = generateCode();
    // ⏰ 30 minutos (era 15)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    // Invalidate old codes
    await supabase.from("verification_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("email", email)
      .is("used_at", null);

    // Insert new code
    const { error: insErr } = await supabase.from("verification_codes").insert({
      email, code, role, user_metadata: userMetadata, purpose, expires_at: expiresAt,
    });

    if (insErr) {
      return json({ success: false, error: "Erro ao gerar codigo. Detalhe: " + String(insErr.message || insErr) });
    }

    // Send email via Resend
    let emailSent = false;
    const resendKey = (Deno.env.get("RESEND_API_KEY") || "").trim();

    if (resendKey.startsWith("re_")) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 8000);
        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + resendKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "ArthurHalal@emanoel.shop",
            to: email,
            subject: "Novo Codigo de Verificacao — Arthur Halal",
            html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#020C1B;color:#fff;border-radius:12px"><div style="text-align:center;margin-bottom:24px"><h2 style="color:#E8A020;margin:0;font-size:20px">Novo Codigo de Verificacao</h2><p style="color:rgba(255,255,255,0.6);margin:8px 0 0;font-size:13px">Arthur Halal — Vereador de Pelotas</p></div><p style="color:rgba(255,255,255,0.8);font-size:14px;line-height:1.6">Use o codigo abaixo para confirmar seu e-mail:</p><div style="background:rgba(232,160,32,0.15);border:1px solid rgba(232,160,32,0.3);border-radius:8px;padding:20px;text-align:center;margin:20px 0"><p style="color:rgba(255,255,255,0.6);margin:0 0 8px;font-size:12px;text-transform:uppercase">Seu codigo</p><h1 style="font-size:40px;letter-spacing:12px;color:#E8A020;margin:0;font-weight:800">${code}</h1></div><p style="color:rgba(255,255,255,0.5);font-size:12px;text-align:center">Valido por 30 minutos.</p></div>`,
          }),
          signal: ctrl.signal,
        });
        clearTimeout(t);
        emailSent = r.ok;
      } catch (emailErr) {
        console.error("[resend-code] Email error:", emailErr);
      }
    }

    return json({
      success: true,
      emailSent,
      code: emailSent ? undefined : code,
      message: emailSent ? "Novo codigo enviado!" : "Novo codigo gerado!",
    });
  } catch (fatalErr) {
    const msg = fatalErr instanceof Error ? fatalErr.message : String(fatalErr);
    return json({ success: false, error: "Erro interno.", detail: msg });
  }
});
