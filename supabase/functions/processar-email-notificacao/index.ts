import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const SITE_URL = (Deno.env.get("SITE_URL") || "https://emanuel.shop").replace(/\/$/, "");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getServiceRoleKey(): string {
  const possibleNames = ["SERVICE_ROLE_KEY","SUPABASE_SERVICE_ROLE_KEY","SUPABASE_SERVICE_KEY"];
  for (const name of possibleNames) {
    const val = Deno.env.get(name);
    if (val && val.trim().length > 20) return val.trim();
  }
  return "";
}

function formatBRDate(date: string | Date | number): string {
  return new Date(date).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function formatBRDateLong(date: string | Date | number): string {
  return new Date(date).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "long", year: "numeric" });
}

function buildNewsEmailHTML(notif: Record<string, unknown>, newsData: Record<string, unknown> | null): string {
  const title = newsData?.title || (notif.titulo as string) || "Nova Notícia";
  const summary = (newsData?.summary as string) || (notif.mensagem as string) || "";
  const imageUrl = (newsData?.image_url as string) || "";
  const category = (newsData?.category as string) || "Geral";
  const slug = (newsData?.slug as string) || (notif.referencia_id as string) || "";
  const author = (newsData?.author as string) || "Arthur Halal";
  const date = formatBRDateLong((newsData?.published_at as string) || (notif.created_at as string) || new Date().toISOString());
  const newsUrl = `${SITE_URL}/noticias/${slug}`;

  const categoryColors: Record<string, string> = {
    "Mandato": "#0369A1", "Ação Social": "#DC2626", "Tecnologia": "#7C3AED",
    "Emprego": "#059669", "Segurança": "#D97706", "Educação": "#2563EB",
    "Saúde": "#DC2626", "Infraestrutura": "#0891B2", "Agricultura": "#65A30D",
    "Política": "#4F46E5", "Habitação": "#C026D3", "Transparência": "#0F766E",
  };
  const catColor = categoryColors[category] || "#0369A1";

  const imageBlock = imageUrl
    ? `<img src="${imageUrl}" alt="${title}" style="width:100%;max-width:520px;border-radius:12px;margin-bottom:24px;object-fit:cover;max-height:260px;" />`
    : `<div style="width:100%;max-width:520px;height:180px;background:linear-gradient(135deg,#020C1B,#0A2A3F);border-radius:12px;margin-bottom:24px;display:flex;align-items:center;justify-content:center;"><span style="font-size:48px;">📰</span></div>`;

  const summaryBlock = summary
    ? `<div style="background:#F8FAFC;border-left:4px solid ${catColor};border-radius:0 12px 12px 0;padding:16px 20px;margin-bottom:24px;">
        <p style="color:#475569;font-size:14px;line-height:1.7;margin:0;">${summary}</p>
      </div>`
    : "";

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F1F5F9;">
  <div style="font-family:'Segoe UI',system-ui,sans-serif;max-width:560px;margin:0 auto;padding:0;">
    
    <div style="background:linear-gradient(135deg,#020C1B,#0A2A3F);padding:28px 24px;text-align:center;border-radius:0 0 20px 20px;">
      <p style="color:#3BBFD4;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 4px;">Gabinete Arthur Halal</p>
      <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0;line-height:1.3;">Nova Notícia Publicada</h1>
    </div>

    <div style="padding:32px 24px;">
      
      <div style="margin-bottom:20px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
        <span style="display:inline-block;padding:4px 14px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;background:${catColor}15;color:${catColor};border:1px solid ${catColor}30;">${category}</span>
        <span style="color:#94A3B8;font-size:12px;">📅 ${date}</span>
      </div>

      ${imageBlock}

      <h2 style="color:#0F172A;font-size:20px;font-weight:800;margin:0 0 12px;line-height:1.4;">${title}</h2>

      ${summaryBlock}

      <div style="text-align:center;margin:28px 0 8px;">
        <a href="${newsUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#0369A1,#0EA5E9);color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:12px;letter-spacing:0.3px;">
          📖 Ler notícia completa →
        </a>
      </div>

      <p style="text-align:center;margin:12px 0 24px;">
        <span style="color:#94A3B8;font-size:11px;">Ou acesse diretamente:</span><br>
        <a href="${newsUrl}" target="_blank" rel="noopener noreferrer" style="color:#0369A1;font-size:12px;word-break:break-all;">${newsUrl}</a>
      </p>

      <div style="border-top:1px solid #E2E8F0;margin:24px 0;"></div>

      <p style="color:#94A3B8;font-size:11px;text-align:center;margin:0;">
        Por ${author} · Vereador de Pelotas/RS<br>
        Publicado em ${date}
      </p>
    </div>

    <div style="background:#F8FAFC;padding:20px 24px;text-align:center;border-radius:20px 20px 0 0;border-top:1px solid #E2E8F0;">
      <p style="color:#94A3B8;font-size:10px;margin:0;line-height:1.5;">
        Você recebeu este e-mail porque tem uma conta no Sistema de Oportunidades do Vereador Arthur Halal.<br>
        Para deixar de receber notificações, acesse as configurações do seu perfil.
      </p>
    </div>

  </div>
</body>
</html>`;
}

function buildGenericEmailHTML(notif: Record<string, unknown>, vagaCreatedAt: string): string {
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
  logs.push(`[${startTime}] processar-email-notificacao v10 iniciado (SITE_URL=${SITE_URL})`);

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = getServiceRoleKey();

  if (!resendApiKey || !supabaseUrl || !serviceRoleKey) {
    const missing = [];
    if (!resendApiKey) missing.push("RESEND_API_KEY");
    if (!supabaseUrl) missing.push("SUPABASE_URL");
    if (!serviceRoleKey) missing.push("SERVICE_ROLE_KEY");
    logs.push(`FATAL: Config missing: ${missing.join(", ")}`);
    return new Response(JSON.stringify({ success: false, error: "Configuração incompleta no servidor", logs }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const body = await req.json();
    const { notifId } = body;

    if (!notifId) {
      logs.push("ERRO: notifId ausente no body");
      return new Response(JSON.stringify({ success: false, error: "notifId é obrigatório", logs }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logs.push(`Processando notificação: ${notifId}`);

    const { data: notif, error: notifErr } = await supabase
      .from("notificacoes")
      .select("*")
      .eq("id", notifId)
      .single();

    if (notifErr || !notif) {
      logs.push(`ERRO: Notificação não encontrada: ${notifErr?.message || "null"}`);
      return new Response(JSON.stringify({ success: false, error: "Notificação não encontrada", logs }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (notif.email_enviado === true) {
      logs.push(`SKIP: Email já foi enviado anteriormente (anti-duplicata)`);
      return new Response(JSON.stringify({ success: true, sent: false, reason: "already_sent", logs }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = notif.user_id as string;
    const notifTipo = (notif.tipo as string) || "desconhecido";
    const isNewsNotification = notifTipo === "noticia";
    logs.push(`Notificação: tipo=${notifTipo}, user_id=${userId}, titulo="${(notif.titulo as string)?.substring(0, 50)}", isNews=${isNewsNotification}`);

    // Buscar perfil do usuário
    let isDefaultUser = false;
    let isCitizen = false;
    let hasCurriculo = false;
    let userRole = "unknown";

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_default_user, role, curriculo_pdf, full_name")
        .eq("id", userId)
        .single();

      isDefaultUser = profile?.is_default_user === true;
      isCitizen = profile?.role === "cidadao" || profile?.role === "citizen";
      userRole = (profile?.role as string) || "unknown";

      if (profile?.curriculo_pdf && profile.curriculo_pdf.length > 5) {
        hasCurriculo = true;
      }

      logs.push(`Perfil: name="${profile?.full_name || "?"}", role=${userRole}, isDefaultUser=${isDefaultUser}, isCitizen=${isCitizen}, hasCurriculo=${hasCurriculo}`);
    } catch (e) {
      logs.push(`ERRO ao buscar perfil: ${e instanceof Error ? e.message : String(e)}`);
    }

    // REGRA DE OURO PARA NOTÍCIA: NÃO pular usuário default (vereador com email padrão recebe email de notícia)
    if (!isNewsNotification && isDefaultUser) {
      logs.push(`SKIP: Usuário é default (não-notícia) — email NÃO enviado`);
      await supabase.from("notificacoes").update({
        email_enviado: false,
        email_enviado_em: formatBRDate(new Date()),
      }).eq("id", notifId);
      return new Response(JSON.stringify({ success: true, sent: false, reason: "is_default_user", logs }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (isNewsNotification && isDefaultUser) {
      logs.push(`REGRA DE OURO NOTÍCIA: Usuário default (${userRole}) recebe email de notícia mesmo assim`);
    }

    // Buscar email do usuário
    let userEmail: string | null = null;
    let hasConfirmedEmail = false;

    try {
      const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(userId);

      if (userErr) {
        logs.push(`ERRO auth.admin.getUserById: ${userErr.message} (status: ${userErr.status})`);
      }

      if (userData?.user) {
        userEmail = userData.user.email || null;
        hasConfirmedEmail = !!userData.user.email_confirmed_at;
        logs.push(`Auth: email="${userEmail || "null"}", confirmed=${hasConfirmedEmail}`);
      } else {
        logs.push(`Auth: usuário não encontrado para id=${userId}`);
      }
    } catch (e) {
      logs.push(`ERRO auth.admin.getUserById exceção: ${e instanceof Error ? e.message : String(e)}`);
    }

    if (!userEmail) {
      logs.push(`SKIP: Sem email no Auth`);
      await supabase.from("notificacoes").update({
        email_enviado: false,
        email_enviado_em: formatBRDate(new Date()),
      }).eq("id", notifId);
      return new Response(JSON.stringify({ success: true, sent: false, reason: "no_email", logs }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let shouldSend: boolean;
    if (isNewsNotification) {
      shouldSend = hasConfirmedEmail || isDefaultUser;
      logs.push(`News check: hasConfirmed=${hasConfirmedEmail}, isDefault=${isDefaultUser}, shouldSend=${shouldSend}`);
    } else {
      shouldSend = hasConfirmedEmail && (!isCitizen || hasCurriculo);
    }

    if (!shouldSend) {
      const reasons: string[] = [];
      if (!hasConfirmedEmail) reasons.push("email não confirmado");
      if (!isNewsNotification && isCitizen && !hasCurriculo) reasons.push("cidadão sem currículo");
      logs.push(`SKIP: ${reasons.join("; ")}`);
      await supabase.from("notificacoes").update({
        email_enviado: false,
        email_enviado_em: formatBRDate(new Date()),
      }).eq("id", notifId);
      return new Response(JSON.stringify({ success: true, sent: false, reason: "not_eligible", logs }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Construir HTML
    let html = "";
    if (isNewsNotification) {
      const newsSlug = notif.referencia_id as string;
      let newsData: Record<string, unknown> | null = null;
      if (newsSlug) {
        try {
          const { data: news } = await supabase
            .from("news")
            .select("*")
            .eq("slug", newsSlug)
            .single();
          if (news) {
            newsData = news as Record<string, unknown>;
            logs.push(`News encontrada: "${newsData.title}", slug=${newsSlug}`);
          }
        } catch (_) { /* silent */ }
      }
      html = buildNewsEmailHTML(notif as Record<string, unknown>, newsData);
      logs.push(`HTML de notícia construído com ${newsData ? "dados completos" : "fallback"}`);
    } else {
      let vagaCreatedAt = "";
      if (notif.referencia_tipo === "vaga" && notif.referencia_id) {
        try {
          const { data: vaga } = await supabase
            .from("vagas")
            .select("created_at")
            .eq("id", notif.referencia_id)
            .single();
          if (vaga?.created_at) vagaCreatedAt = formatBRDate(vaga.created_at);
        } catch (_) { /* silent */ }
      }
      html = buildGenericEmailHTML(notif as Record<string, unknown>, vagaCreatedAt);
    }

    // Enviar via Resend
    logs.push(`Enviando email para: ${userEmail}`);
    const subject = isNewsNotification
      ? `📰 ${notif.titulo || "Nova notícia publicada"}`
      : (notif.titulo || "Notificação — Sistema Arthur Halal");

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Gabinete Arthur Halal <gabinete@emanoel.shop>",
          to: [userEmail],
          subject,
          html,
        }),
      });

      const resBody = await res.json();
      const resendId = resBody.id || "none";
      logs.push(`Resend: status=${res.status}, id=${resendId}`);

      if (res.ok) {
        await supabase.from("notificacoes").update({
          email_enviado: true,
          email_enviado_em: formatBRDate(new Date()),
        }).eq("id", notifId);
        logs.push(`✅ Email enviado para ${userEmail} (Resend ID: ${resendId})`);
        return new Response(JSON.stringify({ success: true, sent: true, resendId, logs }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        const errorMsg = resBody.message || resBody.error || `HTTP ${res.status}`;
        logs.push(`❌ Resend falhou: ${errorMsg}`);
        await supabase.from("notificacoes").update({
          email_enviado: false,
          email_enviado_em: formatBRDate(new Date()),
        }).eq("id", notifId);
        return new Response(JSON.stringify({ success: false, error: `Resend API: ${errorMsg}`, sent: false, logs }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      logs.push(`❌ Exceção Resend: ${errMsg}`);
      await supabase.from("notificacoes").update({
        email_enviado: false,
        email_enviado_em: formatBRDate(new Date()),
      }).eq("id", notifId);
      return new Response(JSON.stringify({ success: false, error: errMsg, sent: false, logs }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logs.push(`FATAL: ${errMsg}`);
    return new Response(JSON.stringify({ success: false, error: errMsg, logs }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
