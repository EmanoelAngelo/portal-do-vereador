import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getResendApiKey(): string {
  const envKey = Deno.env.get("RESEND_API_KEY");
  if (envKey && envKey.startsWith("re_")) return envKey.trim().replace(/^["']|["']$/g, "");
  return "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => null);
    const testEmail = body?.testEmail || "test@example.com";
    const resendApiKey = getResendApiKey();

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          resendConfigured: false,
          message: "RESEND_API_KEY nao configurada ou invalida.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ArthurHalal@emanoel.shop",
        to: testEmail,
        subject: "Teste de configuracao - Arthur Halal",
        html: "<div style='font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #020C1B; color: #fff; border-radius: 12px;'><h2 style='color: #E8A020;'>Teste de Email</h2><p style='color: rgba(255,255,255,0.7);'>Se voce recebeu este email, o Resend esta configurado corretamente!</p></div>",
      }),
    });

    const resText = await res.text();
    let resData = null;
    try {
      resData = JSON.parse(resText);
    } catch {
      resData = { raw: resText };
    }

    if (res.ok) {
      return new Response(
        JSON.stringify({
          success: true,
          resendConfigured: true,
          emailSent: true,
          message: "Email de teste enviado com sucesso! Verifique sua caixa de entrada.",
          resendResponse: resData,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        resendConfigured: true,
        emailSent: false,
        message: `Resend retornou erro ${res.status}: ${resData?.message || resData?.error || resText || "Erro desconhecido"}`,
        error: resData,
        status: res.status,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({
        success: false,
        resendConfigured: false,
        message: `Erro interno: ${errorMsg}`,
        error: errorMsg,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
