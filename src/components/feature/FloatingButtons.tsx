import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase, waitForAuthReady } from "@/lib/supabase";
import { getStoredUser } from "@/hooks/useAuth";
import ChatBotao from "@/components/feature/ChatBotao";

export default function FloatingButtons() {
  const [showTop, setShowTop] = useState(false);
  const [openDemands, setOpenDemands] = useState(0);
  const [showNotif, setShowNotif] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const user = getStoredUser();
    if (user?.role) {
      setUserRole(user.role);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const load = async () => {
      if (!mounted) return;
      try {
        const { count, error } = await supabase
          .from("demands")
          .select("*", { count: "exact", head: true })
          .eq("status", "aberto");

        if (error) throw error;

        if (mounted) {
          setOpenDemands(count ?? 0);
          setShowNotif((count ?? 0) > 0);
        }
      } catch {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session) {
            await supabase.auth.signOut();
            const { count: anonCount, error: anonErr } = await supabase
              .from("demands")
              .select("*", { count: "exact", head: true })
              .eq("status", "aberto");
            if (!anonErr && mounted) {
              setOpenDemands(anonCount ?? 0);
              setShowNotif((anonCount ?? 0) > 0);
            }
          }
        } catch {
          // Tudo falhou
        }
      }
    };

    waitForAuthReady().then(() => {
      load();

      channel = supabase
        .channel("floating-demands")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "demands" },
          () => { load(); }
        )
        .subscribe();
    });

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const isAssessorOrAdmin =
    userRole === "assessor" ||
    userRole === "admin" ||
    userRole === "vereador";

  return (
    <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-40 flex flex-col gap-2.5">

      {/* ── Botao do Chat com Gabinete ── */}
      <ChatBotao />

      {/* ── Demandas em aberto (somente assessor/vereador/admin) ── */}
      {showNotif && isAssessorOrAdmin && (
        <Link
          to="/assessor"
          className="group flex items-center gap-3 bg-white border border-amber-200/70 hover:border-amber-400 rounded-2xl px-4 py-3 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer"
        >
          <div className="w-10 h-10 md:w-11 md:h-11 flex items-center justify-center rounded-full bg-amber-500 group-hover:bg-amber-600 transition-colors shrink-0">
            <i className="ri-file-list-3-line text-white text-lg md:text-xl"></i>
          </div>
          <div className="flex flex-col min-w-0 leading-tight">
            <span className="text-sm font-semibold text-foreground-900 whitespace-nowrap">
              {openDemands} {openDemands === 1 ? "demanda em aberto" : "demandas em aberto"}
            </span>
            <span className="text-xs text-foreground-500 whitespace-nowrap">Painel do assessor</span>
          </div>
        </Link>
      )}

      {/* ── Voltar ao topo ── */}
      {showTop && (
        <button
          onClick={scrollToTop}
          aria-label="Voltar ao topo"
          className="self-end flex items-center gap-2 bg-white/95 border border-background-300/60 rounded-full px-3.5 py-2.5 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer"
        >
          <span className="w-4 h-4 flex items-center justify-center">
            <i className="ri-arrow-up-line text-foreground-600 text-sm"></i>
          </span>
          <span className="text-xs text-foreground-500 font-medium hidden md:inline">Voltar ao topo</span>
        </button>
      )}
    </div>
  );
}