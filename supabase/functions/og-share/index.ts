import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const url = new URL(req.url);

  const title = url.searchParams.get("title") || "Arthur Halal | Vereador de Pelotas/RS";
  const description = url.searchParams.get("description") || "Portal oficial do vereador Arthur Halal. Noticias do mandato, participacao cidada e oportunidades de emprego.";
  const image = url.searchParams.get("image") || "https://static.readdy.ai/image/c11839f9cb40eb5a775c7152bc2e0943/c74a8221312599494c652306a9b66f21.jpeg";
  const redirect = url.searchParams.get("redirect") || "https://emanuel.shop/";

  // Escape ONLY for HTML attribute safety — do NOT escape & because it breaks image URLs
  // in OG tags. Crawlers read content="..." as raw text, not parsed HTML.
  const safeTitle = escapeForHtmlAttribute(title);
  const safeDesc = escapeForHtmlAttribute(description);
  const safeImage = escapeForHtmlAttribute(image);
  const safeRedirect = escapeForHtmlAttribute(redirect);

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:image" content="${safeImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${safeRedirect}">
  <meta property="og:locale" content="pt_BR">
  <meta property="og:site_name" content="Arthur Halal - Vereador de Pelotas">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDesc}">
  <meta name="twitter:image" content="${safeImage}">
  <meta http-equiv="refresh" content="0; url=${safeRedirect}">
  <script>window.location.href="${safeRedirect}";</script>
</head>
<body>
  <p>Redirecionando para <a href="${safeRedirect}">${safeTitle}</a>...</p>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
});

/**
 * Escape ONLY quotes and angle brackets for HTML attribute safety.
 * Do NOT escape & because it breaks URLs in OG tags.
 * Crawlers (Facebook, WhatsApp, Instagram) read content="..." as raw text
 * and do NOT perform HTML entity unescaping on meta tag content.
 */
function escapeForHtmlAttribute(text: string): string {
  return text
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
