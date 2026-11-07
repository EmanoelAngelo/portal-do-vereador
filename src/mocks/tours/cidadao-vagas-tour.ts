import type { TourDefinition } from "@/hooks/useTour";

export const cidadaoVagasTour: TourDefinition = {
  id: "cidadao-vagas",
  name: "Oportunidades de Emprego",
  steps: [
    {
      // Input de busca — no top nav, sempre visível em desktop e mobile
      target: "[data-tour=\"vagas-search\"]",
      icon: "ri-search-line",
      title: "Busca a vaga ideal pra ti",
      description: "Digita o cargo, empresa ou área. O sistema filtra na hora. Motorista, atendente, técnico... aparece aqui!",
      position: "bottom",
    },
    {
      // Filtros de área — visível quando aba feed está ativa
      target: "[data-tour=\"vagas-areas\"]",
      icon: "ri-filter-3-line",
      title: "Filtra por área",
      description: "Clica nas áreas: Administrativo, Tecnologia, Saúde, Construção... Assim tu vê só as vagas do teu perfil.",
      position: "bottom",
    },
    {
      // Filtros de tipo — visível quando aba feed está ativa
      target: "[data-tour=\"vagas-tipos\"]",
      icon: "ri-file-text-line",
      title: "Escolhe o tipo de contrato",
      description: "CLT, PJ, Freelance, Estágio... Seleciona aqui e o feed mostra só o que tu quer.",
      position: "bottom",
    },
    {
      // Feed de vagas — visível quando aba feed está ativa
      target: "[data-tour=\"vagas-feed\"]",
      icon: "ri-file-list-3-line",
      title: "As vagas aparecem aqui!",
      description: "Cada card é uma oportunidade real com nome, empresa, área, salário. Clica pra ver detalhes e se candidatar!",
      position: "top",
    },
    {
      // Tabs de navegação — desktop (hidden md:flex) OU mobile (flex md:hidden) — o TourGuide usa o visível
      target: "[data-tour=\"vagas-tabs\"]",
      icon: "ri-layout-line",
      title: "Feed, Candidaturas e Prestadores",
      description: "Feed mostra as vagas. Candidaturas mostra onde tu já se candidatou. Prestadores mostra profissionais da região.",
      position: "bottom",
    },
    {
      // Perfil — no top nav (data-tour adicionado no wrapper do avatar), visível em desktop e mobile
      target: "[data-tour=\"vagas-perfil\"]",
      icon: "ri-user-settings-line",
      title: "Teu perfil profissional",
      description: "Aqui tu mantém teus dados, currículo e foto. Quanto mais completo, mais chances de ser contratado!",
      position: "bottom",
    },
    {
      // NotificationBell — visível em desktop e mobile
      target: "[data-tour=\"vagas-notificacoes\"]",
      icon: "ri-notification-3-line",
      title: "Fica esperto!",
      description: "Quando a empresa aprovar ou recusar tua candidatura, o sininho te avisa na hora. Vaga nova também!",
      position: "bottom",
    },
  ],
};