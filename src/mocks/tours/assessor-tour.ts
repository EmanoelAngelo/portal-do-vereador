import type { TourDefinition } from "@/hooks/useTour";

export const assessorTour: TourDefinition = {
  id: "assessor",
  name: "Painel do Assessor",
  steps: [
    {
      // Notificações — visível em desktop e mobile (ambos têm data-tour)
      target: "[data-tour=\"assessor-notificacoes\"]",
      icon: "ri-notification-3-line",
      title: "Não perde nada!",
      description: "O sininho te avisa quando chega demanda nova, mensagem no chat, ou ação do vereador/admin. Tudo em tempo real!",
      position: "bottom",
    },
    {
      // KanbanBoard wrapper — sempre visível quando aba kanban está ativa
      // O assessor começa na aba kanban, então este elemento sempre estará visível
      target: "[data-tour=\"assessor-kanban\"]",
      icon: "ri-layout-column-line",
      title: "Kanban de demandas",
      description: "As demandas em colunas: Em Aberto, Em Andamento, Aguardando Externa e Finalizadas. Clica em qualquer card pra ver detalhes e responder!",
      position: "bottom",
    },
    {
      // Input de busca — visível quando aba kanban está ativa
      target: "[data-tour=\"assessor-search\"]",
      icon: "ri-search-line",
      title: "Busca rápida",
      description: "Digita nome, bairro ou palavra-chave. Filtra por tipo: Todos, Requerimentos, Sugestões ou Contatos. Acha qualquer demanda em segundos!",
      position: "bottom",
    },
    {
      // Botão Mensagens — sidebar desktop E bottom nav mobile
      target: "[data-tour=\"assessor-mensagens\"]",
      icon: "ri-chat-3-line",
      title: "Mensagens dos cidadãos",
      description: "Na aba Mensagens tu vê os chats dos cidadãos. Ao entrar numa conversa, tu a assume automaticamente. O vereador acompanha em modo leitura!",
      position: "right",
    },
    {
      // Botão Usuários — sidebar desktop E bottom nav mobile
      target: "[data-tour=\"assessor-usuarios\"]",
      icon: "ri-group-line",
      title: "Usuários da plataforma",
      description: "Em Usuários tu vê todos cadastrados: cidadãos, empresas, outros assessores. Clica em Saiba Mais pra ver perfil completo e currículo.",
      position: "right",
    },
    {
      // Botão Vagas — sidebar desktop E bottom nav mobile
      target: "[data-tour=\"assessor-vagas-btn\"]",
      icon: "ri-briefcase-4-line",
      title: "Vagas de emprego",
      description: "Aqui tu acompanha as vagas publicadas pelas empresas. Útil pra indicar oportunidades quando um cidadão pedir orientação!",
      position: "right",
    },
    {
      // Botão Agenda — sidebar desktop E bottom nav mobile
      target: "[data-tour=\"assessor-agenda-btn\"]",
      icon: "ri-calendar-line",
      title: "Tua agenda",
      description: "Organiza teus compromissos de trabalho. Reuniões, visitas, prazos — tudo num só lugar. Receba lembretes por email!",
      position: "right",
    },
  ],
};