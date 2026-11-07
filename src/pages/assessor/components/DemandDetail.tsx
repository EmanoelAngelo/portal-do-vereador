import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { DemandCard } from "./KanbanBoard";
import { criarNotificacao, notificarRelevantes } from "@/hooks/useNotifications";

interface CitizenJobProfile {
  is_employed: boolean | null;
  wants_opportunities: boolean | null;
  employed_through_platform: boolean | null;
  platform_job_details: string | null;
  job_status: string | null;
  curriculo_pdf: string | null;
  expertise: string | null;
  education: string | null;
}

interface DemandDetailProps {
  demand: DemandCard;
  assessorId: string;
  assessorName: string;
  onUpdate: (updated: DemandCard) => void;
  onClose: () => void;
}

const statusOptions = [
  { value: "aberto", label: "Em Aberto", color: "#D97706", bg: "#FEF3C7", border: "#FDE68A" },
  { value: "em_andamento", label: "Em Andamento", color: "#0369A1", bg: "#EFF6FF", border: "#BFDBFE" },
  { value: "aguardando_externa", label: "Ag. Resp. Externa", color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
  { value: "finalizada", label: "Finalizada", color: "#16A34A", bg: "#F0FDF4", border: "#BBF7D0" },
];

const priorityOptions = [
  { value: "normal", label: "Normal", color: "#6B7280", bg: "#F9FAFB", border: "#D1D5DB" },
  { value: "importante", label: "Importante", color: "#E8A020", bg: "#FFFBF0", border: "#FDE68A" },
  { value: "urgente", label: "Urgente", color: "#EF4444", bg: "#FEF2F2", border: "#FECACA" },
];

const typeLabel: Record<string, string> = {
  requerimento: "Requerimento",
  sugestao: "Sugestão de Projeto",
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

async function updateDemandViaEdge(
  id: number,
  fields: Record<string, unknown>
): Promise<{ ok: boolean; error?: string }> {
  const MAX_RETRIES = 2;
  let lastError = "";
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke("update-demand", {
        body: { id, fields },
      });
      if (!error && data?.success === true) return { ok: true };
      const errMsg =
        error?.message ||
        (error as any)?.error_description ||
        "Erro desconhecido do servidor";
      lastError = errMsg;
      if (attempt < MAX_RETRIES)
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      lastError = msg;
      if (attempt < MAX_RETRIES)
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  return { ok: false, error: lastError || "Falha ao comunicar com o servidor." };
}

export default function DemandDetail({
  demand,
  assessorId,
  assessorName,
  onUpdate,
  onClose,
}: DemandDetailProps) {
  // ── Local state — nada é salvo até clicar em Salvar ──────────────────────
  const [localPriority, setLocalPriority] = useState(demand.priority || "normal");
  const [localStatus, setLocalStatus] = useState(demand.status || "aberto");
  const [localNotes, setLocalNotes] = useState(demand.assessor_notes ?? "");

  // Rastreia se campos foram tocados pelo assessor nesta sessão
  const [priorityTouched, setPriorityTouched] = useState(false);
  const [statusTouched, setStatusTouched] = useState(false);
  const [notesSaved, setNotesSaved] = useState(
    !!(demand.assessor_notes && demand.assessor_notes.trim())
  );

  // Controle de assumir: justAssumed dispara o modo de preenchimento obrigatório
  const [justAssumed, setJustAssumed] = useState(false);

  // Perfil profissional do cidadão
  const [citizenJobProfile, setCitizenJobProfile] = useState<CitizenJobProfile | null>(null);

  // UI states
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveOk, setSaveOk] = useState(false);
  const [updatingAssume, setUpdatingAssume] = useState(false);

  // Modal de bloqueio ao fechar
  const [showCloseBlock, setShowCloseBlock] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  // ── Derivados ─────────────────────────────────────────────────────────────
  const isMine = demand.assessor_id === assessorId;
  const isTaken = !!demand.assessor_id;

  // Mudanças locais pendentes
  const hasLocalChanges =
    localPriority !== (demand.priority || "normal") ||
    localStatus !== (demand.status || "aberto") ||
    localNotes !== (demand.assessor_notes ?? "");

  // Modo de preenchimento obrigatório: assumiu agora OU era "aberto" e sou o dono
  const requiresCompletion = justAssumed;

  // Ressincroniza estado local quando a demanda for atualizada externamente
  // (assessor_id e status no array de deps garantem ressincronia após assumir/liberar)
  // NOTA: NÃO reseta priorityTouched/statusTouched aqui - assumirDemanda e liberarDemanda
  // gerenciam esses flags explicitamente para evitar conflito com o fluxo do usuário
  useEffect(() => {
    setLocalPriority(demand.priority || "normal");
    setLocalStatus(demand.status || "aberto");
    setLocalNotes(demand.assessor_notes ?? "");
    setNotesSaved(!!(demand.assessor_notes && demand.assessor_notes.trim()));
  }, [demand.id, demand.assessor_id, demand.status]);

  // Buscar perfil profissional do cidadão quando tiver citizen_id
  useEffect(() => {
    if (!demand.citizen_id) return;
    supabase
      .from("profiles")
      .select("is_employed, wants_opportunities, employed_through_platform, platform_job_details, job_status, curriculo_pdf, expertise, education")
      .eq("id", demand.citizen_id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setCitizenJobProfile(data as CitizenJobProfile);
      })
      .catch(() => {});
  }, [demand.citizen_id]);

  const currentStatusObj =
    statusOptions.find((s) => s.value === localStatus) ?? statusOptions[0];

  // ── Verificação de campos obrigatórios (ao tentar fechar) ─────────────────
  function getMissingFields(): string[] {
    if (!requiresCompletion) return [];
    const missing: string[] = [];
    if (!priorityTouched) missing.push("Prioridade — escolha uma opção");
    if (!statusTouched) missing.push("Status — selecione um status");
    if (!localNotes.trim()) missing.push("Observações — escreva um comentário");
    else if (!notesSaved) missing.push("Observações — clique em Salvar para confirmar");
    return missing;
  }

  // ── Handler de fechamento ─────────────────────────────────────────────────
  const handleRequestClose = useCallback(() => {
    if (requiresCompletion) {
      const missing = getMissingFields();
      if (missing.length > 0) {
        setMissingFields(missing);
        setShowCloseBlock(true);
        return;
      }
    } else if (hasLocalChanges) {
      setMissingFields(["Você tem alterações não salvas. Salve antes de fechar."]);
      setShowCloseBlock(true);
      return;
    }
    onClose();
  }, [requiresCompletion, hasLocalChanges, priorityTouched, statusTouched, localNotes, notesSaved, onClose]);

  // ── Assumir demanda ───────────────────────────────────────────────────────
  const assumirDemanda = useCallback(async () => {
    setUpdatingAssume(true);
    setSaveError("");
    const now = new Date().toISOString();
    const fields: Record<string, unknown> = {
      assessor_id: assessorId,
      assessor_name: assessorName,
      status: "em_andamento",
      updated_at: now,
    };
    const { ok, error: updateErr } = await updateDemandViaEdge(demand.id, fields);
    if (!ok) {
      setSaveError(updateErr || "Erro ao assumir demanda. Tente novamente.");
      setUpdatingAssume(false);
      return;
    }
    onUpdate({
      ...demand,
      assessor_id: assessorId,
      assessor_name: assessorName,
      status: "em_andamento",
      updated_at: now,
    });
    // Atualiza local state imediatamente
    setLocalStatus("em_andamento");
    setStatusTouched(true);
    setJustAssumed(true);
    setUpdatingAssume(false);

    if (demand.citizen_id) {
      await criarNotificacao(
        demand.citizen_id,
        "demanda",
        "Assessor assumiu sua demanda",
        `${assessorName} assumiu a demanda "${demand.title}" e está trabalhando nela.`,
        assessorId,
        assessorName,
        String(demand.id),
        "demanda"
      );
    }
    await notificarRelevantes(
      "demanda",
      "Demanda assumida por assessor",
      `"${demand.title}" foi assumida por ${assessorName}.`,
      {
        remetenteId: assessorId,
        remetenteNome: assessorName,
        referenciaId: String(demand.id),
        referenciaTipo: "demanda",
        excluirIds: demand.citizen_id
          ? [demand.citizen_id, assessorId]
          : [assessorId],
      }
    );
  }, [demand, assessorId, assessorName, onUpdate]);

  // ── Liberar demanda ───────────────────────────────────────────────────────
  const liberarDemanda = useCallback(async () => {
    setUpdatingAssume(true);
    setSaveError("");
    const now = new Date().toISOString();
    const { ok, error: updateErr } = await updateDemandViaEdge(demand.id, {
      assessor_id: null,
      assessor_name: null,
      status: "aberto",
      updated_at: now,
    });
    if (!ok) {
      setSaveError(updateErr || "Erro ao liberar demanda.");
      setUpdatingAssume(false);
      return;
    }
    onUpdate({
      ...demand,
      assessor_id: null,
      assessor_name: null,
      status: "aberto",
      updated_at: now,
    });
    // Reseta estado local imediatamente para evitar bloqueio de fechamento
    setLocalPriority("normal");
    setLocalStatus("aberto");
    setLocalNotes("");
    setPriorityTouched(false);
    setStatusTouched(false);
    setNotesSaved(false);
    setJustAssumed(false);
    setSaveError("");
    setSaveOk(false);
    setUpdatingAssume(false);
  }, [demand, onUpdate]);

  // ── Salvar tudo de uma vez ────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!isMine) return;
    setSaving(true);
    setSaveError("");
    const now = new Date().toISOString();
    const fields: Record<string, unknown> = {
      assessor_notes: localNotes,
      priority: localPriority,
      status: localStatus,
      updated_at: now,
    };
    const { ok, error: err } = await updateDemandViaEdge(demand.id, fields);
    if (!ok) {
      setSaveError(err || "Erro ao salvar. Tente novamente.");
      setSaving(false);
      return;
    }
    onUpdate({
      ...demand,
      assessor_notes: localNotes,
      priority: localPriority,
      status: localStatus,
      updated_at: now,
    });
    setNotesSaved(true);
    setSaving(false);
    setSaveOk(true);
    setTimeout(() => setSaveOk(false), 2500);

    // Notificações
    const statusLabels: Record<string, string> = {
      aberto: "Em Aberto",
      em_andamento: "Em Andamento",
      aguardando_externa: "Aguardando Resposta Externa",
      finalizada: "Finalizada",
    };
    if (demand.citizen_id) {
      await criarNotificacao(
        demand.citizen_id,
        "demanda",
        `Demanda atualizada — ${statusLabels[localStatus] ?? localStatus}`,
        `O assessor ${assessorName} atualizou a demanda "${demand.title}".`,
        assessorId,
        assessorName,
        String(demand.id),
        "demanda"
      );
    }
    await notificarRelevantes(
      "demanda",
      `Demanda atualizada por ${assessorName}`,
      `"${demand.title}" atualizada para ${statusLabels[localStatus] ?? localStatus} com prioridade ${localPriority}.`,
      {
        remetenteId: assessorId,
        remetenteNome: assessorName,
        referenciaId: String(demand.id),
        referenciaTipo: "demanda",
        excluirIds: demand.citizen_id
          ? [demand.citizen_id, assessorId]
          : [assessorId],
      }
    );
  }, [isMine, localNotes, localPriority, localStatus, demand, onUpdate, assessorId, assessorName]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={handleRequestClose}
    >
      {/* Card — stopPropagation evita fechar ao clicar dentro */}
      <div
        className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-xl flex flex-col overflow-hidden"
        style={{ maxHeight: "92vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-4 md:p-5 border-b border-gray-100">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-[#0369A1] uppercase tracking-wide">
                {typeLabel[demand.type] ?? demand.type}
              </span>
              {demand.category && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="text-xs text-gray-400">{demand.category}</span>
                </>
              )}
            </div>
            <h2 className="text-gray-900 font-extrabold text-base md:text-lg leading-snug">
              {demand.title}
            </h2>
          </div>
          <button
            onClick={handleRequestClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 transition-all cursor-pointer shrink-0"
          >
            <i className="ri-close-line"></i>
          </button>
        </div>

        {/* Banner de preenchimento obrigatório */}
        {requiresCompletion && (
          <div className="mx-5 mt-4 p-3 rounded-xl text-sm flex items-start gap-2" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
            <i className="ri-information-line text-[#0369A1] mt-0.5 shrink-0"></i>
            <span className="text-[#0369A1]">
              Você assumiu esta demanda. Preencha <strong>prioridade, status e observações</strong> e clique em <strong>Salvar</strong> para liberar o fechamento.
            </span>
          </div>
        )}

        <div className="overflow-y-auto flex-1">
          {/* Error banner */}
          {saveError && (
            <div className="mx-5 mt-4 p-3 rounded-xl text-red-600 text-sm flex items-start gap-2" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
              <i className="ri-error-warning-line mt-0.5 shrink-0"></i>
              <span>{saveError}</span>
            </div>
          )}

          {/* Citizen info */}
          <div className="p-5 border-b border-gray-100">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-3">
              Dados do cidadão
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {demand.citizen_name && (
                <div className="flex items-center gap-1.5 col-span-2">
                  <i className="ri-user-line text-[#0369A1] text-sm"></i>
                  <span className="text-gray-800 font-semibold">{demand.citizen_name}</span>
                </div>
              )}
              {demand.citizen_email && (
                <div className="flex items-center gap-1.5">
                  <i className="ri-mail-line text-gray-400 text-sm"></i>
                  <a href={`mailto:${demand.citizen_email}`} className="text-[#0369A1] text-sm hover:underline">
                    {demand.citizen_email}
                  </a>
                </div>
              )}
              {demand.citizen_phone && (
                <div className="flex items-center gap-1.5">
                  <i className="ri-phone-line text-gray-400 text-sm"></i>
                  <span className="text-gray-700 text-sm">{demand.citizen_phone}</span>
                </div>
              )}
              {demand.citizen_neighborhood && (
                <div className="flex items-center gap-1.5">
                  <i className="ri-map-pin-line text-gray-400 text-sm"></i>
                  <span className="text-gray-700 text-sm">{demand.citizen_neighborhood}</span>
                </div>
              )}
            </div>

            {/* Perfil profissional do cidadão (inteligente) */}
            {citizenJobProfile && (
              <div className="mt-3 p-3 rounded-xl" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Perfil Profissional</p>
                <div className="flex flex-wrap gap-2">
                  {citizenJobProfile.is_employed === true ? (
                    <span className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full" style={{ background: "rgba(34,197,94,0.12)", color: "#16A34A" }}>
                      <i className="ri-briefcase-fill"></i>Empregado
                    </span>
                  ) : citizenJobProfile.is_employed === false ? (
                    <span className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full" style={{ background: "rgba(232,160,32,0.12)", color: "#D97706" }}>
                      <i className="ri-search-line"></i>Desempregado
                    </span>
                  ) : null}
                  {citizenJobProfile.wants_opportunities === true || citizenJobProfile.job_status !== "not_looking" ? (
                    <span className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full" style={{ background: "rgba(3,105,161,0.12)", color: "#0369A1" }}>
                      <i className="ri-send-plane-line"></i>Busca vagas
                    </span>
                  ) : citizenJobProfile.wants_opportunities === false || citizenJobProfile.job_status === "not_looking" ? (
                    <span className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full" style={{ background: "rgba(107,114,128,0.12)", color: "#6B7280" }}>
                      <i className="ri-pause-circle-line"></i>Não busca vagas
                    </span>
                  ) : null}
                  {citizenJobProfile.employed_through_platform && (
                    <span className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full" style={{ background: "rgba(34,197,94,0.12)", color: "#16A34A" }}>
                      <i className="ri-trophy-fill"></i>Contratado pelo sistema
                    </span>
                  )}
                  {citizenJobProfile.curriculo_pdf && (
                    <a href={citizenJobProfile.curriculo_pdf} target="_blank" rel="nofollow noopener noreferrer" className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full hover:opacity-80 transition-opacity" style={{ background: "rgba(3,105,161,0.12)", color: "#0369A1" }}>
                      <i className="ri-file-pdf-line"></i>Ver currículo
                    </a>
                  )}
                </div>
                {citizenJobProfile.expertise && (
                  <p className="text-xs text-gray-500 mt-2">
                    <i className="ri-star-line mr-1"></i><strong>Expertise:</strong> {citizenJobProfile.expertise}
                    {citizenJobProfile.education && <> &middot; <strong>Formação:</strong> {citizenJobProfile.education}</>}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="p-5 border-b border-gray-100">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Descrição</p>
            <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
              {demand.description ?? "—"}
            </p>
          </div>

          {/* Priority */}
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Prioridade</p>
              {requiresCompletion && !priorityTouched && (
                <span className="text-xs text-amber-600 font-semibold flex items-center gap-1">
                  <i className="ri-alert-line"></i>obrigatório
                </span>
              )}
              {priorityTouched && (
                <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                  <i className="ri-checkbox-circle-line"></i>preenchido
                </span>
              )}
            </div>

            {!isMine && isTaken ? (
              <div className="text-sm text-gray-500 italic">
                Apenas <strong>{demand.assessor_name}</strong> pode alterar a prioridade.
              </div>
            ) : !isMine && !isTaken ? (
              <div className="text-sm text-gray-500 italic">Assuma a demanda para editar a prioridade.</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {priorityOptions.map((p) => {
                  const isActive = localPriority === p.value;
                  return (
                    <button
                      key={p.value}
                      onClick={() => {
                        setLocalPriority(p.value);
                        setPriorityTouched(true);
                        setSaveOk(false);
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5"
                      style={{
                        color: isActive ? p.color : "#9CA3AF",
                        background: isActive ? p.bg : "#F9FAFB",
                        borderColor: isActive ? p.color : "#E5E7EB",
                      }}
                    >
                      {isActive && <i className="ri-checkbox-circle-fill text-xs"></i>}
                      {p.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Status + Assumir */}
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Status</p>
                {requiresCompletion && !statusTouched && (
                  <span className="text-xs text-amber-600 font-semibold flex items-center gap-1">
                    <i className="ri-alert-line"></i>obrigatório
                  </span>
                )}
                {statusTouched && (
                  <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                    <i className="ri-checkbox-circle-line"></i>preenchido
                  </span>
                )}
              </div>
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                style={{
                  color: currentStatusObj.color,
                  background: currentStatusObj.bg,
                  border: `1px solid ${currentStatusObj.border}`,
                }}
              >
                <i className="ri-checkbox-circle-line text-xs"></i>
                {currentStatusObj.label}
              </span>
            </div>

            {/* Botão Assumir / Liberar */}
            <div className="mb-3">
              {!isTaken && (
                <button
                  onClick={assumirDemanda}
                  disabled={updatingAssume}
                  className="w-full py-2.5 text-white text-sm font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #0369A1, #0EA5E9)" }}
                >
                  {updatingAssume ? (
                    <><i className="ri-loader-4-line animate-spin"></i>Assumindo...</>
                  ) : (
                    <><i className="ri-user-add-line"></i>Assumir esta demanda</>
                  )}
                </button>
              )}
              {isMine && (
                <button
                  onClick={liberarDemanda}
                  disabled={updatingAssume}
                  className="w-full py-2 text-sm font-semibold rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <i className="ri-user-unfollow-line"></i>Liberar demanda
                </button>
              )}
              {isTaken && !isMine && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200">
                  <i className="ri-shield-user-line text-[#0369A1]"></i>
                  <span className="text-sm text-gray-600">
                    Responsável: <strong>{demand.assessor_name}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Status buttons */}
            {!isMine && isTaken ? (
              <div className="text-sm text-gray-500 italic">Apenas o responsável pode alterar o status.</div>
            ) : !isMine && !isTaken ? (
              <div className="text-sm text-gray-500 italic">Assuma a demanda para editar o status.</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => {
                      setLocalStatus(o.value);
                      setStatusTouched(true);
                      setSaveOk(false);
                    }}
                    className="px-4 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer whitespace-nowrap"
                    style={
                      localStatus === o.value
                        ? { color: o.color, background: o.bg, borderColor: o.color }
                        : { color: "#9CA3AF", background: "#F9FAFB", borderColor: "#E5E7EB" }
                    }
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Assessor notes */}
          <div className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <label className="block text-gray-600 text-xs font-bold uppercase tracking-wider">
                Observações do assessor
              </label>
              {requiresCompletion && !localNotes.trim() && (
                <span className="text-xs text-amber-600 font-semibold flex items-center gap-1">
                  <i className="ri-alert-line"></i>obrigatório
                </span>
              )}
              {requiresCompletion && localNotes.trim() && !notesSaved && (
                <span className="text-xs text-amber-600 font-semibold flex items-center gap-1">
                  <i className="ri-save-line"></i>aguardando salvar
                </span>
              )}
              {requiresCompletion && localNotes.trim() && notesSaved && (
                <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                  <i className="ri-checkbox-circle-line"></i>preenchido
                </span>
              )}
            </div>
            <p className="text-gray-400 text-xs mb-3 leading-relaxed">
              Estas anotações ficam visíveis para o vereador e outros assessores no sistema.
              Use para registrar o andamento ou detalhes internos da demanda.
            </p>

            {!isMine && isTaken ? (
              <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-500 text-sm italic">
                {demand.assessor_notes
                  ? demand.assessor_notes
                  : "Nenhuma observação registrada."}
              </div>
            ) : !isMine && !isTaken ? (
              <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-400 text-sm italic">
                Assuma a demanda para adicionar observações.
              </div>
            ) : (
              <>
                <textarea
                  value={localNotes}
                  onChange={(e) => {
                    setLocalNotes(e.target.value);
                    setNotesSaved(false);
                    setSaveOk(false);
                  }}
                  rows={4}
                  maxLength={500}
                  placeholder="Registre aqui o andamento da demanda, contatos feitos, encaminhamentos..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm placeholder:text-gray-400 focus:outline-none focus:border-[#0369A1] resize-none transition-all"
                />
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-400">{localNotes.length}/500</span>
                </div>
              </>
            )}
          </div>

          {/* Botão Salvar (só para quem é dono) */}
          {isMine && (
            <div className="px-5 pb-5">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2.5 text-white text-sm font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #0369A1, #0EA5E9)" }}
                >
                  {saving ? (
                    <><i className="ri-loader-4-line animate-spin"></i>Salvando...</>
                  ) : (
                    <><i className="ri-save-line"></i>Salvar alterações</>
                  )}
                </button>
                {saveOk && (
                  <span className="text-green-500 text-xs font-semibold flex items-center gap-1">
                    <i className="ri-checkbox-circle-line"></i>Salvo!
                  </span>
                )}
              </div>
              {hasLocalChanges && !saving && (
                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                  <i className="ri-error-warning-line"></i>
                  Você tem alterações não salvas.
                </p>
              )}
            </div>
          )}

          {/* Info footer */}
          <div className="px-5 pb-5">
            <div className="flex flex-col gap-1 text-xs text-gray-400 border-t border-gray-100 pt-3">
              <span>Aberto em: {formatDateTime(demand.created_at)}</span>
              {demand.updated_at && demand.updated_at !== demand.created_at && (
                <span>Última atualização: {formatDateTime(demand.updated_at)}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de bloqueio ao fechar */}
      {showCloseBlock && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.70)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-5">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ background: "#FEF2F2" }}
              >
                <i className="ri-error-warning-line text-xl" style={{ color: "#EF4444" }}></i>
              </div>
              <h3 className="text-gray-900 font-extrabold text-lg">
                {requiresCompletion ? "Cadastro incompleto" : "Alterações não salvas"}
              </h3>
              <p className="text-gray-500 text-sm mt-1">
                {requiresCompletion
                  ? "Para sair, preencha todos os campos obrigatórios e salve:"
                  : "Salve suas alterações antes de fechar:"}
              </p>
            </div>

            <ul className="mb-5 space-y-2">
              {missingFields.map((f, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 px-3 py-2 rounded-lg text-sm text-red-700"
                  style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}
                >
                  <i className="ri-close-circle-line mt-0.5 shrink-0"></i>
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => setShowCloseBlock(false)}
              className="w-full py-2.5 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all"
            >
              Continuar editando
            </button>
          </div>
        </div>
      )}
    </div>
  );
}