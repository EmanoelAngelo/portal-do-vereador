import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { mockNews, newsCategories } from "@/mocks/news";

const CORES = {
  fundo: "#0D1629",
  dourado: "#E8A020",
  teal: "#3BBFD4",
  navy: "#1B2A5E",
  verde: "#22C55E",
  vermelho: "#EF4444",
  roxo: "#7C3AED",
  laranja: "#F97316",
  cardBg: "rgba(255,255,255,0.04)",
  borderCard: "rgba(255,255,255,0.08)",
};

const secoes = [
  { id: "intro", icone: "ri-home-line", titulo: "Introdução" },
  { id: "problema", icone: "ri-question-line", titulo: "O Problema" },
  { id: "mapa-site", icone: "ri-map-2-line", titulo: "Mapa do Site" },
  { id: "arquitetura", icone: "ri-database-2-line", titulo: "Arquitetura" },
  { id: "perfis", icone: "ri-group-line", titulo: "Perfis de Usuário" },
  { id: "logins", icone: "ri-key-line", titulo: "Logins de Teste" },
  { id: "home", icone: "ri-home-2-line", titulo: "Site Público" },
  { id: "cidadao", icone: "ri-user-line", titulo: "Painel do Cidadão" },
  { id: "cidadao-vagas", icone: "ri-briefcase-4-line", titulo: "Cidadão · Vagas" },
  { id: "vereador", icone: "ri-government-line", titulo: "Painel do Vereador" },
  { id: "assessor", icone: "ri-shield-user-line", titulo: "Painel do Assessor" },
  { id: "empresa", icone: "ri-building-line", titulo: "Painel da Empresa" },
  { id: "admin", icone: "ri-shield-line", titulo: "Painel Admin" },
  { id: "oportunidades", icone: "ri-rocket-line", titulo: "Sist. Oportunidades" },
  { id: "noticias-mandato", icone: "ri-newspaper-line", titulo: "Notícias" },
  { id: "curriculo", icone: "ri-file-user-line", titulo: "Currículo" },
  { id: "kanban-guia", icone: "ri-layout-column-line", titulo: "Guia do Kanban" },
  { id: "metodologia", icone: "ri-flow-chart", titulo: "Metodologia" },
  { id: "tour", icone: "ri-compass-3-line", titulo: "Tour Guiado" },
  { id: "chat", icone: "ri-chat-3-line", titulo: "Chat em Tempo Real" },
  { id: "exportacao", icone: "ri-printer-line", titulo: "Exportação" },
];

