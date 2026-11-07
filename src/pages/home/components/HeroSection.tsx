import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

// IMG_9705 — Arthur Halal sentado na Câmara Municipal, placa "Arthur Halal PP"
const ARTHUR_CAMARA_URL =
  "https://static.readdy.ai/image/c11839f9cb40eb5a775c7152bc2e0943/c74a8221312599494c652306a9b66f21.jpeg";

// IMG_9717 — Vista aérea do Mercado Público de Pelotas (fundo do hero)
const PELOTAS_AERIAL_URL =
  "https://static.readdy.ai/image/c11839f9cb40eb5a775c7152bc2e0943/8b3826bfcad0bf7a40b2d53002bd1ed5.webp";

// Paleta da marca (IMG_9722):
// Azul marinho: #1B2A5E
// Âmbar/dourado: #E8A020
// Teal/ciano: #3BBFD4
// Branco: #FFFFFF

const heroActions = [
  {
    icon: "ri-chat-3-line",
    label: "Fale com o Vereador",
    href: "/fale-conosco",
    variant: "ghost",
  },
  {
    icon: "ri-file-add-line",
    label: "Enviar Requerimento",
    href: "/requerimento",
    variant: "ghost",
  },
  {
    icon: "ri-newspaper-line",
    label: "Acompanhar Notícias",
    href: "/noticias",
    variant: "amber",
  },
  {
    icon: "ri-lightbulb-line",
    label: "Sugestão de Projeto",
    href: "/sugestao-projeto",
    variant: "amber",
  },
];

// Minimal inline weather for hero — only fetches current temp+condition
function HeroWeather() {
  const [temp, setTemp] = useState<number | null>(null);
  const [code, setCode] = useState<number>(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=-31.77&longitude=-52.34&current=temperature_2m,weather_code&timezone=America%2FSao_Paulo&models=icon_seamless"
    )
      .then((r) => r.json())
      .then((j) => {
        setTemp(Math.round(j.current.temperature_2m));
        setCode(j.current.weather_code);
        setLoaded(true);
      })
      .catch(() => { setTemp(9); setCode(0); setLoaded(true); });
  }, []);

  const iconMap = (c: number) => {
    if (c === 0) return { icon: "ri-sun-line", color: "#fbbf24" };
    if (c <= 2) return { icon: "ri-sun-cloudy-line", color: "#fcd34d" };
    if (c <= 3) return { icon: "ri-cloudy-line", color: "rgba(255,255,255,0.50)" };
    if (c <= 48) return { icon: "ri-foggy-line", color: "rgba(255,255,255,0.40)" };
    if (c <= 67) return { icon: "ri-rainy-line", color: "#7dd3fc" };
    if (c <= 77) return { icon: "ri-snowy-line", color: "#bae6fd" };
    if (c <= 86) return { icon: "ri-showers-line", color: "#7dd3fc" };
    return { icon: "ri-thunderstorms-line", color: "#fde68a" };
  };

  if (!loaded) return null;

  const { icon, color } = iconMap(code);

  return (
    <Link
      to="/previsao-tempo"
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer transition-all hover:bg-white/10 group"
      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}
    >
      <span className="w-4 h-4 flex items-center justify-center shrink-0">
        <i className={`${icon} text-sm`} style={{ color }}></i>
      </span>
      <span className="text-white/70 text-xs font-semibold">
        Pelotas &bull; {temp}°C
      </span>
      <span className="text-white/30 text-xs group-hover:text-white/50 transition-colors">
        ver previsão →
      </span>
    </Link>
  );
}

