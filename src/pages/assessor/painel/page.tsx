import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase, supabaseUrl, supabaseAnonKey, getEdgeFunctionUrl } from "@/lib/supabase";
import KanbanBoard, { type DemandCard } from "@/pages/assessor/components/KanbanBoard";
import DemandDetail from "@/pages/assessor/components/DemandDetail";
import ChatPanel from "@/pages/assessor/components/ChatPanel";
import AssessorNewsPanel from "@/pages/assessor/components/AssessorNewsPanel";
import { getStoredUser, storeUser, clearStoredUser } from "@/hooks/useAuth";
import PainelSidebar from "@/components/feature/PainelSidebar";
import ProfilePhotoLightbox from "@/components/feature/ProfilePhotoLightbox";
import AvatarWithFallback from "@/components/feature/AvatarWithFallback";
import NotificationBell from "@/components/feature/NotificationBell";
import WeatherWidget from "@/components/feature/WeatherWidget";
import UsuarioSaibaMaisModal, { type UsuarioSistema } from "@/pages/vereador/components/UsuarioSaibaMaisModal";
import VereadorMetricasSistema from "@/pages/vereador/components/VereadorMetricasSistema";
import { exportSystemMetricsPDF } from "@/pages/vereador/components/VereadorExportPDF";
import { playNotificationSound, getLastCheckTime, setLastCheckTime, getLastRead } from "@/hooks/useChatNotification";
import VagaCardPublica, { type VagaPublica } from "@/components/feature/VagaCardPublica";
import VagaDetailModal from "@/components/feature/VagaDetailModal";
import PrestadoresTab from "@/pages/sistema/painel/cidadao/components/PrestadoresTab";
import AgendaPage from "@/pages/agenda/components/AgendaPage";
import TourGuide from "@/components/feature/TourGuide";
import { useTour } from "@/hooks/useTour";
import { useAgendaReminders } from "@/hooks/useAgendaReminders";
import { assessorTour } from "@/mocks/tours/assessor-tour";

const ASSESSOR_CARGOS = [
  "Chefe de Gabinete",
  "Assessor de Comunicação",
  "Assessor Parlamentar",
  "Assessor Jurídico",
  "Assessor de Imprensa",
  "Secretário(a) Parlamentar",
  "Assessor de Relações Comunitárias",
  "Assessor de Políticas Públicas",
  "Assessor Administrativo",
  "Assessor de Redes Sociais",
  "Assessor de Cerimonial",
  "Motorista / Apoio Logístico",
  "Outro",
];

type Tab = "kanban" | "chat" | "usuarios" | "vagas" | "agenda" | "noticias" | "metricas";

interface Stats {
  aberto: number;
  em_andamento: number;
  aguardando_externa: number;
  finalizada: number;
  total: number;
}

