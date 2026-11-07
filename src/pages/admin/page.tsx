import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { getStoredUser, clearStoredUser } from "@/hooks/useAuth";
import AdminLogin from "./components/AdminLogin";
import DemandsPanel from "./components/DemandsPanel";
import NewsPanel from "./components/NewsPanel";
import UsersPanel from "./components/UsersPanel";
import ReportsPanel from "./components/ReportsPanel";
import AssessorsPanel from "./components/AssessorsPanel";
import CleanupPanel from "./components/CleanupPanel";
import EmailDiagnosticsPanel from "./components/EmailDiagnosticsPanel";
import PainelSidebar from "@/components/feature/PainelSidebar";
import NotificationBell from "@/components/feature/NotificationBell";
import VagaCardPublica, { type VagaPublica } from "@/components/feature/VagaCardPublica";
import VagaDetailModal from "@/components/feature/VagaDetailModal";
import { criarNotificacao } from "@/hooks/useNotifications";
import { useAgendaReminders } from "@/hooks/useAgendaReminders";
import VereadorMetricasSistema from "@/pages/vereador/components/VereadorMetricasSistema";
import UsuarioSaibaMaisModal, { type UsuarioSistema } from "@/pages/vereador/components/UsuarioSaibaMaisModal";
import { exportSystemMetricsPDF } from "@/pages/vereador/components/VereadorExportPDF";

type Tab = "dashboard" | "demands" | "news" | "users" | "assessors" | "reports" | "cleanup" | "vagas" | "email" | "metricas";

interface Stats {
  total: number;
  aberto: number;
  em_andamento: number;
  aguardando_externa: number;
  finalizada: number;
  news: number;
  cidadaos: number;
  vagas: number;
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>((searchParams.get("tab") as Tab) || "dashboard");
  const [adminUser, setAdminUser] = useState<{ id: string; email: string; name: string; role: string } | null>(null);
  const [stats, setStats] = useState<Stats>({ total: 0, aberto: 0, em_andamento: 0, aguardando_externa: 0, finalizada: 0, news: 0, cidadaos: 0, vagas: 0 });
  
  // Vagas
  const [vagasList, setVagasList] = useState<VagaPublica[]>([]);
  const [selectedVaga, setSelectedVaga] = useState<VagaPublica | null>(null);
  const [companyAvatars, setCompanyAvatars] = useState<Record<string, string>>();

  // Métricas do sistema
  const [metricCidadaos, setMetricCidadaos] = useState<any[]>([]);
  const [metricDemands, setMetricDemands] = useState<any[]>([]);
  const [metricVagasData, setMetricVagasData] = useState<any[]>([]);
  const [metricCandidaturas, setMetricCandidaturas] = useState<any[]>([]);
  const [metricStats, setMetricStats] = useState({ comCurriculo: 0, lookingWork: 0, employed: 0, totalCidadaos: 0 });
  const [selectedUsuarioAdmin, setSelectedUsuarioAdmin] = useState<UsuarioSistema | null>(null);
  const [usuariosAdmin, setUsuariosAdmin] = useState<UsuarioSistema[]>([]);

  // BUGFIX B1: Lembretes da agenda disparam sempre que o admin estiver logado
  useAgendaReminders(authed);

