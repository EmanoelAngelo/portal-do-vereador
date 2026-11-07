import { useState } from "react";
import { loginWithCredentials } from "@/hooks/useAuth";

interface Props {
  onSuccess: (user: { id: string; email: string; name: string }) => void;
}

export default function AdminLogin({ onSuccess }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await loginWithCredentials(email, password);

    if (!result.ok || !result.user) {
      setLoading(false);
      setError(result.error ?? "Credenciais inválidas.");
      return;
    }

    if (result.user.role !== "admin") {
      setLoading(false);
      setError("Acesso negado. Você não tem permissão de administrador.");
      return;
    }

    setLoading(false);
    onSuccess({ id: result.user.id, email: result.user.email, name: result.user.full_name });
  };

  return (
    <div className="min-h-screen bg-[#020C1B] flex items-center justify-center px-4">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 bg-[#0369A1]/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0369A1] to-[#0EA5E9] flex items-center justify-center mx-auto shadow-xl shadow-blue-500/30 mb-4">
            <span className="w-7 h-7 flex items-center justify-center">
              <i className="ri-shield-user-line text-white text-2xl"></i>
            </span>
          </div>
          <h1 className="text-white font-extrabold text-2xl">Painel Administrativo</h1>
          <p className="text-white/50 text-sm mt-1">Arthur Halal · Vereador Pelotas</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl border border-white/8 rounded-3xl p-8">
          {error && (
            <div className="mb-5 p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm flex items-start gap-2">
              <i className="ri-error-warning-line mt-0.5 shrink-0"></i>
              {error}
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-white/60 text-xs font-semibold mb-1.5 uppercase tracking-wider">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                placeholder="admin@arthurhalal.com.br"
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#ffffff", caretColor: "#38BDF8" }}
                required
              />
            </div>
            <div>
              <label className="block text-white/60 text-xs font-semibold mb-1.5 uppercase tracking-wider">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="••••••••"
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#ffffff", caretColor: "#38BDF8" }}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-[#0369A1] to-[#0EA5E9] text-white font-bold text-sm rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"></span>
                  Verificando...
                </span>
              ) : "Entrar no Painel"}
            </button>
          </form>
        </div>
      </div>
      <style>{`input::placeholder { color: rgba(255,255,255,0.3) !important; } input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus { -webkit-text-fill-color: #ffffff !important; -webkit-box-shadow: 0 0 0px 1000px rgba(3,105,161,0.15) inset !important; }`}</style>
    </div>
  );
}