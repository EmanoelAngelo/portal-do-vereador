import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface Demand {
  id: number;
  citizen_name: string | null;
  citizen_phone: string | null;
  citizen_neighborhood: string | null;
  type: string;
  title: string;
  category: string;
  description: string;
  status: string;
  priority: string;
  admin_notes: string | null;
  created_at: string;
}

interface Message {
  id: number;
  sender_name: string;
  sender_role: string;
  message: string;
  created_at: string;
  expires_at: string;
}

const statusOptions = [
  { value: "aberto", label: "Em Aberto", color: "text-amber-600 bg-amber-50 border-amber-100" },
  { value: "em_andamento", label: "Em Andamento", color: "text-[#0369A1] bg-[#EFF6FF] border-[#DBEAFE]" },
  { value: "aguardando_externa", label: "Ag. Resp. Externa", color: "text-purple-600 bg-purple-50 border-purple-100" },
  { value: "finalizada", label: "Finalizada", color: "text-green-600 bg-green-50 border-green-100" },
];

const typeLabel: Record<string, string> = {
  requerimento: "Requerimento",
  sugestao: "Sugestão de Projeto",
  contato: "Contato",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" });
}

function isExpired(iso: string) {
  return new Date(iso) < new Date();
}

export default function DemandsPanel({ adminId, adminName }: { adminId: string; adminName: string }) {
  const [demands, setDemands] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Demand | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgText, setMsgText] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [saving, setSaving] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);

  const loadDemands = useCallback(async () => {
    let q = supabase.from("demands").select("*").order("created_at", { ascending: false });
    if (filterType !== "all") q = q.eq("type", filterType);
    if (filterStatus !== "all") q = q.eq("status", filterStatus);
    const { data } = await q;
    setDemands((data as Demand[]) ?? []);
    setLoading(false);
  }, [filterType, filterStatus]);

  useEffect(() => { loadDemands(); }, [loadDemands]);

  const loadMessages = useCallback(async (demandId: number) => {
    const { data } = await supabase
      .from("demand_messages")
      .select("*")
      .eq("demand_id", demandId)
      .order("created_at", { ascending: true });
    setMessages(((data as Message[]) ?? []).filter((m) => !isExpired(m.expires_at)));
  }, []);

  const openDemand = async (d: Demand) => {
    setSelected(d);
    setAdminNotes(d.admin_notes ?? "");
    await loadMessages(d.id);
  };

  const saveNotes = async () => {
    if (!selected) return;
    setSaving(true);
    const { error } = await supabase.functions.invoke("update-demand", {
      body: { id: selected.id, fields: { admin_notes: adminNotes, updated_at: new Date().toISOString() } },
    });
    if (error) {
      console.error("[admin saveNotes] Falhou:", error);
      setSaving(false);
      return;
    }
    setSelected({ ...selected, admin_notes: adminNotes });
    setDemands((prev) => prev.map((d) => d.id === selected.id ? { ...d, admin_notes: adminNotes } : d));
    setSaving(false);
  };

  const updateStatus = async (status: string) => {
    if (!selected) return;
    const { error } = await supabase.functions.invoke("update-demand", {
      body: { id: selected.id, fields: { status, updated_at: new Date().toISOString() } },
    });
    if (error) {
      console.error("[admin updateStatus] Falhou:", error);
      return;
    }
    setSelected({ ...selected, status });
    setDemands((prev) => prev.map((d) => d.id === selected.id ? { ...d, status } : d));
  };

  const sendMessage = async () => {
    if (!msgText.trim() || !selected) return;
    setSendingMsg(true);
    await supabase.from("demand_messages").insert({
      demand_id: selected.id,
      sender_id: adminId,
      sender_name: adminName,
      sender_role: "admin",
      message: msgText.trim(),
    });
    setMsgText("");
    await loadMessages(selected.id);
    setSendingMsg(false);
  };

  const statusInfo = (s: string) => statusOptions.find((o) => o.value === s) ?? statusOptions[0];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[#0369A1] border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-700 text-sm focus:outline-none focus:border-[#0369A1] cursor-pointer"
        >
          <option value="all">Todos os tipos</option>
          <option value="requerimento">Requerimentos</option>
          <option value="sugestao">Sugestões</option>
          <option value="contato">Contatos</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-700 text-sm focus:outline-none focus:border-[#0369A1] cursor-pointer"
        >
          <option value="all">Todos os status</option>
          <option value="aberto">Em Aberto</option>
          <option value="em_andamento">Em Andamento</option>
          <option value="aguardando_externa">Ag. Resp. Externa</option>
          <option value="finalizada">Finalizada</option>
        </select>
        <span className="ml-auto text-gray-500 text-sm self-center">{demands.length} demanda(s)</span>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
            {demands.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-400 text-sm">Nenhuma demanda</p>
              </div>
            ) : (
              demands.map((d) => {
                const si = statusInfo(d.status);
                return (
                  <button
                    key={d.id}
                    onClick={() => openDemand(d)}
                    className={`w-full text-left p-4 hover:bg-[#F8FBFF] transition-colors cursor-pointer ${selected?.id === d.id ? "bg-[#EFF6FF] border-l-2 border-[#0369A1]" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold text-[#0369A1] uppercase tracking-wide">{typeLabel[d.type] ?? d.type}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${si.color}`}>{si.label}</span>
                    </div>
                    <p className="text-gray-800 font-semibold text-sm line-clamp-1">{d.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-gray-400 text-xs">{d.citizen_name ?? "Anônimo"}</span>
                      <span className="text-gray-300 text-xs">·</span>
                      <span className="text-gray-400 text-xs">{formatDate(d.created_at)}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Detail */}
        <div className="lg:col-span-3">
          {selected ? (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col" style={{ minHeight: "600px" }}>
              <div className="p-5 border-b border-gray-100">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-[#0369A1] uppercase tracking-wide">{typeLabel[selected.type]}</span>
                      <span className="text-gray-300">·</span>
                      <span className="text-xs text-gray-400">{selected.category}</span>
                    </div>
                    <h2 className="text-gray-900 font-extrabold text-lg">{selected.title}</h2>
                  </div>
                </div>
                {/* Citizen info */}
                <div className="flex flex-wrap gap-3 mb-3 text-xs text-gray-500">
                  {selected.citizen_name && <span className="flex items-center gap-1"><i className="ri-user-line text-[#0369A1]"></i>{selected.citizen_name}</span>}
                  {selected.citizen_phone && <span className="flex items-center gap-1"><i className="ri-phone-line text-[#0369A1]"></i>{selected.citizen_phone}</span>}
                  {selected.citizen_neighborhood && <span className="flex items-center gap-1"><i className="ri-map-pin-line text-[#0369A1]"></i>{selected.citizen_neighborhood}</span>}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">{selected.description}</p>

                {/* Status selector */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {statusOptions.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => updateStatus(o.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap ${selected.status === o.value ? o.color + " scale-105" : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"}`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>

                {/* Priority selector */}
                <div className="mt-4">
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Prioridade</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: "normal", label: "Normal", color: "#6B7280", bg: "#F9FAFB", border: "#D1D5DB" },
                      { value: "importante", label: "Importante", color: "#E8A020", bg: "#FFFBF0", border: "#FDE68A" },
                      { value: "urgente", label: "Urgente", color: "#EF4444", bg: "#FEF2F2", border: "#FECACA" },
                    ].map((p) => {
                      const isActive = (selected.priority || "normal") === p.value;
                      return (
                        <button
                          key={p.value}
                          onClick={async () => {
                            const { error } = await supabase.functions.invoke("update-demand", {
                              body: { id: selected.id, fields: { priority: p.value, updated_at: new Date().toISOString() } },
                            });
                            if (!error) {
                              setSelected({ ...selected, priority: p.value });
                              setDemands((prev) => prev.map((d) => d.id === selected.id ? { ...d, priority: p.value } : d));
                            }
                          }}
                          className="px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer whitespace-nowrap"
                          style={{
                            color: isActive ? p.color : "#9CA3AF",
                            background: isActive ? p.bg : "#F9FAFB",
                            borderColor: isActive ? p.color : "#E5E7EB",
                          }}
                        >
                          {isActive && <i className="ri-checkbox-circle-fill text-xs mr-1"></i>}
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Admin notes */}
              <div className="p-4 border-b border-gray-100">
                <label className="block text-gray-600 text-xs font-semibold mb-1.5">Notas internas / Resposta ao cidadão</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Adicione uma resposta ou nota para o cidadão..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 text-sm placeholder:text-gray-400 focus:outline-none focus:border-[#0369A1] resize-none transition-all"
                />
                <button
                  onClick={saveNotes}
                  disabled={saving}
                  className="mt-2 px-4 py-2 bg-gradient-to-r from-[#0369A1] to-[#0EA5E9] text-white text-xs font-semibold rounded-lg hover:shadow-md transition-all cursor-pointer whitespace-nowrap"
                >
                  {saving ? "Salvando..." : "Salvar nota"}
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 p-4 overflow-y-auto space-y-2 max-h-48">
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Chat (24h)</p>
                {messages.length === 0 ? (
                  <p className="text-gray-300 text-sm text-center py-2">Sem mensagens</p>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender_role === "admin" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-xs rounded-2xl px-3 py-2 ${msg.sender_role === "admin" ? "bg-[#0369A1] text-white rounded-br-sm" : "bg-gray-100 text-gray-800 rounded-bl-sm"}`}>
                        <p className="text-xs opacity-70 mb-0.5">{msg.sender_name}</p>
                        <p className="text-sm">{msg.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Message input */}
              <div className="p-4 border-t border-gray-100">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={msgText}
                    onChange={(e) => setMsgText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
                    placeholder="Responder ao cidadão..."
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 text-sm placeholder:text-gray-400 focus:outline-none focus:border-[#0369A1] transition-all"
                    maxLength={500}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!msgText.trim() || sendingMsg}
                    className="w-10 h-10 flex items-center justify-center bg-gradient-to-r from-[#0369A1] to-[#0EA5E9] text-white rounded-xl transition-all disabled:opacity-40 cursor-pointer"
                  >
                    <i className="ri-send-plane-fill text-sm"></i>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 flex items-center justify-center" style={{ minHeight: "600px" }}>
              <div className="text-center p-8">
                <span className="w-12 h-12 flex items-center justify-center mx-auto mb-3">
                  <i className="ri-cursor-line text-gray-200 text-3xl"></i>
                </span>
                <p className="text-gray-400 font-semibold">Selecione uma demanda</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}