  const loadMetrics = async () => {
    const [cidadaosRes, demandsRes, vagasRes, candRes, usersRes] = await Promise.all([
      supabase.from("profiles").select("id, full_name, neighborhood, job_status, education, is_employed, employed_through_platform, platform_job_details, employment_survey_completed, curriculo_pdf, created_at").eq("role", "citizen").order("created_at", { ascending: false }),
      supabase.from("demands").select("*").order("created_at", { ascending: false }),
      supabase.from("vagas").select("id, title, area, type, location, salary, company_name, status, created_at").eq("status", "active").order("created_at", { ascending: false }),
      supabase.from("candidaturas").select("id, vaga_id, cidadao_id, status, created_at").eq("status", "aprovada").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name, display_name, role, phone, neighborhood, education, expertise, job_status, job_type, bio, curriculo_pdf, avatar_url, profile_photo, company_name, status, created_at").order("created_at", { ascending: false }),
    ]);
    const cidList = (cidadaosRes.data as any[]) ?? [];
    const demList = (demandsRes.data as any[]) ?? [];
    const vagList = (vagasRes.data as any[]) ?? [];
    const candList = (candRes.data as any[]) ?? [];
    const uList = (usersRes.data as UsuarioSistema[]) ?? [];
    setMetricCidadaos(cidList);
    setMetricDemands(demList);
    setMetricVagasData(vagList);
    setMetricCandidaturas(candList);
    setUsuariosAdmin(uList);
    const curriculoCount = cidList.filter((c: any) => c.curriculo_pdf && c.curriculo_pdf.length > 5).length;
    setMetricStats({
      comCurriculo: curriculoCount,
      lookingWork: cidList.filter((c: any) => c.job_status !== "not_looking").length,
      employed: cidList.filter((c: any) => c.is_employed === true).length,
      totalCidadaos: cidList.length,
    });
  };

  useEffect(() => {
    const stored = getStoredUser();
    if (stored && stored.role === "admin") {
      setAdminUser({ id: stored.id, email: stored.email, name: stored.display_name || stored.full_name, role: stored.role });
      setAuthed(true);
      loadStats();
      loadVagas();
      loadMetrics();
      // Auto-check: se vereador nao existe, recriar automaticamente
      checkAndRestoreVereador();
    }
    setChecking(false);
  }, []);

