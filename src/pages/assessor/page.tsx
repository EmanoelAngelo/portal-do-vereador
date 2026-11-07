import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { loginWithCredentials } from "@/hooks/useAuth";

type Mode = "login" | "forgot";

export default function AssessorEntryPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await loginWithCredentials(form.email.trim(), form.password);

    if (!result.ok || !result.user) {
      setLoading(false);
      setError(result.error ?? "E-mail ou senha inválidos.");
      return;
    }

    if (!["assessor", "admin"].includes(result.user.role)) {
      setLoading(false);
      setError("Acesso negado. Este ambiente é exclusivo para assessores.");
      return;
    }

    setLoading(false);
    if (result.user.role === "admin") {
      navigate("/admin");
    } else {
      navigate("/assessor/painel");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) { setError("Informe seu nome completo."); return; }
    if (form.password.length < 6) { setError("A senha deve ter pelo menos 6 caracteres."); return; }
    setLoading(true);
    setError("");
    const { data, error: err } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: { data: { full_name: form.full_name } },
    });
    if (err) {
      setLoading(false);
      setError(err.message);
      return;
    }
    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        full_name: form.full_name,
        phone: form.phone,
        role: "assessor",
      });
      if (data.session) {
        setLoading(false);
        navigate("/assessor/painel");
        return;
      }
    }
    setLoading(false);
    setSuccess("Cadastro realizado! Verifique seu e-mail para confirmar a conta e depois entre com suas credenciais.");
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email) { setError("Digite seu e-mail primeiro."); return; }
    setLoading(true);
    await supabase.auth.resetPasswordForEmail(form.email.trim());
    setLoading(false);
    setSuccess("Link de recuperação enviado! Verifique seu e-mail.");
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: "#020C1B" }}
    >
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(3,105,161,0.14) 0%, transparent 70%)" }}
      ></div>

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center shadow-xl mb-4"
            style={{ background: "linear-gradient(135deg, #0369A1, #0EA5E9)", boxShadow: "0 0 30px rgba(3,105,161,0.4)" }}
          >
            <span className="w-7 h-7 flex items-center justify-center">
              <i className="ri-user-star-line text-white text-2xl"></i>
            </span>
          </div>
          <h1 className="text-white font-extrabold text-2xl">Área do Assessor</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
            Arthur Halal · Gabinete Vereador Pelotas
          </p>
        </div>

        <div
          className="rounded-3xl p-8 backdrop-blur-xl"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
        >


          {success && (
            <div className="mb-5 p-4 rounded-xl text-green-400 text-sm flex items-start gap-2" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)" }}>
              <i className="ri-checkbox-circle-line mt-0.5 shrink-0"></i>
              <span>{success}</span>
            </div>
          )}
          {error && (
            <div className="mb-5 p-4 rounded-xl text-red-400 text-sm flex items-start gap-2" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>
              <i className="ri-error-warning-line mt-0.5 shrink-0"></i>
              <span>{error}</span>
            </div>
          )}

          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.55)" }}>
                  E-mail
                </label>
                <input
                  name="email" type="email" value={form.email} onChange={handleChange}
                  placeholder="seu@email.com" required
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
                    name="password" type={showPass ? "text" : "password"} value={form.password} onChange={handleChange}
                    placeholder="••••••••" required
                    className="w-full rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none transition-all"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#ffffff", caretColor: "#38BDF8" }}
                  />
                  <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer" style={{ color: "rgba(255,255,255,0.4)" }}>
                    <i className={showPass ? "ri-eye-off-line" : "ri-eye-line"}></i>
                  </button>
                </div>
              </div>
              <button type="button" onClick={() => { setMode("forgot"); setError(""); }} className="text-xs hover:underline cursor-pointer" style={{ color: "#38BDF8" }}>
                Esqueceu a senha?
              </button>
              <button
                type="submit" disabled={loading}
                className="w-full py-3.5 text-white font-bold text-sm rounded-xl transition-all cursor-pointer whitespace-nowrap"
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
          )}



          {mode === "forgot" && (
            <form onSubmit={handleForgot} className="space-y-4">
              <p className="text-sm mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>
                Digite seu e-mail para receber o link de recuperação de senha.
              </p>
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.55)" }}>E-mail</label>
                <input
                  name="email" type="email" value={form.email} onChange={handleChange}
                  placeholder="seu@email.com" required
                  className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#ffffff", caretColor: "#38BDF8" }}
                />
              </div>
              <button
                type="submit" disabled={loading}
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

        <p className="text-center text-xs mt-4" style={{ color: "rgba(255,255,255,0.25)" }}>
          Acesso restrito — Gabinete Arthur Halal
        </p>
      </div>
      <style>{`input::placeholder { color: rgba(255,255,255,0.3) !important; } input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus { -webkit-text-fill-color: #ffffff !important; -webkit-box-shadow: 0 0 0px 1000px rgba(3,105,161,0.15) inset !important; }`}</style>
    </div>
  );
}