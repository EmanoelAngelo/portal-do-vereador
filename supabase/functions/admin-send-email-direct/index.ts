import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getServiceRoleKey(): string {
  const possibleNames = [
    "SERVICE_ROLE_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SERVICE_KEY",
    "VITE_SUPABASE_SERVICE_ROLE_KEY",
    "VITE_SUPABASE_SERVICE_KEY",
  ];
  for (const name of possibleNames) {
    const val = Deno.env.get(name);
    if (val && val.trim().length > 20) return val.trim();
  }
  return "";
}

function formatBRDate(date: string | Date | number): string {
  return new Date(date).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { notifId, userId, email, tipo, titulo, mensagem } = body;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = getServiceRoleKey();

    if (!resendApiKey || !supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ success: false, error: "Missing config" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Send email via Resend - SEM link de redirecionamento (regra de negócio)
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Gabinete Arthur Halal <gabinete@emanoel.shop>",
        to: [email],
        subject: titulo || "Notificação — Sistema Arthur Halal",
        html: `
          <div style="font-family: 'Segoe UI', system-ui, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #0D1629; color: #fff; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="font-size: 32px; margin-bottom: 8px;">✅</div>
              <h2 style="color: #22C55E; margin: 0 0 4px; font-size: 20px; font-weight: 800;">${titulo}</h2>
              <p style="color: #3BBFD4; font-size: 11px; letter-spacing: 2px; text-transform: uppercase;">Gabinete Arthur Halal</p>
            </div>
            <div style="background: rgba(255,255,255,0.06); border-radius: 12px; padding: 16px; margin-bottom: 20px;">
              <p style="color: rgba(255,255,255,0.50); font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px;">${tipo}</p>
              <p style="color: rgba(255,255,255,0.75); font-size: 14px; line-height: 1.6; margin: 0 0 12px;">${mensagem}</p>
              <div style="font-size: 12px; color: rgba(255,255,255,0.40);">
                <span>De: Gabinete Arthur Halal</span>
                <span style="margin-left: 8px;">· ${formatBRDate(new Date())}</span>
              </div>
            </div>
            <p style="font-size: 11px; color: rgba(255,255,255,0.25); text-align: center; margin: 0;">
              Você recebeu esta notificação porque tem uma conta no Sistema de Oportunidades do Vereador Arthur Halal.<br>
              Para deixar de receber, acesse as configurações do seu perfil.
            </p>
          </div>
        `,
      }),
    });

    const resBody = await res.json();

    if (!res.ok) {
      return new Response(JSON.stringify({ success: false, error: resBody.message || `Resend error ${res.status}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update notification status
    if (notifId) {
      const { error: updateErr } = await supabase
        .from("notificacoes")
        .update({
          email_enviado: true,
          email_enviado_em: formatBRDate(new Date()),
        })
        .eq("id", notifId);

      if (updateErr) {
        console.error("[admin-send-email] Update error:", updateErr);
      }
    }

    return new Response(JSON.stringify({ success: true, id: resBody.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
