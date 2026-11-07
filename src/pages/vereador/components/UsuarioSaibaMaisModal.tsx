import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import ProfilePhotoLightbox from "@/components/feature/ProfilePhotoLightbox";

export interface UsuarioSistema {
  id: string;
  full_name: string | null;
  display_name: string | null;
  role: string;
  email: string | null;
  phone: string | null;
  neighborhood: string | null;
  education: string | null;
  expertise: string | null;
  job_status: string | null;
  job_type: string | null;
  bio: string | null;
  curriculo_pdf: string | null;
  avatar_url: string | null;
  profile_photo: string | null;
  company_name: string | null;
  status: string | null;
  is_service_provider: boolean | null;
  service_categories: string | null;
  service_description: string | null;
  portfolio_photos: string | null;
  created_at: string;
  // Empregabilidade inteligente
  is_employed: boolean | null;
  wants_opportunities: boolean | null;
  employed_through_platform: boolean | null;
  platform_job_details: string | null;
}

function getGrupoLabel(role: string): { label: string; color: string; bg: string } {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    citizen: { label: "Cidadão", color: "#3BBFD4", bg: "rgba(59,191,212,0.12)" },
    empresa: { label: "Empresa", color: "#E8A020", bg: "rgba(232,160,32,0.12)" },
    assessor: { label: "Assessor", color: "#0369A1", bg: "rgba(3,105,161,0.12)" },
    admin: { label: "Admin", color: "#7C3AED", bg: "rgba(124,58,237,0.12)" },
    vereador: { label: "Vereador", color: "#22C55E", bg: "rgba(34,197,94,0.12)" },
  };
  return map[role] ?? { label: role, color: "#888", bg: "rgba(136,136,136,0.10)" };
}

interface UsuarioSaibaMaisModalProps {
  usuario: UsuarioSistema;
  onClose: () => void;
  onPhotoClick?: (url: string, name: string) => void;
}

