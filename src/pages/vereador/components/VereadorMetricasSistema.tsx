import { useState, useMemo } from "react";

interface Demand {
  id: number;
  type: string;
  category: string;
  status: string;
  citizen_neighborhood: string | null;
  assessor_id: string | null;
  assessor_name: string | null;
  created_at: string;
  updated_at: string;
}

interface Cidadao {
  id: string;
  full_name: string | null;
  neighborhood: string | null;
  job_status: string | null;
  is_employed: boolean | null;
  employed_through_platform: boolean | null;
  platform_job_details: string | null;
  employment_survey_completed: boolean | null;
  curriculo_pdf: string | null;
  created_at: string;
}

interface Vaga {
  id: number;
  title: string;
  company_name: string | null;
  status: string;
}

interface CidadaoContratado {
  cidadao: Cidadao;
  vaga: Vaga | null;
}

interface Props {
  demands: Demand[];
  cidadaos: Cidadao[];
  vagas: Vaga[];
  comCurriculo: number;
  lookingWork: number;
  employed: number;
  totalCidadaos: number;
  contratados: CidadaoContratado[];
  onSelectUsuario?: (cidadaoId: string) => void;
  onExportPDF?: (metricTab: "demandas" | "empregabilidade" | "bairros") => void;
}

const typeLabel: Record<string, string> = {
  requerimento: "Requerimento",
  sugestao: "Sugestão",
  contato: "Contato",
};

function calcResponseTimeHours(d: Demand): number {
  const created = new Date(d.created_at).getTime();
  const updated = new Date(d.updated_at).getTime();
  return (updated - created) / (1000 * 60 * 60);
}

