import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SITE_URL = (Deno.env.get("SITE_URL") || "https://emanuel.shop").replace(/\/$/, "");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
  "Access-Control-Max-Age": "86400",
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
  return new Date(date).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "long", year: "numeric" });
}

function buildNewsEmailHTML(news: Record<string, unknown>): string {
  const title = (news.title as string) || "Nova Notícia";
  const summary = (news.summary as string) || "";
  const imageUrl = (news.image_url as string) || "";
  const category = (news.category as string) || "Geral";
  const slug = (news.slug as string) || "";
  const author = (news.author as string) || "Arthur Halal";
  const date = formatBRDate((news.published_at as string) || new Date().toISOString());
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

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F1F5F9;">
  <div style="font-family:'Segoe UI',system-ui,sans-serif;max-width:560px;margin:0 auto;padding:0;">
    
    <!-- Cabeçalho -->
    <div style="background:linear-gradient(135deg,#020C1B,#0A2A3F);padding:28px 24px;text-align:center;border-radius:0 0 20px 20px;">
      <p style="color:#3BBFD4;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 4px;">Gabinete Arthur Halal</p>
      <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0;line-height:1.3;">Nova Notícia Publicada</h1>
    </div>

    <!-- Corpo -->
    <div style="padding:32px 24px;">
      
      <!-- Categoria + Data -->
      <div style="margin-bottom:20px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
        <span style="display:inline-block;padding:4px 14px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;background:${catColor}15;color:${catColor};border:1px solid ${catColor}30;">${category}</span>
        <span style="color:#94A3B8;font-size:12px;">📅 ${date}</span>
      </div>

      ${imageBlock}

      <!-- Título -->
      <h2 style="color:#0F172A;font-size:20px;font-weight:800;margin:0 0 12px;line-height:1.4;">${title}</h2>

      <!-- Resumo / Preview -->
      ${summary ? `<div style="background:#F8FAFC;border-left:4px solid ${catColor};border-radius:0 12px 12px 0;padding:16px 20px;margin-bottom:24px;">
        <p style="color:#475569;font-size:14px;line-height:1.7;margin:0;">${summary}</p>
      </div>` : ""}

      <!-- Botão Ler Notícia -->
      <div style="text-align:center;margin:28px 0 8px;">
        <a href="${newsUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#0369A1,#0EA5E9);color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:12px;letter-spacing:0.3px;">
          📖 Ler notícia completa →
        </a>
      </div>

      <!-- Link alternativo -->
      <p style="text-align:center;margin:12px 0 24px;">
        <span style="color:#94A3B8;font-size:11px;">Ou acesse diretamente:</span><br>
        <a href="${newsUrl}" target="_blank" rel="noopener noreferrer" style="color:#0369A1;font-size:12px;word-break:break-all;">${newsUrl}</a>
      </p>

      <!-- Divisor -->
      <div style="border-top:1px solid #E2E8F0;margin:24px 0;"></div>

      <!-- Info adicional -->
      <p style="color:#94A3B8;font-size:11px;text-align:center;margin:0;">
        Por ${author} · Vereador de Pelotas/RS<br>
        Publicado em ${date}
      </p>
    </div>

    <!-- Rodapé -->
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const logs: string[] = [];
  logs.push(`[${new Date().toISOString()}] send-news-email-preview v2 iniciado (SITE_URL=${SITE_URL})`);

  try {
    const body = await req.json();
    const { email, newsSlug } = body;

    if (!email || !newsSlug) {
      return new Response(JSON.stringify({ success: false, error: "email e newsSlug são obrigatórios", logs }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logs.push(`Email destino: ${email}, Slug: ${newsSlug}`);

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = getServiceRoleKey();

    if (!resendApiKey || !supabaseUrl || !serviceRoleKey) {
      logs.push(`Config faltando: resend=${!!resendApiKey}, url=${!!supabaseUrl}, serviceKey=${!!serviceRoleKey}`);
      return new Response(JSON.stringify({ success: false, error: "Configuração incompleta no servidor", logs }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Buscar notícia pelo slug
    const { data: newsData, error: newsErr } = await supabase
      .from("news")
      .select("*")
      .eq("slug", newsSlug)
      .single();

    if (newsErr || !newsData) {
      logs.push(`Notícia não encontrada: ${newsErr?.message || "slug inválido"}`);
      return new Response(JSON.stringify({ success: false, error: "Notícia não encontrada", logs }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logs.push(`Notícia encontrada: "${newsData.title}"`);

    // Construir HTML
    const html = buildNewsEmailHTML(newsData as Record<string, unknown>);

    // Enviar via Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Gabinete Arthur Halal <gabinete@emanoel.shop>",
        to: [email],
        subject: `📰 ${newsData.title}`,
        html,
      }),
    });

    const resBody = await res.json();
    logs.push(`Resend status: ${res.status}, id: ${resBody.id || "none"}`);

    if (res.ok) {
      return new Response(JSON.stringify({
        success: true,
        resendId: resBody.id,
        newsTitle: newsData.title,
        newsSlug: newsData.slug,
        sentTo: email,
        logs,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } else {
      return new Response(JSON.stringify({
        success: false,
        error: resBody.message || `HTTP ${res.status}`,
        logs,
      }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (err) {
    logs.push("FATAL: " + (err instanceof Error ? err.message : String(err)));
    return new Response(JSON.stringify({ success: false, error: (err as Error).message, logs }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
