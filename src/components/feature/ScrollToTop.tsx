import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Garante que toda navegação entre rotas inicia no topo da página.
 * Deve ser renderizado dentro do BrowserRouter.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scrolla para o topo imediatamente ao mudar de rota
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}