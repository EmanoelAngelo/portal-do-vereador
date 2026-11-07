import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase, waitForAuthReady } from "@/lib/supabase";

const navLinks = [
  { label: "Início", href: "/" },
  { label: "Sobre", href: "/#sobre", scrollTo: "sobre" },
  { label: "Notícias", href: "/noticias" },
  { label: "Previsão do Tempo", href: "/previsao-tempo" },
  { label: "Requerimento", href: "/requerimento" },
  { label: "Sugestão", href: "/sugestao-projeto" },
  { label: "Fale Conosco", href: "/fale-conosco" },
];

const rolePanelMap: Record<string, string> = {
  admin: "/admin",
  assessor: "/assessor/painel",
  vereador: "/vereador",
  empresa: "/sistema/painel/empresa",
  citizen: "/cidadao",
};

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<{ email: string; role: string } | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === "/";

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  useEffect(() => {
    const loadUser = (session: { user: { email?: string; id: string } } | null) => {
      if (!session?.user) { setUser(null); return; }
      supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle()
        .then(({ data: profile }) => {
          setUser({ email: session.user.email ?? "", role: profile?.role ?? "citizen" });
        })
        .catch(() => {
          setUser({ email: session.user.email ?? "", role: "citizen" });
        });
    };

    waitForAuthReady().then(() => {
      supabase.auth.getSession().then(({ data }) => {
        if (data?.session) {
          loadUser(data.session);
        } else {
          setUser(null);
        }
      }).catch(() => {
        setUser(null);
      });
    }).catch(() => {
      setUser(null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      loadUser(session);
    });
    return () => {
      sub?.subscription?.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // Limpa stored user + tokens — essencial pois useAuth pode não estar montado
    try { sessionStorage.removeItem("ah_session"); } catch (_) { /* ignore */ }
    Object.keys(localStorage).forEach((k) => { if (k.startsWith("sb-") || k.includes("supabase")) localStorage.removeItem(k); });
    Object.keys(sessionStorage).forEach((k) => { if (k.startsWith("sb-") || k.includes("supabase")) sessionStorage.removeItem(k); });
    navigate("/");
  };

  const panelHref = user ? (rolePanelMap[user.role] ?? "/cidadao") : "/auth";

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    const path = href.split("?")[0].split("#")[0];
    return location.pathname.startsWith(path);
  };

  const handleNavClick = (e: React.MouseEvent, href: string, scrollTo?: string) => {
    if (scrollTo && location.pathname === "/") {
      e.preventDefault();
      const el = document.getElementById(scrollTo);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else if (scrollTo && location.pathname !== "/") {
      e.preventDefault();
      navigate("/");
      setTimeout(() => {
        const el = document.getElementById(scrollTo);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 400);
    }
  };

  // Navbar background: solid dark on non-home pages; on home transparent until scroll
  const navBg = isHome
    ? (scrolled
      ? "bg-[#0D1629] shadow-2xl border-b border-white/10"
      : "bg-transparent")
    : "bg-[#0D1629] shadow-2xl border-b border-white/10";

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navBg}`}
      >
        <div className="max-w-screen-xl mx-auto px-4 md:px-8 h-16 md:h-20 flex items-center justify-between">
          {/* Logo — Marca VEREADOR ARTHUR HALAL */}
          <Link to="/" className="flex items-center gap-3 group">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform shrink-0"
              style={{ background: "#E8A020" }}
            >
              <i className="ri-lightbulb-line text-lg" style={{ color: "#0D1629" }}></i>
            </div>
            <div className="hidden sm:block leading-none">
              <p
                className="font-bold uppercase"
                style={{ color: "#3BBFD4", fontSize: "0.60rem", letterSpacing: "0.30em" }}
              >
                VEREADOR
              </p>
              <p
                className="font-black text-white tracking-tight leading-none"
                style={{ fontSize: "1.05rem" }}
              >
                ARTHUR{" "}
                <span
                  className="px-1.5 py-0.5 rounded text-[#0D1629] text-xs font-black"
                  style={{ background: "#E8A020", fontSize: "1rem" }}
                >
                  HALAL
                </span>
              </p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-0.5">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={(e) => handleNavClick(e, link.href, link.scrollTo)}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  isActive(link.href)
                    ? "bg-[#3BBFD4]/15"
                    : "text-white/75 hover:text-white hover:bg-white/5"
                }`}
                style={isActive(link.href) ? { color: "#3BBFD4" } : {}}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              to={user ? (rolePanelMap[user.role] ?? "/sistema") : "/sistema"}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap"
              style={{ background: "rgba(59,191,212,0.15)", color: "#3BBFD4", border: "1px solid rgba(59,191,212,0.30)" }}
            >
              <span className="w-4 h-4 flex items-center justify-center">
                <i className="ri-briefcase-line text-sm"></i>
              </span>
              Empregos
            </Link>

            {user ? (
              <>
                <Link
                  to={panelHref}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white/80 hover:text-white hover:bg-white/5 transition-all whitespace-nowrap"
                >
                  <span className="w-4 h-4 flex items-center justify-center">
                    <i className="ri-user-line text-sm"></i>
                  </span>
                  Minha Área
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-all whitespace-nowrap cursor-pointer"
                >
                  Sair
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                className="px-5 py-2.5 text-[#0D1629] text-sm font-bold rounded-xl hover:scale-105 transition-all duration-200 whitespace-nowrap"
                style={{ background: "#E8A020" }}
              >
                <span className="w-4 h-4 inline-flex items-center justify-center mr-1.5">
                  <i className="ri-user-line text-sm"></i>
                </span>
                Área do Cidadão
              </Link>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
            aria-label="Menu"
          >
            <span className="w-5 h-5 flex items-center justify-center">
              <i className={`text-lg ${mobileOpen ? "ri-close-line" : "ri-menu-3-line"}`}></i>
            </span>
          </button>
        </div>

        {/* Mobile Menu */}
        <div
          className={`lg:hidden overflow-hidden transition-all duration-300 ${
            mobileOpen ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="bg-[#0D1629] border-t border-white/5 px-4 py-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={(e) => handleNavClick(e, link.href, link.scrollTo)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive(link.href)
                    ? "bg-[#3BBFD4]/15"
                    : "text-white/80 hover:text-white hover:bg-white/5"
                }`}
                style={isActive(link.href) ? { color: "#3BBFD4" } : {}}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-white/5 mt-2 space-y-2">
              <Link
                to={user ? (rolePanelMap[user.role] ?? "/sistema") : "/sistema"}
                className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold rounded-xl whitespace-nowrap"
                style={{ background: "rgba(59,191,212,0.12)", border: "1px solid rgba(59,191,212,0.25)", color: "#3BBFD4" }}
              >
                <i className="ri-briefcase-line"></i> Oportunidades de Emprego
              </Link>

              {user ? (
                <>
                  <Link
                    to={panelHref}
                    className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold rounded-xl whitespace-nowrap"
                    style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.70)" }}
                  >
                    <i className="ri-user-line"></i> Minha Área
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 text-white/60 text-sm font-medium rounded-xl hover:bg-white/5 whitespace-nowrap cursor-pointer"
                  >
                    Sair da conta
                  </button>
                </>
              ) : (
                <Link
                  to="/auth"
                  className="flex items-center justify-center gap-2 px-4 py-3 text-[#0D1629] text-sm font-bold rounded-xl whitespace-nowrap"
                  style={{ background: "#E8A020" }}
                >
                  <i className="ri-user-line"></i> Área do Cidadão
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}