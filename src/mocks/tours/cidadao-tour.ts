import type { TourDefinition } from "@/hooks/useTour";

export const cidadaoTour: TourDefinition = {
  id: "cidadao",
  name: "Painel do Cidadão",
  steps: [
    {
      // Botão Novo Requerimento — Link com id único, sempre visível
      target: "#cidadao-requerimento-btn",
      icon: "ri-file-add-line",
      title: "Faz teu requerimento, tchê!",
      description: "Precisa de algo da prefeitura? Clica nesse botão e manda teu requerimento. O gabinete recebe na hora e um assessor assume teu caso.",
      position: "bottom",
    },
    {
      // Botão Sugerir Projeto — sempre visível
      target: "#cidadao-sugestao-btn",
      icon: "ri-lightbulb-line",
      title: "Tem uma baita ideia? Sugere!",
      description: "Achou que falta algo no teu bairro? Iluminação, praça, asfalto... Manda tua sugestão de projeto aqui. O vereador pode transformar em projeto de lei.",
      position: "bottom",
    },
    {
      // Botão Vagas de Emprego — sempre visível
      target: "#cidadao-vagas-link-btn",
      icon: "ri-briefcase-4-line",
      title: "Procurando trampo?",
      description: "Clica aqui pra acessar o mural de oportunidades de emprego em Pelotas. Empresas da região publicam direto. Se tiver currículo, pode se candidatar!",
      position: "bottom",
    },
    {
      // Tabs — ambas as navs (desktop tabs E mobile bottom nav) têm data-tour="cidadao-tabs"
      // O TourGuide vai usar a VISÍVEL
      target: "[data-tour=\"cidadao-tabs\"]",
      icon: "ri-layout-line",
      title: "Navega entre as áreas",
      description: "Esses botões te levam pras seções: Demandas (teus requerimentos), Mensagens (chat com gabinete), Vagas (oportunidades) e Perfil (teus dados).",
      position: "bottom",
    },
    {
      // Aba de Vagas — botão da tab de vagas (desktop e mobile)
      target: "[data-tour=\"cidadao-vagas\"]",
      icon: "ri-briefcase-4-line",
      title: "Acompanha tuas vagas",
      description: "Aqui tu encontra todas as oportunidades de emprego disponíveis em Pelotas. Filtra por área, tipo de contrato e candidata-se direto pela plataforma.",
      position: "top",
    },
    {
      // Filtro de demandas — sempre visível quando tab demandas está ativa
      target: "[data-tour=\"cidadao-demandas\"]",
      icon: "ri-file-list-line",
      title: "Acompanha tuas demandas",
      description: "Aqui tão todos os requerimentos e sugestões que tu enviou. Clica em qualquer um pra ver o status e a resposta do assessor. Filtra por tipo usando os botões acima.",
      position: "top",
    },
    {
      // NotificationBell — visível em desktop e mobile
      target: "[data-tour=\"cidadao-notificacoes\"]",
      icon: "ri-notification-3-line",
      title: "Fica ligado nas notificações!",
      description: "O sininho te avisa de tudo: demanda atualizada, resposta do gabinete, candidatura aprovada. Não perde nada, tchê!",
      position: "bottom",
    },
  ],
};