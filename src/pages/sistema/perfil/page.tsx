import { useState, useEffect } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { getStoredUser } from "@/hooks/useAuth";
import ProfilePhotoLightbox from "@/components/feature/ProfilePhotoLightbox";

interface PublicProfile {
  id: string;
  full_name: string | null;
  display_name: string | null;
  phone: string | null;
  neighborhood: string | null;
  education: string | null;
  expertise: string | null;
  job_type: string | null;
  job_status: string | null;
  bio: string | null;
  curriculo_pdf: string | null;
  avatar_url: string | null;
  profile_photo: string | null;
  created_at: string;
  role: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  city: string | null;
  state: string | null;
  cep: string | null;
  is_service_provider: boolean | null;
  service_categories: string | null;
  service_description: string | null;
  portfolio_photos: string | null;
  wants_opportunities: boolean | null;
  employed_through_platform: boolean | null;
  platform_job_details: string | null;
  is_employed: boolean | null;
}

export default function PerfilPublicoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isEmpresa, setIsEmpresa] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [portfolioLightboxUrl, setPortfolioLightboxUrl] = useState<string | null>(null);

  // Ler contexto de navegacao da URL (?from=empresa&tab=curriculos)
  const fromSource = searchParams.get("from");
  const fromTab = searchParams.get("tab");
  const selectedCandidatura = searchParams.get("selected");

  useEffect(() => {
    const stored = getStoredUser();
    if (stored?.role === "empresa" || stored?.role === "admin") {
      setIsEmpresa(true);
    }
  }, []);

  const goBack = () => {
    // Se tem contexto de origem na URL, usar navegacao explicita
    if (fromSource === "empresa") {
      const tab = fromTab || "curriculos";
      const selected = selectedCandidatura ? `&selected=${selectedCandidatura}` : "";
      navigate(`/sistema/painel/empresa?tab=${tab}${selected}`);
    } else if (fromSource === "cidadao") {
      const tab = fromTab || "candidaturas";
      const selected = selectedCandidatura ? `&selected=${selectedCandidatura}` : "";
      navigate(`/sistema/painel/cidadao?tab=${tab}${selected}`);
    } else if (fromSource === "vereador") {
      navigate(`/vereador?tab=usuarios`);
    } else if (fromSource === "assessor") {
      navigate(`/assessor/painel?tab=usuarios`);
    } else if (window.history.length > 2) {
      navigate(-1);
    } else if (isEmpresa) {
      navigate("/sistema/painel/empresa?tab=curriculos");
    } else {
      navigate("/sistema/painel/cidadao");
    }
  };

  useEffect(() => {
    if (!id) { setNotFound(true); setLoading(false); return; }
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, phone, neighborhood, education, expertise, job_type, job_status, bio, curriculo_pdf, created_at, role, display_name, avatar_url, profile_photo, street, number, complement, city, state, cep, is_service_provider, service_categories, service_description, portfolio_photos")
        .eq("id", id)
        .eq("role", "citizen")
        .maybeSingle();
      if (error || !data) { setNotFound(true); } else { setProfile(data as PublicProfile); }
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0D1629" }}>
        <div className="w-10 h-10 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(59,191,212,0.3)", borderTopColor: "#3BBFD4" }}></div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "#0D1629" }}>
        <i className="ri-user-unfollow-line text-white/20 text-6xl"></i>
        <p className="text-white/50 font-semibold text-lg">Perfil não encontrado</p>
        <p className="text-white/30 text-sm">Este cidadão não existe ou o perfil é privado</p>
        <button onClick={goBack} className="mt-2 px-6 py-2.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap" style={{ background: "rgba(59,191,212,0.15)", color: "#3BBFD4", border: "1px solid rgba(59,191,212,0.25)" }}>
          <i className="ri-arrow-left-line mr-2"></i>Voltar
        </button>
      </div>
    );
  }

  const initials = (profile?.full_name ?? "?").split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
  const memberSince = profile?.created_at ? new Date(profile.created_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "America/Sao_Paulo" }) : "";

  const avatarUrl = profile?.avatar_url || profile?.profile_photo || null;
  const showAvatar = avatarUrl && !avatarError;

  const addressParts = [
    profile?.street,
    profile?.number,
    profile?.complement,
    profile?.neighborhood,
    profile?.city,
    profile?.state,
  ].filter(Boolean);
  const fullAddress = addressParts.length > 0 ? addressParts.join(", ") : null;

  const infoItems = [
    { label: "Formação", value: profile?.education, icon: "ri-graduation-cap-line", color: "#E8A020" },
    { label: "Área de Expertise", value: profile?.expertise, icon: "ri-star-line", color: "#3BBFD4" },
    { label: "Tipo de contrato", value: profile?.job_type, icon: "ri-file-text-line", color: "#3BBFD4" },
    { label: "Bairro", value: profile?.neighborhood, icon: "ri-map-pin-line", color: "#22C55E" },
  ];

  const contactItems = [
    { label: "Telefone", value: profile?.phone, icon: "ri-phone-line", color: "#22C55E" },
    { label: "Endereço", value: fullAddress, icon: "ri-home-3-line", color: "#3BBFD4" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#0D1629" }}>
      {/* Top bar */}
      <nav className="sticky top-0 z-50" style={{ background: "rgba(13,22,41,0.97)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="max-w-screen-xl mx-auto px-4 flex items-center h-14 gap-3">
          <button onClick={goBack} className="w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer transition-colors" style={{ background: "rgba(255,255,255,0.06)" }}>
            <i className="ri-arrow-left-line text-white/60 text-lg"></i>
          </button>
          <Link to="/sistema" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black" style={{ background: "linear-gradient(135deg, #E8A020, #f5b94a)", color: "#0D1629" }}>AH</div>
            <span className="text-white/60 text-sm hidden sm:inline">Oportunidades</span>
          </Link>
          <span className="text-white/20 hidden sm:inline">/</span>
          <span className="text-white/60 text-sm hidden sm:inline">Perfil do Candidato</span>
          <div className="ml-auto">
            <button onClick={goBack} className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap" style={{ background: "rgba(59,191,212,0.12)", color: "#3BBFD4", border: "1px solid rgba(59,191,212,0.20)" }}>
              <i className="ri-arrow-left-line"></i>Voltar
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Capa e avatar */}
        <div className="rounded-3xl overflow-hidden mb-5" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>
          {/* Capa */}
          <div className="h-32 relative" style={{ background: "linear-gradient(135deg, #1B2A5E 0%, #0D1629 50%, #163B3B 100%)" }}>
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, rgba(255,255,255,0.6) 1px, transparent 0)", backgroundSize: "24px 24px" }}></div>
            {/* Status badge — inteligente com 4 estados */}
            <div className="absolute top-3 right-4">
              {profile?.job_status !== "not_looking" ? (
                <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: "rgba(232,160,32,0.90)", color: "#0D1629" }}>
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-[#0D1629]"></span>Procurando emprego
                </span>
              ) : profile?.job_status === "not_looking" ? (
                <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: "rgba(34,197,94,0.90)", color: "#0D1629" }}>
                  <i className="ri-briefcase-fill"></i>Empregado — não busca vagas
                </span>
              ) : profile?.job_status === "not_looking" ? (
                <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: "rgba(107,114,128,0.85)", color: "white" }}>
                  <i className="ri-pause-circle-line"></i>Não busca emprego
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: "rgba(34,197,94,0.90)", color: "#0D1629" }}>
                  <i className="ri-checkbox-circle-fill"></i>Empregado
                </span>
              )}
            </div>
          </div>

          <div className="px-6 pb-6">
            {/* Avatar com lupa */}
            <div className="-mt-8 mb-4 relative">
              {showAvatar ? (
                <div className="relative inline-block">
                  <img
                    src={avatarUrl}
                    alt={profile?.full_name ?? "Candidato"}
                    className="w-20 h-20 rounded-2xl object-cover object-top border-[3px]"
                    style={{ borderColor: "#0D1629" }}
                    onError={() => setAvatarError(true)}
                  />
                  <button
                    onClick={() => setLightboxOpen(true)}
                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer border-2"
                    style={{ background: "rgba(0,0,0,0.50)", borderColor: "#0D1629" }}
                    title="Ver foto em tela cheia"
                  >
                    <i className="ri-zoom-in-line text-white text-xs"></i>
                  </button>
                </div>
              ) : (
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl border-[3px]"
                  style={{ background: "linear-gradient(135deg, #1B2A5E, #3BBFD4)", borderColor: "#0D1629" }}
                >
                  {initials}
                </div>
              )}
            </div>

            <h1 className="text-white font-extrabold text-2xl mb-1">{(profile?.display_name || profile?.full_name) ?? "Sem nome"}</h1>
            {profile?.expertise && (
              <p className="text-white/55 text-sm mb-1">{profile.expertise}</p>
            )}
            <p className="text-white/30 text-xs mb-5">Membro desde {memberSince}</p>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              {infoItems.map((item) => (
                <div key={item.label} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${item.color}20` }}>
                    <i className={`${item.icon} text-sm`} style={{ color: item.color }}></i>
                  </span>
                  <div className="min-w-0">
                    <p className="text-white/35 text-xs">{item.label}</p>
                    <p className="text-white font-semibold text-sm truncate">{item.value ?? "Não informado"}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Contato (visível para empresa) */}
            {(isEmpresa || profile?.phone || fullAddress) && (
              <div className="mb-5 p-4 rounded-xl" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }}>
                <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-3">
                  <i className="ri-contacts-line mr-1" style={{ color: "#22C55E" }}></i>Informações de Contato
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {contactItems.map((item) => (
                    <div key={item.label} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
                      <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${item.color}20` }}>
                        <i className={`${item.icon} text-sm`} style={{ color: item.color }}></i>
                      </span>
                      <div className="min-w-0">
                        <p className="text-white/35 text-xs">{item.label}</p>
                        <p className="text-white font-semibold text-sm truncate">{item.value ?? "Não informado"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bio */}
            {profile?.bio && (
              <div className="mb-5 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">
                  <i className="ri-user-line mr-1"></i>Sobre o candidato
                </p>
                <p className="text-white/65 text-sm leading-relaxed">{profile.bio}</p>
              </div>
            )}

            {/* Serviços como prestador */}
            {profile?.is_service_provider && (
              <div className="mb-5 p-4 rounded-xl" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.18)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(34,197,94,0.20)" }}>
                    <i className="ri-tools-line text-sm" style={{ color: "#22C55E" }}></i>
                  </span>
                  <p className="text-white/50 text-xs font-bold uppercase tracking-wider">Prestador de Serviços</p>
                </div>
                {profile.service_categories && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {(profile.service_categories ?? "").split(",").map((cat) => (
                      <span key={cat} className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(34,197,94,0.15)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.20)" }}>
                        {cat.trim()}
                      </span>
                    ))}
                  </div>
                )}
                {profile.service_description && (
                  <p className="text-white/50 text-sm leading-relaxed">{profile.service_description}</p>
                )}
              </div>
            )}

            {/* Portfólio de Serviços */}
            {profile?.portfolio_photos && (() => {
              const fotos = profile.portfolio_photos.split("|").filter(Boolean);
              if (fotos.length === 0) return null;
              return (
                <div className="mb-5">
                  <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-3">
                    <i className="ri-image-line mr-1" style={{ color: "#E8A020" }}></i>Portfólio de Serviços
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {fotos.map((url, i) => (
                      <button
                        key={i}
                        onClick={() => setPortfolioLightboxUrl(url)}
                        className="relative aspect-square rounded-xl overflow-hidden bg-gray-800 cursor-pointer group border border-white/10"
                      >
                        <img
                          src={url}
                          alt={`Portfólio ${i + 1}`}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,0.40)" }}>
                          <i className="ri-zoom-in-line text-white text-lg"></i>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Badge: Contratado pelo sistema */}
            {profile?.employed_through_platform && (
              <div className="mb-5 p-4 rounded-xl" style={{ background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.25)" }}>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(34,197,94,0.20)" }}>
                    <i className="ri-trophy-fill text-sm" style={{ color: "#22C55E" }}></i>
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">Contratado pelo Sistema</p>
                    <p className="text-white/50 text-xs mt-0.5 leading-relaxed">
                      Este profissional conseguiu emprego pela plataforma do Gabinete.
                      {profile.platform_job_details && ` “${profile.platform_job_details}”`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Currículo */}
            {profile?.curriculo_pdf ? (
              <a
                href={profile.curriculo_pdf}
                target="_blank"
                rel="nofollow noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all"
                style={{ background: "rgba(59,191,212,0.10)", border: "1px solid rgba(59,191,212,0.25)" }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(59,191,212,0.20)" }}>
                  <i className="ri-file-pdf-line text-xl" style={{ color: "#3BBFD4" }}></i>
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Ver Currículo em PDF</p>
                  <p className="text-white/40 text-xs">Arquivo enviado pelo candidato</p>
                </div>
                <i className="ri-external-link-line ml-auto text-white/30"></i>
              </a>
            ) : (
              <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.10)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <i className="ri-file-text-line text-xl text-white/20"></i>
                </div>
                <div>
                  <p className="text-white/40 font-semibold text-sm">Currículo não disponível no perfil</p>
                  <p className="text-white/25 text-xs">O currículo pode ter sido enviado na candidatura</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Aviso de privacidade */}
        <div className="flex items-start gap-3 p-4 rounded-2xl" style={{ background: "rgba(27,42,94,0.40)", border: "1px solid rgba(27,42,94,0.60)" }}>
          <i className="ri-information-line text-white/30 text-lg shrink-0 mt-0.5"></i>
          <p className="text-white/35 text-xs leading-relaxed">
            Este perfil é público para empresas registradas no sistema. As informações exibidas foram fornecidas pelo próprio cidadão.
          </p>
        </div>
      </div>

      {/* Lightbox do avatar */}
      <ProfilePhotoLightbox
        imageUrl={avatarUrl}
        userName={profile?.full_name ?? "Candidato"}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />

      {/* Lightbox do portfólio */}
      <ProfilePhotoLightbox
        imageUrl={portfolioLightboxUrl}
        userName={profile?.full_name ?? "Candidato"}
        isOpen={!!portfolioLightboxUrl}
        onClose={() => setPortfolioLightboxUrl(null)}
      />
    </div>
  );
}