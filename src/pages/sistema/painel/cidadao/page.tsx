import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { getStoredUser, clearStoredUser } from "@/hooks/useAuth";
import { useResilientRealtime } from "@/hooks/useResilientRealtime";
import VagaCard from "./components/VagaCard";
import PerfilSidebar from "./components/PerfilSidebar";
import PrestadoresTab from "./components/PrestadoresTab";
import NotificationBell from "@/components/feature/NotificationBell";
import VagaDetailModal from "@/components/feature/VagaDetailModal";
import type { VagaPublica } from "@/components/feature/VagaCardPublica";
import { enviarEmailNotificacao } from "@/hooks/useNotifications";
import TourGuide from "@/components/feature/TourGuide";
import { useTour } from "@/hooks/useTour";
import { cidadaoVagasTour } from "@/mocks/tours/cidadao-vagas-tour";

interface Profile {
  id: string;
  full_name: string | null;
  display_name: string | null;
  phone: string | null;
  neighborhood: string | null;
  job_status: string | null;
  is_employed: boolean | null;
  employed_through_platform: boolean | null;
  curriculo_pdf: string | null;
  education: string | null;
  expertise: string | null;
  job_type: string | null;
  bio: string | null;
  avatar_url: string | null;
  profile_photo: string | null;
  registration_complete: boolean | null;
  worker_profile_type: string | null;
  portfolio_photos: string | null;
}

interface Vaga {
  id: number;
  title: string;
  area: string | null;
  type: string;
  location: string | null;
  salary: string | null;
  description: string | null;
  requirements: string | null;
  status: string;
  company_name: string | null;
  company_id?: string;
  image_url?: string | null;
  created_at: string;
}

interface CandidaturaCount {
  vaga_id: number;
  count: number;
}

interface PrestadorProfile {
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
  service_categories: string | null;
  service_description: string | null;
  portfolio_photos: string | null;
}

interface MinhaCandidatura {
  id: number;
  vaga_id: number;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  vagas?: { title: string; company_name: string; area: string; type: string } | null;
}

const AREAS = ["Todas", "Administrativo", "Tecnologia", "Saúde", "Educação", "Construção Civil", "Alimentação", "Logística", "Varejo", "Serviços Gerais"];
const JOB_TYPES = ["Todos", "CLT", "PJ", "Freelance", "Estágio", "Temporário", "Aprendiz"];

