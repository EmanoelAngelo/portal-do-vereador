import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const SITE_URL = (Deno.env.get("SITE_URL") || "https://emanuel.shop").replace(/\/$/, "");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailPayload {
  to?: string[];
  userId?: string;
  userIds?: string[];
  subject: string;
  type: string;
  data: Record<string, unknown>;
  recipientEmail?: string;
}

const TYPE_COLORS: Record<string, { accent: string; icon: string }> = {
  candidatura: { accent: "#3BBFD4", icon: "📋" },
  aprovacao: { accent: "#22C55E", icon: "✅" },
  mensagem: { accent: "#22C55E", icon: "💬" },
  demanda: { accent: "#E8A020", icon: "📁" },
  novo_usuario: { accent: "#A78BFA", icon: "👤" },
  noticia: { accent: "#F97316", icon: "📰" },
  vaga_criada: { accent: "#22C55E", icon: "📢" },
  vaga_excluida: { accent: "#EF4444", icon: "🗑️" },
  curriculo_criado: { accent: "#22C55E", icon: "📄" },
  vaga_status: { accent: "#E8A020", icon: "⏸️" },
  chat: { accent: "#22C55E", icon: "💬" },
  new_demand: { accent: "#E8A020", icon: "📁" },
  usuario_excluido: { accent: "#EF4444", icon: "🚫" },
  default: { accent: "#3BBFD4", icon: "🔔" },
};

function getTypeMeta(type: string) {
  return TYPE_COLORS[type] ?? TYPE_COLORS.default;
}

function formatBRDate(date: string | Date | number): string {
  return new Date(date).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function formatBRDateLong(date: string | Date | number): string {
  return new Date(date).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "long", year: "numeric" });
}

