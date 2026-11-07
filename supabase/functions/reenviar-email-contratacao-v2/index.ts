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

function buildEmailHTML(notif: Record<string, unknown>, vagaCreatedAt: string): string {
  const title = (notif.titulo as string) || "Nova Notificação";
  const message = (notif.mensagem as string) || "";
  const sender = (notif.remetente_nome as string) || "Sistema Arthur Halal";
  const date = formatBRDate((notif.created_at as string) || Date.now());
  const typeLabel = (notif.tipo as string) || "Notificação";

  return `
    <div style="font-family: 'Segoe UI', system-ui, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #0D1629; color: #fff; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #22C55E; margin: 0 0 4px; font-size: 20px; font-weight: 800;">${title}</h2>
        <p style="color: #3BBFD4; font-size: 11px; letter-spacing: 2px; text-transform: uppercase;">Gabinete Arthur Halal</p>
      </div>
      <div style="background: rgba(255,255,255,0.06); border-radius: 12px; padding: 16px; margin-bottom: 20px;">
        <p style="color: rgba(255,255,255,0.50); font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px;">${typeLabel}</p>
        <p style="color: rgba(255,255,255,0.75); font-size: 14px; line-height: 1.6; margin: 0 0 12px;">${message}</p>
        ${vagaCreatedAt ? `<p style="color: rgba(255,255,255,0.50); font-size: 12px; margin: 0 0 8px;">📅 Data de criação da vaga: ${vagaCreatedAt}</p>` : ""}
        <div style="font-size: 12px; color: rgba(255,255,255,0.40);">
          <span>De: ${sender}</span>
          <span style="margin-left: 8px;">· ${date}</span>
        </div>
      </div>
      <p style="font-size: 11px; color: rgba(255,255,255,0.25); text-align: center; margin: 0;">
        Você recebeu esta notificação porque tem uma conta no Sistema de Oportunidades do Vereador Arthur Halal.<br>
        Para deixar de receber, acesse as configurações do seu perfil.
      </p>
    </div>
  `;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const logs: string[] = [];
  const startTime = new Date().toISOString();
  logs.push(`[${startTime}] reenviar-email-contratacao v1 iniciado`);

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = getServiceRoleKey();

  if (!resendApiKey || !supabaseUrl || !serviceRoleKey) {
    const missing = [];
    if (!resendApiKey) missing.push("RESEND_API_KEY");
    if (!supabaseUrl) missing.push("SUPABASE_URL");
    if (!serviceRoleKey) missing.push("SERVICE_ROLE_KEY");
    logs.push(`FATAL: Config missing: ${missing.join(", ")}`);
    return new Response(JSON.stringify({ success: false, error: "Configuração incompleta", logs }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const NOTIF_ID = "36c7865f-450b-4dcc-a8f0-84c02eec122b";
    logs.push(`Processando notificação específica: ${NOTIF_ID}`);

    // 1. Ler a notificação
    const { data: notif, error: notifErr } = await supabase
      .from("notificacoes")
      .select("*")
      .eq("id", NOTIF_ID)
      .single();

    if (notifErr || !notif) {
      logs.push(`ERRO: Notificação não encontrada: ${notifErr?.message || "null"}`);
      return new Response(JSON.stringify({ success: false, error: "Notificação não encontrada", logs }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = notif.user_id as string;
    logs.push(`Notificação: tipo=${notif.tipo}, user_id=${userId}, titulo="${(notif.titulo as string)?.substring(0, 50)}"`);

    // 2. Buscar perfil do usuário
    let userRole = "unknown";
    let isCitizen = false;
    let hasCurriculo = false;
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, curriculo_pdf, full_name")
        .eq("id", userId)
        .single();
      userRole = (profile?.role as string) || "unknown";
      isCitizen = profile?.role === "citizen" || profile?.role === "cidadao";
      if (profile?.curriculo_pdf && profile.curriculo_pdf.length > 5) {
        hasCurriculo = true;
      }
      logs.push(`Perfil: name="${profile?.full_name || "?"}", role=${userRole}, isCitizen=${isCitizen}, hasCurriculo=${hasCurriculo}`);
    } catch (e) {
      logs.push(`ERRO ao buscar perfil: ${e instanceof Error ? e.message : String(e)}`);
    }

    // 3. Buscar email do usuário via auth.admin
    let userEmail: string | null = null;
    let hasConfirmedEmail = false;
    try {
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      if (userData?.user) {
        userEmail = userData.user.email || null;
        hasConfirmedEmail = !!userData.user.email_confirmed_at;
        logs.push(`Auth: email="${userEmail || "null"}", confirmed=${hasConfirmedEmail}`);
      } else {
        logs.push(`Auth: usuário não encontrado para id=${userId}`);
      }
    } catch (e) {
      logs.push(`ERRO auth.admin.getUserById: ${e instanceof Error ? e.message : String(e)}`);
    }

    if (!userEmail) {
      logs.push("SKIP: Sem email no Auth");
      await supabase.from("notificacoes").update({ email_enviado: false, email_enviado_em: formatBRDate(new Date()) }).eq("id", NOTIF_ID);
      return new Response(JSON.stringify({ success: true, sent: false, reason: "no_email", logs }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Decidir se envia
    const shouldSend = hasConfirmedEmail && (!isCitizen || hasCurriculo);
    if (!shouldSend) {
      logs.push("SKIP: Email não confirmado ou cidadão sem currículo");
      await supabase.from("notificacoes").update({ email_enviado: false, email_enviado_em: formatBRDate(new Date()) }).eq("id", NOTIF_ID);
      return new Response(JSON.stringify({ success: true, sent: false, reason: "not_eligible", logs }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Buscar data de criação da vaga
    let vagaCreatedAt = "";
    if (notif.referencia_tipo === "vaga" && notif.referencia_id) {
      try {
        const { data: vaga } = await supabase
          .from("vagas")
          .select("created_at")
          .eq("id", notif.referencia_id)
          .single();
        if (vaga?.created_at) {
          vagaCreatedAt = formatBRDate(vaga.created_at);
        }
      } catch (_) { /* silent */ }
    }

    // 6. Enviar email via Resend
    logs.push(`Enviando email para: ${userEmail}`);
    const html = buildEmailHTML(notif, vagaCreatedAt);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Gabinete Arthur Halal <gabinete@emanoel.shop>",
        to: [userEmail],
        subject: notif.titulo || "Notificação — Sistema Arthur Halal",
        html,
      }),
    });

    const resBody = await res.json();
    const resendId = resBody.id || "none";
    logs.push(`Resend: status=${res.status}, id=${resendId}`);

    if (res.ok) {
      await supabase.from("notificacoes").update({ email_enviado: true, email_enviado_em: formatBRDate(new Date()) }).eq("id", NOTIF_ID);
      logs.push(`✅ Email enviado com sucesso para ${userEmail}`);
      return new Response(JSON.stringify({ success: true, sent: true, resendId, logs }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      const errorMsg = resBody.message || resBody.error || `HTTP ${res.status}`;
      logs.push(`❌ Resend falhou: ${errorMsg}`);
      await supabase.from("notificacoes").update({ email_enviado: false, email_enviado_em: formatBRDate(new Date()) }).eq("id", NOTIF_ID);
      return new Response(JSON.stringify({ success: false, error: errorMsg, sent: false, logs }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logs.push(`FATAL: ${errMsg}`);
    return new Response(JSON.stringify({ success: false, error: errMsg, logs }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
