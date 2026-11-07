import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { loginWithCredentials } from "@/hooks/useAuth";

export default function AssessorLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [forgotSent, setForgotSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await loginWithCredentials(email.trim(), password);

    if (!result.ok || !result.user) {
      setLoading(false);
      setError(result.error ?? "E-mail ou senha inválidos.");
      return;
    }

    if (!["assessor", "admin"].includes(result.user.role)) {
      setLoading(false);
      setError("Acesso negado. Você não possui perfil de assessor.");
      return;
    }

    // Verificar onboarding_step — assessor aprovado precisa completar perfil primeiro
    try {
      const { data: prof } = await supabase
        .from("profiles")
        .select("onboarding_step, status")
        .eq("id", result.user.id)
        .maybeSingle();

      const onboardingStep = (prof as any)?.onboarding_step as string | null;
      const status = (prof as any)?.status as string | null;

      if (status === "pending") {
        setLoading(false);
        setError("Seu cadastro ainda está em análise. Aguarde a aprovação do administrador.");
        return;
      }

      if (onboardingStep && status === "active") {
        setLoading(false);
        navigate("/complete-profile", { replace: true });
        return;
      }
    } catch (_) {
      // fallback: vai direto pro painel
    }

    setLoading(false);
    navigate("/assessor/painel");
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await supabase.auth.resetPasswordForEmail(email.trim());
    setLoading(false);
    setForgotSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden" style={{ background: "#020C1B" }}>
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] pointer-events-none" style={{ background: "radial-gradient(circle, rgba(3,105,161,0.12) 0%, transparent 70%)" }}></div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center shadow-xl mb-4" style={{ background: "linear-gradient(135deg, #0369A1, #0EA5E9)", boxShadow: "0 0 30px rgba(3,105,161,0.4)" }}>
            <span className="w-7 h-7 flex items-center justify-center">
              <i className="ri-user-star-line text-white text-2xl"></i>
            </span>
          </div>
          <h1 className="text-white font-extrabold text-2xl">Painel do Assessor</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
            Arthur Halal · Vereador de Pelotas
          </p>
        </div>

        <div className="rounded-3xl p-8 backdrop-blur-xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          {error && (
            <div className="mb-5 p-4 rounded-xl text-red-400 text-sm flex items-start gap-2" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>
              <i className="ri-error-warning-line mt-0.5 shrink-0"></i>
              <span>{error}</span>
            </div>
          )}
          {forgotSent && (
            <div className="mb-5 p-4 rounded-xl text-green-400 text-sm flex items-start gap-2" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)" }}>
              <i className="ri-checkbox-circle-line mt-0.5 shrink-0"></i>
              <span>Link de recuperação enviado! Verifique seu e-mail.</span>
            </div>
          )}

          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.55)" }}>
                  E-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  placeholder="seu@email.com"
                  required
                  className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#ffffff", caretColor: "#38BDF8" }}
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.55)" }}>
                  Senha
                </label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    placeholder="••••••••"
                    required
                    className="w-full rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none transition-all"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#ffffff", caretColor: "#38BDF8" }}
                  />
                  <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer" style={{ color: "rgba(255,255,255,0.4)" }}>
                    <i className={showPass ? "ri-eye-off-line" : "ri-eye-line"}></i>
                  </button>
                </div>
              </div>
              <button type="button" onClick={() => setMode("forgot")} className="text-xs hover:underline cursor-pointer" style={{ color: "#38BDF8" }}>
                Esqueceu a senha?
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 text-white font-bold text-sm rounded-xl transition-all duration-200 cursor-pointer whitespace-nowrap"
                style={{ background: loading ? "rgba(3,105,161,0.5)" : "linear-gradient(135deg, #0369A1, #0EA5E9)" }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 rounded-full animate-spin inline-block" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }}></span>
                    Verificando...
                  </span>
                ) : "Entrar"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleForgot} className="space-y-4">
              <p className="text-sm mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>
                Digite seu e-mail para receber o link de recuperação de senha.
              </p>
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.55)" }}>E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#ffffff", caretColor: "#38BDF8" }}
                />
              </div>
              <button
                type="submit"
                disabled={loading || forgotSent}
                className="w-full py-3.5 text-white font-bold text-sm rounded-xl transition-all cursor-pointer whitespace-nowrap"
                style={{ background: "linear-gradient(135deg, #0369A1, #0EA5E9)" }}
              >
                {loading ? "Enviando..." : "Enviar link"}
              </button>
              <button type="button" onClick={() => setMode("login")} className="w-full text-center text-xs hover:underline cursor-pointer" style={{ color: "rgba(255,255,255,0.5)" }}>
                Voltar ao login
              </button>
            </form>
          )}
        </div>
      </div>
      <style>{`input::placeholder { color: rgba(255,255,255,0.3) !important; } input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus { -webkit-text-fill-color: #ffffff !important; -webkit-box-shadow: 0 0 0px 1000px rgba(3,105,161,0.15) inset !important; }`}</style>
    </div>
  );
}