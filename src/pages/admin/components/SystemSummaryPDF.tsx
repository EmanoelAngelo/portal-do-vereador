import { useRef } from 'react';

const BRAND = {
  dark: '#0D1629',
  navy: '#1B2A5E',
  amber: '#E8A020',
  teal: '#3BBFD4',
  white: '#FFFFFF',
};

const users = [
  {
    role: 'Vereador',
    name: 'Arthur Halal',
    email: 'vereador@arthurhalal.com.br',
    password: 'CONFIGURE_EM_AMBIENTE_DE_TESTE',
    panel: '/vereador',
    description: 'Acesso total ao painel do vereador. Visualiza demandas, notícias, estatísticas e gerencia todo o sistema.',
    badgeBg: BRAND.amber,
    badgeText: BRAND.dark,
    borderColor: BRAND.amber,
  },
  {
    role: 'Administrador',
    name: 'Administrador',
    email: 'admin@arthurhalal.com.br',
    password: 'CONFIGURE_EM_AMBIENTE_DE_TESTE',
    panel: '/admin',
    description: 'Acesso ao painel administrativo com permissões de gerenciamento geral do sistema.',
    badgeBg: BRAND.navy,
    badgeText: BRAND.white,
    borderColor: BRAND.navy,
  },
  {
    role: 'Assessor',
    name: 'Carlos Assessor',
    email: 'assessor@arthurhalal.com.br',
    password: 'CONFIGURE_EM_AMBIENTE_DE_TESTE',
    panel: '/assessor/painel',
    description: 'Acesso ao painel do assessor: gerencia demandas via kanban, chat com cidadãos e publicação de notícias.',
    badgeBg: BRAND.teal,
    badgeText: BRAND.dark,
    borderColor: BRAND.teal,
  },
  {
    role: 'Cidadão (Teste)',
    name: 'João Silva',
    email: 'cidadao.teste@gmail.com',
    password: 'CONFIGURE_EM_AMBIENTE_DE_TESTE',
    panel: '/cidadao',
    description: 'Conta de teste de cidadão. Acesso ao painel pessoal, acompanhamento de demandas e candidaturas a vagas.',
    badgeBg: '#2E7D32',
    badgeText: BRAND.white,
    borderColor: '#2E7D32',
  },
  {
    role: 'Cidadão (Teste)',
    name: 'Emanoel Angelo',
    email: 'desenvolvedor@example.com',
    password: 'CONFIGURE_EM_AMBIENTE_DE_TESTE',
    panel: '/cidadao',
    description: 'Conta de teste de cidadão. Acesso ao painel pessoal, acompanhamento de demandas e candidaturas a vagas.',
    badgeBg: '#2E7D32',
    badgeText: BRAND.white,
    borderColor: '#2E7D32',
  },
  {
    role: 'Empresa (Teste)',
    name: 'Construtora Exemplo',
    email: 'empresa.teste@gmail.com',
    password: 'CONFIGURE_EM_AMBIENTE_DE_TESTE',
    panel: '/sistema/painel/empresa',
    description: 'Conta de teste de empresa. Acesso ao painel empresarial para publicação e gestão de vagas de emprego.',
    badgeBg: '#6A1B9A',
    badgeText: BRAND.white,
    borderColor: '#6A1B9A',
  },
];

