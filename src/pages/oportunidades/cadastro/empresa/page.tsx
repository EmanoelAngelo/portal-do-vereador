import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/feature/Navbar";

export default function CadastroEmpresaPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    display_name: "",
    companyName: "", cnpj: "", phone: "", email: "", password: "", confirmPassword: "",
    description: "", logoName: "", responsible_name: ""
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setForm((p) => ({ ...p, logoName: file.name }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    if (!form.companyName.trim()) {
      setError("Informe o nome da empresa.");
      return;
    }
    if (!form.display_name.trim()) {
      setError("Informe como a empresa deve aparecer no sistema.");
      return;
    }
    setLoading(true);
    setError("");

    const displayName = form.display_name.trim() || form.companyName.trim();

    const { error: authError } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: {
          full_name: form.companyName.trim(),
          display_name: displayName,
          phone: form.phone,
          company_name: form.companyName,
          cnpj: form.cnpj,
          responsible_name: form.responsible_name,
          role: "empresa",
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
          <h2 className="text-2xl font-black text-white mb-3">Empresa Cadastrada!</h2>
          <p className="text-white/50 text-sm leading-relaxed mb-4">
            Enviamos um link de confirmação para <strong className="text-white">{form.email}</strong>.
          </p>
          <p className="text-white/40 text-sm leading-relaxed mb-8">
            Abra seu e-mail, clique no link de confirmação e depois faça login para acessar sua conta.
          </p>
          <div className="space-y-3">
            <button onClick={() => navigate("/auth")} className="block w-full py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-400 transition-colors cursor-pointer whitespace-nowrap">
              Ir para o Login
            </button>
            <Link to="/oportunidades" className="block py-2 text-white/40 text-sm hover:text-white/60 transition-colors">
              Voltar às Oportunidades
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
          <h1 className="text-3xl md:text-4xl font-black text-white">Cadastro de Empresa</h1>
          <p className="text-white/40 text-sm mt-2">Publique vagas e encontre os melhores talentos de Pelotas</p>
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
              <label className="block text-white/70 text-sm font-medium mb-2">Como a empresa aparecerá no sistema? *</label>
              <input type="text" name="display_name" value={form.display_name} onChange={handleChange} required placeholder="Nome fantasia ou apelido" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 outline-none focus:border-emerald-400 transition-colors" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-white/70 text-sm font-medium mb-2">Nome da Empresa *</label>
                <input type="text" name="companyName" value={form.companyName} onChange={handleChange} required placeholder="Razão social" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 outline-none focus:border-emerald-400 transition-colors" />
              </div>
              <div>
                <label className="block text-white/70 text-sm font-medium mb-2">CNPJ</label>
                <input type="text" name="cnpj" value={form.cnpj} onChange={handleChange} placeholder="00.000.000/0001-00" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 outline-none focus:border-emerald-400 transition-colors" />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-white/70 text-sm font-medium mb-2">Telefone *</label>
                <input type="tel" name="phone" value={form.phone} onChange={handleChange} required placeholder="(53) 3222-0000" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 outline-none focus:border-emerald-400 transition-colors" />
              </div>
              <div>
                <label className="block text-white/70 text-sm font-medium mb-2">E-mail *</label>
                <input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="empresa@email.com" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 outline-none focus:border-emerald-400 transition-colors" />
              </div>
            </div>
            <div>
              <label className="block text-white/70 text-sm font-medium mb-2">Nome do Responsável</label>
              <input type="text" name="responsible_name" value={form.responsible_name} onChange={handleChange} placeholder="Responsável pela conta" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 outline-none focus:border-emerald-400 transition-colors" />
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
            <div>
              <label className="block text-white/70 text-sm font-medium mb-2">Descrição da Empresa</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={4} placeholder="Descreva a empresa, segmento, missão e diferenciais..." className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 outline-none focus:border-emerald-400 transition-colors resize-none" />
            </div>
            <div>
              <label className="block text-white/70 text-sm font-medium mb-2">Logo da Empresa (opcional)</label>
              <label className="flex items-center gap-3 px-4 py-3 bg-white/5 border-2 border-dashed border-white/15 rounded-xl hover:border-emerald-400/50 transition-colors cursor-pointer">
                <span className="w-5 h-5 flex items-center justify-center text-emerald-400">
                  <i className="ri-image-line text-base"></i>
                </span>
                <span className="text-white/50 text-sm">{form.logoName || "Selecionar logotipo (PNG, JPG)"}</span>
                <input type="file" accept=".png,.jpg,.jpeg" onChange={handleLogo} className="hidden" />
              </label>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 transition-all cursor-pointer disabled:opacity-50">
              {loading ? "Cadastrando..." : "Cadastrar Empresa"}
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