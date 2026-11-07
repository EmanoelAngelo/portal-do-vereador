import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase, supabaseUrl, supabaseAnonKey, getEdgeFunctionUrl } from "@/lib/supabase";
import { getStoredUser, clearStoredUser, storeUser } from "@/hooks/useAuth";
import { playNotificationSound, getLastCheckTime, setLastCheckTime, getLastRead, setLastRead } from "@/hooks/useChatNotification";
import PainelSidebar from "@/components/feature/PainelSidebar";
import ProfilePhotoLightbox from "@/components/feature/ProfilePhotoLightbox";
import AvatarWithFallback from "@/components/feature/AvatarWithFallback";
import NotificationBell from "@/components/feature/NotificationBell";
import WeatherWidget from "@/components/feature/WeatherWidget";
import VereadorDemandDetail from "./components/VereadorDemandDetail";
import VereadorKanban from "./components/VereadorKanban";
import VereadorEficienciaAssessores from "./components/VereadorEficienciaAssessores";
import VereadorMetricasSistema from "./components/VereadorMetricasSistema";
import { exportAssessorEfficiencyPDF, exportSystemMetricsPDF } from "./components/VereadorExportPDF";
import UsuarioSaibaMaisModal, { type UsuarioSistema } from "./components/UsuarioSaibaMaisModal";
import VagaCardPublica, { type VagaPublica } from "@/components/feature/VagaCardPublica";
import VagaDetailModal from "@/components/feature/VagaDetailModal";
import PrestadoresTab from "@/pages/sistema/painel/cidadao/components/PrestadoresTab";
import AgendaPage from "@/pages/agenda/components/AgendaPage";
import TourGuide from "@/components/feature/TourGuide";
import { useTour } from "@/hooks/useTour";
import { useResilientRealtime } from "@/hooks/useResilientRealtime";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useAgendaReminders } from "@/hooks/useAgendaReminders";
import { vereadorTour } from "@/mocks/tours/vereador-tour";

interface Demand {
  id: number;
  type: string;
  title: string;
  status: string;
  category: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  citizen_name: string | null;
  citizen_phone: string | null;
  citizen_email: string | null;
  citizen_neighborhood: string | null;
  assessor_id: string | null;
  assessor_name: string | null;
  assessor_notes: string | null;
  admin_notes: string | null;
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
  company_name: string | null;
  company_id?: string | null;
  image_url: string | null;
  status: string;
  created_at: string;
}

interface Candidatura {
  id: number;
  vaga_id: number;
  cidadao_id: string;
  status: string;
  created_at: string;
}

interface Cidadao {
  id: string;
  full_name: string | null;
  neighborhood: string | null;
  job_status: string | null;
  education: string | null;
  is_employed: boolean | null;
  employed_through_platform: boolean | null;
  platform_job_details: string | null;
  employment_survey_completed: boolean | null;
  curriculo_pdf: string | null;
  created_at: string;
}

interface Stats {
  totalDemands: number;
  aberto: number;
  em_andamento: number;
  aguardando_externa: number;
  finalizada: number;
  totalVagas: number;
  totalCidadaos: number;
  lookingWork: number;
  employed: number;
  employedThroughPlatform: number;
  comCurriculo: number;
}

interface CidadaoComCurriculo {
  id: string;
  full_name: string | null;
  display_name: string | null;
  curriculo_pdf: string | null;
  is_service_provider: boolean | null;
  service_categories: string | null;
  job_status: string | null;
  created_at: string;
  updated_at: string;
  curriculos_gerados_count: number | null;
}

interface ChatMsg {
  id: number;
  chat_id: number;
  sender_role: string;
  sender_id: string | null;
  sender_name: string | null;
  message: string | null;
  image_url: string | null;
  image_data: string | null;
  created_at: string;
}

interface Chat {
  id: number;
  citizen_id: string;
  citizen_name: string | null;
  assessor_id: string | null;
  assessor_name: string | null;
  status: string;
  created_at: string;
  expires_at: string;
  closed_at: string | null;
}

type Tab = "overview" | "demands" | "vagas" | "usuarios" | "conversas" | "agenda" | "eficiencia" | "metricas";

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  aberto: { label: "Em Aberto", color: "text-amber-400", bg: "rgba(217,119,6,0.12)", border: "rgba(217,119,6,0.25)" },
  em_andamento: { label: "Em Andamento", color: "text-[#3BBFD4]", bg: "rgba(59,191,212,0.12)", border: "rgba(59,191,212,0.25)" },
  aguardando_externa: { label: "Ag. Resp. Ext.", color: "text-purple-400", bg: "rgba(124,58,237,0.12)", border: "rgba(124,58,237,0.25)" },
  finalizada: { label: "Finalizada", color: "text-emerald-400", bg: "rgba(22,163,74,0.12)", border: "rgba(22,163,74,0.25)" },
};