const pages = [
  { label: 'Home / Site Público', url: '/', desc: 'Página inicial com apresentação do vereador, notícias e serviços.' },
  { label: 'Notícias', url: '/noticias', desc: 'Listagem de todas as notícias publicadas.' },
  { label: 'Oportunidades / Vagas', url: '/oportunidades', desc: 'Vagas de emprego publicadas pelas empresas parceiras.' },
  { label: 'Fale Conosco', url: '/fale-conosco', desc: 'Formulário de contato direto com o gabinete.' },
  { label: 'Requerimento', url: '/requerimento', desc: 'Envio de requerimentos formais ao vereador.' },
  { label: 'Sugestão de Projeto', url: '/sugestao-projeto', desc: 'Canal para sugestões de projetos de lei.' },
  { label: 'Painel Vereador', url: '/vereador', desc: 'Painel exclusivo do vereador Arthur Halal.' },
  { label: 'Painel Admin', url: '/admin', desc: 'Painel administrativo para gerenciamento do sistema.' },
  { label: 'Painel Assessor', url: '/assessor/painel', desc: 'Painel do assessor com kanban e comunicação.' },
  { label: 'Painel Cidadão', url: '/cidadao', desc: 'Painel pessoal do cidadão cadastrado.' },
  { label: 'Painel Empresa', url: '/sistema/painel/empresa', desc: 'Painel empresarial para gestão de vagas.' },
  { label: 'Setup do Sistema', url: '/setup', desc: 'Página para recriar usuários e configurações iniciais.' },
];

const features = [
  { icon: 'ri-megaphone-line', title: 'Notícias', desc: 'Publicação e gestão de notícias pelo painel admin/assessor com visualização pública.' },
  { icon: 'ri-task-line', title: 'Demandas (Kanban)', desc: 'Cidadãos enviam demandas; assessores gerenciam via quadro kanban com status e mensagens.' },
  { icon: 'ri-briefcase-line', title: 'Vagas de Emprego', desc: 'Empresas publicam vagas; cidadãos se candidatam e acompanham o status.' },
  { icon: 'ri-chat-3-line', title: 'Chat Interno', desc: 'Sistema de mensagens entre cidadãos, assessores e o gabinete em tempo real.' },
  { icon: 'ri-file-list-3-line', title: 'Requerimentos', desc: 'Canal formal para envio de requerimentos ao vereador com protocolo.' },
  { icon: 'ri-lightbulb-line', title: 'Sugestão de Projetos', desc: 'Cidadãos podem sugerir ideias de projetos de lei diretamente ao gabinete.' },
];

