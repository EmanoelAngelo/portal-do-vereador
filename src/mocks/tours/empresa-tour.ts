import type { TourDefinition } from "@/hooks/useTour";

export const empresaTour: TourDefinition = {
  id: "empresa",
  name: "Painel da Empresa",
  steps: [
    {
      // Notificações — visível no top nav sempre
      target: "[data-tour=\"empresa-notificacoes\"]",
      icon: "ri-notification-3-line",
      title: "Notificações importantes",
      description: "O sininho te avisa quando chega candidatura nova, quando o admin/vereador interage com tuas vagas e quando tem mensagem do gabinete.",
      position: "bottom",
    },
    {
      // Container das tabs — no nav, sempre visível
      target: "[data-tour=\"empresa-tabs\"]",
      icon: "ri-building-line",
      title: "Teu painel empresarial!",
      description: "Essas abas são teu menu: Minhas Vagas, Criar Anúncio, Banco de Currículos e Mensagens. Navega clicando em cada uma!",
      position: "bottom",
    },
    {
      // Lista de vagas — visível quando aba vagas está ativa
      target: "[data-tour=\"empresa-vagas-lista\"]",
      icon: "ri-briefcase-line",
      title: "Tuas vagas publicadas",
      description: "Aqui tão todas as vagas ativas. Vê quantos candidatos cada uma recebeu, edita, pausa ou encerra. Quando encerrar, registra se contratou!",
      position: "bottom",
    },
    {
      // Aba criar — botão individual no nav
      target: "[data-tour=\"empresa-criar\"]",
      icon: "ri-megaphone-line",
      title: "Publica uma vaga nova!",
      description: "Na aba Criar Anúncio, preenche título, área, tipo de contrato, salário e descrição. Assim que publicar, aparece no feed de todos os cidadãos. É gratuito!",
      position: "bottom",
    },
    {
      // Aba currículos — botão individual no nav
      target: "[data-tour=\"empresa-curriculos\"]",
      icon: "ri-folder-user-line",
      title: "Banco de talentos da cidade",
      description: "Na aba Banco de Currículos tu vê Minhas Candidaturas e Todos Profissionais. Filtra por área, formação e categoria de prestador!",
      position: "bottom",
    },
    {
      // Aba mensagens — botão individual no nav
      target: "[data-tour=\"empresa-mensagens\"]",
      icon: "ri-chat-3-line",
      title: "Fala com o gabinete",
      description: "Na aba Mensagens tu conversa direto com a equipe do vereador Arthur Halal. Dúvidas, sugestões, parcerias — canal direto, sem burocracia!",
      position: "bottom",
    },
  ],
};