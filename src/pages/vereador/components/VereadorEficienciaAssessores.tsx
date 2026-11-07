import { useState, useMemo } from "react";

interface AssessorStat {
  assessorId: string;
  assessorName: string;
  totalAssigned: number;
  emAndamento: number;
  aguardandoExterna: number;
  finalizadas: number;
  avgResponseTimeMinutes: number;
  lastActivity: string | null;
}

interface Props {
  demands: Array<{
    id: number;
    status: string;
    assessor_id: string | null;
    assessor_name: string | null;
    created_at: string;
    updated_at: string;
  }>;
  onExportPDF?: () => void;
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function timeSince(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  const dias = Math.floor(hrs / 24);
  return `${dias}d atrás`;
}

function calcAvgResponseTime(demands: Props["demands"], assessorId: string): number {
  const assessorDemands = demands.filter((d) => d.assessor_id === assessorId && d.status !== "aberto");
  if (assessorDemands.length === 0) return 0;
  const totalMinutes = assessorDemands.reduce((acc, d) => {
    const created = new Date(d.created_at).getTime();
    const updated = new Date(d.updated_at).getTime();
    return acc + (updated - created) / 60000;
  }, 0);
  return totalMinutes / assessorDemands.length;
}

export default function VereadorEficienciaAssessores({ demands, onExportPDF }: Props) {
  const [selectedAssessor, setSelectedAssessor] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"finalizadas" | "total" | "tempo">("finalizadas");

  const assessorStats = useMemo(() => {
    const map = new Map<string, AssessorStat>();

    demands.forEach((d) => {
      if (!d.assessor_id || !d.assessor_name) return;
      const existing = map.get(d.assessor_id);
      if (existing) {
        existing.totalAssigned++;
        if (d.status === "em_andamento") existing.emAndamento++;
        if (d.status === "aguardando_externa") existing.aguardandoExterna++;
        if (d.status === "finalizada") existing.finalizadas++;
        if (d.updated_at > (existing.lastActivity ?? "")) existing.lastActivity = d.updated_at;
      } else {
        map.set(d.assessor_id, {
          assessorId: d.assessor_id,
          assessorName: d.assessor_name,
          totalAssigned: 1,
          emAndamento: d.status === "em_andamento" ? 1 : 0,
          aguardandoExterna: d.status === "aguardando_externa" ? 1 : 0,
          finalizadas: d.status === "finalizada" ? 1 : 0,
          avgResponseTimeMinutes: 0,
          lastActivity: d.updated_at,
        });
      }
    });

    // Calculate avg response time
    map.forEach((stat, id) => {
      stat.avgResponseTimeMinutes = calcAvgResponseTime(demands, id);
    });

    return Array.from(map.values()).sort((a, b) => {
      switch (sortBy) {
        case "total": return b.totalAssigned - a.totalAssigned;
        case "tempo": return a.avgResponseTimeMinutes - b.avgResponseTimeMinutes;
        case "finalizadas":
        default: return b.finalizadas - a.finalizadas;
      }
    });
  }, [demands, sortBy]);

  const selectedStats = selectedAssessor ? assessorStats.find((s) => s.assessorId === selectedAssessor) : null;

  const totalFinalizadas = assessorStats.reduce((acc, s) => acc + s.finalizadas, 0);
  const totalAssigned = assessorStats.reduce((acc, s) => acc + s.totalAssigned, 0);
  const avgGlobalTime = assessorStats.length > 0
    ? assessorStats.reduce((acc, s) => acc + s.avgResponseTimeMinutes, 0) / assessorStats.length
    : 0;

  // For the bar chart, get top 6 assessores
  const topAssessores = [...assessorStats].slice(0, 6);
  const maxFinalizadas = topAssessores.length > 0 ? Math.max(...topAssessores.map((s) => s.finalizadas), 1) : 1;

  return (
    <div className="min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-extrabold text-white">Eficiência dos Assessores</h1>
          <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.40)" }}>
            {assessorStats.length} assessor{assessorStats.length !== 1 ? "es" : ""} · {totalAssigned} demandas atribuídas · {totalFinalizadas} finalizadas
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onExportPDF && (
            <button
              onClick={onExportPDF}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap transition-all"
              style={{ background: "rgba(239,68,68,0.15)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.30)" }}
            >
              <i className="ri-file-pdf-line"></i> Exportar PDF
            </button>
          )}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-2 rounded-xl text-xs text-white cursor-pointer"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}
          >
            <option value="finalizadas" style={{ color: "#000" }}>Mais Finalizadas</option>
            <option value="total" style={{ color: "#000" }}>Mais Demandas</option>
            <option value="tempo" style={{ color: "#000" }}>Menor Tempo Médio</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-5">
        {[
          { label: "Total Atribuídas", value: totalAssigned, icon: "ri-file-list-line", color: "#3BBFD4", bg: "rgba(59,191,212,0.12)" },
          { label: "Finalizadas", value: totalFinalizadas, icon: "ri-checkbox-circle-line", color: "#22C55E", bg: "rgba(22,163,74,0.12)" },
          { label: "Tempo Médio Global", value: formatMinutes(avgGlobalTime), icon: "ri-timer-line", color: "#E8A020", bg: "rgba(232,160,32,0.12)" },
          { label: "Taxa de Conclusão", value: totalAssigned > 0 ? `${Math.round((totalFinalizadas / totalAssigned) * 100)}%` : "0%", icon: "ri-pie-chart-line", color: "#A78BFA", bg: "rgba(167,139,250,0.12)" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl p-4 min-w-0" style={{ background: s.bg, border: `1px solid ${s.color}30` }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3" style={{ background: "rgba(255,255,255,0.08)" }}>
              <i className={`${s.icon} text-base`} style={{ color: s.color }}></i>
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-white truncate">{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Bar Chart Horizontal - Top Assessores */}
      {topAssessores.length > 0 && (
        <div className="rounded-2xl p-4 md:p-5 mb-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <h2 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
            <i className="ri-bar-chart-line" style={{ color: "#3BBFD4" }}></i>
            Comparativo de Finalizações
          </h2>
          <div className="space-y-3 min-w-0">
            {topAssessores.map((s, idx) => {
              const pct = maxFinalizadas > 0 ? (s.finalizadas / maxFinalizadas) * 100 : 0;
              const barWidth = Math.max(pct, 4);
              return (
                <div key={s.assessorId} className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-bold w-5 text-right shrink-0" style={{ color: "rgba(255,255,255,0.30)" }}>
                    {idx + 1}
                  </span>
                  <span className="text-xs font-semibold w-16 sm:w-24 truncate text-white shrink-0">{s.assessorName}</span>
                  <div className="flex-1 h-6 rounded-full overflow-hidden min-w-0" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div
                      className="h-full rounded-full min-w-0"
                      style={{
                        width: `${barWidth}%`,
                        background: idx === 0 ? "linear-gradient(90deg, #22C55E, #4ade80)" : idx === 1 ? "linear-gradient(90deg, #3BBFD4, #60d5e8)" : "linear-gradient(90deg, #E8A020, #f5b94a)",
                      }}
                    ></div>
                  </div>
                  <span className="text-xs font-bold text-white shrink-0 w-8 text-right">
                    {s.finalizadas}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content: Cards on mobile, Table on desktop */}
      <div className="grid lg:grid-cols-5 gap-5 min-w-0">
        {/* Cards on mobile / Table on desktop */}
        <div className="lg:col-span-3 min-w-0">
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    {["Assessor", "Total", "Em And.", "Ag. Ext.", "Finaliz.", "Tempo Médio", "Última Ativ."].map((h) => (
                      <th key={h} className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: "rgba(255,255,255,0.35)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {assessorStats.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center" style={{ color: "rgba(255,255,255,0.30)" }}>
                        Nenhum assessor com demandas atribuídas
                      </td>
                    </tr>
                  ) : (
                    assessorStats.map((s) => (
                      <tr
                        key={s.assessorId}
                        onClick={() => setSelectedAssessor(selectedAssessor === s.assessorId ? null : s.assessorId)}
                        className="cursor-pointer transition-colors hover:bg-white/5"
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.04)",
                          background: selectedAssessor === s.assessorId ? "rgba(59,191,212,0.08)" : "transparent",
                        }}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs"
                              style={{ background: "rgba(59,191,212,0.15)", color: "#3BBFD4" }}
                            >
                              {s.assessorName[0].toUpperCase()}
                            </div>
                            <span className="text-white font-semibold text-xs truncate">{s.assessorName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-white font-bold">{s.totalAssigned}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold" style={{ color: "#3BBFD4" }}>{s.emAndamento}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold" style={{ color: "#A78BFA" }}>{s.aguardandoExterna}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold" style={{ color: "#22C55E" }}>{s.finalizadas}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold" style={{ color: s.avgResponseTimeMinutes < avgGlobalTime ? "#22C55E" : s.avgResponseTimeMinutes > avgGlobalTime * 1.5 ? "#EF4444" : "#E8A020" }}>
                            {formatMinutes(s.avgResponseTimeMinutes)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span style={{ color: "rgba(255,255,255,0.35)" }}>{timeSince(s.lastActivity)}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden">
              {assessorStats.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm" style={{ color: "rgba(255,255,255,0.30)" }}>
                  Nenhum assessor com demandas atribuídas
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                  {assessorStats.map((s) => {
                    const taxa = s.totalAssigned > 0 ? Math.round((s.finalizadas / s.totalAssigned) * 100) : 0;
                    return (
                      <div
                        key={s.assessorId}
                        onClick={() => setSelectedAssessor(selectedAssessor === s.assessorId ? null : s.assessorId)}
                        className="cursor-pointer transition-colors hover:bg-white/5 p-4"
                        style={{
                          background: selectedAssessor === s.assessorId ? "rgba(59,191,212,0.08)" : "transparent",
                        }}
                      >
                        {/* Header: avatar + nome */}
                        <div className="flex items-center gap-3 mb-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm"
                            style={{ background: "rgba(59,191,212,0.15)", color: "#3BBFD4" }}
                          >
                            {s.assessorName[0].toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-white font-bold text-sm truncate">{s.assessorName}</p>
                            <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                              Última atividade: {timeSince(s.lastActivity)}
                            </p>
                          </div>
                          <span className="text-xs font-bold px-2 py-1 rounded-full shrink-0 whitespace-nowrap" style={{ background: "rgba(34,197,94,0.12)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.25)" }}>
                            {taxa}%
                          </span>
                        </div>

                        {/* 4 mini cards grid */}
                        <div className="grid grid-cols-4 gap-2">
                          <div className="text-center p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                            <p className="text-white font-bold text-sm">{s.totalAssigned}</p>
                            <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>Total</p>
                          </div>
                          <div className="text-center p-2 rounded-lg" style={{ background: "rgba(59,191,212,0.06)", border: "1px solid rgba(59,191,212,0.12)" }}>
                            <p className="font-bold text-sm" style={{ color: "#3BBFD4" }}>{s.emAndamento}</p>
                            <p className="text-[10px] mt-0.5" style={{ color: "rgba(59,191,212,0.60)" }}>Em And.</p>
                          </div>
                          <div className="text-center p-2 rounded-lg" style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.12)" }}>
                            <p className="font-bold text-sm" style={{ color: "#A78BFA" }}>{s.aguardandoExterna}</p>
                            <p className="text-[10px] mt-0.5" style={{ color: "rgba(167,139,250,0.60)" }}>Ag. Ext.</p>
                          </div>
                          <div className="text-center p-2 rounded-lg" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.12)" }}>
                            <p className="font-bold text-sm" style={{ color: "#22C55E" }}>{s.finalizadas}</p>
                            <p className="text-[10px] mt-0.5" style={{ color: "rgba(34,197,94,0.60)" }}>Finaliz.</p>
                          </div>
                        </div>

                        {/* Tempo médio */}
                        <div className="flex items-center justify-between mt-2 px-1">
                          <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                            <i className="ri-timer-line mr-1" style={{ color: "#E8A020" }}></i>
                            Tempo médio
                          </span>
                          <span className="text-xs font-bold" style={{ color: s.avgResponseTimeMinutes < avgGlobalTime ? "#22C55E" : s.avgResponseTimeMinutes > avgGlobalTime * 1.5 ? "#EF4444" : "#E8A020" }}>
                            {formatMinutes(s.avgResponseTimeMinutes)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-2 min-w-0">
          {selectedStats ? (
            <div
              className="rounded-2xl p-5 space-y-4"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold"
                    style={{ background: "rgba(59,191,212,0.20)", color: "#3BBFD4" }}
                  >
                    {selectedStats.assessorName[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-white font-bold text-sm truncate">{selectedStats.assessorName}</h3>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                      Última atividade: {timeSince(selectedStats.lastActivity)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAssessor(null)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/40 cursor-pointer shrink-0"
                >
                  <i className="ri-close-line text-sm"></i>
                </button>
              </div>

              {/* Individual metrics */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Total Demandas", value: selectedStats.totalAssigned, color: "#3BBFD4" },
                  { label: "Em Andamento", value: selectedStats.emAndamento, color: "#3BBFD4" },
                  { label: "Ag. Externa", value: selectedStats.aguardandoExterna, color: "#A78BFA" },
                  { label: "Finalizadas", value: selectedStats.finalizadas, color: "#22C55E" },
                ].map((m) => (
                  <div key={m.label} className="p-3 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="text-lg font-extrabold" style={{ color: m.color }}>{m.value}</p>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.40)" }}>{m.label}</p>
                  </div>
                ))}
              </div>

              {/* Tempo médio de resposta */}
              <div
                className="p-4 rounded-xl"
                style={{ background: "rgba(232,160,32,0.08)", border: "1px solid rgba(232,160,32,0.20)" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <i className="ri-timer-line" style={{ color: "#E8A020" }}></i>
                  <span className="text-xs font-bold" style={{ color: "#E8A020" }}>
                    Tempo Médio de Resposta: {formatMinutes(selectedStats.avgResponseTimeMinutes)}
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min((1 - selectedStats.avgResponseTimeMinutes / (avgGlobalTime * 2 || 1)) * 100, 100)}%`,
                      background: selectedStats.avgResponseTimeMinutes < avgGlobalTime
                        ? "linear-gradient(90deg, #22C55E, #4ade80)"
                        : selectedStats.avgResponseTimeMinutes > avgGlobalTime * 1.5
                        ? "linear-gradient(90deg, #EF4444, #f87171)"
                        : "linear-gradient(90deg, #E8A020, #f5b94a)",
                    }}
                  ></div>
                </div>
                <p className="text-xs mt-1.5" style={{ color: "rgba(255,255,255,0.30)" }}>
                  {selectedStats.avgResponseTimeMinutes < avgGlobalTime
                    ? `${Math.round((1 - selectedStats.avgResponseTimeMinutes / (avgGlobalTime || 1)) * 100)}% mais rápido que a média`
                    : `${Math.round((selectedStats.avgResponseTimeMinutes / (avgGlobalTime || 1) - 1) * 100)}% acima da média`}
                </p>
              </div>

              {/* Completion rate bar */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1" style={{ color: "rgba(255,255,255,0.40)" }}>
                  <span>Taxa de Conclusão</span>
                  <span className="font-bold text-white">
                    {selectedStats.totalAssigned > 0
                      ? `${Math.round((selectedStats.finalizadas / selectedStats.totalAssigned) * 100)}%`
                      : "0%"}
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${selectedStats.totalAssigned > 0 ? (selectedStats.finalizadas / selectedStats.totalAssigned) * 100 : 0}%`,
                      background: "linear-gradient(90deg, #22C55E, #4ade80)",
                    }}
                  ></div>
                </div>
              </div>

              {/* Distribution */}
              <div>
                <p className="text-xs font-bold mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>Distribuição de Status</p>
                <div className="flex h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  {selectedStats.totalAssigned > 0 && (
                    <>
                      {selectedStats.emAndamento > 0 && (
                        <div style={{ width: `${(selectedStats.emAndamento / selectedStats.totalAssigned) * 100}%`, background: "#3BBFD4" }}></div>
                      )}
                      {selectedStats.aguardandoExterna > 0 && (
                        <div style={{ width: `${(selectedStats.aguardandoExterna / selectedStats.totalAssigned) * 100}%`, background: "#A78BFA" }}></div>
                      )}
                      {selectedStats.finalizadas > 0 && (
                        <div style={{ width: `${(selectedStats.finalizadas / selectedStats.totalAssigned) * 100}%`, background: "#22C55E" }}></div>
                      )}
                    </>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 mt-2">
                  {[
                    { label: "Andamento", color: "#3BBFD4", count: selectedStats.emAndamento },
                    { label: "Ag. Externa", color: "#A78BFA", count: selectedStats.aguardandoExterna },
                    { label: "Finalizadas", color: "#22C55E", count: selectedStats.finalizadas },
                  ].map((l) => (
                    <span key={l.label} className="flex items-center gap-1.5 text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }}></span>
                      {l.label}: {l.count}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div
              className="rounded-2xl flex flex-col items-center justify-center py-16"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.10)" }}
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: "rgba(59,191,212,0.10)" }}>
                <i className="ri-user-search-line text-xl" style={{ color: "rgba(59,191,212,0.40)" }}></i>
              </div>
              <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.30)" }}>Selecione um assessor</p>
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.18)" }}>Clique na tabela ou card para ver detalhes</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}