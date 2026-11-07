import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/feature/Navbar";

export default function CadastroAssessorPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    display_name: "",
    name: "", phone: "", email: "", password: "", confirmPassword: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    if (!form.name.trim()) {
      setError("Informe seu nome completo.");
      return;
    }
    if (!form.display_name.trim()) {
      setError("Informe como quer ser chamado no sistema.");
      return;
    }
    setLoading(true);
    setError("");

    const displayName = form.display_name.trim() || form.name.trim();

    const { error: authError } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: {
          full_name: form.name.trim(),
          display_name: displayName,
          phone: form.phone,
          role: "pending_assessor",
        },
        emailRedirectTo: `${window.location.origin}/auth`,
      },
    });

    if (authError) {
      setLoading(false);
      setError(authError.message || "Erro ao criar conta. Tente novamente.");
      return;
    }

    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#030912] flex items-center justify-center px-4">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-12 max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
            <span className="w-10 h-10 flex items-center justify-center">
              <i className="ri-checkbox-circle-fill text-emerald-400 text-4xl"></i>
            </span>
          </div>
          <h2 className="text-2xl font-black text-white mb-3">Solicitação Enviada!</h2>
          <p className="text-white/50 text-sm leading-relaxed mb-4">
            Enviamos um link de confirmação para <strong className="text-white">{form.email}</strong>.
          </p>
          <p className="text-white/40 text-sm leading-relaxed mb-8">
            Após confirmar seu e-mail, sua solicitação será analisada por um administrador. Você receberá um e-mail quando for aprovado.
          </p>
          <div className="space-y-3">
            <button onClick={() => navigate("/auth")} className="block w-full py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-400 transition-colors cursor-pointer whitespace-nowrap">
              Ir para o Login
            </button>
            <Link to="/" className="block py-2 text-white/40 text-sm hover:text-white/60 transition-colors">
              Voltar ao Site
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030912]">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-28 pb-16">
        <div className="text-center mb-10">
          <p className="text-emerald-400 text-sm font-semibold uppercase tracking-widest mb-2">Sistema de Oportunidades</p>
          <h1 className="text-3xl md:text-4xl font-black text-white">Cadastro de Assessor</h1>
          <p className="text-white/40 text-sm mt-2">Solicite acesso ao painel administrativo</p>
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
              <label className="block text-white/70 text-sm font-medium mb-2">Como quer ser chamado no sistema? *</label>
              <input type="text" name="display_name" value={form.display_name} onChange={handleChange} required placeholder="Apelido ou nome que prefere" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 outline-none focus:border-emerald-400 transition-colors" />
            </div>
            <div>
              <label className="block text-white/70 text-sm font-medium mb-2">Nome Completo *</label>
              <input type="text" name="name" value={form.name} onChange={handleChange} required placeholder="Seu nome completo" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 outline-none focus:border-emerald-400 transition-colors" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-white/70 text-sm font-medium mb-2">Telefone</label>
                <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="(53) 9 0000-0000" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 outline-none focus:border-emerald-400 transition-colors" />
              </div>
              <div>
                <label className="block text-white/70 text-sm font-medium mb-2">E-mail *</label>
                <input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="seu@email.com" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 outline-none focus:border-emerald-400 transition-colors" />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-white/70 text-sm font-medium mb-2">Senha *</label>
                <input type="password" name="password" value={form.password} onChange={handleChange} required placeholder="Mínimo 6 caracteres" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 outline-none focus:border-emerald-400 transition-colors" />
              </div>
              <div>
                <label className="block text-white/70 text-sm font-medium mb-2">Confirmar Senha *</label>
                <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} required placeholder="Confirme a senha" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 outline-none focus:border-emerald-400 transition-colors" />
              </div>
            </div>
            <div className="p-3 rounded-xl text-xs leading-relaxed bg-amber-500/10 border border-amber-500/25 text-amber-400">
              <i className="ri-shield-keyhole-line mr-1.5"></i>
              <strong>Acesso restrito:</strong> Requer aprovação de um Administrador. Após o cadastro, aguarde a análise da sua solicitação.
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 transition-all cursor-pointer disabled:opacity-50">
              {loading ? "Solicitando..." : "Solicitar Acesso"}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <p className="text-white/40 text-sm">
            Já tem conta?{" "}
            <Link to="/auth" className="text-emerald-400 hover:text-emerald-300 cursor-pointer">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  );
}