export default function DocumentacaoPage() {
  const [active, setActive] = useState("intro");
  const [showPrintBtn, setShowPrintBtn] = useState(false);

  useEffect(() => {
    setShowPrintBtn(true);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen flex" style={{ background: CORES.fundo }}>
      {/* ========== SIDEBAR ========== */}
      <aside className="hidden xl:block w-64 shrink-0 sticky top-0 h-screen overflow-y-auto border-r print:hidden" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(27,42,94,0.15)" }}>
        <div className="p-5 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: CORES.dourado }}>
              <i className="ri-book-open-line text-base" style={{ color: CORES.fundo }}></i>
            </div>
            <div>
              <p className="text-white font-extrabold text-sm leading-tight">Gabinete Virtual</p>
              <p className="text-xs" style={{ color: CORES.dourado }}>Documentação Completa</p>
            </div>
          </div>
          <p className="text-white/30 text-xs">Vereador Arthur Halal · Pelotas/RS</p>
        </div>
        <nav className="p-3 space-y-0.5">
          {secoes.map((s) => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap text-left ${
                active === s.id ? "text-white" : "text-white/35 hover:text-white/60"
              }`}
              style={active === s.id ? { background: "rgba(232,160,32,0.12)", border: "1px solid rgba(232,160,32,0.25)" } : {}}
            >
              <span className="w-4 h-4 flex items-center justify-center shrink-0">
                <i className={s.icone}></i>
              </span>
              <span className="truncate">{s.titulo}</span>
            </button>
          ))}
        </nav>

        {/* Botão de impressão */}
        <div className="p-3 border-t print:hidden" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <button
            onClick={handlePrint}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap transition-all"
            style={{ background: "linear-gradient(135deg, #E8A020, #f5b94a)", color: CORES.fundo }}
          >
            <i className="ri-printer-line"></i> Exportar PDF (A3)
          </button>
        </div>
      </aside>

      {/* ========== MOBILE NAV ========== */}
      <div className="xl:hidden fixed top-0 left-0 right-0 z-40 px-3 py-2.5 border-b overflow-x-auto print:hidden" style={{ background: "rgba(13,22,41,0.98)", borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="flex gap-1.5">
          {secoes.map((s) => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                active === s.id ? "text-white" : "text-white/40"
              }`}
              style={active === s.id ? { background: "rgba(232,160,32,0.15)" } : {}}
            >
              {s.titulo}
            </button>
          ))}
        </div>
        <div className="flex justify-end mt-1.5">
          <button
            onClick={handlePrint}
            className="px-3 py-1 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap"
            style={{ background: "rgba(232,160,32,0.15)", color: CORES.dourado, border: "1px solid rgba(232,160,32,0.25)" }}
          >
            <i className="ri-printer-line mr-1"></i> Exportar PDF A3
          </button>
        </div>
      </div>

      {/* ========== CONTEÚDO PRINCIPAL ========== */}
      <main className="flex-1 min-w-0 p-4 md:p-8 pt-24 xl:pt-8 pb-24" style={{ background: CORES.fundo }}>
        <div className="max-w-5xl mx-auto">

          {/* ═══════ INTRODUÇÃO ═══════ */}
          {active === "intro" && (
            <div className="space-y-8">
              {/* Capa */}
              <div className="relative overflow-hidden rounded-3xl p-8 md:p-12 text-center" style={{ background: "linear-gradient(135deg, #1B2A5E 0%, #0D1629 50%, #1B2A5E 100%)", border: "1px solid rgba(232,160,32,0.30)" }}>
                <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)", backgroundSize: "32px 32px" }}></div>
                <div className="relative z-10">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6" style={{ background: "rgba(232,160,32,0.15)", border: "1px solid rgba(232,160,32,0.35)" }}>
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: CORES.dourado }}></span>
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: CORES.dourado }}>Documentação Oficial · v5.29</span>
                  </div>
                  <h1 className="text-3xl md:text-5xl font-black text-white mb-4 leading-tight">
                    Gabinete Virtual<br />
                    <span style={{ color: CORES.dourado }}>Vereador Arthur Halal</span>
                  </h1>
                  <p className="text-white/50 text-base md:text-lg max-w-2xl mx-auto mb-6">
                    Guia completo do ecossistema digital do mandato — da captação de demandas cidadãs à gestão de oportunidades de emprego em Pelotas/RS.
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    {["Plataforma de Demandas", "Sistema de Oportunidades", "Chat em Tempo Real", "Kanban Colaborativo", "Notícias do Mandato"].map((tag) => (
                      <span key={tag} className="px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: "rgba(59,191,212,0.12)", color: CORES.teal, border: `1px solid rgba(59,191,212,0.20)` }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* O que é */}
              <div className="rounded-2xl p-6 md:p-8" style={{ background: CORES.cardBg, border: `1px solid ${CORES.borderCard}` }}>
                <h2 className="text-xl font-extrabold text-white mb-4 flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(232,160,32,0.20)" }}>
                    <i className="ri-information-line text-base" style={{ color: CORES.dourado }}></i>
                  </span>
                  O que é o Gabinete Virtual?
                </h2>
                <p className="text-white/55 text-sm leading-relaxed mb-4">
                  O <strong className="text-white/80">Gabinete Virtual</strong> é uma plataforma digital completa que digitaliza e automatiza todas as operações do mandato do Vereador Arthur Halal. Ele substitui planilhas, e-mails soltos e cadernos de anotações por um sistema integrado, em tempo real, onde cada demanda do cidadão é rastreada, cada vaga de emprego é conectada a candidatos, e cada decisão é baseada em dados.
                </p>
                <div className="grid sm:grid-cols-3 gap-4">
                  {[
                    { titulo: "Demandas Cidadãs", texto: "Cidadãos enviam requerimentos, sugestões de projeto e contatos diretamente pelo site. Assessores gerenciam via Kanban. Vereador acompanha tudo em tempo real.", icone: "ri-file-list-3-line", cor: CORES.dourado },
                    { titulo: "Empregabilidade", texto: "Empresas publicam vagas. Cidadãos se candidatam com currículo. O sistema rastreia contratações e gera relatórios de empregabilidade para o mandato.", icone: "ri-briefcase-4-line", cor: CORES.teal },
                    { titulo: "Comunicação", texto: "Chat em tempo real entre cidadãos e gabinete. Notificações instantâneas para todos os perfis. Indicador de digitação. Tour guiado interativo.", icone: "ri-chat-3-line", cor: CORES.verde },
                  ].map((c) => (
                    <div key={c.titulo} className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${c.cor}20` }}>
                        <i className={`${c.icone} text-base`} style={{ color: c.cor }}></i>
                      </div>
                      <h3 className="text-white font-bold text-sm mb-1.5">{c.titulo}</h3>
                      <p className="text-white/45 text-xs leading-relaxed">{c.texto}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Números */}
              <div className="rounded-2xl p-6 md:p-8" style={{ background: CORES.cardBg, border: `1px solid ${CORES.borderCard}` }}>
                <h2 className="text-xl font-extrabold text-white mb-5 flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(59,191,212,0.20)" }}>
                    <i className="ri-bar-chart-line text-base" style={{ color: CORES.teal }}></i>
                  </span>
                  Números do Projeto
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { valor: "6", label: "Perfis de Usuário", icone: "ri-group-line", cor: CORES.dourado },
                    { valor: "25+", label: "Páginas/Rotas", icone: "ri-layout-line", cor: CORES.teal },
                    { valor: "38", label: "Edge Functions", icone: "ri-cloud-line", cor: CORES.verde },
                    { valor: "14", label: "Canais Realtime", icone: "ri-flashlight-line", cor: CORES.roxo },
                  ].map((n) => (
                    <div key={n.label} className="text-center p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2" style={{ background: `${n.cor}20` }}>
                        <i className={`${n.icone} text-sm`} style={{ color: n.cor }}></i>
                      </div>
                      <p className="text-2xl font-extrabold text-white">{n.valor}</p>
                      <p className="text-white/40 text-xs">{n.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══════ O PROBLEMA ═══════ */}
          {active === "problema" && (
            <div className="space-y-8">
              <div className="rounded-2xl p-6 md:p-8" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.20)" }}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.20)" }}>
                    <i className="ri-alert-line text-xl" style={{ color: CORES.vermelho }}></i>
                  </div>
                  <h2 className="text-xl font-extrabold text-white">O Problema que o Gabinete Virtual Resolve</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  {[
                    { titulo: "Demandas se Perdiam", texto: "Cidadãos enviavam requerimentos por e-mail, WhatsApp, telefone e pessoalmente. Não havia registro centralizado. Demandas ficavam sem resposta por semanas. Ninguém sabia o status.", icone: "ri-mail-unread-line" },
                    { titulo: "Falta de Transparência", texto: "O cidadão não tinha como acompanhar sua solicitação. O vereador não sabia quantas demandas estavam em andamento. Os assessores não tinham visibilidade do que os colegas estavam fazendo.", icone: "ri-eye-off-line" },
                    { titulo: "Emprego Desconectado", texto: "Empresas de Pelotas publicavam vagas em sites genéricos. Cidadãos locais nem sabiam dessas oportunidades. Não havia conexão entre quem contrata e quem busca emprego na cidade.", icone: "ri-link-unlink" },
                    { titulo: "Comunicação Fragmentada", texto: "Conversas entre cidadão e gabinete aconteciam em canais diferentes. Ninguém conseguia retomar o histórico. Assessores diferentes respondiam sem contexto. Informação se perdia.", icone: "ri-chat-off-line" },
                  ].map((p) => (
                    <div key={p.titulo} className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ background: "rgba(239,68,68,0.15)" }}>
                        <i className={`${p.icone} text-sm`} style={{ color: CORES.vermelho }}></i>
                      </div>
                      <h3 className="text-white font-bold text-sm mb-1.5">{p.titulo}</h3>
                      <p className="text-white/45 text-xs leading-relaxed">{p.texto}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl p-6 md:p-8" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.20)" }}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(34,197,94,0.20)" }}>
                    <i className="ri-check-double-line text-xl" style={{ color: CORES.verde }}></i>
                  </div>
                  <h2 className="text-xl font-extrabold text-white">Como o Gabinete Virtual Resolve</h2>
                </div>
                <div className="space-y-3">
                  {[
                    { titulo: "Centralização Total", texto: "Todas as demandas entram pelo mesmo sistema. Cada uma recebe um ID único. O status é visível para cidadão, assessor e vereador. Nada se perde." },
                    { titulo: "Transparência em Tempo Real", texto: "O cidadão acompanha cada etapa. O vereador vê dashboards com números atualizados. Os assessores trabalham num quadro Kanban compartilhado. Todo mundo sabe o que está acontecendo." },
                    { titulo: "Conexão Local de Emprego", texto: "Empresas de Pelotas publicam vagas que aparecem no feed de todos os cidadãos. Candidaturas são geridas dentro da plataforma. O sistema rastreia contratações e gera indicadores de empregabilidade para o mandato." },
                    { titulo: "Chat Unificado com Histórico", texto: "Cada cidadão tem um chat dedicado com o gabinete. O histórico fica salvo. Diferentes assessores podem atender com contexto completo. Indicador de digitação em tempo real." },
                  ].map((s) => (
                    <div key={s.titulo} className="flex items-start gap-3 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(34,197,94,0.25)" }}>
                        <i className="ri-check-line text-xs" style={{ color: CORES.verde }}></i>
                      </span>
                      <div>
                        <h3 className="text-white font-bold text-sm mb-1">{s.titulo}</h3>
                        <p className="text-white/45 text-xs leading-relaxed">{s.texto}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══════ LOGINS DE TESTE ═══════ */}
          {active === "logins" && (
            <div className="space-y-8">
              <div className="rounded-2xl p-6 md:p-8" style={{ background: "rgba(232,160,32,0.06)", border: "1px solid rgba(232,160,32,0.25)" }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(232,160,32,0.20)" }}>
                    <i className="ri-key-fill text-xl" style={{ color: CORES.dourado }}></i>
                  </div>
                  <div>
                    <h1 className="text-2xl font-extrabold text-white">Logins e Senhas dos Usuários Padrão</h1>
                    <p className="text-white/40 text-sm">Credenciais dos perfis de acesso ao sistema. Use para testar cada ambiente.</p>
                  </div>
                </div>
                <div className="mt-4 p-3 rounded-xl flex items-start gap-2" style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.20)" }}>
                  <i className="ri-lock-line text-sm mt-0.5" style={{ color: "#EF4444" }}></i>
                  <p className="text-xs" style={{ color: "#EF4444" }}>
                    <strong>Atenção:</strong> Estas credenciais são para uso interno e demonstração. Troque as senhas antes de entregar o sistema ao cliente.
                  </p>
                </div>
              </div>

              {/* Vereador */}
              <div className="rounded-2xl overflow-hidden" style={{ background: CORES.cardBg, border: "1px solid rgba(34,197,94,0.30)", borderLeft: `3px solid ${CORES.verde}` }}>
                <div className="p-4 flex items-center gap-3" style={{ background: "rgba(34,197,94,0.06)", borderBottom: "1px solid rgba(34,197,94,0.15)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(34,197,94,0.20)" }}>
                    <i className="ri-government-line text-base" style={{ color: CORES.verde }}></i>
                  </div>
                  <h2 className="text-white font-extrabold text-base">Vereador</h2>
                  <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(34,197,94,0.15)", color: CORES.verde }}>Painel: /vereador</span>
                </div>
                <div className="p-5">
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Email</p>
                      <p className="text-white font-bold text-sm font-mono">arthur.halal@email.com</p>
                    </div>
                    <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Senha</p>
                      <p className="text-white font-bold text-sm font-mono">Teste@123</p>
                    </div>
                    <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Acesso</p>
                      <p className="text-white/60 text-sm">Painel completo, leitura total, exportações</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Admin */}
              <div className="rounded-2xl overflow-hidden" style={{ background: CORES.cardBg, border: "1px solid rgba(124,58,237,0.30)", borderLeft: `3px solid ${CORES.roxo}` }}>
                <div className="p-4 flex items-center gap-3" style={{ background: "rgba(124,58,237,0.06)", borderBottom: "1px solid rgba(124,58,237,0.15)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(124,58,237,0.20)" }}>
                    <i className="ri-shield-fill text-base" style={{ color: CORES.roxo }}></i>
                  </div>
                  <h2 className="text-white font-extrabold text-base">Administrador</h2>
                  <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(124,58,237,0.15)", color: CORES.roxo }}>Painel: /admin</span>
                </div>
                <div className="p-5">
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Email</p>
                      <p className="text-white font-bold text-sm font-mono">admin@gabinete.com</p>
                    </div>
                    <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Senha</p>
                      <p className="text-white font-bold text-sm font-mono">Teste@123</p>
                    </div>
                    <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Acesso</p>
                      <p className="text-white/60 text-sm">CRUD total, gerenciar usuários, notícias, limpeza</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assessores */}
              <div className="rounded-2xl overflow-hidden" style={{ background: CORES.cardBg, border: "1px solid rgba(168,85,247,0.30)", borderLeft: "3px solid #A855F7" }}>
                <div className="p-4 flex items-center gap-3" style={{ background: "rgba(168,85,247,0.06)", borderBottom: "1px solid rgba(168,85,247,0.15)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(168,85,247,0.20)" }}>
                    <i className="ri-shield-user-fill text-base" style={{ color: "#A855F7" }}></i>
                  </div>
                  <h2 className="text-white font-extrabold text-base">Assessores</h2>
                  <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(168,85,247,0.15)", color: "#A855F7" }}>Painel: /assessor/painel</span>
                </div>
                <div className="p-5 space-y-4">
                  {[
                    { nome: "Assessor 1", email: "assessor1@gabinete.com", senha: "CONFIGURE_EM_AMBIENTE_DE_TESTE" },
                    { nome: "Assessor 2", email: "assessor2@gabinete.com", senha: "CONFIGURE_EM_AMBIENTE_DE_TESTE" },
                    { nome: "Assessor 3", email: "assessor3@gabinete.com", senha: "CONFIGURE_EM_AMBIENTE_DE_TESTE" },
                  ].map((a) => (
                    <div key={a.email} className="grid sm:grid-cols-3 gap-3 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div>
                        <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Nome</p>
                        <p className="text-white font-bold text-sm">{a.nome}</p>
                      </div>
                      <div>
                        <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Email</p>
                        <p className="text-white font-bold text-sm font-mono">{a.email}</p>
                      </div>
                      <div>
                        <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Senha</p>
                        <p className="text-white font-bold text-sm font-mono">{a.senha}</p>
                      </div>
                    </div>
                  ))}
                  <div className="p-3 rounded-xl flex items-start gap-2" style={{ background: "rgba(232,160,32,0.08)", border: "1px solid rgba(232,160,32,0.18)" }}>
                    <i className="ri-information-line text-sm mt-0.5 shrink-0" style={{ color: CORES.dourado }}></i>
                    <p className="text-xs" style={{ color: "rgba(232,160,32,0.85)" }}>Assessores precisam ser aprovados pelo Admin em /admin (aba Assessores) antes de acessar o painel.</p>
                  </div>
                </div>
              </div>

              {/* Cidadão */}
              <div className="rounded-2xl overflow-hidden" style={{ background: CORES.cardBg, border: "1px solid rgba(59,191,212,0.30)", borderLeft: `3px solid ${CORES.teal}` }}>
                <div className="p-4 flex items-center gap-3" style={{ background: "rgba(59,191,212,0.06)", borderBottom: "1px solid rgba(59,191,212,0.15)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(59,191,212,0.20)" }}>
                    <i className="ri-user-fill text-base" style={{ color: CORES.teal }}></i>
                  </div>
                  <h2 className="text-white font-extrabold text-base">Cidadão</h2>
                  <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(59,191,212,0.15)", color: CORES.teal }}>Painel: /cidadao</span>
                </div>
                <div className="p-5 space-y-4">
                  {[
                    { nome: "Cidadão Teste 1", email: "cidadao1@teste.com", senha: "CONFIGURE_EM_AMBIENTE_DE_TESTE" },
                    { nome: "Cidadão Teste 2", email: "cidadao2@teste.com", senha: "CONFIGURE_EM_AMBIENTE_DE_TESTE" },
                    { nome: "Cidadão Teste 3", email: "cidadao3@teste.com", senha: "CONFIGURE_EM_AMBIENTE_DE_TESTE" },
                  ].map((c) => (
                    <div key={c.email} className="grid sm:grid-cols-3 gap-3 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div>
                        <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Nome</p>
                        <p className="text-white font-bold text-sm">{c.nome}</p>
                      </div>
                      <div>
                        <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Email</p>
                        <p className="text-white font-bold text-sm font-mono">{c.email}</p>
                      </div>
                      <div>
                        <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Senha</p>
                        <p className="text-white font-bold text-sm font-mono">{c.senha}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Empresa */}
              <div className="rounded-2xl overflow-hidden" style={{ background: CORES.cardBg, border: "1px solid rgba(249,115,22,0.30)", borderLeft: `3px solid ${CORES.laranja}` }}>
                <div className="p-4 flex items-center gap-3" style={{ background: "rgba(249,115,22,0.06)", borderBottom: "1px solid rgba(249,115,22,0.15)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(249,115,22,0.20)" }}>
                    <i className="ri-building-fill text-base" style={{ color: CORES.laranja }}></i>
                  </div>
                  <h2 className="text-white font-extrabold text-base">Empresa</h2>
                  <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(249,115,22,0.15)", color: CORES.laranja }}>Painel: /sistema/painel/empresa</span>
                </div>
                <div className="p-5 space-y-4">
                  {[
                    { nome: "Empresa Teste 1", email: "empresa1@teste.com", senha: "CONFIGURE_EM_AMBIENTE_DE_TESTE" },
                    { nome: "Empresa Teste 2", email: "empresa2@teste.com", senha: "CONFIGURE_EM_AMBIENTE_DE_TESTE" },
                  ].map((e) => (
                    <div key={e.email} className="grid sm:grid-cols-3 gap-3 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div>
                        <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Nome</p>
                        <p className="text-white font-bold text-sm">{e.nome}</p>
                      </div>
                      <div>
                        <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Email</p>
                        <p className="text-white font-bold text-sm font-mono">{e.email}</p>
                      </div>
                      <div>
                        <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Senha</p>
                        <p className="text-white font-bold text-sm font-mono">{e.senha}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Anônimo */}
              <div className="rounded-2xl overflow-hidden" style={{ background: CORES.cardBg, border: "1px solid rgba(255,255,255,0.10)" }}>
                <div className="p-4 flex items-center gap-3" style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.10)" }}>
                    <i className="ri-ghost-line text-base" style={{ color: "rgba(255,255,255,0.50)" }}></i>
                  </div>
                  <h2 className="text-white font-extrabold text-base">Usuário Anônimo</h2>
                  <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.50)" }}>Sem login</span>
                </div>
                <div className="p-5">
                  <div className="p-4 rounded-xl flex items-start gap-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <i className="ri-information-line text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.40)" }}></i>
                    <div>
                      <p className="text-white/70 font-semibold text-sm mb-1">Não requer cadastro</p>
                      <p className="text-white/40 text-xs leading-relaxed">O usuário anônimo pode acessar o site público, usar o ChatBotao (chat flutuante) e enviar formulários de requerimento, sugestão e fale conosco. Para acessar o painel do cidadão, vagas de emprego e outros recursos, é necessário criar uma conta.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════ MAPA DO SITE ═══════ */}
          {active === "mapa-site" && (
            <div className="space-y-8">
              <h1 className="text-2xl font-extrabold text-white mb-1">Mapa do Site</h1>
              <p className="text-white/40 text-sm mb-6">Todas as rotas e páginas do ecossistema, organizadas por perfil de acesso.</p>

              {/* Mapa visual */}
              <div className="rounded-2xl p-6 md:p-8" style={{ background: CORES.cardBg, border: `1px solid ${CORES.borderCard}` }}>
                <h2 className="text-lg font-extrabold text-white mb-5 flex items-center gap-2">
                  <i className="ri-global-line" style={{ color: CORES.dourado }}></i>
                  Site Público <span className="text-white/30 text-sm font-normal">· Acesso livre</span>
                </h2>
                <div className="space-y-1.5 mb-6">
                  {[
                    { rota: "/", desc: "Home — Landing page completa com hero, serviços, notícias, CTA" },
                    { rota: "/noticias", desc: "Listagem de notícias do mandato — grid com cards" },
                    { rota: "/noticias/:slug", desc: "Notícia individual — leitura completa" },
                    { rota: "/requerimento", desc: "Formulário de requerimento — cidadão envia demanda" },
                    { rota: "/sugestao-projeto", desc: "Formulário de sugestão de projeto de lei" },
                    { rota: "/fale-conosco", desc: "Formulário de contato direto com o gabinete" },
                    { rota: "/auth", desc: "Login e cadastro unificado" },
                    { rota: "/sistema", desc: "Landing page do Sistema de Oportunidades" },
                    { rota: "/documentacao", desc: "Esta documentação completa do projeto" },
                  ].map((r) => (
                    <div key={r.rota} className="flex items-start gap-3 px-4 py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.02)" }}>
                      <code className="text-xs font-bold px-2 py-0.5 rounded shrink-0" style={{ background: "rgba(232,160,32,0.15)", color: CORES.dourado }}>{r.rota}</code>
                      <p className="text-white/50 text-sm">{r.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {[
                { role: "Cidadão", cor: CORES.teal, rotas: [
                  { rota: "/cidadao", desc: "Painel principal — demandas, chat, vagas, perfil" },
                  { rota: "/cidadao/curriculo/criar", desc: "Criador de currículo — wizard de 6 etapas" },
                  { rota: "/cidadao/curriculo/preview", desc: "Pré-visualização do currículo gerado" },
                  { rota: "/cidadao/curriculo/dicas", desc: "Dicas para montar um bom currículo" },
                  { rota: "/sistema/painel/cidadao", desc: "Feed de vagas + candidaturas + prestadores" },
                  { rota: "/complete-profile", desc: "Completar perfil após cadastro" },
                ]},
                { role: "Vereador", cor: CORES.verde, rotas: [
                  { rota: "/vereador", desc: "Painel completo — visão geral, demandas, eficiência, métricas, vagas, usuários, conversas, agenda" },
                ]},
                { role: "Assessor", cor: "#A855F7", rotas: [
                  { rota: "/assessor", desc: "Página de entrada do assessor" },
                  { rota: "/assessor/painel", desc: "Kanban + chat + usuários + vagas + agenda" },
                ]},
                { role: "Empresa", cor: CORES.laranja, rotas: [
                  { rota: "/sistema/painel/empresa", desc: "Gestão de vagas + banco de currículos + chat" },
                ]},
                { role: "Admin", cor: CORES.roxo, rotas: [
                  { rota: "/admin", desc: "Dashboard + demandas + notícias + usuários + assessores + relatórios + vagas + limpeza + diagnóstico de email" },
                  { rota: "/admin/resumo", desc: "Resumo do sistema em PDF" },
                ]},
              ].map((g) => (
                <div key={g.role} className="rounded-2xl p-6" style={{ background: CORES.cardBg, border: `1px solid ${CORES.borderCard}`, borderLeft: `3px solid ${g.cor}` }}>
                  <h2 className="text-lg font-extrabold text-white mb-4 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ background: g.cor }}></span>
                    {g.role}
                  </h2>
                  <div className="space-y-1.5">
                    {g.rotas.map((r) => (
                      <div key={r.rota} className="flex items-start gap-3 px-4 py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.02)" }}>
                        <code className="text-xs font-bold px-2 py-0.5 rounded shrink-0" style={{ background: `${g.cor}20`, color: g.cor }}>{r.rota}</code>
                        <p className="text-white/50 text-sm">{r.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ═══════ ARQUITETURA ═══════ */}
          {active === "arquitetura" && (
            <div className="space-y-8">
              <h1 className="text-2xl font-extrabold text-white mb-1">Arquitetura do Sistema</h1>
              <p className="text-white/40 text-sm mb-6">Stack tecnológica e infraestrutura que sustentam o Gabinete Virtual.</p>

              <div className="rounded-2xl p-6 md:p-8" style={{ background: CORES.cardBg, border: `1px solid ${CORES.borderCard}` }}>
                <h2 className="text-lg font-extrabold text-white mb-5">Stack Tecnológica</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { camada: "Frontend", tech: "React 19 + TypeScript + TailwindCSS", icone: "ri-reactjs-line", cor: CORES.teal },
                    { camada: "Roteamento", tech: "React Router DOM v7", icone: "ri-router-line", cor: CORES.dourado },
                    { camada: "Backend", tech: "Supabase (Auth, Database, Storage, Realtime)", icone: "ri-database-2-line", cor: CORES.verde },
                    { camada: "Edge Functions", tech: "38 funções serverless (TypeScript/Deno)", icone: "ri-cloud-line", cor: CORES.roxo },
                    { camada: "Email", tech: "Resend (envio transacional)", icone: "ri-mail-send-line", cor: CORES.laranja },
                    { camada: "Ícones", tech: "Remix Icon + FontAwesome (CDN)", icone: "ri-emotion-line", cor: CORES.teal },
                    { camada: "PDF", tech: "jsPDF + html2canvas (exportação)", icone: "ri-file-pdf-line", cor: CORES.vermelho },
                    { camada: "Imagens", tech: "Stable Diffusion (geração de imagens)", icone: "ri-image-line", cor: CORES.dourado },
                  ].map((a) => (
                    <div key={a.camada} className="flex items-start gap-3 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${a.cor}20` }}>
                        <i className={`${a.icone} text-base`} style={{ color: a.cor }}></i>
                      </span>
                      <div>
                        <p className="text-white font-bold text-sm">{a.camada}</p>
                        <p className="text-white/45 text-xs">{a.tech}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl p-6 md:p-8" style={{ background: CORES.cardBg, border: `1px solid ${CORES.borderCard}` }}>
                <h2 className="text-lg font-extrabold text-white mb-5">Banco de Dados (Supabase)</h2>
                <p className="text-white/45 text-sm mb-4">11 tabelas que armazenam todos os dados do sistema. Realtime ativo em todas para atualização instantânea.</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-white/70">
                    <thead>
                      <tr className="border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                        <th className="text-left py-2 px-3 text-white/40 font-bold uppercase">Tabela</th>
                        <th className="text-left py-2 px-3 text-white/40 font-bold uppercase">Descrição</th>
                        <th className="text-left py-2 px-3 text-white/40 font-bold uppercase">Realtime</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["profiles", "Perfis de todos os usuários (dados pessoais, empregabilidade, currículo)", "Sim"],
                        ["demands", "Demandas dos cidadãos (requerimentos, sugestões, contatos)", "Sim"],
                        ["demand_messages", "Mensagens internas das demandas", "Não"],
                        ["mensagens_chat", "Conversas entre cidadãos e gabinete", "Não"],
                        ["mensagens_chat_items", "Mensagens individuais dos chats", "Sim"],
                        ["vagas", "Vagas de emprego publicadas por empresas", "Sim"],
                        ["candidaturas", "Candidaturas dos cidadãos às vagas", "Sim"],
                        ["notificacoes", "Central de notificações do sistema", "Sim"],
                        ["news", "Notícias do mandato publicadas no portal", "Não"],
                        ["agenda", "Compromissos da agenda do gabinete", "Sim"],
                        ["verification_codes", "Códigos de verificação de email", "Não"],
                      ].map((t) => (
                        <tr key={t[0]} className="border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                          <td className="py-2 px-3 font-bold text-white/80 font-mono text-xs">{t[0]}</td>
                          <td className="py-2 px-3 text-white/45">{t[1]}</td>
                          <td className="py-2 px-3">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={t[2] === "Sim" ? { background: "rgba(34,197,94,0.15)", color: CORES.verde } : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.40)" }}>{t[2]}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-2xl p-6 md:p-8" style={{ background: CORES.cardBg, border: `1px solid ${CORES.borderCard}` }}>
                <h2 className="text-lg font-extrabold text-white mb-5">Sistema Híbrido de Atualização</h2>
                <p className="text-white/45 text-sm mb-4">O projeto usa uma combinação de três mecanismos para garantir que os dados estejam sempre atualizados:</p>
                <div className="grid sm:grid-cols-3 gap-4">
                  {[
                    { titulo: "Realtime (Push)", texto: "14 canais Supabase Realtime escutam mudanças no banco e atualizam a interface instantaneamente. Usado em: demandas, vagas, candidaturas, notificações, chat, agenda, profiles.", icone: "ri-flashlight-fill", cor: CORES.verde },
                    { titulo: "Polling (Pull)", texto: "Intervalos de 1s a 30s verificam atualizações como fallback. Usado em: notificações, contagem de chats, badges de mensagens não lidas. Camada extra de segurança.", icone: "ri-loop-left-line", cor: CORES.dourado },
                    { titulo: "Carga Única", texto: "Dados que não mudam com frequência são carregados uma vez no mount. Usado em: perfil do usuário, lista de usuários (atualizada via realtime separado).", icone: "ri-download-line", cor: CORES.teal },
                  ].map((m) => (
                    <div key={m.titulo} className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${m.cor}20` }}>
                        <i className={`${m.icone} text-base`} style={{ color: m.cor }}></i>
                      </div>
                      <h3 className="text-white font-bold text-sm mb-1.5">{m.titulo}</h3>
                      <p className="text-white/45 text-xs leading-relaxed">{m.texto}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══════ PERFIS DE USUÁRIO ═══════ */}
          {active === "perfis" && (
            <div className="space-y-8">
              <h1 className="text-2xl font-extrabold text-white mb-1">Perfis de Usuário</h1>
              <p className="text-white/40 text-sm mb-6">6 perfis distintos, cada um com seu fluxo de cadastro, painel e permissões específicas.</p>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-white/70">
                  <thead>
                    <tr className="border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                      <th className="text-left py-3 px-4 text-white/40 font-bold uppercase text-xs">Perfil</th>
                      <th className="text-left py-3 px-4 text-white/40 font-bold uppercase text-xs">Role</th>
                      <th className="text-left py-3 px-4 text-white/40 font-bold uppercase text-xs">Cadastro</th>
                      <th className="text-left py-3 px-4 text-white/40 font-bold uppercase text-xs">Aprovação</th>
                      <th className="text-left py-3 px-4 text-white/40 font-bold uppercase text-xs">Painel</th>
                      <th className="text-left py-3 px-4 text-white/40 font-bold uppercase text-xs">Cor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { role: "Cidadão", key: "citizen", cadastro: "Email + código", aprovacao: "Automática", painel: "/cidadao", cor: CORES.teal },
                      { role: "Empresa", key: "empresa", cadastro: "Email + código", aprovacao: "Automática", painel: "/sistema/painel/empresa", cor: CORES.laranja },
                      { role: "Assessor", key: "assessor", cadastro: "Email + código", aprovacao: "Admin aprova", painel: "/assessor/painel", cor: "#A855F7" },
                      { role: "Vereador", key: "vereador", cadastro: "Criado pelo admin", aprovacao: "—", painel: "/vereador", cor: CORES.verde },
                      { role: "Admin", key: "admin", cadastro: "Setup inicial", aprovacao: "—", painel: "/admin", cor: CORES.roxo },
                      { role: "Anônimo", key: "anon", cadastro: "Sem cadastro", aprovacao: "—", painel: "Site público", cor: "rgba(255,255,255,0.40)" },
                    ].map((p) => (
                      <tr key={p.key} className="border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                        <td className="py-3 px-4 font-bold text-white">{p.role}</td>
                        <td className="py-3 px-4"><code className="text-xs px-2 py-0.5 rounded" style={{ background: `${p.cor}20`, color: p.cor }}>{p.key}</code></td>
                        <td className="py-3 px-4 text-white/45">{p.cadastro}</td>
                        <td className="py-3 px-4 text-white/45">{p.aprovacao}</td>
                        <td className="py-3 px-4"><code className="text-xs px-2 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.60)" }}>{p.painel}</code></td>
                        <td className="py-3 px-4"><span className="w-4 h-4 rounded-full inline-block" style={{ background: p.cor }}></span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="rounded-2xl p-6" style={{ background: CORES.cardBg, border: `1px solid ${CORES.borderCard}` }}>
                <h2 className="text-lg font-extrabold text-white mb-4">Fluxo de Cadastro (Máquina de Estados)</h2>
                <p className="text-white/45 text-sm mb-4">O onboarding usa uma máquina de estados com 3 estágios, garantindo que o usuário nunca perca o progresso:</p>
                <div className="space-y-3">
                  {[
                    { estado: "NULL", desc: "Cadastro completo (legacy ou concluído). Dashboard direto." },
                    { estado: "email_verified", desc: "Email validado, perfil não preenchido. Redireciona para /complete-profile." },
                    { estado: "profile_started", desc: "Foto enviada, dados iniciados. Retoma de onde parou no /complete-profile." },
                  ].map((e) => (
                    <div key={e.estado} className="flex items-start gap-3 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <code className="text-xs font-bold px-2 py-0.5 rounded shrink-0" style={{ background: "rgba(232,160,32,0.15)", color: CORES.dourado }}>{e.estado}</code>
                      <p className="text-white/50 text-sm">{e.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══════ AMBIENTES ═══════ */}
          {/* Cada ambiente mostra a versão desktop e mobile */}
          {["home", "cidadao", "cidadao-vagas", "vereador", "assessor", "empresa", "admin", "oportunidades", "noticias-mandato", "curriculo"].map((ambiente) => {
            if (active !== ambiente) return null;
            const dados: Record<string, { titulo: string; rota: string; desc: string; cor: string; icone: string; secoes: { titulo: string; texto: string }[]; funcionalidades: string[] }> = {
              home: { titulo: "Site Público (Home)", rota: "/", desc: "Landing page completa com 9 seções. Primeiro ponto de contato do cidadão com o mandato.", cor: CORES.dourado, icone: "ri-home-2-line",
                secoes: [
                  { titulo: "Hero Section", texto: "Imagem de fundo full-bleed de Pelotas com overlay escuro. Título impactante, subtítulo e CTA principal \"Enviar Requerimento\". Navbar transparente que fica sólida ao scroll." },
                  { titulo: "Investimentos", texto: "Cards com valores de investimentos conquistados para a cidade (R$ 1,5M, R$ 600K, R$ 400K). Destaque visual com gradientes e ícones." },
                  { titulo: "Guia do Cidadão", texto: "4 cards explicando como interagir com o gabinete: requerimento, sugestão, fale conosco e oportunidades de emprego." },
                  { titulo: "Sobre o Vereador", texto: "Seção com foto do vereador, biografia, valores do mandato e link para notícias." },
                  { titulo: "Oportunidades (Teaser)", texto: "Prévia do sistema de vagas com link para a landing page completa." },
                  { titulo: "Notícias", texto: "Últimas notícias do mandato em grid de cards com imagem, categoria e data." },
                  { titulo: "CTA do Cidadão", texto: "Banner de conversão incentivando o cadastro na plataforma." },
                  { titulo: "Requerimento Rápido", texto: "Acesso direto ao formulário de requerimento." },
                  { titulo: "Depoimentos", texto: "Carrossel ou grid de depoimentos de cidadãos atendidos." },
                ],
                funcionalidades: ["Navbar fixa com links para todas as seções", "Menu mobile com hamburger", "Footer com links, redes sociais e contato", "Botões flutuantes (Fale Conosco)", "Design responsivo: stacks verticais no mobile"] },
              cidadao: { titulo: "Painel do Cidadão", rota: "/cidadao", desc: "Centro de controle do cidadão. 4 abas: Demandas, Mensagens, Vagas e Perfil. Aqui o cidadão acompanha tudo.", cor: CORES.teal, icone: "ri-user-line",
                secoes: [
                  { titulo: "Header com Banner", texto: "Background com imagem de Pelotas, avatar do cidadão, nome, botões rápidos: Novo Requerimento, Sugerir Projeto, Oportunidades. Sininho de notificações no canto direito." },
                  { titulo: "Cards de Resumo", texto: "4 cards com números: Total de demandas, Em Aberto, Em Andamento, Finalizadas. Cada card tem ícone e cor específica por status." },
                  { titulo: "Tabs (Desktop)", texto: "Barra de abas horizontal: Demandas, Mensagens, Vagas de Emprego, Meu Perfil. Tab ativa com gradiente azul. Badge de mensagens não lidas no ícone." },
                  { titulo: "Aba Demandas", texto: "Lista de demandas com filtros (Todos/Requerimentos/Sugestões). Cards com ID, tipo, status e assessor. Detalhe da demanda com acompanhamento de status (4 etapas) e histórico." },
                  { titulo: "Aba Mensagens (Chat)", texto: "Chat em tempo real com o gabinete. Input de texto e upload de imagem. Indicador de digitação. Histórico completo." },
                  { titulo: "Aba Vagas", texto: "Grid de vagas disponíveis com cards contendo: título, empresa, área, tipo, salário, requisitos. Link para candidatura." },
                  { titulo: "Aba Perfil", texto: "Formulário completo: foto, currículo PDF (upload + criador integrado), status de emprego, dados pessoais, formação, expertise, prestador de serviços (toggle + categorias + portfólio)." },
                  { titulo: "Mobile Bottom Nav", texto: "Navegação inferior fixa com 4 ícones. Indicador de aba ativa com bolinha. Badge de mensagens." },
                ],
                funcionalidades: ["Tour guiado no primeiro acesso (auto-start)", "Realtime nas demandas (atualiza sem F5)", "Polling de notificações a cada 1s", "Upload de currículo PDF e foto de perfil", "Criador de currículo integrado (wizard 6 etapas)", "Perfil de prestador de serviços com portfólio"] },
              "cidadao-vagas": { titulo: "Cidadão · Vagas de Emprego", rota: "/sistema/painel/cidadao", desc: "Ambiente dedicado às oportunidades de emprego. Feed de vagas, candidaturas e prestadores de serviço.", cor: CORES.dourado, icone: "ri-briefcase-4-line",
                secoes: [
                  { titulo: "Top Nav", texto: "Barra superior com logo, busca de vagas, avatar do cidadão e botão de logout. Layout similar ao painel da empresa para consistência." },
                  { titulo: "Filtros", texto: "Dropdowns customizados para área de atuação e tipo de vaga. Busca textual por título ou empresa." },
                  { titulo: "Aba Feed", texto: "Grid de cards de vagas ativas. Cada card: título, empresa com avatar, área, tipo, localização, salário, descrição e botão de candidatura. Realtime: novas vagas aparecem automaticamente." },
                  { titulo: "Aba Candidaturas", texto: "Lista de candidaturas enviadas com status (Pendente, Aprovada, Recusada). Cada card mostra a vaga, data e status. Realtime: atualiza quando empresa aprova/recusa." },
                  { titulo: "Aba Prestadores", texto: "Lista de prestadores de serviço da região. Cards com foto, nome, categorias. Busca e filtros. Detalhe do prestador com currículo e portfólio." },
                ],
                funcionalidades: ["Realtime no feed de vagas e candidaturas", "Candidatura com 1 clique", "Modal de confirmação de candidatura", "Notificações de aprovação/recusa", "Tour guiado separado (transição do /cidadao)"] },
              vereador: { titulo: "Painel do Vereador", rota: "/vereador", desc: "Dashboard completo do mandato. 8 abas com visão estratégica de todas as operações. Modo leitura (não edita).", cor: CORES.verde, icone: "ri-government-line",
                secoes: [
                  { titulo: "Sidebar", texto: "Menu lateral fixo com 8 itens: Visão Geral, Demandas, Eficiência, Métricas, Vagas, Usuários, Conversas, Agenda. Stats resumidos no rodapé da sidebar (Em Aberto, Em Andamento, Finalizadas, Vagas Ativas). Badge de conversas não lidas." },
                  { titulo: "Aba Visão Geral", texto: "Cards de stats (4), seção de currículos gerados com lista de cidadãos, relatório de empregabilidade com barras de progresso e taxa da plataforma, demandas recentes (lista), vagas abertas (lista). Realtime em tudo." },
                  { titulo: "Aba Demandas", texto: "Toggle Lista/Kanban. Na lista: busca textual, filtro de status, ordenação (Recentes/Antigos/Prioridade). No Kanban: 4 colunas somente leitura. Modal de detalhe completo com status, assessor, descrição, observações e resposta oficial." },
                  { titulo: "Aba Eficiência", texto: "Relatório de produtividade dos assessores. Cards por assessor com: total atribuído, em andamento, aguardando externa, finalizadas. Botão de exportar PDF." },
                  { titulo: "Aba Métricas", texto: "Dashboard analítico: distribuição por tipo, status, bairro, categoria. Gráficos e tabelas. Cidadãos com/sem pesquisa de empregabilidade. Exportação PDF." },
                  { titulo: "Aba Vagas", texto: "Grid de cards de vagas ativas com avatar da empresa. Modal de detalhe com informações completas e lista de candidatos." },
                  { titulo: "Aba Usuários", texto: "Grid de cards de todos os usuários do sistema, agrupados por role. Modal \"Saiba Mais\" com informações detalhadas, currículo e foto." },
                  { titulo: "Aba Conversas", texto: "Lista de chats (Aguardando/Em Andamento/Encerradas) + visualizador de mensagens em modo leitura. Indicador de digitação. Realtime + polling 1s." },
                  { titulo: "Aba Agenda", texto: "Calendário interativo com navegação por meses/anos. Compromissos do gabinete em modo leitura." },
                ],
                funcionalidades: ["Tour guiado no primeiro acesso", "14 canais Realtime", "Kanban somente leitura", "Exportação de relatórios em PDF", "Indicador de digitação no chat", "Lightbox de foto de perfil", "Modal de detalhe de vaga com candidatos"] },
              assessor: { titulo: "Painel do Assessor", rota: "/assessor/painel", desc: "Centro operacional do gabinete. Kanban para gestão de demandas + chat com cidadãos. 5 abas.", cor: "#A855F7", icone: "ri-shield-user-line",
                secoes: [
                  { titulo: "Sidebar", texto: "Menu lateral: Demandas (Kanban), Mensagens, Usuários, Vagas, Agenda. Stats: Em Aberto, Em Andamento, Ag. Externa, Finalizadas. Badge de chats abertos." },
                  { titulo: "Aba Kanban (Demandas)", texto: "Quadro Kanban com 4 colunas: Em Aberto, Em Andamento, Ag. Resp. Externa, Finalizada. Cards arrastáveis com título, ID, cidadão, bairro, data. Busca e filtro por tipo. Modal de detalhe para editar status, salvar observações e responder." },
                  { titulo: "Aba Mensagens (Chat)", texto: "Painel de chat dividido: lista de conversas (Aguardando/Em Andamento) + área de mensagens. Assessor \"assume\" a conversa ao entrar. Input de texto, upload de imagem. Indicador de digitação." },
                  { titulo: "Aba Usuários", texto: "Grid de cards de usuários similar ao vereador. Modal \"Saiba Mais\" com informações detalhadas." },
                  { titulo: "Aba Vagas", texto: "Grid de vagas ativas com modal de detalhe. Modo leitura." },
                  { titulo: "Aba Agenda", texto: "Calendário interativo com criação, edição e exclusão de compromissos. Notificações de lembrete." },
                ],
                funcionalidades: ["Kanban com drag-and-drop (ou clique)", "Regras: só edita demanda própria (isMine)", "Ordenação: Recentes/Antigos/Prioridade", "Contador de dias na coluna", "Chat: assume conversa automaticamente", "Setup de cargo no primeiro acesso", "Tour guiado no primeiro acesso", "Realtime no Kanban e chat"] },
              empresa: { titulo: "Painel da Empresa", rota: "/sistema/painel/empresa", desc: "Gestão completa de vagas e banco de talentos. 4 abas. Acesso exclusivo para contas de empresa.", cor: CORES.laranja, icone: "ri-building-line",
                secoes: [
                  { titulo: "Top Nav + Tab Bar", texto: "Barra superior com logo, notificações, avatar da empresa e logout. Tab bar horizontal: Minhas Vagas, Criar Anúncio, Banco de Currículos, Mensagens." },
                  { titulo: "Aba Minhas Vagas", texto: "Lista de vagas publicadas com status (Ativa/Pausada/Encerrada). Cards com foto, título, área, tipo, localização, salário, contador de candidaturas. Ações: Editar, Pausar/Reativar, Encerrar (modal com seleção de contratados), Excluir (confirmação)." },
                  { titulo: "Aba Criar Anúncio", texto: "Formulário completo: título, área (dropdown), tipo de contrato, localidade, salário, descrição (500 caracteres), requisitos (500 caracteres), foto da vaga (upload com preview). Revisão antes de publicar. Edição de vagas existentes." },
                  { titulo: "Aba Banco de Currículos", texto: "Toggle: Minhas Candidaturas / Todos Profissionais. Filtros: vaga, formação, busca textual. Lista de candidatos com avatar, nome, expertise. Detalhe completo: perfil, currículo PDF, ações (Aprovar/Recusar com motivo). Aba Todos Profissionais mostra todos cidadãos cadastrados." },
                  { titulo: "Aba Mensagens", texto: "Chat dedicado com o gabinete do vereador. Similar ao chat do cidadão. Input de texto. Indicador de digitação." },
                ],
                funcionalidades: ["Publicação de vagas com revisão", "Upload de foto da vaga", "Aprovação/recusa de candidatos com justificativa", "Encerramento de vaga com registro de contratação (multi-select)", "Notificações de novas candidaturas", "Tour guiado", "Realtime em candidaturas e vagas"] },
              admin: { titulo: "Painel Administrativo", rota: "/admin", desc: "Controle total do sistema. 9 abas para gerenciar usuários, demandas, notícias, vagas e diagnóstico.", cor: CORES.roxo, icone: "ri-shield-line",
                secoes: [
                  { titulo: "Sidebar", texto: "Menu lateral: Dashboard, Demandas, Notícias, Usuários, Assessores, Relatórios, Vagas, Limpeza, Diagnóstico Email. Stats das demandas." },
                  { titulo: "Aba Dashboard", texto: "Visão geral: cards de stats, ações rápidas, portal de notícias, indicadores de emprego. Fundo claro (branco) — único painel que não usa tema escuro." },
                  { titulo: "Aba Demandas", texto: "Gestão de todas as demandas. Visualização, edição e exclusão (bypass RLS via edge functions)." },
                  { titulo: "Aba Notícias", texto: "CRUD completo de notícias. Criar, editar, publicar, destacar. Upload de imagem. Preview antes de publicar." },
                  { titulo: "Aba Usuários", texto: "Criação de usuários de qualquer perfil. Edição de email. Reset de senha. Exclusão de usuários (cascata)." },
                  { titulo: "Aba Assessores", texto: "Aprovação e remoção de assessores pendentes. Lista de todos assessores com status." },
                  { titulo: "Aba Relatórios", texto: "Relatórios completos com exportação. Sistema de resumo em PDF (admin/resumo)." },
                  { titulo: "Aba Vagas", texto: "Visualização de todas as vagas (tema escuro). Exclusão administrativa com notificação para empresa e candidatos." },
                  { titulo: "Aba Limpeza", texto: "Remoção de dados de teste/demonstração. Reset completo do sistema para entrega." },
                  { titulo: "Aba Diagnóstico Email", texto: "Ferramenta de diagnóstico da infraestrutura de envio de emails (Resend). Teste de chaves, verificação de remetente." },
                ],
                funcionalidades: ["CRUD completo de usuários e notícias", "Aprovação de assessores", "Exclusão em cascata (edge functions)", "Reset completo do sistema", "Diagnóstico de email", "Realtime nos stats", "Login exclusivo (tela AdminLogin)"] },
              oportunidades: { titulo: "Sistema de Oportunidades", rota: "/sistema", desc: "Landing page pública do sistema de empregabilidade. Explica o funcionamento e convida ao cadastro.", cor: CORES.dourado, icone: "ri-rocket-line",
                secoes: [
                  { titulo: "Hero Section", texto: "Título \"Sistema de Oportunidades\" com efeito gradiente. Subtítulo explicativo. Botões: Sou Cidadão / Sou Empresa. Background escuro com gradientes radiais." },
                  { titulo: "Stats", texto: "4 cards: Vagas Ativas, Currículos, Empresas, Contratados (em breve). Números atualizados do banco." },
                  { titulo: "Áreas de Atuação", texto: "Tags com as áreas disponíveis: Administrativo, Tecnologia, Saúde, Educação, etc." },
                  { titulo: "Como Funciona", texto: "Dois cards lado a lado: Para Cidadãos (5 passos) e Para Empresas (5 passos). Cada um com CTA de cadastro." },
                  { titulo: "O que é o Sistema", texto: "Seção explicativa detalhada: o sistema é gratuito, público, focado em Pelotas. Cards de funcionalidades com ícones." },
                  { titulo: "FAQ", texto: "4 perguntas frequentes com respostas. Estilo accordion estático." },
                  { titulo: "CTA Final", texto: "Banner de conversão final com dois botões de cadastro." },
                ],
                funcionalidades: ["Redirecionamento automático se logado", "Design todo em tema escuro", "Footer e FloatingButtons compartilhados", "Números reais do banco de dados"] },
              "noticias-mandato": { titulo: "Portal de Notícias", rota: "/noticias", desc: "Jornal digital do mandato. Listagem de notícias em grid + página individual de leitura.", cor: CORES.dourado, icone: "ri-newspaper-line",
                secoes: [
                  { titulo: "Página de Listagem (/noticias)", texto: "Grid de cards com: imagem de capa, categoria (badge colorido), título, resumo, data, autor, visualizações. Filtro por categoria. Paginação. Destaque visual para notícias populares." },
                  { titulo: "Página de Detalhe (/noticias/:slug)", texto: "Layout de artigo: imagem hero full-width, título, metadados (data, autor, categoria, views), conteúdo completo formatado. Navegação entre notícias (anterior/próxima). SEO otimizado com Schema.org Article." },
                ],
                funcionalidades: ["17 notícias publicadas", "Categorias: Mandato, Infraestrutura, Agricultura, Educação, Política, Ação Social, Habitação, Saúde, Transparência", "Conteúdo rico com +2000 caracteres por notícia", "URLs amigáveis com slug", "SEO: Schema.org, meta tags, Open Graph"] },
              curriculo: { titulo: "Construtor de Currículo", rota: "/cidadao/curriculo/criar", desc: "Wizard de 6 etapas para criar currículo profissional. Gera PDF com design personalizado.", cor: CORES.teal, icone: "ri-file-user-line",
                secoes: [
                  { titulo: "Etapa 1: Dados Pessoais", texto: "Nome completo, telefone, email, endereço, linkedin. Foto de perfil (upload)." },
                  { titulo: "Etapa 2: Objetivo Profissional", texto: "Campo de texto para objetivo. Sugestões de frases prontas por área." },
                  { titulo: "Etapa 3: Experiência Profissional", texto: "Lista de experiências: empresa, cargo, período, descrição. Adicionar/remover dinamicamente." },
                  { titulo: "Etapa 4: Formação Acadêmica", texto: "Lista de formações: instituição, curso, período. Adicionar/remover." },
                  { titulo: "Etapa 5: Habilidades", texto: "Tags de habilidades. Seleção de lista pré-definida + campo livre." },
                  { titulo: "Etapa 6: Revisão e Tema", texto: "Pré-visualização completa do currículo. 3 opções de tema visual. Geração do PDF via jsPDF. Upload automático para o perfil." },
                ],
                funcionalidades: ["6 etapas com progresso visual", "3 temas de layout", "Geração de PDF real (jsPDF)", "Pré-visualização completa", "Upload automático para o perfil", "Fallback HTML se PDF falhar"] },
            };

            const d = dados[active];
            if (!d) return null;

            return (
              <div className="space-y-8">
                {/* Header */}
                <div className="rounded-2xl p-6 md:p-8" style={{ background: CORES.cardBg, border: `1px solid ${CORES.borderCard}`, borderLeft: `3px solid ${d.cor}` }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${d.cor}20` }}>
                      <i className={`${d.icone} text-xl`} style={{ color: d.cor }}></i>
                    </div>
                    <div>
                      <h1 className="text-xl md:text-2xl font-extrabold text-white">{d.titulo}</h1>
                      <p className="text-white/40 text-sm"><code className="text-xs px-1.5 py-0.5 rounded" style={{ background: `${d.cor}20`, color: d.cor }}>{d.rota}</code> · {d.desc}</p>
                    </div>
                  </div>
                </div>

                {/* Layout Desktop vs Mobile */}
                <div className="rounded-2xl p-6 md:p-8" style={{ background: CORES.cardBg, border: `1px solid ${CORES.borderCard}` }}>
                  <h2 className="text-lg font-extrabold text-white mb-4 flex items-center gap-2">
                    <i className="ri-layout-line" style={{ color: d.cor }}></i>
                    Layout: Desktop vs Mobile
                  </h2>
                  <div className="grid md:grid-cols-2 gap-5">
                    <div className="p-5 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(34,197,94,0.20)" }}>
                          <i className="ri-computer-line text-sm" style={{ color: CORES.verde }}></i>
                        </span>
                        <h3 className="text-white font-bold text-sm">Desktop (&gt;1024px)</h3>
                      </div>
                      <ul className="space-y-2 text-white/45 text-xs">
                        <li className="flex items-start gap-2"><span className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: CORES.verde }}></span>Sidebar lateral fixa (vereador/assessor/admin) ou top nav + tab bar (empresa/cidadão-vagas)</li>
                        <li className="flex items-start gap-2"><span className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: CORES.verde }}></span>Grid de cards: 2-4 colunas</li>
                        <li className="flex items-start gap-2"><span className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: CORES.verde }}></span>Kanban: 4 colunas lado a lado visíveis</li>
                        <li className="flex items-start gap-2"><span className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: CORES.verde }}></span>Chat: lista + mensagens lado a lado (layout split)</li>
                        <li className="flex items-start gap-2"><span className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: CORES.verde }}></span>Notificações: dropdown alinhado à direita</li>
                      </ul>
                    </div>
                    <div className="p-5 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(59,191,212,0.20)" }}>
                          <i className="ri-smartphone-line text-sm" style={{ color: CORES.teal }}></i>
                        </span>
                        <h3 className="text-white font-bold text-sm">Mobile (&lt;768px)</h3>
                      </div>
                      <ul className="space-y-2 text-white/45 text-xs">
                        <li className="flex items-start gap-2"><span className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: CORES.teal }}></span>Sidebar vira drawer (vereador/assessor) ou bottom nav (cidadão 4 ícones)</li>
                        <li className="flex items-start gap-2"><span className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: CORES.teal }}></span>Grid de cards: 1 coluna (stack vertical)</li>
                        <li className="flex items-start gap-2"><span className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: CORES.teal }}></span>Kanban: scroll horizontal nas colunas</li>
                        <li className="flex items-start gap-2"><span className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: CORES.teal }}></span>Chat: ocupa tela cheia, input fixo inferior</li>
                        <li className="flex items-start gap-2"><span className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: CORES.teal }}></span>Notificações: modal full-width</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Seções do ambiente */}
                <div className="rounded-2xl p-6 md:p-8" style={{ background: CORES.cardBg, border: `1px solid ${CORES.borderCard}` }}>
                  <h2 className="text-lg font-extrabold text-white mb-5">Componentes e Seções</h2>
                  <div className="space-y-4">
                    {d.secoes.map((s) => (
                      <div key={s.titulo} className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <h3 className="text-white font-bold text-sm mb-1.5" style={{ color: d.cor }}>{s.titulo}</h3>
                        <p className="text-white/45 text-xs leading-relaxed">{s.texto}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Funcionalidades */}
                <div className="rounded-2xl p-6 md:p-8" style={{ background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.15)" }}>
                  <h2 className="text-lg font-extrabold text-white mb-4 flex items-center gap-2">
                    <i className="ri-check-double-line" style={{ color: CORES.verde }}></i>
                    Funcionalidades Implementadas
                  </h2>
                  <div className="space-y-1.5">
                    {d.funcionalidades.map((f) => (
                      <div key={f} className="flex items-center gap-2.5 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                        <i className="ri-check-line text-xs" style={{ color: CORES.verde }}></i>
                        <span className="text-white/55 text-sm">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

          {/* ═══════ NOTÍCIAS DO MANDATO ═══════ */}
          {active === "noticias-mandato" && null}

          {/* Seção de notícias (conteúdo real) */}
          {active === "noticias-mandato" && (
            <div className="space-y-8">
              <h1 className="text-2xl font-extrabold text-white mb-1">Notícias do Mandato</h1>
              <p className="text-white/40 text-sm mb-2">{mockNews.length} notícias publicadas no portal · {newsCategories.length} categorias</p>

              {/* Categorias */}
              <div className="flex flex-wrap gap-2">
                {newsCategories.map((cat) => (
                  <span key={cat.name} className="px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: "rgba(232,160,32,0.12)", color: CORES.dourado, border: "1px solid rgba(232,160,32,0.25)" }}>
                    {cat.name} ({cat.count})
                  </span>
                ))}
              </div>

              {/* Lista de notícias */}
              <div className="space-y-5">
                {mockNews.map((n) => (
                  <div key={n.id} className="rounded-2xl overflow-hidden" style={{ background: CORES.cardBg, border: `1px solid ${CORES.borderCard}` }}>
                    {n.image && (
                      <div className="w-full h-48 overflow-hidden">
                        <img src={n.image} alt={n.title} className="w-full h-full object-cover object-top" loading="lazy" />
                      </div>
                    )}
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full" style={{ background: "rgba(232,160,32,0.15)", color: CORES.dourado, border: "1px solid rgba(232,160,32,0.25)" }}>{n.category}</span>
                        <span className="text-white/30 text-xs">{n.date}</span>
                        <span className="text-white/20 text-xs">· {n.views.toLocaleString()} visualizações</span>
                        {n.popular && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.12)", color: CORES.vermelho }}>Destaque</span>
                        )}
                      </div>
                      <h3 className="text-white font-extrabold text-base mb-2">{n.title}</h3>
                      <p className="text-white/45 text-sm leading-relaxed line-clamp-3">{n.summary}</p>
                      <p className="text-white/20 text-xs mt-2">por {n.author} · slug: /noticias/{n.slug}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════ GUIA DO KANBAN ═══════ */}
          {active === "kanban-guia" && (
            <div className="space-y-8">
              <h1 className="text-2xl font-extrabold text-white mb-1">Guia Prático do Kanban</h1>
              <p className="text-white/40 text-sm mb-6">Metodologia de gestão de demandas para a equipe do Arthur. Como usar o quadro Kanban no dia a dia do gabinete.</p>

              <div className="rounded-2xl p-6 md:p-8" style={{ background: CORES.cardBg, border: `1px solid ${CORES.borderCard}` }}>
                <h2 className="text-lg font-extrabold text-white mb-4">O que é o Kanban do Gabinete?</h2>
                <p className="text-white/55 text-sm leading-relaxed mb-4">
                  O Kanban é um método visual de gestão de fluxo de trabalho. No Gabinete Virtual, ele é o coração da operação dos assessores. Cada demanda de cidadão vira um card que se move por 4 colunas, representando seu ciclo de vida.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { coluna: "Em Aberto", cor: "#D97706", icone: "ri-inbox-line", desc: "Demanda nova, recém-chegada. Nenhum assessor assumiu ainda." },
                    { coluna: "Em Andamento", cor: "#3BBFD4", icone: "ri-loader-4-line", desc: "Assessor já está trabalhando ativamente na resolução." },
                    { coluna: "Ag. Resp. Externa", cor: "#7C3AED", icone: "ri-time-line", desc: "Aguardando resposta de órgão externo (prefeitura, estado, etc)." },
                    { coluna: "Finalizada", cor: "#22C55E", icone: "ri-checkbox-circle-line", desc: "Demanda resolvida e encerrada com resposta ao cidadão." },
                  ].map((c) => (
                    <div key={c.coluna} className="p-4 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${c.cor}30` }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ background: `${c.cor}20` }}>
                        <i className={`${c.icone} text-base`} style={{ color: c.cor }}></i>
                      </div>
                      <p className="text-white font-bold text-sm mb-1">{c.coluna}</p>
                      <p className="text-white/40 text-xs leading-relaxed">{c.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl p-6 md:p-8" style={{ background: CORES.cardBg, border: `1px solid ${CORES.borderCard}` }}>
                <h2 className="text-lg font-extrabold text-white mb-4">Rotina Diária da Equipe</h2>
                <p className="text-white/55 text-sm leading-relaxed mb-4">
                  Metodologia recomendada para a equipe de assessores do Vereador Arthur Halal. Este fluxo foi desenhado para maximizar a eficiência e garantir que nenhuma demanda fique sem resposta.
                </p>
                <div className="space-y-4">
                  {[
                    { horario: "08:00 — Início do Dia", titulo: "Revisão do Kanban", texto: "Abra o painel do assessor. Verifique a coluna \"Em Aberto\" — são as novas demandas que chegaram desde ontem. Escolha uma para assumir clicando nela e mudando o status para \"Em Andamento\". Dica: priorize as mais antigas primeiro." },
                    { horario: "09:00–11:00", titulo: "Execução e Atendimento", texto: "Trabalhe nas demandas que estão na coluna \"Em Andamento\". Leia a descrição do cidadão com atenção. Se precisar de informação adicional, use o campo \"Observações do Assessor\" para registrar. Se depender de resposta externa, mova para \"Ag. Resp. Externa\" e anote qual órgão está aguardando." },
                    { horario: "11:00–11:30", titulo: "Chat com Cidadãos", texto: "Verifique a aba \"Mensagens\". Cidadãos podem estar tirando dúvidas sobre suas demandas. Ao entrar em uma conversa, você a assume automaticamente. Responda com clareza e empatia. O histórico fica salvo para contexto futuro." },
                    { horario: "14:00–16:00", titulo: "Resolução e Follow-up", texto: "Retome as demandas em \"Ag. Resp. Externa\". Se já recebeu resposta, mova para \"Em Andamento\" e finalize. Se ainda não, avalie se precisa cobrar o órgão externo. Demandas paradas há mais de 5 dias aparecem com contador amarelo — priorize essas." },
                    { horario: "16:30–17:00", titulo: "Fechamento do Dia", texto: "Finalize as demandas resolvidas: mova para \"Finalizada\" e escreva uma nota explicando a resolução. O cidadão recebe notificação automática. O vereador vê o progresso em tempo real no painel dele. Verifique se não ficou nenhuma demanda sem dono na coluna \"Em Aberto\"." },
                  ].map((r) => (
                    <div key={r.horario} className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <p className="text-xs font-bold mb-1.5" style={{ color: CORES.dourado }}>{r.horario}</p>
                      <h3 className="text-white font-bold text-sm mb-1">{r.titulo}</h3>
                      <p className="text-white/45 text-xs leading-relaxed">{r.texto}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl p-6 md:p-8" style={{ background: CORES.cardBg, border: `1px solid ${CORES.borderCard}` }}>
                <h2 className="text-lg font-extrabold text-white mb-4">Regras de Ouro do Kanban</h2>
                <div className="space-y-3">
                  {[
                    { regra: "Cada assessor edita apenas suas próprias demandas", texto: "O sistema verifica isMine (a demanda foi atribuída a você). Isso evita que um assessor altere o trabalho do colega sem querer." },
                    { regra: "Sempre adicione observações ao mudar status", texto: "Ao mover um card para \"Em Andamento\" ou \"Finalizada\", escreva uma nota. Isso mantém o vereador e o cidadão informados." },
                    { regra: "Priorize por idade, não por preferência", texto: "Use a ordenação \"Mais Antigos\" para ver demandas que estão paradas há mais tempo. O contador de dias na coluna ajuda a identificar urgências." },
                    { regra: "Nunca deixe demanda em \"Em Aberto\" por mais de 24h", texto: "Demandas novas devem ser triadas no mesmo dia. Se ninguém assumir, o badge na sidebar do vereador vai acumular." },
                    { regra: "Use os filtros com sabedoria", texto: "Filtre por tipo (Requerimento/Sugestão/Contato) para focar em um tipo de cada vez. Use a busca para localizar demandas específicas por nome ou título." },
                  ].map((r) => (
                    <div key={r.regra} className="flex items-start gap-3 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-extrabold" style={{ background: "rgba(232,160,32,0.25)", color: CORES.dourado }}>{}</span>
                      <div>
                        <h3 className="text-white font-bold text-sm mb-1">{r.regra}</h3>
                        <p className="text-white/45 text-xs leading-relaxed">{r.texto}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══════ METODOLOGIA ═══════ */}
          {active === "metodologia" && (
            <div className="space-y-8">
              <h1 className="text-2xl font-extrabold text-white mb-1">Metodologia do Gabinete</h1>
              <p className="text-white/40 text-sm mb-6">A metodologia por trás da operação do Gabinete Virtual — combinando Kanban, comunicação em tempo real e dados para decisão.</p>

              <div className="rounded-2xl p-6 md:p-8" style={{ background: CORES.cardBg, border: `1px solid ${CORES.borderCard}` }}>
                <h2 className="text-lg font-extrabold text-white mb-4">Ciclo de Vida de uma Demanda</h2>
                <p className="text-white/45 text-sm mb-5">Do momento em que o cidadão envia até a resolução final, cada demanda percorre um fluxo bem definido:</p>
                <div className="space-y-0">
                  {[
                    { etapa: "1. Entrada", icone: "ri-file-add-line", cor: CORES.dourado, texto: "Cidadão preenche formulário no site (/requerimento, /sugestao-projeto ou /fale-conosco). Demanda é criada no banco com status \"aberto\". Notificação é enviada para admin, vereador e assessores." },
                    { etapa: "2. Triagem", icone: "ri-filter-3-line", cor: CORES.teal, texto: "Assessor revisa a coluna \"Em Aberto\" no Kanban. Lê a demanda, avalia o tipo e a urgência. Assume a demanda clicando nela e mudando o status para \"Em Andamento\"." },
                    { etapa: "3. Execução", icone: "ri-tools-line", cor: "#A855F7", texto: "Assessor trabalha na demanda. Pode adicionar observações, anexar documentos, responder ao cidadão via chat. Se depender de órgão externo, move para \"Ag. Resp. Externa\"." },
                    { etapa: "4. Resolução", icone: "ri-check-double-line", cor: CORES.verde, texto: "Demanda resolvida. Assessor move para \"Finalizada\", escreve nota de conclusão. Cidadão recebe notificação automática. Admin pode adicionar \"Resposta Oficial do Gabinete\"." },
                  ].map((e) => (
                    <div key={e.etapa} className="flex gap-4 pb-6 relative">
                      <div className="flex flex-col items-center shrink-0">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center z-10" style={{ background: `${e.cor}20`, border: `2px solid ${e.cor}40` }}>
                          <i className={`${e.icone} text-base`} style={{ color: e.cor }}></i>
                        </div>
                        <div className="w-0.5 flex-1 mt-1 mb-1" style={{ background: "rgba(255,255,255,0.08)" }}></div>
                      </div>
                      <div className="flex-1 pt-1.5">
                        <h3 className="text-white font-bold text-sm mb-1">{e.etapa}</h3>
                        <p className="text-white/45 text-xs leading-relaxed">{e.texto}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl p-6 md:p-8" style={{ background: CORES.cardBg, border: `1px solid ${CORES.borderCard}` }}>
                <h2 className="text-lg font-extrabold text-white mb-4">Pilares da Metodologia</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { titulo: "Transparência Radical", texto: "Todas as demandas são visíveis para todos os perfis autorizados. O cidadão vê o status. O assessor vê as demandas dos colegas. O vereador vê tudo. Nada fica escondido.", icone: "ri-eye-line", cor: CORES.dourado },
                    { titulo: "Responsabilidade Individual", texto: "Cada demanda tem um dono (assessor). O sistema isMine garante que só o dono edita. Isso cria accountability e evita \"ninguém fez porque achou que o outro faria\".", icone: "ri-user-star-line", cor: CORES.teal },
                    { titulo: "Tempo Real", texto: "14 canais Realtime + polling de fallback garantem que todos vejam as atualizações instantaneamente. Sem F5. Sem \"atualiza a página\". Tudo acontece ao vivo.", icone: "ri-flashlight-fill", cor: CORES.verde },
                    { titulo: "Decisão Baseada em Dados", texto: "O vereador tem dashboards com números reais: quantas demandas, quantas finalizadas, taxa de empregabilidade, eficiência dos assessores. Decisões não são baseadas em achismo.", icone: "ri-bar-chart-box-line", cor: CORES.roxo },
                  ].map((p) => (
                    <div key={p.titulo} className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${p.cor}20` }}>
                        <i className={`${p.icone} text-base`} style={{ color: p.cor }}></i>
                      </div>
                      <h3 className="text-white font-bold text-sm mb-1.5">{p.titulo}</h3>
                      <p className="text-white/45 text-xs leading-relaxed">{p.texto}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══════ TOUR GUIADO ═══════ */}
          {active === "tour" && (
            <div className="space-y-8">
              <h1 className="text-2xl font-extrabold text-white mb-1">Tour Guiado Interativo</h1>
              <p className="text-white/40 text-sm mb-6">Sistema de tour com spotlight que guia novos usuários por cada ambiente. Disponível em 5 perfis.</p>

              <div className="rounded-2xl p-6 md:p-8" style={{ background: CORES.cardBg, border: `1px solid ${CORES.borderCard}` }}>
                <h2 className="text-lg font-extrabold text-white mb-4">Como Funciona</h2>
                <div className="space-y-4">
                  {[
                    { titulo: "Auto-start no Primeiro Acesso", texto: "Cada ambiente dispara o tour automaticamente na primeira vez que o usuário entra. Uma flag no sessionStorage (ah_tour_welcome_{userId}) controla isso. Depois de consumida, o tour nunca mais dispara sozinho." },
                    { titulo: "Botão \"?\" para Rever", texto: "Um botão flutuante dourado com \"?\" no canto inferior direito permite reiniciar o tour a qualquer momento. Disponível em todos os 5 painéis." },
                    { titulo: "Spotlight e Card", texto: "O elemento sendo explicado recebe um spotlight dourado com box-shadow. Um card explicativo aparece próximo, com texto em linguagem gaúcha e botões de navegação (Anterior/Próximo/Pular)." },
                    { titulo: "Transição entre Ambientes", texto: "No cidadão, ao finalizar o tour do /cidadao, se ele tem currículo, é redirecionado para /sistema/painel/cidadao onde o tour de vagas inicia automaticamente." },
                  ].map((t) => (
                    <div key={t.titulo} className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <h3 className="text-white font-bold text-sm mb-1.5" style={{ color: CORES.dourado }}>{t.titulo}</h3>
                      <p className="text-white/45 text-xs leading-relaxed">{t.texto}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl p-6 md:p-8" style={{ background: CORES.cardBg, border: `1px solid ${CORES.borderCard}` }}>
                <h2 className="text-lg font-extrabold text-white mb-4">Tours por Perfil</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-white/70">
                    <thead>
                      <tr className="border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                        <th className="text-left py-2 px-3 text-white/40 font-bold uppercase">Perfil</th>
                        <th className="text-left py-2 px-3 text-white/40 font-bold uppercase">Passos</th>
                        <th className="text-left py-2 px-3 text-white/40 font-bold uppercase">Foco</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["Cidadão (/cidadao)", "9", "Botões de ação, tabs, demandas, notificações"],
                        ["Cidadão Vagas", "9", "Busca, filtros, feed, tabs, perfil, notificações"],
                        ["Vereador", "11", "Sidebar completa (cada item), stats, notificações"],
                        ["Assessor", "9", "Sidebar, Kanban, busca, notificações"],
                        ["Empresa", "7", "Tabs, cards de vagas, criar anúncio, notificações"],
                      ].map((t) => (
                        <tr key={t[0]} className="border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                          <td className="py-2 px-3 font-bold text-white">{t[0]}</td>
                          <td className="py-2 px-3">{t[1]}</td>
                          <td className="py-2 px-3 text-white/45">{t[2]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ═══════ CHAT EM TEMPO REAL ═══════ */}
          {active === "chat" && (
            <div className="space-y-8">
              <h1 className="text-2xl font-extrabold text-white mb-1">Chat em Tempo Real</h1>
              <p className="text-white/40 text-sm mb-6">Sistema de mensagens instantâneas entre cidadãos e o gabinete. Funciona para usuários logados e anônimos.</p>

              <div className="rounded-2xl p-6 md:p-8" style={{ background: CORES.cardBg, border: `1px solid ${CORES.borderCard}` }}>
                <h2 className="text-lg font-extrabold text-white mb-4">Arquitetura do Chat</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { titulo: "ChatBotao (Anônimo)", texto: "Cidadãos não logados podem iniciar conversa via botão flutuante no site. O chat é identificado por sessão. Quando o cidadão se cadastra depois, o histórico é preservado.", icone: "ri-chat-smile-2-line", cor: CORES.dourado },
                    { titulo: "CidadaoChat (Logado)", texto: "Cidadão logado tem chat dedicado no painel /cidadao. Histórico completo. Upload de imagens com compressão. Indicador de digitação.", icone: "ri-user-voice-line", cor: CORES.teal },
                    { titulo: "ChatPanel (Assessor)", texto: "Lista de conversas agrupadas por status (Aguardando/Em Andamento). Assessor assume ao entrar. Indicador de digitação. Respostas com suporte a imagem.", icone: "ri-shield-user-line", cor: "#A855F7" },
                    { titulo: "EmpresaChat", texto: "Chat dedicado da empresa com o gabinete. Similar ao chat do cidadão. Canal direto para dúvidas sobre vagas e candidaturas.", icone: "ri-building-line", cor: CORES.laranja },
                    { titulo: "Vereador (Leitura)", texto: "Modo somente leitura. Vereador visualiza todas as conversas mas não envia mensagens. Indicador de digitação mostra quando assessor ou cidadão está escrevendo.", icone: "ri-eye-line", cor: CORES.verde },
                  ].map((c) => (
                    <div key={c.titulo} className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${c.cor}20` }}>
                        <i className={`${c.icone} text-base`} style={{ color: c.cor }}></i>
                      </div>
                      <h3 className="text-white font-bold text-sm mb-1.5">{c.titulo}</h3>
                      <p className="text-white/45 text-xs leading-relaxed">{c.texto}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl p-6 md:p-8" style={{ background: CORES.cardBg, border: `1px solid ${CORES.borderCard}` }}>
                <h2 className="text-lg font-extrabold text-white mb-4">Indicador de Digitação</h2>
                <p className="text-white/45 text-sm mb-4">Todos os chats do sistema mostram quando a outra pessoa está digitando. Funciona via tabela chat_typing com RLS configurada para permitir anônimos.</p>
                <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: "rgba(59,191,212,0.08)", border: "1px solid rgba(59,191,212,0.15)" }}>
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: CORES.teal }}></span>
                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: CORES.teal, animationDelay: "150ms" }}></span>
                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: CORES.teal, animationDelay: "300ms" }}></span>
                  </div>
                  <span className="text-sm font-medium" style={{ color: CORES.teal }}>Assessor está digitando...</span>
                </div>
              </div>
            </div>
          )}

          {/* ═══════ EXPORTAÇÃO ═══════ */}
          {active === "exportacao" && (
            <div className="space-y-8">
              <h1 className="text-2xl font-extrabold text-white mb-1">Exportação e Impressão</h1>
              <p className="text-white/40 text-sm mb-6">Formatos de exportação disponíveis no sistema.</p>

              <div className="rounded-2xl p-6 md:p-8" style={{ background: CORES.cardBg, border: `1px solid ${CORES.borderCard}` }}>
                <h2 className="text-lg font-extrabold text-white mb-4">Opções de Exportação</h2>
                <div className="space-y-4">
                  {[
                    { titulo: "Relatório de Eficiência (PDF)", texto: "Disponível no painel do vereador, aba Eficiência. Exporta dados de produtividade dos assessores: total atribuído, em andamento, finalizadas, tempo médio de resposta. Gerado via jsPDF.", icone: "ri-file-pdf-line", cor: CORES.vermelho },
                    { titulo: "Relatório de Métricas (PDF)", texto: "Aba Métricas do vereador. Exporta análise completa: distribuição por tipo/status/bairro, indicadores de empregabilidade, cidadãos com/sem pesquisa.", icone: "ri-pie-chart-line", cor: CORES.roxo },
                    { titulo: "Resumo do Sistema (PDF)", texto: "Rota /admin/resumo. Documento completo com todos os dados do sistema para apresentação. Acessível pelo admin.", icone: "ri-file-chart-line", cor: CORES.teal },
                    { titulo: "Documentação (A3 PDF)", texto: "Esta página. Use o botão \"Exportar PDF (A3)\" na sidebar. O documento é formatado para impressão em A3 com margens de 15mm.", icone: "ri-printer-line", cor: CORES.dourado },
                  ].map((e) => (
                    <div key={e.titulo} className="flex items-start gap-3 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${e.cor}20` }}>
                        <i className={`${e.icone} text-base`} style={{ color: e.cor }}></i>
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-sm mb-1">{e.titulo}</h3>
                        <p className="text-white/45 text-xs leading-relaxed">{e.texto}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ========== ESTILOS DE IMPRESSÃO A3 ========== */}
      <style>{`
        @media print {
          /* Remove sidebar, mobile nav, backgrounds escuros */
          aside, .xl\\:hidden, .print\\:hidden, button:not(.keep-print) {
            display: none !important;
          }

          /* Força fundo branco e texto escuro */
          body, main, .min-h-screen, [style*="background"] {
            background: white !important;
            color: #111 !important;
          }

          /* A3 com margens */
          @page {
            size: A3;
            margin: 15mm;
          }

          /* Conteúdo principal ocupa tudo */
          main {
            margin-left: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }

          /* Ajusta cards e containers */
          [class*="rounded-2xl"], [class*="rounded-3xl"] {
            border: 1px solid #e0e0e0 !important;
            background: white !important;
            box-shadow: none !important;
            break-inside: avoid;
          }

          /* Texto branco vira escuro */
          .text-white, [class*="text-white"] {
            color: #111 !important;
          }

          /* Texto transparente vira cinza */
          [class*="text-white/"], [class*="text-white\\/"] {
            color: #555 !important;
          }

          /* Links mantêm cor */
          a {
            color: #0369A1 !important;
          }

          /* Códigos e badges */
          code {
            background: #f3f4f6 !important;
            color: #111 !important;
          }

          /* Esconde elementos decorativos */
          .animate-pulse, .animate-bounce, .animate-spin {
            animation: none !important;
          }

          /* Tamanhos de fonte ajustados */
          h1 { font-size: 24pt !important; }
          h2 { font-size: 18pt !important; }
          h3 { font-size: 14pt !important; }
          p, li, td, span { font-size: 10pt !important; }
        }
      `}</style>
    </div>
  );
}