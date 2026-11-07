import type { TourDefinition } from "@/hooks/useTour";

export const vereadorTour: TourDefinition = {
  id: "vereador",
  name: "Painel do Mandato",
  steps: [
    {
      // NotificationBell — visível em desktop (acima main) e mobile (acima main)
      // Há dois wrappers com data-tour="vereador-notificacoes", o TourGuide usa o visível
      target: "[data-tour=\"vereador-notificacoes\"]",
      icon: "ri-notification-3-line",
      title: "Central de notificações",
      description: "O sininho te avisa de tudo: nova demanda, assessor que assumiu, cidadão novo, vaga publicada. Nada escapa!",
      position: "bottom",
    },
    {
      // Stats grid — visível na aba overview (grid de 4 cards)
      target: "[data-tour=\"vereador-stats\"]",
      icon: "ri-line-chart-line",
      title: "Visão geral do mandato",
      description: "Aqui tu vê de relance: demandas em aberto, em andamento, finalizadas e vagas ativas. Teu painel de controle!",
      position: "bottom",
    },
    {
      // Relatório de Empregabilidade — visível na aba overview
      target: "[data-tour=\"vereador-empregabilidade\"]",
      icon: "ri-bar-chart-line",
      title: "Empregabilidade da cidade",
      description: "Quantos cidadãos cadastrados, procurando emprego, empregados e com currículo. A taxa é calculada automaticamente!",
      position: "top",
    },
    {
      // Título de demandas recentes — visível na aba overview
      target: "[data-tour=\"vereador-demandas-recentes\"]",
      icon: "ri-file-list-line",
      title: "Demandas recentes",
      description: "As demandas mais novas aparecem aqui. Clica pra ver detalhes: quem pediu, qual assessor assumiu, o status atual.",
      position: "top",
    },
    {
      // Botão Demandas — sidebar desktop E bottom nav mobile
      target: "[data-tour=\"vereador-demandas-btn\"]",
      icon: "ri-file-list-3-line",
      title: "Todas as demandas",
      description: "Nessa aba tu vê TODAS as demandas do sistema em lista ou kanban. Filtra por status, busca por nome ou #ID.",
      position: "right",
    },
    {
      // Botão Eficiência — sidebar desktop E bottom nav mobile
      target: "[data-tour=\"vereador-eficiencia\"]",
      icon: "ri-bar-chart-line",
      title: "Eficiência dos assessores",
      description: "Em Eficiência tu vê o desempenho de cada assessor: quantas demandas assumiu, finalizou e tempo médio de resposta.",
      position: "right",
    },
    {
      // Botão Métricas — sidebar desktop E bottom nav mobile
      target: "[data-tour=\"vereador-metricas\"]",
      icon: "ri-pie-chart-line",
      title: "Métricas do sistema",
      description: "Em Métricas tu vê gráficos completos: distribuição por tipo, por bairro, por status. Dados reais pra tomar decisões!",
      position: "right",
    },
    {
      // Botão Vagas — sidebar desktop E bottom nav mobile
      target: "[data-tour=\"vereador-vagas-btn\"]",
      icon: "ri-briefcase-4-line",
      title: "Vagas de emprego",
      description: "Aqui tu acompanha todas as vagas publicadas pelas empresas da cidade. Clica em Saiba Mais pra ver os candidatos.",
      position: "right",
    },
    {
      // Botão Conversas — sidebar desktop E bottom nav mobile
      target: "[data-tour=\"vereador-conversas-btn\"]",
      icon: "ri-chat-3-line",
      title: "Conversas dos cidadãos",
      description: "Acompanha os chats em tempo real entre cidadãos e assessores em modo leitura. Vê quem está aguardando atendimento!",
      position: "right",
    },
    {
      // Botão Agenda — sidebar desktop E bottom nav mobile
      target: "[data-tour=\"vereador-agenda-btn\"]",
      icon: "ri-calendar-line",
      title: "Agenda de compromissos",
      description: "Cria e gerencia teus compromissos políticos. Recebe lembretes por email antes de cada evento. Tua agenda digital!",
      position: "right",
    },
  ],
};