  // Realtime: auto-refresh stats quando demandas ou vagas mudam (R1 fix)
  useEffect(() => {
    if (!authed) return;
    const demandsChannel = supabase
      .channel("admin-demands-stats")
      .on("postgres_changes", { event: "*", schema: "public", table: "demands" }, () => { loadStats(); })
      .subscribe();
    const vagasChannel = supabase
      .channel("admin-vagas-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "vagas" }, () => { loadVagas(); loadStats(); })
      .subscribe();
    return () => { supabase.removeChannel(demandsChannel); supabase.removeChannel(vagasChannel); };
  }, [authed]);

  // Sync tab with URL params (supports notification redirects)
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab") as Tab | null;
    if (tabFromUrl && tabFromUrl !== tab) {
      setTab(tabFromUrl);
    }
  }, [searchParams]);

  // Verifica se o vereador existe; se não, recria automaticamente (silencioso)
  const checkAndRestoreVereador = async () => {
    try {
      const { data: vereadorCheck } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "vereador")
        .maybeSingle();
      if (!vereadorCheck) {
        // Vereador não existe — recriar silenciosamente
        await supabase.functions.invoke("recreate-vereador", { body: {} });
      }
    } catch (_) { /* silent — não interrompe o fluxo */ }
  };

  const loadStats = async () => {
    const [
      { count: total },
      { count: aberto },
      { count: em_andamento },
      { count: aguardando_externa },
      { count: finalizada },
      { count: news },
      { count: cidadaos },
      { count: vagas },
    ] = await Promise.all([
      supabase.from("demands").select("*", { count: "exact", head: true }),
      supabase.from("demands").select("*", { count: "exact", head: true }).eq("status", "aberto"),
      supabase.from("demands").select("*", { count: "exact", head: true }).eq("status", "em_andamento"),
      supabase.from("demands").select("*", { count: "exact", head: true }).eq("status", "aguardando_externa"),
      supabase.from("demands").select("*", { count: "exact", head: true }).eq("status", "finalizada"),
      supabase.from("news").select("*", { count: "exact", head: true }).eq("status", "published"),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "citizen"),
      supabase.from("vagas").select("*", { count: "exact", head: true }).eq("status", "active"),
    ]);
    setStats({
      total: total ?? 0, aberto: aberto ?? 0, em_andamento: em_andamento ?? 0, aguardando_externa: aguardando_externa ?? 0, finalizada: finalizada ?? 0,
      news: news ?? 0, cidadaos: cidadaos ?? 0, vagas: vagas ?? 0,
    });
  };

  const loadVagas = async () => {
    const [{ data }, { data: empresas }] = await Promise.all([
      supabase
        .from("vagas")
        .select("*")
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
    const enriched = ((data as VagaPublica[]) ?? []).map((v) => ({
      ...v,
      company_avatar: v.company_id ? (map[v.company_id] || null) : null,
    }));
    setVagasList(enriched);
  };

  const deleteVagaAdmin = async (vaga: VagaPublica) => {
    // 1. Buscar todos cidadãos que se candidataram
    const { data: cands } = await supabase
      .from("candidaturas")
      .select("cidadao_id")
      .eq("vaga_id", vaga.id);

    const cidadaoIds = (cands ?? []).map((c: { cidadao_id: string }) => c.cidadao_id).filter((id, i, arr) => arr.indexOf(id) === i);

    // 2. Excluir a vaga via edge function (bypass RLS)
    const { data, error } = await supabase.functions.invoke("admin-delete-vaga", {
      body: { vaga_id: vaga.id },
    });
    if (error) {
      console.error("Erro ao deletar vaga:", error.message);
      return;
    }
    const result = data as { success?: boolean; errors?: string[] };
    if (!result?.success) {
      console.error("Erro ao deletar vaga:", result?.errors?.join(", "));
      return;
    }

    // 3. Remover da lista local
    setVagasList((prev) => prev.filter((v) => v.id !== vaga.id));

    // 4. Notificar a empresa dona
    if (vaga.company_id) {
      await criarNotificacao(
        vaga.company_id,
        "vaga_excluida",
        "Vaga excluída pela administração",
        `A vaga "${vaga.title}" foi removida do sistema pelo administrador.`,
        undefined,
        "Administrador",
        String(vaga.id),
        "vaga"
      );
    }

    // 5. Notificar cada cidadão que se candidatou
    for (const cidId of cidadaoIds) {
      await criarNotificacao(
        cidId,
        "vaga_excluida",
        "Vaga removida",
        `A vaga "${vaga.title}" de "${vaga.company_name ?? "Empresa"}" foi removida do sistema.`,
        undefined,
        "Administrador",
        String(vaga.id),
        "vaga"
      );
    }
  };

  const navigate = useNavigate();

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab);
    setSearchParams({ tab: newTab });
  };

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } catch (_) { /* ignore — manual cleanup below */ }
    clearStoredUser();
    setAuthed(false);
    setAdminUser(null);
    Object.keys(localStorage).forEach((k) => { if (k.startsWith("sb-") || k.includes("supabase")) localStorage.removeItem(k); });
    Object.keys(sessionStorage).forEach((k) => { if (k.startsWith("sb-") || k.includes("supabase")) sessionStorage.removeItem(k); });
    navigate("/");
  };

  const handleSuccess = (user: { id: string; email: string; name: string }) => {
    const stored = getStoredUser();
    setAdminUser({ ...user, role: stored?.role ?? "admin" });
    setAuthed(true);
    loadStats();
    loadVagas();
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-[#0D1629] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#E8A020] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!authed) return <AdminLogin onSuccess={handleSuccess} />;

  const navItems: { key: Tab; icon: string; label: string }[] = [
    { key: "dashboard", icon: "ri-dashboard-line", label: "Dashboard" },
    { key: "demands", icon: "ri-file-list-3-line", label: "Demandas" },
    { key: "news", icon: "ri-newspaper-line", label: "Notícias" },
    { key: "users", icon: "ri-group-line", label: "Usuários" },
    { key: "assessors", icon: "ri-user-star-line", label: "Assessores" },
    { key: "reports", icon: "ri-bar-chart-line", label: "Relatórios" },
    { key: "vagas", icon: "ri-briefcase-4-line", label: "Vagas" },
    { key: "cleanup", icon: "ri-delete-bin-line", label: "Limpeza" },
    { key: "email", icon: "ri-mail-check-line", label: "Diagnóstico Email" },
    { key: "metricas", icon: "ri-pie-chart-line", label: "Métricas" },
  ];

  return (
    <div className="min-h-screen flex" style={{ background: "#F5F4F0" }}>
      <PainelSidebar
        role="admin"
        roleLabel="Admin"
        userName={adminUser?.name ?? ""}
        avatarUrl={getStoredUser()?.avatar_url || null}
        navItems={navItems}
        activeTab={tab}
        onTabChange={handleTabChange}
        stats={[
          { label: "Em Aberto", value: stats.aberto, icon: "ri-inbox-line", color: "#D97706" },
          { label: "Em Andamento", value: stats.em_andamento, icon: "ri-loader-4-line", color: "#3BBFD4" },
          { label: "Ag. Externa", value: stats.aguardando_externa, icon: "ri-mail-send-line", color: "#7C3AED" },
          { label: "Finalizadas", value: stats.finalizada, icon: "ri-checkbox-circle-line", color: "#22C55E" },
        ]}
        onLogout={handleLogout}
        width="w-64"
      />

      {/* Main */}
      <main className="md:ml-64 flex-1 p-4 md:p-6 min-h-screen pt-20 md:pt-6 pb-24 md:pb-6 overflow-x-hidden">
        {/* Header com sino */}
        <div className="flex items-center justify-end mb-4">
          <NotificationBell userId={adminUser?.id ?? null} userRole={adminUser?.role ?? null} onNavigate={(path) => navigate(path)} />
        </div>

        {tab === "dashboard" && (
          <div>
            <div className="mb-5 md:mb-6">
              <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: "#E8A020" }}>Painel Administrativo</p>
              <h1 className="text-xl md:text-2xl font-extrabold text-gray-900">Dashboard</h1>
              <p className="text-gray-500 text-xs md:text-sm mt-0.5">Visão geral do mandato e do sistema</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-5 md:mb-6">
              {[
                { label: "Em Aberto", value: stats.aberto, icon: "ri-inbox-line", color: "from-amber-400 to-amber-500" },
                { label: "Em Andamento", value: stats.em_andamento, icon: "ri-loader-4-line", color: "from-[#1B2A5E] to-[#3BBFD4]" },
                { label: "Ag. Externa", value: stats.aguardando_externa, icon: "ri-mail-send-line", color: "from-purple-400 to-purple-500" },
                { label: "Finalizadas", value: stats.finalizada, icon: "ri-checkbox-circle-line", color: "from-green-400 to-green-500" },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-2xl p-4 md:p-5 border border-gray-100">
                  <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-3`}>
                    <i className={`${s.icon} text-white text-base`}></i>
                  </div>
                  <p className="text-2xl font-extrabold text-gray-900">{s.value}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
              <div className="bg-white rounded-2xl border border-gray-100 p-4 md:p-5">
                <h2 className="text-gray-900 font-extrabold text-sm mb-3 flex items-center gap-2">
                  <i className="ri-flashlight-line" style={{ color: "#E8A020" }}></i>Ações Rápidas
                </h2>
                <div className="space-y-1">
                  {[
                    { label: "Gerenciar demandas", icon: "ri-file-list-3-line", action: () => handleTabChange("demands") },
                    { label: "Publicar notícia", icon: "ri-newspaper-line", action: () => handleTabChange("news") },
                    { label: "Criar usuário", icon: "ri-user-add-line", action: () => handleTabChange("users") },
                    { label: "Ver relatórios", icon: "ri-bar-chart-line", action: () => handleTabChange("reports") },
                    { label: "Baixar resumo PDF", icon: "ri-file-pdf-line", action: () => navigate("/admin/resumo") },
                    { label: "Sistema de Vagas — Cidadão", icon: "ri-briefcase-4-line", action: () => navigate("/sistema/painel/cidadao") },
                    { label: "Sistema de Vagas — Empresa", icon: "ri-building-line", action: () => navigate("/sistema/painel/empresa") },
                  ].map((a) => (
                    <button key={a.label} onClick={a.action}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 text-gray-700 text-sm font-medium transition-all cursor-pointer text-left hover:bg-gray-100">
                      <span className="w-5 h-5 flex items-center justify-center shrink-0">
                        <i className={`${a.icon} text-sm`} style={{ color: "#1B2A5E" }}></i>
                      </span>
                      <span className="truncate">{a.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-4 md:p-5">
                <h2 className="text-gray-900 font-extrabold text-sm mb-3 flex items-center gap-2">
                  <i className="ri-newspaper-line" style={{ color: "#3BBFD4" }}></i>Portal de Notícias
                </h2>
                <p className="text-gray-500 text-sm mb-4">
                  <strong>{stats.news}</strong> notícias publicadas no portal.<br />Gerencie o conteúdo do mandato.
                </p>
                <button onClick={() => handleTabChange("news")} className="w-full px-4 py-2.5 text-white text-sm font-semibold rounded-xl cursor-pointer whitespace-nowrap" style={{ background: "linear-gradient(135deg, #1B2A5E, #3BBFD4)" }}>
                  Gerenciar Notícias
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-4 md:p-5">
                <h2 className="text-gray-900 font-extrabold text-sm mb-3 flex items-center gap-2">
                  <i className="ri-briefcase-4-line" style={{ color: "#3BBFD4" }}></i>Emprego em Pelotas
                </h2>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50">
                    <span className="text-sm text-gray-600">Vagas abertas</span>
                    <span className="font-bold" style={{ color: "#3BBFD4" }}>{stats.vagas}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 md:p-3 rounded-xl bg-gray-50">
                    <span className="text-sm text-gray-600">Cidadãos cadastrados</span>
                    <span className="font-bold text-gray-800">{stats.cidadaos}</span>
                  </div>
                </div>
                <button onClick={() => handleTabChange("reports")} className="w-full mt-3 px-4 py-2.5 text-sm font-semibold rounded-xl cursor-pointer whitespace-nowrap hover:bg-gray-50 transition-colors" style={{ border: "1px solid rgba(27,42,94,0.25)", color: "#1B2A5E" }}>
                  Ver Relatório Completo
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === "demands" && (
          <div>
            <div className="mb-5 md:mb-6">
              <h1 className="text-xl md:text-2xl font-extrabold text-gray-900">Gestão de Demandas</h1>
              <p className="text-gray-500 text-xs md:text-sm mt-0.5">Requerimentos e sugestões dos cidadãos</p>
            </div>
            <DemandsPanel adminId={adminUser?.id ?? ""} adminName={adminUser?.name ?? "Admin"} />
          </div>
        )}

        {tab === "news" && (
          <div>
            <div className="mb-5 md:mb-6">
              <h1 className="text-xl md:text-2xl font-extrabold text-gray-900">Gestão de Notícias</h1>
              <p className="text-gray-500 text-xs md:text-sm mt-0.5">Publique e gerencie as notícias do mandato</p>
            </div>
            <NewsPanel />
          </div>
        )}

        {tab === "users" && (
          <div>
            <div className="mb-5 md:mb-6">
              <h1 className="text-xl md:text-2xl font-extrabold text-gray-900">Gestão de Usuários</h1>
              <p className="text-gray-500 text-xs md:text-sm mt-0.5">Crie e gerencie todos os perfis do sistema</p>
            </div>
            <UsersPanel />
          </div>
        )}

        {tab === "assessors" && (
          <div>
            <div className="mb-5 md:mb-6">
              <h1 className="text-xl md:text-2xl font-extrabold text-gray-900">Gestão de Assessores</h1>
              <p className="text-gray-500 text-xs md:text-sm mt-0.5">Cadastre, aprove ou remova assessores do gabinete</p>
            </div>
            <AssessorsPanel />
          </div>
        )}

        {tab === "reports" && (
          <div>
            <div className="mb-5 md:mb-6">
              <h1 className="text-xl md:text-2xl font-extrabold text-gray-900">Relatórios Completos</h1>
              <p className="text-gray-500 text-xs md:text-sm mt-0.5">Visão analítica completa do sistema e mandato</p>
            </div>
            <ReportsPanel />
          </div>
        )}

        {tab === "vagas" && (
          <div>
            <div className="mb-5 md:mb-6">
              <h1 className="text-xl md:text-2xl font-extrabold text-gray-900">Gestão de Vagas</h1>
              <p className="text-gray-500 text-xs md:text-sm mt-0.5">Visualize e gerencie todas as oportunidades de emprego publicadas</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="text-sm text-gray-500">
                <strong className="text-gray-800">{vagasList.filter((v) => v.status === "active").length}</strong> ativas ·{" "}
                <strong className="text-gray-800">{vagasList.length}</strong> no total
              </span>
              <button
                onClick={loadVagas}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer whitespace-nowrap hover:bg-gray-100 transition-colors"
                style={{ color: "#1B2A5E", border: "1px solid rgba(27,42,94,0.20)" }}
              >
                <i className="ri-refresh-line"></i> Atualizar
              </button>
            </div>

            {vagasList.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-2xl border border-gray-100">
                <i className="ri-briefcase-4-line text-gray-200 text-5xl mb-3 block"></i>
                <p className="text-gray-400 font-semibold">Nenhuma vaga publicada</p>
              </div>
            ) : (
              <div className="rounded-3xl p-5" style={{ background: "#0D1629" }}>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {vagasList.map((vaga) => (
                  <VagaCardPublica
                    key={vaga.id}
                    vaga={vaga}
                    onSaibaMais={setSelectedVaga}
                    onExcluir={deleteVagaAdmin}
                    showDelete={true}
                    isDark={true}
                    readOnly={true}
                  />
                ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "cleanup" && (
          <div>
            <div className="mb-5 md:mb-6">
              <h1 className="text-xl md:text-2xl font-extrabold text-gray-900">Limpeza do Sistema</h1>
              <p className="text-gray-500 text-xs md:text-sm mt-0.5">Remoção permanente de dados de teste</p>
            </div>
            <CleanupPanel />
          </div>
        )}

        {tab === "email" && (
          <div>
            <div className="mb-5 md:mb-6">
              <h1 className="text-xl md:text-2xl font-extrabold text-gray-900">Diagnóstico de Email</h1>
              <p className="text-gray-500 text-xs md:text-sm mt-0.5">Central de investigação — verifique toda a infraestrutura de envio de emails</p>
            </div>
            <EmailDiagnosticsPanel />
          </div>
        )}

        {tab === "metricas" && (() => {
          const contratados = metricCidadaos
            .filter((c: any) => c.employed_through_platform === true)
            .map((cidadao: any) => {
              const cand = metricCandidaturas.find((c: any) => c.cidadao_id === cidadao.id);
              const vaga = cand ? metricVagasData.find((v: any) => v.id === cand.vaga_id) : null;
              return { cidadao, vaga: vaga ?? null };
            });
          return (
            <div>
              <div className="mb-5 md:mb-6">
                <h1 className="text-xl md:text-2xl font-extrabold text-gray-900">Métricas do Sistema</h1>
                <p className="text-gray-500 text-xs md:text-sm mt-0.5">Dados completos de empregabilidade, demandas e desempenho</p>
              </div>
              <div className="rounded-2xl p-5" style={{ background: "#0D1629" }}>
                <VereadorMetricasSistema
                  demands={metricDemands}
                  cidadaos={metricCidadaos}
                  vagas={metricVagasData}
                  comCurriculo={metricStats.comCurriculo}
                  lookingWork={metricStats.lookingWork}
                  employed={metricStats.employed}
                  totalCidadaos={metricStats.totalCidadaos}
                  contratados={contratados}
                  onSelectUsuario={(cidadaoId) => {
                    const u = usuariosAdmin.find((usr) => usr.id === cidadaoId);
                    if (u) setSelectedUsuarioAdmin(u);
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
              </div>
            </div>
          );
        })()}
      </main>

      {/* Vaga Detail Modal */}
      {selectedVaga && (
        <VagaDetailModal
          vaga={selectedVaga}
          onClose={() => setSelectedVaga(null)}
          readOnly={true}
          showCandidatos={true}
        />
      )}

      {/* Usuário Saiba Mais modal (métricas) */}
      {selectedUsuarioAdmin && (
        <UsuarioSaibaMaisModal
          usuario={selectedUsuarioAdmin}
          onClose={() => setSelectedUsuarioAdmin(null)}
        />
      )}
    </div>
  );
}