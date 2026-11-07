export type SharePlatform = "whatsapp" | "instagram" | "share";

export interface ShareOptions {
  title: string;
  text: string;
  url: string;
}

function isMobileDevice(): boolean {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

function showToast(message: string): void {
  const toast = document.createElement("div");
  toast.className =
    "fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] bg-gray-900 text-white px-5 py-3 rounded-2xl text-sm font-medium shadow-xl animate-[fadeIn_0.3s_ease-out]";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function copyWithFeedback(text: string, message?: string): void {
  if (navigator.clipboard) {
    navigator.clipboard
      .writeText(text)
      .then(() => showToast(message ?? "Link copiado!"))
      .catch(() => alert(`Link: ${text}`));
  } else {
    alert(`Link: ${text}`);
  }
}

/** WhatsApp — usa wa.me com texto + URL do site real */
function openWhatsApp(text: string, url: string): void {
  const encoded = encodeURIComponent(`${text} ${url}`);
  window.open(`https://wa.me/?text=${encoded}`, "_blank");
}

/**
 * Instagram:
 * - Mobile: navigator.share() com URL do site real
 * - Desktop: copia URL com toast
 */
function shareInstagram(text: string, url: string): void {
  if (isMobileDevice() && navigator.share) {
    navigator
      .share({ title: "", text, url })
      .catch(() => copyWithFeedback(url, "Link copiado! Abra o Instagram e cole."));
  } else {
    copyWithFeedback(url, "Link copiado! Abra o Instagram e cole no Story ou Direct.");
  }
}

/**
 * Compartilhar nativo:
 * - Mobile: navigator.share() com URL do site real
 * - Desktop: copia URL com toast
 */
function nativeShare(title: string, text: string, url: string): void {
  if (navigator.share) {
    navigator
      .share({ title, text, url })
      .catch(() => copyWithFeedback(url, "Link copiado! Cole onde desejar."));
  } else {
    copyWithFeedback(url, "Link copiado! Cole onde desejar.");
  }
}

export function shareContent(platform: SharePlatform, options: ShareOptions): void {
  const { title, text, url } = options;
  switch (platform) {
    case "whatsapp":
      openWhatsApp(text, url);
      break;
    case "instagram":
      shareInstagram(text, url);
      break;
    case "share":
      nativeShare(title, text, url);
      break;
  }
}