export default function AssessorPainelPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ id: string; email: string; name: string; role: string } | null>(null);
  const [demands, setDemands] = useState<DemandCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DemandCard | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>((searchParams.get("tab") as Tab) || "kanban");
  const [stats, setStats] = useState<Stats>({ aberto: 0, em_andamento: 0, aguardando_externa: 0, finalizada: 0, total: 0 });
  const [search, setSearch] = useState("");
  const [assessorUsuarioSearch, setAssessorUsuarioSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [openChatCount, setOpenChatCount] = useState(0);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const lastMsgCheckRef = useRef<string>("");
  // Ref para evitar reabertura do modal após fechar quando URL ainda tem ?demanda=
  const demandaAutoOpenedRef = useRef<string | null>(null);
  // Anti-ghost-click: impede re-abertura do modal por 400ms após fechar (touch events mobile)
  const closingRef = useRef(false);
  const currentTabRef = useRef<Tab>("kanban");
  
  // Usuários do sistema
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([]);
  const [selectedUsuario, setSelectedUsuario] = useState<UsuarioSistema | null>(null);
  const [photoLightbox, setPhotoLightbox] = useState<{ url: string | null; name: string | null }>({ url: null, name: null });
  
  // Perfil do assessor
  const [assessorProfile, setAssessorProfile] = useState<{ assessor_cargo: string | null; assessor_area: string | null; profile_photo: string | null; avatar_url: string | null; full_name: string | null; display_name: string | null; phone: string | null } | null>(null);
  const [showSetupProfile, setShowSetupProfile] = useState(false);
  const [setupStep, setSetupStep] = useState<"cargo">("cargo");
  const [setupCargo, setSetupCargo] = useState("");
  const [setupUploading, setSetupUploading] = useState(false);
  const [setupMsg, setSetupMsg] = useState("");
  // Estado derivado do avatarUrl para garantir re-renderização quando o perfil muda
  const [avatarUrlState, setAvatarUrlState] = useState<string | null>(null);
  
  // Vagas
  const [vagas, setVagas] = useState<VagaPublica[]>([]);
  const [vagasSubView, setVagasSubView] = useState<"vagas" | "prestadores">("vagas");
  const [selectedVaga, setSelectedVaga] = useState<VagaPublica | null>(null);
  const [companyAvatars, setCompanyAvatars] = useState<Record<string, string>>();
  // Prestadores dentro da aba Vagas
  const [searchPrestador, setSearchPrestador] = useState("");
  const [filterPrestCat, setFilterPrestCat] = useState("Todas");
  const [selectedPrestador, setSelectedPrestador] = useState<any>(null);

  // Métricas do sistema (para Chefe de Gabinete)
  const [metricCidadaos, setMetricCidadaos] = useState<any[]>([]);
  const [metricDemands, setMetricDemands] = useState<any[]>([]);
  const [metricVagas, setMetricVagas] = useState<any[]>([]);
  const [metricCandidaturas, setMetricCandidaturas] = useState<any[]>([]);
  const [metricStats, setMetricStats] = useState({ comCurriculo: 0, lookingWork: 0, employed: 0, totalCidadaos: 0 });

  // Tour guiado — só inicia após setup de cargo estar completo
  const [setupComplete, setSetupComplete] = useState(false);
  const tour = useTour(assessorTour, setupComplete);

  // BUGFIX B1: Lembretes da agenda disparam sempre que um assessor estiver logado
  useAgendaReminders(true);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) { navigate("/assessor"); return; }
    if (!["assessor", "admin"].includes(stored.role)) {
      navigate("/assessor");
      return;
    }
    setUser({
      id: stored.id,
      email: stored.email,
      name: stored.display_name || stored.full_name,
      role: stored.role,
    });
    // Verificar se o assessor precisa completar o perfil
    (async () => {
      const { data: prof } = await supabase
        .from("profiles")
        .select("assessor_cargo, assessor_area, profile_photo, avatar_url, full_name, display_name, phone")
        .eq("id", stored.id)
        .maybeSingle();
      if (prof) {
        setAssessorProfile(prof as typeof assessorProfile);
        // Garantir que o avatarUrlState seja atualizado com a URL do banco
        const photoUrl = (prof as any)?.profile_photo || (prof as any)?.avatar_url || stored?.avatar_url || null;
        setAvatarUrlState(photoUrl);
        // Atualizar nome do usuário com display_name do perfil (prioridade)
        const displayName = (prof as any)?.display_name || stored?.display_name || stored?.full_name || "";
        setUser((prev) => prev ? { ...prev, name: displayName } : prev);
        // Se não tem cargo, mostra setup. Foto já foi tirada no complete-profile.
        if (!prof.assessor_cargo) {
          setShowSetupProfile(true);
          setSetupStep("cargo");
        } else {
          // Setup completo — tour pode iniciar
          setSetupComplete(true);
        }
      }
    })();
    // Carregar usuários do sistema
    (async () => {
      const { data: userList } = await supabase
        .from("profiles")
        .select("id, full_name, display_name, role, phone, neighborhood, education, expertise, job_status, job_type, bio, curriculo_pdf, avatar_url, profile_photo, company_name, status, is_service_provider, service_categories, service_description, portfolio_photos, created_at")
        .order("created_at", { ascending: false });
      setUsuarios((userList as UsuarioSistema[]) ?? []);
    })();

    // Carregar métricas do sistema
    (async () => {
      const [cidadaosRes, demandsRes, vagasRes, candRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, neighborhood, job_status, education, is_employed, employed_through_platform, platform_job_details, employment_survey_completed, curriculo_pdf, created_at").eq("role", "citizen").order("created_at", { ascending: false }),
        supabase.from("demands").select("*").order("created_at", { ascending: false }),
        supabase.from("vagas").select("id, title, area, type, location, salary, company_name, status, created_at").eq("status", "active").order("created_at", { ascending: false }),
        supabase.from("candidaturas").select("id, vaga_id, cidadao_id, status, created_at").eq("status", "aprovada").order("created_at", { ascending: false }),
      ]);
      const cidList = (cidadaosRes.data as any[]) ?? [];
      const demList = (demandsRes.data as any[]) ?? [];
      const vagList = (vagasRes.data as any[]) ?? [];
      const candList = (candRes.data as any[]) ?? [];
      setMetricCidadaos(cidList);
      setMetricDemands(demList);
      setMetricVagas(vagList);
      setMetricCandidaturas(candList);
      const curriculoCount = cidList.filter((c: any) => c.curriculo_pdf && c.curriculo_pdf.length > 5).length;
      setMetricStats({
        comCurriculo: curriculoCount,
        lookingWork: cidList.filter((c: any) => c.job_status !== "not_looking").length,
        employed: cidList.filter((c: any) => c.is_employed === true).length,
        totalCidadaos: cidList.length,
      });
    })();
    // Carregar vagas
    (async () => {
      const [{ data: vagasData }, { data: empresas }] = await Promise.all([
        supabase
          .from("vagas")
          .select("*")
          .eq("status", "active")
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("id, avatar_url, profile_photo")
          .eq("role", "empresa"),
      ]);
      const map: Record<string, string> = {};
      (empresas ?? []).forEach((e: any) => {
        map[e.id] = e.avatar_url || e.profile_photo || "";
      });
      setCompanyAvatars(map);
      const enriched = ((vagasData as VagaPublica[]) ?? []).map((v) => ({
        ...v,
        company_avatar: v.company_id ? (map[v.company_id] || null) : null,
      }));
      setVagas(enriched);
    })();
    setLoading(false);
  }, [navigate]);

  // ── Notificações SEMPRE ativas (independente da aba) ──
  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    // Inicializa o timestamp da última verificação a partir do localStorage
    lastMsgCheckRef.current = getLastCheckTime(`assessor_notif_${userId}`);

    const checkNewMsgs = async () => {
      const checkTime = lastMsgCheckRef.current;
      const nowIso = new Date().toISOString();

      try {
        const { data: newMsgs } = await supabase
          .from("mensagens_chat_items")
          .select("id, chat_id")
          .gt("created_at", checkTime)
          .neq("sender_role", "assessor")
          .order("created_at", { ascending: true });

        if (newMsgs && newMsgs.length > 0) {
          let newCount = 0;
          (newMsgs as { id: number; chat_id: number }[]).forEach((m) => {
            const lastRead = getLastRead(`assessor_${userId}`, m.chat_id);
            if (m.id > lastRead) newCount++;
          });
          if (newCount > 0) {
            // Só notifica se o usuário NÃO está na aba de chat (ChatPanel cuida disso lá)
            if (currentTabRef.current !== "chat") {
              setChatUnreadCount((prev) => prev + newCount);
              playNotificationSound();
            }
          }
        }
      } catch (_) { /* silent */ }

      lastMsgCheckRef.current = nowIso;
      setLastCheckTime(`assessor_notif_${userId}`, nowIso);
    };

    checkNewMsgs();
    // Realtime + polling 30s como fallback de segurança
    const interval = setInterval(checkNewMsgs, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // ── Polling para contagem de chats em aberto (sem assessor) ──
  useEffect(() => {
    const fetchOpenChats = async () => {
      const { count } = await supabase
        .from("mensagens_chat")
        .select("*", { count: "exact", head: true })
        .eq("status", "open")
        .gte("expires_at", new Date().toISOString());
      setOpenChatCount(count ?? 0);
    };
    fetchOpenChats();
    // Realtime + polling 30s como fallback de segurança
    const interval = setInterval(fetchOpenChats, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDemands = useCallback(async () => {
    try {
      let list: DemandCard[] = [];

      // Método 1: Supabase client direto (RLS permite anon read com policy "true")
      {
        const q = filterType !== "all"
          ? supabase.from("demands").select("*").eq("type", filterType).order("created_at", { ascending: false })
          : supabase.from("demands").select("*").order("created_at", { ascending: false });
        const { data: clientData, error: clientErr } = await q;
        if (!clientErr && Array.isArray(clientData) && clientData.length > 0) {
          list = clientData as DemandCard[];
        }
      }

      // Método 2: REST API direta com anon key (fallback)
      if (list.length === 0) {
        try {
          const restUrl = new URL(`${supabaseUrl}/rest/v1/demands`);
          restUrl.searchParams.set("select", "*");
          restUrl.searchParams.set("order", "created_at.desc");
          if (filterType !== "all") restUrl.searchParams.set("type", `eq.${filterType}`);
          const res = await fetch(restUrl.toString(), {
            headers: {
              apikey: supabaseAnonKey,
              Authorization: `Bearer ${supabaseAnonKey}`,
              Accept: "application/json",
            },
          });
          if (res.ok) {
            const json = await res.json();
            if (Array.isArray(json) && json.length > 0) list = json as DemandCard[];
          }
        } catch (_) { /* silent */ }
      }

      // Método 3: Edge Function (último recurso)
      if (list.length === 0) {
        try {
          const { data: fnData, error: fnErr } = await supabase.functions.invoke("get-demands", {
            body: null,
            headers: { "x-type-filter": filterType },
          });
          if (!fnErr && Array.isArray(fnData) && fnData.length > 0) {
            list = fnData as DemandCard[];
          }
        } catch (_) { /* silent */ }
      }

      setDemands(list);
      setStats({
        total: list.length,
        aberto: list.filter((d) => (d.status ?? "aberto") === "aberto").length,
        em_andamento: list.filter((d) => (d.status ?? "aberto") === "em_andamento").length,
        aguardando_externa: list.filter((d) => (d.status ?? "aberto") === "aguardando_externa").length,
        finalizada: list.filter((d) => (d.status ?? "aberto") === "finalizada").length,
      });
    } catch (err) {
      console.error("[AssessorPainel] loadDemands exceção:", err);
    }
  }, [filterType]);

  useEffect(() => {
    if (!loading) loadDemands();
  }, [loading, loadDemands]);

  // Deriva stats automaticamente das demands — mantém sidebar atualizada em tempo real
  useEffect(() => {
    setStats({
      total: demands.length,
      aberto: demands.filter((d) => (d.status ?? "aberto") === "aberto").length,
      em_andamento: demands.filter((d) => (d.status ?? "aberto") === "em_andamento").length,
      aguardando_externa: demands.filter((d) => (d.status ?? "aberto") === "aguardando_externa").length,
      finalizada: demands.filter((d) => (d.status ?? "aberto") === "finalizada").length,
    });
  }, [demands]);

  // Real-time subscription — nova demanda aparece automaticamente
  useEffect(() => {
    if (loading) return;
    const channel = supabase
      .channel("demands-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "demands" },
        () => { try { loadDemands(); } catch (e) { console.error("[Assessor] Realtime demands callback erro:", e); } }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") console.log("[Assessor] Realtime demands conectado");
        if (status === "CHANNEL_ERROR") console.error("[Assessor] Realtime demands ERRO - reconectando...");
        if (status === "TIMED_OUT") console.warn("[Assessor] Realtime demands TIMEOUT");
      });
    return () => { supabase.removeChannel(channel); };
  }, [loading, loadDemands]);

  // Handle ?demanda= from notification redirects — abre a demanda específica
  // BUGFIX: usa ref para garantir que só abre UMA VEZ por URL, evitando loop com polling
  useEffect(() => {
    if (loading) return;
    const demandaId = searchParams.get("demanda");
    // Só abre se: tem o param, demands carregadas, e ainda NÃO foi aberta esta sessão
    if (demandaId && demands.length > 0 && demandaAutoOpenedRef.current !== demandaId) {
      const d = demands.find((d) => String(d.id) === demandaId);
      if (d) {
        demandaAutoOpenedRef.current = demandaId;
        setSelected(d);
      }
    }
  }, [loading, demands, searchParams]);

  // Sync tab with URL params (supports notification redirects)
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab") as Tab | null;
    if (tabFromUrl && tabFromUrl !== tab) {
      setTab(tabFromUrl);
    }
  }, [searchParams]);

  // Realtime: atualiza vagas quando empresas publicam/editam/excluem
  useEffect(() => {
    if (loading) return;
    const channel = supabase
      .channel("assessor-vagas-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "vagas" }, async () => {
        try {
        const [{ data: vagasData }, { data: empresas }] = await Promise.all([
          supabase.from("vagas").select("*").eq("status", "active").order("created_at", { ascending: false }),
          supabase.from("profiles").select("id, avatar_url, profile_photo").eq("role", "empresa"),
        ]);
        const map: Record<string, string> = {};
        (empresas ?? []).forEach((e: any) => { map[e.id] = e.avatar_url || e.profile_photo || ""; });
        setCompanyAvatars(map);
        setVagas(((vagasData as VagaPublica[]) ?? []).map(v => ({ ...v, company_avatar: v.company_id ? (map[v.company_id] || null) : null })));
        } catch (e) { console.error("[Assessor] Realtime vagas callback erro:", e); }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") console.log("[Assessor] Realtime vagas conectado");
        if (status === "CHANNEL_ERROR") console.error("[Assessor] Realtime vagas ERRO - reconectando...");
        if (status === "TIMED_OUT") console.warn("[Assessor] Realtime vagas TIMEOUT");
        if (status === "CLOSED") console.warn("[Assessor] Realtime vagas FECHADO - reconectando...");
      });
    return () => { supabase.removeChannel(channel); };
  }, [loading]);

  // Realtime: atualiza usuários quando profiles mudam
  useEffect(() => {
    if (loading) return;
    const channel = supabase
      .channel("assessor-usuarios-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, async () => {
        try {
        const { data: userList } = await supabase
          .from("profiles")
          .select("id, full_name, display_name, role, phone, neighborhood, education, expertise, job_status, job_type, bio, curriculo_pdf, avatar_url, profile_photo, company_name, status, is_service_provider, service_categories, service_description, portfolio_photos, created_at")
          .order("created_at", { ascending: false });
        setUsuarios((userList as UsuarioSistema[]) ?? []);
        } catch (e) { console.error("[Assessor] Realtime usuarios callback erro:", e); }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") console.log("[Assessor] Realtime usuarios conectado");
        if (status === "CHANNEL_ERROR") console.error("[Assessor] Realtime usuarios ERRO - reconectando...");
        if (status === "TIMED_OUT") console.warn("[Assessor] Realtime usuarios TIMEOUT");
        if (status === "CLOSED") console.warn("[Assessor] Realtime usuarios FECHADO - reconectando...");
      });
    return () => { supabase.removeChannel(channel); };
  }, [loading]);

  // Polling fallback de segurança (30s): camada extra anti-F5
  useEffect(() => {
    if (loading) return;
    const interval = setInterval(() => {
      try { loadDemands(); } catch (e) { console.error("[Assessor] Polling fallback erro:", e); }
    }, 30000); // 30 segundos — realtime cuida dos updates em tempo real
    return () => clearInterval(interval);
  }, [loading, loadDemands]);

  const handleDemandUpdate = (updated: DemandCard) => {
    setDemands((prev) => {
      const list = prev.map((d) => d.id === updated.id ? updated : d);
      return list;
    });
    setSelected(updated);
  };

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } catch (_) { /* ignore */ }
    clearStoredUser();
    Object.keys(localStorage).forEach((k) => { if (k.startsWith("sb-") || k.includes("supabase")) localStorage.removeItem(k); });
    Object.keys(sessionStorage).forEach((k) => { if (k.startsWith("sb-") || k.includes("supabase")) sessionStorage.removeItem(k); });
    navigate("/assessor");
  };

  // ── Setup Profile handlers ──
  const handleSaveCargo = async () => {
    if (!setupCargo.trim() || !user) return;
    setSetupUploading(true);
    setSetupMsg("");
    const { error } = await supabase
      .from("profiles")
      .update({ assessor_cargo: setupCargo.trim() })
      .eq("id", user.id);
    setSetupUploading(false);
    if (error) { setSetupMsg("Erro ao salvar cargo."); return; }
    setAssessorProfile((p) => p ? { ...p, assessor_cargo: setupCargo.trim() } : null);
    // Setup completo — fecha modal e libera tour
    setShowSetupProfile(false);
    setSetupComplete(true);
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setSetupUploading(true);
    setSetupMsg("");
    try {
      const edgeFnUrl = getEdgeFunctionUrl("upload-profile-photo");
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("userId", user.id);
      const fnRes = await fetch(edgeFnUrl, { method: "POST", headers: { apikey: supabaseAnonKey }, body: uploadFormData });
      if (!fnRes.ok) throw new Error("Falha ao enviar foto.");
      const result = await fnRes.json();
      if (!result.success || !result.url) throw new Error(result.error || "Falha ao processar foto.");
      const publicUrl: string = result.url;
      // Atualizar profile_photo e avatar_url no banco com a URL pública
      await supabase.from("profiles").update({ profile_photo: publicUrl, avatar_url: publicUrl }).eq("id", user.id);
      setAssessorProfile((p) => p ? { ...p, profile_photo: publicUrl, avatar_url: publicUrl } : null);
      setAvatarUrlState(publicUrl);
      // 🔧 Atualizar storedUser para que o avatar apareça imediatamente
      const stored = getStoredUser();
      if (stored) {
        storeUser({ ...stored, avatar_url: publicUrl });
      }
      setShowSetupProfile(false);
    } catch (err) {
      setSetupMsg(`Erro: ${err instanceof Error ? err.message : "Erro inesperado"}`);
    } finally {
      setSetupUploading(false);
    }
  };

  /** Troca de aba — limpa o badge de mensagens ao abrir o chat */
  const handleTabChange = (newTab: Tab) => {
    currentTabRef.current = newTab;
    if (newTab === "chat" && user) {
      setChatUnreadCount(0);
      const nowIso = new Date().toISOString();
      lastMsgCheckRef.current = nowIso;
      setLastCheckTime(`assessor_notif_${user.id}`, nowIso);
    }
    setTab(newTab);
    setSearchParams({ tab: newTab });
  };

  // ── Usuários filtrados por busca ──
  const filteredAssessorUsuarios = useMemo(() => {
    if (!assessorUsuarioSearch.trim()) return usuarios;
    const q = assessorUsuarioSearch.toLowerCase();
    return usuarios.filter((u) =>
      (u.full_name ?? "").toLowerCase().includes(q) ||
      (u.display_name ?? "").toLowerCase().includes(q) ||
      (u.neighborhood ?? "").toLowerCase().includes(q) ||
      (u.role ?? "").toLowerCase().includes(q) ||
      (u.company_name ?? "").toLowerCase().includes(q) ||
      (u.expertise ?? "").toLowerCase().includes(q)
    );
  }, [usuarios, assessorUsuarioSearch]);

  // ── Abrir perfil do cidadão/empresa a partir do chat ──
  const handleAssessorChatAvatarClick = useCallback((citizenId: string) => {
    const u = usuarios.find((usr) => usr.id === citizenId);
    if (u) setSelectedUsuario(u);
  }, [usuarios]);

  const filteredDemands = demands.filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.title?.toLowerCase().includes(q) ||
      d.citizen_name?.toLowerCase().includes(q) ||
      d.citizen_neighborhood?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0D1629" }}>
        <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "rgba(59,191,212,0.3)", borderTopColor: "#3BBFD4" }}></div>
      </div>
    );
  }

  const navItems: { key: Tab; icon: string; label: string; badge?: number }[] = [
    { key: "kanban", icon: "ri-layout-column-line", label: "Demandas" },
    { key: "chat", icon: "ri-chat-3-line", label: "Mensagens", badge: chatUnreadCount > 0 ? chatUnreadCount : openChatCount },
    { key: "usuarios", icon: "ri-group-line", label: "Usuários" },
    { key: "vagas", icon: "ri-briefcase-4-line", label: "Vagas" },
    { key: "agenda", icon: "ri-calendar-line", label: "Agenda" },
  ];

  // Determine if this assessor is Chefe de Gabinete or has admin-level access
  const isChefeCabinete = assessorProfile?.assessor_cargo?.toLowerCase().includes("chefe de gabinete") || user?.role === "admin";

  // Assessores de comunicação/marketing/imprensa têm acesso ao gerenciamento de notícias
  const newsAreas = ["comunicacao", "comunicação", "marketing", "imprensa", "redes sociais", "redes_sociais", "cerimonial"];
  const assessorArea = (assessorProfile?.assessor_area ?? "").toLowerCase();
  const canManageNews = newsAreas.some((a) => assessorArea.includes(a)) || assessorProfile?.assessor_cargo?.toLowerCase().includes("comunicação") || assessorProfile?.assessor_cargo?.toLowerCase().includes("imprensa");

  if (canManageNews) {
    navItems.push({ key: "noticias" as Tab, icon: "ri-newspaper-line", label: "Notícias" });
  }

  // Chefe de Gabinete ou admin têm acesso às métricas completas do sistema
  if (isChefeCabinete) {
    navItems.push({ key: "metricas" as Tab, icon: "ri-pie-chart-line", label: "Métricas" });
  }

  const roleLabel: Record<string, string> = {
    assessor: "Assessor",
    admin: "Admin",
    admin: "Admin",
  };

  return (
    <div className="min-h-screen flex" style={{ background: "#0D1629" }}>
      <div id="assessor-sidebar-wrapper">
        <PainelSidebar
        role="assessor"
        roleLabel={roleLabel[user?.role ?? "assessor"]}
        userName={user?.name ?? ""}
        avatarUrl={avatarUrlState ?? getStoredUser()?.avatar_url ?? null}
        navItems={navItems}
        activeTab={tab}
        onTabChange={handleTabChange}
        stats={[
          { label: "Em Aberto", value: stats.aberto, icon: "ri-inbox-line", color: "#D97706" },
          { label: "Em Andamento", value: stats.em_andamento, icon: "ri-loader-4-line", color: "#3BBFD4" },
          { label: "Ag. Externa", value: stats.aguardando_externa, icon: "ri-mail-send-line", color: "#7C3AED" },
          { label: "Finalizados", value: stats.finalizada, icon: "ri-checkbox-circle-line", color: "#22C55E" },
        ]}
        onLogout={handleLogout}
        width="w-60"
      />

      </div>

      {/* Main */}
      <main className="md:ml-60 flex-1 p-4 md:p-6 min-h-screen pt-20 md:pt-6 pb-24 md:pb-6" style={{ background: "#0D1629" }}>
        {/* Header com sino */}
        <div className="flex items-center justify-end mb-2 md:hidden">
          <div className="flex items-center gap-2">
            <WeatherWidget compact />
            <div data-tour="assessor-notificacoes">
              <NotificationBell userId={user?.id ?? null} userRole={user?.role ?? null} onNavigate={(path) => navigate(path)} />
            </div>
          </div>
        </div>
        <div className="hidden md:flex items-center justify-end mb-2">
          <div className="flex items-center gap-2">
            <WeatherWidget compact />
            <div data-tour="assessor-notificacoes">
              <NotificationBell userId={user?.id ?? null} userRole={user?.role ?? null} onNavigate={(path) => navigate(path)} />
            </div>
          </div>
        </div>

        {tab === "kanban" && (
          <div style={{ background: "#0D1629" }}>
            <div className="flex flex-col gap-3 mb-6">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h1 className="text-xl md:text-2xl font-extrabold text-white">Gestão de Demandas</h1>
                  <p className="text-xs md:text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.40)" }}>Acompanhe e responda as demandas dos cidadãos</p>
                </div>
                <button
                  onClick={() => loadDemands()}
                  className="w-9 h-9 flex items-center justify-center rounded-xl transition-all cursor-pointer shrink-0"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)" }}
                  title="Atualizar"
                >
                  <i className="ri-refresh-line text-base"></i>
                </button>
              </div>
              <div className="flex gap-2 flex-wrap">
                <div className="relative flex-1 min-w-0">
                  <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar demanda..."
                    id="assessor-search-input"
                    data-tour="assessor-search"
                    className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "white" }}
                  />
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="rounded-xl px-3 py-2.5 text-sm focus:outline-none cursor-pointer"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "white" }}
                >
                  <option value="all">Todos</option>
                  <option value="requerimento">Requerimentos</option>
                  <option value="sugestao">Sugestões</option>
                  <option value="contato">Contatos</option>
                </select>
              </div>
            </div>

            <div data-tour="assessor-kanban">
              <KanbanBoard
                demands={filteredDemands}
                selected={selected}
                onSelect={(d) => { if (closingRef.current) return; setSelected(d); }}
              />
            </div>
          </div>
        )}

        {tab === "chat" && (
          <div style={{ background: "#0D1629" }}>
            <div className="flex items-center justify-between gap-3 mb-6">
              <div>
                <h1 className="text-xl md:text-2xl font-extrabold text-white">Mensagens dos Cidadãos</h1>
                <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.40)" }}>Ao entrar em uma conversa, você a assume automaticamente</p>
              </div>
            </div>
            <ChatPanel assessorId={user?.id ?? ""} assessorName={user?.name ?? "Assessor"} onCitizenClick={handleAssessorChatAvatarClick} />
          </div>
        )}


        {tab === "usuarios" && (
          <div>
            <div className="mb-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
              <div>
                <h1 className="text-xl md:text-2xl font-extrabold text-white">Usuários do Sistema</h1>
                <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.40)" }}>
                  {usuarios.length} usuários cadastrados na plataforma
                </p>
              </div>
            </div>

            {/* Campo de busca */}
            <div className="relative mb-4">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-white/25 text-sm"></i>
              <input
                type="text"
                value={assessorUsuarioSearch}
                onChange={(e) => setAssessorUsuarioSearch(e.target.value)}
                placeholder="Buscar por nome, bairro, role ou empresa..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}
              />
              {assessorUsuarioSearch && (
                <button onClick={() => setAssessorUsuarioSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 cursor-pointer transition-colors" style={{ color: "rgba(255,255,255,0.40)" }}>
                  <i className="ri-close-line text-xs"></i>
                </button>
              )}
            </div>

            {usuarios.length === 0 ? (
              <div className="py-12 text-center text-sm" style={{ color: "rgba(255,255,255,0.30)" }}>
                Nenhum usuário cadastrado
              </div>
            ) : filteredAssessorUsuarios.length === 0 ? (
              <div className="py-12 text-center text-sm" style={{ color: "rgba(255,255,255,0.30)" }}>
                Nenhum usuário encontrado para "{assessorUsuarioSearch}"
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredAssessorUsuarios.map((u) => {
                  const avatar = u.avatar_url || u.profile_photo || null;
                  const grupoLabel: Record<string, { label: string; color: string; bg: string; border: string }> = {
                    citizen: { label: "Cidadão", color: "#3BBFD4", bg: "rgba(59,191,212,0.12)", border: "rgba(59,191,212,0.25)" },
                    empresa: { label: "Empresa", color: "#E8A020", bg: "rgba(232,160,32,0.12)", border: "rgba(232,160,32,0.25)" },
                    assessor: { label: "Assessor", color: "#0369A1", bg: "rgba(3,105,161,0.12)", border: "rgba(3,105,161,0.25)" },
                    admin: { label: "Admin", color: "#7C3AED", bg: "rgba(124,58,237,0.12)", border: "rgba(124,58,237,0.25)" },
                    vereador: { label: "Vereador", color: "#22C55E", bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.25)" },
                  };
                  const gl = grupoLabel[u.role] ?? grupoLabel.citizen;

                  return (
                    <div
                      key={u.id}
                      className="rounded-2xl p-4 transition-all hover:bg-white/8 overflow-hidden"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <AvatarWithFallback
                          url={avatar}
                          name={u.display_name || u.full_name}
                          className="w-12 h-12 rounded-xl object-cover object-top shrink-0 border border-white/10"
                          fallbackClassName="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-lg font-bold"
                          fallbackStyle={{ background: gl.bg, color: gl.color }}
                        />
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <h3 className="text-white font-bold text-sm truncate">{(u.display_name || u.full_name) ?? "Sem nome"}</h3>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span
                              className="inline-flex text-xs font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap"
                              style={{ color: gl.color, background: gl.bg, border: `1px solid ${gl.border}` }}
                            >
                              {gl.label}
                            </span>
                            {u.role === "citizen" && u.job_status !== "not_looking" && (
                              <span className="text-xs flex items-center gap-1" style={{ color: "#E8A020" }}>
                                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#E8A020" }}></span>
                                Buscando
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {u.role === "citizen" && u.expertise && (
                        <p className="text-xs mb-3 line-clamp-1" style={{ color: "rgba(255,255,255,0.45)" }}>
                          <i className="ri-briefcase-4-line mr-1" style={{ color: "#3BBFD4" }}></i>
                          {u.expertise}
                        </p>
                      )}
                      {u.role === "empresa" && u.company_name && (
                        <p className="text-xs mb-3 line-clamp-1" style={{ color: "rgba(255,255,255,0.45)" }}>
                          <i className="ri-building-line mr-1" style={{ color: "#E8A020" }}></i>
                          {u.company_name}
                        </p>
                      )}

                      <button
                        onClick={() => setSelectedUsuario(u)}
                        className="w-full py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all whitespace-nowrap"
                        style={{ background: "rgba(255,255,255,0.08)", color: "#3BBFD4", border: "1px solid rgba(59,191,212,0.20)" }}
                      >
                        <i className="ri-eye-line mr-1.5"></i> Saiba Mais
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === "vagas" && (
          <div>
            {/* Toggle Vagas / Prestadores — RESPONSIVE: empilha no mobile, horizontal no desktop */}
            <div className="flex flex-col gap-4 mb-5">
              {/* Título + descrição — centralizado no mobile */}
              <div className="w-full">
                <h1 className="text-xl md:text-2xl font-extrabold text-white">
                  {vagasSubView === "vagas" ? "Vagas de Emprego Abertas" : "Prestadores de Serviço"}
                </h1>
                <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.40)" }}>
                  {vagasSubView === "vagas"
                    ? `${vagas.length} vagas ativas em Pelotas — acompanhe as oportunidades publicadas pelas empresas`
                    : `${usuarios.filter((u) => u.role === "citizen" && u.is_service_provider === true).length} prestadores cadastrados na plataforma`}
                </p>
              </div>
              {/* Botões toggle — centralizado, full-width no mobile */}
              <div className="flex rounded-xl p-1 w-full sm:w-auto sm:self-start" style={{ background: "rgba(255,255,255,0.06)" }}>
                <button
                  onClick={() => { setVagasSubView("vagas"); setSelectedVaga(null); }}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                    vagasSubView === "vagas" ? "text-white" : "text-white/40"
                  }`}
                  style={vagasSubView === "vagas" ? { background: "linear-gradient(135deg, #1B2A5E, #3BBFD4)" } : {}}
                >
                  <i className="ri-briefcase-4-line"></i>
                  Vagas
                  <span className="text-xs opacity-60">({vagas.length})</span>
                </button>
                <button
                  onClick={() => { setVagasSubView("prestadores"); setSelectedVaga(null); }}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                    vagasSubView === "prestadores" ? "text-white" : "text-white/40"
                  }`}
                  style={vagasSubView === "prestadores" ? { background: "linear-gradient(135deg, #166534, #22C55E)" } : {}}
                >
                  <i className="ri-tools-line"></i>
                  Prestadores
                  <span className="text-xs opacity-60">({usuarios.filter((u) => u.role === "citizen" && u.is_service_provider === true).length})</span>
                </button>
              </div>
            </div>

            {vagasSubView === "vagas" ? (
              <>
                {vagas.length === 0 ? (
                  <div className="py-16 text-center rounded-2xl" style={{ border: "1px dashed rgba(255,255,255,0.12)" }}>
                    <i className="ri-briefcase-4-line text-4xl mb-3 block" style={{ color: "rgba(255,255,255,0.15)" }}></i>
                    <p className="font-semibold" style={{ color: "rgba(255,255,255,0.35)" }}>Nenhuma vaga ativa no momento</p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {vagas.map((vaga) => (
                      <VagaCardPublica
                        key={vaga.id}
                        vaga={vaga}
                        onSaibaMais={setSelectedVaga}
                        readOnly={true}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <PrestadoresTab
                prestadores={usuarios
                  .filter((u) => u.role === "citizen" && u.is_service_provider === true)
                  .map((u) => ({
                    id: u.id,
                    full_name: u.full_name,
                    display_name: u.display_name,
                    phone: u.phone,
                    neighborhood: u.neighborhood,
                    education: u.education,
                    expertise: u.expertise,
                    job_type: u.job_type,
                    job_status: u.job_status,
                    bio: u.bio,
                    curriculo_pdf: u.curriculo_pdf,
                    avatar_url: u.avatar_url,
                    profile_photo: u.profile_photo,
                    service_categories: u.service_categories,
                    service_description: (u as any).service_description ?? null,
                    portfolio_photos: (u as any).portfolio_photos ?? null,
                  }))}
                searchPrestador={searchPrestador}
                setSearchPrestador={setSearchPrestador}
                filterPrestCat={filterPrestCat}
                setFilterPrestCat={setFilterPrestCat}
                selectedPrestador={selectedPrestador}
                setSelectedPrestador={setSelectedPrestador}
              />
            )}
          </div>
        )}

        {tab === "agenda" && (
          <AgendaPage userId={user?.id ?? ""} userName={user?.name ?? ""} userRole="assessor" />
        )}

        {tab === "noticias" && canManageNews && (
          <div>
            <div className="mb-5">
              <h1 className="text-xl md:text-2xl font-extrabold text-white">Gerenciamento de Notícias</h1>
              <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.40)" }}>
                Publique e gerencie as notícias do portal do mandato
              </p>
            </div>
            <AssessorNewsPanel authorName={user?.name ?? "Assessor"} />
          </div>
        )}

        {tab === "metricas" && isChefeCabinete && (() => {
          const contratados = metricCidadaos
            .filter((c: any) => c.employed_through_platform === true)
            .map((cidadao: any) => {
              const cand = metricCandidaturas.find((c: any) => c.cidadao_id === cidadao.id);
              const vaga = cand ? metricVagas.find((v: any) => v.id === cand.vaga_id) : null;
              return { cidadao, vaga: vaga ?? null };
            });
          return (
            <VereadorMetricasSistema
              demands={metricDemands}
              cidadaos={metricCidadaos}
              vagas={metricVagas}
              comCurriculo={metricStats.comCurriculo}
              lookingWork={metricStats.lookingWork}
              employed={metricStats.employed}
              totalCidadaos={metricStats.totalCidadaos}
              contratados={contratados}
              onSelectUsuario={(cidadaoId) => {
                const u = usuarios.find((usr) => usr.id === cidadaoId);
                if (u) setSelectedUsuario(u);
              }}
              onExportPDF={async () => {
                // FRESH FETCH — garante dados 100% atualizados do banco no momento da exportação
                const [freshDemandsRes, freshCidadaosRes, freshVagasRes, freshCandRes] = await Promise.all([
                  supabase.from("demands").select("id, type, category, status, title, citizen_name, citizen_neighborhood, assessor_id, assessor_name, created_at, updated_at").order("created_at", { ascending: false }),
                  supabase.from("profiles").select("id, full_name, neighborhood, job_status, is_employed, employed_through_platform, platform_job_details, employment_survey_completed, curriculo_pdf, created_at").eq("role", "citizen").order("created_at", { ascending: false }),
                  supabase.from("vagas").select("id, title, company_name, status").order("created_at", { ascending: false }),
                  supabase.from("candidaturas").select("id, vaga_id, cidadao_id, status").eq("status", "aprovada").order("created_at", { ascending: false }),
                ]);
                const freshDemands = (freshDemandsRes.data as any[]) ?? [];
                const freshCidadaos = (freshCidadaosRes.data as any[]) ?? [];
                const freshVagas = (freshVagasRes.data as any[]) ?? [];
                const freshCand = (freshCandRes.data as any[]) ?? [];
                const freshComCurriculo = freshCidadaos.filter((c: any) => c.curriculo_pdf && c.curriculo_pdf.length > 5).length;
                const freshLookingWork = freshCidadaos.filter((c: any) => c.job_status !== "not_looking").length;
                const freshEmployed = freshCidadaos.filter((c: any) => c.is_employed === true).length;
                const freshComSurvey = freshCidadaos.filter((c: any) => c.employment_survey_completed).length;
                const freshSemSurvey = freshCidadaos.filter((c: any) => !c.employment_survey_completed).length;
                const freshContratados = freshCidadaos
                  .filter((c: any) => c.employed_through_platform === true)
                  .map((cidadao: any) => {
                    const cand = freshCand.find((c: any) => c.cidadao_id === cidadao.id);
                    const vaga = cand ? freshVagas.find((v: any) => v.id === cand.vaga_id) : null;
                    return { cidadao, vaga: vaga ?? null };
                  });
                await exportSystemMetricsPDF(
                  freshDemands.map((d: any) => ({
                    id: d.id, type: d.type, category: d.category, status: d.status,
                    title: d.title, citizen_name: d.citizen_name, citizen_neighborhood: d.citizen_neighborhood,
                    assessor_id: d.assessor_id, assessor_name: d.assessor_name,
                    created_at: d.created_at, updated_at: d.updated_at,
                  })),
                  { totalCidadaos: freshCidadaos.length, comCurriculo: freshComCurriculo, lookingWork: freshLookingWork, employed: freshEmployed, comSurvey: freshComSurvey, semSurvey: freshSemSurvey },
                  freshContratados
                );
              }}
            />
          );
        })()}

      </main>

      {/* Detail modal */}
      {selected && (
        <DemandDetail
          demand={selected}
          assessorId={user?.id ?? ""}
          assessorName={user?.name ?? "Assessor"}
          onUpdate={handleDemandUpdate}
          onClose={() => {
            closingRef.current = true;
            setSelected(null);
            // Reseta o ref para permitir que a mesma demanda seja reaberta por nova notificação
            demandaAutoOpenedRef.current = null;
            // Limpa ?demanda= da URL para não reabrir no próximo update de demands
            if (searchParams.get("demanda")) {
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                next.delete("demanda");
                return next;
              }, { replace: true });
            }
            // Libera o lock após 400ms (tempo suficiente para o ghost click passar)
            setTimeout(() => { closingRef.current = false; }, 400);
          }}
        />
      )}

      {/* Usuario Saiba Mais modal */}
      {selectedUsuario && (
        <UsuarioSaibaMaisModal
          usuario={selectedUsuario}
          onClose={() => setSelectedUsuario(null)}
          onPhotoClick={(url, name) => setPhotoLightbox({ url, name })}
        />
      )}

      {/* Lightbox de foto de perfil */}
      <ProfilePhotoLightbox
        imageUrl={photoLightbox.url}
        userName={photoLightbox.name}
        isOpen={!!photoLightbox.url}
        onClose={() => setPhotoLightbox({ url: null, name: null })}
      />

      {/* Vaga Detail Modal */}
      {selectedVaga && (
        <VagaDetailModal
          vaga={selectedVaga}
          onClose={() => setSelectedVaga(null)}
          readOnly={true}
          showCandidatos={true}
        />
      )}

      {/* Setup Profile Modal — Assessor precisa completar cargo apenas (foto já foi tirada no complete-profile) */}
      {showSetupProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.70)", backdropFilter: "blur(6px)" }}>
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="p-6 text-center" style={{ background: "linear-gradient(135deg, #0369A1, #0EA5E9)" }}>
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3">
                <i className="ri-user-star-line text-3xl text-white"></i>
              </div>
              <h2 className="text-white font-extrabold text-xl">Qual é o seu cargo?</h2>
              <p className="text-white/60 text-sm mt-1">
                Selecione sua função no gabinete do vereador
              </p>
            </div>

            <div className="p-6">
              {setupMsg && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-2">
                  <i className="ri-error-warning-line"></i>
                  {setupMsg}
                </div>
              )}

              <div>
                <p className="text-gray-600 text-sm mb-3 font-medium">Escolha o cargo que melhor representa sua função:</p>
                <div className="space-y-1.5 max-h-72 overflow-y-auto mb-4">
                  {ASSESSOR_CARGOS.map((cargo) => (
                    <button
                      key={cargo}
                      onClick={() => setSetupCargo(cargo)}
                      className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${setupCargo === cargo ? "text-white" : "text-gray-700 hover:bg-gray-50"}`}
                      style={setupCargo === cargo ? { background: "linear-gradient(135deg, #0369A1, #0EA5E9)" } : { background: "#F9FAFB", border: "1px solid #E5E7EB" }}
                    >
                      {setupCargo === cargo && <i className="ri-check-line mr-2"></i>}
                      {cargo}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleSaveCargo}
                  disabled={!setupCargo.trim() || setupUploading}
                  className="w-full py-3.5 rounded-xl text-white font-bold text-sm cursor-pointer whitespace-nowrap disabled:opacity-50 transition-all"
                  style={{ background: "linear-gradient(135deg, #0369A1, #0EA5E9)" }}
                >
                  {setupUploading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Salvando...
                    </span>
                  ) : (
                    <>
                      <i className="ri-arrow-right-line mr-2"></i>
                      Continuar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botão flutuante "?" — sempre disponível para iniciar/rever o tour */}
      {/* Ao clicar, redireciona para kanban ANTES de iniciar para garantir que todos os elementos estejam visíveis */}
      {!tour.isActive && (
        <button
          onClick={() => tour.startTour(() => {
            handleTabChange("kanban");
            window.scrollTo({ top: 0, behavior: "instant" });
          })}
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 w-12 h-12 rounded-full flex items-center justify-center cursor-pointer shadow-lg transition-all hover:scale-110"
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
        tourName={assessorTour.name}
        onNext={tour.nextStep}
        onPrev={tour.prevStep}
        onSkip={tour.skipTour}
        onFinish={tour.finishTour}
      />
    </div>
  );
}