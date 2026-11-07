import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { getStoredUser } from "@/hooks/useAuth";
import Navbar from "@/components/feature/Navbar";
import Footer from "@/components/feature/Footer";
import FloatingButtons from "@/components/feature/FloatingButtons";
import { notificarRelevantes, criarNotificacao } from "@/hooks/useNotifications";

const FORM_URL = "https://readdy.ai/api/form/d8gt7p0b91vaa813dsdg";

const areas = [
  "Saúde",
  "Educação",
  "Tecnologia / Inovação",
  "Segurança",
  "Emprego e Renda",
  "Meio Ambiente",
  "Cultura e Lazer",
  "Transporte",
  "Habitação",
  "Inclusão Social",
  "Outros",
];

const proposalTypes = [
  {
    icon: "ri-file-list-3-line",
    title: "Requerimento",
    color: "#0369A1",
    bg: "#EFF6FF",
    border: "#DBEAFE",
    description:
      "Solicita informações, documentos ou providências ao Poder Executivo Municipal. É a ferramenta mais usada pelo vereador para atender demandas dos moradores do bairro — reparos de vias, iluminação, limpeza pública, entre outros.",
    examples: [
      "Recapeamento de rua ou avenida",
      "Conserto de iluminação pública",
      "Informações sobre obras paralisadas",
      "Melhorias em praças e parques",
    ],
  },
  {
    icon: "ri-mail-send-line",
    title: "Indicação",
    color: "#0369A1",
    bg: "#F0F9FF",
    border: "#BAE6FD",
    description:
      "Sugere ao Executivo que tome determinada providência ou realize uma ação. Diferente do Requerimento, não exige resposta formal — é uma recomendação legislativa.",
    examples: [
      "Indicar implantação de ciclofaixa",
      "Sugerir criação de unidade de saúde",
      "Recomendar melhorias em escolas",
    ],
  },
  {
    icon: "ri-scales-3-line",
    title: "Projeto de Lei Ordinária",
    color: "#0369A1",
    bg: "#F0FDF4",
    border: "#BBF7D0",
    description:
      "Propõe a criação, alteração ou revogação de leis municipais. Precisa ser aprovado pela maioria da Câmara. É o instrumento mais impactante para mudanças estruturais.",
    examples: [
      "Criar programa de desconto em transporte para idosos",
      "Regulamentar feiras livres do bairro",
      "Instituir data comemorativa municipal",
    ],
  },
  {
    icon: "ri-government-line",
    title: "Moção",
    color: "#0369A1",
    bg: "#FFFBEB",
    border: "#FDE68A",
    description:
      "Manifesta a posição da Câmara sobre algum fato ou assunto de interesse público. Pode ser de aplausos, congratulações, pesar ou repúdio.",
    examples: [
      "Moção de apoio a projeto federal",
      "Moção de pesar por falecimento",
      "Moção de repúdio a ato público",
    ],
  },
  {
    icon: "ri-draft-line",
    title: "Decreto Legislativo",
    color: "#0369A1",
    bg: "#FFF7ED",
    border: "#FED7AA",
    description:
      "Trata de assuntos de competência exclusiva da Câmara Municipal — como homenagens, concessão de títulos honorários e aprovação de contas.",
    examples: [
      "Conceder título de Cidadão Pelotense",
      "Reconhecer entidade de utilidade pública",
    ],
  },
];

