import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { getStoredUser } from "@/hooks/useAuth";
import Navbar from "@/components/feature/Navbar";
import Footer from "@/components/feature/Footer";
import FloatingButtons from "@/components/feature/FloatingButtons";
import { notificarRelevantes, criarNotificacao } from "@/hooks/useNotifications";

const FORM_URL = "https://readdy.ai/api/form/d8gt7p0b91vaa813dsd0";

const categories = [
  "Calçamento / Pavimentação",
  "Iluminação Pública",
  "Limpeza Urbana",
  "Saúde",
  "Educação",
  "Segurança",
  "Transporte",
  "Parques e Praças",
  "Meio Ambiente",
  "Habitação",
  "Outros",
];

interface FormState {
  citizen_name: string;
  citizen_email: string;
  phone: string;
  title: string;
  category: string;
  description: string;
  neighborhood: string;
}

export default function RequerimentoPage() {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [loggedUser, setLoggedUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [form, setForm] = useState<FormState>({
    citizen_name: "",
    citizen_email: "",
    phone: "",
    title: "",
    category: "",
    description: "",
    neighborhood: "",
  });

  // Auto-fill para cidadão logado
  useEffect(() => {
    const stored = getStoredUser();
    if (stored && stored.role === "citizen") {
      setLoggedUser({ id: stored.id, name: stored.full_name, email: stored.email });
      setForm((prev) => ({
        ...prev,
        citizen_name: stored.full_name || "",
        citizen_email: stored.email || "",
      }));
    }
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.citizen_name.trim()) { setError("Informe seu nome."); return; }
    if (!form.title.trim()) { setError("Informe o título do requerimento."); return; }
    if (!form.category) { setError("Selecione uma categoria."); return; }
    if (form.description.length < 30) {
      setError("Descreva com mais detalhes (mínimo 30 caracteres).");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // 1. Salvar no Supabase
      const { data: inserted, error: dbErr } = await supabase.from("demands").insert({
        citizen_id: loggedUser?.id ?? null,
        citizen_name: form.citizen_name.trim(),
        citizen_email: form.citizen_email.trim() || null,
        citizen_phone: form.phone.trim() || null,
        citizen_neighborhood: form.neighborhood.trim() || null,
        type: "requerimento",
        category: form.category,
        title: form.title.trim(),
        description: form.description.trim(),
        status: "aberto",
      }).select("id");

      if (dbErr) {
        setError("Erro ao enviar. Tente novamente.");
        setSubmitting(false);
        return;
      }

      // Notificar admin/vereador/assessor sobre novo requerimento
      const demandId = inserted && inserted.length > 0 ? String((inserted[0] as { id: number }).id) : null;
      await notificarRelevantes(
        "demanda",
        "Novo requerimento recebido",
        `"${form.title.trim()}" enviado por ${form.citizen_name.trim()}.`,
        {
          remetenteId: loggedUser?.id ?? null,
          remetenteNome: form.citizen_name.trim(),
          referenciaId: demandId ?? undefined,
          referenciaTipo: "demanda",
        }
      );

      // N8: Notificar o próprio cidadão confirmando recebimento
      if (loggedUser?.id) {
        await criarNotificacao(
          loggedUser.id,
          "demanda",
          "Requerimento recebido",
          `Seu requerimento "${form.title.trim()}" foi recebido e será analisado pelo gabinete do Vereador Arthur Halal.`,
          loggedUser.id,
          loggedUser.name,
          demandId ?? "",
          "demanda"
        );
      }

      // 2. Enviar ao Readdy para aparecer no painel de controle
      const body = new URLSearchParams({
        nome: form.citizen_name.trim(),
        email: form.citizen_email.trim(),
        telefone: form.phone.trim(),
        bairro: form.neighborhood.trim(),
        categoria: form.category,
        titulo: form.title.trim(),
        descricao: form.description.trim(),
      });

      fetch(FORM_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      }).catch(() => {/* silently fail — Supabase já salvou */});

      setSuccess(true);
      setForm({
        citizen_name: loggedUser?.name ?? "",
        citizen_email: loggedUser?.email ?? "",
        phone: "",
        title: "",
        category: "",
        description: "",
        neighborhood: "",
      });
    } catch {
      setError("Erro ao enviar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />

      <main className="pt-24 pb-20">
        <div className="max-w-3xl mx-auto px-4 md:px-8">
          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
              <Link to="/" className="hover:text-[#0369A1] transition-colors">Início</Link>
              <i className="ri-arrow-right-s-line text-gray-300"></i>
              <Link to="/sugestao-projeto" className="hover:text-[#0369A1] transition-colors">Requerimento &amp; Projeto</Link>
              <i className="ri-arrow-right-s-line text-gray-300"></i>
              <span className="text-[#0369A1] font-medium">Requerimento</span>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0369A1] to-[#0EA5E9] flex items-center justify-center">
                <span className="w-6 h-6 flex items-center justify-center">
                  <i className="ri-file-list-3-line text-white text-xl"></i>
                </span>
              </div>
              <div>
                <h1 className="text-3xl font-extrabold text-gray-900">Enviar Requerimento</h1>
                <p className="text-gray-500 text-sm mt-0.5">
                  Solicite obras, melhorias ou serviços para o seu bairro
                </p>
              </div>
            </div>
            <div className="h-1 w-20 rounded-full bg-gradient-to-r from-[#0369A1] to-[#0EA5E9]"></div>
          </div>

          {/* Banner cidadão logado */}
          {loggedUser && (
            <div className="mb-6 p-4 rounded-2xl bg-green-50 border border-green-200 flex items-center gap-3">
              <span className="w-8 h-8 flex items-center justify-center rounded-full bg-green-100 shrink-0">
                <i className="ri-user-smile-line text-green-600 text-base"></i>
              </span>
              <div>
                <p className="text-green-800 font-bold text-sm">Você está logado como {loggedUser.name}</p>
                <p className="text-green-600 text-xs mt-0.5">Seus dados já foram preenchidos automaticamente. Preencha apenas os campos do requerimento.</p>
              </div>
            </div>
          )}

          {success ? (
            <div className="bg-white rounded-3xl border border-green-100 p-10 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
                <span className="w-8 h-8 flex items-center justify-center">
                  <i className="ri-checkbox-circle-fill text-green-500 text-3xl"></i>
                </span>
              </div>
              <h2 className="text-gray-900 font-extrabold text-2xl mb-2">Requerimento enviado!</h2>
              <p className="text-gray-500 text-base mb-7">
                Seu requerimento foi registrado com sucesso. O gabinete de Arthur Halal irá
                analisar e retornar o mais breve possível.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to="/cidadao"
                  className="px-6 py-3 bg-gradient-to-r from-[#1B2A5E] to-[#3BBFD4] text-white font-bold text-sm rounded-xl hover:scale-[1.02] transition-all whitespace-nowrap flex items-center gap-2"
                >
                  <i className="ri-file-list-line"></i>Ver minhas demandas
                </Link>
                <Link
                  to="/"
                  className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold text-sm rounded-xl hover:bg-gray-200 transition-all whitespace-nowrap"
                >
                  Voltar ao Início
                </Link>
                <button
                  onClick={() => setSuccess(false)}
                  className="px-6 py-3 bg-white border border-gray-200 text-gray-700 font-semibold text-sm rounded-xl hover:bg-gray-50 transition-all whitespace-nowrap cursor-pointer"
                >
                  Enviar Outro
                </button>
              </div>
            </div>
          ) : (
            <form
              data-readdy-form
              onSubmit={handleSubmit}
              className="bg-white rounded-3xl border border-gray-100 p-8 space-y-6"
            >
              {error && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-start gap-2">
                  <i className="ri-error-warning-line mt-0.5 shrink-0"></i>
                  {error}
                </div>
              )}

              {/* Info box */}
              <div className="p-5 bg-[#EFF6FF] rounded-2xl border border-[#DBEAFE]">
                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
                    <i className="ri-information-line text-[#0369A1] text-lg"></i>
                  </span>
                  <div>
                    <p className="text-[#0369A1] font-bold text-sm">Como funciona?</p>
                    <p className="text-[#0369A1]/70 text-xs mt-0.5 leading-relaxed">
                      Preencha o formulário abaixo. Seu requerimento será analisado pelo gabinete
                      do Vereador Arthur Halal e a equipe entrará em contato se necessário.
                    </p>
                  </div>
                </div>
              </div>

              {/* Dados pessoais */}
              <div>
                <h3 className="text-gray-800 font-bold text-base mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 flex items-center justify-center bg-[#EFF6FF] rounded-lg">
                    <i className="ri-user-line text-[#0369A1] text-sm"></i>
                  </span>
                  Seus dados
                  {loggedUser && (
                    <span className="text-xs font-normal text-green-600 ml-1">(preenchido automaticamente)</span>
                  )}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-gray-700 text-sm font-semibold mb-1.5">
                      Nome completo *
                    </label>
                    <input
                      name="citizen_name"
                      type="text"
                      value={form.citizen_name}
                      onChange={handleChange}
                      placeholder="Seu nome completo"
                      disabled={!!loggedUser}
                      className={`w-full border rounded-xl px-4 py-3 text-gray-800 text-sm placeholder:text-gray-400 focus:outline-none focus:border-[#0369A1] focus:bg-white transition-all ${loggedUser ? "bg-gray-100 cursor-not-allowed text-gray-500" : "bg-gray-50 border-gray-200"}`}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm font-semibold mb-1.5">Telefone</label>
                    <input
                      name="phone"
                      type="tel"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="(53) 9 0000-0000"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm placeholder:text-gray-400 focus:outline-none focus:border-[#0369A1] focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm font-semibold mb-1.5">E-mail</label>
                    <input
                      name="citizen_email"
                      type="email"
                      value={form.citizen_email}
                      onChange={handleChange}
                      placeholder="seu@email.com"
                      disabled={!!loggedUser}
                      className={`w-full border rounded-xl px-4 py-3 text-gray-800 text-sm placeholder:text-gray-400 focus:outline-none focus:border-[#0369A1] focus:bg-white transition-all ${loggedUser ? "bg-gray-100 cursor-not-allowed text-gray-500" : "bg-gray-50 border-gray-200"}`}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm font-semibold mb-1.5">Bairro</label>
                    <input
                      name="neighborhood"
                      type="text"
                      value={form.neighborhood}
                      onChange={handleChange}
                      placeholder="Seu bairro"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm placeholder:text-gray-400 focus:outline-none focus:border-[#0369A1] focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Dados do requerimento */}
              <div>
                <h3 className="text-gray-800 font-bold text-base mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 flex items-center justify-center bg-[#EFF6FF] rounded-lg">
                    <i className="ri-file-list-3-line text-[#0369A1] text-sm"></i>
                  </span>
                  Dados do requerimento
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-gray-700 text-sm font-semibold mb-1.5">
                      Título do Requerimento *
                    </label>
                    <input
                      name="title"
                      type="text"
                      value={form.title}
                      onChange={handleChange}
                      placeholder="Ex: Solicitação de recapeamento na Rua das Flores"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm placeholder:text-gray-400 focus:outline-none focus:border-[#0369A1] focus:bg-white transition-all"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-gray-700 text-sm font-semibold mb-1.5">Categoria *</label>
                    <select
                      name="category"
                      value={form.category}
                      onChange={handleChange}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:border-[#0369A1] focus:bg-white transition-all cursor-pointer"
                      required
                    >
                      <option value="">Selecione...</option>
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-gray-700 text-sm font-semibold mb-1.5">
                      Descrição detalhada *
                    </label>
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      rows={5}
                      maxLength={500}
                      placeholder="Descreva em detalhes o que precisa ser feito, onde está localizado o problema, há quanto tempo existe e qual impacto gera na comunidade..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm placeholder:text-gray-400 focus:outline-none focus:border-[#0369A1] focus:bg-white transition-all resize-none"
                      required
                    />
                    <p className="text-gray-400 text-xs mt-1 text-right">{form.description.length}/500</p>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-gradient-to-r from-[#0369A1] to-[#0EA5E9] text-white font-bold text-sm rounded-xl hover:scale-[1.01] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"></span>
                    Enviando...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <i className="ri-send-plane-line"></i>
                    Enviar Requerimento
                  </span>
                )}
              </button>
            </form>
          )}
        </div>
      </main>

      <Footer />
      <FloatingButtons />
    </div>
  );
}