export default function UsuarioSaibaMaisModal({
  usuario,
  onClose,
  onPhotoClick,
}: UsuarioSaibaMaisModalProps) {
  const u = usuario;
  const gl = getGrupoLabel(u.role);
  const avatar = u.avatar_url || u.profile_photo || null;
  const isCitizen = u.role === "citizen";

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(u.email ?? null);
  const [emailLoading, setEmailLoading] = useState(false);

  // Buscar email se não veio no usuario
  useEffect(() => {
    if (u.email) {
      setEmail(u.email);
      return;
    }
    setEmailLoading(true);
    supabase.functions
      .invoke("get-user-details", { body: { user_id: u.id } })
      .then(({ data }) => {
        if (data?.success && data?.user?.email) {
          setEmail(data.user.email);
        }
      })
      .catch(() => { /* silent */ })
      .finally(() => setEmailLoading(false));
  }, [u.id, u.email]);

  const handlePhotoClick = () => {
    if (avatar) {
      if (onPhotoClick) {
        onPhotoClick(avatar, u.full_name ?? "Usuário");
      } else {
        setLightboxOpen(true);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 cursor-pointer"
        style={{ background: "rgba(0,0,0,0.60)", backdropFilter: "blur(6px)" }}
        onClick={onClose}
      />

      {/* Modal container */}
      <div
        className="relative w-full max-w-lg max-h-[90vh] rounded-2xl overflow-hidden flex flex-col"
        style={{ background: "#1a2332", border: "1px solid rgba(255,255,255,0.10)" }}
      >
        {/* Header gradient */}
        <div
          className="relative h-32 shrink-0"
          style={{ background: "linear-gradient(135deg, #1B2A5E, #3BBFD4)" }}
        >
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)",
              backgroundSize: "16px 16px",
            }}
          ></div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-colors hover:bg-white/20"
            style={{ background: "rgba(255,255,255,0.15)", color: "white" }}
          >
            <i className="ri-close-line"></i>
          </button>
          <span
            className="absolute bottom-4 right-4 inline-flex text-xs font-bold px-3 py-1 rounded-full"
            style={{ color: gl.color, background: gl.bg, border: `1px solid ${gl.color}40` }}
          >
            {gl.label}
          </span>
        </div>

        {/* Avatar — absolutamente posicionado sobre a borda header/content */}
        <div className="absolute top-[88px] left-5 z-20">
          {avatar ? (
            <button
              onClick={handlePhotoClick}
              className="w-20 h-20 rounded-2xl overflow-hidden border-4 block cursor-pointer hover:scale-105 transition-transform shrink-0"
              style={{ borderColor: "#1a2332" }}
            >
              <img
                src={avatar}
                alt={u.full_name ?? "Usuário"}
                className="w-full h-full object-cover object-top"
              />
            </button>
          ) : (
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-extrabold border-4 shrink-0"
              style={{ background: gl.bg, color: gl.color, borderColor: "#1a2332" }}
            >
              {(u.full_name ?? "?").charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 pt-14 pb-6">
          {/* Name row */}
          <div className="flex items-center gap-4 mb-6">
            {/* Spacer para o avatar absoluto */}
            <div className="w-20 shrink-0"></div>
            <div className="min-w-0">
              <h2 className="text-white font-extrabold text-lg leading-tight">
                {u.full_name ?? "Sem nome"}
              </h2>
              {u.display_name && u.display_name !== u.full_name && (
                <p className="text-white/40 text-sm mt-0.5">{u.display_name}</p>
              )}
            </div>
          </div>

          {/* Informações de contato */}
          <div
            className="mb-5 p-4 rounded-xl"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-3">
              <i className="ri-contacts-book-line mr-1" style={{ color: "#E8A020" }}></i>
              Informações de Contato
            </p>
            <div className="space-y-2.5">
              {/* Email */}
              <div className="flex items-start gap-2.5">
                <i className="ri-mail-line text-sm mt-0.5 shrink-0" style={{ color: "#3BBFD4" }}></i>
                <div className="min-w-0 flex-1">
                  {emailLoading ? (
                    <span className="text-white/30 text-sm">Carregando e-mail...</span>
                  ) : email ? (
                    <span className="text-white text-sm font-semibold break-all">{email}</span>
                  ) : (
                    <span className="text-white/30 text-sm">E-mail não disponível</span>
                  )}
                  <span className="text-white/25 text-xs ml-2">E-mail</span>
                </div>
              </div>
              {u.phone && (
                <div className="flex items-start gap-2.5">
                  <i className="ri-phone-line text-sm mt-0.5 shrink-0" style={{ color: "#22C55E" }}></i>
                  <div className="min-w-0">
                    <span className="text-white text-sm font-semibold">{u.phone}</span>
                    <span className="text-white/25 text-xs ml-2">Telefone</span>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2.5">
                <i className="ri-map-pin-line text-sm mt-0.5 shrink-0" style={{ color: "#E8A020" }}></i>
                <div className="min-w-0">
                  <span className="text-white text-sm font-semibold">
                    {u.neighborhood || "Pelotas/RS"}
                  </span>
                  <span className="text-white/25 text-xs ml-2">Localização</span>
                </div>
              </div>
              {u.role === "empresa" && u.company_name && (
                <div className="flex items-start gap-2.5">
                  <i className="ri-building-line text-sm mt-0.5 shrink-0" style={{ color: "#3BBFD4" }}></i>
                  <div className="min-w-0">
                    <span className="text-white text-sm font-semibold">{u.company_name}</span>
                    <span className="text-white/25 text-xs ml-2">Empresa</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Se for cidadão, mostra currículo */}
          {isCitizen && (
            <>
              {(u.expertise || u.education || u.job_type) && (
                <div className="mb-5">
                  <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-3">
                    <i className="ri-file-user-line mr-1" style={{ color: "#3BBFD4" }}></i>
                    Informações Profissionais
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {u.expertise && (
                      <div
                        className="flex items-start gap-2.5 p-3 rounded-xl"
                        style={{ background: "rgba(255,255,255,0.05)" }}
                      >
                        <span
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: "rgba(232,160,32,0.20)" }}
                        >
                          <i className="ri-briefcase-4-line text-sm" style={{ color: "#E8A020" }}></i>
                        </span>
                        <div className="min-w-0">
                          <p className="text-white/35 text-xs">Área</p>
                          <p className="text-white font-semibold text-sm">{u.expertise}</p>
                        </div>
                      </div>
                    )}
                    {u.education && (
                      <div
                        className="flex items-start gap-2.5 p-3 rounded-xl"
                        style={{ background: "rgba(255,255,255,0.05)" }}
                      >
                        <span
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: "rgba(59,191,212,0.20)" }}
                        >
                          <i className="ri-graduation-cap-line text-sm" style={{ color: "#3BBFD4" }}></i>
                        </span>
                        <div className="min-w-0">
                          <p className="text-white/35 text-xs">Formação</p>
                          <p className="text-white font-semibold text-sm">{u.education}</p>
                        </div>
                      </div>
                    )}
                    {u.job_type && (
                      <div
                        className="flex items-start gap-2.5 p-3 rounded-xl"
                        style={{ background: "rgba(255,255,255,0.05)" }}
                      >
                        <span
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: "rgba(34,197,94,0.20)" }}
                        >
                          <i className="ri-file-text-line text-sm" style={{ color: "#22C55E" }}></i>
                        </span>
                        <div className="min-w-0">
                          <p className="text-white/35 text-xs">Tipo de Vaga</p>
                          <p className="text-white font-semibold text-sm">{u.job_type}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {u.bio && (
                <div
                  className="mb-5 p-4 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">
                    Descrição Profissional
                  </p>
                  <p className="text-white/60 text-sm leading-relaxed">{u.bio}</p>
                </div>
              )}

              {/* Empregabilidade inteligente */}
              <div
                className="mb-4 p-4 rounded-xl"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-3">
                  <i className="ri-survey-line mr-1" style={{ color: "#E8A020" }}></i>
                  Situação de Empregabilidade
                </p>
                <div className="space-y-2">
                  {/* Status emprego */}
                  <div className="flex items-center gap-2">
                    {u.is_employed === true ? (
                      <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: "rgba(34,197,94,0.15)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.30)" }}>
                        <i className="ri-briefcase-fill"></i>Empregado
                      </span>
                    ) : u.is_employed === false ? (
                      <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: "rgba(232,160,32,0.15)", color: "#E8A020", border: "1px solid rgba(232,160,32,0.30)" }}>
                        <i className="ri-search-line"></i>Desempregado
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)" }}>
                        <i className="ri-question-mark"></i>Não informado
                      </span>
                    )}
                    {/* Busca vagas */}
                    {u.wants_opportunities === true || (u.job_status !== "not_looking" && u.is_employed !== true) ? (
                      <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: "rgba(59,191,212,0.15)", color: "#3BBFD4", border: "1px solid rgba(59,191,212,0.30)" }}>
                        <i className="ri-send-plane-line"></i>Busca vagas
                      </span>
                    ) : u.wants_opportunities === false || u.job_status === "not_looking" || u.is_employed === true ? (
                      <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: "rgba(107,114,128,0.15)", color: "#9CA3AF", border: "1px solid rgba(107,114,128,0.25)" }}>
                        <i className="ri-pause-circle-line"></i>Não busca vagas
                      </span>
                    ) : null}
                  </div>
                  {/* Contratado pelo sistema */}
                  {u.employed_through_platform && (
                    <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.18)" }}>
                      <i className="ri-trophy-fill mt-0.5 shrink-0" style={{ color: "#22C55E" }}></i>
                      <div>
                        <p className="text-white font-bold text-xs">Contratado pelo Sistema</p>
                        {u.platform_job_details && (
                          <p className="text-white/45 text-xs mt-0.5 leading-relaxed">“{u.platform_job_details}”</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {u.curriculo_pdf && (
                <a
                  href={u.curriculo_pdf}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  className="flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all mb-4 hover:opacity-90"
                  style={{ background: "rgba(59,191,212,0.12)", border: "1px solid rgba(59,191,212,0.25)" }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "rgba(59,191,212,0.25)" }}
                  >
                    <i className="ri-file-pdf-line text-xl" style={{ color: "#3BBFD4" }}></i>
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">Currículo em PDF</p>
                    <p className="text-white/40 text-xs">Clique para abrir em nova aba</p>
                  </div>
                  <i className="ri-external-link-line ml-auto text-white/30"></i>
                </a>
              )}
            </>
          )}

          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap hover:bg-white/12 transition-colors"
            style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.60)" }}
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Lightbox interno */}
      <ProfilePhotoLightbox
        imageUrl={lightboxOpen ? avatar : null}
        userName={u.full_name}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
}