function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}min`;
  if (hours < 24) return `${Math.round(hours)}h`;
  const dias = Math.floor(hours / 24);
  const hrs = Math.round(hours % 24);
  return hrs > 0 ? `${dias}d ${hrs}h` : `${dias}d`;
}

function barChart(items: { label: string; count: number; color: string; max: number; total?: number }[]) {
  return (
    <div className="space-y-3 min-w-0">
      {items.map((item) => {
        const pct = item.total
          ? (item.count / item.total) * 100
          : item.max > 0
          ? (item.count / item.max) * 100
          : 0;
        const barWidth = Math.max(pct, 4);
        return (
          <div key={item.label} className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold text-white/60 shrink-0 truncate text-right w-14 sm:w-24">
              {item.label}
            </span>
            <div
              className="flex-1 h-5 rounded-full overflow-hidden min-w-0"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <div
                className="h-full rounded-full min-w-0"
                style={{ width: `${barWidth}%`, background: item.color }}
              ></div>
            </div>
            <span className="text-xs font-bold text-white shrink-0 w-16 text-right">
              {item.count} ({Math.round(pct)}%)
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function VereadorMetricasSistema({
  demands,
  cidadaos,
  vagas,
  comCurriculo,
  lookingWork,
  employed,
  totalCidadaos,
  contratados,
  onSelectUsuario,
  onExportPDF,
}: Props) {
  const [metricTab, setMetricTab] = useState<"demandas" | "empregabilidade" | "bairros">("demandas");

  // ── Demandas Metrics ──
  const demandMetrics = useMemo(() => {
    const porTipo: Record<string, number> = {};
    const porStatus: Record<string, number> = {};
    const porCategoria: Record<string, number> = {};
    const responseTimes: number[] = [];
    const hoje = new Date();
    const ultimos30dias = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);
    let ultimoMes = 0;
    let semAssessor = 0;

    demands.forEach((d) => {
      porTipo[d.type] = (porTipo[d.type] || 0) + 1;
      porStatus[d.status] = (porStatus[d.status] || 0) + 1;
      if (d.category)
        porCategoria[d.category] = (porCategoria[d.category] || 0) + 1;
      if (d.status !== "aberto") {
        responseTimes.push(calcResponseTimeHours(d));
      }
      if (new Date(d.created_at) >= ultimos30dias) ultimoMes++;
      if (!d.assessor_id) semAssessor++;
    });

    const avgResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

    const medianResponseTime =
      responseTimes.length > 0
        ? responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length / 2)]
        : 0;

    const faster24h = responseTimes.filter((t) => t <= 24).length;
    const between24e72 = responseTimes.filter((t) => t > 24 && t <= 72).length;
    const over72h = responseTimes.filter((t) => t > 72).length;

    return {
      porTipo,
      porStatus,
      porCategoria,
      avgResponseTime,
      medianResponseTime,
      faster24h,
      between24e72,
      over72h,
      ultimoMes,
      semAssessor,
      totalComResposta: responseTimes.length,
    };
  }, [demands]);

  // ── Bairros Metrics ──
  const bairrosMetrics = useMemo(() => {
    const porBairro: Record<string, number> = {};
    demands.forEach((d) => {
      const b = d.citizen_neighborhood?.trim() || "Não informado";
      porBairro[b] = (porBairro[b] || 0) + 1;
    });
    return Object.entries(porBairro)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);
  }, [demands]);

  // ── Empregabilidade Metrics ──
  const empregabilidadeMetrics = useMemo(() => {
    const comSurvey = cidadaos.filter((c) => c.employment_survey_completed).length;
    const semSurvey = cidadaos.filter((c) => !c.employment_survey_completed).length;
    const empregados = cidadaos.filter((c) => c.is_employed === true).length;
    const desempregados = cidadaos.filter((c) => c.is_employed === false).length;
    const buscando = cidadaos.filter((c) => c.job_status !== "not_looking").length;
    const naoBuscando = cidadaos.filter((c) => c.job_status === "not_looking").length;
    const taxaEmpregabilidade =
      totalCidadaos > 0 ? Math.round((employed / totalCidadaos) * 100) : 0;
    const taxaCurriculo =
      totalCidadaos > 0 ? Math.round((comCurriculo / totalCidadaos) * 100) : 0;
    const taxaBuscando =
      totalCidadaos > 0 ? Math.round((lookingWork / totalCidadaos) * 100) : 0;

    return {
      comSurvey,
      semSurvey,
      empregados,
      desempregados,
      buscando,
      naoBuscando,
      taxaEmpregabilidade,
      taxaCurriculo,
      taxaBuscando,
    };
  }, [cidadaos, totalCidadaos, employed, comCurriculo, lookingWork]);

  const topCategorias = Object.entries(demandMetrics.porCategoria)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const maxCat = topCategorias.length > 0 ? topCategorias[0][1] : 1;

  return (
    <div className="min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-extrabold text-white">
            Métricas do Sistema
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.40)" }}>
            {demands.length} demandas · {totalCidadaos} cidadãos · {bairrosMetrics.length}{" "}
            bairros
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onExportPDF && (
            <button
              onClick={() => onExportPDF(metricTab)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap transition-all"
              style={{
                background: "rgba(239,68,68,0.15)",
                color: "#EF4444",
                border: "1px solid rgba(239,68,68,0.30)",
              }}
            >
              <i className="ri-file-pdf-line"></i> Exportar PDF
            </button>
          )}
        </div>
      </div>

      {/* Tab selector */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {[
          { key: "demandas" as const, label: "Demandas", icon: "ri-file-list-line" },
          { key: "empregabilidade" as const, label: "Empregabilidade", icon: "ri-briefcase-4-line" },
          { key: "bairros" as const, label: "Bairros", icon: "ri-map-pin-line" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setMetricTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              metricTab === tab.key ? "text-white" : "text-white/40"
            }`}
            style={
              metricTab === tab.key
                ? {
                    background: "rgba(59,191,212,0.15)",
                    border: "1px solid rgba(59,191,212,0.25)",
                  }
                : {
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }
            }
          >
            <i className={`${tab.icon} text-sm`}></i>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── ABA: DEMANDAS ── */}
      {metricTab === "demandas" && (
        <div className="space-y-5 min-w-0">
          {/* Big numbers */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              {
                label: "Total",
                value: demands.length,
                color: "#3BBFD4",
                bg: "rgba(59,191,212,0.12)",
              },
              {
                label: "Últimos 30 dias",
                value: demandMetrics.ultimoMes,
                color: "#E8A020",
                bg: "rgba(232,160,32,0.12)",
              },
              {
                label: "Sem Assessor",
                value: demandMetrics.semAssessor,
                color: "#EF4444",
                bg: "rgba(239,68,68,0.12)",
              },
              {
                label: "Tempo Médio",
                value: formatHours(demandMetrics.avgResponseTime),
                color: "#22C55E",
                bg: "rgba(22,163,74,0.12)",
              },
              {
                label: "Tempo Mediano",
                value: formatHours(demandMetrics.medianResponseTime),
                color: "#A78BFA",
                bg: "rgba(167,139,250,0.12)",
              },
              {
                label: "Finalizadas",
                value: demandMetrics.porStatus["finalizada"] || 0,
                color: "#22C55E",
                bg: "rgba(22,163,74,0.12)",
              },
            ].map((m) => (
              <div
                key={m.label}
                className="rounded-2xl p-4 min-w-0"
                style={{ background: m.bg, border: `1px solid ${m.color}30` }}
              >
                <p
                  className="text-lg sm:text-xl font-extrabold truncate"
                  style={{ color: m.color }}
                >
                  {m.value}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                  {m.label}
                </p>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-5 min-w-0">
            {/* Por Tipo */}
            <div
              className="rounded-2xl p-5 min-w-0"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <h2 className="text-white font-bold text-sm mb-4">Demandas por Tipo</h2>
              {barChart(
                Object.entries(demandMetrics.porTipo).map(([tipo, count]) => ({
                  label: typeLabel[tipo] ?? tipo,
                  count,
                  color:
                    tipo === "requerimento"
                      ? "linear-gradient(90deg, #3BBFD4, #60d5e8)"
                      : tipo === "sugestao"
                      ? "linear-gradient(90deg, #E8A020, #f5b94a)"
                      : "linear-gradient(90deg, #A78BFA, #c4b5fd)",
                  max: demands.length,
                  total: demands.length,
                }))
              )}
            </div>

            {/* Por Status */}
            <div
              className="rounded-2xl p-5 min-w-0"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <h2 className="text-white font-bold text-sm mb-4">Demandas por Status</h2>
              {barChart(
                [
                  { key: "aberto", label: "Em Aberto", color: "#D97706" },
                  { key: "em_andamento", label: "Em Andamento", color: "#3BBFD4" },
                  { key: "aguardando_externa", label: "Ag. Externa", color: "#A78BFA" },
                  { key: "finalizada", label: "Finalizada", color: "#22C55E" },
                ].map((s) => ({
                  label: s.label,
                  count: demandMetrics.porStatus[s.key] || 0,
                  color: s.color,
                  max: demands.length,
                  total: demands.length,
                }))
              )}
            </div>

            {/* Tempo de Resposta */}
            <div
              className="rounded-2xl p-5 min-w-0"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <h2 className="text-white font-bold text-sm mb-4">Tempo de Resposta</h2>
              {demandMetrics.totalComResposta > 0 ? (
                barChart([
                  {
                    label: "Até 24h",
                    count: demandMetrics.faster24h,
                    color: "#22C55E",
                    max: demandMetrics.totalComResposta,
                    total: demandMetrics.totalComResposta,
                  },
                  {
                    label: "24h — 72h",
                    count: demandMetrics.between24e72,
                    color: "#E8A020",
                    max: demandMetrics.totalComResposta,
                    total: demandMetrics.totalComResposta,
                  },
                  {
                    label: "+72h",
                    count: demandMetrics.over72h,
                    color: "#EF4444",
                    max: demandMetrics.totalComResposta,
                    total: demandMetrics.totalComResposta,
                  },
                ])
              ) : (
                <p className="text-sm text-white/30">Nenhuma demanda com resposta ainda</p>
              )}
            </div>

            {/* Categorias */}
            <div
              className="rounded-2xl p-5 min-w-0"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <h2 className="text-white font-bold text-sm mb-4">Top Categorias</h2>
              {topCategorias.length > 0 ? (
                <div className="space-y-2.5 min-w-0">
                  {topCategorias.map(([cat, count], i) => (
                    <div key={cat} className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-bold w-4 text-right text-white/25 shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-xs font-semibold flex-1 truncate text-white/70">
                        {cat}
                      </span>
                      <div
                        className="w-16 sm:w-20 h-4 rounded-full overflow-hidden shrink-0"
                        style={{ background: "rgba(255,255,255,0.06)" }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max((count / maxCat) * 100, 4)}%`,
                            background:
                              i === 0
                                ? "#3BBFD4"
                                : i === 1
                                ? "#E8A020"
                                : i === 2
                                ? "#A78BFA"
                                : "rgba(255,255,255,0.20)",
                          }}
                        ></div>
                      </div>
                      <span className="text-xs font-bold w-6 text-right text-white/50 shrink-0">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-white/30">Nenhuma categoria registrada</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── ABA: EMPREGABILIDADE ── */}
      {metricTab === "empregabilidade" && (
        <div className="space-y-5 min-w-0">
          {/* Big numbers */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Total Cidadãos", value: totalCidadaos, color: "#3BBFD4" },
              { label: "Com Currículo", value: comCurriculo, color: "#22C55E" },
              { label: "Buscando Emprego", value: lookingWork, color: "#E8A020" },
              { label: "Empregados", value: employed, color: "#22C55E" },
              {
                label: "Pesquisa Respondida",
                value: empregabilidadeMetrics.comSurvey,
                color: "#A78BFA",
              },
              {
                label: "Sem Responder",
                value: empregabilidadeMetrics.semSurvey,
                color: "#EF4444",
              },
            ].map((m) => (
              <div
                key={m.label}
                className="rounded-2xl p-4 min-w-0"
                style={{
                  background: `rgba(255,255,255,0.04)`,
                  border: `1px solid ${m.color}30`,
                }}
              >
                <p
                  className="text-lg sm:text-xl font-extrabold truncate"
                  style={{ color: m.color }}
                >
                  {m.value}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                  {m.label}
                </p>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-5 min-w-0">
            {/* Taxas */}
            <div
              className="rounded-2xl p-5 min-w-0"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <h2 className="text-white font-bold text-sm mb-4">
                Indicadores de Empregabilidade
              </h2>
              <div className="space-y-4">
                {[
                  {
                    label: "Taxa de Emprego",
                    value: empregabilidadeMetrics.taxaEmpregabilidade,
                    color: "#22C55E",
                  },
                  {
                    label: "Taxa de Currículo",
                    value: empregabilidadeMetrics.taxaCurriculo,
                    color: "#3BBFD4",
                  },
                  {
                    label: "Taxa Buscando Emprego",
                    value: empregabilidadeMetrics.taxaBuscando,
                    color: "#E8A020",
                  },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span style={{ color: "rgba(255,255,255,0.45)" }}>{item.label}</span>
                      <span className="font-bold text-white">{item.value}%</span>
                    </div>
                    <div
                      className="h-2 rounded-full overflow-hidden"
                      style={{ background: "rgba(255,255,255,0.08)" }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${item.value}%`, background: item.color }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Distribuição */}
            <div
              className="rounded-2xl p-5 min-w-0"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <h2 className="text-white font-bold text-sm mb-4">
                Distribuição por Situação
              </h2>
              {(() => {
                const maxCount = Math.max(
                  empregabilidadeMetrics.empregados,
                  empregabilidadeMetrics.desempregados,
                  empregabilidadeMetrics.buscando,
                  empregabilidadeMetrics.naoBuscando,
                  1
                );
                return barChart([
                  {
                    label: "Empregados",
                    count: empregabilidadeMetrics.empregados,
                    color: "#22C55E",
                    max: maxCount,
                    total: maxCount,
                  },
                  {
                    label: "Desempregados",
                    count: empregabilidadeMetrics.desempregados,
                    color: "#EF4444",
                    max: maxCount,
                    total: maxCount,
                  },
                  {
                    label: "Buscando Ativamente",
                    count: empregabilidadeMetrics.buscando,
                    color: "#E8A020",
                    max: maxCount,
                    total: maxCount,
                  },
                  {
                    label: "Não Buscando",
                    count: empregabilidadeMetrics.naoBuscando,
                    color: "rgba(255,255,255,0.30)",
                    max: maxCount,
                    total: maxCount,
                  },
                ]);
              })()}
            </div>
          </div>

          {/* Contratados pela Plataforma */}
          <div
            className="rounded-2xl p-5 min-w-0"
            style={{
              background: "rgba(34,197,94,0.06)",
              border: "1px solid rgba(34,197,94,0.20)",
            }}
          >
            <h2 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
              <i className="ri-building-line" style={{ color: "#22C55E" }}></i>
              Contratados pela Plataforma
              <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-extrabold" style={{ background: "rgba(34,197,94,0.20)", color: "#22C55E" }}>
                {contratados.length}
              </span>
            </h2>
            {contratados.length === 0 ? (
              <p className="text-sm text-white/20 text-center py-4">Nenhum cidadão contratado pela plataforma ainda</p>
            ) : (
              <div className="space-y-2">
                {contratados.map(({ cidadao, vaga }) => {
                  const vagaInfo = vaga?.title || cidadao.platform_job_details || "Vaga via plataforma";
                  const empresaInfo = vaga?.company_name || "Empresa parceira";
                  return (
                    <div key={cidadao.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(34,197,94,0.15)" }}>
                        <span className="text-xs font-bold" style={{ color: "#22C55E" }}>{(cidadao.full_name || "?")[0].toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm truncate">{cidadao.full_name || "Cidadão"}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          <span className="text-xs flex items-center gap-1" style={{ color: "#E8A020" }}>
                            <i className="ri-briefcase-4-line"></i>
                            {vagaInfo}
                          </span>
                          <span className="text-xs flex items-center gap-1" style={{ color: "#3BBFD4" }}>
                            <i className="ri-building-line"></i>
                            {empresaInfo}
                          </span>
                          {cidadao.neighborhood && (
                            <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
                              <i className="ri-map-pin-line mr-1"></i>
                              {cidadao.neighborhood}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {onSelectUsuario && (
                          <button
                            onClick={() => onSelectUsuario(cidadao.id)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all whitespace-nowrap"
                            style={{ background: "rgba(59,191,212,0.15)", color: "#3BBFD4", border: "1px solid rgba(59,191,212,0.30)" }}
                          >
                            <i className="ri-eye-line"></i>
                            Saiba Mais
                          </button>
                        )}
                        <span className="text-xs font-bold px-2 py-1 rounded-full shrink-0 whitespace-nowrap" style={{ background: "rgba(34,197,94,0.12)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.25)" }}>
                          <i className="ri-check-line mr-1"></i>Contratado
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Autodeclarados Empregados */}
          {(() => {
            const autodeclarados = cidadaos.filter(c => c.is_employed === true && c.employed_through_platform !== true);
            if (autodeclarados.length === 0) return null;
            return (
              <div
                className="rounded-2xl p-5 min-w-0"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <h2 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                  <i className="ri-user-voice-line" style={{ color: "#E8A020" }}></i>
                  Autodeclarados Empregados
                  <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-extrabold" style={{ background: "rgba(232,160,32,0.20)", color: "#E8A020" }}>
                    {autodeclarados.length}
                  </span>
                </h2>
                <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.30)" }}>
                  Cidadãos que informaram estar empregados, mas não foram contratados via plataforma
                </p>
                <div className="space-y-2">
                  {autodeclarados.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(232,160,32,0.15)" }}>
                        <span className="text-xs font-bold" style={{ color: "#E8A020" }}>{(c.full_name || "?")[0].toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm truncate">{c.full_name || "Cidadão"}</p>
                        <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.35)" }}>
                          {c.neighborhood && <span>{c.neighborhood}</span>}
                        </p>
                      </div>
                      {onSelectUsuario && (
                        <button
                          onClick={() => onSelectUsuario(c.id)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all whitespace-nowrap shrink-0"
                          style={{ background: "rgba(59,191,212,0.15)", color: "#3BBFD4", border: "1px solid rgba(59,191,212,0.30)" }}
                        >
                          <i className="ri-eye-line"></i>
                          Saiba Mais
                        </button>
                      )}
                      <span className="text-xs font-bold px-2 py-1 rounded-full shrink-0 whitespace-nowrap" style={{ background: "rgba(232,160,32,0.12)", color: "#E8A020", border: "1px solid rgba(232,160,32,0.25)" }}>
                        <i className="ri-user-voice-line mr-1"></i>Informado
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── ABA: BAIRROS ── */}
      {metricTab === "bairros" && (
        <div className="min-w-0">
          <div
            className="rounded-2xl p-5 mb-5 min-w-0"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <h2 className="text-white font-bold text-sm mb-4">
              Demandas por Bairro (Top 15)
            </h2>
            {bairrosMetrics.length === 0 ? (
              <p className="text-sm text-white/30">Nenhum dado de bairro registrado</p>
            ) : (
              <div className="space-y-2.5 min-w-0">
                {bairrosMetrics.map(([bairro, count], i) => {
                  const maxBairro = bairrosMetrics[0]?.[1] || 1;
                  return (
                    <div key={bairro} className="flex items-center gap-3 min-w-0">
                      <span
                        className="text-xs font-bold w-5 text-right shrink-0"
                        style={{ color: "rgba(255,255,255,0.30)" }}
                      >
                        {i + 1}
                      </span>
                      <span className="text-xs font-semibold w-20 sm:w-32 truncate text-white/70 shrink-0">
                        {bairro}
                      </span>
                      <div
                        className="flex-1 h-5 rounded-full overflow-hidden min-w-0"
                        style={{ background: "rgba(255,255,255,0.06)" }}
                      >
                        <div
                          className="h-full rounded-full min-w-0"
                          style={{
                            width: `${Math.max((count / maxBairro) * 100, 6)}%`,
                            background:
                              i === 0
                                ? "linear-gradient(90deg, #3BBFD4, #60d5e8)"
                                : i < 3
                                ? "linear-gradient(90deg, #E8A020, #f5b94a)"
                                : "linear-gradient(90deg, rgba(255,255,255,0.15), rgba(255,255,255,0.25))",
                          }}
                        ></div>
                      </div>
                      <span className="text-xs font-bold text-white shrink-0 w-8 text-right">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Summary by bairro */}
          {bairrosMetrics.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {bairrosMetrics.slice(0, 10).map(([bairro, count], i) => (
                <div
                  key={bairro}
                  className="rounded-2xl p-4 text-center min-w-0"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <p className="text-lg font-extrabold text-white">{count}</p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.40)" }}>
                    {bairro === "Não informado" ? (
                      <>
                        <i className="ri-question-line mr-1"></i>Não informado
                      </>
                    ) : (
                      <>
                        <i
                          className="ri-map-pin-line mr-1"
                          style={{
                            color: i === 0 ? "#3BBFD4" : i < 3 ? "#E8A020" : "rgba(255,255,255,0.25)",
                          }}
                        ></i>
                        {bairro}
                      </>
                    )}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}