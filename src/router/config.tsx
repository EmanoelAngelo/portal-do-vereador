import type { RouteObject } from "react-router-dom";
import NotFound from "@/pages/NotFound";
import Home from "@/pages/home/page";
import VagaPublicaPage from "@/pages/sistema/vaga/[id]/page";
import NoticiasPage from "@/pages/noticias/page";
import NewsDetailPage from "@/pages/noticias/[slug]/page";
import FaleConoscoPage from "@/pages/fale-conosco/page";
import AuthPage from "@/pages/auth/page";
import RequerimentoPage from "@/pages/requerimento/page";
import SugestaoProjetoPage from "@/pages/sugestao-projeto/page";
import CidadaoPage from "@/pages/cidadao/page";
import EmpresaPage from "@/pages/empresa/page";
import VereadorPage from "@/pages/vereador/page";
import AdminPage from "@/pages/admin/page";
import SystemSummaryPDF from "@/pages/admin/components/SystemSummaryPDF";
import AssessorEntryPage from "@/pages/assessor/page";
import AssessorPainelPage from "@/pages/assessor/painel/page";
import SetupPage from "@/pages/setup/page";

// Sistema de Oportunidades — nova versão
import SistemaPage from "@/pages/sistema/page";
import SistemaCidadaoPage from "@/pages/sistema/painel/cidadao/page";
import SistemaEmpresaPage from "@/pages/sistema/painel/empresa/page";
import PerfilPublicoPage from "@/pages/sistema/perfil/page";
import LoginOportunidadesPage from "@/pages/oportunidades/login/page";
import CadastroCidadaoPage from "@/pages/oportunidades/cadastro/cidadao/page";
import CadastroEmpresaPage from "@/pages/oportunidades/cadastro/empresa/page";
import CadastroAssessorPage from "@/pages/oportunidades/cadastro/assessor/page";
import CompleteProfilePage from "@/pages/complete-profile/page";
import DocumentacaoPage from "@/pages/documentacao/page";
// Currículo
import CurriculoDicasPage from "@/pages/cidadao/curriculo/dicas/page";
import CurriculoCriarPage from "@/pages/cidadao/curriculo/criar/page";
import CurriculoPreviewPage from "@/pages/cidadao/curriculo/preview/page";
import PrevisaoTempoPage from "@/pages/previsao-tempo/page";

const routes: RouteObject[] = [
  // ── Site público ──────────────────────────────────────────
  { path: "/", element: <Home /> },
  { path: "/noticias", element: <NoticiasPage /> },
  { path: "/noticias/:slug", element: <NewsDetailPage /> },
  { path: "/fale-conosco", element: <FaleConoscoPage /> },
  { path: "/auth", element: <AuthPage /> },
  { path: "/requerimento", element: <RequerimentoPage /> },
  { path: "/sugestao-projeto", element: <SugestaoProjetoPage /> },
  { path: "/previsao-tempo", element: <PrevisaoTempoPage /> },

  // ── Painéis por tipo de usuário ───────────────────────────
  { path: "/cidadao", element: <CidadaoPage /> },
  { path: "/empresa", element: <EmpresaPage /> },
  { path: "/vereador", element: <VereadorPage /> },

  // ── Assessor (isolado) ────────────────────────────────────
  { path: "/assessor", element: <AssessorEntryPage /> },
  { path: "/assessor/painel", element: <AssessorPainelPage /> },

  // ── Admin ─────────────────────────────────────────────────
  { path: "/admin", element: <AdminPage /> },
  { path: "/admin/resumo", element: <SystemSummaryPDF /> },

  // ── Setup público ───────────────────────────────────────
  { path: "/setup", element: <SetupPage /> },

  // ── Sistema de Oportunidades (Emprego) ────────────────────
  { path: "/sistema", element: <SistemaPage /> },
  { path: "/sistema/painel/cidadao", element: <SistemaCidadaoPage /> },
  { path: "/sistema/painel/empresa", element: <SistemaEmpresaPage /> },
  { path: "/sistema/perfil/:id", element: <PerfilPublicoPage /> },
  { path: "/sistema/vaga/:id", element: <VagaPublicaPage /> },

  // ── Cadastro de Oportunidades ─────────────────────────────
  { path: "/oportunidades", element: <SistemaPage /> },
  { path: "/oportunidades/login", element: <LoginOportunidadesPage /> },
  { path: "/oportunidades/cadastro/cidadao", element: <CadastroCidadaoPage /> },
  { path: "/oportunidades/cadastro/empresa", element: <CadastroEmpresaPage /> },
  { path: "/oportunidades/cadastro/assessor", element: <CadastroAssessorPage /> },
  { path: "/complete-profile", element: <CompleteProfilePage /> },

  // ── Documentação do projeto ────────────────────────────────
  { path: "/documentacao", element: <DocumentacaoPage /> },

  // ── Construtor de Currículo ─────────────────────────────────
  { path: "/cidadao/curriculo/dicas", element: <CurriculoDicasPage /> },
  { path: "/cidadao/curriculo/criar", element: <CurriculoCriarPage /> },
  { path: "/cidadao/curriculo/preview", element: <CurriculoPreviewPage /> },

  { path: "*", element: <NotFound /> },
];

export default routes;