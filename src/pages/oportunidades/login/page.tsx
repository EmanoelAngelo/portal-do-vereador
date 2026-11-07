import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginWithCredentials } from "@/hooks/useAuth";
import Navbar from "@/components/feature/Navbar";

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} (timeout ${ms}ms)`)), ms)
    ),
  ]);
}

export default function LoginOportunidadesPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await withTimeout(
        loginWithCredentials(form.email.trim(), form.password),
        15000,
        "login"
      );
      setLoading(false);

      if (!result.ok || !result.user) {
        setError(result.error || "E-mail ou senha inválidos.");
        return;
      }

      const role = result.user.role;
      if (role === "empresa") {
        navigate("/sistema/painel/empresa");
      } else {
        navigate("/sistema/painel/cidadao");
      }
    } catch (err) {
      setLoading(false);
      const msg = err instanceof Error ? err.message : "Erro de conexão. Tente novamente.";
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen bg-[#030912]">
      <Navbar />
      <div className="max-w-md mx-auto px-4 pt-28 pb-16">
        <div className="text-center mb-10">
          <p className="text-emerald-400 text-sm font-semibold uppercase tracking-widest mb-2">Sistema de Oportunidades</p>
          <h1 className="text-3xl font-black text-white">Entrar</h1>
          <p className="text-white/40 text-sm mt-2">Acesse sua conta de cidadão ou empresa</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
          {error && (
            <div className="mb-5 p-4 rounded-xl text-red-400 text-sm flex items-start gap-2 bg-red-500/10 border border-red-500/20">
              <i className="ri-error-warning-line mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-white/70 text-sm font-medium mb-2">E-mail</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="seu@email.com" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 outline-none focus:border-emerald-400 transition-colors" />
            </div>
            <div>
              <label className="block text-white/70 text-sm font-medium mb-2">Senha</label>
              <div className="relative">
                <input type={showPass ? "text" : "password"} name="password" value={form.password} onChange={handleChange} required placeholder="••••••••" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 outline-none focus:border-emerald-400 transition-colors pr-12" />
                <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-white/40">
                  <i className={showPass ? "ri-eye-off-line" : "ri-eye-line"} />
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 transition-all cursor-pointer disabled:opacity-50">
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center space-y-2">
          <p className="text-white/40 text-sm">
            Não tem conta?{" "}
            <Link to="/oportunidades/cadastro/cidadao" className="text-emerald-400 hover:text-emerald-300 cursor-pointer">Cadastrar como cidadão</Link>
          </p>
          <p className="text-white/40 text-sm">
            É uma empresa?{" "}
            <Link to="/oportunidades/cadastro/empresa" className="text-emerald-400 hover:text-emerald-300 cursor-pointer">Cadastrar empresa</Link>
          </p>
          <p className="text-white/40 text-sm">
            É assessor?{" "}
            <Link to="/oportunidades/cadastro/assessor" className="text-emerald-400 hover:text-emerald-300 cursor-pointer">Solicitar acesso</Link>
          </p>
          <p className="text-white/40 text-sm mt-2">
            <Link to="/auth" className="text-emerald-400 hover:text-emerald-300 cursor-pointer text-xs">Acesso geral (admin, assessor, vereador)</Link>
          </p>
        </div>
      </div>
    </div>
  );
}