const typeLabel: Record<string, string> = {
  requerimento: "Requerimento",
  sugestao: "Sugestão",
  contato: "Contato",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

export default function VereadorPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ id: string; email: string; name: string } | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalDemands: 0, aberto: 0, em_andamento: 0, aguardando_externa: 0, finalizada: 0,
    totalVagas: 0, totalCidadaos: 0, lookingWork: 0, employed: 0, employedThroughPlatform: 0, comCurriculo: 0,
  });
  const [demands, setDemands] = useState<Demand[]>([]);
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [cidadaos, setCidadaos] = useState<Cidadao[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([]);
  const [selectedUsuario, setSelectedUsuario] = useState<UsuarioSistema | null>(null);
  const [photoLightbox, setPhotoLightbox] = useState<{ url: string | null; name: string | null }>({ url: null, name: null });
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [cidadaosComCurriculo, setCidadaosComCurriculo] = useState<CidadaoComCurriculo[]>([]);
  const [candidaturas, setCandidaturas] = useState<Candidatura[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>((searchParams.get("tab") as Tab) || "overview");
  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null);
  const [openChatCount, setOpenChatCount] = useState(0);
  const [conversasUnreadCount, setConversasUnreadCount] = useState(0);
  const conversasUnreadRef = useRef<Set<number>>(new Set());
  // Typing indicator — vereador vê quando assessor/cidadão está digitando (modo leitura)
  const { typingUsers } = useTypingIndicator(selectedChat?.id ?? null, user?.name ?? "Vereador");
  const lastMsgCheckRef = useRef<string>("");
  const selectedChatRef = useRef<Chat | null>(null);
  // Anti-ghost-click: impede re-abertura do modal por 400ms após fechar (touch events)
  const closingRef = useRef(false);
  // Anti-loop: impede re-abertura via redirect se a mesma demanda já foi aberta nesta sessão
  const demandaAutoOpenedRef = useRef<string | null>(null);
  const [selectedVaga, setSelectedVaga] = useState<VagaPublica | null>(null);
  const [vagasSubView, setVagasSubView] = useState<"vagas" | "prestadores">("vagas");
  const [companyAvatars, setCompanyAvatars] = useState<Record<string, string>>();
  // Prestadores dentro da aba Vagas
  const [searchPrestador, setSearchPrestador] = useState("");
  const [filterPrestCat, setFilterPrestCat] = useState("Todas");
  const [selectedPrestador, setSelectedPrestador] = useState<any>(null);
  // V1+V2: busca, filtro e ordenação
  const [searchQuery, setSearchQuery] = useState("");
  const [usuarioSearch, setUsuarioSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [vereadorSortBy, setVereadorSortBy] = useState<string>("recentes");
  // ITEM 02: Toggle Lista / Kanban
  const [demandsView, setDemandsView] = useState<"lista" | "kanban">("lista");

  // Tour guiado — primeiro acesso dispara automaticamente
  const tour = useTour(vereadorTour, true);

  // BUGFIX B1: Lembretes da agenda disparam sempre que o vereador estiver logado
  useAgendaReminders(true);

  // Filtra e ordena demandas
  const filteredDemands = demands
    .filter((d) => {
      if (statusFilter !== "todos" && d.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          d.title.toLowerCase().includes(q) ||
          (d.citizen_name ?? "").toLowerCase().includes(q) ||
          (d.category ?? "").toLowerCase().includes(q) ||
          String(d.id).includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      switch (vereadorSortBy) {
        case "antigos": return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "prioridade": {
          const pa = a.status === "finalizada" ? 4 : a.status === "em_andamento" ? 1 : a.status === "aguardando_externa" ? 3 : 0;
          const pb = b.status === "finalizada" ? 4 : b.status === "em_andamento" ? 1 : b.status === "aguardando_externa" ? 3 : 0;
          if (pa !== pb) return pa - pb;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        case "recentes":
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  // ── Recarrega APENAS a lista de cidadãos (leve, para o relatório de empregabilidade) ──
  const refreshCidadaosOnly = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, neighborhood, job_status, education, is_employed, employed_through_platform, platform_job_details, employment_survey_completed, curriculo_pdf, created_at")
        .eq("role", "citizen")
        .order("created_at", { ascending: false });
      const cidList = (data as Cidadao[]) ?? [];
      setCidadaos(cidList);
      setStats((prev) => ({
        ...prev,
        totalCidadaos: cidList.length,
        lookingWork: cidList.filter((c) => c.job_status !== "not_looking").length,
        employed: cidList.filter((c) => c.is_employed === true).length,
        employedThroughPlatform: cidList.filter((c) => c.employed_through_platform === true).length,
      }));
    } catch (e) { /* silent */ }
  }, []);

  // ── Recarrega APENAS a lista de currículos (leve, sem recarregar tudo) ──
  const refreshCurriculosOnly = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, display_name, curriculo_pdf, is_service_provider, service_categories, job_status, created_at, updated_at, curriculos_gerados_count")
        .eq("role", "citizen")
        .gt("curriculos_gerados_count", 0)
        .order("updated_at", { ascending: false });
      const currList = (data as CidadaoComCurriculo[]) ?? [];
      setCidadaosComCurriculo(currList);
      const total = currList.reduce((sum, c) => sum + (c.curriculos_gerados_count || 0), 0);
      setStats((prev) => ({ ...prev, comCurriculo: total }));
    } catch (e) { /* silent */ }
  }, []);

  // Carrega APENAS demandas (sem recarregar vagas, usuários, chats)
  const loadDemandsOnly = useCallback(async () => {
    try {
      let demList: Demand[] = [];
      {
        const { data: d1, error: e1 } = await supabase
          .from("demands")
          .select("*")
          .order("created_at", { ascending: false });
        if (!e1 && Array.isArray(d1) && d1.length > 0) demList = d1 as Demand[];
      }
      if (demList.length === 0) {
        try {
          const restUrl = new URL(`${supabaseUrl}/rest/v1/demands`);
          restUrl.searchParams.set("select", "*");
          restUrl.searchParams.set("order", "created_at.desc");
          const res = await fetch(restUrl.toString(), {
            headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}`, Accept: "application/json" },
          });
          if (res.ok) { const json = await res.json(); if (Array.isArray(json) && json.length > 0) demList = json as Demand[]; }
        } catch (_) { /* silent */ }
      }
      if (demList.length === 0) {
        try {
          const { data: fnData } = await supabase.functions.invoke("get-demands", { body: null });
          if (Array.isArray(fnData) && fnData.length > 0) demList = fnData as Demand[];
        } catch (_) { /* silent */ }
      }
      if (demList.length > 0) {
        setDemands(demList);
        setStats((prev) => ({
          ...prev,
          totalDemands: demList.length,
          aberto: demList.filter((d) => (d.status ?? "aberto") === "aberto").length,
          em_andamento: demList.filter((d) => (d.status ?? "aberto") === "em_andamento").length,
          aguardando_externa: demList.filter((d) => (d.status ?? "aberto") === "aguardando_externa").length,
          finalizada: demList.filter((d) => (d.status ?? "aberto") === "finalizada").length,
        }));
      }
    } catch (err) {
      console.error("[Vereador] loadDemandsOnly exceção:", err);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      let demList: Demand[] = [];

      // Método 1: Supabase client direto (RLS anon policy = true)
      {
        const { data: d1, error: e1 } = await supabase
          .from("demands")
          .select("*")
          .order("created_at", { ascending: false });
        if (!e1 && Array.isArray(d1) && d1.length > 0) demList = d1 as Demand[];
        if (e1) console.error("[Vereador] loadData - Método 1 (client) erro:", e1.message);
      }

      // Método 2: REST API direta (fallback)
      if (demList.length === 0) {
        try {
          const restUrl = new URL(`${supabaseUrl}/rest/v1/demands`);
          restUrl.searchParams.set("select", "*");
          restUrl.searchParams.set("order", "created_at.desc");
          const res = await fetch(restUrl.toString(), {
            headers: {
              apikey: supabaseAnonKey,
              Authorization: `Bearer ${supabaseAnonKey}`,
              Accept: "application/json",
            },
          });
          if (res.ok) {
            const json = await res.json();
            if (Array.isArray(json) && json.length > 0) demList = json as Demand[];
          } else {
            console.error("[Vereador] loadData - Método 2 (REST) falhou:", res.status);
          }
        } catch (restErr) {
          console.error("[Vereador] loadData - Método 2 (REST) exceção:", restErr);
        }
      }

      // Método 3: Edge Function (último recurso)
      if (demList.length === 0) {
        try {
          const { data: fnData } = await supabase.functions.invoke("get-demands", { body: null });
          if (Array.isArray(fnData) && fnData.length > 0) demList = fnData as Demand[];
        } catch (fnErr) {
          console.error("[Vereador] loadData - Método 3 (edge fn) exceção:", fnErr);
        }
      }

      // ITEM 04 FIX: Só atualiza demands se conseguiu carregar algo.
      // Se todos os métodos falharam, mantém a lista anterior (evita tela branca).
      if (demList.length > 0) {
        setDemands(demList);
      } else {
        console.warn("[Vereador] loadData: todos os métodos falharam. Mantendo lista anterior.");
      }

      const [vagasResult, cidadaosResult, usuariosResult, curriculosResult, candidaturasResult] = await Promise.all([
        supabase.from("vagas").select("id, title, area, type, location, salary, description, requirements, company_name, company_id, image_url, status, created_at").eq("status", "active").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, full_name, neighborhood, job_status, education, is_employed, employed_through_platform, platform_job_details, employment_survey_completed, curriculo_pdf, created_at").eq("role", "citizen").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, full_name, display_name, role, phone, neighborhood, education, expertise, job_status, job_type, bio, curriculo_pdf, avatar_url, profile_photo, company_name, status, is_service_provider, service_categories, service_description, portfolio_photos, created_at").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, full_name, display_name, curriculo_pdf, is_service_provider, service_categories, job_status, created_at, updated_at, curriculos_gerados_count").eq("role", "citizen").gt("curriculos_gerados_count", 0).order("updated_at", { ascending: false }),
        supabase.from("candidaturas").select("id, vaga_id, cidadao_id, status, created_at").eq("status", "aprovada").order("created_at", { ascending: false }),
      ]);

      const vagList = (vagasResult.data as Vaga[]) ?? [];
      const cidList = (cidadaosResult.data as Cidadao[]) ?? [];
      const userList = (usuariosResult.data as UsuarioSistema[]) ?? [];
      const candList = (candidaturasResult.data as Candidatura[]) ?? [];

      // Buscar avatares das empresas
      const { data: empresas } = await supabase
        .from("profiles")
        .select("id, avatar_url, profile_photo")
        .eq("role", "empresa");
      const map: Record<string, string> = {};
      (empresas ?? []).forEach((e: any) => {
        map[e.id] = e.avatar_url || e.profile_photo || "";
      });
      setCompanyAvatars(map);

      // Carregar chats via edge function (bypassa RLS)
      let chatList: Chat[] = [];
      try {
        const chatRes = await fetch(`${supabaseUrl}/functions/v1/chat-listar`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({ status: "all", limit: 100 }),
        });
        const chatData = await chatRes.json();
        if (chatRes.ok && chatData.success) {
          chatList = (chatData.chats as Chat[]) ?? [];
        }
      } catch (_) { /* silent */ }

      const curriculoList = (curriculosResult.data as CidadaoComCurriculo[]) ?? [];
      setCidadaosComCurriculo(curriculoList);
      setCandidaturas(candList);

      setVagas(vagList);
      setCidadaos(cidList);
      setUsuarios(userList);
      setChats(chatList);

      // Calcula total REAL de currículos GERADOS PELO SISTEMA (soma dos contadores > 0)
      const totalCurriculosGerados = curriculoList.reduce((sum, c) => sum + (c.curriculos_gerados_count || 0), 0);

      // ITEM 04: Só atualiza stats de demandas se conseguiu carregar demandas (evita zerar indicadores)
      // Mas o comCurriculo e outros stats de cidadaos/vagas atualizam sempre
      if (demList.length > 0 || demands.length > 0) {
        const baseList = demList.length > 0 ? demList : demands;
        setStats({
          totalDemands: baseList.length,
          aberto: baseList.filter((d) => (d.status ?? "aberto") === "aberto").length,
          em_andamento: baseList.filter((d) => (d.status ?? "aberto") === "em_andamento").length,
          aguardando_externa: baseList.filter((d) => (d.status ?? "aberto") === "aguardando_externa").length,
          finalizada: baseList.filter((d) => (d.status ?? "aberto") === "finalizada").length,
          totalVagas: vagList.length,
          totalCidadaos: cidList.length,
          lookingWork: cidList.filter((c) => c.job_status !== "not_looking").length,
          employed: cidList.filter((c) => c.is_employed === true).length,
          employedThroughPlatform: cidList.filter((c) => c.employed_through_platform === true).length,
          comCurriculo: totalCurriculosGerados,
        });
      } else {
        // Se não conseguiu carregar demandas, atualiza apenas os stats de cidadãos/vagas/currículos
        setStats((prev) => ({
          ...prev,
          totalVagas: vagList.length,
          totalCidadaos: cidList.length,
          lookingWork: cidList.filter((c) => c.job_status !== "not_looking").length,
          employed: cidList.filter((c) => c.is_employed === true).length,
          employedThroughPlatform: cidList.filter((c) => c.employed_through_platform === true).length,
          comCurriculo: totalCurriculosGerados,
        }));
      }
    } catch (err) {
      console.error("[Vereador] loadData exceção:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) { navigate("/auth"); return; }
    if (stored.role !== "vereador") { navigate("/auth"); return; }
    setUser({ id: stored.id, email: stored.email, name: stored.display_name || stored.full_name });
    loadData();
  }, [navigate, loadData]);

  // Realtime: atualiza demandas automaticamente (com reconexão automática)
  useResilientRealtime("vereador-demands", "demands", loadDemandsOnly, !loading);

  // Realtime: atualiza vagas quando empresas publicam/editam/excluem (com reconexão automática)
  const refreshVagas = useCallback(async () => {
    try {
      const [vagasResult, empresasResult] = await Promise.all([
        supabase.from("vagas").select("id, title, area, type, location, salary, description, requirements, company_name, company_id, image_url, status, created_at").eq("status", "active").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, avatar_url, profile_photo").eq("role", "empresa"),
      ]);
      setVagas((vagasResult.data as Vaga[]) ?? []);
      const map: Record<string, string> = {};
      (empresasResult.data ?? []).forEach((e: any) => { map[e.id] = e.avatar_url || e.profile_photo || ""; });
      setCompanyAvatars(map);
      setStats(prev => ({ ...prev, totalVagas: (vagasResult.data ?? []).length }));
    } catch (e) { console.warn("[Vereador] Realtime vagas callback erro:", e); }
  }, []);

  useResilientRealtime("vereador-vagas", "vagas", refreshVagas, !loading);

  // Realtime: atualiza usuários quando profiles mudam (com reconexão automática)
  const refreshUsuarios = useCallback(async () => {
    try {
      const [userRes, curriculoRes, cidadaoRes, candidaturasRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, display_name, role, phone, neighborhood, education, expertise, job_status, job_type, bio, curriculo_pdf, avatar_url, profile_photo, company_name, status, is_service_provider, service_categories, service_description, portfolio_photos, created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("id, full_name, display_name, curriculo_pdf, is_service_provider, service_categories, job_status, created_at, updated_at, curriculos_gerados_count")
          .eq("role", "citizen")
          .gt("curriculos_gerados_count", 0)
          .order("updated_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("id, full_name, neighborhood, job_status, education, is_employed, employed_through_platform, platform_job_details, employment_survey_completed, curriculo_pdf, created_at")
          .eq("role", "citizen")
          .order("created_at", { ascending: false }),
        supabase
          .from("candidaturas")
          .select("id, vaga_id, cidadao_id, status, created_at")
          .eq("status", "aprovada")
          .order("created_at", { ascending: false }),
      ]);
      const uList = (userRes.data as UsuarioSistema[]) ?? [];
      const currList = (curriculoRes.data as CidadaoComCurriculo[]) ?? [];
      const cidList = (cidadaoRes.data as Cidadao[]) ?? [];
      const candList = (candidaturasRes.data as Candidatura[]) ?? [];
      setUsuarios(uList);
      setCidadaosComCurriculo(currList);
      setCidadaos(cidList);
      setCandidaturas(candList);
      const totalCurriculosRealtime = currList.reduce((sum, c) => sum + (c.curriculos_gerados_count || 0), 0);
      setStats((prev) => ({
        ...prev,
        comCurriculo: totalCurriculosRealtime,
        totalCidadaos: uList.filter((u) => u.role === "citizen").length,
        lookingWork: cidList.filter((c) => c.job_status !== "not_looking").length,
        employed: cidList.filter((c) => c.is_employed === true).length,
        employedThroughPlatform: cidList.filter((c) => c.employed_through_platform === true).length,
      }));
    } catch (e) { console.warn("[Vereador] Realtime usuarios callback erro:", e); }
  }, []);

  useResilientRealtime("vereador-usuarios", "profiles", refreshUsuarios, !loading);

  // ── REALTIME: Canal dedicado para candidaturas — notifica vereador quando cidadão se candidata ──
  // Quando uma nova candidatura é inserida, atualiza as vagas (para mostrar novo candidato no modal)
  useResilientRealtime("vereador-candidaturas", "candidaturas", refreshVagas, !loading);

  // ITEM 04 — Polling fallback de segurança (5s): camada extra anti-F5
  // Se o realtime falhar silenciosamente, o polling garante dados atualizados
  // Agora recarrega demands, currículos E cidadãos (employment stats)
  // BUGFIX: antes o polling ignorava os cidadãos, forçando F5 no relatório de empregabilidade
  useEffect(() => {
    if (loading || !user) return;
    const interval = setInterval(() => {
      try { loadDemandsOnly(); } catch (e) { console.error("[Vereador] Polling fallback erro:", e); }
      try { refreshCurriculosOnly(); } catch (e) { console.error("[Vereador] Polling curriculos erro:", e); }
      try { refreshCidadaosOnly(); } catch (e) { console.error("[Vereador] Polling cidadaos erro:", e); }
    }, 30000); // 30 segundos — realtime cuida dos updates em tempo real
    return () => clearInterval(interval);
  }, [loading, user, loadDemandsOnly, refreshCurriculosOnly]);

  // ── REALTIME: Canal dedicado para notificações de currículo criado ──
  // Escuta INSERT na tabela notificacoes com tipo curriculo_criado e dispara refresh imediato
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("vereador-curriculo-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notificacoes", filter: "tipo=eq.curriculo_criado" },
        () => {
          refreshCurriculosOnly();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") console.log("[Vereador] Canal curriculo criado: conectado");
        else if (status !== "SUBSCRIBED") console.warn("[Vereador] Canal curriculo criado:", status, "(polling 5s cobre)");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refreshCurriculosOnly]);

  // ── Recarrega mensagens do chat selecionado (usado pelo polling + realtime) ──
  // BUGFIX: definido ANTES dos useEffects que o consomem para evitar TDZ (Cannot access before initialization)
  const loadSelectedChatMessages = useCallback(async () => {
    const chat = selectedChatRef.current;
    if (!chat) return;
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/chat-mensagens`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ chatId: chat.id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const serverMsgs: ChatMsg[] = data.messages ?? [];
        setChatMsgs((prev) => {
          if (prev.length === serverMsgs.length) {
            const allSame = prev.every((m, i) => m.id === serverMsgs[i]?.id);
            if (allSame) return prev;
          }
          return serverMsgs;
        });
      }
    } catch (err) {
      console.error("[VereadorPage] loadSelectedChatMessages error:", err);
    }
  }, []);

  // Polling para contagem de chats abertos + notificações de novas mensagens (3s + realtime)
  useEffect(() => {
    if (!user) return;
    const userId = user.id;

    // Inicializa timestamp da última verificação
    lastMsgCheckRef.current = getLastCheckTime(`vereador_notif_${userId}`);

    const checkNotifications = async () => {
      const checkTime = lastMsgCheckRef.current;
      const nowIso = new Date().toISOString();

      try {
        // Contagem de chats em aberto via chat-listar (bypassa RLS para chats anonimos)
        // BUGFIX: vereador deve ver TODOS os status (open + in_progress + closed), não só open
        // A regra "não ver conversa assumida por outro assessor" é só para assessores, vereador vê TUDO
        const chatRes = await fetch(`${supabaseUrl}/functions/v1/chat-listar`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({ status: "all", limit: 100 }),
        });
        if (chatRes.ok) {
          const chatData = await chatRes.json();
          if (chatData.success) {
            const allChats: Chat[] = chatData.chats ?? [];
            setOpenChatCount(allChats.filter((c) => c.status === "open").length);
            setChats(allChats);
          }
        }

        // Verifica novas mensagens (de qualquer remetente — o vereador é espectador)
        const { data: newMsgs } = await supabase
          .from("mensagens_chat_items")
          .select("id, chat_id")
          .gt("created_at", checkTime)
          .order("created_at", { ascending: true });

        if (newMsgs && newMsgs.length > 0) {
          let hasNew = false;
          (newMsgs as { id: number; chat_id: number }[]).forEach((m) => {
            const lastRead = getLastRead(`vereador_${userId}`, m.chat_id);
            if (m.id > lastRead) {
              if (!conversasUnreadRef.current.has(m.chat_id)) {
                conversasUnreadRef.current.add(m.chat_id);
                hasNew = true;
              }
            }
          });
          if (hasNew) {
            setConversasUnreadCount(conversasUnreadRef.current.size);
            playNotificationSound();
          }
        }
      } catch (_) { /* silent */ }

      lastMsgCheckRef.current = nowIso;
      setLastCheckTime(`vereador_notif_${userId}`, nowIso);
    };

    checkNotifications();
    // Realtime + polling 30s como fallback de segurança
    const interval = setInterval(checkNotifications, 30000);

    // Realtime: escuta INSERT em mensagens_chat_items para atualizar imediatamente
    const channel = supabase
      .channel("vereador-chat-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "mensagens_chat_items" },
        () => {
          checkNotifications();
          // BUGFIX: também recarrega mensagens do chat selecionado se houver um aberto
          if (selectedChatRef.current) {
            loadSelectedChatMessages();
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") { /* conectado */ }
        else if (status === "CHANNEL_ERROR") console.warn("[Vereador] Realtime chat: erro de conexão (polling 1s cobre)");
        else if (status === "TIMED_OUT") console.warn("[Vereador] Realtime chat: timeout (polling 1s cobre)");
        else if (status === "CLOSED") console.warn("[Vereador] Realtime chat: fechado (polling 1s cobre)");
      });

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [user, loadSelectedChatMessages]);

  // Sync tab with URL params (supports notification redirects)
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab") as Tab | null;
    if (tabFromUrl && tabFromUrl !== tab) {
      setTab(tabFromUrl);
    }
  }, [searchParams]);

  // Quando o array de demandas atualiza (via real-time), atualiza também o modal de detalhe
  useEffect(() => {
    setSelectedDemand((prev) => {
      if (!prev) return null;
      const fresh = demands.find((d) => d.id === prev.id);
      if (!fresh) return null; // demanda deletada, fecha modal
      // Só atualiza se algo mudou
      if (
        fresh.status !== prev.status ||
        fresh.assessor_id !== prev.assessor_id ||
        fresh.assessor_name !== prev.assessor_name ||
        fresh.assessor_notes !== prev.assessor_notes ||
        fresh.admin_notes !== prev.admin_notes ||
        fresh.updated_at !== prev.updated_at
      ) {
        return fresh;
      }
      return prev;
    });
  }, [demands]);

  // Handlers robustos para abrir/fechar demanda (previne ghost click no mobile)
  const handleOpenDemand = useCallback((d: Demand) => {
    if (closingRef.current) return; // bloqueado — ghost click
    setSelectedDemand(d);
  }, []);

  const handleCloseDemand = useCallback(() => {
    closingRef.current = true;
    setSelectedDemand(null);
    // Reseta o ref para permitir que a mesma demanda seja reaberta por nova notificação
    demandaAutoOpenedRef.current = null;
    // Limpa ?selected= da URL para não reabrir no próximo update de demands
    if (searchParams.get("selected")) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("selected");
        return next;
      }, { replace: true });
    }
    // Libera o lock após 400ms (tempo suficiente para o ghost click passar)
    setTimeout(() => { closingRef.current = false; }, 400);
  }, [searchParams, setSearchParams]);

  // Handle ?selected= from notification redirects — abre a demanda específica
  // BUGFIX: usa ref para garantir que só abre UMA VEZ por URL, evitando loop com polling
  useEffect(() => {
    if (loading) return;
    const selId = searchParams.get("selected");
    if (selId && demands.length > 0 && demandaAutoOpenedRef.current !== selId) {
      const d = demands.find((d) => String(d.id) === selId);
      if (d) {
        demandaAutoOpenedRef.current = selId;
        setSelectedDemand(d);
      }
    }
  }, [loading, demands, searchParams]);

  // Photo upload ref para troca de foto de perfil via sidebar
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUpdating, setAvatarUpdating] = useState(false);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return;

    setAvatarUpdating(true);
    try {
      const edgeFnUrl = getEdgeFunctionUrl("upload-profile-photo");
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);
      formDataUpload.append("userId", user.id);

      const fnRes = await fetch(edgeFnUrl, {
        method: "POST",
        headers: { apikey: supabaseAnonKey },
        body: formDataUpload,
      });

      const result = await fnRes.json();
      if (result.success && result.url) {
        await supabase.from("profiles").update({
          avatar_url: result.url,
          profile_photo: result.url,
          updated_at: new Date().toISOString(),
        }).eq("id", user.id);

        const stored = getStoredUser();
        if (stored) {
          storeUser({ ...stored, avatar_url: result.url });
        }
        // Força reload da página para atualizar avatar na sidebar
        window.location.reload();
      }
    } catch (_) { /* silent */ }
    setAvatarUpdating(false);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (_) {
      // signOut failed — continue anyway, manual cleanup below
    }
    // 1. Remove stored user do sessionStorage
    clearStoredUser();
    // 2. Remove TODOS os tokens Supabase do localStorage (persistSession)
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("sb-") || key.includes("supabase")) {
        localStorage.removeItem(key);
      }
    });
    // 3. Remove sessionStorage residual do Supabase
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith("sb-") || key.includes("supabase")) {
        sessionStorage.removeItem(key);
      }
    });
    // 4. Navega pra home — sem sessão, sem chance de re-login automático
    navigate("/");
  };

  /** Limpa badge ao abrir a aba de conversas */
  const handleTabChange = (newTab: Tab) => {
    if (newTab === "conversas" && user) {
      conversasUnreadRef.current.clear();
      setConversasUnreadCount(0);
      const nowIso = new Date().toISOString();
      lastMsgCheckRef.current = nowIso;
      setLastCheckTime(`vereador_${user.id}`, nowIso);
    }
    setTab(newTab);
    setSearchParams({ tab: newTab });
    // Scrolla pro topo ao trocar de aba — no mobile o conteúdo começa lá embaixo
    // Usa requestAnimationFrame + setTimeout para garantir que o scroll aconteça APÓS
    // o React re-renderizar a nova aba e o DOM estar pronto
    if (typeof window !== "undefined") {
      requestAnimationFrame(() => {
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: "instant" });
          // Força scroll no elemento main também (garante que o conteúdo visível vá pro topo)
          const mainEl = document.querySelector("main");
          if (mainEl) mainEl.scrollTo({ top: 0, behavior: "instant" });
        }, 50);
      });
    }
  };

  const openChatViewer = async (chat: Chat) => {
    setSelectedChat(chat);
    selectedChatRef.current = chat;
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/chat-mensagens`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ chatId: chat.id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const msgList = (data.messages as ChatMsg[]) ?? [];
        setChatMsgs(msgList);
        if (user && msgList.length > 0) {
          const lastMsg = msgList[msgList.length - 1];
          setLastRead(`vereador_${user.id}`, chat.id, lastMsg.id);
          conversasUnreadRef.current.delete(chat.id);
          setConversasUnreadCount(conversasUnreadRef.current.size);
        }
      }
    } catch (err) {
      console.error("[VereadorPage] openChatViewer error:", err);
    }
  };

  // Sync: mantem selectedChatRef atualizado com o estado
  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  // ── REALTIME + POLLING: mensagens do chat selecionado (vereador é espectador) ──
  // BUGFIX: o vereador abria o chat e as mensagens NUNCA atualizavam sem F5
  // Agora tem realtime dedicado + polling 1s, mesmo padrão do assessor/cidadão/empresa
  useEffect(() => {
    if (!selectedChat) return;

    const chatId = selectedChat.id;

    // Polling 30s como fallback de segurança (Realtime já cobre os updates)
    const interval = setInterval(() => {
      loadSelectedChatMessages();
    }, 30000);

    // Realtime dedicado: escuta INSERT no chat específico
    const channel = supabase
      .channel(`vereador-chat-msgs-${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mensagens_chat_items",
          filter: `chat_id=eq.${chatId}`,
        },
        () => {
          loadSelectedChatMessages();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") console.log(`[Vereador] Realtime chat ${chatId}: conectado`);
        else if (status !== "SUBSCRIBED") console.warn(`[Vereador] Realtime chat ${chatId}:`, status, "(polling 1s cobre)");
      });

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [selectedChat, loadSelectedChatMessages]);

  // ── Cidadãos contratados com detalhes da vaga ──
  const contratados = useMemo(() => {
    const contratadosCidadaos = cidadaos.filter((c) => c.employed_through_platform === true);
    return contratadosCidadaos.map((cidadao) => {
      const candidatura = candidaturas.find((c) => c.cidadao_id === cidadao.id);
      const vaga = candidatura ? vagas.find((v) => v.id === candidatura.vaga_id) : null;
      return { cidadao, vaga: vaga ?? null };
    });
  }, [cidadaos, candidaturas, vagas]);

  // ── Usuários filtrados por busca ──
  const filteredUsuarios = useMemo(() => {
    if (!usuarioSearch.trim()) return usuarios;
    const q = usuarioSearch.toLowerCase();
    return usuarios.filter((u) =>
      (u.full_name ?? "").toLowerCase().includes(q) ||
      (u.display_name ?? "").toLowerCase().includes(q) ||
      (u.neighborhood ?? "").toLowerCase().includes(q) ||
      (u.role ?? "").toLowerCase().includes(q) ||
      (u.company_name ?? "").toLowerCase().includes(q) ||
      (u.expertise ?? "").toLowerCase().includes(q)
    );
  }, [usuarios, usuarioSearch]);
  // ── Abrir perfil do cidadão/empresa a partir do chat ──
  const handleChatAvatarClick = useCallback((chat: Chat) => {
    if (!chat.citizen_id) return;
    const u = usuarios.find((usr) => usr.id === chat.citizen_id);
    if (u) setSelectedUsuario(u);
  }, [usuarios]);
  const handleSelectUsuario = useCallback((cidadaoId: string) => {
    const u = usuarios.find((usr) => usr.id === cidadaoId);
    if (u) {
      setSelectedUsuario(u);
    }
  }, [usuarios]);

  const navItems: { key: Tab; icon: string; label: string; badge?: number }[] = [
    { key: "overview", icon: "ri-dashboard-line", label: "Visão Geral" },
    { key: "demands", icon: "ri-file-list-line", label: "Demandas" },
    { key: "eficiencia", icon: "ri-bar-chart-line", label: "Eficiência" },
    { key: "metricas", icon: "ri-pie-chart-line", label: "Métricas" },
    { key: "vagas", icon: "ri-briefcase-4-line", label: "Vagas de Emprego" },
    { key: "usuarios", icon: "ri-group-line", label: "Usuários" },
    { key: "conversas", icon: "ri-chat-3-line", label: "Conversas", badge: conversasUnreadCount > 0 ? conversasUnreadCount : openChatCount },
    { key: "agenda", icon: "ri-calendar-line", label: "Agenda" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0D1629" }}>
        <div
          className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "rgba(232,160,32,0.3)", borderTopColor: "#E8A020" }}
        ></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: "#0D1629" }}>
      <div id="vereador-sidebar-wrapper" className="min-w-0 shrink-0">
        <PainelSidebar
        role="vereador"
        roleLabel="Vereador · PP"
        userName={user?.name ?? ""}
        avatarUrl={getStoredUser()?.avatar_url || null}
        navItems={navItems}
        activeTab={tab}
        onTabChange={handleTabChange}
        stats={[
          { label: "Em Aberto", value: stats.aberto, icon: "ri-inbox-line", color: "#D97706" },
          { label: "Em Andamento", value: stats.em_andamento, icon: "ri-loader-4-line", color: "#3BBFD4" },
          { label: "Finalizadas", value: stats.finalizada, icon: "ri-checkbox-circle-line", color: "#22C55E" },
          { label: "Vagas ativas", value: stats.totalVagas, icon: "ri-briefcase-4-line", color: "#3BBFD4" },
        ]}
        onLogout={handleLogout}
        width="w-60"
      />

      </div>

      {/* Main */}
      <main className="md:ml-60 flex-1 min-w-0 w-0 p-4 md:p-6 min-h-screen pt-20 md:pt-6 pb-24 md:pb-6 overflow-x-hidden" style={{ background: "#0D1629" }}>
        {/* Header com sino */}
        <div className="flex items-center justify-end mb-4 md:hidden">
          <div className="flex items-center gap-2">
            <WeatherWidget compact />
            <div data-tour="vereador-notificacoes">
            <NotificationBell userId={user?.id ?? null} userRole="vereador" onNavigate={(path) => {
                const url = new URL(path, window.location.origin);
                const newTab = url.searchParams.get("tab") as Tab | null;
                const selected = url.searchParams.get("selected");
                if (newTab) {
                  handleTabChange(newTab);
                  if (selected) {
                    setTimeout(() => setSearchParams({ tab: newTab, selected }), 100);
                  } else {
                    setSearchParams({ tab: newTab });
                  }
                } else {
                  navigate(path);
                }
              }} />
            </div>
          </div>
        </div>
        <div className="hidden md:flex items-center justify-end mb-4">
          <div className="flex items-center gap-2">
            <WeatherWidget compact />
            <div data-tour="vereador-notificacoes">
            <NotificationBell userId={user?.id ?? null} userRole="vereador" onNavigate={(path) => {
                const url = new URL(path, window.location.origin);
                const newTab = url.searchParams.get("tab") as Tab | null;
                const selected = url.searchParams.get("selected");
                if (newTab) {
                  handleTabChange(newTab);
                  if (selected) {
                    setTimeout(() => setSearchParams({ tab: newTab, selected }), 100);
                  } else {
                    setSearchParams({ tab: newTab });
                  }
                } else {
                  navigate(path);
                }
              }} />
            </div>
          </div>
        </div>

        {/* OVERVIEW */}
        {tab === "overview" && (
          <div>
            <div className="mb-5 md:mb-6 w-full">
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#E8A020" }}>
                Painel do Mandato
              </p>
              <h1 className="text-xl md:text-2xl font-extrabold text-white break-words">
                Olá, {user?.name?.split(" ")[0]}!
              </h1>
              <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.40)" }}>
                Mandato 2024–2028 · Câmara Municipal de Pelotas
              </p>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-5 md:mb-6" data-tour="vereador-stats">
              {[
                { label: "Em Aberto", value: stats.aberto, icon: "ri-inbox-line", color: "#D97706", bg: "rgba(217,119,6,0.12)", border: "rgba(217,119,6,0.20)" },
                { label: "Em Andamento", value: stats.em_andamento, icon: "ri-loader-4-line", color: "#3BBFD4", bg: "rgba(59,191,212,0.12)", border: "rgba(59,191,212,0.20)" },
                { label: "Finalizadas", value: stats.finalizada, icon: "ri-checkbox-circle-line", color: "#22C55E", bg: "rgba(22,163,74,0.12)", border: "rgba(22,163,74,0.20)" },
                { label: "Vagas Ativas", value: stats.totalVagas, icon: "ri-briefcase-4-line", color: "#3BBFD4", bg: "rgba(59,191,212,0.12)", border: "rgba(59,191,212,0.20)" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl p-3 md:p-5"
                  style={{ background: s.bg, border: `1px solid ${s.border}` }}
                >
                  <div
                    className="w-7 h-7 md:w-8 md:h-8 rounded-xl flex items-center justify-center mb-2 md:mb-3"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                  >
                    <i className={`${s.icon} text-sm md:text-base`} style={{ color: s.color }}></i>
                  </div>
                  <p className="text-xl md:text-2xl font-extrabold text-white">{s.value}</p>
                  <p className="text-[11px] md:text-xs mt-0.5 leading-tight whitespace-nowrap" style={{ color: "rgba(255,255,255,0.45)" }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Seção dedicada: Currículos Gerados pelo Sistema */}
            <div
              className="rounded-2xl p-4 md:p-5 mb-5 md:mb-6"
              style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.20)" }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-bold text-sm flex items-center gap-2">
                  <i className="ri-profile-line" style={{ color: "#22C55E" }}></i>
                  Currículos Gerados pelo Sistema
                  <span
                    className="ml-1 px-2 py-0.5 rounded-full text-xs font-extrabold"
                    style={{ background: "rgba(34,197,94,0.20)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.35)" }}
                  >
                    {stats.comCurriculo}
                  </span>
                </h2>
                <span className="flex items-center gap-1.5 text-xs" style={{ color: "rgba(34,197,94,0.70)" }}>
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#22C55E" }}></span>
                  Atualizado em tempo real
                </span>
              </div>

              {cidadaosComCurriculo.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(34,197,94,0.20)" }}>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: "rgba(34,197,94,0.10)" }}>
                    <i className="ri-profile-line text-xl" style={{ color: "rgba(34,197,94,0.50)" }}></i>
                  </div>
                  <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.35)" }}>Nenhum currículo cadastrado ainda</p>
                  <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.20)" }}>Quando cidadãos gerarem currículos, aparecerão aqui automaticamente</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {cidadaosComCurriculo.map((c) => (
                    <div
                      key={c.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                    >
                      {/* Avatar + Info */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm"
                          style={{ background: "rgba(34,197,94,0.15)", color: "#22C55E" }}
                        >
                          {(c.display_name || c.full_name || "?")[0].toUpperCase()}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold text-sm truncate">
                            {c.display_name || c.full_name || "Cidadão"}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {c.is_service_provider ? (
                              <span className="text-xs" style={{ color: "#E8A020" }}>
                                <i className="ri-tools-line mr-0.5"></i>
                                Prestador{c.service_categories ? ` · ${c.service_categories.split(",")[0].trim()}` : ""}
                              </span>
                            ) : (
                              <span className="text-xs" style={{ color: "#3BBFD4" }}>
                                <i className="ri-briefcase-4-line mr-0.5"></i>
                                Emprego CLT
                              </span>
                            )}
                            <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
                              {new Date(c.updated_at || c.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Botões */}
                      <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                        {c.curriculo_pdf && (
                          <a
                            href={c.curriculo_pdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all whitespace-nowrap"
                            style={{ background: "rgba(34,197,94,0.15)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.30)" }}
                          >
                            <i className="ri-file-pdf-line"></i>
                            Ver PDF
                          </a>
                        )}
                        <span
                          className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap"
                          style={{ background: "rgba(34,197,94,0.12)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.25)" }}
                        >
                          <i className="ri-checkbox-circle-fill text-xs"></i>
                          <span className="hidden sm:inline">Cadastrado</span>
                          <span className="sm:hidden">OK</span>
                          {(c.curriculos_gerados_count || 0) > 1 && (
                            <span className="ml-1 font-extrabold" style={{ color: "#E8A020" }}>
                              +{c.curriculos_gerados_count}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Relatório de emprego */}
            <div
              className="rounded-2xl p-4 md:p-5 mb-5 md:mb-6"
              data-tour="vereador-empregabilidade"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <h2 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                <i className="ri-bar-chart-line" style={{ color: "#3BBFD4" }}></i>
                Relatório de Empregabilidade — Pelotas
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Cidadãos cadastrados", value: stats.totalCidadaos, color: "rgba(255,255,255,0.9)", subColor: "rgba(255,255,255,0.40)", bg: "rgba(255,255,255,0.06)" },
                  { label: "Procurando emprego", value: stats.lookingWork, color: "#E8A020", subColor: "#E8A020", bg: "rgba(232,160,32,0.10)" },
                  { label: "Empregados", value: stats.employed, color: "#22C55E", subColor: "#22C55E", bg: "rgba(34,197,94,0.10)" },
                  { label: "Com Currículo", value: stats.comCurriculo, color: "#3BBFD4", subColor: "#3BBFD4", bg: "rgba(59,191,212,0.10)" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="text-center p-3 md:p-4 rounded-xl"
                    style={{ background: item.bg }}
                  >
                    <p className="text-2xl md:text-3xl font-extrabold" style={{ color: item.color }}>{item.value}</p>
                    <p className="text-[11px] md:text-xs mt-1 font-semibold leading-tight whitespace-nowrap" style={{ color: item.subColor }}>{item.label}</p>
                  </div>
                ))}
              </div>
              {stats.totalCidadaos > 0 && (() => {
                // Taxa de empregabilidade: cidadaos procurando + empregados pela plataforma vs total com curriculo
                const cidadaosComCurriculo = cidadaos.filter((c) => c.curriculo_pdf && c.curriculo_pdf.length > 5).length;
                // Denominador: cidadaos ativos na plataforma (procurando + ja empregados via plataforma)
                const totalAtivos = stats.lookingWork + stats.employedThroughPlatform;
                const denominador = totalAtivos > 0 ? totalAtivos : (cidadaosComCurriculo > 0 ? cidadaosComCurriculo : stats.totalCidadaos);
                // Taxa = quantos foram empregados pela plataforma / total de ativos
                const taxaPlataforma = denominador > 0 ? Math.round((stats.employedThroughPlatform / denominador) * 100) : 0;
                return (
                <div className="mt-4 space-y-3">
                  {/* Taxa da plataforma */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5" style={{ color: "rgba(255,255,255,0.40)" }}>
                      <span className="flex items-center gap-1.5">
                        <i className="ri-building-line" style={{ color: "#22C55E" }}></i>
                        Empregados pela plataforma
                      </span>
                      <span className="font-extrabold" style={{ color: "#22C55E" }}>{taxaPlataforma}%</span>
                    </div>
                    <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(taxaPlataforma, 100)}%`,
                          background: "linear-gradient(to right, #22C55E, #16A34A)",
                        }}
                      ></div>
                    </div>
                    <p className="text-white/20 text-xs mt-1">
                      {stats.employedThroughPlatform} contratado{stats.employedThroughPlatform !== 1 ? 's' : ''} · {totalAtivos} ativo{totalAtivos !== 1 ? 's' : ''} na plataforma
                    </p>
                  </div>
                </div>
                );
              })()}
            </div>

            <div className="grid lg:grid-cols-2 gap-4 md:gap-5">
              {/* Demandas recentes */}
              <div
                className="rounded-2xl overflow-hidden"
                data-tour="vereador-demandas-recentes"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <div
                  className="p-4 border-b"
                  style={{ borderColor: "rgba(255,255,255,0.07)" }}
                >
                  <h2 className="font-bold text-sm text-white">Demandas Recentes</h2>
                </div>
                <div>
                  {demands.slice(0, 6).map((d) => {
                    const sc = statusConfig[d.status] ?? statusConfig.aberto;
                    return (
                      <button
                        key={d.id}
                        onClick={() => handleOpenDemand(d)}
                        className="w-full text-left flex items-center gap-3 px-4 py-3 border-b hover:bg-white/5 transition-colors cursor-pointer"
                        style={{ borderColor: "rgba(255,255,255,0.05)" }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-bold px-1.5 py-0.5 rounded-md font-mono" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)" }}>#{d.id}</span>
                            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#E8A020" }}>{typeLabel[d.type] ?? d.type}</span>
                          </div>
                          <p className="text-white font-semibold text-sm truncate">{d.title}</p>
                          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                            {d.citizen_name ?? "Cidadão"} · {new Date(d.created_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                            {d.assessor_name && <> · <span style={{ color: "#3BBFD4" }}>{d.assessor_name}</span></>}
                          </p>
                        </div>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${sc.color}`}
                          style={{ background: sc.bg, border: `1px solid ${sc.border}` }}
                        >
                          {sc.label}
                        </span>
                      </button>
                    );
                  })}
                  {filteredDemands.length === 0 && (
                    <div className="py-8 text-center text-sm" style={{ color: "rgba(255,255,255,0.30)" }}>
                      Nenhuma demanda
                    </div>
                  )}
                </div>
              </div>

              {/* Vagas abertas */}
              <div
                className="rounded-2xl overflow-hidden"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <div
                  className="p-4 border-b"
                  style={{ borderColor: "rgba(255,255,255,0.07)" }}
                >
                  <h2 className="font-bold text-sm text-white">Vagas Abertas</h2>
                </div>
                <div>
                  {vagas.slice(0, 6).map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center gap-3 px-4 py-3 border-b"
                      style={{ borderColor: "rgba(255,255,255,0.05)" }}
                    >
                      {v.image_url ? (
                        <img src={v.image_url} alt={v.title} className="w-12 h-12 rounded-xl object-cover object-top shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #1B2A5E, #3BBFD4)" }}>
                          <i className="ri-briefcase-4-line text-white/40"></i>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm truncate">{v.title}</p>
                        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                          {v.company_name ?? "Empresa"} · {v.area ?? v.type}
                        </p>
                      </div>
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                        style={{ color: "#22C55E", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)" }}
                      >
                        Ativa
                      </span>
                    </div>
                  ))}
                  {vagas.length === 0 && (
                    <div className="py-8 text-center text-sm" style={{ color: "rgba(255,255,255,0.30)" }}>
                      Nenhuma vaga ativa
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DEMANDS */}
        {tab === "demands" && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl md:text-2xl font-extrabold text-white">Todas as Demandas</h1>
                <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.40)" }}>
                  {filteredDemands.length} de {demands.length} demandas — clique para ver detalhes
                </p>
              </div>
              {/* Toggle Lista / Kanban */}
              <div className="flex rounded-xl p-1 shrink-0 self-start sm:self-auto" style={{ background: "rgba(255,255,255,0.06)" }}>
                <button
                  onClick={() => setDemandsView("lista")}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    demandsView === "lista" ? "text-white" : "text-white/40"
                  }`}
                  style={demandsView === "lista" ? { background: "rgba(59,191,212,0.15)" } : {}}
                >
                  <i className="ri-list-check mr-1"></i>Lista
                </button>
                <button
                  onClick={() => setDemandsView("kanban")}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    demandsView === "kanban" ? "text-white" : "text-white/40"
                  }`}
                  style={demandsView === "kanban" ? { background: "rgba(59,191,212,0.15)" } : {}}
                >
                  <i className="ri-layout-column-line mr-1"></i>Kanban
                </button>
              </div>
            </div>

            {demandsView === "lista" ? (
              <>
                {/* V1+V2: Busca, filtro e ordenação */}
                <div className="flex flex-col gap-2 mb-4">
                  {/* Busca */}
                  <div className="relative">
                    <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-white/25 text-sm"></i>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar por título, cidadão ou #ID..."
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}
                    />
                  </div>
                  {/* Filtros lado a lado */}
                  <div className="flex gap-2">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="flex-1 min-w-0 px-3 py-2.5 rounded-xl text-xs text-white cursor-pointer"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}
                    >
                      <option value="todos" style={{ color: "#000" }}>Todos os status</option>
                      <option value="aberto" style={{ color: "#000" }}>Em Aberto</option>
                      <option value="em_andamento" style={{ color: "#000" }}>Em Andamento</option>
                      <option value="aguardando_externa" style={{ color: "#000" }}>Ag. Externa</option>
                      <option value="finalizada" style={{ color: "#000" }}>Finalizada</option>
                    </select>
                    <select
                      value={vereadorSortBy}
                      onChange={(e) => setVereadorSortBy(e.target.value)}
                      className="flex-1 min-w-0 px-3 py-2.5 rounded-xl text-xs text-white cursor-pointer"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}
                    >
                      <option value="recentes" style={{ color: "#000" }}>Recentes</option>
                      <option value="antigos" style={{ color: "#000" }}>Antigos</option>
                      <option value="prioridade" style={{ color: "#000" }}>Prioridade</option>
                    </select>
                  </div>
                </div>

                {/* Status summary pills */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {[
                    { key: "aberto", label: "Em Aberto", count: stats.aberto, color: "#D97706", bg: "rgba(217,119,6,0.12)" },
                    { key: "em_andamento", label: "Em Andamento", count: stats.em_andamento, color: "#3BBFD4", bg: "rgba(59,191,212,0.12)" },
                    { key: "aguardando_externa", label: "Ag. Externa", count: stats.aguardando_externa, color: "#7C3AED", bg: "rgba(124,58,237,0.12)" },
                    { key: "finalizada", label: "Finalizadas", count: stats.finalizada, color: "#22C55E", bg: "rgba(22,163,74,0.12)" },
                  ].map((p) => (
                    <span
                      key={p.key}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold"
                      style={{ color: p.color, background: p.bg, border: `1px solid ${p.color}30` }}
                    >
                      {p.label}: {p.count}
                    </span>
                  ))}
                </div>

                <div
                  className="rounded-2xl overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  {filteredDemands.map((d) => {
                    const sc = statusConfig[d.status] ?? statusConfig.aberto;
                    return (
                      <button
                        key={d.id}
                        onClick={() => handleOpenDemand(d)}
                        className="w-full text-left flex items-center gap-4 px-4 md:px-5 py-4 border-b hover:bg-white/5 transition-colors cursor-pointer"
                        style={{ borderColor: "rgba(255,255,255,0.05)" }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className="text-xs font-bold px-1.5 py-0.5 rounded-md font-mono" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)" }}>#{d.id}</span>
                            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#E8A020" }}>
                              {typeLabel[d.type] ?? d.type}
                            </span>
                            {d.category && (
                              <span className="text-xs" style={{ color: "rgba(255,255,255,0.30)" }}>· {d.category}</span>
                            )}
                          </div>
                          <p className="text-white font-semibold text-sm truncate">{d.title}</p>
                          <div className="flex flex-wrap items-center gap-3 mt-0.5">
                            <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                              {d.citizen_name ?? "Cidadão"}
                            </span>
                            {d.assessor_name && (
                              <span className="text-xs flex items-center gap-1" style={{ color: "#3BBFD4" }}>
                                <i className="ri-shield-user-line text-xs"></i>
                                {d.assessor_name}
                              </span>
                            )}
                            <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
                              {new Date(d.created_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap ${sc.color}`}
                          style={{ background: sc.bg, border: `1px solid ${sc.border}` }}
                        >
                          {sc.label}
                        </span>
                      </button>
                    );
                  })}
                  {filteredDemands.length === 0 && (
                    <div className="py-12 text-center text-sm" style={{ color: "rgba(255,255,255,0.30)" }}>
                      Nenhuma demanda
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* ITEM 02: Kanban somente-leitura para o vereador */
              <VereadorKanban
                demands={filteredDemands}
                selected={selectedDemand}
                onSelect={(d) => {
                  if (closingRef.current) return;
                  setSelectedDemand((prev) => prev?.id === d.id ? null : d);
                }}
              />
            )}
          </div>
        )}

        {/* VAGAS */}
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
                    ? `${vagas.length} vagas ativas em Pelotas — clique em Saiba Mais para ver detalhes completos`
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
                  <div className="rounded-2xl py-16 text-center" style={{ border: "1px dashed rgba(255,255,255,0.12)" }}>
                    <i className="ri-briefcase-4-line text-4xl mb-3 block" style={{ color: "rgba(255,255,255,0.15)" }}></i>
                    <p className="font-semibold" style={{ color: "rgba(255,255,255,0.35)" }}>Nenhuma vaga ativa no momento</p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {vagas.map((v) => (
                      <VagaCardPublica
                        key={v.id}
                        vaga={{
                          ...v,
                          company_avatar: v.company_id ? (companyAvatars[v.company_id] || null) : null,
                        } as VagaPublica}
                        onSaibaMais={(vaga) => setSelectedVaga(vaga)}
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

        {/* USUÁRIOS */}
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
                value={usuarioSearch}
                onChange={(e) => setUsuarioSearch(e.target.value)}
                placeholder="Buscar por nome, bairro, role ou empresa..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}
              />
              {usuarioSearch && (
                <button
                  onClick={() => setUsuarioSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 cursor-pointer transition-colors"
                  style={{ color: "rgba(255,255,255,0.40)" }}
                >
                  <i className="ri-close-line text-xs"></i>
                </button>
              )}
            </div>

            {usuarios.length === 0 ? (
              <div className="py-12 text-center text-sm" style={{ color: "rgba(255,255,255,0.30)" }}>
                Nenhum usuário cadastrado
              </div>
            ) : filteredUsuarios.length === 0 ? (
              <div className="py-12 text-center text-sm" style={{ color: "rgba(255,255,255,0.30)" }}>
                Nenhum usuário encontrado para "{usuarioSearch}"
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredUsuarios.map((u) => {
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

        {/* CONVERSAS */}
        {tab === "conversas" && (
          <div className="w-full min-w-0 overflow-x-hidden">
            <div className="mb-5">
              <h1 className="text-xl md:text-2xl font-extrabold text-white">Conversas dos Cidadãos</h1>
              <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.40)" }}>
                Acompanhe as conversas entre cidadãos e assessores (apenas leitura)
              </p>
            </div>

            {/* Chat list container: responsive height for mobile */}
            <div className="grid lg:grid-cols-5 gap-5 w-full min-w-0">
              {/* Lista de conversas */}
              <div className="lg:col-span-2 w-full min-w-0">
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <div className="p-4 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                    <h2 className="font-bold text-sm text-white">
                      {chats.length} conversa{chats.length !== 1 ? "s" : ""}
                    </h2>
                  </div>
                  <div className="divide-y overflow-y-auto max-h-[calc(100vh-220px)] lg:max-h-[540px]" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                    {chats.length === 0 ? (
                      <div className="py-12 text-center">
                        <i className="ri-chat-3-line text-3xl mb-3 block" style={{ color: "rgba(255,255,255,0.15)" }}></i>
                        <p className="text-sm" style={{ color: "rgba(255,255,255,0.30)" }}>Nenhuma conversa ativa</p>
                      </div>
                    ) : (
                      <>
                        {/* Chats aguardando assessor (open) */}
                        {chats.filter((c) => c.status === "open").length > 0 && (
                          <div className="px-4 py-2" style={{ background: "rgba(217,119,6,0.08)" }}>
                            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "rgba(217,119,6,0.80)" }}>
                              Aguardando assessor ({chats.filter((c) => c.status === "open").length})
                            </p>
                          </div>
                        )}
                        {chats.filter((c) => c.status === "open").map((chat) => (
                          <button
                            key={chat.id}
                            onClick={() => openChatViewer(chat)}
                            className={`w-full min-w-0 block text-left p-4 hover:bg-white/5 transition-colors cursor-pointer ${selectedChat?.id === chat.id ? "bg-white/10" : ""}`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1 w-full min-w-0">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(217,119,6,0.15)" }}>
                                  <i className="ri-user-line text-xs" style={{ color: "#D97706" }}></i>
                                </div>
                                <p className="text-white font-semibold text-sm truncate min-w-0 flex-1">{chat.citizen_name ?? "Cidadão"}</p>
                              </div>
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0" style={{ color: "#D97706", background: "rgba(217,119,6,0.12)", border: "1px solid rgba(217,119,6,0.25)" }}>
                                Aguardando
                              </span>
                            </div>
                          </button>
                        ))}

                        {/* Chats em atendimento */}
                        {chats.filter((c) => c.status === "in_progress").length > 0 && (
                          <div className="px-4 py-2" style={{ background: "rgba(255,255,255,0.03)" }}>
                            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>
                              Em andamento ({chats.filter((c) => c.status === "in_progress").length})
                            </p>
                          </div>
                        )}
                        {chats.filter((c) => c.status === "in_progress").map((chat) => (
                          <button
                            key={chat.id}
                            onClick={() => openChatViewer(chat)}
                            className={`w-full min-w-0 block text-left p-4 hover:bg-white/5 transition-colors cursor-pointer ${selectedChat?.id === chat.id ? "bg-white/10" : ""}`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1 w-full min-w-0">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(59,191,212,0.15)" }}>
                                  <i className="ri-user-line text-xs" style={{ color: "#3BBFD4" }}></i>
                                </div>
                                <p className="text-white font-semibold text-sm truncate min-w-0 flex-1">{chat.citizen_name ?? "Cidadão"}</p>
                              </div>
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0" style={{ color: "#22C55E", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)" }}>
                                Em andamento
                              </span>
                            </div>
                            {chat.assessor_name && (
                              <p className="text-xs ml-10 truncate" style={{ color: "rgba(255,255,255,0.35)" }}>
                                <i className="ri-shield-user-line mr-1"></i>{chat.assessor_name}
                              </p>
                            )}
                          </button>
                        ))}

                        {/* Chats encerrados */}
                        {chats.filter((c) => c.status === "closed").length > 0 && (
                          <div className="px-4 py-2" style={{ background: "rgba(255,255,255,0.03)" }}>
                            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>
                              Encerradas ({chats.filter((c) => c.status === "closed").length})
                            </p>
                          </div>
                        )}
                        {chats.filter((c) => c.status === "closed").map((chat) => (
                          <button
                            key={chat.id}
                            onClick={() => openChatViewer(chat)}
                            className={`w-full min-w-0 block text-left p-4 hover:bg-white/5 transition-colors cursor-pointer opacity-60 ${selectedChat?.id === chat.id ? "bg-white/10 opacity-100" : ""}`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1 w-full min-w-0">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.08)" }}>
                                  <i className="ri-user-line text-xs" style={{ color: "rgba(255,255,255,0.40)" }}></i>
                                </div>
                                <p className="font-medium text-sm truncate min-w-0 flex-1" style={{ color: "rgba(255,255,255,0.60)" }}>{chat.citizen_name ?? "Cidadão"}</p>
                              </div>
                              <span className="text-xs whitespace-nowrap shrink-0" style={{ color: "rgba(255,255,255,0.30)" }}>Encerrada</span>
                            </div>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Visualizador de mensagens (read-only) — responsive height */}
              <div className="lg:col-span-3 w-full min-w-0">
                {selectedChat ? (
                  <div
                    className="rounded-2xl overflow-hidden flex flex-col w-full min-w-0 h-[calc(100vh-160px)] lg:h-[540px]"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <div className="p-4 border-b flex items-center justify-between gap-2" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {(() => {
                          const chatUser = usuarios.find((u) => u.id === selectedChat.citizen_id);
                          const chatAvatar = chatUser?.avatar_url || chatUser?.profile_photo || null;
                          return chatAvatar ? (
                            <button
                              onClick={() => handleChatAvatarClick(selectedChat)}
                              className="w-9 h-9 rounded-full overflow-hidden border-2 shrink-0 cursor-pointer hover:scale-110 transition-transform"
                              style={{ borderColor: "rgba(59,191,212,0.40)" }}
                              title="Ver perfil completo"
                            >
                              <img src={chatAvatar} alt={selectedChat.citizen_name ?? ""} className="w-full h-full object-cover object-top" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleChatAvatarClick(selectedChat)}
                              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 cursor-pointer hover:scale-110 transition-transform"
                              style={{ background: "rgba(59,191,212,0.15)" }}
                              title="Ver perfil completo"
                            >
                              <i className="ri-user-line" style={{ color: "#3BBFD4" }}></i>
                            </button>
                          );
                        })()}
                        <div className="min-w-0 overflow-hidden">
                          <p className="font-bold text-sm text-white truncate min-w-0">{selectedChat.citizen_name ?? "Cidadão"}</p>
                          <p className="text-xs truncate min-w-0" style={{ color: "rgba(255,255,255,0.35)" }}>
                            {selectedChat.assessor_name ? <>Assessor: {selectedChat.assessor_name}</> : "Sem assessor"}
                            {selectedChat.status === "closed" && <span className="ml-2 text-red-400">· Encerrada</span>}
                          </p>
                        </div>
                      </div>
                      <button onClick={() => { setSelectedChat(null); setChatMsgs([]); }}
                        className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 cursor-pointer transition-colors shrink-0">
                        <i className="ri-close-line text-lg"></i>
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: "#0D1629" }}>
                      {chatMsgs.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-sm" style={{ color: "rgba(255,255,255,0.25)" }}>Nenhuma mensagem</p>
                        </div>
                      ) : (
                        <>
                        {chatMsgs.map((msg) => (
                          <div key={msg.id} className={`flex ${msg.sender_role === "assessor" ? "justify-end" : "justify-start"}`}>
                            <div
                              className="max-w-[85%] sm:max-w-[75%] px-4 py-2.5 rounded-2xl text-sm"
                              style={msg.sender_role === "assessor"
                                ? { background: "rgba(3,105,161,0.30)", color: "white", borderBottomRightRadius: "4px" }
                                : { background: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.90)", borderBottomLeftRadius: "4px" }}
                            >
                              <p className="text-xs font-semibold mb-1 opacity-60">
                                {msg.sender_name}
                                <span className="ml-2 font-normal opacity-50">{msg.sender_role === "assessor" ? "Assessor" : "Cidadão"}</span>
                              </p>
                              {msg.message && <p className="leading-relaxed break-words">{msg.message}</p>}
                              {msg.image_url && (
                                <img src={msg.image_url} alt="Imagem enviada" className="mt-2 rounded-lg max-w-full max-h-48 object-contain" />
                              )}
                              {msg.image_data && (
                                <img src={msg.image_data} alt="Imagem enviada" className="mt-2 rounded-lg max-w-full max-h-48 object-contain" />
                              )}
                              <p className="text-xs mt-1 opacity-50">
                                {new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}
                              </p>
                            </div>
                          </div>
                        ))}
                        {/* Typing indicator — vereador vê quando alguém está digitando */}
                        {typingUsers.filter(u => u.name !== (user?.name ?? "Vereador")).length > 0 && (
                          <div className="flex items-center gap-2 px-1 pb-1">
                            <div className="flex gap-1">
                              <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#3BBFD4", animationDelay: "0ms" }}></span>
                              <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#3BBFD4", animationDelay: "150ms" }}></span>
                              <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#3BBFD4", animationDelay: "300ms" }}></span>
                            </div>
                            <span className="text-xs" style={{ color: "rgba(59,191,212,0.70)" }}>
                              {typingUsers.filter(u => u.name !== (user?.name ?? "Vereador")).map(u => u.name).join(", ")} digitando...
                            </span>
                          </div>
                        )}
                        </>
                      )}
                    </div>
                    <div className="p-4 border-t text-center" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                      <p className="text-xs flex items-center justify-center gap-1.5 flex-wrap" style={{ color: "rgba(255,255,255,0.30)" }}>
                        <i className="ri-eye-line"></i>
                        <span>Modo leitura — você não pode enviar mensagens</span>
                      </p>
                    </div>
                  </div>
                ) : (
                  <div
                    className="rounded-2xl flex items-center justify-center w-full min-w-0 h-[calc(100vh-160px)] lg:h-[540px]"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.10)" }}
                  ></div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* AGENDA */}
        {tab === "agenda" && (
          <AgendaPage userId={user?.id ?? ""} userName={user?.name ?? ""} userRole="vereador" />
        )}

        {/* EFICIÊNCIA DOS ASSESSORES */}
        {tab === "eficiencia" && (
          <VereadorEficienciaAssessores
            demands={demands}
            onExportPDF={async () => {
              const assessorMap = new Map<string, { assessorId: string; assessorName: string; totalAssigned: number; emAndamento: number; aguardandoExterna: number; finalizadas: number; avgResponseTimeMinutes: number }>();
              demands.forEach((d) => {
                if (!d.assessor_id || !d.assessor_name) return;
                const existing = assessorMap.get(d.assessor_id);
                if (existing) {
                  existing.totalAssigned++;
                  if (d.status === "em_andamento") existing.emAndamento++;
                  if (d.status === "aguardando_externa") existing.aguardandoExterna++;
                  if (d.status === "finalizada") existing.finalizadas++;
                } else {
                  assessorMap.set(d.assessor_id, {
                    assessorId: d.assessor_id,
                    assessorName: d.assessor_name,
                    totalAssigned: 1,
                    emAndamento: d.status === "em_andamento" ? 1 : 0,
                    aguardandoExterna: d.status === "aguardando_externa" ? 1 : 0,
                    finalizadas: d.status === "finalizada" ? 1 : 0,
                    avgResponseTimeMinutes: 0,
                  });
                }
              });
              assessorMap.forEach((stat, id) => {
                const assessorDemands = demands.filter((d) => d.assessor_id === id && d.status !== "aberto");
                if (assessorDemands.length > 0) {
                  const total = assessorDemands.reduce((acc, d) => acc + (new Date(d.updated_at).getTime() - new Date(d.created_at).getTime()) / 60000, 0);
                  stat.avgResponseTimeMinutes = total / assessorDemands.length;
                }
              });
              const totalFinalizadas = Array.from(assessorMap.values()).reduce((acc, s) => acc + s.finalizadas, 0);
              await exportAssessorEfficiencyPDF(
                Array.from(assessorMap.values()).sort((a, b) => b.finalizadas - a.finalizadas),
                demands.length,
                totalFinalizadas
              );
            }}
          />
        )}

        {/* MÉTRICAS DO SISTEMA */}
        {tab === "metricas" && (
          <VereadorMetricasSistema
            demands={demands}
            cidadaos={cidadaos}
            vagas={vagas}
            comCurriculo={stats.comCurriculo}
            lookingWork={stats.lookingWork}
            employed={stats.employed}
            totalCidadaos={stats.totalCidadaos}
            contratados={contratados}
            onSelectUsuario={handleSelectUsuario}
            onExportPDF={async (metricTab) => {
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
                  id: d.id,
                  type: d.type,
                  category: d.category,
                  status: d.status,
                  title: d.title,
                  citizen_name: d.citizen_name,
                  citizen_neighborhood: d.citizen_neighborhood,
                  assessor_id: d.assessor_id,
                  assessor_name: d.assessor_name,
                  created_at: d.created_at,
                  updated_at: d.updated_at,
                })),
                {
                  totalCidadaos: freshCidadaos.length,
                  comCurriculo: freshComCurriculo,
                  lookingWork: freshLookingWork,
                  employed: freshEmployed,
                  comSurvey: freshComSurvey,
                  semSurvey: freshSemSurvey,
                },
                freshContratados,
                metricTab
              );
            }}
          />
        )}
      </main>

      {/* Demand detail modal */}
      {selectedDemand && (
        <VereadorDemandDetail
          demand={selectedDemand}
          onClose={handleCloseDemand}
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

      {/* Botão flutuante "?" — sempre disponível para iniciar/rever o tour */}
      {/* Ao clicar, redireciona para overview ANTES de iniciar para garantir que todos os elementos estejam visíveis */}
      {!tour.isActive && (
        <button
          onClick={() => tour.startTour(() => {
            handleTabChange("overview");
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
        tourName={vereadorTour.name}
        onNext={tour.nextStep}
        onPrev={tour.prevStep}
        onSkip={tour.skipTour}
        onFinish={tour.finishTour}
      />

      {/* Hidden file input para troca de foto de perfil via sidebar */}
      <input
        id="avatar-upload-vereador"
        ref={avatarInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleAvatarChange}
        className="hidden"
      />
    </div>
  );
}