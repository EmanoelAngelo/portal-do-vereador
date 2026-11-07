import { useState } from "react";
import { supabase } from "@/lib/supabase";

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

export default function RequerimentoSection() {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    citizen_name: "",
    citizen_email: "",
    phone: "",
    title: "",
    category: "",
    description: "",
    neighborhood: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

    const { error: err } = await supabase.from("demands").insert({
      citizen_id: null,
      citizen_name: form.citizen_name.trim(),
      citizen_email: form.citizen_email.trim() || null,
      citizen_phone: form.phone.trim() || null,
      citizen_neighborhood: form.neighborhood.trim() || null,
      type: "requerimento",
      category: form.category,
      title: form.title,
      description: form.description,
      status: "aberto",
    });

    setSubmitting(false);
    if (err) { setError("Erro ao enviar. Tente novamente."); return; }
    setSuccess(true);
    setForm({
      citizen_name: "",
      citizen_email: "",
      phone: "",
      title: "",
      category: "",
      description: "",
      neighborhood: "",
    });
  };

  return (
    <section id="requerimento" className="py-20 md:py-28 bg-[#F8FAFC]">
      <div className="max-w-screen-xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0369A1]/10 text-[#0369A1] text-sm font-semibold mb-4">
            <i className="ri-file-list-3-line"></i>
            Participação Direta
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 leading-tight">
            Envie seu <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0369A1] to-[#0EA5E9]">Requerimento</span>
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Solicite obras, melhorias e serviços diretamente ao gabinete do Vereador Arthur Halal.
            Sem burocracia, sem cadastro.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-10 items-start max-w-6xl mx-auto">
          {/* Left info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
              <h3 className="text-gray-900 font-bold text-base">O que você pode solicitar?</h3>
              {[
                { icon: "ri-road-map-line", label: "Obras e Pavimentação", desc: "Recapeamento, calçadas, bueiros" },
                { icon: "ri-lightbulb-flash-line", label: "Iluminação Pública", desc: "Troca de lâmpadas, novos pontos" },
                { icon: "ri-hospital-line", label: "Saúde e Educação", desc: "UBS, creches, escolas" },
                { icon: "ri-tree-line", label: "Parques e Meio Ambiente", desc: "Praças, áreas verdes, limpeza" },
                { icon: "ri-shield-check-line", label: "Segurança Pública", desc: "Câmeras, policiamento, iluminação" },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] flex items-center justify-center shrink-0">
                    <i className={`${item.icon} text-[#0369A1] text-base`}></i>
                  </div>
                  <div>
                    <p className="text-gray-800 font-semibold text-sm">{item.label}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gradient-to-br from-[#0369A1] to-[#0EA5E9] rounded-2xl p-6 text-white">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-4">
                <i className="ri-time-line text-white text-lg"></i>
              </div>
              <h4 className="font-bold text-base mb-2">Prazo de resposta</h4>
              <p className="text-white/80 text-sm leading-relaxed">
                Todos os requerimentos são analisados em até <strong className="text-white">5 dias úteis</strong>.
                Demandas urgentes têm prioridade máxima.
              </p>
            </div>
          </div>

          {/* Right form */}
          <div className="lg:col-span-3">
            {success ? (
              <div className="bg-white rounded-3xl border border-green-100 p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
                  <i className="ri-checkbox-circle-fill text-green-500 text-3xl"></i>
                </div>
                <h3 className="text-gray-900 font-extrabold text-2xl mb-2">Requerimento enviado!</h3>
                <p className="text-gray-500 text-base mb-7 max-w-sm mx-auto">
                  Seu requerimento foi registrado. O gabinete de Arthur Halal irá analisar e
                  retornar o mais breve possível.
                </p>
                <button
                  onClick={() => setSuccess(false)}
                  className="px-8 py-3 bg-gradient-to-r from-[#0369A1] to-[#0EA5E9] text-white font-bold rounded-xl hover:scale-[1.02] transition-all cursor-pointer whitespace-nowrap"
                >
                  Enviar outro requerimento
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="bg-white rounded-3xl border border-gray-100 p-8 space-y-6"
              >
                {error && (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-center gap-2">
                    <i className="ri-error-warning-line shrink-0"></i>
                    {error}
                  </div>
                )}

                {/* Seus dados */}
                <div>
                  <p className="text-gray-800 font-bold text-sm mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 flex items-center justify-center bg-[#EFF6FF] rounded-lg">
                      <i className="ri-user-line text-[#0369A1] text-xs"></i>
                    </span>
                    Seus dados
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 text-xs font-semibold mb-1.5 uppercase tracking-wider">
                        Nome completo *
                      </label>
                      <input
                        name="citizen_name"
                        type="text"
                        value={form.citizen_name}
                        onChange={handleChange}
                        placeholder="Seu nome"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm placeholder:text-gray-400 focus:outline-none focus:border-[#0369A1] focus:bg-white transition-all"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-xs font-semibold mb-1.5 uppercase tracking-wider">
                        Telefone
                      </label>
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
                      <label className="block text-gray-700 text-xs font-semibold mb-1.5 uppercase tracking-wider">
                        E-mail
                      </label>
                      <input
                        name="citizen_email"
                        type="email"
                        value={form.citizen_email}
                        onChange={handleChange}
                        placeholder="seu@email.com"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm placeholder:text-gray-400 focus:outline-none focus:border-[#0369A1] focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-xs font-semibold mb-1.5 uppercase tracking-wider">
                        Bairro
                      </label>
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

                {/* Requerimento */}
                <div>
                  <p className="text-gray-800 font-bold text-sm mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 flex items-center justify-center bg-[#EFF6FF] rounded-lg">
                      <i className="ri-file-list-3-line text-[#0369A1] text-xs"></i>
                    </span>
                    Dados do requerimento
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-700 text-xs font-semibold mb-1.5 uppercase tracking-wider">
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
                    <div>
                      <label className="block text-gray-700 text-xs font-semibold mb-1.5 uppercase tracking-wider">
                        Categoria *
                      </label>
                      <select
                        name="category"
                        value={form.category}
                        onChange={handleChange}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:border-[#0369A1] focus:bg-white transition-all cursor-pointer"
                        required
                      >
                        <option value="">Selecione a categoria...</option>
                        {categories.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-700 text-xs font-semibold mb-1.5 uppercase tracking-wider">
                        Descrição detalhada *
                      </label>
                      <textarea
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        rows={4}
                        maxLength={500}
                        placeholder="Descreva em detalhes o que precisa ser feito, onde está o problema e qual impacto gera na sua comunidade..."
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
                  className="w-full py-4 bg-gradient-to-r from-[#0369A1] to-[#0EA5E9] text-white font-bold text-sm rounded-xl hover:scale-[1.01] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
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
        </div>
      </div>
    </section>
  );
}