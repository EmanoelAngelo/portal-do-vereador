import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getStoredUser } from "@/hooks/useAuth";
import Navbar from "@/components/feature/Navbar";
import Footer from "@/components/feature/Footer";
import FloatingButtons from "@/components/feature/FloatingButtons";

const AREAS = ["Administrativo", "Tecnologia", "Saúde", "Educação", "Construção Civil", "Alimentação", "Logística", "Varejo", "Serviços Gerais"];

export default function SistemaPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const user = getStoredUser();
    if (user) {
      if (user.role === "citizen") navigate("/cidadao");
      else if (user.role === "empresa") navigate("/sistema/painel/empresa");
      else if (user.role === "admin") navigate("/admin");
      else if (user.role === "vereador") navigate("/vereador");
      else if (user.role === "assessor") navigate("/assessor/painel");
    }
  }, [navigate]);

  return (
    <div className="min-h-screen" style={{ background: "#0D1629" }}>
      <Navbar />

      {/* Hero */}
      <section className="relative pt-28 pb-16 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #3BBFD4 0%, transparent 70%)" }}></div>
          <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #E8A020 0%, transparent 70%)" }}></div>
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)", backgroundSize: "40px 40px" }}></div>
        </div>

        <div className="relative max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6" style={{ background: "rgba(232,160,32,0.15)", border: "1px solid rgba(232,160,32,0.30)" }}>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#E8A020" }}></span>
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#E8A020" }}>Geração de Renda · Pelotas</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-5 leading-tight">
              Sistema de<br />
              <span style={{ color: "#3BBFD4" }}>Oportunidades</span>
            </h1>
            <p className="text-white/50 text-lg mb-8">
              Conectando cidadãos pelotenses com as melhores oportunidades de emprego. Uma iniciativa do vereador Arthur Halal.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/auth?from=/sistema/painel/cidadao"
                className="flex items-center justify-center gap-2 px-5 md:px-7 py-4 rounded-2xl text-[#0D1629] font-bold text-sm md:text-base transition-all cursor-pointer whitespace-nowrap"
                style={{ background: "linear-gradient(135deg, #E8A020, #f5b94a)" }}
              >
                <i className="ri-user-line"></i>
                Sou Cidadão — Entrar
              </Link>
              <Link
                to="/auth?from=/sistema/painel/empresa"
                className="flex items-center justify-center gap-2 px-7 py-4 rounded-2xl font-bold text-base transition-all cursor-pointer whitespace-nowrap"
                style={{ background: "rgba(59,191,212,0.15)", border: "1px solid rgba(59,191,212,0.35)", color: "#3BBFD4" }}
              >
                <i className="ri-building-line"></i>
                Sou Empresa — Entrar
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Áreas de atuação */}
      <section className="py-12" style={{ background: "rgba(255,255,255,0.02)" }}>
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-extrabold text-white mb-2">Principais Áreas de Atuação</h2>
            <p className="text-white/40 text-sm">Vagas disponíveis em diversas categorias em Pelotas</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {AREAS.map((area) => (
              <div key={area} className="px-5 py-2.5 rounded-full text-sm font-semibold cursor-default" style={{ background: "rgba(59,191,212,0.12)", border: "1px solid rgba(59,191,212,0.25)", color: "#3BBFD4" }}>
                {area}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="py-14">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-white mb-3">Como Funciona</h2>
            <p className="text-white/40">Simples, rápido e gratuito</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Para Cidadão */}
            <div className="p-7 rounded-3xl" style={{ background: "rgba(232,160,32,0.08)", border: "1px solid rgba(232,160,32,0.20)" }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ background: "rgba(232,160,32,0.20)" }}>
                <i className="ri-user-line text-xl" style={{ color: "#E8A020" }}></i>
              </div>
              <h3 className="text-white font-extrabold text-xl mb-4">Para Cidadãos</h3>
              <div className="space-y-3">
                {["Crie sua conta gratuitamente", "Complete seu perfil e currículo", "Navegue pelas vagas disponíveis", "Candidate-se com um clique", "Acompanhe o status das candidaturas"].map((step, i) => (
                  <div key={step} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5" style={{ background: "rgba(232,160,32,0.25)", color: "#E8A020" }}>{i + 1}</span>
                    <p className="text-white/65 text-sm">{step}</p>
                  </div>
                ))}
              </div>
              <Link to="/auth?from=/sistema/painel/cidadao" className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-xl font-bold text-sm cursor-pointer whitespace-nowrap" style={{ background: "linear-gradient(135deg, #E8A020, #f5b94a)", color: "#0D1629" }}>
                Começar como Cidadão <i className="ri-arrow-right-line"></i>
              </Link>
            </div>

            {/* Para Empresa */}
            <div className="p-7 rounded-3xl" style={{ background: "rgba(59,191,212,0.08)", border: "1px solid rgba(59,191,212,0.20)" }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ background: "rgba(59,191,212,0.20)" }}>
                <i className="ri-building-line text-xl" style={{ color: "#3BBFD4" }}></i>
              </div>
              <h3 className="text-white font-extrabold text-xl mb-4">Para Empresas</h3>
              <div className="space-y-3">
                {["Cadastre sua empresa no sistema", "Publique vagas em minutos", "Acesse banco de currículos", "Filtre candidatos por perfil", "Entre em contato com os melhores talentos"].map((step, i) => (
                  <div key={step} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5" style={{ background: "rgba(59,191,212,0.25)", color: "#3BBFD4" }}>{i + 1}</span>
                    <p className="text-white/65 text-sm">{step}</p>
                  </div>
                ))}
              </div>
              <Link to="/auth?from=/sistema/painel/empresa" className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-xl font-bold text-sm cursor-pointer whitespace-nowrap" style={{ background: "rgba(59,191,212,0.20)", border: "1px solid rgba(59,191,212,0.40)", color: "#3BBFD4" }}>
                Começar como Empresa <i className="ri-arrow-right-line"></i>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* O QUE É O SISTEMA - Seção explicativa */}
      <section className="py-20" style={{ background: "rgba(27,42,94,0.25)" }}>
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-5" style={{ background: "rgba(59,191,212,0.12)", border: "1px solid rgba(59,191,212,0.25)" }}>
              <i className="ri-question-line text-sm" style={{ color: "#3BBFD4" }}></i>
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#3BBFD4" }}>Entenda o Sistema</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">O que é o Sistema de Oportunidades?</h2>
            <p className="text-white/45 text-lg max-w-2xl mx-auto leading-relaxed">
              Uma plataforma pública, gratuita e local, criada pelo vereador <strong className="text-white/70">Arthur Halal</strong> para conectar
              cidadãos pelotenses às oportunidades de emprego oferecidas pelas empresas da região.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-14">
            {/* Card Cidadão */}
            <div className="rounded-3xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(232,160,32,0.20)" }}>
              <div className="p-6 border-b flex items-center gap-4" style={{ borderColor: "rgba(232,160,32,0.15)", background: "rgba(232,160,32,0.06)" }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "rgba(232,160,32,0.20)" }}>
                  <i className="ri-user-heart-line text-2xl" style={{ color: "#E8A020" }}></i>
                </div>
                <div>
                  <h3 className="text-white font-extrabold text-xl">Para Cidadãos</h3>
                  <p className="text-white/40 text-sm">Quem está buscando emprego</p>
                </div>
              </div>
              <div className="p-6">
                <p className="text-white/55 text-sm leading-relaxed mb-5">
                  Se você é morador de Pelotas e está em busca de uma oportunidade de emprego, este espaço foi feito para você.
                  Após criar sua conta, você terá acesso ao <strong className="text-white/75">Feed de Vagas</strong> — um mural coletivo e atualizado
                  em tempo real com todas as vagas postadas pelas empresas cadastradas na plataforma.
                </p>
                <div className="space-y-3 mb-6">
                  {[
                    { icon: "ri-newspaper-line", color: "#E8A020", title: "Feed de Vagas Compartilhado", desc: "Veja todas as vagas publicadas por todas as empresas em tempo real" },
                    { icon: "ri-filter-3-line", color: "#3BBFD4", title: "Filtros por Área e Tipo", desc: "Filtre vagas por área de atuação e tipo de contrato (CLT, PJ, Estágio...)" },
                    { icon: "ri-cursor-line", color: "#22C55E", title: "Candidatura com 1 clique", desc: "Se candidate diretamente e acompanhe o status das suas inscrições" },
                    { icon: "ri-file-user-line", color: "#E8A020", title: "Perfil e Currículo", desc: "Monte seu perfil profissional e adicione o link do seu currículo em PDF" },
                  ].map((item) => (
                    <div key={item.title} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${item.color}18` }}>
                        <i className={`${item.icon} text-sm`} style={{ color: item.color }}></i>
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm">{item.title}</p>
                        <p className="text-white/40 text-xs leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Link
                  to="/auth?from=/sistema/painel/cidadao"
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-sm cursor-pointer whitespace-nowrap"
                  style={{ background: "linear-gradient(135deg, #E8A020, #f5b94a)", color: "#0D1629" }}
                >
                  <i className="ri-user-add-line"></i> Criar conta como Cidadão
                </Link>
              </div>
            </div>

            {/* Card Empresa */}
            <div className="rounded-3xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(59,191,212,0.20)" }}>
              <div className="p-6 border-b flex items-center gap-4" style={{ borderColor: "rgba(59,191,212,0.15)", background: "rgba(59,191,212,0.06)" }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "rgba(59,191,212,0.20)" }}>
                  <i className="ri-building-4-line text-2xl" style={{ color: "#3BBFD4" }}></i>
                </div>
                <div>
                  <h3 className="text-white font-extrabold text-xl">Para Empresas</h3>
                  <p className="text-white/40 text-sm">Quem está contratando talentos</p>
                </div>
              </div>
              <div className="p-6">
                <p className="text-white/55 text-sm leading-relaxed mb-5">
                  Se a sua empresa está com vagas abertas, aqui é o lugar certo para encontrar os melhores talentos de Pelotas.
                  Após se cadastrar, você poderá <strong className="text-white/75">publicar anúncios de vagas</strong> que aparecem imediatamente
                  no feed de todos os cidadãos, e acessar o banco completo de currículos.
                </p>
                <div className="space-y-3 mb-6">
                  {[
                    { icon: "ri-megaphone-line", color: "#3BBFD4", title: "Criar Anúncios de Vagas", desc: "Publique vagas e gerencie-as: ative, pause ou encerre quando quiser" },
                    { icon: "ri-group-line", color: "#E8A020", title: "Banco de Currículos", desc: "Acesse perfis de todos os cidadãos cadastrados na plataforma" },
                    { icon: "ri-search-2-line", color: "#22C55E", title: "Filtros Avançados", desc: "Filtre candidatos por competência, formação, tipo de vaga e área de atuação" },
                    { icon: "ri-file-pdf-line", color: "#3BBFD4", title: "Acesso ao Currículo PDF", desc: "Visualize o currículo completo dos candidatos com um clique" },
                  ].map((item) => (
                    <div key={item.title} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${item.color}18` }}>
                        <i className={`${item.icon} text-sm`} style={{ color: item.color }}></i>
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm">{item.title}</p>
                        <p className="text-white/40 text-xs leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Link
                  to="/auth?from=/sistema/painel/empresa"
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-sm cursor-pointer whitespace-nowrap"
                  style={{ background: "rgba(59,191,212,0.20)", border: "1px solid rgba(59,191,212,0.40)", color: "#3BBFD4" }}
                >
                  <i className="ri-building-line"></i> Cadastrar minha Empresa
                </Link>
              </div>
            </div>
          </div>

          {/* FAQ rápido */}
          <div className="max-w-3xl mx-auto">
            <h3 className="text-white font-extrabold text-xl mb-6 text-center">Perguntas Frequentes</h3>
            <div className="space-y-3">
              {[
                { q: "O sistema é gratuito?", a: "Sim! Tanto para cidadãos quanto para empresas, o acesso é 100% gratuito. É uma iniciativa do vereador Arthur Halal para gerar renda em Pelotas." },
                { q: "Preciso morar em Pelotas para me cadastrar?", a: "O sistema foi criado com foco em Pelotas e região. Empresas e cidadãos de cidades vizinhas também podem utilizar." },
                { q: "As vagas ficam visíveis para todos os cidadãos?", a: "Sim! Quando uma empresa publica uma nova vaga, ela aparece imediatamente no Feed de Vagas de todos os cidadãos logados no sistema." },
                { q: "Como as empresas encontram meu currículo?", a: "Ao completar seu perfil e adicionar o link do seu currículo, as empresas poderão visualizá-lo ao buscar candidatos no banco de talentos da plataforma." },
              ].map((item, i) => (
                <div key={i} className="p-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <p className="text-white font-bold text-sm mb-1.5 flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5" style={{ background: "rgba(232,160,32,0.25)", color: "#E8A020" }}>?</span>
                    {item.q}
                  </p>
                  <p className="text-white/45 text-sm leading-relaxed pl-7">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-16">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="text-center p-10 rounded-3xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h2 className="text-3xl font-extrabold text-white mb-3">Pronto para começar?</h2>
            <p className="text-white/45 mb-8">Junte-se a centenas de pelotenses que já utilizam o sistema.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/auth?from=/sistema/painel/cidadao" className="px-8 py-4 rounded-2xl text-[#0D1629] font-bold cursor-pointer whitespace-nowrap" style={{ background: "linear-gradient(135deg, #E8A020, #f5b94a)" }}>
                Cadastrar como Cidadão
              </Link>
              <Link to="/auth?from=/sistema/painel/empresa" className="px-8 py-4 rounded-2xl font-bold cursor-pointer whitespace-nowrap" style={{ background: "rgba(255,255,255,0.08)", color: "white", border: "1px solid rgba(255,255,255,0.15)" }}>
                Cadastrar Empresa
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <FloatingButtons />
    </div>
  );
}