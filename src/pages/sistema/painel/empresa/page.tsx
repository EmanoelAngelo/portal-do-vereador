import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase, supabaseAnonKey, getEdgeFunctionUrl } from "@/lib/supabase";
import { getStoredUser, clearStoredUser } from "@/hooks/useAuth";
import ProfilePhotoLightbox from "@/components/feature/ProfilePhotoLightbox";
import NotificationBell from "@/components/feature/NotificationBell";
import EmpresaChat from "@/pages/sistema/painel/empresa/components/EmpresaChat";
import { criarNotificacao, notificarRelevantes, verificarNotificacaoExistente } from "@/hooks/useNotifications";
import TourGuide from "@/components/feature/TourGuide";
import { useTour } from "@/hooks/useTour";
import { empresaTour } from "@/mocks/tours/empresa-tour";
import { shareContent } from "@/lib/share";

interface Profile {
  id: string;
  company_name: string | null;
  display_name: string | null;
  responsible_name: string | null;
  phone: string | null;
  cnpj: string | null;
  avatar_url: string | null;
  profile_photo: string | null;
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
  image_url: string | null;
  created_at: string;
}

interface Candidatura {
  id: number;
  cidadao_id: string;
  vaga_id: number;
  status: string;
  curriculo_url: string | null;
  message: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  empresa_contacted_at: string | null;
  empresa_contact_deadline: string | null;
  profiles?: CandidatoProfile | null;
  vagas?: { title: string } | null;
}

interface CandidatoProfile {
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
  is_service_provider: boolean | null;
  worker_profile_type: string | null;
  service_categories: string | null;
  service_description: string | null;
  portfolio_photos: string | null;
  email: string | null;
}

// Helper global para avatar do candidato
const getCandidatoAvatar = (prof?: CandidatoProfile | null) => {
  if (prof?.avatar_url) return prof.avatar_url;
  if (prof?.profile_photo) return prof.profile_photo;
  return null;
};

// Compartilhamento via URL do site real
function shareVaga(vaga: Vaga, platform: "whatsapp" | "instagram" | "share") {
  const url = typeof window !== "undefined" ? `${window.location.origin}/sistema/vaga/${vaga.id}` : "";
  const text = `Vaga: ${vaga.title} — ${vaga.company_name ?? "Empresa"} em ${vaga.location ?? "Pelotas/RS"}. Confira esta oportunidade!`;
  shareContent(platform, { title: vaga.title, text, url });
}

type ActiveTab = "vagas" | "criar" | "curriculos" | "mensagens";

const AREAS = [
  "Administrativo", "Comercial/Vendas", "Tecnologia", "Saúde",
  "Educação", "Construção Civil", "Alimentação", "Logística",
  "Serviços Gerais", "Outro",
];
const TYPES = ["CLT", "PJ", "Freelance", "Estágio", "Temporário", "Aprendiz"];
const EDUCATION_LEVELS = [
  "Todos", "Ensino Fundamental", "Ensino Médio", "Técnico",
  "Superior Incompleto", "Superior Completo", "Pós-graduação", "Mestrado/Doutorado",
];

