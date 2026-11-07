import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Assessor {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  status: string;
  created_at: string;
  email?: string;
}

export default function AssessorsPanel() {
  const [assessors, setAssessors] = useState<Assessor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", role: "assessor" });
  const [approving, setApproving] = useState<string | null>(null);
  const [approveFeedback, setApproveFeedback] = useState<{ id: string; name: string; type: "success" | "error"; msg: string } | null>(null);

  const loadAssessors = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, phone, role, status, created_at")
      .in("role", ["assessor", "admin"])
      .order("created_at", { ascending: false });
    setAssessors((data as Assessor[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { loadAssessors(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || form.password.length < 6) {
      setError("Preencha todos os campos obrigatórios. A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(
        `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/create-assessor`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            email: form.email.trim(),
            password: form.password,
            full_name: form.name.trim(),
            phone: form.phone.trim(),
            role: form.role,
          }),
        }
      );

      const result = await res.json();

      if (!result.success) {
        setError(result.error || "Erro ao criar usuário.");
        setSaving(false);
        return;
      }

      setSuccess(result.message || "Usuário criado com sucesso!");
      setForm({ name: "", email: "", phone: "", password: "", role: "assessor" });
      setSaving(false);
      await loadAssessors();
    } catch (err) {
      setError("Erro de conexão ao criar assessor. Tente novamente.");
      setSaving(false);
    }
  };

  const handleApprove = async (id: string, name: string) => {
    setApproving(id);
    setApproveFeedback(null);
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const res = await fetch(
        `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/approve-assessor`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ user_id: id }),
        }
      );

      const result = await res.json();

      if (!result.success) {
        setApproveFeedback({ id, name, type: "error", msg: result.error || "Erro ao aprovar. Tente novamente." });
        setApproving(null);
        return;
      }

      setApproveFeedback({ id, name, type: "success", msg: `"${name}" foi aprovado(a) e já pode fazer login!` });
    } catch (err) {
      setApproveFeedback({ id, name, type: "error", msg: "Erro de conexão. Tente novamente." });
    }
    
    setApproving(null);
    loadAssessors();
  };

  const roleLabel: Record<string, { label: string; color: string; bg: string }> = {
    assessor: { label: "Assessor", color: "#0369A1", bg: "#EFF6FF" },
    admin: { label: "Admin", color: "#7C3AED", bg: "#F5F3FF" },
  };

  const pendingAssessors = assessors.filter((a) => a.role === "assessor" && a.status === "pending");
  const activeAssessors = assessors.filter((a) => a.role === "assessor" && a.status !== "pending");
  const admins = assessors.filter((a) => a.role === "admin");

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" });

  return (
    <div>
      {/* Global feedback banner */}
      {approveFeedback && (
        <div className={`mb-4 p-4 rounded-2xl flex items-center justify-between gap-3 ${approveFeedback.type === "success" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
          <div className="flex items-center gap-2">
            <i className={`${approveFeedback.type === "success" ? "ri-checkbox-circle-fill text-green-600" : "ri-error-warning-fill text-red-600"} text-lg`}></i>
            <span className={`text-sm font-semibold ${approveFeedback.type === "success" ? "text-green-700" : "text-red-700"}`}>
              {approveFeedback.msg}
            </span>
          </div>
          <button
            onClick={() => setApproveFeedback(null)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-black/5 text-gray-400 cursor-pointer shrink-0"
          >
            <i className="ri-close-line"></i>
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <p className="text-gray-500 text-sm">
            {assessors.length} membro(s) da equipe cadastrado(s)
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setError(""); setSuccess(""); }}
          className="flex items-center justify-center gap-2 px-5 py-2.5 text-white text-sm font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap"
          style={{ background: "linear-gradient(135deg, #0369A1, #0EA5E9)" }}
        >
          <i className="ri-user-add-line"></i>
          Cadastrar Assessor
        </button>
      </div>

      {/* Create form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
          <div
            className="absolute inset-0 cursor-pointer"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
            onClick={() => setShowForm(false)}
          />
          <div className="relative z-10 bg-white rounded-2xl border border-gray-100 p-8 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-gray-900 font-extrabold text-xl">Novo Assessor</h3>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer rounded-lg hover:bg-gray-100 transition-all"
              >
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-start gap-2">
                <i className="ri-error-warning-line shrink-0 mt-0.5"></i>
                <div className="flex-1">
                  <span>{error}</span>
                  <button
                    onClick={() => setError("")}
                    className="block mt-1 text-red-400 text-xs underline cursor-pointer"
                  >
                    Dispensar
                  </button>
                </div>
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 rounded-xl bg-green-50 border border-green-100 text-green-600 text-sm flex items-start gap-2">
                <i className="ri-checkbox-circle-line shrink-0 mt-0.5"></i>
                <div className="flex-1">
                  <span>{success}</span>
                  <button
                    onClick={() => { setSuccess(""); setShowForm(false); }}
                    className="block mt-1 text-green-500 text-xs underline cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-gray-600 text-xs font-semibold mb-1.5 uppercase tracking-wider">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Nome do assessor"
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:border-[#0369A1] transition-all"
                />
              </div>

              <div>
                <label className="block text-gray-600 text-xs font-semibold mb-1.5 uppercase tracking-wider">
                  E-mail *
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="email@gabinete.com.br"
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:border-[#0369A1] transition-all"
                />
              </div>

              <div>
                <label className="block text-gray-600 text-xs font-semibold mb-1.5 uppercase tracking-wider">
                  Telefone
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="(53) 9 0000-0000"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:border-[#0369A1] transition-all"
                />
              </div>

              <div>
                <label className="block text-gray-600 text-xs font-semibold mb-1.5 uppercase tracking-wider">
                  Senha *
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:border-[#0369A1] transition-all"
                />
              </div>

              <div>
                <label className="block text-gray-600 text-xs font-semibold mb-1.5 uppercase tracking-wider">
                  Nível de Acesso *
                </label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-700 text-sm focus:outline-none focus:border-[#0369A1] cursor-pointer transition-all"
                >
                  <option value="assessor">Assessor — pode gerenciar demandas e chat</option>
                  <option value="admin">Admin — acesso ao painel administrativo</option>
                </select>
              </div>

              <div
                className="p-3 rounded-xl text-xs"
                style={{ background: "#EFF6FF", color: "#0369A1" }}
              >
                <i className="ri-shield-check-line mr-1"></i>
                <strong>Assessores</strong> acessam o painel via <strong>/assessor</strong>. Admins acessam via <strong>/admin</strong>.
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 text-white font-bold text-sm rounded-xl cursor-pointer whitespace-nowrap transition-all"
                style={{
                  background: "linear-gradient(135deg, #0369A1, #0EA5E9)",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? "Criando..." : "Criar Assessor"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Pending assessors */}
      {pendingAssessors.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full animate-pulse bg-amber-500"></span>
            <h3 className="text-amber-700 font-bold text-sm">Pendentes de Aprovação ({pendingAssessors.length})</h3>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
            {pendingAssessors.map((a) => {
              const isThisApproved = approveFeedback?.id === a.id && approveFeedback.type === "success";
              return (
                <div key={a.id} className={`flex items-center gap-3 p-4 border-b border-amber-100 last:border-0 transition-all ${isThisApproved ? "bg-green-50" : ""}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-base font-bold ${isThisApproved ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"}`}>
                    {isThisApproved ? <i className="ri-check-fill"></i> : (a.full_name ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 font-semibold text-sm truncate">{a.full_name ?? "—"}</p>
                    {a.phone && <p className="text-gray-400 text-xs mt-0.5 truncate">{a.phone}</p>}
                  </div>
                  {!isThisApproved ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap bg-amber-100 text-amber-700 border border-amber-200 hidden sm:inline-flex">
                        Aguardando
                      </span>
                      <button
                        onClick={() => handleApprove(a.id, a.full_name ?? "")}
                        disabled={approving === a.id}
                        className="px-3 py-2 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap text-white disabled:opacity-50 transition-all"
                        style={{ background: "linear-gradient(135deg, #22C55E, #16A34A)" }}
                      >
                        {approving === a.id ? "..." : "Aprovar"}
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap bg-green-100 text-green-700 border border-green-200 shrink-0">
                      ✓ Aprovado
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active assessors + admins */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(3,105,161,0.3)", borderTopColor: "#0369A1" }}></div>
        </div>
      ) : (activeAssessors.length === 0 && admins.length === 0) ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <span className="w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <i className="ri-user-star-line text-gray-200 text-4xl"></i>
          </span>
          <p className="text-gray-500 font-semibold mb-1">Nenhum assessor ativo</p>
          <p className="text-gray-400 text-sm">Clique em "Cadastrar Assessor" para adicionar membros da equipe.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-50">
            {activeAssessors.map((a) => {
              const rl = roleLabel[a.role] ?? roleLabel.assessor;
              return (
                <div key={a.id} className="flex items-center gap-3 p-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-base font-bold"
                    style={{ background: rl.bg, color: rl.color }}
                  >
                    {(a.full_name ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 font-semibold text-sm truncate">{a.full_name ?? "—"}</p>
                    {a.phone && <p className="text-gray-400 text-xs mt-0.5 truncate">{a.phone}</p>}
                  </div>
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0"
                    style={{ color: rl.color, background: rl.bg }}
                  >
                    {rl.label}
                  </span>
                  <p className="text-gray-400 text-xs whitespace-nowrap hidden sm:block">{formatDate(a.created_at)}</p>
                </div>
              );
            })}
            {admins.map((a) => {
              const rl = roleLabel[a.role] ?? { label: "Admin", color: "#7C3AED", bg: "#F5F3FF" };
              return (
                <div key={a.id} className="flex items-center gap-3 p-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-base font-bold"
                    style={{ background: rl.bg, color: rl.color }}
                  >
                    {(a.full_name ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 font-semibold text-sm truncate">{a.full_name ?? "—"}</p>
                    {a.phone && <p className="text-gray-400 text-xs mt-0.5 truncate">{a.phone}</p>}
                  </div>
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0"
                    style={{ color: rl.color, background: rl.bg }}
                  >
                    {rl.label}
                  </span>
                  <p className="text-gray-400 text-xs whitespace-nowrap hidden sm:block">{formatDate(a.created_at)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}