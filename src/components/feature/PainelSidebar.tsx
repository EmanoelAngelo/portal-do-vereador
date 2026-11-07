import { useState } from "react";
import { Link } from "react-router-dom";
import AvatarWithFallback from "@/components/feature/AvatarWithFallback";

export const ARTHUR_PHOTO_CAMARA = "https://static.readdy.ai/image/c11839f9cb40eb5a775c7152bc2e0943/c74a8221312599494c652306a9b66f21.jpeg";
export const PELOTAS_BG = "https://static.readdy.ai/image/c11839f9cb40eb5a775c7152bc2e0943/8b3826bfcad0bf7a40b2d53002bd1ed5.webp";

interface NavItem<T extends string> {
  key: T;
  icon: string;
  label: string;
  badge?: number;
}

interface StatItem {
  label: string;
  value: number | string;
  icon?: string;
  color: string;
}

interface PainelSidebarProps<T extends string> {
  role: "vereador" | "admin" | "assessor" | "empresa" | "cidadao";
  roleLabel: string;
  userName: string;
  avatarUrl?: string | null;
  navItems: NavItem<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  stats?: StatItem[];
  onLogout: () => void;
  width?: string;
  accentColor?: string;
  accentBg?: string;
}

const ROLE_COLORS: Record<string, { accent: string; accentBg: string }> = {
  vereador: { accent: "#E8A020", accentBg: "rgba(232,160,32,0.18)" },
  admin: { accent: "#E8A020", accentBg: "rgba(232,160,32,0.18)" },
  assessor: { accent: "#3BBFD4", accentBg: "rgba(59,191,212,0.18)" },
  empresa: { accent: "#3BBFD4", accentBg: "rgba(59,191,212,0.18)" },
  cidadao: { accent: "#3BBFD4", accentBg: "rgba(59,191,212,0.18)" },
};