/** Dropdown customizado para evitar corte do select nativo */
function DropdownFilter({
  options,
  value,
  onChange,
  placeholder,
  icon,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? placeholder ?? "Selecionar";

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold cursor-pointer whitespace-nowrap focus:outline-none"
        style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.85)" }}
      >
        {icon && <i className={`${icon} text-white/40`}></i>}
        <span className="max-w-[140px] truncate">{selectedLabel}</span>
        <i className={`ri-arrow-down-s-line text-white/40 transition-transform ${open ? "rotate-180" : ""}`}></i>
      </button>
      {open && (
        <div
          className="absolute z-50 mt-1 rounded-xl overflow-hidden shadow-2xl min-w-full"
          style={{ background: "#1a233a", border: "1px solid rgba(255,255,255,0.15)", maxHeight: "240px", overflowY: "auto" }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors hover:bg-white/5"
              style={{ color: value === opt.value ? "#E8A020" : "rgba(255,255,255,0.70)" }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  return `${Math.floor(hrs / 24)}d atrás`;
}

const EMPTY_FORM = {
  title: "",
  area: AREAS[0],
  type: TYPES[0],
  location: "Pelotas/RS",
  salary: "",
  description: "",
  requirements: "",
};

export default function SistemaEmpresaPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [user, setUser] = useState<{ id: string; email: string; role: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [candidaturas, setCandidaturas] = useState<Candidatura[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>((searchParams.get("tab") as ActiveTab) || "vagas");

  // Filtros currículo
  const [searchCurriculo, setSearchCurriculo] = useState("");
  const [filterVaga, setFilterVaga] = useState("all");
  const [filterEducation, setFilterEducation] = useState("Todos");
  const [selectedCandidatura, setSelectedCandidatura] = useState<Candidatura | null>(null);
  // NOVO: lista de todos profissionais cadastrados
  const [profissionais, setProfissionais] = useState<CandidatoProfile[]>([]);
  const [curriculoView, setCurriculoView] = useState<"candidaturas" | "profissionais">("candidaturas");
  const [selectedProfissional, setSelectedProfissional] = useState<CandidatoProfile | null>(null);
  const [searchProfissional, setSearchProfissional] = useState("");
  const [filterProfArea, setFilterProfArea] = useState("Todas");
  const [filterServiceCat, setFilterServiceCat] = useState("Todas");

  // Formulário vaga
  const [savingVaga, setSavingVaga] = useState(false);
  const [vagaMsg, setVagaMsg] = useState("");
  const [editingVaga, setEditingVaga] = useState<Vaga | null>(null);
  const [vagaForm, setVagaForm] = useState({ ...EMPTY_FORM });
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  // Modal de encerramento de vaga com registro de contratacao (multi-select)
  const [closeVagaModal, setCloseVagaModal] = useState<{ vaga: Vaga; candidaturas: Candidatura[] } | null>(null);
  const [closeVagaCidadaoIds, setCloseVagaCidadaoIds] = useState<string[]>([]);
  const [closeVagaResultado, setCloseVagaResultado] = useState<string>("");
  const [closeVagaLoading, setCloseVagaLoading] = useState(false);
  // Lock para evitar chamadas concorrentes ao refreshData (causa do bug de dupla-seleção)
  const refreshLockRef = useRef(false);
  // Ref para user ID sempre atualizada (evita stale closure no onUpdate das candidaturas)
  const userIdRef = useRef<string>("");
  // Foto da vaga
  const [vagaPhotoFile, setVagaPhotoFile] = useState<File | null>(null);
  const [vagaPhotoPreview, setVagaPhotoPreview] = useState<string | null>(null);
  const [uploadingVagaPhoto, setUploadingVagaPhoto] = useState(false);
  const vagaPhotoRef = useRef<HTMLInputElement>(null);
  // [NOVO] Estado para loading dialog bloqueante
  const [publishingVaga, setPublishingVaga] = useState(false);

  // Mensagens com o gabinete (chat real, igual ao cidadão)
 
  // Tour guiado — primeiro acesso dispara automaticamente
  const tour = useTour(empresaTour, true);

  // Sync activeTab with URL params (supports notification redirects)
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab") as ActiveTab | null;
    if (tabFromUrl && ["vagas", "criar", "curriculos", "mensagens"].includes(tabFromUrl) && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
      if (tabFromUrl === "curriculos") setCurriculoView("candidaturas");
    }
    // Auto-select candidatura quando ?selected= esta na URL
    const selectedId = searchParams.get("selected");
    if (selectedId && activeTab === "curriculos" && curriculoView === "candidaturas" && candidaturas.length > 0) {
      const id = parseInt(selectedId, 10);
      if (!isNaN(id)) {
        const target = candidaturas.find((c) => c.id === id);
        if (target) setSelectedCandidatura(target);
      }
    }
  }, [searchParams, candidaturas, activeTab, curriculoView]);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) { navigate("/auth?from=/sistema/painel/empresa"); return; }
    if (stored.role === "citizen") { navigate("/sistema/painel/cidadao"); return; }
    setUser({ id: stored.id, email: stored.email, role: stored.role });
    userIdRef.current = stored.id;

    (async () => {
      const [{ data: prof }, { data: vagasData }] = await Promise.all([
        supabase.from("profiles").select("id, company_name, responsible_name, phone, cnpj, avatar_url, profile_photo").eq("id", stored.id).maybeSingle(),
        supabase.from("vagas").select("*").eq("company_id", stored.id).order("created_at", { ascending: false }),
      ]);
      setProfile(prof as Profile);
      setVagas((vagasData as Vaga[]) ?? []);

      // Buscar candidaturas das vagas da empresa
      const vagaIds = ((vagasData as Vaga[]) ?? []).map((v) => v.id);
      if (vagaIds.length > 0) {
        const { data: candsData } = await supabase
          .from("candidaturas")
          .select("*, profiles(id, full_name, phone, neighborhood, education, expertise, job_type, job_status, bio, curriculo_pdf, avatar_url, profile_photo, is_service_provider, worker_profile_type, service_categories, service_description, portfolio_photos, email), vagas(id, title)")
          .in("vaga_id", vagaIds)
          .order("created_at", { ascending: false });
        setCandidaturas((candsData as Candidatura[]) ?? []);
      } else {
        setCandidaturas([]);
      }

      setLoading(false);
    })();

    // Buscar TODOS os cidadãos com perfil profissional completo
    (async () => {
      try {
        const { data: allCidadaos } = await supabase
          .from("profiles")
          .select("id, full_name, display_name, phone, neighborhood, education, expertise, job_type, job_status, bio, curriculo_pdf, avatar_url, profile_photo, is_service_provider, worker_profile_type, service_categories, service_description, portfolio_photos")
          .eq("role", "citizen")
          .not("expertise", "is", null)
          .not("education", "is", null)
          .order("full_name", { ascending: true });
        setProfissionais((allCidadaos as CandidatoProfile[]) ?? []);
      } catch (_) { /* silent */ }
    })();

    // Realtime: novas candidaturas + atualizacoes (aprovação/recusa) — usa closure sobre stored.id para recarregar
    const channel = supabase
      .channel("empresa-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "candidaturas" }, () => {
        try { refreshData(stored.id); } catch (e) { console.error("[Empresa] Realtime candidaturas INSERT callback erro:", e); }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "candidaturas" }, () => {
        try { refreshData(stored.id); } catch (e) { console.error("[Empresa] Realtime candidaturas UPDATE callback erro:", e); }
      })
      // ITEM 04 FIX: Também escuta mudanças em vagas (criação, edição, status do admin)
      .on("postgres_changes", { event: "*", schema: "public", table: "vagas", filter: `company_id=eq.${stored.id}` }, () => {
        try { refreshData(stored.id); } catch (e) { console.error("[Empresa] Realtime vagas callback erro:", e); }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") console.log("[Empresa] Realtime conectado (candidaturas + vagas)");
        if (status === "CHANNEL_ERROR") console.error("[Empresa] Realtime ERRO - reconectando...");
        if (status === "TIMED_OUT") console.warn("[Empresa] Realtime TIMEOUT - reconectando...");
        if (status === "CLOSED") console.warn("[Empresa] Realtime FECHADO - reconectando...");
      });

    return () => { supabase.removeChannel(channel); };
  }, [navigate]);

  const refreshData = useCallback(async (uid: string) => {
    // Lock anti-concorrência: se já tem um refreshData rodando, ignora
    if (refreshLockRef.current) {
      console.log("[Empresa] refreshData ignorado — outro refresh em andamento");
      return;
    }
    refreshLockRef.current = true;
    try {
      const [{ data: vagasData }] = await Promise.all([
        supabase.from("vagas").select("*").eq("company_id", uid).order("created_at", { ascending: false }),
      ]);
      const updatedVagas = (vagasData as Vaga[]) ?? [];
      setVagas(updatedVagas);

      const vagaIds = updatedVagas.map((v) => v.id);
      if (vagaIds.length > 0) {
        const { data: candsData } = await supabase
          .from("candidaturas")
          .select("*, profiles(id, full_name, phone, neighborhood, education, expertise, job_type, job_status, bio, curriculo_pdf, avatar_url, profile_photo, is_service_provider, worker_profile_type, service_categories, service_description, portfolio_photos, email), vagas(id, title)")
          .in("vaga_id", vagaIds)
          .order("created_at", { ascending: false });
        const cands = (candsData as Candidatura[]) ?? [];
        setCandidaturas(cands);
        // Atualizar selectedCandidatura se ainda existir
        setSelectedCandidatura((prev) => {
          if (!prev) return null;
          const updated = cands.find((c) => c.id === prev.id);
          return updated ?? prev;
        });
      } else {
        setCandidaturas([]);
        setSelectedCandidatura(null);
      }
    } catch (e) {
      console.error("[Empresa] refreshData erro:", e);
    } finally {
      refreshLockRef.current = false;
    }
  }, []);

  // ITEM 04 — Polling fallback de segurança (30s): camada extra anti-F5
  // Se o realtime falhar silenciosamente, o polling garante dados atualizados
  // ⚠️ NÃO use intervalo < 10s — causa race condition com clicks do usuário
  useEffect(() => {
    if (loading || !user) return;
    const interval = setInterval(() => {
      console.log("[Empresa] Polling fallback: verificando atualizações...");
      try { refreshData(user.id); } catch (e) { console.error("[Empresa] Polling fallback erro:", e); }
    }, 30000);
    return () => clearInterval(interval);
  }, [loading, user, refreshData]);

  const candidaturasPorVaga = useCallback((vagaId: number) =>
    candidaturas.filter((c) => c.vaga_id === vagaId).length, [candidaturas]);

  const openEditForm = (vaga: Vaga) => {
    setEditingVaga(vaga);
    setVagaForm({
      title: vaga.title,
      area: vaga.area ?? AREAS[0],
      type: vaga.type,
      location: vaga.location ?? "Pelotas/RS",
      salary: vaga.salary ?? "",
      description: vaga.description ?? "",
      requirements: vaga.requirements ?? "",
    });
    setVagaPhotoFile(null);
    setVagaPhotoPreview(null);
    setVagaMsg("");
    setShowPublishConfirm(false);
    setActiveTab("criar");
    setSearchParams({ tab: "criar" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => {
    setEditingVaga(null);
    setVagaForm({ ...EMPTY_FORM });
    setVagaMsg("");
    setVagaPhotoFile(null);
    setVagaPhotoPreview(null);
    setShowPublishConfirm(false);
  };

  const handleVagaPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("Imagem muito grande. Máximo 5MB."); return; }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { alert("Formato inválido. Use JPG, PNG ou WEBP."); return; }
    setVagaPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setVagaPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadVagaPhoto = async (file: File): Promise<string | null> => {
    try {
      const edgeFnUrl = getEdgeFunctionUrl("upload-chat-image");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("chat_id", `vaga_${Date.now()}`);
      const fnRes = await fetch(edgeFnUrl, {
        method: "POST",
        headers: { apikey: supabaseAnonKey },
        body: formData,
      });
      if (!fnRes.ok) return null;
      const result = await fnRes.json();
      return result.url ?? null;
    } catch { return null; }
  };

  const handlePostVaga = async () => {
    if (!vagaForm.title.trim()) { setVagaMsg("Preencha o título da vaga antes de publicar."); return; }
    if (!user) { setVagaMsg("Sessão expirada. Faça login novamente."); return; }
    if (!profile) { setVagaMsg("Perfil da empresa não encontrado. Tente recarregar a página."); return; }
    setSavingVaga(true);
    setPublishingVaga(true); // [NOVO] Bloqueia tela
    setVagaMsg("");

    // Upload da foto da vaga se houver
    // Se tem preview novo, vai fazer upload. Se editando e não tem preview, mantém a original. Se não tem nada, null.
    let finalImageUrl: string | null = editingVaga ? (editingVaga.image_url ?? null) : null;
    if (vagaPhotoFile) {
      setUploadingVagaPhoto(true);
      const uploaded = await uploadVagaPhoto(vagaPhotoFile);
      setUploadingVagaPhoto(false);
      if (uploaded) finalImageUrl = uploaded;
    }

    let error;
    let novaVagaId: number | undefined;
    if (editingVaga) {
      ({ error } = await supabase.from("vagas").update({
        title: vagaForm.title,
        area: vagaForm.area,
        type: vagaForm.type,
        location: vagaForm.location,
        salary: vagaForm.salary,
        description: vagaForm.description,
        requirements: vagaForm.requirements,
        image_url: finalImageUrl,
      }).eq("id", editingVaga.id));
    } else {
      const { data: inserted, error: insertErr } = await supabase.from("vagas").insert({
        company_id: user.id,
        company_name: profile.company_name ?? "",
        title: vagaForm.title,
        area: vagaForm.area,
        type: vagaForm.type,
        location: vagaForm.location,
        salary: vagaForm.salary,
        description: vagaForm.description,
        requirements: vagaForm.requirements,
        image_url: finalImageUrl,
        status: "active",
      }).select("id");
      error = insertErr;
      if (inserted && inserted.length > 0) {
        novaVagaId = (inserted[0] as { id: number }).id;
      }
    }

    setSavingVaga(false);
    if (error) {
      setPublishingVaga(false); // [NOVO] Libera tela em caso de erro
      setVagaMsg("Erro ao salvar vaga. Tente novamente.");
      return;
    }
    setVagaMsg("success");
    await refreshData(user.id);

    // Notificar admin, vereador e assessor sobre nova vaga
    if (!editingVaga && novaVagaId) {
      await notificarRelevantes(
        "vaga_criada",
        "Nova oportunidade publicada",
        `"${vagaForm.title}" foi publicada por ${profile.company_name ?? "Empresa"}.`,
        {
          remetenteId: user.id,
          remetenteNome: profile.company_name ?? "Empresa",
          referenciaId: String(novaVagaId),
          referenciaTipo: "vaga",
        }
      );
    }

    // Guarda o ID da nova vaga antes do reset pra scroll depois
    const vagaCriadaId = novaVagaId;

    // [NOVO] Delay reduzido para 800ms com tela bloqueada — não dá tempo de clicar duas vezes
    setTimeout(() => {
      resetForm();
      setActiveTab("vagas");
      setSearchParams({ tab: "vagas" });
      setPublishingVaga(false); // [NOVO] Libera tela SÓ DEPOIS do redirect
      // Scroll automático até o card da vaga recém-criada
      if (vagaCriadaId) {
        setTimeout(() => {
          const card = document.getElementById(`vaga-card-${vagaCriadaId}`);
          if (card) {
            card.scrollIntoView({ behavior: "smooth", block: "center" });
            card.style.transition = "box-shadow 0.3s ease";
            card.style.boxShadow = "0 0 0 3px rgba(34,197,94,0.50)";
            setTimeout(() => { card.style.boxShadow = ""; }, 2500);
          }
        }, 300);
      }
    }, 800); // [NOVO] Reduzido de 1500ms para 800ms
  };

  const toggleVagaStatus = async (vaga: Vaga) => {
    const newStatus = vaga.status === "active" ? "paused" : "active";
    await supabase.from("vagas").update({ status: newStatus }).eq("id", vaga.id);
    setVagas((prev) => prev.map((v) => v.id === vaga.id ? { ...v, status: newStatus } : v));

    // Notificar cidadãos que se candidataram + admin/vereador/assessor
    // REGRA DE OURO: cidadãos REJEITADOS não recebem mais notificações sobre esta vaga
    try {
      const { data: cands } = await supabase.from("candidaturas").select("cidadao_id, status").eq("vaga_id", vaga.id);
      const cidadaoIds = (cands ?? [])
        .filter((c: { cidadao_id: string; status: string }) => c.status !== "rejected")
        .map((c: { cidadao_id: string }) => c.cidadao_id)
        .filter((id, i, arr) => arr.indexOf(id) === i);
      const acao = newStatus === "paused" ? "pausada" : "reativada";
      for (const cidId of cidadaoIds) {
        await criarNotificacao(
          cidId,
          "vaga_status",
          `Vaga ${acao}`,
          `A vaga "${vaga.title}" foi ${acao} pela empresa ${vaga.company_name ?? "Empresa"}.`,
          undefined,
          vaga.company_name ?? "Empresa",
          String(vaga.id),
          "vaga"
        );
      }
      // Notificar admin/vereador/assessor sobre a mudança de status
      await notificarRelevantes(
        "vaga_status",
        `Vaga ${acao}`,
        `A vaga "${vaga.title}" de ${vaga.company_name ?? "Empresa"} foi ${acao}.`,
        {
          remetenteNome: vaga.company_name ?? "Empresa",
          referenciaId: String(vaga.id),
          referenciaTipo: "vaga",
          excluirIds: cidadaoIds,
        }
      );
    } catch (_) { /* silent */ }
  };

  const closeVaga = (id: number) => {
    const vaga = vagas.find((v) => v.id === id);
    if (!vaga) return;
    // Abre modal de encerramento com selecao de contratacao (multi)
    // REGRA DE OURO: candidatos REJEITADOS nao aparecem na lista de selecao de contratacao
    // Apenas accepted e pending sao exibidos — rejeitado = fora do processo seletivo
    const vagaCandidaturas = candidaturas.filter((c) => c.vaga_id === id && c.status !== "rejected");
    setCloseVagaModal({ vaga, candidaturas: vagaCandidaturas });
    setCloseVagaCidadaoIds([]);
    setCloseVagaResultado("");
    setCloseVagaLoading(false);
  };

  const confirmCloseVaga = async () => {
    if (!closeVagaModal) return;
    const { vaga } = closeVagaModal;
    setCloseVagaLoading(true);

    try {
      // Atualizar status da vaga
      await supabase.from("vagas").update({
        status: "closed",
        resultado_final: closeVagaResultado || "sem_contratacao",
        // Armazenamos o primeiro ID para compatibilidade, mas processamos todos
        cidadao_contratado_id: closeVagaCidadaoIds[0] || null,
        updated_at: new Date().toISOString(),
      }).eq("id", vaga.id);

      setVagas((prev) => prev.map((v) => v.id === vaga.id ? { ...v, status: "closed" } : v));

      // Para CADA cidadão contratado, atualizar seu perfil via edge function
      for (const cidId of closeVagaCidadaoIds) {
        try {
          const { error: profileFnError } = await supabase.functions.invoke("update-citizen-profile", {
            body: {
              citizen_id: cidId,
              vaga_title: vaga.title,
              vaga_id: vaga.id,
            },
          });
          if (profileFnError) {
            console.error("[confirmCloseVaga] Erro edge function para", cidId, ":", profileFnError);
          } else {
            console.log("[confirmCloseVaga] profiles atualizado via edge function para:", cidId);
          }
        } catch (e) {
          console.error("[confirmCloseVaga] Erro ao chamar edge function para", cidId, ":", e);
        }
      }

      // Notificar candidatos + admin/vereador/assessor sobre encerramento
      // REGRA DE OURO: cidadãos REJEITADOS não recebem mais notificações sobre esta vaga
      try {
        const { data: cands } = await supabase.from("candidaturas").select("cidadao_id, status").eq("vaga_id", vaga.id);
        const cidadaoIds = (cands ?? [])
          .filter((c: { cidadao_id: string; status: string }) => c.status !== "rejected")
          .map((c: { cidadao_id: string }) => c.cidadao_id)
          .filter((id2, i, arr) => arr.indexOf(id2) === i);
        
        // Notificar cada candidato
        for (const cidId of cidadaoIds) {
          const isContratado = closeVagaCidadaoIds.includes(cidId);
          await criarNotificacao(
            cidId,
            "vaga_status",
            isContratado ? "Parabéns! Você foi contratado" : "Vaga encerrada",
            isContratado
              ? `Parabéns! Você foi selecionado para a vaga "${vaga.title}" em ${vaga.company_name ?? "Empresa"}. A empresa entrará em contato com você.`
              : `A vaga "${vaga.title}" foi encerrada pela empresa ${vaga.company_name ?? "Empresa"}.`,
            undefined,
            vaga.company_name ?? "Empresa",
            String(vaga.id),
            "vaga"
          );
        }
        
        // Montar resumo de contratação (pode ser múltiplos)
        const nomesContratados = closeVagaCidadaoIds.map((cidId) =>
          closeVagaModal.candidaturas.find((c) => c.cidadao_id === cidId)?.profiles?.full_name ?? "Cidadão"
        );
        const resumoContratacao = nomesContratados.length > 0
          ? `Contratação confirmada: ${nomesContratados.join(", ")} foi(foram) contratado(s) para "${vaga.title}".`
          : `A vaga "${vaga.title}" foi encerrada sem contratação.`;
        
        const tituloNotif = nomesContratados.length > 0 ? "Vaga encerrada com contratação" : "Vaga encerrada";
        const mensagemNotif = `${vaga.company_name ?? "Empresa"} encerrou a vaga "${vaga.title}". ${resumoContratacao}`;
        
        console.log("[confirmCloseVaga] Chamando notificarRelevantes para admin/vereador/assessor...");
        console.log("[confirmCloseVaga] tipo=vaga_status, titulo=", tituloNotif);
        
        await notificarRelevantes(
          "vaga_status",
          tituloNotif,
          mensagemNotif,
          {
            remetenteNome: vaga.company_name ?? "Empresa",
            referenciaId: String(vaga.id),
            referenciaTipo: "vaga",
            excluirIds: cidadaoIds,
          }
        );
        
        console.log("[confirmCloseVaga] notificarRelevantes concluído com sucesso.");
      } catch (notifErr) {
        console.error("[confirmCloseVaga] ERRO ao notificar relevante:", notifErr);
        // NÃO engolir silenciosamente — loga o erro para diagnóstico
      }
    } catch (e) {
      console.error("[confirmCloseVaga] Erro:", e);
    } finally {
      setCloseVagaLoading(false);
      setCloseVagaModal(null);
    }
  };

  const deleteVaga = async (id: number) => {
    const vaga = vagas.find((v) => v.id === id);
    
    // Coletar cidadaos afetados ANTES de deletar — com status para filtrar rejeitados
    let cidadaoIds: string[] = [];
    let cidadaoIdsAtivos: string[] = [];
    if (vaga) {
      try {
        const { data: cands } = await supabase.from("candidaturas").select("cidadao_id, status").eq("vaga_id", id);
        const all = (cands ?? []) as { cidadao_id: string; status: string }[];
        // REGRA DE OURO: rejeitados não são notificados
        cidadaoIdsAtivos = all
          .filter((c) => c.status !== "rejected")
          .map((c) => c.cidadao_id)
          .filter((cid, i, arr) => arr.indexOf(cid) === i);
        cidadaoIds = all.map((c) => c.cidadao_id).filter((cid, i, arr) => arr.indexOf(cid) === i);
      } catch (_) { /* silent */ }
    }

    // Deletar candidaturas relacionadas primeiro
    await supabase.from("candidaturas").delete().eq("vaga_id", id);

    // Agora deletar a vaga
    const { error } = await supabase.from("vagas").delete().eq("id", id);
    if (!error) {
      setVagas((prev) => prev.filter((v) => v.id !== id));
      setConfirmDeleteId(null);
      
      // Notificar cidadãos que se candidataram + admin/vereador/assessor
      // REGRA DE OURO: cidadãos REJEITADOS não recebem mais notificações sobre esta vaga
      if (vaga) {
        try {
          for (const cidId of cidadaoIdsAtivos) {
            await criarNotificacao(
              cidId,
              "vaga_excluida",
              "Vaga removida",
              `A vaga "${vaga.title}" de ${vaga.company_name ?? "Empresa"} foi removida do sistema.`,
              undefined,
              vaga.company_name ?? "Empresa",
              String(id),
              "vaga"
            );
          }
          await notificarRelevantes(
            "vaga_excluida",
            "Vaga removida",
            `A vaga "${vaga.title}" de ${vaga.company_name ?? "Empresa"} foi removida do sistema.`,
            {
              remetenteNome: vaga.company_name ?? "Empresa",
              referenciaId: String(id),
              referenciaTipo: "vaga",
              excluirIds: cidadaoIds,
            }
          );
        } catch (_) { /* silent */ }
      }
    }
  };

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } catch (_) { /* ignore */ }
    clearStoredUser();
    Object.keys(localStorage).forEach((k) => { if (k.startsWith("sb-") || k.includes("supabase")) localStorage.removeItem(k); });
    Object.keys(sessionStorage).forEach((k) => { if (k.startsWith("sb-") || k.includes("supabase")) sessionStorage.removeItem(k); });
    navigate("/sistema");
  };

  const filteredCandidaturas = candidaturas.filter((c) => {
    const prof = c.profiles;
    const q = searchCurriculo.toLowerCase();
    const matchSearch = !searchCurriculo ||
      (prof?.full_name ?? "").toLowerCase().includes(q) ||
      (prof?.expertise ?? "").toLowerCase().includes(q) ||
      (prof?.education ?? "").toLowerCase().includes(q);
    const matchVaga = filterVaga === "all" || String(c.vaga_id) === filterVaga;
    const matchEdu = filterEducation === "Todos" || (prof?.education ?? "") === filterEducation;
    return matchSearch && matchVaga && matchEdu;
  });

  // Filtros para profissionais (todos cidadãos com perfil)
  const filteredProfissionais = profissionais.filter((p) => {
    const q = searchProfissional.toLowerCase();
    const matchSearch = !searchProfissional ||
      (p.full_name ?? "").toLowerCase().includes(q) ||
      (p.expertise ?? "").toLowerCase().includes(q) ||
      (p.education ?? "").toLowerCase().includes(q) ||
      (p.bio ?? "").toLowerCase().includes(q) ||
      (p.service_description ?? "").toLowerCase().includes(q);
    const matchArea = filterProfArea === "Todas" || (p.expertise ?? "") === filterProfArea;
    const matchServiceCat = filterServiceCat === "Todas" || (p.service_categories ?? "").includes(filterServiceCat);
    return matchSearch && matchArea && matchServiceCat;
  });

  // Áreas únicas para filtro de profissionais
  const profAreas = ["Todas", ...Array.from(new Set(profissionais.map((p) => p.expertise).filter(Boolean)))].slice(0, 15);

  // Categorias de serviço únicas
  const allServiceCats = ["Todas", ...Array.from(new Set(
    profissionais
      .filter((p) => p.is_service_provider && p.service_categories)
      .flatMap((p) => (p.service_categories ?? "").split(",").map((s) => s.trim()).filter(Boolean))
  ))];

  const getProfissionalAvatar = (p: CandidatoProfile) => p.avatar_url || p.profile_photo || null;

  const totalCandidaturas = candidaturas.length;

  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    active: { label: "Ativa", color: "#22C55E", bg: "rgba(34,197,94,0.12)" },
    paused: { label: "Pausada", color: "#E8A020", bg: "rgba(232,160,32,0.12)" },
    closed: { label: "Encerrada", color: "rgba(255,255,255,0.35)", bg: "rgba(255,255,255,0.06)" },
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0D1629" }}>
        <div className="w-10 h-10 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(59,191,212,0.3)", borderTopColor: "#3BBFD4" }}></div>
      </div>
    );
  }

  const tabs: { key: ActiveTab; label: string; icon: string; color: string; count?: number }[] = [
    { key: "vagas", label: "Minhas Vagas", icon: "ri-briefcase-line", color: "#E8A020", count: vagas.length },
    { key: "criar", label: editingVaga ? "Editar Vaga" : "Criar Anúncio", icon: "ri-megaphone-line", color: "#3BBFD4" },
    { key: "curriculos", label: "Banco de Currículos", icon: "ri-folder-user-line", color: "#22C55E", count: totalCandidaturas },
    { key: "mensagens", label: "Mensagens", icon: "ri-chat-3-line", color: "#7C3AED" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#0D1629" }}>
      {/* [NOVO] Loading Dialog Bloqueante — aparece durante publicação e sucesso */}
      {publishingVaga && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "rgba(13,22,41,0.92)", backdropFilter: "blur(8px)" }}>
          <div className="text-center max-w-sm px-6">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(232,160,32,0.15)", border: "2px solid rgba(232,160,32,0.30)" }}>
              <div className="w-8 h-8 border-2 border-[#E8A020]/30 border-t-[#E8A020] rounded-full animate-spin"></div>
            </div>
            <h3 className="text-white font-extrabold text-xl mb-2">Aguarde...</h3>
            <p className="text-white/50 text-sm">
              {vagaMsg === "success"
                ? "Sua vaga foi publicada! Redirecionando para o feed..."
                : uploadingVagaPhoto
                ? "Enviando foto da vaga..."
                : "Estamos publicando sua solicitação. Não feche esta página."}
            </p>
          </div>
        </div>
      )}

      {/* Top Nav */}
      <nav className="sticky top-0 z-50" style={{ background: "rgba(13,22,41,0.97)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="max-w-screen-xl mx-auto px-4 flex items-center justify-between h-14">
          <Link to="/sistema" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black" style={{ background: "linear-gradient(135deg, #E8A020, #f5b94a)", color: "#0D1629" }}>AH</div>
            <div className="hidden sm:block">
              <p className="text-white font-bold text-sm leading-tight">Oportunidades</p>
              <p className="text-white/35 text-xs">{profile?.company_name ?? "Empresa"}</p>
            </div>
          </Link>

          <div className="flex items-center gap-1.5 ml-auto">
            {user?.role === "admin" && (
              <Link to="/admin" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap" style={{ background: "rgba(232,160,32,0.15)", color: "#E8A020", border: "1px solid rgba(232,160,32,0.25)" }}>
                <i className="ri-shield-line"></i>
                <span className="hidden md:inline">Admin</span>
              </Link>
            )}
            <div data-tour="empresa-notificacoes">
              <NotificationBell userId={user?.id ?? null} userRole={user?.role ?? null} onNavigate={(path) => {
              if (path.includes("?tab=curriculos")) {
                setActiveTab("curriculos");
                setCurriculoView("candidaturas");
                // Preserva o parametro selected para auto-selecionar a candidatura
                const selMatch = path.match(/selected=([^&]+)/);
                const params: Record<string, string> = { tab: "curriculos" };
                if (selMatch) params.selected = selMatch[1];
                setSearchParams(params);
              } else if (path.includes("?tab=vagas")) {
                setActiveTab("vagas");
                setSearchParams({ tab: "vagas" });
              } else {
                navigate(path);
              }
            }} />
            </div>
            {/* Avatar da empresa com foto */}
            {(profile?.avatar_url || profile?.profile_photo) ? (
              <img
                src={profile?.avatar_url || profile?.profile_photo || ""}
                alt={profile?.company_name ?? "Empresa"}
                className="w-8 h-8 rounded-full object-cover object-top shrink-0 border border-white/10"
              />
            ) : (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "linear-gradient(135deg, #1B2A5E, #3BBFD4)", color: "white" }}>
                {(profile?.company_name ?? "E").charAt(0).toUpperCase()}
              </div>
            )}
            <button onClick={handleLogout} className="text-white/30 hover:text-white/60 cursor-pointer transition-colors ml-1" title="Sair">
              <i className="ri-logout-box-r-line text-lg"></i>
            </button>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="max-w-screen-xl mx-auto px-4 flex items-center gap-1 pb-0" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }} data-tour="empresa-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                if (tab.key !== "criar" && editingVaga) resetForm();
                setActiveTab(tab.key);
                setSearchParams({ tab: tab.key });
              }}
              className="flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-all cursor-pointer whitespace-nowrap relative"
              data-tour={
                tab.key === "criar" ? "empresa-criar" :
                tab.key === "curriculos" ? "empresa-curriculos" :
                tab.key === "mensagens" ? "empresa-mensagens" :
                undefined
              }
              style={activeTab === tab.key
                ? { color: tab.color }
                : { color: "rgba(255,255,255,0.40)" }}
            >
              <i className={`${tab.icon} text-base`}></i>
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: activeTab === tab.key ? tab.color : "rgba(255,255,255,0.10)", color: activeTab === tab.key ? "#0D1629" : "rgba(255,255,255,0.50)" }}>
                  {tab.count > 99 ? "99+" : tab.count}
                </span>
              )}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full" style={{ background: tab.color }}></span>
              )}
            </button>
          ))}
        </div>
      </nav>

      <div className="max-w-screen-xl mx-auto px-4 py-6">

        {/* ===== ABA: MINHAS VAGAS ===== */}
        {activeTab === "vagas" && (
          <div className="max-w-3xl mx-auto" data-tour="empresa-vagas-lista">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div>
                <h1 className="text-white font-extrabold text-2xl">Minhas Vagas</h1>
                <p className="text-white/40 text-sm mt-0.5">
                  <span className="text-white font-semibold">{vagas.filter((v) => v.status === "active").length}</span> ativas ·{" "}
                  <span>{vagas.length}</span> no total ·{" "}
                  <span className="text-white font-semibold">{totalCandidaturas}</span> candidatura{totalCandidaturas !== 1 ? "s" : ""} recebida{totalCandidaturas !== 1 ? "s" : ""}
                </p>
              </div>
              <button
                onClick={() => { resetForm(); setActiveTab("criar"); setSearchParams({ tab: "criar" }); }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap"
                style={{ background: "linear-gradient(135deg, #E8A020, #f5b94a)", color: "#0D1629" }}
              >
                <i className="ri-add-line text-base"></i> Criar novo anúncio
              </button>
            </div>

            {vagas.length === 0 ? (
              <div className="text-center py-16 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.10)" }}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(232,160,32,0.12)" }}>
                  <i className="ri-megaphone-line text-3xl" style={{ color: "#E8A020" }}></i>
                </div>
                <p className="text-white/50 font-semibold mb-2">Nenhuma vaga publicada ainda</p>
                <p className="text-white/25 text-sm mb-5 max-w-sm mx-auto">Crie seu primeiro anúncio e ele aparecerá no feed de todos os cidadãos</p>
                <button onClick={() => { resetForm(); setActiveTab("criar"); setSearchParams({ tab: "criar" }); }} className="px-6 py-3 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap" style={{ background: "linear-gradient(135deg, #E8A020, #f5b94a)", color: "#0D1629" }}>
                  <i className="ri-add-line mr-1.5"></i>Criar primeira vaga
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {vagas.map((vaga) => {
                  const sc = statusConfig[vaga.status] ?? statusConfig.closed;
                  const isDeleting = confirmDeleteId === vaga.id;
                  const countCands = candidaturasPorVaga(vaga.id);
                  return (
                    <div key={vaga.id} id={`vaga-card-${vaga.id}`} className="rounded-2xl overflow-hidden transition-all" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${vaga.status === "active" ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.08)"}` }}>
                      {/* Foto da vaga como capa */}
                      {vaga.image_url && (
                        <div className="w-full h-36 overflow-hidden">
                          <img src={vaga.image_url} alt={vaga.title} className="w-full h-full object-cover object-top" />
                        </div>
                      )}
                      <div className="flex flex-wrap items-start justify-between gap-4 p-5">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h3 className="text-white font-bold text-base">{vaga.title}</h3>
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                            <button
                              onClick={() => { setActiveTab("curriculos"); setSearchParams({ tab: "curriculos" }); setFilterVaga(String(vaga.id)); }}
                              className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full cursor-pointer whitespace-nowrap transition-all hover:opacity-80"
                              style={{ background: countCands > 0 ? "rgba(59,191,212,0.15)" : "rgba(255,255,255,0.06)", color: countCands > 0 ? "#3BBFD4" : "rgba(255,255,255,0.30)", border: countCands > 0 ? "1px solid rgba(59,191,212,0.25)" : "1px solid rgba(255,255,255,0.08)" }}
                            >
                              <i className="ri-user-received-line"></i>
                              {countCands} candidatura{countCands !== 1 ? "s" : ""}
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-white/40 mb-3">
                            {vaga.area && <span className="flex items-center gap-1"><i className="ri-list-check" style={{ color: "#3BBFD4" }}></i>{vaga.area}</span>}
                            <span className="flex items-center gap-1"><i className="ri-map-pin-line" style={{ color: "#3BBFD4" }}></i>{vaga.location ?? "Pelotas/RS"}</span>
                            <span className="flex items-center gap-1"><i className="ri-file-text-line" style={{ color: "#E8A020" }}></i>{vaga.type}</span>
                            {vaga.salary && <span className="flex items-center gap-1"><i className="ri-money-dollar-circle-line text-green-400"></i>{vaga.salary}</span>}
                            <span className="flex items-center gap-1 text-white/25"><i className="ri-time-line"></i>{timeAgo(vaga.created_at)}</span>
                          </div>
                          {vaga.description && <p className="text-white/40 text-sm line-clamp-2 leading-relaxed">{vaga.description}</p>}
                        </div>

                        <div className="flex flex-col gap-2 shrink-0 min-w-[90px]">
                          {!isDeleting ? (
                            <>
                              {/* [NOVO] Botões de compartilhamento */}
                              <div className="flex items-center gap-1 mb-1">
                                <button
                                  onClick={() => shareVaga(vaga, "instagram")}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                                  style={{ background: "rgba(225,48,108,0.15)", color: "#E1306C" }}
                                  title="Compartilhar no Instagram"
                                >
                                  <i className="ri-instagram-line text-sm"></i>
                                </button>
                                <button
                                  onClick={() => shareVaga(vaga, "whatsapp")}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                                  style={{ background: "rgba(37,211,102,0.15)", color: "#25D366" }}
                                  title="Compartilhar no WhatsApp"
                                >
                                  <i className="ri-whatsapp-line text-sm"></i>
                                </button>
                                <button
                                  onClick={() => shareVaga(vaga, "share")}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                                  style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.50)" }}
                                  title="Compartilhar"
                                >
                                  <i className="ri-share-forward-line text-sm"></i>
                                </button>
                              </div>
                              {vaga.status !== "closed" && (
                                <>
                                  <button onClick={() => openEditForm(vaga)} className="px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap text-center" style={{ background: "rgba(232,160,32,0.12)", color: "#E8A020", border: "1px solid rgba(232,160,32,0.25)" }}>
                                    <i className="ri-edit-line mr-1"></i>Editar
                                  </button>
                                  <button onClick={() => toggleVagaStatus(vaga)} className="px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap text-center" style={{ background: "rgba(59,191,212,0.12)", color: "#3BBFD4", border: "1px solid rgba(59,191,212,0.25)" }}>
                                    {vaga.status === "active" ? "Pausar" : "Reativar"}
                                  </button>
                                  <button onClick={() => closeVaga(vaga.id)} className="px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap text-center" style={{ background: "rgba(239,68,68,0.08)", color: "#F87171", border: "1px solid rgba(239,68,68,0.18)" }}>
                                    Encerrar
                                  </button>
                                </>
                              )}
                              <button onClick={() => setConfirmDeleteId(vaga.id)} className="px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap text-center" style={{ background: "rgba(239,68,68,0.05)", color: "rgba(248,113,113,0.50)", border: "1px solid rgba(239,68,68,0.12)" }}>
                                <i className="ri-delete-bin-line mr-1"></i>Excluir
                              </button>
                            </>
                          ) : (
                            <div className="p-3 rounded-xl text-center" style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.25)" }}>
                              <p className="text-red-400 text-xs font-bold mb-2">Confirmar exclusão?</p>
                              <p className="text-white/35 text-xs mb-3">Esta ação é permanente.</p>
                              <div className="flex flex-col gap-1.5">
                                <button onClick={() => deleteVaga(vaga.id)} className="w-full py-1.5 rounded-lg text-xs font-bold cursor-pointer text-white" style={{ background: "rgba(239,68,68,0.40)" }}>Sim, excluir</button>
                                <button onClick={() => setConfirmDeleteId(null)} className="w-full py-1.5 rounded-lg text-xs font-bold cursor-pointer" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.55)" }}>Cancelar</button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== ABA: CRIAR / EDITAR ANÚNCIO ===== */}
        {activeTab === "criar" && (
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(59,191,212,0.15)" }}>
                <i className="ri-megaphone-line text-xl" style={{ color: "#3BBFD4" }}></i>
              </div>
              <div>
                <h1 className="text-white font-extrabold text-2xl">{editingVaga ? "Editar Vaga" : "Publicar Novo Anúncio"}</h1>
                <p className="text-white/40 text-sm">Aparece imediatamente no feed de todos os cidadãos</p>
              </div>
            </div>

            <div className="rounded-3xl overflow-hidden" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(59,191,212,0.20)" }}>
              <div className="p-6 space-y-5">
                {vagaMsg === "success" && (
                  <div className="p-4 rounded-xl text-green-400 text-sm flex items-center gap-2" style={{ background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.20)" }}>
                    <i className="ri-checkbox-circle-line text-lg"></i>
                    {editingVaga ? "Vaga atualizada com sucesso! Redirecionando..." : "Vaga publicada! Já aparece para os cidadãos. Redirecionando..."}
                  </div>
                )}
                {vagaMsg && vagaMsg !== "success" && (
                  <div className="p-4 rounded-xl text-red-400 text-sm flex items-center gap-2" style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.20)" }}>
                    <i className="ri-error-warning-line"></i>{vagaMsg}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Título da Vaga *</label>
                  <input
                    type="text"
                    value={vagaForm.title}
                    onChange={(e) => setVagaForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="Ex: Auxiliar Administrativo, Motorista CNH B, Cozinheiro..."
                    required
                    className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Área</label>
                    <DropdownFilter
                      options={AREAS.map((a) => ({ value: a, label: a }))}
                      value={vagaForm.area}
                      onChange={(v) => setVagaForm((p) => ({ ...p, area: v }))}
                      placeholder="Selecionar área"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Tipo de Contrato</label>
                    <DropdownFilter
                      options={TYPES.map((t) => ({ value: t, label: t }))}
                      value={vagaForm.type}
                      onChange={(v) => setVagaForm((p) => ({ ...p, type: v }))}
                      placeholder="Selecionar tipo"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Localidade</label>
                    <input
                      type="text"
                      value={vagaForm.location}
                      onChange={(e) => setVagaForm((p) => ({ ...p, location: e.target.value }))}
                      className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                      style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Salário / Faixa</label>
                    <div className="flex items-stretch rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.12)" }}>
                      <span className="flex items-center px-3 text-sm font-bold text-white/70" style={{ background: "rgba(255,255,255,0.06)" }}>R$</span>
                      <input
                        type="text"
                        value={vagaForm.salary}
                        onChange={(e) => setVagaForm((p) => ({ ...p, salary: e.target.value }))}
                        placeholder="1.800,00 ou A combinar"
                        className="flex-1 px-4 py-3 text-sm text-white focus:outline-none"
                        style={{ background: "rgba(255,255,255,0.08)" }}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Descrição da Vaga</label>
                  <textarea
                    value={vagaForm.description}
                    onChange={(e) => setVagaForm((p) => ({ ...p, description: e.target.value }))}
                    rows={5}
                    maxLength={500}
                    placeholder="Descreva as responsabilidades, rotina, benefícios e diferenciais da vaga..."
                    className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none resize-none"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
                  />
                  <p className="text-white/25 text-xs mt-1 text-right">{vagaForm.description.length}/500</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Requisitos</label>
                  <textarea
                    value={vagaForm.requirements}
                    onChange={(e) => setVagaForm((p) => ({ ...p, requirements: e.target.value }))}
                    rows={4}
                    maxLength={500}
                    placeholder="Ex: Ensino médio completo, experiência com atendimento ao público, CNH categoria B..."
                    className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none resize-none"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
                  />
                  <p className="text-white/25 text-xs mt-1 text-right">{vagaForm.requirements.length}/500</p>
                </div>

                {/* Foto da vaga */}
                <div>
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">
                    Foto da Vaga <span className="text-white/25 normal-case font-normal">(opcional — aparece como capa no feed)</span>
                  </label>
                  {/* Foto existente ou preview novo */}
                  {vagaPhotoPreview ? (
                    <div className="relative w-full h-40 rounded-xl overflow-hidden mb-2 border border-white/10">
                      <img
                        src={vagaPhotoPreview}
                        alt="Nova foto da vaga"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => { setVagaPhotoFile(null); setVagaPhotoPreview(null); }}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
                        style={{ background: "rgba(0,0,0,0.60)", color: "white" }}
                      >
                        <i className="ri-close-line"></i>
                      </button>
                      <span className="absolute bottom-2 left-2 px-2 py-1 rounded-lg text-xs font-bold" style={{ background: "rgba(59,191,212,0.90)", color: "white" }}>
                        Nova foto
                      </span>
                    </div>
                  ) : editingVaga?.image_url ? (
                    <div className="relative w-full h-40 rounded-xl overflow-hidden mb-2 border border-white/10">
                      <img
                        src={editingVaga.image_url}
                        alt="Foto atual da vaga"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-2 left-2 px-2 py-1 rounded-lg text-xs font-bold" style={{ background: "rgba(0,0,0,0.60)", color: "rgba(255,255,255,0.80)" }}>
                        Foto atual
                      </span>
                      <button
                        type="button"
                        onClick={() => vagaPhotoRef.current?.click()}
                        className="absolute top-2 right-2 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
                        style={{ background: "rgba(232,160,32,0.90)", color: "#0D1629" }}
                      >
                        <i className="ri-image-edit-line mr-1"></i>Trocar foto
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => vagaPhotoRef.current?.click()}
                      className="w-full flex flex-col items-center justify-center gap-2 p-6 rounded-xl cursor-pointer transition-all"
                      style={{ background: "rgba(255,255,255,0.04)", border: "2px dashed rgba(255,255,255,0.12)" }}
                    >
                      <i className="ri-image-add-line text-2xl text-white/25"></i>
                      <span className="text-white/40 text-sm font-semibold">Adicionar foto da vaga</span>
                      <span className="text-white/20 text-xs">JPG, PNG ou WEBP · Máx. 5MB</span>
                    </button>
                  )}
                  <input
                    ref={vagaPhotoRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleVagaPhotoSelect}
                    className="hidden"
                  />
                  {vagaPhotoFile && (
                    <p className="text-white/30 text-xs mt-2 flex items-center gap-1">
                      <i className="ri-image-line"></i>
                      {vagaPhotoFile.name} — será enviada ao publicar
                    </p>
                  )}
                </div>

                {!showPublishConfirm && !editingVaga && (
                  <>
                    <div className="flex gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => { resetForm(); setActiveTab("vagas"); setSearchParams({ tab: "vagas" }); }}
                        className="flex-1 py-3.5 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap"
                        style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.10)" }}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={!vagaForm.title.trim()}
                        onClick={() => setShowPublishConfirm(true)}
                        className="flex-[2] flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap disabled:opacity-50"
                        style={{ background: "linear-gradient(135deg, #E8A020, #f5b94a)", color: "#0D1629" }}
                      >
                        <i className="ri-eye-line"></i> Revisar e Publicar
                      </button>
                    </div>
                  </>
                )}

                {showPublishConfirm && !editingVaga && (
                  <>
                    {/* Resumo de confirmação */}
                    <div className="p-4 rounded-xl space-y-2" style={{ background: "rgba(232,160,32,0.10)", border: "1px solid rgba(232,160,32,0.25)" }}>
                      <p className="text-white/60 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <i className="ri-alert-line" style={{ color: "#E8A020" }}></i> Confirme os dados da vaga
                      </p>
                      <div className="space-y-1.5 text-sm">
                        <p className="text-white font-bold">{vagaForm.title || "(sem título)"}</p>
                        <p className="text-white/45 text-xs">
                          <span className="text-white/60 font-semibold">{vagaForm.area}</span> · {vagaForm.type} · {vagaForm.location || "Pelotas/RS"}
                          {vagaForm.salary && <> · {vagaForm.salary}</>}
                        </p>
                        {vagaForm.description && (
                          <p className="text-white/35 text-xs leading-relaxed line-clamp-2 mt-1">{vagaForm.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowPublishConfirm(false)}
                        className="flex-1 py-3.5 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap"
                        style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.10)" }}
                      >
                        <i className="ri-arrow-left-line mr-1"></i> Voltar e editar
                      </button>
                      <button
                        type="button"
                        onClick={handlePostVaga}
                        disabled={savingVaga || uploadingVagaPhoto || !vagaForm.title.trim()}
                        className="flex-[2] flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap disabled:opacity-50"
                        style={{ background: "linear-gradient(135deg, #22C55E, #16A34A)", color: "white" }}
                      >
                        {savingVaga ? (
                          <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> {uploadingVagaPhoto ? "Enviando foto..." : "Publicando..."}</>
                        ) : (
                          <><i className="ri-check-double-line"></i> Confirmar Publicação</>
                        )}
                      </button>
                    </div>
                  </>
                )}

                {editingVaga && (
                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => { resetForm(); setActiveTab("vagas"); setSearchParams({ tab: "vagas" }); }}
                      className="flex-1 py-3.5 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap"
                      style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.10)" }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handlePostVaga}
                      disabled={savingVaga || uploadingVagaPhoto || !vagaForm.title.trim()}
                      className="flex-[2] flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg, #E8A020, #f5b94a)", color: "#0D1629" }}
                    >
                      {savingVaga ? (
                        <><div className="w-4 h-4 border-2 border-[#0D1629]/30 border-t-[#0D1629] rounded-full animate-spin"></div> {uploadingVagaPhoto ? "Enviando foto..." : "Salvando..."}</>
                      ) : (
                        <><i className="ri-save-line"></i> Salvar alterações</>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===== ABA: BANCO DE CURRÍCULOS ===== */}
        {activeTab === "curriculos" && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <h1 className="text-white font-extrabold text-2xl">Banco de Talentos</h1>
                <p className="text-white/40 text-sm mt-0.5">
                  {curriculoView === "candidaturas" ? (
                    <><span className="text-white font-semibold">{filteredCandidaturas.length}</span> candidatura{filteredCandidaturas.length !== 1 ? "s" : ""} ·{" "}
                    <span className="font-semibold" style={{ color: "#22C55E" }}>{candidaturas.filter((c) => c.curriculo_url).length}</span> com currículo anexado</>
                  ) : (
                    <><span className="text-white font-semibold">{filteredProfissionais.length}</span> profissional{filteredProfissionais.length !== 1 ? "is" : ""} disponível{filteredProfissionais.length !== 1 ? "is" : ""} ·{" "}
                    <span className="font-semibold" style={{ color: "#3BBFD4" }}>{profissionais.length}</span> no total</>
                  )}
                </p>
              </div>
            </div>

            {/* Toggle: Candidaturas | Profissionais */}
            <div className="mb-5 w-full sm:w-fit" style={{ overflow: 'visible' }}>
              <div className="flex items-stretch gap-1.5 p-1.5 rounded-2xl w-full" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <button
                  onClick={() => { setCurriculoView("candidaturas"); setSelectedProfissional(null); }}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer whitespace-nowrap"
                  style={curriculoView === "candidaturas" ? { background: "linear-gradient(135deg, #1B2A5E, #3BBFD4)" } : { color: "rgba(255,255,255,0.45)" }}
                >
                  <i className="ri-user-received-line"></i>
                  <span className="hidden sm:inline">Minhas Candidaturas</span>
                  <span className="sm:hidden">Candidaturas</span>
                  {candidaturas.length > 0 && <span className="ml-1 text-xs opacity-60">({candidaturas.length})</span>}
                </button>
                <button
                  onClick={() => { setCurriculoView("profissionais"); setSelectedCandidatura(null); }}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer whitespace-nowrap"
                  style={curriculoView === "profissionais" ? { background: "linear-gradient(135deg, #E8A020, #f5b94a)", color: "#0D1629" } : { color: "rgba(255,255,255,0.45)" }}
                >
                  <i className="ri-team-line"></i>
                  <span className="hidden sm:inline">Todos Profissionais</span>
                  <span className="sm:hidden">Profissionais</span>
                  <span className="ml-1 text-xs opacity-60">({profissionais.length})</span>
                </button>
              </div>
            </div>

            {/* Filtros - Candidaturas */}
            {curriculoView === "candidaturas" && (
            <div className="mb-5 p-4 rounded-2xl flex flex-wrap gap-3 items-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center gap-2">
                <i className="ri-filter-3-line text-white/30 text-sm"></i>
                <span className="text-white/40 text-xs font-bold uppercase tracking-wider">Filtrar por</span>
              </div>
              <DropdownFilter
                options={[{ value: "all", label: "Todas as vagas" }, ...vagas.map((v) => ({ value: String(v.id), label: `${v.title} (${candidaturasPorVaga(v.id)})` }))]}
                value={filterVaga}
                onChange={setFilterVaga}
                placeholder="Todas as vagas"
                icon="ri-briefcase-line"
              />
              <DropdownFilter
                options={EDUCATION_LEVELS.map((e) => ({ value: e, label: e === "Todos" ? "Qualquer formação" : e }))}
                value={filterEducation}
                onChange={setFilterEducation}
                placeholder="Qualquer formação"
                icon="ri-graduation-cap-line"
              />
              <div className="relative ml-auto">
                <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm"></i>
                <input
                  type="text"
                  placeholder="Buscar nome, área..."
                  value={searchCurriculo}
                  onChange={(e) => setSearchCurriculo(e.target.value)}
                  className="pl-9 pr-4 py-2 rounded-xl text-xs text-white focus:outline-none w-52"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.10)" }}
                />
              </div>
              {(filterVaga !== "all" || filterEducation !== "Todos" || searchCurriculo) && (
                <button
                  onClick={() => { setFilterVaga("all"); setFilterEducation("Todos"); setSearchCurriculo(""); }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer whitespace-nowrap"
                  style={{ background: "rgba(239,68,68,0.10)", color: "#F87171", border: "1px solid rgba(239,68,68,0.20)" }}
                >
                  <i className="ri-close-line"></i> Limpar
                </button>
              )}
            </div>
            )}

            {/* Filtros - Profissionais */}
            {curriculoView === "profissionais" && (
            <div className="mb-5 p-4 rounded-2xl flex flex-wrap gap-3 items-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center gap-2">
                <i className="ri-filter-3-line text-white/30 text-sm"></i>
                <span className="text-white/40 text-xs font-bold uppercase tracking-wider">Área</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {profAreas.map((area) => (
                  <button
                    key={area}
                    onClick={() => setFilterProfArea(area)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap"
                    style={filterProfArea === area
                      ? { background: "#E8A020", color: "#0D1629" }
                      : { background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.50)", border: "1px solid rgba(255,255,255,0.10)" }}
                  >
                    {area}
                  </button>
                ))}
              </div>
              {allServiceCats.length > 1 && (
                <>
                  <div className="w-full border-t my-1" style={{ borderColor: "rgba(255,255,255,0.06)" }}></div>
                  <div className="flex items-center gap-2">
                    <i className="ri-tools-line text-white/30 text-sm"></i>
                    <span className="text-white/40 text-xs font-bold uppercase tracking-wider">Prestador</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {allServiceCats.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setFilterServiceCat(cat)}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap"
                        style={filterServiceCat === cat
                          ? { background: "#22C55E", color: "#0D1629" }
                          : { background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.50)", border: "1px solid rgba(255,255,255,0.10)" }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <div className="relative ml-auto">
                <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm"></i>
                <input
                  type="text"
                  placeholder="Buscar nome, área, formação..."
                  value={searchProfissional}
                  onChange={(e) => setSearchProfissional(e.target.value)}
                  className="pl-9 pr-4 py-2 rounded-xl text-xs text-white focus:outline-none w-64"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.10)" }}
                />
              </div>
              {(filterProfArea !== "Todas" || searchProfissional || filterServiceCat !== "Todas") && (
                <button
                  onClick={() => { setFilterProfArea("Todas"); setSearchProfissional(""); setFilterServiceCat("Todas"); }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer whitespace-nowrap"
                  style={{ background: "rgba(239,68,68,0.10)", color: "#F87171", border: "1px solid rgba(239,68,68,0.20)" }}
                >
                  <i className="ri-close-line"></i> Limpar
                </button>
              )}
            </div>
            )}

            {/* CANDIDATURAS VIEW */}
            {curriculoView === "candidaturas" && (
            <div className="grid lg:grid-cols-5 gap-5">
              <div className="lg:col-span-2 rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="p-4 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                  <p className="text-white/50 text-sm font-semibold">{filteredCandidaturas.length} candidatura{filteredCandidaturas.length !== 1 ? "s" : ""}</p>
                </div>
                <div className="overflow-y-auto" style={{ maxHeight: "600px" }}>
                  {filteredCandidaturas.length === 0 ? (
                    <div className="py-12 text-center px-4">
                      <i className="ri-folder-user-line text-white/10 text-4xl mb-3 block"></i>
                      <p className="text-white/30 text-sm">Nenhuma candidatura encontrada</p>
                    </div>
                  ) : filteredCandidaturas.map((c) => {
                    const prof = c.profiles;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCandidatura(selectedCandidatura?.id === c.id ? null : c)}
                        className="w-full text-left flex items-center gap-3 px-4 py-3.5 transition-colors cursor-pointer border-b"
                        style={selectedCandidatura?.id === c.id
                          ? { background: "rgba(59,191,212,0.10)", borderColor: "rgba(255,255,255,0.05)" }
                          : { borderColor: "rgba(255,255,255,0.05)" }}
                      >
                        {getCandidatoAvatar(prof) ? (
                          <img
                            src={getCandidatoAvatar(prof)!}
                            alt={prof?.full_name ?? "Candidato"}
                            className="w-10 h-10 rounded-xl object-cover object-top shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0" style={{ background: "rgba(59,191,212,0.15)", color: "#3BBFD4" }}>
                            {(prof?.full_name ?? "?").charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold text-sm truncate">{prof?.full_name ?? "Sem nome"}</p>
                          <p className="text-white/35 text-xs truncate">{c.vagas?.title ?? "Vaga"}</p>
                          {c.curriculo_url && (
                            <span className="text-xs font-bold" style={{ color: "#22C55E" }}>
                              <i className="ri-attachment-2 mr-0.5"></i>Currículo
                            </span>
                          )}
                        </div>
                        <span className="text-white/20 text-xs shrink-0">{timeAgo(c.created_at)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-3">
                {selectedCandidatura ? (
                  <CandidaturaDetail key={selectedCandidatura.id} candidatura={selectedCandidatura} onUpdate={() => refreshData(userIdRef.current || user?.id || "")} companyName={profile?.company_name ?? "Empresa"} />
                ) : (
                  <div className="flex items-center justify-center rounded-2xl" style={{ minHeight: "400px", background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.10)" }}>
                    <div className="text-center p-8">
                      <i className="ri-user-search-line text-white/10 text-5xl mb-3 block"></i>
                      <p className="text-white/30 font-semibold">Selecione uma candidatura</p>
                      <p className="text-white/20 text-sm mt-1">para ver o currículo completo</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}

            {/* PROFISSIONAIS VIEW */}
            {curriculoView === "profissionais" && (
            <div className="grid lg:grid-cols-5 gap-5">
              <div className="lg:col-span-2 rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="p-4 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                  <p className="text-white/50 text-sm font-semibold">{filteredProfissionais.length} profissional{filteredProfissionais.length !== 1 ? "is" : ""}</p>
                </div>
                <div className="overflow-y-auto" style={{ maxHeight: "600px" }}>
                  {filteredProfissionais.length === 0 ? (
                    <div className="py-12 text-center px-4">
                      <i className="ri-team-line text-white/10 text-4xl mb-3 block"></i>
                      <p className="text-white/30 text-sm">Nenhum profissional encontrado</p>
                    </div>
                  ) : filteredProfissionais.map((p) => {
                    const avatar = getProfissionalAvatar(p);
                    return (
                      <button
                        key={p.id}
                        onClick={() => setSelectedProfissional(selectedProfissional?.id === p.id ? null : p)}
                        className="w-full text-left flex items-center gap-3 px-4 py-3.5 transition-colors cursor-pointer border-b"
                        style={selectedProfissional?.id === p.id
                          ? { background: "rgba(232,160,32,0.12)", borderColor: "rgba(255,255,255,0.05)" }
                          : { borderColor: "rgba(255,255,255,0.05)" }}
                      >
                        {avatar ? (
                          <img
                            src={avatar}
                            alt={p.full_name ?? "Profissional"}
                            className="w-11 h-11 rounded-xl object-cover object-top shrink-0 border border-white/10"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0" style={{ background: "rgba(232,160,32,0.20)", color: "#E8A020" }}>
                            {(p.full_name ?? "?").charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold text-sm truncate">{p.full_name ?? "Sem nome"}</p>
                          {p.expertise && <p className="text-white/45 text-xs truncate">{p.expertise}</p>}
                          {p.education && <p className="text-white/25 text-xs truncate">{p.education}</p>}
                          {p.is_service_provider && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold mt-1 px-2 py-0.5 rounded-full" style={{ background: "rgba(34,197,94,0.15)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.25)" }}>
                              <i className="ri-tools-line text-xs"></i>Prestador
                            </span>
                          )}
                        </div>
                        {p.job_status !== "not_looking" ? (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ background: "rgba(232,160,32,0.15)", color: "#E8A020" }}>Buscando</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{ background: "rgba(34,197,94,0.12)", color: "#22C55E" }}>Empregado</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-3">
                {selectedProfissional ? (
                  <ProfissionalDetail profissional={selectedProfissional} />
                ) : (
                  <div className="flex items-center justify-center rounded-2xl" style={{ minHeight: "400px", background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.10)" }}>
                    <div className="text-center p-8">
                      <i className="ri-team-line text-white/10 text-5xl mb-3 block"></i>
                      <p className="text-white/30 font-semibold">Selecione um profissional</p>
                      <p className="text-white/20 text-sm mt-1">para ver detalhes e currículo</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}
          </div>
        )}

        {/* ===== ABA: MENSAGENS (Chat com o Gabinete) ===== */}
        {activeTab === "mensagens" && user && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(124,58,237,0.15)" }}>
                <i className="ri-chat-3-line text-xl" style={{ color: "#A78BFA" }}></i>
              </div>
              <div>
                <h1 className="text-white font-extrabold text-2xl">Mensagens</h1>
                <p className="text-white/40 text-sm">Converse diretamente com a equipe do Vereador Arthur Halal</p>
              </div>
            </div>
            <EmpresaChat userId={user.id} companyName={profile?.company_name ?? "Empresa"} />
          </div>
        )}
      </div>

      {/* Modal de encerramento de vaga com registro de contratacao */}
      {closeVagaModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setCloseVagaModal(null)}>
          <div className="rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()} style={{ background: "#1a233a", border: "1px solid rgba(255,255,255,0.15)" }}>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(232,160,32,0.15)" }}>
                  <i className="ri-close-circle-line text-xl" style={{ color: "#E8A020" }}></i>
                </div>
                <div>
                  <h3 className="text-white font-extrabold text-base">Encerrar Vaga</h3>
                  <p className="text-white/40 text-sm">{closeVagaModal.vaga.title}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">
                    Houve contratacao para esta vaga?
                  </label>
                  <select
                    value={closeVagaResultado}
                    onChange={(e) => {
                      setCloseVagaResultado(e.target.value);
                      if (e.target.value !== "contratado") setCloseVagaCidadaoIds([]);
                    }}
                    className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none cursor-pointer"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
                  >
                    <option value="" style={{ background: "#0D1629", color: "white" }}>Selecione...</option>
                    <option value="contratado" style={{ background: "#0D1629", color: "white" }}>Sim, contratei alguem</option>
                    <option value="sem_contratacao" style={{ background: "#0D1629", color: "white" }}>Nao houve contratacao</option>
                    <option value="vaga_cancelada" style={{ background: "#0D1629", color: "white" }}>Vaga cancelada (nao sera preenchida)</option>
                  </select>
                </div>

                {closeVagaResultado === "contratado" && (
                  <div>
                    <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">
                      Quem foi contratado? <span className="text-white/30 font-normal normal-case">(pode selecionar mais de um)</span>
                    </label>
                    {closeVagaModal.candidaturas.length === 0 ? (
                      <p className="text-white/30 text-sm">Nenhuma candidatura para esta vaga.</p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {closeVagaModal.candidaturas.map((cand) => {
                          const isSelected = closeVagaCidadaoIds.includes(cand.cidadao_id);
                          return (
                            <button
                              key={cand.id}
                              onClick={() => setCloseVagaCidadaoIds((prev) =>
                                prev.includes(cand.cidadao_id)
                                  ? prev.filter((id) => id !== cand.cidadao_id)
                                  : [...prev, cand.cidadao_id]
                              )}
                              className={`w-full text-left flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer border ${
                                isSelected
                                  ? "border-[#22C55E] bg-[#22C55E]/10"
                                  : "border-white/10 hover:bg-white/5"
                              }`}
                            >
                              {/* Checkbox visual */}
                              <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all ${
                                isSelected ? "bg-[#22C55E] border-[#22C55E]" : "bg-white/5 border border-white/20"
                              }`}>
                                {isSelected && <i className="ri-check-line text-white text-xs"></i>}
                              </div>
                              <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "rgba(59,191,212,0.15)", color: "#3BBFD4" }}>
                                {(cand.profiles?.full_name ?? "?").charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-white text-sm font-semibold truncate">{cand.profiles?.full_name ?? "Candidato"}</p>
                                <p className="text-white/35 text-xs">{cand.profiles?.expertise ?? "Sem area"}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {closeVagaCidadaoIds.length > 0 && (
                      <p className="text-xs mt-2 font-semibold" style={{ color: "#22C55E" }}>
                        <i className="ri-checkbox-circle-fill mr-1"></i>
                        {closeVagaCidadaoIds.length} pessoa{closeVagaCidadaoIds.length > 1 ? "s" : ""} selecionada{closeVagaCidadaoIds.length > 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-white/10">
                <button
                  onClick={() => setCloseVagaModal(null)}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)" }}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmCloseVaga}
                  disabled={closeVagaLoading || !closeVagaResultado || (closeVagaResultado === "contratado" && closeVagaCidadaoIds.length === 0)}
                  className="flex-1 py-3 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap disabled:opacity-40"
                  style={{ background: "#DC2626", color: "white" }}
                >
                  {closeVagaLoading ? "Encerrando..." : "Confirmar Encerramento"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botão flutuante "?" — sempre disponível para iniciar/rever o tour */}
      {/* Ao clicar, redireciona para vagas ANTES de iniciar para garantir que todos os elementos estejam visíveis */}
      {!tour.isActive && (
        <button
          onClick={() => tour.startTour(() => {
            if (editingVaga) resetForm();
            setActiveTab("vagas");
            setSearchParams({ tab: "vagas" });
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
        tourName={empresaTour.name}
        onNext={tour.nextStep}
        onPrev={tour.prevStep}
        onSkip={tour.skipTour}
        onFinish={tour.finishTour}
      />
    </div>
  );
}

function CandidaturaDetail({ candidatura, onUpdate, companyName }: { candidatura: Candidatura; onUpdate: () => void; companyName: string }) {
  const prof = candidatura.profiles;
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [localStatus, setLocalStatus] = useState(candidatura.status);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const avatarUrl = getCandidatoAvatar(prof);
  const isProcessingRef = useRef(false);

  const handleApprove = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Proteção atômica contra race condition (cliques duplos)
    if (isProcessingRef.current) return;
    if (localStatus === "accepted" || localStatus === "rejected") return;
    isProcessingRef.current = true;
    setActionLoading(true);
    setActionMsg("");

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 5);
    const { data, error } = await supabase
      .from("candidaturas")
      .update({
        status: "accepted",
        updated_at: new Date().toISOString(),
        empresa_contacted_at: new Date().toISOString(),
        empresa_contact_deadline: deadline.toISOString(),
      })
      .eq("id", candidatura.id)
      .select("id, status");

    if (error) {
      console.error("[APROVAR] Erro Supabase:", error);
      setActionMsg(`Erro ao aprovar: ${error.message}`);
      isProcessingRef.current = false;
      setActionLoading(false);
      return;
    }
    if (!data || data.length === 0) {
      console.error("[APROVAR] Nenhuma linha afetada — RLS bloqueou?");
      setActionMsg("Erro: permissão negada. Verifique se você é dono da vaga.");
      isProcessingRef.current = false;
      setActionLoading(false);
      return;
    }

    setLocalStatus("accepted");
    setActionMsg("Candidato aprovado!");
    onUpdate();

    // ITEM 07 FIX: NAO chamamos update-citizen-profile aqui porque aprovacao != contratacao.
    // O job_status="employed" so e setado quando a vaga e encerrada com contratacao confirmada
    // (confirmCloseVaga). Isso garante que a taxa de empregabilidade reflita apenas contratacoes reais.
    // Aprovacao significa que o candidato passou na triagem — a contratacao so ocorre no encerramento da vaga.

    // Notificar o cidadão — com proteção anti-duplicata + email
    if (candidatura.cidadao_id) {
      const cidadaoEmail = candidatura.profiles?.email ?? null;

      const jaNotificado = await verificarNotificacaoExistente(
        candidatura.cidadao_id,
        "aprovacao",
        String(candidatura.vaga_id),
        60
      );
      if (!jaNotificado) {
        await criarNotificacao(
          candidatura.cidadao_id,
          "aprovacao",
          "Candidatura aprovada",
          `Sua candidatura para "${candidatura.vagas?.title ?? "Vaga"}" foi aprovada! A empresa entrará em contato em até 5 dias úteis. Fique atento às suas notificações.`,
          undefined,
          companyName,
          String(candidatura.id),
          "candidatura",
          { recipientEmail: cidadaoEmail }
        );
      }

      // Notificar admin/vereador/assessor sobre a aprovação
      console.log("[handleApprove] Calling notificarRelevantes for aprovacao...");
      await notificarRelevantes(
        "aprovacao",
        "Candidatura aprovada",
        `Candidatura de "${candidatura.profiles?.full_name ?? "Candidato"}" para "${candidatura.vagas?.title ?? "Vaga"}" foi aprovada.`,
        {
          remetenteNome: companyName,
          referenciaId: String(candidatura.id),
          referenciaTipo: "candidatura",
          excluirIds: [candidatura.cidadao_id],
        }
      );
      console.log("[handleApprove] notificarRelevantes completed.");
    }

    isProcessingRef.current = false;
    setActionLoading(false);
  };

  const handleReject = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!rejectReason.trim()) {
      setActionMsg("Informe o motivo da recusa.");
      return;
    }
    if (isProcessingRef.current) return;
    if (localStatus === "accepted" || localStatus === "rejected") return;
    isProcessingRef.current = true;
    setActionLoading(true);
    setActionMsg("");

    const { data, error } = await supabase
      .from("candidaturas")
      .update({ status: "rejected", rejection_reason: rejectReason.trim(), updated_at: new Date().toISOString() })
      .eq("id", candidatura.id)
      .select("id, status");

    if (error) {
      console.error("[RECUSAR] Erro Supabase:", error);
      setActionMsg(`Erro ao recusar: ${error.message}`);
      isProcessingRef.current = false;
      setActionLoading(false);
      return;
    }
    if (!data || data.length === 0) {
      console.error("[RECUSAR] Nenhuma linha afetada — RLS bloqueou?");
      setActionMsg("Erro: permissão negada. Verifique se você é dono da vaga.");
      isProcessingRef.current = false;
      setActionLoading(false);
      return;
    }

    setLocalStatus("rejected");
    setShowReject(false);
    setActionMsg("Candidato recusado.");
    onUpdate();

    // Notificar o cidadão — com proteção anti-duplicata + email
    if (candidatura.cidadao_id) {
      const cidadaoEmail = candidatura.profiles?.email ?? null;

      const jaNotificado = await verificarNotificacaoExistente(
        candidatura.cidadao_id,
        "candidatura_recusada",
        String(candidatura.vaga_id),
        60
      );
      if (!jaNotificado) {
        await criarNotificacao(
          candidatura.cidadao_id,
          "candidatura_recusada",
          "Candidatura recusada",
          `Sua candidatura para "${candidatura.vagas?.title ?? "Vaga"}" não foi selecionada.`,
          undefined,
          companyName,
          String(candidatura.id),
          "candidatura",
          { recipientEmail: cidadaoEmail }
        );
      }

      console.log("[handleReject] Calling notificarRelevantes for recusa...");
      await notificarRelevantes(
        "candidatura_recusada",
        "Candidatura recusada",
        `Candidatura de "${candidatura.profiles?.full_name ?? "Candidato"}" para "${candidatura.vagas?.title ?? "Vaga"}" foi recusada.`,
        {
          remetenteNome: companyName,
          referenciaId: String(candidatura.id),
          referenciaTipo: "candidatura",
          excluirIds: [candidatura.cidadao_id],
        }
      );
      console.log("[handleReject] notificarRelevantes completed.");
    }

    isProcessingRef.current = false;
    setActionLoading(false);
  };

  return (
    <div className="rounded-2xl relative" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="h-28 relative" style={{ background: "linear-gradient(135deg, #1B2A5E, #3BBFD4)" }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)", backgroundSize: "16px 16px" }}></div>
        <div className="absolute bottom-3 right-4 text-xs font-bold px-3 py-1 rounded-full" style={{ background: "rgba(232,160,32,0.90)", color: "#0D1629" }}>
          <i className="ri-briefcase-line mr-1"></i>{candidatura.vagas?.title ?? "Vaga"}
        </div>
      </div>
      {/* Avatar com botão de lupa */}
      <div className="absolute top-[72px] left-5 z-20">
        <div className="relative w-16 h-16 rounded-2xl overflow-hidden shrink-0 border-[3px]" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <Link
            to={`/sistema/perfil/${candidatura.cidadao_id}?from=empresa&tab=curriculos&selected=${candidatura.id}`}
            className="block w-full h-full transition-opacity hover:opacity-80 cursor-pointer"
            title="Ver perfil público"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={prof?.full_name ?? "Candidato"}
                className="w-full h-full object-cover object-top"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-white font-extrabold text-xl"
                style={{ background: "linear-gradient(135deg, #1B2A5E, #3BBFD4)" }}
              >
                {(prof?.full_name ?? "?").charAt(0).toUpperCase()}
              </div>
            )}
          </Link>
          {avatarUrl && (
            <button
              onClick={() => setLightboxOpen(true)}
              className="absolute bottom-0 right-0 w-6 h-6 rounded-tl-lg flex items-center justify-center cursor-pointer"
              style={{ background: "rgba(0,0,0,0.35)" }}
              title="Ver foto em tela cheia"
            >
              <i className="ri-zoom-in-line text-white text-xs"></i>
            </button>
          )}
        </div>
      </div>
      {/* Conteúdo com espaçador */}
      <div className="px-5 pt-8 pb-5">
        {prof?.job_status !== "not_looking" ? (
            <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: "rgba(232,160,32,0.15)", color: "#E8A020", border: "1px solid rgba(232,160,32,0.25)" }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#E8A020" }}></span>Buscando emprego
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: "rgba(34,197,94,0.12)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.25)" }}>
              <i className="ri-briefcase-line"></i>Empregado
            </span>
          )}
        <div className="flex items-center gap-2 mb-1 mt-3">
          <h2 className="text-white font-extrabold text-xl">{prof?.full_name ?? "Sem nome"}</h2>
          <Link to={`/sistema/perfil/${candidatura.cidadao_id}?from=empresa&tab=curriculos&selected=${candidatura.id}`} className="flex items-center gap-1 text-xs font-semibold cursor-pointer" style={{ color: "#3BBFD4" }}>
            <i className="ri-external-link-line"></i>Ver perfil
          </Link>
        </div>
        {prof?.expertise && <p className="text-white/50 text-sm mb-2">{prof.expertise}</p>}
        {(prof?.is_service_provider || prof?.worker_profile_type) && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {prof?.is_service_provider && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(34,197,94,0.15)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.25)" }}>
                <i className="ri-tools-line text-xs"></i>Prestador de Serviços
              </span>
            )}
            {prof?.worker_profile_type && prof?.worker_profile_type !== "clt" && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(232,160,32,0.15)", color: "#E8A020", border: "1px solid rgba(232,160,32,0.25)" }}>
                <i className="ri-user-star-line text-xs"></i>
                {prof.worker_profile_type === "freelancer" ? "Freelancer" : prof.worker_profile_type === "mei" ? "MEI" : prof.worker_profile_type.toUpperCase()}
              </span>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: "Formação", value: prof?.education, icon: "ri-graduation-cap-line", color: "#E8A020" },
            { label: "Tipo desejado", value: prof?.job_type, icon: "ri-file-text-line", color: "#3BBFD4" },
            { label: "Bairro", value: prof?.neighborhood, icon: "ri-map-pin-line", color: "#3BBFD4" },
            { label: "Telefone", value: prof?.phone, icon: "ri-phone-line", color: "#22C55E" },
          ].map((f) => (
            <div key={f.label} className="flex items-start gap-2.5 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
              <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${f.color}20` }}>
                <i className={`${f.icon} text-sm`} style={{ color: f.color }}></i>
              </span>
              <div className="min-w-0">
                <p className="text-white/35 text-xs">{f.label}</p>
                <p className="text-white font-semibold text-sm truncate">{f.value ?? "—"}</p>
              </div>
            </div>
          ))}
        </div>

        {prof?.bio && (
          <div className="mb-4 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Sobre o candidato</p>
            <p className="text-white/60 text-sm leading-relaxed">{prof.bio}</p>
          </div>
        )}

        {candidatura.message && (
          <div className="mb-4 p-4 rounded-xl" style={{ background: "rgba(232,160,32,0.06)", border: "1px solid rgba(232,160,32,0.15)" }}>
            <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">
              <i className="ri-message-2-line mr-1" style={{ color: "#E8A020" }}></i>Mensagem do candidato
            </p>
            <p className="text-white/60 text-sm leading-relaxed">{candidatura.message}</p>
          </div>
        )}

        {candidatura.curriculo_url && (
          <a href={candidatura.curriculo_url} target="_blank" rel="nofollow noopener noreferrer" className="flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all mb-3" style={{ background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.25)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(34,197,94,0.20)" }}>
              <i className="ri-file-pdf-line text-xl" style={{ color: "#22C55E" }}></i>
            </div>
            <div>
              <p className="text-white font-bold text-sm">Currículo enviado na candidatura</p>
              <p className="text-white/40 text-xs">Clique para abrir em nova aba</p>
            </div>
            <i className="ri-external-link-line ml-auto text-white/30"></i>
          </a>
        )}

        {prof?.curriculo_pdf && (
          <a href={prof.curriculo_pdf} target="_blank" rel="nofollow noopener noreferrer" className="flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all" style={{ background: "rgba(59,191,212,0.10)", border: "1px solid rgba(59,191,212,0.25)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(59,191,212,0.20)" }}>
              <i className="ri-file-user-line text-xl" style={{ color: "#3BBFD4" }}></i>
            </div>
            <div>
              <p className="text-white font-bold text-sm">Currículo do perfil</p>
              <p className="text-white/40 text-xs">Abrir em nova aba</p>
            </div>
            <i className="ri-external-link-line ml-auto text-white/30"></i>
          </a>
        )}

        {/* Ações de aprovação/rejeição */}
        {localStatus === "pending" && (
          <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-3">Ações</p>

            {actionMsg && (
              <div className={`mb-3 p-3 rounded-xl text-xs ${actionMsg.includes("Erro") ? "text-red-400 bg-red-500/10 border border-red-500/20" : "text-green-400 bg-green-500/10 border border-green-500/20"}`}>
                {actionMsg}
              </div>
            )}

            {!showReject ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="flex-1 py-3 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap disabled:opacity-50"
                  style={{ background: "rgba(34,197,94,0.15)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.25)" }}
                >
                  {actionLoading ? "Processando..." : "Aprovar Candidato"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowReject(true)}
                  disabled={actionLoading}
                  className="flex-1 py-3 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap disabled:opacity-50"
                  style={{ background: "rgba(239,68,68,0.10)", color: "#F87171", border: "1px solid rgba(239,68,68,0.20)" }}
                >
                  Recusar
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">
                    Motivo da Recusa *
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                    maxLength={300}
                    placeholder="Explique o motivo pelo qual o candidato não foi selecionado..."
                    className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none resize-none"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
                  />
                  <p className="text-white/25 text-xs mt-1 text-right">{rejectReason.length}/300</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowReject(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap"
                    style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)" }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={actionLoading || !rejectReason.trim()}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap text-white disabled:opacity-40"
                    style={{ background: "#DC2626" }}
                  >
                    {actionLoading ? "Recusando..." : "Confirmar Recusa"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {localStatus === "accepted" && (
          <div className="mt-4 pt-4 flex items-center gap-2 p-3 rounded-xl" style={{ borderTop: "1px solid rgba(255,255,255,0.08)", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)" }}>
            <i className="ri-checkbox-circle-fill text-green-400"></i>
            <span className="text-green-400 text-sm font-semibold">Candidato Aprovado</span>
          </div>
        )}

        {localStatus === "rejected" && (
          <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center gap-2 mb-2 p-3 rounded-xl" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
              <i className="ri-close-circle-fill text-red-400"></i>
              <span className="text-red-400 text-sm font-semibold">Candidato Recusado</span>
            </div>
            {candidatura.rejection_reason && (
              <p className="text-white/40 text-xs leading-relaxed pl-7">{candidatura.rejection_reason}</p>
            )}
          </div>
        )}
      </div>
      <ProfilePhotoLightbox
        imageUrl={avatarUrl}
        userName={prof?.full_name ?? "Candidato"}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
}

/** Componente de detalhe do profissional (todos cidadãos com perfil completo) */
function ProfissionalDetail({ profissional }: { profissional: CandidatoProfile }) {
  const p = profissional;
  const avatar = p.avatar_url || p.profile_photo || null;
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [portfolioLightboxUrl, setPortfolioLightboxUrl] = useState<string | null>(null);

  return (
    <div className="rounded-2xl relative" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="h-28 relative" style={{ background: "linear-gradient(135deg, #E8A020, #f5b94a)" }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)", backgroundSize: "16px 16px" }}></div>
        <div className="absolute bottom-3 right-4 text-xs font-bold px-3 py-1 rounded-full" style={{ background: "rgba(13,22,41,0.90)", color: "#E8A020" }}>
          <i className="ri-user-star-line mr-1"></i>Profissional
        </div>
      </div>
      {/* Avatar com botão de lupa */}
      <div className="absolute top-[72px] left-5 z-20">
        <div className="relative w-16 h-16 rounded-2xl overflow-hidden shrink-0 border-[3px]" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <Link
            to={`/sistema/perfil/${p.id}?from=empresa&tab=curriculos`}
            className="block w-full h-full transition-opacity hover:opacity-80 cursor-pointer"
            title="Ver perfil público"
          >
            {avatar ? (
              <img src={avatar} alt={p.full_name ?? "Profissional"} className="w-full h-full object-cover object-top" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-extrabold text-xl" style={{ background: "linear-gradient(135deg, #E8A020, #f5b94a)" }}>
                {(p.full_name ?? "?").charAt(0).toUpperCase()}
              </div>
            )}
          </Link>
          {avatar && (
            <button
              onClick={() => setLightboxOpen(true)}
              className="absolute bottom-0 right-0 w-6 h-6 rounded-tl-lg flex items-center justify-center cursor-pointer"
              style={{ background: "rgba(0,0,0,0.35)" }}
              title="Ver foto em tela cheia"
            >
              <i className="ri-zoom-in-line text-white text-xs"></i>
            </button>
          )}
        </div>
      </div>
      {/* Conteúdo */}
      <div className="px-5 pt-8 pb-5">
        {p.job_status !== "not_looking" ? (
          <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: "rgba(232,160,32,0.15)", color: "#E8A020", border: "1px solid rgba(232,160,32,0.25)" }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#E8A020" }}></span>Buscando emprego
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: "rgba(34,197,94,0.12)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.25)" }}>
            <i className="ri-briefcase-line"></i>Empregado
          </span>
        )}

        <div className="flex items-center gap-2 mb-1 mt-3">
          <h2 className="text-white font-extrabold text-xl">{p.full_name ?? "Sem nome"}</h2>
          <Link to={`/sistema/perfil/${p.id}?from=empresa&tab=curriculos`} className="flex items-center gap-1 text-xs font-semibold cursor-pointer hover:underline" style={{ color: "#3BBFD4" }}>
            <i className="ri-external-link-line"></i>Ver perfil completo
          </Link>
        </div>
        {p.expertise && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: "rgba(232,160,32,0.15)", color: "#E8A020", border: "1px solid rgba(232,160,32,0.25)" }}>
              <i className="ri-briefcase-4-line text-xs"></i>
              <span className="text-xs font-semibold">{p.expertise}</span>
            </div>
            {p.worker_profile_type && p.worker_profile_type !== "clt" && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(59,191,212,0.15)", color: "#3BBFD4", border: "1px solid rgba(59,191,212,0.25)" }}>
                <i className="ri-user-star-line text-xs"></i>
                {p.worker_profile_type === "freelancer" ? "Freelancer" : p.worker_profile_type === "mei" ? "MEI" : p.worker_profile_type.toUpperCase()}
              </span>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: "Formação", value: p.education, icon: "ri-graduation-cap-line", color: "#E8A020" },
            { label: "Tipo desejado", value: p.job_type, icon: "ri-file-text-line", color: "#3BBFD4" },
            { label: "Bairro", value: p.neighborhood, icon: "ri-map-pin-line", color: "#3BBFD4" },
            { label: "Telefone", value: p.phone, icon: "ri-phone-line", color: "#22C55E" },
          ].map((f) => (
            <div key={f.label} className="flex items-start gap-2.5 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
              <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${f.color}20` }}>
                <i className={`${f.icon} text-sm`} style={{ color: f.color }}></i>
              </span>
              <div className="min-w-0">
                <p className="text-white/35 text-xs">{f.label}</p>
                <p className="text-white font-semibold text-sm truncate">{f.value ?? "—"}</p>
              </div>
            </div>
          ))}
        </div>

        {p.bio && (
          <div className="mb-4 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Descrição Profissional</p>
            <p className="text-white/60 text-sm leading-relaxed">{p.bio}</p>
          </div>
        )}

        {/* Serviços como prestador */}
        {p.is_service_provider && (
          <div className="mb-4 p-4 rounded-xl" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.18)" }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(34,197,94,0.20)" }}>
                <i className="ri-tools-line text-sm" style={{ color: "#22C55E" }}></i>
              </span>
              <p className="text-white/50 text-xs font-bold uppercase tracking-wider">Prestador de Serviços</p>
            </div>
            {p.service_categories && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {(p.service_categories ?? "").split(",").map((cat) => (
                  <span key={cat} className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(34,197,94,0.15)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.20)" }}>
                    {cat.trim()}
                  </span>
                ))}
              </div>
            )}
            {p.service_description && (
              <p className="text-white/50 text-sm leading-relaxed">{p.service_description}</p>
            )}
          </div>
        )}

        {/* Currículo PDF do perfil */}
        {p.curriculo_pdf && (
          <a href={p.curriculo_pdf} target="_blank" rel="nofollow noopener noreferrer" className="flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all mb-3" style={{ background: "rgba(232,160,32,0.12)", border: "1px solid rgba(232,160,32,0.25)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(232,160,32,0.25)" }}>
              <i className="ri-file-pdf-line text-xl" style={{ color: "#E8A020" }}></i>
            </div>
            <div>
              <p className="text-white font-bold text-sm">Currículo do profissional</p>
              <p className="text-white/40 text-xs">Clique para abrir em nova aba</p>
            </div>
            <i className="ri-external-link-line ml-auto text-white/30"></i>
          </a>
        )}

        {/* Fotos do portfólio */}
        {p.portfolio_photos && (() => {
          const fotos = p.portfolio_photos.split("|").filter(Boolean);
          if (fotos.length === 0) return null;
          return (
            <div className="mb-4">
              <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-3">Portfólio de Serviços</p>
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

        {/* Link para perfil completo */}
        <Link
          to={`/sistema/perfil/${p.id}?from=empresa&tab=curriculos`}
          className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold cursor-pointer transition-all w-full"
          style={{ background: "linear-gradient(135deg, #E8A020, #f5b94a)", color: "#0D1629" }}
        >
          <i className="ri-user-line"></i> Ver Perfil Completo e Currículo
        </Link>
      </div>
      <ProfilePhotoLightbox
        imageUrl={avatar}
        userName={p.full_name ?? "Profissional"}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />

      {/* Lightbox do portfólio */}
      <ProfilePhotoLightbox
        imageUrl={portfolioLightboxUrl}
        userName={p.full_name ?? "Profissional"}
        isOpen={!!portfolioLightboxUrl}
        onClose={() => setPortfolioLightboxUrl(null)}
      />
    </div>
  );
}