export default function HeroSection() {
  const particlesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = particlesRef.current;
    if (!container) return;
    const particles: HTMLDivElement[] = [];
    for (let i = 0; i < 14; i++) {
      const p = document.createElement("div");
      const size = Math.random() * 3 + 1;
      p.style.cssText = `
        position:absolute;
        width:${size}px;height:${size}px;
        background:rgba(59,191,212,${Math.random() * 0.2 + 0.06});
        border-radius:50%;
        left:${Math.random() * 100}%;
        top:${Math.random() * 100}%;
        animation: floatParticle ${Math.random() * 14 + 8}s ease-in-out infinite;
        animation-delay:${Math.random() * 6}s;
      `;
      container.appendChild(p);
      particles.push(p);
    }
    return () => particles.forEach((p) => p.remove());
  }, []);

  return (
    <section
      className="relative min-h-screen flex items-center overflow-hidden"
      style={{ background: "#0D1629" }}
    >
      {/* ── Fundo: vista aérea do Mercado Público de Pelotas (IMG_9717) ── */}
      <div className="absolute inset-0">
        <img
          src={PELOTAS_AERIAL_URL}
          alt="Vista aérea do Mercado Público de Pelotas, RS"
          className="w-full h-full object-cover object-center"
          style={{ opacity: 0.22 }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(13,22,41,0.97) 0%, rgba(27,42,94,0.85) 40%, rgba(13,22,41,0.75) 70%, rgba(13,22,41,0.88) 100%)",
          }}
        ></div>
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, rgba(13,22,41,0.98) 30%, rgba(13,22,41,0.55) 70%, rgba(13,22,41,0.20) 100%)",
          }}
        ></div>
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(13,22,41,1) 0%, transparent 40%)",
          }}
        ></div>
      </div>

      {/* Linha de brilho teal no topo */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5 pointer-events-none"
        style={{
          background:
            "linear-gradient(to right, transparent, #3BBFD4, #E8A020, transparent)",
        }}
      ></div>

      {/* Partículas */}
      <div ref={particlesRef} className="absolute inset-0 pointer-events-none"></div>

      {/* Grade sutil */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(59,191,212,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(59,191,212,0.04) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
        }}
      ></div>

      {/* Brilho azul difuso */}
      <div
        className="absolute top-1/3 right-1/3 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: "rgba(27,42,94,0.5)",
          filter: "blur(120px)",
        }}
      ></div>

      {/* Brilho teal difuso */}
      <div
        className="absolute bottom-1/4 left-1/4 w-64 h-64 rounded-full pointer-events-none"
        style={{
          background: "rgba(59,191,212,0.08)",
          filter: "blur(80px)",
        }}
      ></div>

      <div className="relative w-full max-w-screen-xl mx-auto px-4 md:px-8 pt-24 pb-4">
        <div className="grid lg:grid-cols-2 gap-8 xl:gap-16 items-center">

          {/* ════════ COLUNA ESQUERDA — Marca + Texto (aparece DEPOIS no mobile) ════════ */}
          <div className="space-y-6 order-2 lg:order-1">
            {/* Badge mandato */}
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{
                border: "1px solid rgba(59,191,212,0.30)",
                background: "rgba(59,191,212,0.08)",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse inline-block shrink-0"
                style={{ background: "#3BBFD4" }}
              ></span>
              <span className="text-xs font-semibold tracking-wider uppercase leading-tight" style={{ color: "#3BBFD4" }}>
                Mandato 2024–2028 · Câmara Municipal de Pelotas
              </span>
            </div>

            {/* ── LOGO/MARCA: tipografia da identidade visual ── */}
            <div>
              <p
                className="font-bold tracking-[0.32em] uppercase mb-1 text-xs"
                style={{
                  color: "#3BBFD4",
                }}
              >
                VEREADOR
              </p>

              <h1 className="font-black leading-none tracking-tight" style={{ fontSize: "clamp(2.4rem, 8vw, 5.2rem)" }}>
                <span className="text-white">ARTHUR</span>
                <span
                  className="ml-2 px-2 py-0.5 rounded-md inline-block"
                  style={{
                    background: "#E8A020",
                    color: "#0D1629",
                  }}
                >
                  HALAL
                </span>
              </h1>

              {/* Linha decorativa */}
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <div
                  className="h-0.5 w-8 rounded-full shrink-0"
                  style={{ background: "#E8A020" }}
                ></div>
                <div
                  className="h-0.5 w-14 rounded-full shrink-0"
                  style={{ background: "#3BBFD4", opacity: 0.5 }}
                ></div>
                <p className="text-white/40 text-xs tracking-wider uppercase">
                  Pelotas · Rio Grande do Sul · PP
                </p>
              </div>
            </div>

            {/* Slogan */}
            <p className="text-white/65 text-base md:text-lg font-light leading-relaxed">
              "Jovem empreendedor, comprometido com{" "}
              <span className="font-semibold" style={{ color: "#E8A020" }}>transparência</span>,{" "}
              <span className="font-semibold" style={{ color: "#3BBFD4" }}>inovação</span> e com o
              futuro de <span className="text-white/85 font-medium">Pelotas</span>."
            </p>

            {/* Botões de ação */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {heroActions.map((action) => (
                <Link
                  key={action.href}
                  to={action.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl backdrop-blur-sm transition-all duration-200 hover:scale-105 cursor-pointer whitespace-nowrap"
                  style={
                    action.variant === "amber"
                      ? {
                          border: "1px solid rgba(232,160,32,0.40)",
                          background: "rgba(232,160,32,0.12)",
                          color: "#E8A020",
                        }
                      : {
                          border: "1px solid rgba(255,255,255,0.09)",
                          background: "rgba(255,255,255,0.04)",
                          color: "rgba(255,255,255,0.80)",
                        }
                  }
                >
                  <span className="w-5 h-5 flex items-center justify-center shrink-0">
                    <i className={`${action.icon} text-base`}></i>
                  </span>
                  <span className="text-sm font-medium">{action.label}</span>
                </Link>
              ))}
            </div>

            {/* Clima sutil — integrado ao hero */}
            <HeroWeather />

            {/* Tags de identidade */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { icon: "ri-government-line", label: "PP · Progressistas" },
                { icon: "ri-heart-line", label: "Enchentes RS 2024" },
                { icon: "ri-hotel-line", label: "Hotelaria & Eventos" },
                { icon: "ri-trophy-line", label: "Vereador mais jovem" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                  style={{
                    background: "rgba(27,42,94,0.40)",
                    border: "1px solid rgba(59,191,212,0.15)",
                  }}
                >
                  <span className="w-4 h-4 flex items-center justify-center">
                    <i className={`${item.icon} text-xs`} style={{ color: "#3BBFD4" }}></i>
                  </span>
                  <span className="text-white/50 text-xs font-medium">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ════════ COLUNA DIREITA — Foto real do Arthur (aparece PRIMEIRO no mobile) ════════ */}
          <div className="flex items-end justify-center relative mt-4 lg:mt-0 order-1 lg:order-2">
            <div className="relative w-full max-w-[400px] mx-auto px-4 lg:px-0">

              {/* Brilho atrás da foto — teal da marca */}
              <div
                className="absolute inset-0 rounded-3xl scale-110 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(ellipse at center, rgba(59,191,212,0.18) 0%, rgba(232,160,32,0.10) 50%, transparent 70%)",
                  filter: "blur(40px)",
                }}
              ></div>

              {/* Faixa decorativa à esquerda */}
              <div
                className="absolute left-4 lg:left-[-12px] top-8 bottom-8 w-1 rounded-full"
                style={{ background: "linear-gradient(to bottom, #3BBFD4, #E8A020, #3BBFD4)" }}
              ></div>

              {/* ── Foto real: Arthur na Câmara Municipal (IMG_9705) ── */}
              <div
                className="relative rounded-3xl overflow-hidden ml-4 lg:ml-0"
                style={{ border: "2px solid rgba(59,191,212,0.25)" }}
              >
                <img
                  src={ARTHUR_CAMARA_URL}
                  alt="Arthur Halal — Vereador na Câmara Municipal de Pelotas"
                  className="w-full object-cover object-top"
                  style={{ height: "clamp(320px, 55vw, 560px)" }}
                />
                {/* Gradiente inferior */}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(13,22,41,0.95) 0%, rgba(13,22,41,0.15) 40%, transparent 65%)",
                  }}
                ></div>

                {/* ── Dois cards lado a lado na base da foto ── */}
                <div className="absolute bottom-3 left-3 right-3 flex items-stretch gap-2">
                  {/* Card Legado Familiar */}
                  <div
                    className="flex-1 rounded-xl px-3 py-2.5 flex items-center gap-2"
                    style={{
                      background: "rgba(13,22,41,0.92)",
                      backdropFilter: "blur(20px)",
                      border: "1px solid rgba(232,160,32,0.28)",
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: "rgba(232,160,32,0.15)" }}
                    >
                      <i className="ri-government-line text-xs" style={{ color: "#E8A020" }}></i>
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-xs font-bold leading-tight whitespace-nowrap">Mais Jovem</p>
                      <p className="text-white/40 text-xs leading-tight">Vereador de Pelotas</p>
                    </div>
                  </div>

                  {/* Card Arthur Halal */}
                  <div
                    className="flex-1 rounded-xl px-3 py-2.5 flex items-center gap-2"
                    style={{
                      background: "rgba(13,22,41,0.92)",
                      backdropFilter: "blur(20px)",
                      border: "1px solid rgba(59,191,212,0.20)",
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: "#E8A020" }}
                    >
                      <i className="ri-lightbulb-line text-xs" style={{ color: "#0D1629" }}></i>
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-xs tracking-wide uppercase leading-tight" style={{ color: "#FFFFFF" }}>
                        ARTHUR <span style={{ color: "#E8A020" }}>HALAL</span>
                      </p>
                      <p className="text-white/45 text-xs leading-tight">PP · Pelotas/RS</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Badge teal — reposicionado para não sair da tela no mobile */}
              <div
                className="absolute top-0 right-4 lg:-right-4 lg:-top-4 rounded-2xl px-3 py-2.5"
                style={{
                  background: "rgba(59,191,212,0.12)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(59,191,212,0.30)",
                }}
              >
                <p className="text-xs font-bold text-center leading-tight" style={{ color: "#3BBFD4" }}>
                  Mandato<br />2024–2028
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator — só no desktop para não sobrepor conteúdo mobile */}
      <div className="hidden md:flex absolute bottom-6 left-1/2 -translate-x-1/2 flex-col items-center gap-2 opacity-25 pointer-events-none select-none">
        <div
          className="w-5 h-8 rounded-full flex items-start justify-center pt-1.5"
          style={{ border: "1px solid rgba(255,255,255,0.18)" }}
        >
          <span
            className="w-1 h-2 rounded-full animate-bounce inline-block"
            style={{ background: "#E8A020" }}
          ></span>
        </div>
      </div>
    </section>
  );
}