function SidebarContent<T extends string>({
  role,
  roleLabel,
  userName,
  avatarUrl,
  navItems,
  activeTab,
  onTabChange,
  stats,
  onLogout,
  onClose,
}: PainelSidebarProps<T> & { onClose?: () => void }) {
  const colors = ROLE_COLORS[role] ?? ROLE_COLORS.assessor;
  const accentColor = colors.accent;
  const accentBg = colors.accentBg;
  const accentBorder =
    role === "vereador" || role === "admin"
      ? "rgba(232,160,32,0.30)"
      : "rgba(59,191,212,0.30)";

  const handleNav = (key: T) => {
    onTabChange(key);
    onClose?.();
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "#0D1629" }}>
      {/* Pelotas photo background strip */}
      <div className="relative h-20 overflow-hidden shrink-0">
        <img
          src={PELOTAS_BG}
          alt="Pelotas, RS"
          className="w-full h-full object-cover object-center"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(13,22,41,0.3) 0%, rgba(13,22,41,0.88) 100%)",
          }}
        ></div>
        <div className="absolute bottom-2 left-3">
          <p className="text-white/50 text-xs tracking-widest uppercase">Pelotas · RS</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer md:hidden"
            style={{ background: "rgba(0,0,0,0.4)", color: "rgba(255,255,255,0.7)" }}
          >
            <i className="ri-close-line text-lg"></i>
          </button>
        )}
      </div>

      {/* Arthur photo + name */}
      <div
        className="px-4 pb-4 pt-3 border-b shrink-0"
        style={{ borderColor: "rgba(255,255,255,0.07)" }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-12 h-12 rounded-2xl overflow-hidden shrink-0 relative"
            style={{ border: `2px solid ${accentColor}50` }}
          >
            <img
              src={ARTHUR_PHOTO_CAMARA}
              alt="Arthur Halal — Vereador"
              className="w-full h-full object-cover object-top"
            />
            <div
              className="absolute inset-0 rounded-2xl"
              style={{ boxShadow: `inset 0 0 0 1px ${accentColor}25` }}
            ></div>
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-sm leading-tight">Arthur Halal</p>
            <p className="text-xs font-semibold" style={{ color: accentColor }}>
              Vereador · Pelotas
            </p>
          </div>
        </div>

        {/* User card */}
        <div
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl group cursor-pointer relative"
          style={{ background: accentBg, border: `1px solid ${accentBorder}` }}
          onClick={() => {
            const input = document.getElementById(`avatar-upload-${role}`) as HTMLInputElement | null;
            input?.click();
          }}
        >
          <AvatarWithFallback
            url={avatarUrl ?? null}
            name={userName}
            className="w-7 h-7 rounded-full object-cover object-top shrink-0 border border-white/10"
            fallbackClassName="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
            fallbackStyle={{ background: accentBg, color: accentColor, border: `1px solid ${accentBorder}` }}
          />
          <div className="min-w-0 flex-1">
            <p className="text-white text-xs font-semibold truncate">{userName}</p>
            <p className="text-xs truncate font-medium" style={{ color: accentColor }}>
              {roleLabel}
            </p>
          </div>
          <span className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <i className="ri-camera-line text-xs" style={{ color: accentColor }}></i>
          </span>
        </div>
      </div>

      {/* Stats */}
      {stats && stats.length > 0 && (
        <div className="px-4 py-3 shrink-0">
          <p
            className="text-xs font-bold uppercase tracking-widest px-1 mb-2"
            style={{ color: "rgba(255,255,255,0.30)" }}
          >
            Resumo
          </p>
          <div className="space-y-1">
            {stats.map((s) => (
              <div
                key={s.label}
                className="flex items-center justify-between px-3 py-1.5 rounded-xl"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <div className="flex items-center gap-2">
                  {s.icon && (
                    <span className="w-3.5 h-3.5 flex items-center justify-center">
                      <i className={`${s.icon} text-xs`} style={{ color: s.color }}></i>
                    </span>
                  )}
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
                    {s.label}
                  </span>
                </div>
                <span className="font-bold text-sm" style={{ color: s.color }}>
                  {s.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-4 overflow-y-auto">
        <div className="h-px mb-3" style={{ background: "rgba(255,255,255,0.07)" }}></div>
        {navItems.map((item) => {
          const tourKeyMap: Record<string, string> = {
            eficiencia: "vereador-eficiencia",
            metricas: "vereador-metricas",
            demands: "vereador-demandas-btn",
            vagas: "vereador-vagas-btn",
            conversas: "vereador-conversas-btn",
            agenda: "vereador-agenda-btn",
            chat: "assessor-mensagens",
            mensagens: "assessor-mensagens",
            usuarios: "assessor-usuarios",
            kanban: "assessor-kanban-btn",
          };
          // For assessor: vagas and agenda have unique keys
          const assessorKeyMap: Record<string, string> = {
            vagas: "assessor-vagas-btn",
            agenda: "assessor-agenda-btn",
          };
          const finalTourKey = (role === "assessor" && assessorKeyMap[item.key])
            ? assessorKeyMap[item.key]
            : tourKeyMap[item.key];
          return (
            <button
              key={item.key}
              onClick={() => handleNav(item.key)}
              data-tour={finalTourKey || undefined}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer mb-1"
              style={
                activeTab === item.key
                  ? {
                      background: accentBg,
                      color: accentColor,
                      border: `1px solid ${accentBorder}`,
                    }
                  : {
                      color: "rgba(255,255,255,0.55)",
                      background: "transparent",
                      border: "1px solid transparent",
                    }
              }
            >
              <span className="w-5 h-5 flex items-center justify-center shrink-0">
                <i className={`${item.icon} text-base`}></i>
              </span>
              <span className="truncate flex-1">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className="w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold shrink-0"
                  style={{
                    background: "rgba(239,68,68,0.15)",
                    color: "#EF4444",
                    border: "1px solid rgba(239,68,68,0.30)",
                  }}
                >
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="shrink-0">
        <div className="relative h-16 overflow-hidden">
          <img
            src={PELOTAS_BG}
            alt="Centro de Pelotas"
            className="w-full h-full object-cover object-center opacity-30"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(13,22,41,0.8) 0%, rgba(13,22,41,0.2) 100%)",
            }}
          ></div>
          <div
            className="absolute bottom-0 left-0 right-0 h-0.5"
            style={{
              background: `linear-gradient(to right, transparent, ${accentColor}60, transparent)`,
            }}
          ></div>
        </div>

        <div
          className="px-4 py-3 border-t"
          style={{ borderColor: "rgba(255,255,255,0.07)" }}
        >
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer whitespace-nowrap hover:bg-white/5"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            <i className="ri-logout-box-r-line text-base"></i>
            Sair do sistema
          </button>
          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all cursor-pointer whitespace-nowrap hover:bg-white/5"
            style={{ color: "rgba(255,255,255,0.30)" }}
          >
            <i className="ri-arrow-left-line text-sm"></i>
            Voltar ao site
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PainelSidebar<T extends string>(
  props: PainelSidebarProps<T>
) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const colors = ROLE_COLORS[props.role] ?? ROLE_COLORS.assessor;
  const accentColor = colors.accent;
  const accentBg = colors.accentBg;
  const accentBorder =
    props.role === "vereador" || props.role === "admin"
      ? "rgba(232,160,32,0.30)"
      : "rgba(59,191,212,0.30)";

  const activeItem = props.navItems.find((n) => n.key === props.activeTab);
  const hasAnyBadge = props.navItems.some((n) => (n.badge ?? 0) > 0);

  return (
    <>
      {/* ── Desktop sidebar (hidden on mobile) ── */}
      <aside
        className={`${props.width ?? "w-60"} flex-col fixed top-0 left-0 bottom-0 z-40 overflow-hidden hidden md:flex overflow-y-auto`}
        style={{ background: "#0D1629" }}
      >
        <SidebarContent {...props} />
      </aside>

      {/* ── Mobile top bar ── */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-3 h-14"
        style={{
          background: "rgba(13,22,41,0.97)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <button
          onClick={() => setMobileOpen(true)}
          className="relative w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer"
          style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.7)" }}
        >
          <i className="ri-menu-line text-lg"></i>
          {hasAnyBadge && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-[#0D1629]"></span>
          )}
        </button>

        <div className="flex items-center gap-2 min-w-0 flex-1 justify-center mx-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
            style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, color: "#0D1629" }}
          >
            AH
          </div>
          <span className="text-white font-bold text-sm truncate">{activeItem?.label ?? "Painel"}</span>
          {activeItem && (activeItem.badge ?? 0) > 0 && (
            <span
              className="min-w-[20px] h-5 flex items-center justify-center rounded-full text-xs font-black px-1 shrink-0"
              style={{ background: "#EF4444", color: "#fff" }}
            >
              {activeItem.badge! > 99 ? "99+" : activeItem.badge}
            </span>
          )}
        </div>

        <button
          onClick={props.onLogout}
          className="w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer shrink-0"
          style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.45)" }}
        >
          <i className="ri-logout-box-r-line text-lg"></i>
        </button>
      </header>

      {/* ── Mobile Bottom Navigation Bar (estilo app — SÓ ÍCONES) ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center px-1 py-2 overflow-x-hidden"
        style={{
          background: "rgba(13,22,41,0.98)",
          backdropFilter: "blur(16px)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {props.navItems.map((item) => {
          const isActive = props.activeTab === item.key;
          const hasBadge = (item.badge ?? 0) > 0;
          const tourKeyMap2: Record<string, string> = {
            eficiencia: "vereador-eficiencia",
            metricas: "vereador-metricas",
            demands: "vereador-demandas-btn",
            vagas: "vereador-vagas-btn",
            conversas: "vereador-conversas-btn",
            agenda: "vereador-agenda-btn",
            chat: "assessor-mensagens",
            mensagens: "assessor-mensagens",
            usuarios: "assessor-usuarios",
          };
          const assessorKeyMap2: Record<string, string> = {
            vagas: "assessor-vagas-btn",
            agenda: "assessor-agenda-btn",
          };
          const finalTourKey2 = (props.role === "assessor" && assessorKeyMap2[item.key])
            ? assessorKeyMap2[item.key]
            : tourKeyMap2[item.key];
          return (
            <button
              key={item.key}
              onClick={() => props.onTabChange(item.key)}
              data-tour={finalTourKey2 || undefined}
              className="relative flex items-center justify-center flex-1 h-10 rounded-xl cursor-pointer transition-all shrink-0"
              style={{
                background: isActive ? accentBg : "transparent",
                border: isActive ? `1px solid ${accentBorder}` : "1px solid transparent",
              }}
              title={item.label}
            >
              <span
                className="w-5 h-5 flex items-center justify-center"
                style={{ color: isActive ? accentColor : "rgba(255,255,255,0.45)" }}
              >
                <i className={`${item.icon} text-lg`}></i>
              </span>
              {hasBadge && (
                <span
                  className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-black px-1"
                  style={{ background: "#EF4444", color: "#fff", border: "2px solid #0D1629" }}
                >
                  {item.badge! > 99 ? "99+" : item.badge}
                </span>
              )}
              {isActive && (
                <div
                  className="absolute -bottom-2 w-1 h-1 rounded-full"
                  style={{ background: accentColor }}
                ></div>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Mobile drawer overlay — mostra perfil, stats e sair, sem navItems (já há bottom nav) ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          onClick={() => setMobileOpen(false)}
          style={{ background: "rgba(0,0,0,0.6)" }}
        >
          <div
            className="absolute top-0 left-0 bottom-0 w-72 overflow-y-auto flex flex-col"
            style={{ background: "#0D1629" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header com foto Pelotas */}
            <div className="relative h-20 overflow-hidden shrink-0">
              <img src={PELOTAS_BG} alt="Pelotas, RS" className="w-full h-full object-cover object-center" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(13,22,41,0.3) 0%, rgba(13,22,41,0.88) 100%)" }}></div>
              <div className="absolute bottom-2 left-3"><p className="text-white/50 text-xs tracking-widest uppercase">Pelotas · RS</p></div>
              <button onClick={() => setMobileOpen(false)} className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer" style={{ background: "rgba(0,0,0,0.4)", color: "rgba(255,255,255,0.7)" }}>
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>

            {/* Arthur + usuário */}
            <div className="px-4 pb-4 pt-3 border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0" style={{ border: `2px solid ${accentColor}50` }}>
                  <img src={ARTHUR_PHOTO_CAMARA} alt="Arthur Halal" className="w-full h-full object-cover object-top" />
                </div>
                <div className="min-w-0">
                  <p className="text-white font-bold text-sm">Arthur Halal</p>
                  <p className="text-xs font-semibold" style={{ color: accentColor }}>Vereador · Pelotas</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl" style={{ background: accentBg, border: `1px solid ${accentBorder}` }}>
                <AvatarWithFallback
                  url={props.avatarUrl ?? null}
                  name={props.userName}
                  className="w-7 h-7 rounded-full object-cover object-top shrink-0 border border-white/10"
                  fallbackClassName="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                  fallbackStyle={{ background: accentBg, color: accentColor, border: `1px solid ${accentBorder}` }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-white text-xs font-semibold truncate">{props.userName}</p>
                  <p className="text-xs truncate font-medium" style={{ color: accentColor }}>{props.roleLabel}</p>
                </div>
              </div>
            </div>

            {/* Stats */}
            {props.stats && props.stats.length > 0 && (
              <div className="px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-widest px-1 mb-2" style={{ color: "rgba(255,255,255,0.30)" }}>Resumo</p>
                <div className="space-y-1">
                  {props.stats.map((s) => (
                    <div key={s.label} className="flex items-center justify-between px-3 py-1.5 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <div className="flex items-center gap-2">
                        {s.icon && <span className="w-3.5 h-3.5 flex items-center justify-center"><i className={`${s.icon} text-xs`} style={{ color: s.color }}></i></span>}
                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>{s.label}</span>
                      </div>
                      <span className="font-bold text-sm" style={{ color: s.color }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Spacer */}
            <div className="flex-1"></div>

            {/* Footer */}
            <div className="px-4 py-4 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
              <button onClick={props.onLogout} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer whitespace-nowrap hover:bg-white/5 mb-1" style={{ color: "rgba(255,255,255,0.45)" }}>
                <i className="ri-logout-box-r-line text-base"></i> Sair do sistema
              </button>
              <a href="/" className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all cursor-pointer whitespace-nowrap hover:bg-white/5" style={{ color: "rgba(255,255,255,0.30)" }}>
                <i className="ri-arrow-left-line text-sm"></i> Voltar ao site
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}