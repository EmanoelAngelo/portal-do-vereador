import { useState } from "react";

export interface VereadorDemandCard {
  id: number;
  type: string;
  title: string;
  category: string;
  status: string;
  priority: string | null;
  citizen_name: string | null;
  citizen_neighborhood: string | null;
  assessor_id: string | null;
  assessor_name: string | null;
  created_at: string;
  updated_at: string;
}

interface VereadorKanbanProps {
  demands: VereadorDemandCard[];
  selected: VereadorDemandCard | null;
  onSelect: (d: VereadorDemandCard) => void;
}

const columns = [
  {
    key: "aberto",
    label: "Em Aberto",
    icon: "ri-inbox-line",
    color: "#D97706",
    bg: "rgba(217,119,6,0.12)",
    border: "rgba(217,119,6,0.25)",
  },
  {
    key: "em_andamento",
    label: "Em Andamento",
    icon: "ri-loader-4-line",
    color: "#0369A1",
    bg: "rgba(3,105,161,0.12)",
    border: "rgba(3,105,161,0.25)",
  },
  {
    key: "aguardando_externa",
    label: "Ag. Resp. Externa",
    icon: "ri-mail-send-line",
    color: "#7C3AED",
    bg: "rgba(124,58,237,0.12)",
    border: "rgba(124,58,237,0.25)",
  },
  {
    key: "finalizada",
    label: "Finalizada",
    icon: "ri-checkbox-circle-line",
    color: "#16A34A",
    bg: "rgba(22,163,74,0.12)",
    border: "rgba(22,163,74,0.25)",
  },
];

const typeLabel: Record<string, string> = {
  requerimento: "Requerimento",
  sugestao: "Sugestão de Projeto",
  contato: "Contato",
};

const priorityConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  urgente: { label: "Urgente", color: "#EF4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.25)" },
  importante: { label: "Importante", color: "#E8A020", bg: "rgba(232,160,32,0.12)", border: "rgba(232,160,32,0.25)" },
  normal: { label: "Normal", color: "#6B7280", bg: "rgba(107,114,128,0.10)", border: "rgba(107,114,128,0.20)" },
};

