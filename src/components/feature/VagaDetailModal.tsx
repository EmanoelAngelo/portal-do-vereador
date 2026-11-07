import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import ImageLightbox from "@/components/feature/ImageLightbox";
import type { VagaPublica } from "@/components/feature/VagaCardPublica";
import { supabase } from "@/lib/supabase";

interface VagaDetailModalProps {
  vaga: VagaPublica | null;
  open?: boolean;
  onClose: () => void;
  isDark?: boolean;
  /** Quando true, não mostra botão de candidatura */
  readOnly?: boolean;
  /** Quando true, mostra lista de candidatos (vereador/assessor/admin) */
  showCandidatos?: boolean;
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });
}

interface CandidaturaInfo {
  id: number;
  cidadao_id: string;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
    profile_photo: string | null;
    expertise: string | null;
    education: string | null;
    role: string | null;
    is_service_provider: boolean | null;
    worker_profile_type: string | null;
  } | null;
}

export default function VagaDetailModal({ vaga, open, onClose, isDark = true, readOnly = false, showCandidatos = false }: VagaDetailModalProps) {
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState("");
  const [candidatos, setCandidatos] = useState<CandidaturaInfo[]>([]);
  const [loadingCandidatos, setLoadingCandidatos] = useState(false);

  const isOpen = open !== undefined ? open : !!vaga;

  useEffect(() => {
    if (!isOpen || !vaga || !showCandidatos) return;
    setLoadingCandidatos(true);
    supabase
      .from("candidaturas")
      .select("id, cidadao_id, status, rejection_reason, created_at, profiles(full_name, avatar_url, profile_photo, expertise, education, role, is_service_provider, worker_profile_type)")
      .eq("vaga_id", vaga.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setCandidatos((data as CandidaturaInfo[]) ?? []);
        setLoadingCandidatos(false);
      });
  }, [isOpen, vaga?.id, showCandidatos]);

  if (!isOpen || !vaga) return null;

  const areaColor = AREA_COLORS[vaga.area ?? ""] ?? "#3BBFD4";
  const hasAvatar = !!vaga.company_avatar;

  const bgMain = isDark ? "#0D1629" : "#ffffff";
  const textMain = isDark ? "white" : "#111827";
  const textMuted = isDark ? "rgba(255,255,255,0.40)" : "rgba(0,0,0,0.45)";
  const textBody = isDark ? "rgba(255,255,255,0.70)" : "rgba(0,0,0,0.65)";
  const borderColor = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";
  const overlayBg = "rgba(0,0,0,0.80)";

  const totalCandidatos = candidatos.length;
  const aprovados = candidatos.filter((c) => c.status === "accepted").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: overlayBg }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-2xl rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto" style={{ background: bgMain, border: `1px solid ${borderColor}` }}>
        {/* Foto da vaga em destaque (não como capa do perfil) */}
        {vaga.image_url ? (
          <div className="relative w-full aspect-[4/3] sm:aspect-[16/9]">
            <img src={vaga.image_url} alt={vaga.title} className="w-full h-full object-contain" style={{ background: isDark ? "rgba(0,0,0,0.40)" : "rgba(0,0,0,0.06)" }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none"></div>
            <button
              onClick={() => { setLightboxImage(vaga.image_url!); setLightboxTitle(vaga.title); }}
              className="absolute bottom-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer"
              style={{ background: "rgba(0,0,0,0.60)", color: "white" }}
            >
              <i className="ri-zoom-in-line"></i> Ampliar
            </button>
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center cursor-pointer"
              style={{ background: "rgba(0,0,0,0.60)", color: "white" }}
            >
              <i className="ri-close-line"></i>
            </button>
          </div>
        ) : (
          <div className="relative p-5 flex items-center justify-between" style={{ background: "linear-gradient(135deg, #1B2A5E, #3BBFD4)" }}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}>
                <i className="ri-briefcase-4-line text-white text-xl"></i>
              </div>
              <div>
                <p className="text-white font-bold">{vaga.title}</p>
                <p className="text-white/60 text-sm">{vaga.company_name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer"
              style={{ background: "rgba(0,0,0,0.30)", color: "white" }}
            >
              <i className="ri-close-line"></i>
            </button>
          </div>
        )}

        <div className="p-6">
          {/* Empresa info */}
          <div className="flex items-center gap-4 mb-5">
            <button
              onClick={() => { if (hasAvatar) { setLightboxImage(vaga.company_avatar!); setLightboxTitle(vaga.company_name ?? "Empresa"); } }}
              className="w-14 h-14 rounded-full overflow-hidden shrink-0 flex items-center justify-center cursor-pointer border"
              style={{
                borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.10)",
                background: hasAvatar ? "transparent" : `${areaColor}20`,
              }}
            >
              {hasAvatar ? (
                <img src={vaga.company_avatar!} alt={vaga.company_name ?? "Empresa"} className="w-full h-full object-cover object-top" />
              ) : (
                <i className="ri-building-2-line text-xl" style={{ color: areaColor }}></i>
              )}
            </button>
            <div>
              <p className="font-bold text-lg" style={{ color: textMain }}>{vaga.company_name ?? "Empresa"}</p>
              <p className="text-sm" style={{ color: textMuted }}>{vaga.area ?? "Geral"} · {vaga.location ?? "Pelotas/RS"}</p>
            </div>
          </div>

          <h2 className="font-extrabold text-xl mb-3" style={{ color: textMain }}>{vaga.title}</h2>

          {/* Metadados */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full" style={{ background: `${areaColor}12`, color: areaColor, border: `1px solid ${areaColor}25` }}>
              <i className="ri-file-text-line"></i>{vaga.type}
            </span>
            <span className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full" style={{ background: "rgba(232,160,32,0.10)", color: "#E8A020", border: "1px solid rgba(232,160,32,0.20)" }}>
              <i className="ri-map-pin-line"></i>{vaga.location ?? "Pelotas/RS"}
            </span>
            {vaga.salary && (
              <span className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full" style={{ background: "rgba(34,197,94,0.10)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.20)" }}>
                <i className="ri-money-dollar-circle-line"></i>{vaga.salary}
              </span>
            )}
          </div>

          {/* Infos da oportunidade — data de abertura + candidatos aprovados */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="p-3 rounded-xl" style={{ background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)" }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: textMuted }}>Aberta em</p>
              <p className="text-sm font-semibold" style={{ color: textMain }}>{formatDate(vaga.created_at)}</p>
            </div>
            <div className="p-3 rounded-xl" style={{ background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)" }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: textMuted }}>Status</p>
              <p className="text-sm font-semibold" style={{ color: vaga.status === "active" ? "#22C55E" : vaga.status === "paused" ? "#E8A020" : "rgba(255,255,255,0.40)" }}>
                {vaga.status === "active" ? "Ativa" : vaga.status === "paused" ? "Pausada" : "Encerrada"}
              </p>
            </div>
            {showCandidatos && (
              <>
                <div className="p-3 rounded-xl" style={{ background: isDark ? "rgba(59,191,212,0.08)" : "rgba(59,191,212,0.06)", border: "1px solid rgba(59,191,212,0.15)" }}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: textMuted }}>Candidatos</p>
                  <p className="text-sm font-bold" style={{ color: "#3BBFD4" }}>{loadingCandidatos ? "..." : totalCandidatos}</p>
                </div>
                <div className="p-3 rounded-xl" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)" }}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: textMuted }}>Aprovados</p>
                  <p className="text-sm font-bold" style={{ color: "#22C55E" }}>{loadingCandidatos ? "..." : aprovados}</p>
                </div>
              </>
            )}
          </div>

          {vaga.description && (
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: textMuted }}>Descrição</p>
              <p className="text-sm leading-relaxed" style={{ color: textBody }}>{vaga.description}</p>
            </div>
          )}

          {vaga.requirements && (
            <div className="mb-5 p-4 rounded-xl" style={{ background: `${areaColor}08`, border: `1px solid ${areaColor}15` }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: textMuted }}>Requisitos</p>
              <p className="text-sm leading-relaxed" style={{ color: textBody }}>{vaga.requirements}</p>
            </div>
          )}

          {/* Lista de candidatos (apenas para vereador/assessor/admin) */}
          {showCandidatos && candidatos.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: textMuted }}>
                Candidatos ({totalCandidatos})
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {candidatos.map((c) => {
                  const prof = c.profiles;
                  const avatar = prof?.avatar_url || prof?.profile_photo || null;
                  const statusColor = c.status === "accepted" ? "#22C55E" : c.status === "rejected" ? "#F87171" : "#E8A020";
                  const statusLabel = c.status === "accepted" ? "Aprovado" : c.status === "rejected" ? "Recusado" : "Em análise";
                  const userTypeLabel = prof?.is_service_provider ? "Prestador" : prof?.worker_profile_type === "freelancer" ? "Freelancer" : prof?.worker_profile_type === "mei" ? "MEI" : "Cidadão";
                  const userTypeColor = prof?.is_service_provider ? "#22C55E" : prof?.worker_profile_type === "freelancer" ? "#E8A020" : "#3BBFD4";
                  return (
                    <Link
                      key={c.id}
                      to={`/sistema/perfil/${c.cidadao_id}`}
                      className="flex items-start gap-3 p-3 rounded-xl no-underline transition-colors hover:bg-white/5"
                      style={{ background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)", border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.05)" }}
                    >
                      <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 flex items-center justify-center" style={{ background: isDark ? "rgba(59,191,212,0.15)" : "rgba(59,191,212,0.10)" }}>
                        {avatar ? (
                          <img src={avatar} alt={prof?.full_name ?? "Candidato"} className="w-full h-full object-cover object-top" />
                        ) : (
                          <span className="text-sm font-bold" style={{ color: "#3BBFD4" }}>{(prof?.full_name ?? "?").charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm truncate" style={{ color: textMain }}>{prof?.full_name ?? "Candidato"}</p>
                          <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0" style={{ background: `${userTypeColor}15`, color: userTypeColor, border: `1px solid ${userTypeColor}30` }}>
                            {userTypeLabel}
                          </span>
                        </div>
                        <p className="text-xs" style={{ color: textMuted }}>{prof?.expertise ?? ""} {prof?.education ? `· ${prof.education}` : ""}</p>
                        {c.status === "rejected" && c.rejection_reason && (
                          <p className="text-xs mt-1 italic" style={{ color: textMuted }}>Recusa: {c.rejection_reason}</p>
                        )}
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0" style={{ background: `${statusColor}15`, color: statusColor }}>
                        {statusLabel}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap"
            style={{ background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)", color: isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)", border: isDark ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(0,0,0,0.08)" }}
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Lightbox */}
      <ImageLightbox
        imageUrl={lightboxImage}
        title={lightboxTitle}
        isOpen={!!lightboxImage}
        onClose={() => setLightboxImage(null)}
      />
    </div>
  );
}