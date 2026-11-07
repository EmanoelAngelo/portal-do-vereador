import { useState, useRef, useLayoutEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNotifications, timeAgoNotification, getNotificacaoIcon, getNotificacaoColor } from "@/hooks/useNotifications";

interface NotificationBellProps {
  userId: string | null;
  userRole?: string | null;
  onNavigate?: (path: string) => void;
}

export default function NotificationBell({ userId, userRole, onNavigate }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { notificacoes, naoLidas, marcarComoLida, marcarTodasComoLidas } = useNotifications(userId);

  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>();

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  const calculatePosition = useCallback(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const margin = 16;
    const maxDropdownWidth = 380;
    const top = rect.bottom + 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Mobile: full width minus margins
    if (vw < 768) {
      const width = vw - margin * 2;
      setDropdownStyle({
        position: "fixed",
        top: `${top}px`,
        left: `${margin}px`,
        width: `${width}px`,
        maxWidth: `${width}px`,
        maxHeight: `${Math.min(520, vh - top - margin)}px`,
      });
      return;
    }

    // Desktop: align right edge of dropdown with right edge of button, clamp to viewport
    const dropdownWidth = Math.min(maxDropdownWidth, vw - margin * 2);
    let left = rect.right - dropdownWidth;
    if (left < margin) left = margin;
    if (left + dropdownWidth > vw - margin) {
      left = vw - dropdownWidth - margin;
    }
    setDropdownStyle({
      position: "fixed",
      top: `${top}px`,
      left: `${left}px`,
      width: `${dropdownWidth}px`,
      maxWidth: `${dropdownWidth}px`,
      maxHeight: `${Math.min(520, vh - top - margin)}px`,
    });
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => {
      calculatePosition();
    });
    return () => cancelAnimationFrame(raf);
  }, [open, calculatePosition]);

  useLayoutEffect(() => {
    if (!open) return;
    const handleResize = () => calculatePosition();
    const handleScroll = () => calculatePosition();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [open, calculatePosition]);

  // Click outside to close
  useLayoutEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      const inDropdown = dropdownRef.current?.contains(target);
      const inButton = buttonRef.current?.contains(target);
      if (!inDropdown && !inButton) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const getDestinationByRole = (tipo: string, referenciaTipo: string | null, referenciaId: string | null): string => {
    // Detecção de tipo agregador: vaga_criada, vaga_status, vaga_pausada, vaga_excluida
    const isVagaType = tipo === "vaga_criada" || tipo === "vaga_status" || tipo === "vaga_pausada" || tipo === "vaga_excluida";
    const isCandidaturaType = tipo === "candidatura" || tipo === "candidatura_enviada" || tipo === "aprovacao" || tipo === "candidatura_recusada";
    const isAgendaType = tipo.startsWith("agenda") || referenciaTipo === "agenda";
    const isChatType = tipo === "chat" || tipo === "mensagem" || referenciaTipo === "chat";
    const isDemandaType = referenciaTipo === "demanda" || tipo === "demanda";
    const isNoticiaType = referenciaTipo === "noticia" || tipo === "noticia";
    const isUsuarioType = referenciaTipo === "novo_usuario" || referenciaTipo === "novo_assessor" || tipo === "novo_usuario" || tipo === "cadastro_concluido" || referenciaTipo === "perfil" || tipo === "curriculo_criado";

    switch (userRole) {
      // ─── ADMIN ──────────────────────────────────────────────
      case "admin":
        if (isDemandaType) return "/admin?tab=demandas";
        if (isNoticiaType) return referenciaId ? `/noticias/${referenciaId}` : "/noticias";
        if (isAgendaType) return "/admin";
        if (isVagaType) return referenciaId ? `/admin?tab=vagas&vaga=${referenciaId}` : "/admin?tab=vagas";
        if (isCandidaturaType) {
          // Para admin, candidatura cai na aba de vagas para ver contexto
          return "/admin?tab=vagas";
        }
        if (isChatType) return "/admin";
        if (isUsuarioType) return "/admin?tab=users";
        return "/admin";

      // ─── VEREADOR ──────────────────────────────────────────
      case "vereador":
        if (isDemandaType) return referenciaId ? `/vereador?tab=demands&selected=${referenciaId}` : "/vereador?tab=demands";
        if (isNoticiaType) return referenciaId ? `/noticias/${referenciaId}` : "/noticias";
        if (isAgendaType) return referenciaId ? `/vereador?tab=agenda&evento=${referenciaId}` : "/vereador?tab=agenda";
        if (isVagaType) return referenciaId ? `/vereador?tab=vagas&vaga=${referenciaId}` : "/vereador?tab=vagas";
        if (isCandidaturaType) {
          // Para vereador, referenciaId é o ID da vaga (via notificarRelevantes do VagaCard)
          // Para aprovacao/recusada (empresa), referenciaId é o ID da candidatura — vai pra tab=vagas sem highlight
          if (referenciaTipo === "vaga" && referenciaId) return `/vereador?tab=vagas&vaga=${referenciaId}`;
          return "/vereador?tab=vagas";
        }
        if (isChatType) return "/vereador?tab=conversas";
        if (isUsuarioType) return "/vereador?tab=usuarios";
        return "/vereador";

      // ─── ASSESSOR ──────────────────────────────────────────
      case "assessor":
        if (isDemandaType) return referenciaId ? `/assessor/painel?demanda=${referenciaId}` : "/assessor/painel";
        if (isNoticiaType) return referenciaId ? `/noticias/${referenciaId}` : "/noticias";
        if (isAgendaType) return referenciaId ? `/assessor/painel?tab=agenda&evento=${referenciaId}` : "/assessor/painel?tab=agenda";
        if (isVagaType) return referenciaId ? `/assessor/painel?tab=vagas&vaga=${referenciaId}` : "/assessor/painel?tab=vagas";
        if (isCandidaturaType) {
          if (referenciaTipo === "vaga" && referenciaId) return `/assessor/painel?tab=vagas&vaga=${referenciaId}`;
          return "/assessor/painel?tab=vagas";
        }
        if (isChatType) return "/assessor/painel?tab=chat";
        if (isUsuarioType) return "/assessor/painel?tab=usuarios";
        return "/assessor/painel";

      // ─── CITIZEN ───────────────────────────────────────────
      case "citizen":
        if (isNoticiaType) return referenciaId ? `/noticias/${referenciaId}` : "/noticias";
        if (isVagaType) {
          // vaga_criada, vaga_status, etc — vai pro feed de vagas com destaque
          if (tipo === "vaga_excluida") return "/sistema/painel/cidadao";
          return referenciaId ? `/sistema/painel/cidadao?tab=feed&vaga=${referenciaId}` : "/sistema/painel/cidadao?tab=feed";
        }
        if (isCandidaturaType) {
          // Cidadão recebe notificações sobre SUAS candidaturas (aprovacao, recusa, enviada)
          return referenciaId
            ? `/sistema/painel/cidadao?tab=candidaturas&selected=${referenciaId}`
            : "/sistema/painel/cidadao?tab=candidaturas";
        }
        if (isChatType) return "/cidadao?tab=mensagens";
        if (isDemandaType) return referenciaId ? `/cidadao?tab=demandas&selected=${referenciaId}` : "/cidadao?tab=demandas";
        if (isAgendaType) return "/cidadao";
        if (isUsuarioType) return "/cidadao";
        return "/cidadao";

      // ─── EMPRESA ───────────────────────────────────────────
      case "empresa":
        if (isNoticiaType) return referenciaId ? `/noticias/${referenciaId}` : "/noticias";
        if (isVagaType) return "/sistema/painel/empresa?tab=vagas";
        if (isCandidaturaType || tipo === "curriculo_criado") {
          return referenciaId
            ? `/sistema/painel/empresa?tab=curriculos&selected=${referenciaId}`
            : "/sistema/painel/empresa?tab=curriculos";
        }
        if (isChatType) return "/sistema/painel/empresa?tab=mensagens";
        if (isDemandaType) return "/sistema/painel/empresa";
        if (isAgendaType) return "/sistema/painel/empresa";
        if (isUsuarioType) return "/sistema/painel/empresa";
        return "/sistema/painel/empresa";

      default:
        return "/";
    }
  };

  const handleClickNotificacao = (n: ReturnType<typeof useNotifications> extends { notificacoes: infer T } ? T[number] : never) => {
    if (!n.lida) {
      marcarComoLida(n.id);
    }
    const dest = getDestinationByRole(n.tipo, n.referencia_tipo, n.referencia_id);
    onNavigate?.(dest);
    setOpen(false);
  };

  const dropdownContent = (
    <div
      ref={dropdownRef}
      className="rounded-2xl overflow-hidden shadow-2xl z-[9999]"
      style={{
        background: "#0F172A",
        border: "1px solid rgba(255,255,255,0.12)",
        boxSizing: "border-box",
        ...dropdownStyle,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="flex items-center gap-2 min-w-0">
          <i className="ri-notification-3-line text-sm shrink-0" style={{ color: "#3BBFD4" }}></i>
          <p className="text-white font-bold text-sm truncate">Notificações</p>
          {naoLidas > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: "rgba(239,68,68,0.20)", color: "#EF4444" }}>
              {naoLidas} nova{naoLidas !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        {notificacoes.some((n) => !n.lida) && (
          <button
            onClick={() => { marcarTodasComoLidas(); }}
            className="text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0 ml-2"
            style={{ color: "#3BBFD4" }}
          >
            Marcar todas
          </button>
        )}
      </div>

      {/* Lista */}
      <div className="overflow-y-auto" style={{ maxHeight: isMobile ? "calc(100vh - 180px)" : "420px" }}>
        {notificacoes.length === 0 ? (
          <div className="py-10 text-center">
            <i className="ri-notification-off-line text-white/15 text-3xl mb-2 block"></i>
            <p className="text-white/30 text-sm">Nenhuma notificação</p>
            <p className="text-white/20 text-xs mt-1">Quando algo acontecer, você verá aqui</p>
          </div>
        ) : (
          notificacoes.map((n) => {
            const icon = getNotificacaoIcon(n.tipo);
            const color = getNotificacaoColor(n.tipo);
            return (
              <button
                key={n.id}
                onClick={() => handleClickNotificacao(n as any)}
                className="w-full text-left flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer border-b hover:bg-white/5"
                style={{
                  borderColor: "rgba(255,255,255,0.05)",
                  background: n.lida ? "transparent" : "rgba(59,191,212,0.04)",
                }}
              >
                {/* Ícone */}
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${color}20` }}>
                  <i className={`${icon} text-sm`} style={{ color }}></i>
                </div>
                {/* Conteúdo */}
                <div className="flex-1 min-w-0 overflow-hidden">
                  <p className="text-white text-sm font-semibold leading-tight truncate">
                    {n.titulo}
                    {!n.lida && (
                      <span className="inline-block w-2 h-2 rounded-full ml-2 align-middle shrink-0" style={{ background: "#3BBFD4" }}></span>
                    )}
                  </p>
                  <p className="text-white/45 text-xs mt-0.5 leading-relaxed break-words">{n.mensagem}</p>
                  <div className="flex items-center gap-2 mt-1.5 min-w-0">
                    <span className="text-white/25 text-xs shrink-0">{timeAgoNotification(n.created_at)}</span>
                    {n.remetente_nome && (
                      <span className="text-white/30 text-xs truncate whitespace-nowrap">· {n.remetente_nome}</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className="relative w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-colors shrink-0"
        style={{ background: open ? "rgba(59,191,212,0.15)" : "rgba(255,255,255,0.06)", color: open ? "#3BBFD4" : "rgba(255,255,255,0.55)" }}
        title="Notificações"
      >
        <i className="ri-notification-3-line text-lg"></i>
        {naoLidas > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "#EF4444", color: "white" }}>
            {naoLidas > 9 ? "9+" : naoLidas}
          </span>
        )}
      </button>

      {open && createPortal(dropdownContent, document.body)}
    </div>
  );
}