export default function SystemSummaryPDF() {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen p-6" style={{ background: '#F0F2F5' }}>

      {/* Botão de impressão — não aparece no PDF */}
      <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center print:hidden">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: BRAND.navy }}>Resumo do Sistema</h1>
          <p className="text-sm mt-1" style={{ color: '#64748B' }}>Clique no botão para salvar como PDF</p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 text-white px-6 py-3 rounded-lg font-semibold transition-opacity hover:opacity-90 cursor-pointer whitespace-nowrap"
          style={{ background: BRAND.navy }}
        >
          <span className="w-5 h-5 flex items-center justify-center">
            <i className="ri-file-pdf-line text-lg"></i>
          </span>
          Baixar PDF
        </button>
      </div>

      {/* ═══════════════════════════════════════════
          DOCUMENTO — toda área printável
      ═══════════════════════════════════════════ */}
      <div
        ref={printRef}
        id="pdf-content"
        className="max-w-4xl mx-auto overflow-hidden"
        style={{ background: BRAND.dark, borderRadius: '12px' }}
      >

        {/* ── CABEÇALHO ── */}
        <div
          className="relative px-10 py-8"
          style={{
            background: `linear-gradient(135deg, ${BRAND.dark} 0%, ${BRAND.navy} 60%, ${BRAND.dark} 100%)`,
            overflow: 'hidden',
          }}
        >
          {/* Linha decorativa topo */}
          <div
            className="absolute top-0 left-0 right-0 h-1"
            style={{ background: `linear-gradient(to right, transparent, ${BRAND.teal}, ${BRAND.amber}, transparent)` }}
          />


          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p
                className="text-xs font-bold tracking-widest uppercase mb-2"
                style={{ color: BRAND.teal }}
              >
                Vereador · Pelotas / RS
              </p>
              <h1 className="text-4xl font-black leading-none tracking-tight">
                <span style={{ color: BRAND.white }}>ARTHUR </span>
                <span
                  className="px-2 py-0.5 rounded-md inline-block"
                  style={{ background: BRAND.amber, color: BRAND.dark }}
                >
                  HALAL
                </span>
              </h1>
              <div className="flex items-center gap-2 mt-3">
                <div className="h-0.5 w-8 rounded-full" style={{ background: BRAND.amber }} />
                <div className="h-0.5 w-14 rounded-full opacity-50" style={{ background: BRAND.teal }} />
                <p className="text-xs tracking-widest uppercase whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Mandato 2024–2028 · PP · Câmara Municipal
                </p>
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Documento gerado em</p>
              <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: "America/Sao_Paulo" })}
              </p>
              <div
                className="mt-3 text-xs px-3 py-1 rounded border"
                style={{ color: BRAND.amber, borderColor: `${BRAND.amber}40` }}
              >
                USO INTERNO — CONFIDENCIAL
              </div>
            </div>
          </div>

          {/* Stats rápidas */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            {[
              { label: 'Perfis de Acesso', value: '6', icon: 'ri-group-line', color: BRAND.teal },
              { label: 'Páginas Públicas', value: '7', icon: 'ri-pages-line', color: BRAND.amber },
              { label: 'Painéis Privativos', value: '5', icon: 'ri-dashboard-line', color: BRAND.teal },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl p-4 text-center"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div className="w-7 h-7 flex items-center justify-center mx-auto mb-2">
                  <i className={`${stat.icon} text-lg`} style={{ color: stat.color }}></i>
                </div>
                <p className="text-3xl font-black" style={{ color: BRAND.white }}>{stat.value}</p>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── CORPO DO DOCUMENTO ── */}
        <div className="px-10 py-8 space-y-8" style={{ background: BRAND.dark }}>

          {/* SEÇÃO: Sobre */}
          <Section title="Sobre o Sistema" icon="ri-information-line">
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Plataforma digital completa do gabinete do Vereador Arthur Halal (Pelotas/RS). O sistema
              conta com site público institucional, painéis privativos para diferentes perfis de acesso
              e integração com banco de dados Supabase para gerenciamento de demandas, notícias, vagas
              de emprego e comunicação entre cidadãos, empresas, assessores e o vereador.
            </p>
          </Section>

          {/* SEÇÃO: Credenciais */}
          <Section title="Credenciais de Acesso" icon="ri-lock-line">
            <div className="space-y-3">
              {users.map((u) => (
                <div
                  key={u.email}
                  className="rounded-xl overflow-hidden"
                  style={{ border: `1px solid rgba(255,255,255,0.08)` }}
                >
                  {/* Header do card */}
                  <div
                    className="px-4 py-2.5 flex items-center justify-between"
                    style={{
                      background: `rgba(255,255,255,0.05)`,
                      borderLeft: `3px solid ${u.borderColor}`,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                        style={{ background: u.badgeBg, color: u.badgeText }}
                      >
                        {u.role}
                      </span>
                      <span className="text-sm font-semibold" style={{ color: BRAND.white }}>
                        {u.name}
                      </span>
                    </div>
                    <span className="text-xs font-mono" style={{ color: BRAND.teal }}>{u.panel}</span>
                  </div>

                  {/* Corpo do card */}
                  <div className="px-4 py-3 grid grid-cols-2 gap-4">
                    <div>
                      <p
                        className="text-xs uppercase tracking-widest mb-1.5"
                        style={{ color: 'rgba(255,255,255,0.3)' }}
                      >
                        E-mail
                      </p>
                      <div
                        className="px-3 py-1.5 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                      >
                        <p className="text-sm font-mono" style={{ color: 'rgba(255,255,255,0.85)' }}>{u.email}</p>
                      </div>
                    </div>
                    <div>
                      <p
                        className="text-xs uppercase tracking-widest mb-1.5"
                        style={{ color: 'rgba(255,255,255,0.3)' }}
                      >
                        Senha
                      </p>
                      <div
                        className="px-3 py-1.5 rounded-lg"
                        style={{ background: `${BRAND.amber}18`, border: `1px solid ${BRAND.amber}35` }}
                      >
                        <p className="text-sm font-mono font-bold" style={{ color: BRAND.amber }}>{u.password}</p>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{u.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Aviso */}
            <div
              className="mt-4 rounded-xl p-3 flex gap-3"
              style={{
                background: `${BRAND.amber}12`,
                border: `1px solid ${BRAND.amber}30`,
              }}
            >
              <span className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                <i className="ri-alert-line text-sm" style={{ color: BRAND.amber }}></i>
              </span>
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                <span className="font-bold" style={{ color: BRAND.amber }}>Importante:</span>{' '}
                Para redefinir senhas ou recriar usuários do sistema, acesse{' '}
                <span className="font-mono font-bold" style={{ color: BRAND.teal }}>/admin/setup</span>{' '}
                com o Admin Master. Cidadãos e empresas se cadastram livremente pelo site público.
              </p>
            </div>
          </Section>

          {/* SEÇÃO: Mapa de Páginas */}
          <Section title="Mapa de Páginas" icon="ri-map-line">
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-widest w-1/4"
                      style={{ color: 'rgba(255,255,255,0.35)' }}>Página</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-widest w-1/5"
                      style={{ color: 'rgba(255,255,255,0.35)' }}>URL</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-widest"
                      style={{ color: 'rgba(255,255,255,0.35)' }}>Descrição</th>
                  </tr>
                </thead>
                <tbody>
                  {pages.map((page, i) => (
                    <tr
                      key={page.url}
                      style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.025)' }}
                    >
                      <td
                        className="px-4 py-2 text-xs font-medium"
                        style={{ color: BRAND.white, borderTop: '1px solid rgba(255,255,255,0.05)' }}
                      >
                        {page.label}
                      </td>
                      <td
                        className="px-4 py-2 text-xs font-mono"
                        style={{ color: BRAND.teal, borderTop: '1px solid rgba(255,255,255,0.05)' }}
                      >
                        {page.url}
                      </td>
                      <td
                        className="px-4 py-2 text-xs"
                        style={{ color: 'rgba(255,255,255,0.45)', borderTop: '1px solid rgba(255,255,255,0.05)' }}
                      >
                        {page.desc}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* SEÇÃO: Funcionalidades */}
          <Section title="Funcionalidades Principais" icon="ri-flashlight-line">
            <div className="grid grid-cols-2 gap-3">
              {features.map((feat) => (
                <div
                  key={feat.title}
                  className="flex gap-3 p-3.5 rounded-xl"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${BRAND.amber}20` }}
                  >
                    <i className={`${feat.icon} text-base`} style={{ color: BRAND.amber }}></i>
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: BRAND.white }}>{feat.title}</p>
                    <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                      {feat.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* RODAPÉ do documento */}
          <div
            className="flex justify-between items-center pt-4"
            style={{ borderTop: `1px solid rgba(255,255,255,0.08)` }}
          >
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
              Gabinete do Vereador Arthur Halal · Pelotas / RS
            </p>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full" style={{ background: BRAND.teal }} />
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>Documento confidencial — uso interno</p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ ESTILOS DE IMPRESSÃO ═══════ */}
      <style>{`
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { margin: 0; background: #0D1629 !important; }
          .print\\:hidden { display: none !important; }
          #pdf-content {
            box-shadow: none !important;
            border-radius: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          @page {
            margin: 0.5cm;
            size: A4;
          }
        }
      `}</style>
    </div>
  );
}

/* Componente auxiliar de seção */
function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: `${BRAND.amber}25` }}
        >
          <i className={`${icon} text-sm`} style={{ color: BRAND.amber }}></i>
        </div>
        <h2 className="text-base font-bold" style={{ color: BRAND.white }}>{title}</h2>
        <div className="flex-1 h-px ml-2" style={{ background: 'rgba(255,255,255,0.07)' }} />
      </div>
      {children}
    </section>
  );
}