export default function SistemaCidadaoPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [user, setUser] = useState<{ id: string; email: string; role: string; full_name?: string; display_name?: string; avatar_url?: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [candidaturas, setCandidaturas] = useState<number[]>([]);
  const [minhasCandidaturas, setMinhasCandidaturas] = useState<MinhaCandidatura[]>([]);
  const [candidaturasCounts, setCandidaturasCounts] = useState<CandidaturaCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeArea, setActiveArea] = useState("Todas");
  const [activeJobType, setActiveJobType] = useState("Todos");
  const [activeTab, setActiveTab] = useState<"feed" | "candidaturas" | "prestadores">(
    (searchParams.get("tab") as "feed" | "candidaturas" | "prestadores") || "feed"
  );
  const [showCompleteProfile, setShowCompleteProfile] = useState(false);
  // Prestadores
  const [prestadores, setPrestadores] = useState<PrestadorProfile[]>([]);
  const [searchPrestador, setSearchPrestador] = useState("");
  const [filterPrestCat, setFilterPrestCat] = useState("Todas");
  const [selectedPrestador, setSelectedPrestador] = useState<PrestadorProfile | null>(null);
  // Mapa de avatares das empresas (company_id → avatar_url)
  const [companyAvatars, setCompanyAvatars] = useState<Record<string, string>>({});
  // Modal de detalhes da vaga (para uso no "Saiba Mais" das candidaturas)
  const [selectedVagaDetail, setSelectedVagaDetail] = useState<VagaPublica | null>(null);
  const [showVagaDetailModal, setShowVagaDetailModal] = useState(false);

  // Tour guiado do ambiente de vagas
  const tour = useTour(cidadaoVagasTour, true);

  const openVagaDetail = (vaga: Vaga) => {
    const vagaPublica: VagaPublica = {
      ...vaga,
      company_avatar: vaga.company_id ? (companyAvatars?.[vaga.company_id] || null) : null,
      image_url: vaga.image_url || null,
    };
    setSelectedVagaDetail(vagaPublica);
    setShowVagaDetailModal(true);
  };

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      navigate("/auth?from=/sistema/painel/cidadao");
      return;
    }
    if (stored.role === "empresa") {
      navigate("/sistema/painel/empresa");
      return;
    }
    setUser({ id: stored.id, email: stored.email, role: stored.role, full_name: stored.full_name, display_name: stored.display_name, avatar_url: stored.avatar_url });

    (async () => {
      const [{ data: prof }, { data: vagasData }, { data: cands }, { data: allCands }, { data: minhasCands }, { data: rejeitadas }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", stored.id).maybeSingle(),
        supabase.from("vagas").select("*").eq("status", "active").order("created_at", { ascending: false }),
        supabase.from("candidaturas").select("vaga_id").eq("cidadao_id", stored.id),
        supabase.from("candidaturas").select("vaga_id"),
        supabase.from("candidaturas").select("id, vaga_id, status, rejection_reason, created_at, vagas(title, company_name, area, type)").eq("cidadao_id", stored.id).order("created_at", { ascending: false }),
        supabase.from("candidaturas").select("vaga_id").eq("cidadao_id", stored.id).eq("status", "rejected"),
      ]);
      const p = prof as Profile;
      setProfile(p);

      // Vagas recusadas não aparecem no feed para esse cidadão
      const rejeitadasIds = ((rejeitadas as { vaga_id: number }[]) ?? []).map((r) => r.vaga_id);
      const todasVagas = (vagasData as Vaga[]) ?? [];
      setVagas(todasVagas.filter((v) => !rejeitadasIds.includes(v.id)));
      setCandidaturas(((cands as { vaga_id: number }[]) ?? []).map((c) => c.vaga_id));
      setMinhasCandidaturas((minhasCands as MinhaCandidatura[]) ?? []);

      const countMap: Record<number, number> = {};
      ((allCands as { vaga_id: number }[]) ?? []).forEach((c) => {
        countMap[c.vaga_id] = (countMap[c.vaga_id] ?? 0) + 1;
      });
      setCandidaturasCounts(Object.entries(countMap).map(([vagaId, count]) => ({ vaga_id: Number(vagaId), count })));

      // Verificar se perfil está completo para acessar feed
      if (p && !p.registration_complete) {
        setShowCompleteProfile(true);
      }

      setLoading(false);
    })();

    // Buscar prestadores
    (async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, display_name, phone, neighborhood, education, expertise, job_type, job_status, bio, curriculo_pdf, avatar_url, profile_photo, service_categories, service_description, portfolio_photos")
          .eq("role", "citizen")
          .eq("is_service_provider", true)
          .order("full_name", { ascending: true });
        setPrestadores((data as PrestadorProfile[]) ?? []);
      } catch (_) { /* silent */ }
    })();

    // Buscar avatares das empresas
    (async () => {
      try {
        const { data: empresas } = await supabase
          .from("profiles")
          .select("id, avatar_url, profile_photo")
          .eq("role", "empresa");
        const map: Record<string, string> = {};
        (empresas ?? []).forEach((e: any) => {
          map[e.id] = e.avatar_url || e.profile_photo || "";
        });
        setCompanyAvatars(map);
      } catch (_) { /* silent */ }
    })();

    // AUTO-DISPARO: enviar emails pendentes de notificações de aprovação
    (async () => {
      try {
        const [ { data: notifs }, { data: profileEmail } ] = await Promise.all([
          supabase
            .from("notificacoes")
            .select("id, tipo, titulo, mensagem, created_at")
            .eq("user_id", stored.id)
            .eq("tipo", "aprovacao")
            .order("created_at", { ascending: false })
            .limit(20),
          supabase
            .from("profiles")
            .select("email")
            .eq("id", stored.id)
            .maybeSingle(),
        ]);
        if (!notifs || notifs.length === 0) return;
        const userEmail = (profileEmail as { email: string | null } | null)?.email ?? null;
        const sentKey = `email_sent_notifs_${stored.id}`;
        let sentIds: string[] = [];
        try {
          sentIds = JSON.parse(localStorage.getItem(sentKey) || "[]");
        } catch { sentIds = []; }
        for (const n of notifs) {
          if (sentIds.includes(n.id)) continue;
          console.log("[AutoEmail] Disparando email para notificação:", n.id, n.titulo, "email:", userEmail);
          await enviarEmailNotificacao(stored.id, n.tipo, n.titulo, n.mensagem, {
            remetenteNome: "Empresa",
            panelUrl: "https://arthurhalal.com.br/sistema/painel/cidadao",
            recipientEmail: userEmail,
          });
          sentIds.push(n.id);
          localStorage.setItem(sentKey, JSON.stringify(sentIds));
        }
      } catch (_) { /* silent */ }
    })();
  }, [navigate]);

  // Sync activeTab with URL params (supports notification redirects)
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab") as "feed" | "candidaturas" | "prestadores" | null;
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  // Scroll automatico para candidatura especifica quando ?selected= esta na URL
  useEffect(() => {
    const selectedId = searchParams.get("selected");
    if (!selectedId || minhasCandidaturas.length === 0) return;
    // Garantir que estamos na aba de candidaturas
    if (activeTab !== "candidaturas") return;
    const tryScroll = () => {
      const target = document.getElementById(`candidatura-${selectedId}`);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        // Destacar o card visualmente
        target.style.transition = "box-shadow 0.3s";
        target.style.boxShadow = "0 0 0 3px rgba(59,191,212,0.60)";
        setTimeout(() => { target.style.boxShadow = ""; }, 2500);
      }
    };
    // Dar tempo para o DOM renderizar
    const timer = setTimeout(tryScroll, 400);
    return () => clearTimeout(timer);
  }, [searchParams, minhasCandidaturas, activeTab]);

  const handleTabChange = (newTab: "feed" | "candidaturas" | "prestadores") => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab });
  };

  // ITEM 04 — Polling fallback de segurança (30s): camada extra anti-F5
  // Se o realtime falhar silenciosamente, o polling garante dados atualizados
  // BUGFIX: antes era 1 segundo (60 queries/minuto!), agora 30 segundos
  // BUGFIX: filtrar vagas rejeitadas também no polling (regra de ouro)
  useEffect(() => {
    if (loading || !user?.id) return;
    const interval = setInterval(async () => {
      console.log("[Cidadao] Polling fallback: verificando atualizações...");
      try {
        const [{ data: vagasData }, { data: cands }, { data: minhasCands }, { data: rejeitadasData }] = await Promise.all([
          supabase.from("vagas").select("*").eq("status", "active").order("created_at", { ascending: false }),
          supabase.from("candidaturas").select("vaga_id").eq("cidadao_id", user.id),
          supabase.from("candidaturas").select("id, vaga_id, status, rejection_reason, created_at, vagas(title, company_name, area, type)").eq("cidadao_id", user.id).order("created_at", { ascending: false }),
          supabase.from("candidaturas").select("vaga_id").eq("cidadao_id", user.id).eq("status", "rejected"),
        ]);
        // Filtra vagas recusadas — regra de ouro: rejeitado não vê a vaga
        const rejeitadasIds = ((rejeitadasData as { vaga_id: number }[]) ?? []).map((r) => r.vaga_id);
        const todasVagas = (vagasData as Vaga[]) ?? [];
        if (vagasData) setVagas(todasVagas.filter((v) => !rejeitadasIds.includes(v.id)));
        if (cands) setCandidaturas(((cands as { vaga_id: number }[]) ?? []).map(c => c.vaga_id));
        if (minhasCands) setMinhasCandidaturas((minhasCands as MinhaCandidatura[]) ?? []);
      } catch (e) { console.error("[Cidadao] Polling fallback erro:", e); }
    }, 30000);
    return () => clearInterval(interval);
  }, [loading, user?.id]);

  const handleCandidatou = useCallback((vagaId: number) => {
    setCandidaturas((prev) => [...prev, vagaId]);
  }, []);

  // Callback do realtime de vagas — busca todas, filtra recusadas, atualiza feed
  const onVagasChange = useCallback(async () => {
    try {
      const { data: vagasData } = await supabase
        .from("vagas")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (!vagasData) return;
      // Filtra vagas recusadas para este cidadao — consulta sempre o banco, sem depender de estado React
      const { data: rejeitadas } = await supabase
        .from("candidaturas")
        .select("vaga_id")
        .eq("cidadao_id", user?.id ?? "")
        .eq("status", "rejected");
      const rejeitadasIds = (rejeitadas as { vaga_id: number }[] ?? []).map((r) => r.vaga_id);
      setVagas((vagasData as Vaga[]).filter((v) => !rejeitadasIds.includes(v.id)));
    } catch (e) {
      console.warn("[Cidadao] Realtime vagas callback erro:", e);
    }
  }, [user?.id]);

  // Callback do realtime de candidaturas — atualiza contagens e lista
  const onCandidaturasChange = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [{ data: cands }, { data: minhasCands }] = await Promise.all([
        supabase.from("candidaturas").select("vaga_id").eq("cidadao_id", user.id),
        supabase.from("candidaturas").select("id, vaga_id, status, rejection_reason, created_at, vagas(title, company_name, area, type)").eq("cidadao_id", user.id).order("created_at", { ascending: false }),
      ]);
      setCandidaturas(((cands as { vaga_id: number }[]) ?? []).map((c) => c.vaga_id));
      setMinhasCandidaturas((minhasCands as MinhaCandidatura[]) ?? []);
    } catch (e) {
      console.warn("[Cidadao] Realtime candidaturas callback erro:", e);
    }
  }, [user?.id]);

  // Realtime resiliente: vagas novas/atualizadas aparecem automaticamente no feed
  useResilientRealtime(
    "sistema-cidadao-vagas",
    "vagas",
    onVagasChange,
    !loading
  );

  // Realtime resiliente: candidaturas (INSERT/DELETE) atualiza contagens automaticamente
  useResilientRealtime(
    "sistema-cidadao-candidaturas",
    "candidaturas",
    onCandidaturasChange,
    !loading && !!user?.id,
    `cidadao_id=eq.${user?.id ?? ""}`
  );

  const filteredVagas = vagas.filter((v) => {
    const matchSearch = !search || v.title.toLowerCase().includes(search.toLowerCase()) || (v.company_name ?? "").toLowerCase().includes(search.toLowerCase()) || (v.area ?? "").toLowerCase().includes(search.toLowerCase());
    const matchArea = activeArea === "Todas" || v.area === activeArea;
    const matchType = activeJobType === "Todos" || v.type === activeJobType;
    return matchSearch && matchArea && matchType;
  });

  const candidatadasVagas = vagas.filter((v) => candidaturas.includes(v.id));

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } catch (_) { /* ignore */ }
    clearStoredUser();
    Object.keys(localStorage).forEach((k) => { if (k.startsWith("sb-") || k.includes("supabase")) localStorage.removeItem(k); });
    Object.keys(sessionStorage).forEach((k) => { if (k.startsWith("sb-") || k.includes("supabase")) sessionStorage.removeItem(k); });
    navigate("/sistema");
  };

  const isProfileComplete = (p: Profile | null) => {
    if (!p) return false;
    return !!(p.education && p.expertise && p.job_type && (p.curriculo_pdf || p.bio));
  };

  // Verificar se tem informações mínimas para acessar feed
  const canAccessFeed = (p: Profile | null) => {
    if (!p) return false;
    return !!(p.education && p.expertise && p.job_type);
  };

  // Verificar se o cidadão quer oportunidades de emprego
  // job_status="not_looking" = não quer emprego, não participa do feed
  const cidadaoQuerOportunidades = (p: Profile | null) => {
    if (!p) return true; // padrão: mostrar
    if ((p as any).wants_opportunities === false) return false;
    if (p.job_status === "not_looking") return false;
    return true;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0D1629" }}>
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: "rgba(59,191,212,0.3)", borderTopColor: "#3BBFD4" }}></div>
          <p className="text-white/40 text-sm">Carregando sistema...</p>
        </div>
      </div>
    );
  }

  // Modal de completar perfil
  if (showCompleteProfile && profile) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#0D1629" }}>
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(232,160,32,0.15)", border: "2px solid rgba(232,160,32,0.30)" }}>
              <i className="ri-user-settings-line text-3xl" style={{ color: "#E8A020" }}></i>
            </div>
            <h1 className="text-white font-extrabold text-2xl mb-2">Complete seu perfil profissional</h1>
            <p className="text-white/60 text-sm">
              Para acessar o feed de vagas e se candidatar, precisamos de algumas informações sobre seu perfil.
            </p>
          </div>

          <div className="rounded-3xl overflow-hidden p-6 space-y-4" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Formação</label>
                <input
                  type="text"
                  value={profile.education ?? ""}
                  onChange={(e) => setProfile((p) => p ? { ...p, education: e.target.value } : p)}
                  placeholder="Ex: Ensino Médio"
                  className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Área / Expertise</label>
                <input
                  type="text"
                  value={profile.expertise ?? ""}
                  onChange={(e) => setProfile((p) => p ? { ...p, expertise: e.target.value } : p)}
                  placeholder="Ex: Vendas, TI"
                  className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Tipo de Vaga Desejada</label>
              <select
                value={profile.job_type ?? ""}
                onChange={(e) => setProfile((p) => p ? { ...p, job_type: e.target.value } : p)}
                className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none cursor-pointer"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
              >
                <option value="" style={{ background: "#0D1629", color: "white" }}>Selecione...</option>
                {["CLT", "PJ", "Freelance", "Estágio", "Temporário", "Aprendiz"].map((t) => (
                  <option key={t} value={t} style={{ background: "#0D1629", color: "white" }}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Sobre você (opcional)</label>
              <textarea
                value={profile.bio ?? ""}
                onChange={(e) => setProfile((p) => p ? { ...p, bio: e.target.value } : p)}
                placeholder="Conte um pouco sobre você..."
                rows={3}
                maxLength={500}
                className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none resize-none"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
              />
            </div>
            <div className="pt-2">
              <button
                onClick={async () => {
                  if (!canAccessFeed(profile)) {
                    alert("Preencha pelo menos Formação, Área e Tipo de Vaga para continuar.");
                    return;
                  }
                  await supabase.from("profiles").update({
                    education: profile.education,
                    expertise: profile.expertise,
                    job_type: profile.job_type,
                    bio: profile.bio,
                    registration_complete: true,
                  }).eq("id", profile.id);
                  setShowCompleteProfile(false);
                }}
                className="w-full py-3.5 rounded-xl font-bold text-sm cursor-pointer whitespace-nowrap"
                style={{ background: "linear-gradient(135deg, #E8A020, #f5b94a)", color: "#0D1629" }}
              >
                <i className="ri-briefcase-4-line mr-2"></i>
                Acessar Feed de Vagas
              </button>
              <button
                onClick={() => navigate("/cidadao")}
                className="w-full py-3 mt-2 rounded-xl font-semibold text-sm cursor-pointer whitespace-nowrap"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)" }}
              >
                Ir para Área do Cidadão
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Bloqueio para quem NÃO está procurando emprego (job_status="not_looking")
  // Regra de ouro: não procura emprego = sem acesso ao ambiente de vagas,
  // igual a quem não tem currículo. Só volta se mudar pra "looking".
  if (profile?.job_status === "not_looking") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#0D1629" }}>
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(255,255,255,0.08)", border: "2px solid rgba(255,255,255,0.15)" }}>
              <i className="ri-pause-circle-line text-3xl" style={{ color: "rgba(255,255,255,0.50)" }}></i>
            </div>
            <h1 className="text-white font-extrabold text-2xl mb-2">Ambiente de Oportunidades</h1>
            <p className="text-white/60 text-sm">
              Você informou que <strong className="text-white/80">não está procurando emprego</strong> no momento.
              O feed de vagas e as notificações de oportunidades estão disponíveis apenas para quem está em busca de trabalho.
            </p>
          </div>

          <div className="rounded-3xl overflow-hidden p-6 space-y-4" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}>
            <div className="p-4 rounded-xl" style={{ background: "rgba(232,160,32,0.08)", border: "1px solid rgba(232,160,32,0.18)" }}>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(232,160,32,0.20)" }}>
                  <i className="ri-information-line text-sm" style={{ color: "#E8A020" }}></i>
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Como voltar a participar?</p>
                  <p className="text-white/50 text-xs mt-1">
                    Acesse a <strong className="text-white/70">Área do Cidadão</strong>, vá em <strong className="text-white/70">Meu Perfil</strong> e altere o <strong className="text-white/70">Status no Mercado</strong> para &quot;Quero emprego&quot;. O acesso ao feed de vagas e as notificações serão restaurados automaticamente.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.18)" }}>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(34,197,94,0.20)" }}>
                  <i className="ri-government-line text-sm" style={{ color: "#22C55E" }}></i>
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Atendimento do Gabinete</p>
                  <p className="text-white/50 text-xs mt-1">
                    Mesmo sem acessar as vagas, você continua tendo acesso a requerimentos, sugestões de projetos, mensagens com assessores e todos os serviços de atendimento ao cidadão.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <button
                onClick={() => navigate("/cidadao")}
                className="w-full py-3.5 rounded-xl font-bold text-sm cursor-pointer whitespace-nowrap"
                style={{ background: "linear-gradient(135deg, #E8A020, #f5b94a)", color: "#0D1629" }}
              >
                <i className="ri-government-line mr-2"></i>
                Ir para Área do Cidadão
              </button>
              <button
                onClick={() => navigate("/")}
                className="w-full py-3 rounded-xl font-semibold text-sm cursor-pointer whitespace-nowrap"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)" }}
              >
                Voltar para o site
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Bloqueio para quem NÃO tem currículo cadastrado — ambiente de oportunidades exige currículo
  // Exceção: prestadores de serviço (is_service_provider) podem acessar sem currículo PDF
  if (!profile?.curriculo_pdf && !profile?.is_service_provider) {
    const tipoPerfil = profile?.worker_profile_type === "freelancer" ? "Freelancer" : profile?.worker_profile_type === "mei" ? "MEI" : "CLT";
    // Verifica de forma inteligente se o cidadão não quer emprego (usa coluna wants_opportunities ou job_status)
    const apenasServicos = !cidadaoQuerOportunidades(profile);
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#0D1629" }}>
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(34,197,94,0.15)", border: "2px solid rgba(34,197,94,0.30)" }}>
              <i className="ri-file-user-line text-3xl" style={{ color: "#22C55E" }}></i>
            </div>
            <h1 className="text-white font-extrabold text-2xl mb-2">
              {apenasServicos ? "Ambiente de Serviços" : "Currículo necessário"}
            </h1>
            <p className="text-white/60 text-sm">
              {apenasServicos 
                ? "Você informou que deseja utilizar apenas os serviços de atendimento do gabinete. O feed de vagas está disponível para quem busca oportunidades de emprego."
                : "Este ambiente de oportunidades de emprego é exclusivo para usuários com currículo cadastrado."}
            </p>
          </div>

          <div className="rounded-3xl overflow-hidden p-6 space-y-4" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}>
            {apenasServicos ? (
              <div className="p-4 rounded-xl" style={{ background: "rgba(232,160,32,0.08)", border: "1px solid rgba(232,160,32,0.18)" }}>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(232,160,32,0.20)" }}>
                    <i className="ri-government-line text-sm" style={{ color: "#E8A020" }}></i>
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">Atendimento do Gabinete</p>
                    <p className="text-white/50 text-xs mt-1">
                      Você tem acesso a requerimentos, sugestões de projetos, mensagens com assessores e todos os serviços de atendimento ao cidadão.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.18)" }}>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(34,197,94,0.20)" }}>
                    <i className="ri-user-star-line text-sm" style={{ color: "#22C55E" }}></i>
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">Seu perfil: {tipoPerfil}</p>
                    <p className="text-white/50 text-xs mt-1">
                      Para acessar o feed de vagas e se candidatar, é necessário ter um currículo cadastrado no seu perfil.
                      {tipoPerfil !== "CLT" && " Mesmo sendo prestador de serviços, você pode cadastrar seu currículo CLT e ter acesso às vagas."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2 space-y-2">
              {!apenasServicos && (
                <button
                  onClick={() => navigate("/cidadao/curriculo/criar")}
                  className="w-full py-3.5 rounded-xl font-bold text-sm cursor-pointer whitespace-nowrap"
                  style={{ background: "linear-gradient(135deg, #22C55E, #16A34A)", color: "white" }}
                >
                  <i className="ri-file-user-line mr-2"></i>
                  Criar Currículo agora
                </button>
              )}
              <button
                onClick={() => navigate("/cidadao")}
                className="w-full py-3.5 rounded-xl font-bold text-sm cursor-pointer whitespace-nowrap"
                style={{ background: "linear-gradient(135deg, #E8A020, #f5b94a)", color: "#0D1629" }}
              >
                <i className="ri-government-line mr-2"></i>
                Ir para Área do Cidadão
              </button>
              <button
                onClick={() => navigate("/")}
                className="w-full py-3 rounded-xl font-semibold text-sm cursor-pointer whitespace-nowrap"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)" }}
              >
                Voltar para o site
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#0D1629" }}>
      {/* Top Nav */}
      <nav className="sticky top-0 z-50" style={{ background: "rgba(13,22,41,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="max-w-screen-xl mx-auto px-4 flex items-center justify-between h-14">
          <Link to="/sistema" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black" style={{ background: "linear-gradient(135deg, #E8A020, #f5b94a)", color: "#0D1629" }}>AH</div>
            <div className="hidden sm:block">
              <p className="text-white font-bold text-sm leading-tight">Oportunidades</p>
              <p className="text-white/35 text-xs">Pelotas · RS</p>
            </div>
          </Link>

          <div className="flex-1 max-w-sm mx-4">
            <div className="relative">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm"></i>
              <input
                type="text"
                placeholder="Buscar vagas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-tour="vagas-search"
                className="w-full pl-9 pr-4 py-2 rounded-xl text-sm text-white focus:outline-none"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.10)" }}
              />
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1" data-tour="vagas-tabs">
            {[
              { key: "feed", icon: "ri-home-5-line", label: "Feed" },
              { key: "candidaturas", icon: "ri-send-plane-line", label: "Candidaturas" },
              { key: "prestadores", icon: "ri-tools-line", label: "Prestadores" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => handleTabChange(t.key as "feed" | "candidaturas" | "prestadores")}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap"
                style={activeTab === t.key
                  ? { background: "rgba(59,191,212,0.15)", color: "#3BBFD4", border: "1px solid rgba(59,191,212,0.25)" }
                  : { color: "rgba(255,255,255,0.45)", background: "transparent" }}
              >
                <i className={t.icon}></i>
                <span className="hidden lg:inline">{t.label}</span>
                {t.key === "candidaturas" && candidaturas.length > 0 && (
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "#E8A020", color: "#0D1629" }}>{candidaturas.length}</span>
                )}
                {t.key === "prestadores" && prestadores.length > 0 && (
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "#22C55E", color: "#0D1629" }}>{prestadores.length}</span>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-2">
            {user?.role === "admin" && (
              <Link to="/admin" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap" style={{ background: "rgba(232,160,32,0.15)", color: "#E8A020", border: "1px solid rgba(232,160,32,0.25)" }}>
                <i className="ri-shield-line"></i> Admin
              </Link>
            )}
            <div data-tour="vagas-notificacoes">
              <NotificationBell userId={user?.id ?? null} userRole={user?.role ?? null} onNavigate={(path) => navigate(path)} />
            </div>
            <div className="flex items-center gap-2" data-tour="vagas-perfil">
              {(profile?.avatar_url || profile?.profile_photo || user?.avatar_url) ? (
                <img
                  src={(profile?.avatar_url || profile?.profile_photo || user?.avatar_url)!}
                  alt={profile?.display_name ?? profile?.full_name ?? user?.display_name ?? "Usuário"}
                  className="w-8 h-8 rounded-full object-cover object-top border border-white/10"
                />
              ) : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "linear-gradient(135deg, #1B2A5E, #3BBFD4)", color: "white" }}>
                  {(profile?.display_name ?? profile?.full_name ?? user?.display_name ?? user?.email ?? "?").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="hidden sm:block">
                <p className="text-white text-xs font-semibold">{profile?.display_name || profile?.full_name || user?.display_name || user?.full_name || "Cidadão"}</p>
                <p className="text-white/35 text-xs">Cidadão</p>
              </div>
            </div>
            <button onClick={handleLogout} className="text-white/30 hover:text-white/60 transition-colors cursor-pointer" title="Sair">
              <i className="ri-logout-box-r-line text-lg"></i>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-screen-xl mx-auto px-4 py-6">
        {/* Mobile navigation link to Cidadão */}
        <div className="lg:hidden mb-4 rounded-2xl p-3 flex items-center justify-between" style={{ background: "rgba(232,160,32,0.08)", border: "1px solid rgba(232,160,32,0.20)" }}>
          <Link to="/cidadao" className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#E8A020" }}>
            <i className="ri-government-line"></i>
            Área do Cidadão
          </Link>
          <Link to="/cidadao" className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: "rgba(232,160,32,0.15)", color: "#E8A020", border: "1px solid rgba(232,160,32,0.25)" }}>
            Acessar <i className="ri-arrow-right-line ml-1"></i>
          </Link>
        </div>

        <div className="flex gap-5">
          {/* Sidebar esquerda */}
          <aside data-tour="vagas-perfil" className="hidden lg:block w-64 shrink-0 sticky top-20 self-start">
            <PerfilSidebar
              profile={profile}
              userId={user?.id ?? ""}
              candidaturas={candidaturas}
              vagasTotal={vagas.length}
              onProfileUpdate={(p) => setProfile(p)}
              fallbackName={user?.display_name ?? user?.full_name}
              fallbackAvatar={user?.avatar_url}
            />

            <div className="mt-3 rounded-2xl p-4" style={{ background: "rgba(232,160,32,0.08)", border: "1px solid rgba(232,160,32,0.20)" }}>
              <p className="text-white/60 text-xs mb-2">Você também tem acesso a:</p>
              <Link to="/cidadao" className="flex items-center gap-2.5 text-sm font-semibold cursor-pointer" style={{ color: "#E8A020" }}>
                <i className="ri-government-line"></i>
                Área do Cidadão
              </Link>
              <p className="text-white/35 text-xs mt-1">Demandas, mensagens, requerimentos</p>
            </div>
          </aside>

          {/* Main */}
          <main className="flex-1 min-w-0">
            <div className="flex md:hidden rounded-xl p-1 mb-4 gap-1" data-tour="vagas-tabs" style={{ background: "rgba(255,255,255,0.05)" }}>
              {[
                { key: "feed", label: "Feed de Vagas" },
                { key: "candidaturas", label: `Candidaturas (${candidaturas.length})` },
                { key: "prestadores", label: `Prestadores (${prestadores.length})` },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => handleTabChange(t.key as "feed" | "candidaturas" | "prestadores")}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap"
                  style={activeTab === t.key
                    ? { background: "linear-gradient(135deg, #1B2A5E, #3BBFD4)", color: "white" }
                    : { color: "rgba(255,255,255,0.45)" }}
                >
                  <span className="hidden sm:inline">{t.label}</span>
                  <span className="sm:hidden">{t.key === "feed" ? "Feed" : t.key === "candidaturas" ? `Candidaturas (${candidaturas.length})` : `Prestadores (${prestadores.length})`}</span>
                </button>
              ))}
            </div>

            {activeTab === "feed" && (
              <div>
                <div className="mb-4" data-tour="vagas-areas">
                  <p className="text-white/25 text-xs uppercase tracking-wider font-bold mb-2">Área de atuação</p>
                  <div className="flex gap-2 flex-wrap">
                    {AREAS.map((area) => (
                      <button
                        key={area}
                        onClick={() => setActiveArea(area)}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap"
                        style={activeArea === area
                          ? { background: "#E8A020", color: "#0D1629" }
                          : { background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.50)", border: "1px solid rgba(255,255,255,0.10)" }}
                      >
                        {area}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-5" data-tour="vagas-tipos">
                  <p className="text-white/25 text-xs uppercase tracking-wider font-bold mb-2">Tipo de contrato</p>
                  <div className="flex gap-2 flex-wrap">
                    {JOB_TYPES.map((type) => (
                      <button
                        key={type}
                        onClick={() => setActiveJobType(type)}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap"
                        style={activeJobType === type
                          ? { background: "#3BBFD4", color: "#0D1629" }
                          : { background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.50)", border: "1px solid rgba(255,255,255,0.10)" }}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4" data-tour="vagas-feed">
                  <p className="text-white/50 text-sm">
                    <span className="text-white font-bold">{filteredVagas.length}</span> vagas disponíveis
                    {search && <span> para &quot;{search}&quot;</span>}
                  </p>
                </div>

                {filteredVagas.length === 0 ? (
                  <div className="text-center py-16 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <i className="ri-search-line text-white/20 text-5xl mb-4 block"></i>
                    <p className="text-white/40 font-semibold">Nenhuma vaga encontrada</p>
                    <button onClick={() => { setSearch(""); setActiveArea("Todas"); setActiveJobType("Todos"); }} className="text-sm font-semibold mt-2 cursor-pointer" style={{ color: "#3BBFD4" }}>
                      Limpar filtros
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4" data-tour="vagas-feed">
                    {filteredVagas.map((vaga) => (
                      <VagaCard
                        key={vaga.id}
                        vaga={{
                          ...vaga,
                          company_avatar: vaga.company_id ? (companyAvatars?.[vaga.company_id] || null) : null,
                          image_url: vaga.image_url || null,
                        }}
                        userId={user?.id ?? ""}
                        candidaturas={candidaturas}
                        onCandidatou={handleCandidatou}
                        candidaturaCount={candidaturasCounts.find((c) => c.vaga_id === vaga.id)?.count ?? 0}
                        userCurriculoUrl={profile?.curriculo_pdf}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "candidaturas" && (
              <div>
                <div className="mb-5">
                  <h2 className="text-white font-extrabold text-xl">Minhas Candidaturas</h2>
                  <p className="text-white/40 text-sm mt-0.5">{candidaturas.length} candidatura{candidaturas.length !== 1 ? "s" : ""} enviada{candidaturas.length !== 1 ? "s" : ""}</p>
                </div>

                {/* Alerta: cada candidatura é independente */}
                <div className="mb-5 p-4 rounded-xl" style={{ background: "rgba(59,191,212,0.08)", border: "1px solid rgba(59,191,212,0.20)" }}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(59,191,212,0.20)" }}>
                      <i className="ri-information-line text-sm" style={{ color: "#3BBFD4" }}></i>
                    </div>
                    <div>
                      <p className="text-white text-sm font-bold">Cada candidatura é independente</p>
                      <p className="text-white/50 text-xs mt-0.5 leading-relaxed">
                        Mesmo que você já tenha sido aprovado em outra vaga da mesma empresa, cada nova candidatura precisa ser analisada e aprovada individualmente. O status de cada vaga aparece abaixo.
                      </p>
                    </div>
                  </div>
                </div>

                {minhasCandidaturas.length === 0 ? (
                  <div className="text-center py-16 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <i className="ri-send-plane-line text-white/20 text-5xl mb-4 block"></i>
                    <p className="text-white/40 font-semibold">Você ainda não se candidatou a nenhuma vaga</p>
                    <button onClick={() => handleTabChange("feed")} className="text-sm font-semibold mt-2 cursor-pointer" style={{ color: "#3BBFD4" }}>
                      Ver vagas disponíveis
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {minhasCandidaturas.map((cand) => {
                      const isPending = cand.status === "pending";
                      const isAccepted = cand.status === "accepted";
                      const isRejected = cand.status === "rejected";
                      const statusColor = isAccepted ? "#22C55E" : isRejected ? "#F87171" : "#E8A020";
                      const statusLabel = isAccepted ? "Aprovada" : isRejected ? "Recusada" : "Em análise";
                      const statusIcon = isAccepted ? "ri-checkbox-circle-fill" : isRejected ? "ri-close-circle-fill" : "ri-time-line";
                      const vagaImage = vagas.find((v) => v.id === cand.vaga_id)?.image_url;
                      const vagaData = vagas.find((v) => v.id === cand.vaga_id);

                      return (
                        <div key={cand.id} id={`candidatura-${cand.id}`} className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${statusColor}30` }}>
                          <div className="flex items-start gap-3 p-4">
                            {/* Foto da oportunidade */}
                            <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center border border-white/10" style={{ background: vagaImage ? "transparent" : `${statusColor}20` }}>
                              {vagaImage ? (
                                <img src={vagaImage} alt={cand.vagas?.title ?? "Vaga"} className="w-full h-full object-cover object-top" />
                              ) : (
                                <i className="ri-briefcase-4-line text-lg" style={{ color: statusColor }}></i>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-white font-bold text-sm truncate">{cand.vagas?.title ?? "Vaga"}</h4>
                              <p className="text-white/50 text-xs truncate">{cand.vagas?.company_name ?? "Empresa"}</p>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {cand.vagas?.area && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(59,191,212,0.15)", color: "#3BBFD4" }}>{cand.vagas.area}</span>}
                                {cand.vagas?.type && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(232,160,32,0.15)", color: "#E8A020" }}>{cand.vagas.type}</span>}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 shrink-0">
                              <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: statusColor }}>
                                <i className={statusIcon}></i>
                                {statusLabel}
                              </div>
                              {vagaData && (
                                <button
                                  onClick={() => {
                                    const vaga = vagas.find((v) => v.id === cand.vaga_id);
                                    if (vaga) {
                                      openVagaDetail(vaga);
                                    }
                                  }}
                                  className="text-xs font-semibold cursor-pointer whitespace-nowrap px-2 py-1 rounded-lg"
                                  style={{ background: "rgba(59,191,212,0.15)", color: "#3BBFD4", border: "1px solid rgba(59,191,212,0.25)" }}
                                >
                                  <i className="ri-information-line mr-1"></i>Saiba Mais
                                </button>
                              )}
                            </div>
                          </div>
                          {isRejected && cand.rejection_reason && (
                            <div className="mx-4 mb-4 p-3 rounded-xl" style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.15)" }}>
                              <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1">Motivo da recusa:</p>
                              <p className="text-white/55 text-sm leading-relaxed">{cand.rejection_reason}</p>
                            </div>
                          )}
                          {isAccepted && (
                            <div className="mx-4 mb-4 p-3 rounded-xl" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)" }}>
                              <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1">Status:</p>
                              <p className="text-white/55 text-sm leading-relaxed">Parabéns! Sua candidatura foi aprovada. A empresa deve entrar em contato em até 5 dias úteis.</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ABA: PRESTADORES */}
            {activeTab === "prestadores" && (
              <PrestadoresTab
                prestadores={prestadores}
                searchPrestador={searchPrestador}
                setSearchPrestador={setSearchPrestador}
                filterPrestCat={filterPrestCat}
                setFilterPrestCat={setFilterPrestCat}
                selectedPrestador={selectedPrestador}
                setSelectedPrestador={setSelectedPrestador}
              />
            )}
          </main>

          {/* Sidebar direita */}
          <aside className="hidden xl:block w-60 shrink-0 sticky top-20 self-start space-y-3">
            <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-3">Dicas para se destacar</p>
              <div className="space-y-3">
                {[
                  { icon: "ri-file-user-line", text: "Adicione o link do seu currículo ao perfil", color: "#E8A020" },
                  { icon: "ri-user-settings-line", text: "Complete todas as informações do perfil", color: "#3BBFD4" },
                  { icon: "ri-search-eye-line", text: "Empresas filtram candidatos por expertise", color: "#22C55E" },
                ].map((tip, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${tip.color}20` }}>
                      <i className={`${tip.icon} text-sm`} style={{ color: tip.color }}></i>
                    </span>
                    <p className="text-white/50 text-xs leading-relaxed">{tip.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl p-4" style={{ background: "rgba(27,42,94,0.40)", border: "1px solid rgba(27,42,94,0.70)" }}>
              <div className="flex items-center gap-2 mb-2">
                <i className="ri-government-line" style={{ color: "#E8A020" }}></i>
                <p className="text-white font-bold text-sm">Arthur Halal</p>
              </div>
              <p className="text-white/45 text-xs leading-relaxed">Vereador · Pelotas/RS<br />Mandato 2024–2028 · PP</p>
              <Link to="/" className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold" style={{ color: "#3BBFD4" }}>
                <i className="ri-external-link-line"></i> Visitar site oficial
              </Link>
            </div>
          </aside>
        </div>
      </div>
      <VagaDetailModal
        vaga={selectedVagaDetail}
        open={showVagaDetailModal}
        onClose={() => setShowVagaDetailModal(false)}
      />

      {/* Botão flutuante "?" — sempre disponível para iniciar/rever o tour */}
      {/* Ao clicar, redireciona para feed ANTES de iniciar para garantir que todos os elementos estejam visíveis */}
      {!tour.isActive && (
        <button
          onClick={() => tour.startTour(() => {
            handleTabChange("feed");
            window.scrollTo({ top: 0, behavior: "instant" });
          })}
          className="fixed bottom-6 right-4 md:right-6 z-50 w-12 h-12 rounded-full flex items-center justify-center cursor-pointer shadow-lg transition-all hover:scale-110"
          style={{
            background: "linear-gradient(135deg, #E8A020, #f5b94a)",
            color: "#0D1629",
          }}
          title="Rever tour guiado"
        >
          <i className="ri-question-mark text-xl font-bold"></i>
        </button>
      )}

      {/* Tour Guiado */}
      <TourGuide
        isActive={tour.isActive}
        currentStep={tour.currentStep}
        totalSteps={tour.totalSteps}
        currentTourStep={tour.currentTourStep}
        tourName={cidadaoVagasTour.name}
        onNext={tour.nextStep}
        onPrev={tour.prevStep}
        onSkip={tour.skipTour}
        onFinish={tour.finishTour}
      />
    </div>
  );
}