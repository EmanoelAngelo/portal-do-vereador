import { Link } from "react-router-dom";

// IMG_9705 — Arthur na câmara, placa "Arthur Halal PP"
const ARTHUR_CAMARA_URL =
  "https://static.readdy.ai/image/c11839f9cb40eb5a775c7152bc2e0943/c74a8221312599494c652306a9b66f21.jpeg";

// IMG_9706 — Foto do Arthur (seção Sobre — foto principal)
const ARTHUR_SOBRE_URL =
  "https://static.readdy.ai/image/c11839f9cb40eb5a775c7152bc2e0943/d641b51c79867bc8fc596e3ae6eabbb4.jpeg";

// IMG_9717 — Vista aérea Mercado Público Pelotas
const PELOTAS_AERIAL_URL =
  "https://static.readdy.ai/image/c11839f9cb40eb5a775c7152bc2e0943/8b3826bfcad0bf7a40b2d53002bd1ed5.webp";

// Paleta da marca: #1B2A5E (marinho), #E8A020 (âmbar), #3BBFD4 (teal), #FFFFFF
const achievements = [
  {
    icon: "ri-trophy-line",
    title: "Vereador Mais Jovem",
    desc: "Eleito um dos mais jovens vereadores da história de Pelotas, trazendo energia e novas ideias à Câmara Municipal.",
    color: "#E8A020",
  },
  {
    icon: "ri-heart-2-line",
    title: "Ação nas Enchentes RS",
    desc: "Liderou força-tarefa de socorro durante as enchentes históricas do RS em 2024 — arrecadação, abrigos e assistência direta.",
    color: "#3BBFD4",
  },
  {
    icon: "ri-hotel-line",
    title: "Empreendedor & Cultural",
    desc: "Diretor dos Hotéis Jacques Georges, produtor cultural e de eventos, e dirigente do Clube Sociedade Libanesa de Pelotas.",
    color: "#E8A020",
  },
  {
    icon: "ri-star-line",
    title: "Vereador Mais Novo de Pelotas",
    desc: "Arthur Halal é o vereador mais novo eleito de Pelotas, representando a nova geração com energia, inovação e compromisso real com a cidade.",
    color: "#3BBFD4",
  },
];

const timeline = [
  { year: "UCPel", desc: "Formado em Administração de Empresas", color: "#3BBFD4" },
  { year: "Hotéis", desc: "Diretor dos Hotéis Jacques Georges", color: "#E8A020" },
  { year: "Eventos", desc: "Produtor cultural em Pelotas", color: "#3BBFD4" },
  { year: "2024", desc: "Eleito Vereador — PP", color: "#E8A020" },
];

const pelotasGrid = [
  {
    img: "https://static.readdy.ai/image/c11839f9cb40eb5a775c7152bc2e0943/6fbc7edf9503518b02ffbaa08030c7a9.jpeg",
    label: "Igreja Cabeluda",
  },
  {
    img: "https://static.readdy.ai/image/c11839f9cb40eb5a775c7152bc2e0943/5dc9c058fce454b15eb41eda6023b700.jpeg",
    label: "Catedral São Francisco",
  },
  {
    img: "https://static.readdy.ai/image/c11839f9cb40eb5a775c7152bc2e0943/fb97ca3eef4ff161bbe726c6016c4e1c.jpeg",
    label: "Vista Aérea de Pelotas",
  },
  {
    img: "https://static.readdy.ai/image/c11839f9cb40eb5a775c7152bc2e0943/abad16e951bd24515da2729f32183851.webp",
    label: "Praça Cel. Pedro Osório",
  },
  {
    img: "https://static.readdy.ai/image/c11839f9cb40eb5a775c7152bc2e0943/d4d406ef449427e9b6ab8ec1fc3e0936.jpeg",
    label: "Trapiche do Laranjal",
  },
];

