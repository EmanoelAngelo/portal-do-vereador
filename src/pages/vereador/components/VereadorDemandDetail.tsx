import { useEffect, useCallback } from "react";

interface DemandData {
  id: number;
  type: string;
  title: string;
  category: string;
  status: string;
  priority: string | null;
  description: string;
  citizen_name: string | null;
  citizen_phone: string | null;
  citizen_email: string | null;
  citizen_neighborhood: string | null;
  assessor_id: string | null;
  assessor_name: string | null;
  assessor_notes: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface VereadorDemandDetailProps {
  demand: DemandData;
  onClose: () => void;
}

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  aberto:             { label: "Em Aberto",         color: "#D97706", bg: "rgba(217,119,6,0.15)",    border: "rgba(217,119,6,0.30)",    icon: "ri-inbox-line" },
  em_andamento:       { label: "Em Andamento",       color: "#3BBFD4", bg: "rgba(59,191,212,0.15)",   border: "rgba(59,191,212,0.30)",   icon: "ri-loader-4-line" },
  aguardando_externa: { label: "Ag. Resp. Externa",  color: "#A78BFA", bg: "rgba(167,139,250,0.15)",  border: "rgba(167,139,250,0.30)",  icon: "ri-mail-send-line" },
  finalizada:         { label: "Finalizada",         color: "#22C55E", bg: "rgba(34,197,94,0.15)",    border: "rgba(34,197,94,0.30)",    icon: "ri-checkbox-circle-line" },
};

const typeLabel: Record<string, string> = {
  requerimento: "Requerimento",
  sugestao: "Sugestão de Projeto",
  contato: "Contato",
};

const priorityConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  urgente:    { label: "Urgente",    color: "#EF4444", bg: "rgba(239,68,68,0.15)",    border: "rgba(239,68,68,0.30)" },
  importante: { label: "Importante", color: "#E8A020", bg: "rgba(232,160,32,0.15)",  border: "rgba(232,160,32,0.30)" },
  normal:     { label: "Normal",     color: "#9CA3AF", bg: "rgba(156,163,175,0.10)", border: "rgba(156,163,175,0.20)" },
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

