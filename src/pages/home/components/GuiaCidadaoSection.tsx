import { useState } from "react";
import { Link } from "react-router-dom";

// Seção que explica ao cidadão leigo o que ele pode fazer no site,
// com foco em persuadir o cadastro (mas deixando claro que sem cadastro também dá)

export default function GuiaCidadaoSection() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <section className="py-16 md:py-20 bg-white relative z-10">
      <div className="max-w-screen-xl mx-auto px-4 md:px-8">

        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-[#1B2A5E] text-xs font-bold tracking-[0.30em] uppercase mb-3">
            GABINETE DIGITAL · ARTHUR HALAL
          </p>
          <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 leading-tight mb-4">
            Como posso{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1B2A5E] to-[#3BBFD4]">
              te ajudar?
            </span>
          </h2>
          <p className="text-gray-500 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            Este é o gabinete digital do vereador Arthur Halal. Aqui você pode resolver problemas do seu bairro, acompanhar o que o mandato está fazendo e muito mais — tudo de graça e sem burocracia.
          </p>
        </div>

        {/* Grid de funcionalidades */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">

          {/* BLOCO 1: Sem cadastro */}
          <div
            className="relative rounded-3xl p-7 overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)",
              border: "1.5px solid #E2E8F0",
            }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(232,160,32,0.12)" }}
              >
                <i className="ri-file-add-line text-2xl" style={{ color: "#E8A020" }}></i>
              </div>
              <div>
                <span
                  className="text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                  style={{ background: "rgba(232,160,32,0.15)", color: "#B87A10" }}
                >
                  Sem Cadastro
                </span>
                <h3 className="text-gray-900 font-extrabold text-xl mt-1">Envie um Requerimento agora</h3>
              </div>
            </div>

            <p className="text-gray-600 text-sm leading-relaxed mb-4">
              Não precisa criar conta. Você preenche o formulário com seu problema ou pedido, e nossa equipe entra em contato para dar retorno.
            </p>

            {/* Aviso importante */}
            <div
              className="rounded-xl p-4 mb-5 flex items-start gap-3"
              style={{
                background: "rgba(232,160,32,0.08)",
                border: "1px solid rgba(232,160,32,0.30)",
              }}
            >
              <i className="ri-information-line text-xl shrink-0 mt-0.5" style={{ color: "#E8A020" }}></i>
              <div>
                <p className="text-sm font-bold" style={{ color: "#B87A10" }}>
                  Atenção: deixe seus contatos corretos!
                </p>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  Informe um <strong>celular com WhatsApp</strong> e um <strong>e-mail válido</strong> que você usa. Nossa equipe vai entrar em contato por esses canais para dar um retorno sobre sua solicitação.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/requerimento"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:scale-105 cursor-pointer whitespace-nowrap"
                style={{ background: "#E8A020", color: "#0D1629" }}
              >
                <i className="ri-file-add-line"></i>
                Enviar Requerimento
              </Link>
              <Link
                to="/fale-conosco"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:scale-105 cursor-pointer whitespace-nowrap"
                style={{
                  background: "rgba(27,42,94,0.08)",
                  border: "1px solid rgba(27,42,94,0.15)",
                  color: "#1B2A5E",
                }}
              >
                <i className="ri-chat-3-line"></i>
                Fale Conosco
              </Link>
            </div>
          </div>

          {/* BLOCO 2: Com cadastro — destaque */}
          <div
            className="relative rounded-3xl p-7 overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #0D1629 0%, #1B2A5E 100%)",
              border: "1.5px solid rgba(59,191,212,0.25)",
            }}
          >
            {/* Badge destaque */}
            <div
              className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 rounded-full"
              style={{ background: "rgba(232,160,32,0.20)", border: "1px solid rgba(232,160,32,0.40)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block"></span>
              <span className="text-xs font-bold" style={{ color: "#E8A020" }}>Recomendado</span>
            </div>

            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(59,191,212,0.15)" }}
              >
                <i className="ri-user-add-line text-2xl" style={{ color: "#3BBFD4" }}></i>
              </div>
              <div>
                <span
                  className="text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                  style={{ background: "rgba(59,191,212,0.15)", color: "#3BBFD4" }}
                >
                  Com Cadastro Grátis
                </span>
                <h3 className="text-white font-extrabold text-xl mt-1">Acesse muito mais vantagens</h3>
              </div>
            </div>

            <p className="text-white/70 text-sm leading-relaxed mb-5">
              O cadastro é <strong className="text-white">rápido (menos de 2 minutos)</strong> e totalmente gratuito. Com ele você ganha acesso a recursos exclusivos que facilitam sua vida.
            </p>

            {/* Lista de vantagens */}
            <div className="space-y-2.5 mb-6">
              {[
                {
                  icon: "ri-eye-line",
                  title: "Acompanhe sua demanda em tempo real",
                  desc: "Veja cada atualização do seu requerimento: quem está cuidando, em qual etapa está e quando foi resolvido.",
                  color: "#3BBFD4",
                },
                {
                  icon: "ri-alarm-warning-line",
                  title: "Cobre a resposta quando quiser",
                  desc: "Com histórico completo, você tem controle e pode acompanhar de perto até que sua demanda seja atendida.",
                  color: "#E8A020",
                },
                {
                  icon: "ri-chat-3-line",
                  title: "Chat direto com a equipe do gabinete",
                  desc: "Converse em tempo real com um assessor do gabinete. Tire dúvidas, informe detalhes e receba orientações.",
                  color: "#3BBFD4",
                },
                {
                  icon: "ri-briefcase-4-line",
                  title: "Oportunidades de emprego em Pelotas",
                  desc: "Acesse vagas de emprego locais e candidate-se diretamente pela plataforma.",
                  color: "#E8A020",
                },
                {
                  icon: "ri-file-user-line",
                  title: "Monte ou faça upload do seu currículo",
                  desc: "Crie um currículo profissional direto no sistema ou envie o seu PDF para aparecer nas buscas das empresas.",
                  color: "#3BBFD4",
                },
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div
                    className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: `${item.color}20` }}
                  >
                    <i className={`${item.icon} text-sm`} style={{ color: item.color }}></i>
                  </div>
                  <div>
                    <p className="text-white text-xs font-bold leading-tight">{item.title}</p>
                    <p className="text-white/50 text-xs mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all hover:scale-105 cursor-pointer whitespace-nowrap"
                style={{ background: "#E8A020", color: "#0D1629" }}
              >
                <i className="ri-user-add-line"></i>
                Criar Conta Grátis
                <i className="ri-arrow-right-line"></i>
              </Link>
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all hover:scale-105 cursor-pointer whitespace-nowrap"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.80)",
                }}
              >
                <i className="ri-login-circle-line"></i>
                Já tenho conta
              </Link>
            </div>
          </div>
        </div>

        {/* Cards de serviços rápidos */}
        <div>
          <p className="text-center text-xs font-bold tracking-widest uppercase text-gray-400 mb-6">
            OUTROS SERVIÇOS DO GABINETE
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                icon: "ri-lightbulb-line",
                title: "Sugestão de Projeto",
                desc: "Propose uma ideia para melhorar Pelotas",
                href: "/sugestao-projeto",
                color: "#E8A020",
              },
              {
                icon: "ri-newspaper-line",
                title: "Notícias do Mandato",
                desc: "Acompanhe o que Arthur está fazendo",
                href: "/noticias",
                color: "#3BBFD4",
              },
              {
                icon: "ri-briefcase-4-line",
                title: "Empregos em Pelotas",
                desc: "Vagas publicadas por empresas locais",
                href: "/sistema",
                color: "#1B2A5E",
              },
              {
                icon: "ri-phone-line",
                title: "Fale Conosco",
                desc: "Entre em contato com o gabinete",
                href: "/fale-conosco",
                color: "#E8A020",
              },
            ].map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="group flex flex-col gap-3 p-5 rounded-2xl cursor-pointer transition-all hover:scale-[1.02]"
                style={{
                  background: "#F8FAFC",
                  border: "1.5px solid #E2E8F0",
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${item.color}15` }}
                >
                  <i className={`${item.icon} text-xl`} style={{ color: item.color }}></i>
                </div>
                <div>
                  <p className="text-gray-900 font-bold text-sm leading-tight">{item.title}</p>
                  <p className="text-gray-500 text-xs mt-1 leading-relaxed">{item.desc}</p>
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: item.color }}>
                  Acessar
                  <i className="ri-arrow-right-line group-hover:translate-x-1 transition-transform"></i>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}