export default function SugestaoProjetoPage() {
  const formRef = useRef<HTMLDivElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [loggedUser, setLoggedUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [form, setForm] = useState({
    citizen_name: "",
    citizen_email: "",
    phone: "",
    title: "",
    area: "",
    description: "",
    impact: "",
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

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.citizen_name.trim()) { setError("Informe seu nome."); return; }
    if (!form.title.trim()) { setError("Informe o título da sugestão."); return; }
    if (!form.area) { setError("Selecione uma área."); return; }
    if (form.description.length < 50) {
      setError("Descreva a sugestão com mais detalhes (mínimo 50 caracteres).");
      return;
    }

    setSubmitting(true);
    setError("");

    const fullDesc =
      form.description.trim() + (form.impact.trim() ? `\n\nImpacto esperado: ${form.impact.trim()}` : "");

    try {
      // 1. Salvar no Supabase
      const { data: inserted, error: dbErr } = await supabase.from("demands").insert({
        citizen_id: loggedUser?.id ?? null,
        citizen_name: form.citizen_name.trim(),
        citizen_email: form.citizen_email.trim() || null,
        citizen_phone: form.phone.trim() || null,
        type: "sugestao",
        category: form.area,
        title: form.title.trim(),
        description: fullDesc,
        status: "aberto",
      }).select("id");

      if (dbErr) {
        setError("Erro ao enviar. Tente novamente.");
        setSubmitting(false);
        return;
      }

      // Notificar admin/vereador/assessor sobre nova sugestão de projeto
      const demandId = inserted && inserted.length > 0 ? String((inserted[0] as { id: number }).id) : null;
      await notificarRelevantes(
        "demanda",
        "Nova sugestão de projeto",
        `"${form.title.trim()}" (${form.area}) enviado por ${form.citizen_name.trim()}.`,
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
          "Sugestão de projeto recebida",
          `Sua sugestão "${form.title.trim()}" foi recebida e será analisada pelo gabinete do Vereador Arthur Halal.`,
          loggedUser.id,
          loggedUser.name,
          demandId ?? "",
          "demanda"
        );
      }

      // 2. Enviar ao Readdy
      const body = new URLSearchParams({
        nome: form.citizen_name.trim(),
        email: form.citizen_email.trim(),
        telefone: form.phone.trim(),
        area: form.area,
        titulo: form.title.trim(),
        descricao: form.description.trim(),
        impacto: form.impact.trim(),
      });
      fetch(FORM_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      }).catch(() => {});

      setSuccess(true);
      setForm({
        citizen_name: loggedUser?.name ?? "",
        citizen_email: loggedUser?.email ?? "",
        phone: "",
        title: "",
        area: "",
        description: "",
        impact: "",
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
        <div className="max-w-4xl mx-auto px-4 md:px-8">

          {/* Breadcrumb + Header */}
          <div className="mb-12">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-5">
              <Link to="/" className="hover:text-[#0369A1] transition-colors">Início</Link>
              <i className="ri-arrow-right-s-line text-gray-300"></i>
              <span className="text-[#0369A1] font-medium">Requerimento &amp; Projeto</span>
            </div>
            <h1 className="text-4xl font-extrabold text-gray-900 mb-3 leading-tight">
              Como o vereador pode ajudar?
            </h1>
            <p className="text-gray-500 text-lg leading-relaxed max-w-2xl">
              Entenda os tipos de propostas que o Vereador Arthur Halal pode apresentar e escolha
              o canal certo para a sua necessidade.
            </p>
            <div className="h-1 w-20 rounded-full bg-gradient-to-r from-[#0369A1] to-[#0EA5E9] mt-5"></div>
          </div>

          {/* Decision banner */}
          <div className="grid md:grid-cols-2 gap-5 mb-14">
            {/* Requerimento CTA */}
            <div className="relative overflow-hidden rounded-3xl p-8 flex flex-col justify-between" style={{ background: "linear-gradient(135deg, #0369A1 0%, #0EA5E9 100%)" }}>
              <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10" style={{ background: "white", transform: "translate(30%, -30%)" }}></div>
              <div>
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
                  <span className="w-6 h-6 flex items-center justify-center">
                    <i className="ri-file-list-3-line text-white text-2xl"></i>
                  </span>
                </div>
                <h2 className="text-white font-extrabold text-xl mb-2">Quero um Requerimento</h2>
                <p className="text-white/80 text-sm leading-relaxed">
                  Problema no bairro, serviço público deficiente, obra necessária? O Requerimento é
                  o caminho para solicitar ação direta ao Executivo Municipal.
                </p>
              </div>
              <Link
                to="/requerimento"
                className="mt-6 inline-flex items-center gap-2 bg-white text-[#0369A1] font-bold text-sm px-6 py-3 rounded-xl hover:bg-white/90 transition-all whitespace-nowrap self-start"
              >
                <i className="ri-arrow-right-circle-line"></i>
                Enviar Requerimento
              </Link>
            </div>

            {/* Projeto CTA */}
            <div className="relative overflow-hidden rounded-3xl p-8 flex flex-col justify-between bg-white border border-gray-100">
              <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-5" style={{ background: "#0369A1", transform: "translate(30%, -30%)" }}></div>
              <div>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: "#EFF6FF" }}>
                  <span className="w-6 h-6 flex items-center justify-center">
                    <i className="ri-lightbulb-flash-line text-[#0369A1] text-2xl"></i>
                  </span>
                </div>
                <h2 className="text-gray-900 font-extrabold text-xl mb-2">Quero sugerir um Projeto</h2>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Tem uma ideia transformadora para Pelotas? Sugira projetos de lei, moções ou
                  indicações para o vereador analisar e apresentar na Câmara.
                </p>
              </div>
              <button
                onClick={scrollToForm}
                className="mt-6 inline-flex items-center gap-2 bg-[#EFF6FF] text-[#0369A1] font-bold text-sm px-6 py-3 rounded-xl hover:bg-[#DBEAFE] transition-all whitespace-nowrap self-start cursor-pointer"
              >
                <i className="ri-arrow-down-line"></i>
                Ver formulário
              </button>
            </div>
          </div>

          {/* Types of proposals */}
          <section className="mb-16">
            <div className="mb-8">
              <p className="text-[#0369A1] text-sm font-bold uppercase tracking-widest mb-2">
                Conheça os instrumentos legislativos
              </p>
              <h2 className="text-2xl font-extrabold text-gray-900">
                O que um Vereador pode propor?
              </h2>
              <p className="text-gray-500 text-sm mt-2 max-w-2xl">
                A Câmara Municipal tem diferentes ferramentas legislativas. Entenda cada uma para
                saber como Arthur Halal pode atuar no seu interesse.
              </p>
            </div>

            <div className="space-y-4">
              {proposalTypes.map((pt) => (
                <div
                  key={pt.title}
                  className="bg-white rounded-2xl border p-6 hover:border-[#0369A1]/20 transition-all"
                  style={{ borderColor: pt.border }}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: pt.bg }}
                    >
                      <span className="w-6 h-6 flex items-center justify-center">
                        <i className={`${pt.icon} text-xl`} style={{ color: pt.color }}></i>
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-gray-900 font-extrabold text-base mb-1">{pt.title}</h3>
                      <p className="text-gray-500 text-sm leading-relaxed mb-3">{pt.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {pt.examples.map((ex) => (
                          <span
                            key={ex}
                            className="text-xs font-medium px-3 py-1 rounded-full"
                            style={{ background: pt.bg, color: pt.color }}
                          >
                            {ex}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Decision helper */}
          <section className="mb-16">
            <div
              className="rounded-3xl p-8 border"
              style={{ background: "#FFFBEB", borderColor: "#FDE68A" }}
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <span className="w-5 h-5 flex items-center justify-center">
                    <i className="ri-question-line text-amber-600 text-lg"></i>
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="text-gray-900 font-extrabold text-lg mb-2">
                    Ainda tem dúvida sobre qual usar?
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed mb-5">
                    Use a regra simples: se você quer resolver um <strong>problema no seu
                    bairro</strong> (buraco na rua, iluminação, lixo, saúde), use o{" "}
                    <strong>Requerimento</strong>. Se você tem uma <strong>ideia nova</strong> que
                    poderia virar lei ou ação do mandato, use a{" "}
                    <strong>Sugestão de Projeto</strong> abaixo.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      to="/requerimento"
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#0369A1] to-[#0EA5E9] text-white font-bold text-sm rounded-xl whitespace-nowrap hover:scale-[1.02] transition-all"
                    >
                      <i className="ri-file-list-3-line"></i>
                      Ir para Requerimento
                    </Link>
                    <button
                      onClick={scrollToForm}
                      className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 font-bold text-sm rounded-xl border border-gray-200 whitespace-nowrap hover:bg-gray-50 transition-all cursor-pointer"
                    >
                      <i className="ri-lightbulb-line"></i>
                      Sugerir um Projeto
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Project form */}
          <section ref={formRef}>
            <div className="mb-8">
              <p className="text-[#0369A1] text-sm font-bold uppercase tracking-widest mb-2">
                Formulário de sugestão
              </p>
              <h2 className="text-2xl font-extrabold text-gray-900">Enviar Sugestão de Projeto</h2>
              <p className="text-gray-500 text-sm mt-2">
                Preencha abaixo com sua ideia. O gabinete irá analisar e, se aprovada, pode se
                tornar um projeto real na Câmara Municipal.
              </p>
            </div>

            {/* Banner cidadão logado */}
          {loggedUser && (
            <div className="mb-6 p-4 rounded-2xl bg-green-50 border border-green-200 flex items-center gap-3">
              <span className="w-8 h-8 flex items-center justify-center rounded-full bg-green-100 shrink-0">
                <i className="ri-user-smile-line text-green-600 text-base"></i>
              </span>
              <div>
                <p className="text-green-800 font-bold text-sm">Você está logado como {loggedUser.name}</p>
                <p className="text-green-600 text-xs mt-0.5">Seus dados já foram preenchidos automaticamente.</p>
              </div>
            </div>
          )}

          {success ? (
              <div className="bg-white rounded-3xl border border-green-100 p-10 text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
                  <span className="w-8 h-8 flex items-center justify-center">
                    <i className="ri-lightbulb-fill text-green-500 text-3xl"></i>
                  </span>
                </div>
                <h3 className="text-gray-900 font-extrabold text-2xl mb-2">
                  Sugestão enviada com sucesso!
                </h3>
                <p className="text-gray-500 text-base mb-7">
                  Obrigado por contribuir! Arthur Halal e sua equipe irão analisar sua sugestão
                  com cuidado.
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
                    Enviar Outra
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

                {/* Personal data */}
                <div>
                  <h3 className="text-gray-800 font-bold text-base mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 flex items-center justify-center bg-[#EFF6FF] rounded-lg">
                      <i className="ri-user-line text-[#0369A1] text-sm"></i>
                    </span>
                    Seus dados
                    {loggedUser && <span className="text-xs font-normal text-green-600 ml-1">(preenchido automaticamente)</span>}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-gray-700 text-sm font-semibold mb-1.5">Nome completo *</label>
                      <input
                        name="citizen_name"
                        type="text"
                        value={form.citizen_name}
                        onChange={handleChange}
                        placeholder="Seu nome completo"
                        disabled={!!loggedUser}
                        className={`w-full border rounded-xl px-4 py-3 text-gray-800 text-sm placeholder:text-gray-400 focus:outline-none focus:border-[#0369A1] transition-all ${loggedUser ? "bg-gray-100 cursor-not-allowed text-gray-500" : "bg-gray-50 border-gray-200 focus:bg-white"}`}
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
                    <div className="md:col-span-2">
                      <label className="block text-gray-700 text-sm font-semibold mb-1.5">E-mail</label>
                      <input
                        name="citizen_email"
                        type="email"
                        value={form.citizen_email}
                        onChange={handleChange}
                        placeholder="seu@email.com"
                        disabled={!!loggedUser}
                        className={`w-full border rounded-xl px-4 py-3 text-gray-800 text-sm placeholder:text-gray-400 focus:outline-none focus:border-[#0369A1] transition-all ${loggedUser ? "bg-gray-100 cursor-not-allowed text-gray-500" : "bg-gray-50 border-gray-200 focus:bg-white"}`}
                      />
                    </div>
                  </div>
                </div>

                {/* Suggestion data */}
                <div>
                  <h3 className="text-gray-800 font-bold text-base mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 flex items-center justify-center bg-[#EFF6FF] rounded-lg">
                      <i className="ri-lightbulb-flash-line text-[#0369A1] text-sm"></i>
                    </span>
                    Sua sugestão
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="md:col-span-2">
                      <label className="block text-gray-700 text-sm font-semibold mb-1.5">
                        Título da Sugestão *
                      </label>
                      <input
                        name="title"
                        type="text"
                        value={form.title}
                        onChange={handleChange}
                        placeholder="Ex: Criação de pista de ciclismo no Parque da Baronesa"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm placeholder:text-gray-400 focus:outline-none focus:border-[#0369A1] focus:bg-white transition-all"
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-gray-700 text-sm font-semibold mb-1.5">
                        Área / Tema *
                      </label>
                      <select
                        name="area"
                        value={form.area}
                        onChange={handleChange}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:border-[#0369A1] focus:bg-white transition-all cursor-pointer"
                        required
                      >
                        <option value="">Selecione a área...</option>
                        {areas.map((a) => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-gray-700 text-sm font-semibold mb-1.5">
                        Descrição da Sugestão *
                      </label>
                      <textarea
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        rows={5}
                        maxLength={500}
                        placeholder="Descreva sua sugestão detalhadamente. O que você propõe? Como funcionaria? Quem se beneficiaria?"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm placeholder:text-gray-400 focus:outline-none focus:border-[#0369A1] focus:bg-white transition-all resize-none"
                        required
                      />
                      <p className="text-gray-400 text-xs mt-1 text-right">
                        {form.description.length}/500
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-gray-700 text-sm font-semibold mb-1.5">
                        Impacto esperado (opcional)
                      </label>
                      <textarea
                        name="impact"
                        value={form.impact}
                        onChange={handleChange}
                        rows={3}
                        maxLength={300}
                        placeholder="Quais seriam os benefícios para a população de Pelotas?"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm placeholder:text-gray-400 focus:outline-none focus:border-[#0369A1] focus:bg-white transition-all resize-none"
                      />
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
                      <i className="ri-lightbulb-flash-line"></i>
                      Enviar Sugestão de Projeto
                    </span>
                  )}
                </button>
              </form>
            )}
          </section>
        </div>
      </main>

      <Footer />
      <FloatingButtons />
    </div>
  );
}