export default function VereadorDemandDetail({ demand, onClose }: VereadorDemandDetailProps) {
  const sc = statusConfig[demand.status] ?? statusConfig.aberto;
  const pc = demand.priority ? priorityConfig[demand.priority] : null;

  // Fecha ao pressionar ESC
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Trava o scroll do body enquanto o modal está aberto
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = original; };
  }, []);

  // Previne ghost click no backdrop: só fecha se o clique foi DIRETAMENTE no backdrop
  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-6"
      style={{ background: "rgba(0,0,0,0.65)" }}
      onClick={handleBackdropClick}
    >
      <div
        className="w-full md:max-w-lg flex flex-col overflow-hidden rounded-t-[20px] md:rounded-2xl"
        style={{
          background: "#0D1629",
          border: "1px solid rgba(255,255,255,0.10)",
          maxHeight: "90vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Alça mobile */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.20)" }}></div>
        </div>

        {/* Header */}
        <div
          className="flex items-start justify-between gap-3 px-5 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="flex-1 min-w-0">
            {/* Tipo + Categoria */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span
                className="text-xs font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-lg"
                style={{ color: "#E8A020", background: "rgba(232,160,32,0.12)", border: "1px solid rgba(232,160,32,0.25)" }}
              >
                {typeLabel[demand.type] ?? demand.type}
              </span>
              {demand.category && (
                <span className="text-xs font-medium px-2 py-1 rounded-lg" style={{ color: "rgba(255,255,255,0.45)", background: "rgba(255,255,255,0.06)" }}>
                  {demand.category}
                </span>
              )}
              <span className="text-xs font-bold px-2 py-1 rounded-lg font-mono" style={{ color: "rgba(255,255,255,0.30)", background: "rgba(255,255,255,0.05)" }}>
                #{demand.id}
              </span>
            </div>

            {/* Título */}
            <h2 className="text-white font-extrabold text-base md:text-lg leading-snug mb-3">
              {demand.title}
            </h2>

            {/* Status + Prioridade */}
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                style={{ color: sc.color, background: sc.bg, border: `1px solid ${sc.border}` }}
              >
                <i className={`${sc.icon} text-xs`}></i>
                {sc.label}
              </span>
              {pc && (
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                  style={{ color: pc.color, background: pc.bg, border: `1px solid ${pc.border}` }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: pc.color }}></span>
                  {pc.label}
                </span>
              )}
            </div>
          </div>

          {/* Botão fechar */}
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl transition-all cursor-pointer shrink-0"
            style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.55)" }}
          >
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>

        {/* Conteúdo rolável */}
        <div className="overflow-y-auto flex-1">

          {/* Cidadão */}
          <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.30)" }}>
              Cidadão que abriu a demanda
            </p>
            <div
              className="rounded-xl p-3.5 space-y-2"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              {demand.citizen_name && (
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 flex items-center justify-center shrink-0">
                    <i className="ri-user-line text-sm" style={{ color: "#E8A020" }}></i>
                  </div>
                  <span className="text-white font-semibold text-sm">{demand.citizen_name}</span>
                </div>
              )}
              {demand.citizen_email && (
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 flex items-center justify-center shrink-0">
                    <i className="ri-mail-line text-sm" style={{ color: "rgba(255,255,255,0.30)" }}></i>
                  </div>
                  <span className="text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>{demand.citizen_email}</span>
                </div>
              )}
              {demand.citizen_phone && (
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 flex items-center justify-center shrink-0">
                    <i className="ri-phone-line text-sm" style={{ color: "rgba(255,255,255,0.30)" }}></i>
                  </div>
                  <span className="text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>{demand.citizen_phone}</span>
                </div>
              )}
              {demand.citizen_neighborhood && (
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 flex items-center justify-center shrink-0">
                    <i className="ri-map-pin-line text-sm" style={{ color: "rgba(255,255,255,0.30)" }}></i>
                  </div>
                  <span className="text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>{demand.citizen_neighborhood}</span>
                </div>
              )}
              {!demand.citizen_name && !demand.citizen_email && !demand.citizen_phone && !demand.citizen_neighborhood && (
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.30)" }}>Nenhuma informação de contato</p>
              )}
            </div>
          </div>

          {/* Assessor responsável */}
          <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.30)" }}>
              Assessor responsável
            </p>
            {demand.assessor_name ? (
              <div
                className="flex items-center gap-3 px-3.5 py-3 rounded-xl"
                style={{ background: "rgba(59,191,212,0.10)", border: "1px solid rgba(59,191,212,0.20)" }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(59,191,212,0.20)" }}>
                  <i className="ri-shield-user-line text-sm" style={{ color: "#3BBFD4" }}></i>
                </div>
                <span className="text-white font-semibold text-sm">{demand.assessor_name}</span>
                <span className="ml-auto text-xs font-semibold" style={{ color: "#3BBFD4" }}>Em atendimento</span>
              </div>
            ) : (
              <div
                className="flex items-center gap-3 px-3.5 py-3 rounded-xl"
                style={{ background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.20)" }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(217,119,6,0.15)" }}>
                  <i className="ri-user-unfollow-line text-sm" style={{ color: "#D97706" }}></i>
                </div>
                <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.55)" }}>Nenhum assessor assumiu esta demanda ainda</span>
              </div>
            )}
          </div>

          {/* Descrição */}
          <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.30)" }}>
              Descrição da demanda
            </p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "rgba(255,255,255,0.75)" }}>
              {demand.description ?? "—"}
            </p>
          </div>

          {/* Observações do assessor */}
          {demand.assessor_notes && (
            <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.30)" }}>
                Observações do assessor
              </p>
              <div
                className="p-3.5 rounded-xl"
                style={{ background: "rgba(59,191,212,0.06)", border: "1px solid rgba(59,191,212,0.15)" }}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "rgba(255,255,255,0.70)" }}>
                  {demand.assessor_notes}
                </p>
              </div>
            </div>
          )}

          {/* Resposta oficial */}
          {demand.admin_notes && (
            <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.30)" }}>
                Resposta oficial
              </p>
              <div
                className="p-3.5 rounded-xl"
                style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.20)" }}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "rgba(255,255,255,0.70)" }}>
                  {demand.admin_notes}
                </p>
              </div>
            </div>
          )}

          {/* Histórico */}
          <div className="px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.30)" }}>
              Histórico
            </p>
            <div className="space-y-2.5">
              {[
                { icon: "ri-calendar-line", label: "Aberto em", value: formatDateTime(demand.created_at) },
                { icon: "ri-refresh-line", label: "Última atualização", value: formatDateTime(demand.updated_at ?? demand.created_at) },
                { icon: "ri-user-star-line", label: "Atualizado por", value: demand.assessor_name ?? "Sistema" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className="w-7 h-7 flex items-center justify-center shrink-0">
                    <i className={`${item.icon} text-sm`} style={{ color: "rgba(255,255,255,0.25)" }}></i>
                  </div>
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{item.label}:</span>
                  <span className="text-xs font-semibold text-white ml-auto text-right">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Espaço extra para mobile (bottom nav) */}
          <div className="h-4 md:h-0"></div>
        </div>
      </div>
    </div>
  );
}