function getPriorityBadge(priority: string | null | undefined) {
  if (!priority || !priorityConfig[priority]) return null;
  const p = priorityConfig[priority];
  return (
    <span
      className="text-[10px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1"
      style={{ background: p.bg, color: p.color, border: `1px solid ${p.border}` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }}></span>
      {p.label}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" });
}

export default function VereadorKanban({ demands, selected, onSelect }: VereadorKanbanProps) {
  const [activeCol, setActiveCol] = useState<string>("aberto");
  const [sortBy, setSortBy] = useState<string>("recentes");

  const sortCards = (cards: VereadorDemandCard[]) => {
    const sorted = [...cards];
    switch (sortBy) {
      case "antigos":
        return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      case "urgente":
        return sorted.sort((a, b) => {
          const pa = a.priority === "urgente" ? 0 : a.priority === "importante" ? 1 : 2;
          const pb = b.priority === "urgente" ? 0 : b.priority === "importante" ? 1 : 2;
          if (pa !== pb) return pa - pb;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
      case "recentes":
      default:
        return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  };

  const daysInColumn = (d: VereadorDemandCard) => {
    const updated = new Date(d.updated_at);
    const now = new Date();
    return Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getCards = (key: string) => sortCards(demands.filter((d) => (d.status ?? "aberto") === key));
  const activeColIndex = columns.findIndex((c) => c.key === activeCol);
  const canGoPrev = activeColIndex > 0;
  const canGoNext = activeColIndex < columns.length - 1;

  return (
    <>
      {/* Ordenação */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-white/35 text-xs font-semibold whitespace-nowrap">Ordenar:</span>
        <div className="flex gap-1 flex-wrap">
          {[
            { key: "recentes", label: "Recentes" },
            { key: "antigos", label: "Antigos" },
            { key: "urgente", label: "Prioridade" },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer whitespace-nowrap transition-all ${
                sortBy === opt.key ? "text-white" : "text-white/40"
              }`}
              style={sortBy === opt.key ? { background: "rgba(59,191,212,0.15)" } : { background: "rgba(255,255,255,0.06)" }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-white/20 text-xs hidden sm:flex items-center gap-1">
          <i className="ri-eye-line"></i> Modo supervisão
        </span>
      </div>

      {/* ── Mobile: Tab switcher + cards ── */}
      <div className="md:hidden">
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
          {columns.map((col) => {
            const count = getCards(col.key).length;
            const isActive = activeCol === col.key;
            return (
              <button
                key={col.key}
                onClick={() => setActiveCol(col.key)}
                className="flex items-center gap-2 py-2 px-3.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0"
                style={{
                  background: isActive ? col.color : "rgba(255,255,255,0.08)",
                  color: isActive ? "#fff" : "rgba(255,255,255,0.50)",
                  border: isActive ? `2px solid ${col.color}` : "1px solid rgba(255,255,255,0.10)",
                }}
              >
                <span className="w-4 h-4 flex items-center justify-center">
                  <i className={`${col.icon} text-xs`}></i>
                </span>
                <span className="hidden sm:inline">{col.label}</span>
                <span
                  className="min-w-[20px] h-[20px] flex items-center justify-center rounded-full text-[10px] font-black px-1"
                  style={{
                    background: isActive ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.10)",
                    color: isActive ? "#fff" : "rgba(255,255,255,0.50)",
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {columns.map((col) => {
          if (col.key !== activeCol) return null;
          const cards = getCards(col.key);
          return (
            <div key={col.key} className="space-y-2">
              <div className="flex items-center justify-between px-1 mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-5 rounded-full" style={{ background: col.color }}></div>
                  <span className="text-white font-bold text-sm">{col.label}</span>
                  <span className="text-xs font-bold text-white/30">{cards.length}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { if (canGoPrev) setActiveCol(columns[activeColIndex - 1].key); }}
                    disabled={!canGoPrev}
                    className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.70)" }}
                  >
                    <i className="ri-arrow-left-s-line text-sm"></i>
                  </button>
                  <div className="flex items-center gap-1 px-1">
                    {columns.map((c, i) => (
                      <button
                        key={c.key}
                        onClick={() => setActiveCol(c.key)}
                        className="w-1.5 h-1.5 rounded-full cursor-pointer transition-all"
                        style={{
                          background: i === activeColIndex ? col.color : "rgba(255,255,255,0.25)",
                          transform: i === activeColIndex ? "scale(1.4)" : "scale(1)",
                        }}
                      ></button>
                    ))}
                  </div>
                  <button
                    onClick={() => { if (canGoNext) setActiveCol(columns[activeColIndex + 1].key); }}
                    disabled={!canGoNext}
                    className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.70)" }}
                  >
                    <i className="ri-arrow-right-s-line text-sm"></i>
                  </button>
                </div>
              </div>

              {cards.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center py-16 rounded-2xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: `1px dashed rgba(255,255,255,0.08)` }}
                >
                  <span className="w-12 h-12 flex items-center justify-center mb-3 opacity-20">
                    <i className={`${col.icon} text-4xl`} style={{ color: col.color }}></i>
                  </span>
                  <p className="text-white/25 text-sm font-medium">Nenhuma demanda</p>
                </div>
              ) : (
                cards.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => onSelect(d)}
                    className="w-full text-left rounded-2xl p-3.5 transition-all cursor-pointer active:scale-[0.98] relative overflow-hidden"
                    style={{
                      background: selected?.id === d.id ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.05)",
                      border: selected?.id === d.id ? `1.5px solid ${col.color}60` : "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div className="absolute left-0 top-3 bottom-3 w-1 rounded-full" style={{ background: col.color }}></div>
                    <div className="pl-3">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md font-mono" style={{ background: col.bg, color: col.color }}>
                          #{d.id}
                        </span>
                        <span className="text-xs font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-md" style={{ background: "rgba(3,105,161,0.15)", color: "#38BDF8" }}>
                          {typeLabel[d.type] ?? d.type}
                        </span>
                        <span className="text-xs text-white/25 ml-auto">{formatDate(d.created_at)}</span>
                      </div>
                      <p className="text-white font-semibold text-sm leading-snug line-clamp-2 mb-2">{d.title}</p>
                      {getPriorityBadge(d.priority) && <div className="mb-2">{getPriorityBadge(d.priority)}</div>}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        {d.citizen_name && (
                          <span className="inline-flex items-center gap-1 text-xs text-white/45">
                            <i className="ri-user-line text-xs text-white/25"></i>
                            {d.citizen_name}
                            {d.citizen_neighborhood && <span className="text-white/25">· {d.citizen_neighborhood}</span>}
                          </span>
                        )}
                        {d.assessor_name && (
                          <span className="inline-flex items-center gap-1 text-xs" style={{ color: col.color }}>
                            <i className="ri-shield-user-line text-xs"></i>
                            {d.assessor_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          );
        })}
        <div className="h-24"></div>
      </div>

      {/* ── Desktop: Kanban 4 colunas ── */}
      <div className="hidden md:flex gap-4 overflow-x-auto pb-4" style={{ minHeight: "calc(100vh - 300px)" }}>
        {columns.map((col) => {
          const cards = getCards(col.key);
          return (
            <div
              key={col.key}
              className="flex-shrink-0 w-72 flex flex-col rounded-2xl overflow-hidden"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${col.border}` }}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: col.border }}>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 flex items-center justify-center">
                    <i className={`${col.icon} text-base`} style={{ color: col.color }}></i>
                  </span>
                  <span className="font-bold text-sm text-white">{col.label}</span>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: col.bg, color: col.color, border: `1px solid ${col.border}` }}>
                  {cards.length}
                </span>
              </div>
              <div className="flex-1 p-3 space-y-2.5 overflow-y-auto">
                {cards.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 opacity-40">
                    <span className="w-8 h-8 flex items-center justify-center mb-2">
                      <i className="ri-inbox-line text-2xl" style={{ color: col.color }}></i>
                    </span>
                    <p className="text-xs font-medium text-white/30">Nenhuma demanda</p>
                  </div>
                ) : (
                  cards.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => onSelect(d)}
                      className="w-full text-left rounded-xl p-3.5 transition-all cursor-pointer hover:bg-white/5"
                      style={{
                        background: selected?.id === d.id ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.05)",
                        border: selected?.id === d.id ? `1.5px solid ${col.color}60` : "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded-md font-mono" style={{ background: col.bg, color: col.color }}>#{d.id}</span>
                          <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "#38BDF8" }}>
                            {typeLabel[d.type] ?? d.type}
                          </span>
                        </div>
                        <span className="text-xs text-white/25">{formatDate(d.created_at)}</span>
                      </div>
                      <p className="text-white font-semibold text-sm leading-snug line-clamp-2 mb-2">{d.title}</p>
                      {getPriorityBadge(d.priority) && <div className="mb-2">{getPriorityBadge(d.priority)}</div>}
                      {d.citizen_name && (
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="w-4 h-4 flex items-center justify-center">
                            <i className="ri-user-line text-xs text-white/25"></i>
                          </span>
                          <span className="text-xs text-white/45 truncate">{d.citizen_name}</span>
                          {d.citizen_neighborhood && (
                            <span className="text-xs text-white/25">· {d.citizen_neighborhood}</span>
                          )}
                        </div>
                      )}
                      {d.assessor_name && (
                        <div className="flex items-center gap-1.5">
                          <span className="w-4 h-4 flex items-center justify-center">
                            <i className="ri-shield-user-line text-xs" style={{ color: col.color }}></i>
                          </span>
                          <span className="text-xs text-white/45 truncate">{d.assessor_name}</span>
                        </div>
                      )}
                      {d.status !== "aberto" && daysInColumn(d) > 0 && (
                        <div className={`flex items-center gap-1 mt-1 ${daysInColumn(d) > 5 ? "text-red-400" : "text-white/25"}`}>
                          <span className="w-4 h-4 flex items-center justify-center">
                            <i className={`${daysInColumn(d) > 5 ? "ri-timer-flash-line" : "ri-time-line"} text-xs`}></i>
                          </span>
                          <span className="text-xs font-semibold">{daysInColumn(d)}d nesta coluna</span>
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}