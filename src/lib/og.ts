/**
 * Atualiza dinamicamente as meta tags OG (Open Graph) e Twitter Card da página.
 * Importante: isso funciona para o navegador, mas crawlers de redes sociais (WhatsApp, Facebook)
 * NÃO executam JavaScript — eles leem o index.html estático. O preview que aparece ao compartilhar
 * depende das meta tags do index.html, não das tags atualizadas dinamicamente via JS.
 */

interface PageMeta {
  title: string;
  description: string;
  image: string;
  url?: string;
  type?: string;
}

function setMetaTag(property: string, content: string): void {
  let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.querySelector(`meta[name="${property}"]`) as HTMLMetaElement | null;
  }
  if (el) {
    el.setAttribute("content", content);
    return;
  }
  const meta = document.createElement("meta");
  if (property.startsWith("og:")) {
    meta.setAttribute("property", property);
  } else {
    meta.setAttribute("name", property);
  }
  meta.setAttribute("content", content);
  document.head.appendChild(meta);
}

export function setPageMeta(meta: PageMeta): void {
  const url = meta.url ?? (typeof window !== "undefined" ? window.location.href : "https://emanuel.shop/");

  document.title = meta.title;

  setMetaTag("og:title", meta.title);
  setMetaTag("og:description", meta.description);
  setMetaTag("og:image", meta.image);
  setMetaTag("og:url", url);
  setMetaTag("og:type", meta.type ?? "article");
  setMetaTag("og:image:width", "1200");
  setMetaTag("og:image:height", "630");
  setMetaTag("og:locale", "pt_BR");

  setMetaTag("twitter:card", "summary_large_image");
  setMetaTag("twitter:title", meta.title);
  setMetaTag("twitter:description", meta.description);
  setMetaTag("twitter:image", meta.image);
}

/**
 * Define OG tags IMEDIATAMENTE a partir de parâmetros da URL.
 * Útil para que o navegador capture meta tags antes de carregar dados do Supabase.
 */
export function setPageMetaFromQueryParams(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    const ogTitle = params.get("og_title");
    if (!ogTitle) return false;

    const ogImage = params.get("og_image") || "";
    const ogDesc = params.get("og_desc") || ogTitle;

    setPageMeta({
      title: decodeURIComponent(ogTitle) + " — Arthur Halal | Vereador de Pelotas",
      description: decodeURIComponent(ogDesc).slice(0, 200),
      image: decodeURIComponent(ogImage) || "https://static.readdy.ai/image/c11839f9cb40eb5a775c7152bc2e0943/c74a8221312599494c652306a9b66f21.jpeg",
    });

    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, "", window.location.pathname);
    }
    return true;
  } catch {
    return false;
  }
}