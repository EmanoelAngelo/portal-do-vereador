import { useState } from "react";
import ImageLightbox from "@/components/feature/ImageLightbox";
import { shareContent } from "@/lib/share";

function isMobileDevice(): boolean {
  return typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

// Compartilhamento via URL do site real
function shareVagaPublica(
  vagaId: number,
  vagaTitle: string,
  companyName: string,
  location: string | null,
  platform: "whatsapp" | "instagram" | "share"
) {
  const url = `${window.location.origin}/sistema/vaga/${vagaId}`;
  const text = `Vaga: ${vagaTitle} — ${companyName} em ${location ?? "Pelotas/RS"}. Confira esta oportunidade!`;
  shareContent(platform, { title: vagaTitle, text, url });
}

export interface VagaPublica {
  id: number;
  title: string;
  area: string | null;
  type: string;
  location: string | null;
  salary: string | null;
  description: string | null;
  requirements: string | null;
  company_name: string | null;
  company_id?: string;
  company_avatar?: string | null;
  image_url: string | null;
  status: string;
  created_at: string;
}

interface VagaCardPublicaProps {
  vaga: VagaPublica;
  onSaibaMais: (vaga: VagaPublica) => void;
  onExcluir?: (vaga: VagaPublica) => void;
  showDelete?: boolean;
  candidaturaCount?: number;
  isDark?: boolean;
  readOnly?: boolean;
}

const AREA_COLORS: Record<string, string> = {
  Administrativo: "#3BBFD4",
  Tecnologia: "#E8A020",
  "Comercial/Vendas": "#22C55E",
  Saúde: "#22C55E",
  Educação: "#A78BFA",
  "Construção Civil": "#F97316",
  Alimentação: "#EC4899",
  Logística: "#64748B",
  Varejo: "#3BBFD4",
  "Serviços Gerais": "#E8A020",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

export default function VagaCardPublica({ vaga, onSaibaMais, onExcluir, showDelete, candidaturaCount, isDark = true, readOnly = false }: VagaCardPublicaProps) {
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const areaColor = AREA_COLORS[vaga.area ?? ""] ?? "#3BBFD4";

  const hasAvatar = !!vaga.company_avatar;

  return (
    <>
      <div className="rounded-2xl overflow-hidden transition-all" style={isDark ? { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" } : { background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)" }}>
        {/* Header: Avatar empresa + nome + tempo — estilo Instagram */}
        <div className="flex items-center gap-3 p-4 pb-3">
          <button
            onClick={() => { if (hasAvatar) { setLightboxImage(vaga.company_avatar!); setLightboxTitle(vaga.company_name ?? "Empresa"); } }}
            className="w-10 h-10 rounded-full overflow-hidden shrink-0 flex items-center justify-center border cursor-pointer"
            style={{
              borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.10)",
              background: hasAvatar ? "transparent" : `${areaColor}20`,
            }}
            title={hasAvatar ? "Clique para ver logo" : ""}
          >
            {hasAvatar ? (
              <img src={vaga.company_avatar!} alt={vaga.company_name ?? "Empresa"} className="w-full h-full object-cover object-top" />
            ) : (
              <i className="ri-building-2-line text-sm" style={{ color: areaColor }}></i>
            )}
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate" style={{ color: isDark ? "white" : "#111827" }}>{vaga.company_name ?? "Empresa"}</p>
            <p className="text-xs" style={{ color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.40)" }}>{timeAgo(vaga.created_at)}</p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: `${areaColor}15`, color: areaColor, border: `1px solid ${areaColor}30` }}>
            {vaga.area ?? "Geral"}
          </span>
        </div>

        {/* Foto da vaga — 16:9 CAPA estilo Instagram */}
        {vaga.image_url ? (
          <button
            onClick={() => { setLightboxImage(vaga.image_url!); setLightboxTitle(vaga.title); }}
            className="w-full aspect-[16/9] overflow-hidden cursor-pointer block"
            title="Clique para ver em tamanho maior"
          >
            <img src={vaga.image_url} alt={vaga.title} className="w-full h-full object-cover object-top transition-transform hover:scale-105" />
          </button>
        ) : (
          <div className="w-full aspect-[16/9] flex items-center justify-center" style={{ background: "linear-gradient(135deg, #1B2A5E, #3BBFD4)" }}>
            <div className="text-center">
              <i className="ri-briefcase-4-line text-4xl text-white/20 mb-2 block"></i>
              <p className="text-white/30 text-sm font-semibold">{vaga.title}</p>
            </div>
          </div>
        )}

        {/* Action bar — estilo Instagram */}
        <div className="flex items-center gap-1 px-4 py-3 flex-wrap">
          {!readOnly && (
            <button
              onClick={() => onSaibaMais(vaga)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer whitespace-nowrap"
              style={{ background: "linear-gradient(135deg, #1B2A5E, #3BBFD4)", color: "white" }}
            >
              <i className="ri-heart-3-line"></i> Candidatar-se
            </button>
          )}
          <button
            onClick={() => onSaibaMais(vaga)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer whitespace-nowrap"
            style={{ color: isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)" }}
          >
            <i className="ri-information-line"></i> Saiba Mais
          </button>

          {/* Botões de compartilhamento */}
          <div className="flex items-center gap-1 ml-auto">
            {isMobileDevice() ? (
              <>
                <button
                  onClick={() => shareVagaPublica(vaga.id, vaga.title, vaga.company_name ?? "Empresa", vaga.location, "share")}
                  className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-colors"
                  style={{ color: "#3BBFD4" }}
                  title="Compartilhar"
                >
                  <i className="ri-share-forward-line text-sm"></i>
                </button>
                <button
                  onClick={() => shareVagaPublica(vaga.id, vaga.title, vaga.company_name ?? "Empresa", vaga.location, "whatsapp")}
                  className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-colors"
                  style={{ color: "#25D366" }}
                  title="WhatsApp"
                >
                  <i className="ri-whatsapp-line text-sm"></i>
                </button>
                <button
                  onClick={() => shareVagaPublica(vaga.id, vaga.title, vaga.company_name ?? "Empresa", vaga.location, "instagram")}
                  className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-colors"
                  style={{ color: "#E1306C" }}
                  title="Instagram"
                >
                  <i className="ri-instagram-line text-sm"></i>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => shareVagaPublica(vaga.id, vaga.title, vaga.company_name ?? "Empresa", vaga.location, "instagram")}
                  className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-colors"
                  style={{ color: "#E1306C" }}
                  title="Instagram"
                >
                  <i className="ri-instagram-line text-sm"></i>
                </button>
                <button
                  onClick={() => shareVagaPublica(vaga.id, vaga.title, vaga.company_name ?? "Empresa", vaga.location, "whatsapp")}
                  className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-colors"
                  style={{ color: "#25D366" }}
                  title="WhatsApp"
                >
                  <i className="ri-whatsapp-line text-sm"></i>
                </button>
                <button
                  onClick={() => shareVagaPublica(vaga.id, vaga.title, vaga.company_name ?? "Empresa", vaga.location, "share")}
                  className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-colors"
                  style={{ color: isDark ? "rgba(255,255,255,0.40)" : "rgba(0,0,0,0.35)" }}
                  title="Compartilhar"
                >
                  <i className="ri-share-forward-line text-sm"></i>
                </button>
              </>
            )}

            {showDelete && !confirmDelete && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer whitespace-nowrap transition-colors"
                style={{ color: "#F87171" }}
              >
                <i className="ri-delete-bin-line text-sm"></i>
              </button>
            )}
            {showDelete && confirmDelete && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => { onExcluir?.(vaga); setConfirmDelete(false); }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap text-white"
                  style={{ background: "#DC2626" }}
                >
                  Confirmar
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer whitespace-nowrap"
                  style={{ background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", color: isDark ? "rgba(255,255,255,0.50)" : "rgba(0,0,0,0.50)" }}
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Conteúdo */}
        <div className="px-4 pb-4">
          {/* Título */}
          <h3 className="font-extrabold text-lg mb-2 leading-tight" style={{ color: isDark ? "white" : "#111827" }}>{vaga.title}</h3>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full" style={{ background: `${areaColor}12`, color: areaColor, border: `1px solid ${areaColor}25` }}>
              <i className="ri-file-text-line"></i>{vaga.type}
            </span>
            <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full" style={{ background: "rgba(232,160,32,0.10)", color: "#E8A020", border: "1px solid rgba(232,160,32,0.20)" }}>
              <i className="ri-map-pin-line"></i>{vaga.location ?? "Pelotas/RS"}
            </span>
            {vaga.salary && (
              <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full" style={{ background: "rgba(34,197,94,0.10)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.20)" }}>
                <i className="ri-money-dollar-circle-line"></i>{vaga.salary}
              </span>
            )}
            {candidaturaCount !== undefined && candidaturaCount > 0 && (
              <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full" style={{ background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.50)", border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)" }}>
                <i className="ri-user-received-line"></i>{candidaturaCount} candidatura{candidaturaCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Descrição */}
          {vaga.description && (
            <div>
              <p className="text-sm leading-relaxed" style={{ color: isDark ? "rgba(255,255,255,0.60)" : "rgba(0,0,0,0.65)" }}>
                {expanded ? vaga.description : vaga.description.slice(0, 120) + (vaga.description.length > 120 ? "..." : "")}
              </p>
              {vaga.description.length > 120 && (
                <button onClick={() => setExpanded((v) => !v)} className="text-xs font-semibold mt-1 cursor-pointer" style={{ color: "#3BBFD4" }}>
                  {expanded ? "ver menos" : "ver mais"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      <ImageLightbox
        imageUrl={lightboxImage}
        title={lightboxTitle}
        isOpen={!!lightboxImage}
        onClose={() => setLightboxImage(null)}
      />
    </>
  );
}