export default function AboutSection() {
  return (
    <section
      id="sobre"
      className="relative py-24 md:py-36 overflow-hidden"
      style={{ background: "#0D1629" }}
    >
      {/* Fundo: foto aérea de Pelotas */}
      <div className="absolute inset-0 pointer-events-none">
        <img
          src={PELOTAS_AERIAL_URL}
          alt="Pelotas vista aérea"
          className="w-full h-full object-cover object-center"
          style={{ opacity: 0.08 }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(13,22,41,0.96) 0%, rgba(27,42,94,0.85) 50%, rgba(13,22,41,0.96) 100%)",
          }}
        ></div>
      </div>

      {/* Linha teal topo */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5 pointer-events-none"
        style={{
          background:
            "linear-gradient(to right, transparent 0%, #3BBFD4 30%, #E8A020 60%, transparent 100%)",
        }}
      ></div>

      {/* Brilhos decorativos */}
      <div
        className="absolute top-1/2 right-0 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: "rgba(27,42,94,0.6)", filter: "blur(100px)" }}
      ></div>
      <div
        className="absolute bottom-1/4 left-0 w-[300px] h-[300px] rounded-full pointer-events-none"
        style={{ background: "rgba(59,191,212,0.07)", filter: "blur(80px)" }}
      ></div>

      <div className="relative max-w-screen-xl mx-auto px-4 md:px-8">

        {/* ── Cabeçalho ── */}
        <div className="text-center mb-12 md:mb-16">
          <p
            className="text-sm font-bold tracking-[0.32em] uppercase mb-3"
            style={{ color: "#3BBFD4" }}
          >
            QUEM É
          </p>
          <h2 className="font-black text-white leading-none tracking-tight" style={{ fontSize: "clamp(2.4rem, 5vw, 4rem)" }}>
            ARTHUR{" "}
            <span
              className="px-3 py-1 rounded-md inline-block"
              style={{ background: "#E8A020", color: "#0D1629" }}
            >
              HALAL
            </span>
          </h2>
          <div className="flex items-center justify-center gap-4 mt-5">
            <div className="h-0.5 w-14" style={{ background: "linear-gradient(to right, transparent, #3BBFD4)" }}></div>
            <span className="text-white/60 text-xs tracking-widest uppercase">
              Vereador · Pelotas, RS
            </span>
            <div className="h-0.5 w-14" style={{ background: "linear-gradient(to left, transparent, #3BBFD4)" }}></div>
          </div>
        </div>

        {/* ── Foto do Arthur no mobile (visível apenas em telas pequenas) ── */}
        <div className="lg:hidden mb-10">
          <div
            className="relative rounded-3xl overflow-hidden mx-auto"
            style={{ maxWidth: "420px", border: "2px solid rgba(59,191,212,0.20)" }}
          >
            <img
              src={ARTHUR_SOBRE_URL}
              alt="Arthur Halal — Vereador de Pelotas"
              className="w-full object-cover object-top"
              style={{ maxHeight: "480px", minHeight: "320px" }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to top, rgba(13,22,41,0.90) 0%, rgba(13,22,41,0.05) 45%, transparent 100%)",
              }}
            ></div>
            {/* Faixa lateral esquerda */}
            <div
              className="absolute left-0 top-0 bottom-0 w-1"
              style={{ background: "linear-gradient(to bottom, #3BBFD4, #E8A020)" }}
            ></div>
            {/* Card info base */}
            <div className="absolute bottom-4 left-4 right-4">
              <div
                className="rounded-2xl p-3"
                style={{
                  background: "rgba(13,22,41,0.90)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(59,191,212,0.20)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "#E8A020" }}
                  >
                    <i className="ri-lightbulb-line text-base" style={{ color: "#0D1629" }}></i>
                  </div>
                  <div>
                    <p className="font-black tracking-widest uppercase text-sm text-white">
                      ARTHUR <span style={{ color: "#E8A020" }}>HALAL</span>
                    </p>
                    <p className="text-white/70 text-xs mt-0.5">Vereador · PP · Câmara Municipal de Pelotas</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Grid principal (desktop) ── */}
        <div className="grid lg:grid-cols-2 gap-14 xl:gap-20 items-start">

          {/* ESQUERDA — Fotos do Arthur (hidden no mobile, já mostrado acima) */}
          <div className="relative hidden lg:block">
            {/* Foto principal */}
            <div
              className="relative rounded-3xl overflow-hidden"
              style={{ border: "2px solid rgba(59,191,212,0.20)" }}
            >
              <img
                src={ARTHUR_SOBRE_URL}
                alt="Arthur Halal — Vereador de Pelotas"
                className="w-full object-cover object-top"
                style={{ maxHeight: "580px", minHeight: "400px" }}
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, rgba(13,22,41,0.88) 0%, rgba(13,22,41,0.05) 45%, transparent 100%)",
                }}
              ></div>
              {/* Faixa lateral esquerda */}
              <div
                className="absolute left-0 top-0 bottom-0 w-1"
                style={{ background: "linear-gradient(to bottom, #3BBFD4, #E8A020)" }}
              ></div>
              {/* Card info base */}
              <div className="absolute bottom-5 left-5 right-5">
                <div
                  className="rounded-2xl p-4"
                  style={{
                    background: "rgba(13,22,41,0.90)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(59,191,212,0.20)",
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "#E8A020" }}
                    >
                      <i className="ri-lightbulb-line text-lg" style={{ color: "#0D1629" }}></i>
                    </div>
                    <div>
                      <p className="font-black tracking-widest uppercase text-sm text-white">
                        ARTHUR <span style={{ color: "#E8A020" }}>HALAL</span>
                      </p>
                      <p className="text-white/70 text-xs mt-0.5 tracking-wide">
                        Vereador · PP · Câmara Municipal de Pelotas
                      </p>
                    </div>
                  </div>
                  <div
                    className="mt-3 pt-3 flex items-center gap-2"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ background: "#3BBFD4" }}></div>
                    <p className="text-white/55 text-xs">
                      Mandato 2024–2028 · Partido Progressista · Pelotas, RS
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Miniatura: Arthur na câmara */}
            <div
              className="absolute -bottom-6 -right-6 hidden xl:block rounded-2xl overflow-hidden"
              style={{
                width: "165px",
                height: "125px",
                border: "2px solid rgba(232,160,32,0.35)",
              }}
            >
              <img
                src={ARTHUR_CAMARA_URL}
                alt="Arthur Halal na Câmara"
                className="w-full h-full object-cover object-top"
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, rgba(13,22,41,0.80) 0%, transparent 55%)",
                }}
              ></div>
              <p className="absolute bottom-2 left-2 text-white text-xs font-semibold">
                Na Câmara
              </p>
            </div>

            {/* Timeline lateral */}
            <div className="hidden xl:flex flex-col gap-2.5 absolute -left-10 top-10">
              {timeline.map((t) => (
                <div key={t.year} className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: t.color }}
                  ></div>
                  <div
                    className="rounded-xl px-3 py-2 text-xs"
                    style={{
                      background: "rgba(13,22,41,0.95)",
                      border: `1px solid ${t.color}30`,
                      minWidth: "170px",
                    }}
                  >
                    <span className="font-bold" style={{ color: t.color }}>
                      {t.year}
                    </span>
                    <span className="text-white/60 ml-2">{t.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* DIREITA — Bio + conquistas */}
          <div className="space-y-8">
            <div className="space-y-4 text-white/80 text-base leading-relaxed">
              <p>
                Arthur Halal é um{" "}
                <strong className="text-white font-semibold">jovem empreendedor de Pelotas</strong>,
                formado em Administração de Empresas pela UCPel. Atua nos ramos de{" "}
                <strong className="text-white font-semibold">hotelaria e eventos</strong>,
                sendo diretor dos Hotéis Jacques Georges e produtor cultural.
              </p>
              <p>
                É dirigente do{" "}
                <strong className="text-white font-semibold">Clube Sociedade Libanesa</strong>{" "}
                e apaixonado por esportes — pratica futebol, beach tennis, padel e surf.
                A família é sua grande inspiração e a base de todas as suas decisões.
              </p>
              <p>
                Carrega o legado do pai,{" "}
                <strong className="text-white font-semibold">Eduardo Abreu</strong>, e do avô,{" "}
                <strong className="text-white font-semibold">Elbio Abreu</strong>,
                vereadores com trabalho reconhecido em Pelotas. Filiado ao{" "}
                <strong className="text-white font-semibold">Partido Progressista (PP)</strong>,
                Arthur chegou à Câmara para representar a nova geração pelotense com
                transparência e compromisso real.
              </p>
            </div>

            {/* Conquistas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {achievements.map((item) => (
                <div
                  key={item.title}
                  className="flex items-start gap-4 p-4 rounded-xl transition-all hover:scale-[1.02]"
                  style={{
                    background: "rgba(27,42,94,0.35)",
                    border: `1px solid ${item.color}30`,
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: `${item.color}22` }}
                  >
                    <span className="w-5 h-5 flex items-center justify-center">
                      <i className={`${item.icon} text-lg`} style={{ color: item.color }}></i>
                    </span>
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{item.title}</p>
                    <p className="text-white/65 text-xs mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Esportes */}
            <div className="flex flex-wrap gap-2">
              {["Futebol", "Beach Tennis", "Padel", "Surf"].map((sport) => (
                <span
                  key={sport}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{
                    background: "rgba(59,191,212,0.12)",
                    border: "1px solid rgba(59,191,212,0.30)",
                    color: "#3BBFD4",
                  }}
                >
                  <i className="ri-run-line mr-1"></i>
                  {sport}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/requerimento"
                className="inline-flex items-center gap-2 px-6 py-3 text-[#0D1629] font-bold rounded-xl transition-all duration-200 hover:scale-105 cursor-pointer whitespace-nowrap"
                style={{ background: "#E8A020" }}
              >
                <i className="ri-file-add-line text-sm"></i>
                Enviar Requerimento
              </Link>
              <Link
                to="/fale-conosco"
                className="inline-flex items-center gap-2 px-6 py-3 font-bold rounded-xl transition-all duration-200 hover:scale-105 cursor-pointer whitespace-nowrap"
                style={{
                  border: "1px solid rgba(59,191,212,0.40)",
                  background: "rgba(59,191,212,0.10)",
                  color: "#3BBFD4",
                }}
              >
                <i className="ri-message-3-line text-sm"></i>
                Fale Conosco
              </Link>
            </div>
          </div>
        </div>

        {/* ── Grid de fotos de Pelotas ── */}
        <div className="mt-20">
          <p
            className="text-center text-xs font-bold tracking-[0.32em] uppercase mb-6"
            style={{ color: "rgba(59,191,212,0.65)" }}
          >
            PELOTAS · RIO GRANDE DO SUL
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {pelotasGrid.map((city) => (
              <div
                key={city.label}
                className="relative rounded-2xl overflow-hidden group cursor-pointer"
                style={{ height: "140px" }}
              >
                <img
                  src={city.img}
                  alt={city.label}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(13,22,41,0.85) 0%, transparent 55%)",
                  }}
                ></div>
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white text-xs font-semibold">{city.label}</p>
                  <p className="text-white/60 text-xs">Pelotas, RS</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}