function newsNotificationHTML(data: Record<string, unknown>): string {
  const title = (data.title as string) || "Nova Notícia";
  const message = (data.message as string) || "";
  const newsSlug = (data.news_slug as string) || "";
  const newsImage = (data.news_image as string) || "";
  const newsCategory = (data.news_category as string) || "Geral";
  const newsAuthor = (data.news_author as string) || "Arthur Halal";
  const newsDate = (data.news_date as string) || formatBRDateLong(new Date());
  const newsUrl = newsSlug ? `${SITE_URL}/noticias/${newsSlug}` : SITE_URL;
  const sender = (data.sender as string) || "Sistema Arthur Halal";

  const categoryColors: Record<string, string> = {
    "Mandato": "#0369A1", "Ação Social": "#DC2626", "Tecnologia": "#7C3AED",
    "Emprego": "#059669", "Segurança": "#D97706", "Educação": "#2563EB",
    "Saúde": "#DC2626", "Infraestrutura": "#0891B2", "Agricultura": "#65A30D",
    "Política": "#4F46E5", "Habitação": "#C026D3", "Transparência": "#0F766E",
  };
  const catColor = categoryColors[newsCategory] || "#0369A1";

  const imageBlock = newsImage
    ? `<img src="${newsImage}" alt="${title}" style="width:100%;max-width:520px;border-radius:12px;margin-bottom:24px;object-fit:cover;max-height:260px;" />`
    : `<div style="width:100%;max-width:520px;height:180px;background:linear-gradient(135deg,#020C1B,#0A2A3F);border-radius:12px;margin-bottom:24px;display:flex;align-items:center;justify-content:center;"><span style="font-size:48px;">📰</span></div>`;

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
        <span style="display:inline-block;padding:4px 14px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;background:${catColor}15;color:${catColor};border:1px solid ${catColor}30;">${newsCategory}</span>
        <span style="color:#94A3B8;font-size:12px;">📅 ${newsDate}</span>
      </div>

      ${imageBlock}

      <h2 style="color:#0F172A;font-size:20px;font-weight:800;margin:0 0 12px;line-height:1.4;">${title}</h2>

      ${message ? `<div style="background:#F8FAFC;border-left:4px solid ${catColor};border-radius:0 12px 12px 0;padding:16px 20px;margin-bottom:24px;">
        <p style="color:#475569;font-size:14px;line-height:1.7;margin:0;">${message}</p>
      </div>` : ""}

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
        Por ${newsAuthor} · Vereador de Pelotas/RS<br>
        De: ${sender} · ${formatBRDate(new Date())}
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

function genericNotificationHTML(data: Record<string, unknown>, type: string): string {
  const meta = getTypeMeta(type);
  const title = (data.title as string) || "Nova Notificação";
  const message = (data.message as string) || "";
  const sender = (data.sender as string) || "Sistema Arthur Halal";
  const date = (data.date as string) || formatBRDate(new Date());
  const typeLabel = (data.type_label as string) || "Notificação";

  return `
    <div style="font-family: 'Segoe UI', system-ui, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #0D1629; color: #fff; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="font-size: 32px; margin-bottom: 8px;">${meta.icon}</div>
        <h2 style="color: ${meta.accent}; margin: 0 0 4px; font-size: 20px; font-weight: 800;">${title}</h2>
        <p style="color: #3BBFD4; font-size: 11px; letter-spacing: 2px; text-transform: uppercase;">Gabinete Arthur Halal</p>
      </div>
      <div style="background: rgba(255,255,255,0.06); border-radius: 12px; padding: 16px; margin-bottom: 20px;">
        <p style="color: rgba(255,255,255,0.50); font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px;">${typeLabel}</p>
        <p style="color: rgba(255,255,255,0.75); font-size: 14px; line-height: 1.6; margin: 0 0 12px;">${message}</p>
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

function newDemandHTML(data: Record<string, unknown>): string {
  return `
    <div style="font-family: 'Segoe UI', system-ui, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #0D1629; color: #fff; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #E8A020; margin: 0 0 4px; font-size: 20px; font-weight: 800;">Nova Demanda Recebida</h2>
        <p style="color: #3BBFD4; font-size: 11px; letter-spacing: 2px; text-transform: uppercase;">Gabinete Arthur Halal</p>
      </div>
      <div style="background: rgba(255,255,255,0.06); border-radius: 12px; padding: 16px; margin-bottom: 20px;">
        <p style="color: rgba(255,255,255,0.50); font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px;">Tipo: ${data.type || "—"}</p>
        <h3 style="color: #fff; font-size: 16px; margin: 0 0 8px;">${data.title || "Sem título"}</h3>
        <p style="color: rgba(255,255,255,0.55); font-size: 14px; line-height: 1.5; margin: 0 0 12px;">${(data.description as string)?.substring(0, 200) || "—"}</p>
        <div style="font-size: 12px; color: rgba(255,255,255,0.40);">
          <span>Cidadão: ${data.citizen_name || "Anônimo"}</span>
          ${data.citizen_neighborhood ? ` · ${data.citizen_neighborhood}` : ""}
        </div>
      </div>
      <p style="font-size: 11px; color: rgba(255,255,255,0.25); text-align: center; margin: 0;">
        Você recebeu esta notificação porque é um administrador ou assessor do gabinete.<br>
        Sistema de Oportunidades — Vereador Arthur Halal · Pelotas/RS
      </p>
    </div>
  `;
}

async function getEmailsByUserIds(supabase: any, userIds: string[]): Promise<string[]> {
  const emails: string[] = [];
  for (const uid of userIds) {
    try {
      const { data, error } = await supabase.auth.admin.getUserById(uid);
      if (!error && data?.user?.email) {
        emails.push(data.user.email);
      }
    } catch (_) { /* silent */ }
  }
  return emails;
}

function getServiceRoleKey(): string {
  const possibleNames = ["SERVICE_ROLE_KEY","SUPABASE_SERVICE_ROLE_KEY","SUPABASE_SERVICE_KEY","VITE_SUPABASE_SERVICE_ROLE_KEY","VITE_SUPABASE_SERVICE_KEY"];
  for (const name of possibleNames) {
    const val = Deno.env.get(name);
    if (val && val.trim().length > 20) return val.trim();
  }
  return "";
}

serve(async (req: Request) => {
  const logs: string[] = [];
  logs.push(`[${new Date().toISOString()}] send-email-notification v7 iniciado (SITE_URL=${SITE_URL})`);
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: EmailPayload = await req.json();
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = getServiceRoleKey();

    logs.push(`resendApiKey: ${resendApiKey ? "present" : "MISSING"}`);
    logs.push(`type: ${body.type}`);

    if (!resendApiKey) {
      return new Response(JSON.stringify({ success: false, error: "RESEND_API_KEY not configured", logs }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let toEmails: string[] = [];

    if (body.recipientEmail && body.recipientEmail.includes("@")) {
      toEmails = [body.recipientEmail];
      logs.push("Using direct recipientEmail: " + body.recipientEmail);
    } else if (body.to && body.to.length > 0) {
      toEmails = body.to;
      logs.push("Using 'to' array: " + toEmails.join(", "));
    } else if (serviceRoleKey && supabaseUrl) {
      const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      if (body.userId) {
        logs.push("Resolving email for userId: " + body.userId);
        const emails = await getEmailsByUserIds(supabase, [body.userId]);
        toEmails = emails;
      } else if (body.userIds && body.userIds.length > 0) {
        logs.push("Resolving emails for " + body.userIds.length + " userIds");
        const emails = await getEmailsByUserIds(supabase, body.userIds);
        toEmails = emails;
      }
    }

    if (toEmails.length === 0) {
      logs.push("FAILED: No recipients");
      return new Response(JSON.stringify({ success: false, error: "No recipients", logs }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let html = "";
    if (body.type === "noticia") {
      html = newsNotificationHTML(body.data);
      logs.push("Using news-specific template with preview + redirect link");
    } else if (body.type === "new_demand") {
      html = newDemandHTML(body.data);
    } else {
      html = genericNotificationHTML(body.data, body.type);
    }

    logs.push("Sending to Resend API: " + toEmails.join(", "));
    
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Gabinete Arthur Halal <gabinete@emanoel.shop>",
        to: toEmails,
        subject: body.subject || "Notificação — Sistema Arthur Halal",
        html,
      }),
    });

    const resBody = await res.json();
    logs.push("Resend response status: " + res.status);

    return new Response(
      JSON.stringify({ success: res.ok, id: resBody.id, error: res.ok ? undefined : resBody.message, logs }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    logs.push("FATAL: " + (err instanceof Error ? err.message : String(err)));
    return new Response(JSON.stringify({ success: false, error: (err as Error).message, logs }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
