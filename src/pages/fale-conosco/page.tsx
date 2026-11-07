import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/feature/Navbar";
import Footer from "@/components/feature/Footer";
import FloatingButtons from "@/components/feature/FloatingButtons";
import { notificarRelevantes } from "@/hooks/useNotifications";

const FORM_URL = "https://readdy.ai/api/form/d8l2rs0m1jqlm5gfvn2g";

interface FormState {
  nome: string;
  telefone: string;
  email: string;
  bairro: string;
  categoria: string;
  mensagem: string;
}

const initialForm: FormState = {
  nome: "",
  telefone: "",
  email: "",
  bairro: "",
  categoria: "",
  mensagem: "",
};

export default function FaleConoscoPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.nome.trim()) { setError("Informe seu nome."); return; }
    if (!form.telefone.trim()) { setError("Informe seu telefone."); return; }
    if (!form.bairro.trim()) { setError("Informe seu bairro."); return; }
    if (!form.categoria) { setError("Selecione uma categoria."); return; }
    if (form.mensagem.trim().length < 10) { setError("Escreva uma mensagem com mais detalhes."); return; }

    setSubmitting(true);
    setError("");

    try {
      // 1. Salvar no Supabase (fonte primária)
      const { data: inserted, error: dbErr } = await supabase.from("demands").insert({
        citizen_name: form.nome.trim(),
        citizen_email: form.email.trim() || null,
        citizen_phone: form.telefone.trim(),
        citizen_neighborhood: form.bairro.trim(),
        type: "contato",
        category: form.categoria,
        title: `${form.categoria} — ${form.nome.trim()} — ${form.bairro.trim()}`,
        description: form.mensagem.trim(),
        status: "aberto",
      }).select("id");

      if (dbErr) {
        console.error("[FaleConosco] Supabase error:", dbErr);
        setError("Erro ao enviar. Tente novamente.");
        setSubmitting(false);
        return;
      }

      // Notificar admin/vereador/assessor sobre nova demanda
      const demandId = inserted && inserted.length > 0 ? String((inserted[0] as { id: number }).id) : null;
      await notificarRelevantes(
        "demanda",
        "Novo contato recebido",
        `"${form.categoria}" de ${form.nome.trim()} (${form.bairro.trim()}).`,
        {
          remetenteNome: form.nome.trim(),
          referenciaId: demandId ?? undefined,
          referenciaTipo: "demanda",
        }
      );

      // 2. Enviar ao Readdy (notificação secundária — falha silenciosa)
      const body = new URLSearchParams({
        nome: form.nome.trim(),
        email: form.email.trim(),
        telefone: form.telefone.trim(),
        bairro: form.bairro.trim(),
        categoria: form.categoria,
        mensagem: form.mensagem.trim(),
      });
      fetch(FORM_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      }).catch(() => {/* silently fail — Supabase já salvou */});

      setSuccess(true);
      setForm(initialForm);
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
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          {/* Header */}
          <div className="text-center mb-14">
            <div className="flex items-center gap-2 text-sm text-gray-500 justify-center mb-4">
              <Link to="/" className="hover:text-[#0369A1] transition-colors">Início</Link>
              <i className="ri-arrow-right-s-line text-gray-300"></i>
              <span className="text-[#0369A1] font-medium">Fale Conosco</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-3">
              Fale com o{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0369A1] to-[#0EA5E9]">
                Vereador
              </span>
            </h1>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Sua mensagem chega diretamente ao gabinete de Arthur Halal. Reclamações, sugestões e contatos são bem-vindos.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Contact Cards */}
            <div className="space-y-4">
              {[
                { icon: "ri-map-pin-line", title: "Endereço", info: "Câmara Municipal de Pelotas\nPelotas — RS" },
                { icon: "ri-whatsapp-line", title: "WhatsApp", info: "(53) 9 0000-0000" },
                { icon: "ri-mail-line", title: "E-mail", info: "gabinete@arthurhalal.com.br" },
                { icon: "ri-time-line", title: "Atendimento", info: "Seg–Sex: 08h às 18h" },
              ].map((c) => (
                <div
                  key={c.title}
                  className="flex items-start gap-4 p-5 bg-white rounded-2xl border border-gray-100 hover:border-[#0369A1]/20 transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0369A1] to-[#0EA5E9] flex items-center justify-center shrink-0">
                    <span className="w-5 h-5 flex items-center justify-center">
                      <i className={`${c.icon} text-white text-lg`}></i>
                    </span>
                  </div>
                  <div>
                    <p className="text-gray-900 font-bold text-sm">{c.title}</p>
                    <p className="text-gray-500 text-xs mt-0.5 leading-relaxed whitespace-pre-line">{c.info}</p>
                  </div>
                </div>
              ))}

              <div className="p-5 bg-[#EFF6FF] rounded-2xl border border-[#DBEAFE]">
                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
                    <i className="ri-lightbulb-line text-[#0369A1] text-lg"></i>
                  </span>
                  <div>
                    <p className="text-[#0369A1] font-bold text-sm">Cidadão cadastrado?</p>
                    <p className="text-[#0369A1]/70 text-xs mt-0.5 leading-relaxed">
                      Faça login para enviar requerimentos e acompanhar suas demandas.
                    </p>
                    <Link to="/auth" className="inline-block mt-2 text-[#0369A1] text-xs font-bold hover:underline">
                      Área do Cidadão →
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-2">
              {success ? (
                <div className="bg-white rounded-3xl border border-green-100 p-10 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
                    <span className="w-8 h-8 flex items-center justify-center">
                      <i className="ri-checkbox-circle-fill text-green-500 text-3xl"></i>
                    </span>
                  </div>
                  <h2 className="text-gray-900 font-extrabold text-2xl mb-2">Mensagem enviada!</h2>
                  <p className="text-gray-500 text-base mb-7">
                    Sua mensagem foi registrada com sucesso. O gabinete de Arthur Halal irá
                    analisar e entrar em contato em breve.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                      to="/"
                      className="px-6 py-3 bg-gradient-to-r from-[#0369A1] to-[#0EA5E9] text-white font-semibold rounded-xl hover:scale-[1.01] transition-all whitespace-nowrap"
                    >
                      Voltar ao Início
                    </Link>
                    <button
                      onClick={() => setSuccess(false)}
                      className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all whitespace-nowrap cursor-pointer"
                    >
                      Enviar Outra Mensagem
                    </button>
                  </div>
                </div>
              ) : (
                <form
                  data-readdy-form
                  id="fale-conosco-form"
                  onSubmit={handleSubmit}
                  className="bg-white rounded-3xl border border-gray-100 p-8 space-y-5"
                >
                  {error && (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-start gap-2">
                      <i className="ri-error-warning-line mt-0.5 shrink-0"></i>
                      {error}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-gray-700 text-sm font-semibold mb-1.5">
                        Nome completo *
                      </label>
                      <input
                        name="nome"
                        type="text"
                        value={form.nome}
                        onChange={handleChange}
                        placeholder="Seu nome"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm placeholder:text-gray-400 focus:outline-none focus:border-[#0369A1] focus:bg-white transition-all"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm font-semibold mb-1.5">
                        Telefone *
                      </label>
                      <input
                        name="telefone"
                        type="tel"
                        value={form.telefone}
                        onChange={handleChange}
                        placeholder="(53) 9 0000-0000"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm placeholder:text-gray-400 focus:outline-none focus:border-[#0369A1] focus:bg-white transition-all"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm font-semibold mb-1.5">E-mail</label>
                      <input
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="seu@email.com"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm placeholder:text-gray-400 focus:outline-none focus:border-[#0369A1] focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm font-semibold mb-1.5">Bairro *</label>
                      <input
                        name="bairro"
                        type="text"
                        value={form.bairro}
                        onChange={handleChange}
                        placeholder="Seu bairro"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm placeholder:text-gray-400 focus:outline-none focus:border-[#0369A1] focus:bg-white transition-all"
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-gray-700 text-sm font-semibold mb-1.5">
                        Categoria *
                      </label>
                      <select
                        name="categoria"
                        value={form.categoria}
                        onChange={handleChange}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:border-[#0369A1] cursor-pointer transition-all"
                        required
                      >
                        <option value="">Selecione a categoria...</option>
                        <option value="Reclamação">Reclamação</option>
                        <option value="Sugestão">Sugestão</option>
                        <option value="Pedido de Melhoria">Pedido de Melhoria</option>
                        <option value="Contato Direto">Contato Direto</option>
                        <option value="Denúncia">Denúncia</option>
                        <option value="Elogio">Elogio</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-gray-700 text-sm font-semibold mb-1.5">
                        Mensagem *
                      </label>
                      <textarea
                        name="mensagem"
                        value={form.mensagem}
                        onChange={handleChange}
                        rows={5}
                        maxLength={500}
                        placeholder="Descreva detalhadamente sua mensagem, reclamação ou sugestão..."
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm placeholder:text-gray-400 focus:outline-none focus:border-[#0369A1] focus:bg-white transition-all resize-none"
                        required
                      />
                      <p className="text-gray-400 text-xs mt-1 text-right">{form.mensagem.length}/500</p>
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
                        Enviar Mensagem
                      </span>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
      <FloatingButtons />
    </div>
  );
}