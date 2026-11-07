import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAgendaReminders } from "@/hooks/useAgendaReminders";

interface Compromisso {
  id: number;
  title: string;
  description: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  created_by: string;
  created_by_name: string;
  created_by_role: string;
  created_at: string;
  updated_at: string | null;
}

interface AgendaPageProps {
  userId: string;
  userName: string;
  userRole: "assessor" | "vereador";
}

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function formatarData(dataISO: string): string {
  return new Date(dataISO + "T00:00:00-03:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" });
}

export default function AgendaPage({ userId, userName, userRole }: AgendaPageProps) {
  const hoje = new Date();
  const [viewMode, setViewMode] = useState<"calendario" | "lista">("calendario");
  const [currentMonth, setCurrentMonth] = useState(hoje.getMonth());
  const [currentYear, setCurrentYear] = useState(hoje.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [compromissos, setCompromissos] = useState<Compromisso[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingCompromisso, setEditingCompromisso] = useState<Compromisso | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<Compromisso | null>(null);

  // Polling de lembretes da agenda (12h/1h)
  useAgendaReminders(true);

  const loadCompromissos = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke("get-agenda", {
        body: { month: currentMonth + 1, year: currentYear },
      });
      if (data?.success && Array.isArray(data.data)) {
        setCompromissos(data.data as Compromisso[]);
      } else {
        // Fallback: carregar direto
        const start = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01`;
        const endMonth = currentMonth === 11 ? 0 : currentMonth + 1;
        const endYear = currentMonth === 11 ? currentYear + 1 : currentYear;
        const end = `${endYear}-${String(endMonth + 1).padStart(2, "0")}-01`;
        const { data: fallback } = await supabase
          .from("agenda")
          .select("*")
          .gte("event_date", start)
          .lt("event_date", end)
          .order("event_date", { ascending: true })
          .order("start_time", { ascending: true });
        setCompromissos((fallback as Compromisso[]) ?? []);
      }
    } catch (e) {
      console.error("[Agenda] load error:", e);
    }
    setLoading(false);
  }, [currentMonth, currentYear]);

  useEffect(() => {
    loadCompromissos();
  }, [loadCompromissos]);

  // Realtime - agenda changes
  useEffect(() => {
    const channel = supabase
      .channel("agenda-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "agenda" }, () => {
        loadCompromissos();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadCompromissos]);

  // Calendário: primeiro dia do mês + quantos dias
  const primeiroDia = new Date(currentYear, currentMonth, 1).getDay(); // 0=Dom
  const ultimoDia = new Date(currentYear, currentMonth + 1, 0).getDate();
  const ultimoDiaMesAnterior = new Date(currentYear, currentMonth, 0).getDate();

  const diasNoMes: (number | null)[] = [];
  // Dias do mês anterior
  for (let i = primeiroDia - 1; i >= 0; i--) {
    diasNoMes.push(ultimoDiaMesAnterior - i);
  }
  // Dias do mês atual
  for (let d = 1; d <= ultimoDia; d++) {
    diasNoMes.push(d);
  }
  // Completar grid (6 linhas x 7 colunas = 42)
  const remaining = 42 - diasNoMes.length;
  for (let d = 1; d <= remaining; d++) {
    diasNoMes.push(null);
  }

  const getCompromissosDoDia = (dia: number): Compromisso[] => {
    const dataStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    return compromissos.filter((c) => c.event_date === dataStr);
  };

  // Calcula a data correta de cada célula do grid (prev-month / current / next-month)
  const getCellDateStr = (cellIndex: number, dia: number): string => {
    if (cellIndex < primeiroDia) {
      // Mês anterior
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      return `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    }
    if (cellIndex >= primeiroDia + ultimoDia) {
      // Próximo mês
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      return `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    }
    // Mês atual
    return `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  };

  const compromissosPorDia: Record<string, Compromisso[]> = {};
  compromissos.forEach((c) => {
    if (!compromissosPorDia[c.event_date]) compromissosPorDia[c.event_date] = [];
    compromissosPorDia[c.event_date].push(c);
  });

  const isHoje = (dia: number, cellIdx: number): boolean => {
    // Células de outros meses nunca são "hoje"
    if (cellIdx < primeiroDia || cellIdx >= primeiroDia + ultimoDia) return false;
    return dia === hoje.getDate() && currentMonth === hoje.getMonth() && currentYear === hoje.getFullYear();
  };

  const isPassado = (dia: number, cellIdx: number): boolean => {
    let year = currentYear;
    let month = currentMonth;
    if (cellIdx >= 0 && cellIdx < primeiroDia) {
      month = currentMonth === 0 ? 11 : currentMonth - 1;
      year = currentMonth === 0 ? currentYear - 1 : currentYear;
    } else if (cellIdx >= primeiroDia + ultimoDia) {
      month = currentMonth === 11 ? 0 : currentMonth + 1;
      year = currentMonth === 11 ? currentYear + 1 : currentYear;
    }
    const data = new Date(year, month, dia);
    const hojeZero = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    return data < hojeZero;
  };

  const handleDiaClick = (dia: number, cellIdx: number) => {
    // Se clicou em dia do mês anterior, navega pra aquele mês
    if (cellIdx < primeiroDia) {
      mudarMes(-1);
      setSelectedDay(dia);
      return;
    }
    // Se clicou em dia do próximo mês, navega pra aquele mês
    if (cellIdx >= primeiroDia + ultimoDia) {
      mudarMes(1);
      setSelectedDay(dia);
      return;
    }
    setSelectedDay(dia);
    const compsDoDia = getCompromissosDoDia(dia);
    if (compsDoDia.length > 0) {
      // Se tem compromisso, mostra (não abre modal)
    } else if (!isPassado(dia, cellIdx)) {
      const dataStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
      abrirModalCriar(dataStr);
    }
  };

  const abrirModalCriar = (data?: string) => {
    setEditingCompromisso(null);
    setFormTitle("");
    setFormDesc("");
    setFormDate(data || "");
    setFormStart("");
    setFormEnd("");
    setFormLocation("");
    setFormError("");
    setShowModal(true);
  };

  const abrirModalEditar = (comp: Compromisso) => {
    setEditingCompromisso(comp);
    setFormTitle(comp.title);
    setFormDesc(comp.description || "");
    setFormDate(comp.event_date);
    setFormStart(comp.start_time || "");
    setFormEnd(comp.end_time || "");
    setFormLocation(comp.location || "");
    setFormError("");
    setShowModal(true);
  };

  const handleSalvar = async () => {
    if (!formTitle.trim()) { setFormError("Título é obrigatório."); return; }
    if (!formDate) { setFormError("Data é obrigatória."); return; }

    // Validação de data passada
    const hojeZero = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const dataEscolhida = new Date(formDate + "T00:00:00");
    if (dataEscolhida < hojeZero) {
      setFormError("Não é possível agendar compromissos em datas passadas.");
      return;
    }

    // Validação: horário fim após início
    if (formStart && formEnd && formEnd <= formStart) {
      setFormError("Horário de término deve ser após o horário de início.");
      return;
    }

    setFormSaving(true);
    setFormError("");

    try {
      if (editingCompromisso) {
        const { data } = await supabase.functions.invoke("update-agenda", {
          body: {
            id: editingCompromisso.id,
            title: formTitle.trim(),
            description: formDesc.trim() || null,
            event_date: formDate,
            start_time: formStart || null,
            end_time: formEnd || null,
            location: formLocation.trim() || null,
            editor_id: userId,
            editor_name: userName,
          },
        });
        if (!data?.success) throw new Error(data?.error || "Erro ao atualizar");
      } else {
        const { data } = await supabase.functions.invoke("create-agenda", {
          body: {
            title: formTitle.trim(),
            description: formDesc.trim() || null,
            event_date: formDate,
            start_time: formStart || null,
            end_time: formEnd || null,
            location: formLocation.trim() || null,
            created_by: userId,
            created_by_name: userName,
            created_by_role: userRole,
          },
        });
        if (!data?.success) throw new Error(data?.error || "Erro ao criar");
      }
      setShowModal(false);
      loadCompromissos();
      
      // BUGFIX B6: Disparar verificacao imediata de lembretes apos criar/editar evento
      supabase.functions.invoke("check-agenda-reminders", {}).catch((e) => {
        console.warn("[Agenda] check-agenda-reminders falhou:", e?.message || e);
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setFormSaving(false);
    }
  };

  const handleExcluir = async (comp: Compromisso) => {
    try {
      const { data } = await supabase.functions.invoke("delete-agenda", {
        body: { id: comp.id, deleted_by: userId, deleted_by_name: userName },
      });
      if (!data?.success) throw new Error(data?.error || "Erro ao excluir");
      setDeleteConfirm(null);
      loadCompromissos();
      
      // BUGFIX B6: Disparar verificacao imediata de lembretes apos excluir evento
      supabase.functions.invoke("check-agenda-reminders", {}).catch((e) => {
        console.warn("[Agenda] check-agenda-reminders falhou:", e?.message || e);
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao excluir");
    }
  };

  // Lista ordenada
  const listaCompromissos = [...compromissos].sort((a, b) => {
    if (a.event_date !== b.event_date) return a.event_date.localeCompare(b.event_date);
    return (a.start_time || "").localeCompare(b.start_time || "");
  });

  // Agrupamento por data
  const agruparPorData = () => {
    const grupos: { label: string; comps: Compromisso[] }[] = [];
    const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);
    const amanhaStr = `${amanha.getFullYear()}-${String(amanha.getMonth() + 1).padStart(2, "0")}-${String(amanha.getDate()).padStart(2, "0")}`;

    const hojeComps = listaCompromissos.filter((c) => c.event_date === hojeStr);
    const amanhaComps = listaCompromissos.filter((c) => c.event_date === amanhaStr);
    const outros = listaCompromissos.filter((c) => c.event_date !== hojeStr && c.event_date !== amanhaStr);

    if (hojeComps.length > 0) grupos.push({ label: "Hoje", comps: hojeComps });
    if (amanhaComps.length > 0) grupos.push({ label: "Amanhã", comps: amanhaComps });

    // Agrupar por data
    const gruposPorData: Record<string, Compromisso[]> = {};
    outros.forEach((c) => {
      if (!gruposPorData[c.event_date]) gruposPorData[c.event_date] = [];
      gruposPorData[c.event_date].push(c);
    });
    Object.entries(gruposPorData).forEach(([data, comps]) => {
      grupos.push({ label: formatarData(data), comps });
    });

    return grupos;
  };

  const mudarMes = (delta: number) => {
    let novoMes = currentMonth + delta;
    let novoAno = currentYear;
    if (novoMes > 11) { novoMes = 0; novoAno++; }
    if (novoMes < 0) { novoMes = 11; novoAno--; }
    setCurrentMonth(novoMes);
    setCurrentYear(novoAno);
    setSelectedDay(null);
  };

  const irParaHoje = () => {
    setCurrentMonth(hoje.getMonth());
    setCurrentYear(hoje.getFullYear());
    setSelectedDay(hoje.getDate());
  };

  const compsDiaSelecionado = selectedDay ? getCompromissosDoDia(selectedDay) : [];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-white">Agenda de Compromissos</h1>
          <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.40)" }}>
            Compromissos do gabinete — {compromissos.length} neste mês
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle Calendário / Lista */}
          <div className="flex rounded-full p-1" style={{ background: "rgba(255,255,255,0.08)" }}>
            <button
              onClick={() => setViewMode("calendario")}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${viewMode === "calendario" ? "text-white" : ""}`}
              style={viewMode === "calendario" ? { background: "rgba(249,115,22,0.25)", color: "#F97316" } : { color: "rgba(255,255,255,0.45)" }}
            >
              <i className="ri-calendar-line mr-1.5"></i>Calendário
            </button>
            <button
              onClick={() => setViewMode("lista")}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${viewMode === "lista" ? "text-white" : ""}`}
              style={viewMode === "lista" ? { background: "rgba(249,115,22,0.25)", color: "#F97316" } : { color: "rgba(255,255,255,0.45)" }}
            >
              <i className="ri-list-check mr-1.5"></i>Lista
            </button>
          </div>
          <button
            onClick={() => abrirModalCriar()}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-white font-bold cursor-pointer transition-all whitespace-nowrap shrink-0"
            style={{ background: "#F97316" }}
            title="Novo Compromisso"
          >
            <i className="ri-add-line text-lg"></i>
          </button>
        </div>
      </div>

      {/* Vista Calendário */}
      {viewMode === "calendario" && (
        <div className="grid lg:grid-cols-3 gap-5">
          {/* Grid do calendário */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {/* Navegação */}
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                <button onClick={() => mudarMes(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 cursor-pointer transition-colors" style={{ color: "rgba(255,255,255,0.5)" }}>
                  <i className="ri-arrow-left-s-line"></i>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setShowMonthPicker(!showMonthPicker); setShowYearPicker(false); }}
                    className="text-white font-bold text-sm cursor-pointer hover:text-[#F97316] transition-colors whitespace-nowrap"
                  >
                    {MESES[currentMonth]}
                  </button>
                  <button
                    onClick={() => { setShowYearPicker(!showYearPicker); setShowMonthPicker(false); }}
                    className="text-white font-bold text-sm cursor-pointer hover:text-[#F97316] transition-colors whitespace-nowrap"
                  >
                    {currentYear}
                  </button>
                </div>
                <button onClick={() => mudarMes(1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 cursor-pointer transition-colors" style={{ color: "rgba(255,255,255,0.5)" }}>
                  <i className="ri-arrow-right-s-line"></i>
                </button>
              </div>

              {/* Month picker dropdown */}
              {showMonthPicker && (
                <div className="grid grid-cols-4 gap-1 p-3 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                  {MESES_ABREV.map((m, i) => (
                    <button
                      key={m}
                      onClick={() => { setCurrentMonth(i); setShowMonthPicker(false); }}
                      className={`py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all whitespace-nowrap ${i === currentMonth ? "text-white" : ""}`}
                      style={i === currentMonth ? { background: "rgba(249,115,22,0.25)", color: "#F97316" } : { color: "rgba(255,255,255,0.5)" }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}

              {/* Year picker */}
              {showYearPicker && (
                <div className="grid grid-cols-5 gap-1 p-3 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                  {Array.from({ length: 10 }, (_, i) => currentYear - 5 + i).map((y) => (
                    <button
                      key={y}
                      onClick={() => { setCurrentYear(y); setShowYearPicker(false); }}
                      className={`py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all whitespace-nowrap ${y === currentYear ? "text-white" : ""}`}
                      style={y === currentYear ? { background: "rgba(249,115,22,0.25)", color: "#F97316" } : { color: "rgba(255,255,255,0.5)" }}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              )}

              {/* Dias da semana */}
              <div className="grid grid-cols-7 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                {DIAS_SEMANA.map((d) => (
                  <div key={d} className="py-2 text-center text-xs font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.30)" }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Grid de dias */}
              <div className="grid grid-cols-7">
                {diasNoMes.map((dia, idx) => {
                  if (dia === null) {
                    return <div key={`empty-${idx}`} className="aspect-square"></div>;
                  }
                  const cellDateStr = getCellDateStr(idx, dia);
                  const compsDoDia = compromissosPorDia[cellDateStr] || [];
                  const isToday = isHoje(dia, idx);
                  const isPast = isPassado(dia, idx);
                  const isSelected = selectedDay === dia;

                  return (
                    <button
                      key={`dia-${dia}-${idx}`}
                      onClick={() => handleDiaClick(dia, idx)}
                      className={`aspect-square flex flex-col items-center p-1.5 transition-all cursor-pointer relative ${isToday ? "font-extrabold" : ""}`}
                      style={{
                        background: isSelected ? "rgba(249,115,22,0.15)" : "transparent",
                        color: isPast ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.7)",
                        border: isToday ? "1px solid rgba(249,115,22,0.4)" : isSelected ? "1px solid rgba(249,115,22,0.3)" : "1px solid transparent",
                        borderRadius: "8px",
                      }}
                    >
                      <span className={`text-sm ${isToday ? "text-[#F97316]" : ""}`}>{dia}</span>
                      {compsDoDia.length > 0 && (
                        <div className="flex gap-0.5 mt-0.5">
                          {compsDoDia.slice(0, 3).map((_, i) => (
                            <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: "#F97316" }}></span>
                          ))}
                          {compsDoDia.length > 3 && (
                            <span className="text-[10px] font-bold" style={{ color: "#F97316" }}>+{compsDoDia.length - 3}</span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Botão Hoje */}
              <div className="p-3 border-t flex justify-center" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                <button
                  onClick={irParaHoje}
                  className="px-4 py-1.5 rounded-full text-xs font-bold cursor-pointer whitespace-nowrap transition-all hover:bg-white/10"
                  style={{ color: "#F97316", border: "1px solid rgba(249,115,22,0.3)" }}
                >
                  Hoje
                </button>
              </div>
            </div>
          </div>

          {/* Painel lateral: compromissos do dia selecionado */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="p-4 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                <h2 className="font-bold text-sm text-white">
                  {selectedDay
                    ? `${selectedDay} de ${MESES[currentMonth]}`
                    : "Selecione um dia"}
                </h2>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {!selectedDay ? (
                  <div className="py-12 text-center">
                    <i className="ri-calendar-line text-3xl mb-2 block" style={{ color: "rgba(255,255,255,0.12)" }}></i>
                    <p className="text-sm" style={{ color: "rgba(255,255,255,0.25)" }}>
                      Clique em um dia do calendário para ver os compromissos
                    </p>
                  </div>
                ) : compsDiaSelecionado.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-sm" style={{ color: "rgba(255,255,255,0.25)" }}>
                      Nenhum compromisso neste dia
                    </p>
                    {!isPassado(selectedDay, -1) && (
                      <button
                        onClick={() => {
                          const dataStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
                          abrirModalCriar(dataStr);
                        }}
                        className="mt-3 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap transition-all"
                        style={{ background: "rgba(249,115,22,0.15)", color: "#F97316", border: "1px solid rgba(249,115,22,0.3)" }}
                      >
                        <i className="ri-add-line mr-1"></i> Novo Compromisso
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="p-2 space-y-1.5">
                    {compsDiaSelecionado.map((comp) => (
                      <div
                        key={comp.id}
                        className="p-3 rounded-xl cursor-pointer hover:bg-white/5 transition-colors"
                        style={{ background: "rgba(255,255,255,0.03)" }}
                        onClick={() => abrirModalEditar(comp)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-white font-semibold text-sm truncate">{comp.title}</p>
                            {(comp.start_time || comp.location) && (
                              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                                {comp.start_time && <><i className="ri-time-line mr-1"></i>{comp.start_time}{comp.end_time ? ` - ${comp.end_time}` : ""}</>}
                                {comp.start_time && comp.location && " · "}
                                {comp.location && <><i className="ri-map-pin-line mr-1"></i>{comp.location}</>}
                              </p>
                            )}
                            <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>
                              {comp.created_by_name}
                            </p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirm(comp); }}
                            className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-500/10 cursor-pointer shrink-0"
                            style={{ color: "rgba(255,255,255,0.25)" }}
                            title="Excluir"
                          >
                            <i className="ri-delete-bin-line text-sm"></i>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vista Lista */}
      {viewMode === "lista" && (
        <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {loading ? (
            <div className="py-12 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "rgba(249,115,22,0.3)", borderTopColor: "#F97316" }}></div>
            </div>
          ) : listaCompromissos.length === 0 ? (
            <div className="py-16 text-center">
              <i className="ri-calendar-line text-4xl mb-3 block" style={{ color: "rgba(255,255,255,0.12)" }}></i>
              <p className="font-semibold" style={{ color: "rgba(255,255,255,0.35)" }}>Nenhum compromisso neste mês</p>
              <button
                onClick={() => abrirModalCriar()}
                className="mt-4 px-5 py-2.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap"
                style={{ background: "rgba(249,115,22,0.15)", color: "#F97316", border: "1px solid rgba(249,115,22,0.3)" }}
              >
                <i className="ri-add-line mr-1.5"></i> Novo Compromisso
              </button>
            </div>
          ) : (
            <div>
              {agruparPorData().map((grupo, gi) => (
                <div key={gi}>
                  <div className="px-4 py-2.5" style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#F97316" }}>{grupo.label}</p>
                  </div>
                  {grupo.comps.map((comp) => (
                    <div
                      key={comp.id}
                      className="flex items-center gap-4 px-4 py-3 border-b hover:bg-white/5 transition-colors cursor-pointer"
                      style={{ borderColor: "rgba(255,255,255,0.03)" }}
                      onClick={() => abrirModalEditar(comp)}
                    >
                      <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0" style={{ background: "rgba(249,115,22,0.15)" }}>
                        <span className="text-xs font-black" style={{ color: "#F97316" }}>
                          {new Date(comp.event_date + "T00:00:00-03:00").getDate()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm truncate">{comp.title}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          {comp.start_time && (
                            <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                              <i className="ri-time-line mr-1"></i>{comp.start_time}{comp.end_time ? ` - ${comp.end_time}` : ""}
                            </span>
                          )}
                          {comp.location && (
                            <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                              <i className="ri-map-pin-line mr-1"></i>{comp.location}
                            </span>
                          )}
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>
                          {comp.created_by_name} · {comp.created_by_role === "vereador" ? "Vereador" : "Assessor"}
                        </p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm(comp); }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/10 cursor-pointer shrink-0"
                        style={{ color: "rgba(255,255,255,0.25)" }}
                      >
                        <i className="ri-delete-bin-line"></i>
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal Criar/Editar */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.70)", backdropFilter: "blur(6px)" }}>
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-6" style={{ background: "linear-gradient(135deg, #F97316, #EA580C)" }}>
              <h2 className="text-white font-extrabold text-xl">
                {editingCompromisso ? "Editar Compromisso" : "Novo Compromisso"}
              </h2>
              <p className="text-white/60 text-sm mt-1">
                {editingCompromisso ? "Altere os dados do compromisso" : "Preencha os dados do compromisso do gabinete"}
              </p>
            </div>

            <div className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-2">
                  <i className="ri-error-warning-line"></i>
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Título *</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  maxLength={200}
                  placeholder="Ex: Reunião com Secretaria de Obras"
                  className="w-full px-4 py-2.5 rounded-xl text-sm border border-gray-200 focus:outline-none focus:border-[#F97316]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Descrição</label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Detalhes do compromisso..."
                  className="w-full px-4 py-2.5 rounded-xl text-sm border border-gray-200 focus:outline-none focus:border-[#F97316] resize-none"
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Data *</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full px-4 py-2.5 rounded-xl text-sm border border-gray-200 focus:outline-none focus:border-[#F97316]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Horário início</label>
                  <input
                    type="time"
                    value={formStart}
                    onChange={(e) => setFormStart(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl text-sm border border-gray-200 focus:outline-none focus:border-[#F97316]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Horário fim</label>
                  <input
                    type="time"
                    value={formEnd}
                    onChange={(e) => setFormEnd(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl text-sm border border-gray-200 focus:outline-none focus:border-[#F97316]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Local</label>
                <input
                  type="text"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  maxLength={200}
                  placeholder="Ex: Câmara Municipal, Sala 302"
                  className="w-full px-4 py-2.5 rounded-xl text-sm border border-gray-200 focus:outline-none focus:border-[#F97316]"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl text-gray-600 font-semibold text-sm cursor-pointer whitespace-nowrap border border-gray-200 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSalvar}
                  disabled={formSaving}
                  className="flex-1 py-3 rounded-xl text-white font-bold text-sm cursor-pointer whitespace-nowrap disabled:opacity-50 transition-all"
                  style={{ background: "linear-gradient(135deg, #F97316, #EA580C)" }}
                >
                  {formSaving ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Salvando...
                    </span>
                  ) : (
                    editingCompromisso ? "Salvar alterações" : "Criar Compromisso"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.70)", backdropFilter: "blur(6px)" }}>
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
                <i className="ri-delete-bin-line text-2xl text-red-500"></i>
              </div>
              <h3 className="text-lg font-extrabold text-gray-900">Excluir compromisso?</h3>
              <p className="text-gray-500 text-sm mt-2">
                Tem certeza que deseja excluir <strong className="text-gray-700">"{deleteConfirm.title}"</strong>? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-3 rounded-xl text-gray-600 font-semibold text-sm cursor-pointer whitespace-nowrap border border-gray-200 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleExcluir(deleteConfirm)}
                  className="flex-1 py-3 rounded-xl text-white font-bold text-sm cursor-pointer whitespace-nowrap bg-red-500 hover:bg-red-600"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}