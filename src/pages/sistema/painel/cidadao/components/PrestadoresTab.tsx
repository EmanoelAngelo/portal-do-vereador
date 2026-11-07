import { useState } from "react";
import { Link } from "react-router-dom";
import ImageLightbox from "@/components/feature/ImageLightbox";

interface PrestadorProfile {
  id: string;
  full_name: string | null;
  display_name: string | null;
  phone: string | null;
  neighborhood: string | null;
  education: string | null;
  expertise: string | null;
  job_type: string | null;
  job_status: string | null;
  bio: string | null;
  curriculo_pdf: string | null;
  avatar_url: string | null;
  profile_photo: string | null;
  service_categories: string | null;
  service_description: string | null;
  portfolio_photos: string | null;
}

interface PrestadoresTabProps {
  prestadores: PrestadorProfile[];
  searchPrestador: string;
  setSearchPrestador: (v: string) => void;
  filterPrestCat: string;
  setFilterPrestCat: (v: string) => void;
  selectedPrestador: PrestadorProfile | null;
  setSelectedPrestador: (v: PrestadorProfile | null) => void;
}

export default function PrestadoresTab({
  prestadores,
  searchPrestador,
  setSearchPrestador,
  filterPrestCat,
  setFilterPrestCat,
  selectedPrestador,
  setSelectedPrestador,
}: PrestadoresTabProps) {
  const allCats = ["Todas", ...Array.from(new Set(
    prestadores
      .filter((p) => p.service_categories)
      .flatMap((p) => (p.service_categories ?? "").split(",").map((s) => s.trim()).filter(Boolean))
  ))];

  const filtered = prestadores.filter((p) => {
    const q = searchPrestador.toLowerCase();
    const matchSearch = !searchPrestador ||
      (p.full_name ?? "").toLowerCase().includes(q) ||
      (p.expertise ?? "").toLowerCase().includes(q) ||
      (p.service_description ?? "").toLowerCase().includes(q) ||
      (p.bio ?? "").toLowerCase().includes(q);
    const matchCat = filterPrestCat === "Todas" || (p.service_categories ?? "").includes(filterPrestCat);
    return matchSearch && matchCat;
  });

  const getAvatar = (p: PrestadorProfile) => p.avatar_url || p.profile_photo || null;

  return (
    <div className="grid lg:grid-cols-5 gap-5">
      {/* Lista */}
      <div className="lg:col-span-2 rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="p-4 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <p className="text-white/50 text-sm font-semibold">
            <i className="ri-tools-line mr-1.5" style={{ color: "#22C55E" }}></i>
            {filtered.length} prestador{filtered.length !== 1 ? "es" : ""} disponível{filtered.length !== 1 ? "is" : ""}
          </p>
        </div>

        {/* Filtros */}
        {allCats.length > 1 && (
          <div className="p-3 border-b flex gap-1.5 flex-wrap" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
            {allCats.slice(0, 10).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterPrestCat(cat)}
                className="px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap"
                style={filterPrestCat === cat
                  ? { background: "#22C55E", color: "#0D1629" }
                  : { background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.50)", border: "1px solid rgba(255,255,255,0.10)" }}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="p-3 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          <div className="relative">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm"></i>
            <input
              type="text"
              placeholder="Buscar prestador..."
              value={searchPrestador}
              onChange={(e) => setSearchPrestador(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs text-white focus:outline-none"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.10)" }}
            />
          </div>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: "550px" }}>
          {filtered.length === 0 ? (
            <div className="py-12 text-center px-4">
              <i className="ri-tools-line text-white/10 text-4xl mb-3 block"></i>
              <p className="text-white/30 text-sm">Nenhum prestador encontrado</p>
              {(searchPrestador || filterPrestCat !== "Todas") && (
                <button
                  onClick={() => { setSearchPrestador(""); setFilterPrestCat("Todas"); }}
                  className="text-sm font-semibold mt-2 cursor-pointer"
                  style={{ color: "#22C55E" }}
                >
                  Limpar filtros
                </button>
              )}
            </div>
          ) : (
            filtered.map((p) => {
              const avatar = getAvatar(p);
              const cats = (p.service_categories ?? "").split(",").map((s) => s.trim()).filter(Boolean);
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPrestador(selectedPrestador?.id === p.id ? null : p)}
                  className="w-full text-left flex items-center gap-3 px-4 py-3.5 transition-colors cursor-pointer border-b"
                  style={selectedPrestador?.id === p.id
                    ? { background: "rgba(34,197,94,0.12)", borderColor: "rgba(255,255,255,0.05)" }
                    : { borderColor: "rgba(255,255,255,0.05)" }}
                >
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={p.full_name ?? "Prestador"}
                      className="w-11 h-11 rounded-xl object-cover object-top shrink-0 border border-white/10"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0" style={{ background: "rgba(34,197,94,0.20)", color: "#22C55E" }}>
                      {(p.full_name ?? "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{p.full_name ?? "Sem nome"}</p>
                    {p.expertise && <p className="text-white/45 text-xs truncate">{p.expertise}</p>}
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {cats.slice(0, 3).map((cat) => (
                        <span key={cat} className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "rgba(34,197,94,0.12)", color: "#22C55E" }}>
                          {cat}
                        </span>
                      ))}
                      {cats.length > 3 && <span className="text-white/30 text-xs">+{cats.length - 3}</span>}
                    </div>
                  </div>
                  <i className="ri-arrow-right-s-line text-white/20"></i>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Detail */}
      <div className="lg:col-span-3">
        {selectedPrestador ? (
          <PrestadorDetail prestador={selectedPrestador} />
        ) : (
          <div className="flex items-center justify-center rounded-2xl" style={{ minHeight: "400px", background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.10)" }}>
            <div className="text-center p-8">
              <i className="ri-tools-line text-white/10 text-5xl mb-3 block"></i>
              <p className="text-white/30 font-semibold">Selecione um prestador</p>
              <p className="text-white/20 text-sm mt-1">para ver detalhes e serviços oferecidos</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PrestadorDetail({ prestador }: { prestador: PrestadorProfile }) {
  const p = prestador;
  const avatar = p.avatar_url || p.profile_photo || null;
  const cats = (p.service_categories ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const portfolioUrls = (p.portfolio_photos ?? "").split("|").filter(Boolean);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  return (
    <div className="rounded-2xl relative" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="h-28 relative" style={{ background: "linear-gradient(135deg, #166534, #22C55E)" }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)", backgroundSize: "16px 16px" }}></div>
        <div className="absolute bottom-3 right-4 text-xs font-bold px-3 py-1 rounded-full" style={{ background: "rgba(13,22,41,0.90)", color: "#22C55E" }}>
          <i className="ri-tools-line mr-1"></i>Prestador de Serviços
        </div>
      </div>

      <div className="absolute top-[72px] left-5 z-20">
        <Link
          to={`/sistema/perfil/${p.id}`}
          className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center border-[3px] transition-opacity hover:opacity-80 cursor-pointer"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
          title="Ver perfil público"
        >
          {avatar ? (
            <img src={avatar} alt={p.full_name ?? "Prestador"} className="w-full h-full object-cover object-top" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white font-extrabold text-xl" style={{ background: "linear-gradient(135deg, #166534, #22C55E)" }}>
              {(p.full_name ?? "?").charAt(0).toUpperCase()}
            </div>
          )}
        </Link>
      </div>

      <div className="px-5 pt-8 pb-5">
        <div className="flex items-center gap-2 mb-1 mt-3">
          <h2 className="text-white font-extrabold text-xl">{p.full_name ?? "Sem nome"}</h2>
          <Link to={`/sistema/perfil/${p.id}`} className="flex items-center gap-1 text-xs font-semibold cursor-pointer hover:underline" style={{ color: "#22C55E" }}>
            <i className="ri-external-link-line"></i>Ver perfil
          </Link>
        </div>
        {p.expertise && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-4" style={{ background: "rgba(232,160,32,0.15)", color: "#E8A020", border: "1px solid rgba(232,160,32,0.25)" }}>
            <i className="ri-briefcase-4-line"></i>{p.expertise}
          </span>
        )}

        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: "Formação", value: p.education, icon: "ri-graduation-cap-line", color: "#E8A020" },
            { label: "Bairro", value: p.neighborhood, icon: "ri-map-pin-line", color: "#3BBFD4" },
            { label: "Telefone", value: p.phone, icon: "ri-phone-line", color: "#22C55E" },
            { label: "Status", value: p.job_status !== "not_looking" ? "Disponível" : "Indisponível", icon: p.job_status !== "not_looking" ? "ri-checkbox-circle-line" : "ri-pause-circle-line", color: p.job_status !== "not_looking" ? "#22C55E" : "#9CA3AF" },
          ].map((f) => (
            <div key={f.label} className="flex items-start gap-2.5 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
              <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${f.color}20` }}>
                <i className={`${f.icon} text-sm`} style={{ color: f.color }}></i>
              </span>
              <div className="min-w-0">
                <p className="text-white/35 text-xs">{f.label}</p>
                <p className="text-white font-semibold text-sm truncate">{f.value ?? "—"}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Serviços */}
        <div className="mb-4 p-4 rounded-xl" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.18)" }}>
          <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-3">
            <i className="ri-tools-line mr-1" style={{ color: "#22C55E" }}></i>
            Serviços Oferecidos
          </p>
          {cats.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {cats.map((cat) => (
                <span key={cat} className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(34,197,94,0.15)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.20)" }}>
                  {cat}
                </span>
              ))}
            </div>
          )}
          {p.service_description && (
            <p className="text-white/50 text-sm leading-relaxed">{p.service_description}</p>
          )}
          {!p.service_description && (
            <p className="text-white/30 text-sm italic">Nenhuma descrição detalhada fornecida.</p>
          )}
        </div>

        {/* Portfólio de Serviços */}
        {portfolioUrls.length > 0 && (
          <div className="mb-4">
            <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-3">
              <i className="ri-image-line mr-1" style={{ color: "#E8A020" }}></i>
              Portfólio de Serviços ({portfolioUrls.length} foto{portfolioUrls.length !== 1 ? "s" : ""})
            </p>
            <div className="grid grid-cols-3 gap-2">
              {portfolioUrls.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setLightboxUrl(url)}
                  className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group border border-white/10"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  <img
                    src={url}
                    alt={`Portfólio ${i + 1}`}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,0.40)" }}>
                    <i className="ri-zoom-in-line text-white text-lg"></i>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {p.bio && (
          <div className="mb-4 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Sobre</p>
            <p className="text-white/60 text-sm leading-relaxed">{p.bio}</p>
          </div>
        )}

        {p.curriculo_pdf && (
          <a href={p.curriculo_pdf} target="_blank" rel="nofollow noopener noreferrer" className="flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all mb-3" style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(34,197,94,0.25)" }}>
              <i className="ri-file-pdf-line text-xl" style={{ color: "#22C55E" }}></i>
            </div>
            <div>
              <p className="text-white font-bold text-sm">Currículo do profissional</p>
              <p className="text-white/40 text-xs">Clique para abrir em nova aba</p>
            </div>
            <i className="ri-external-link-line ml-auto text-white/30"></i>
          </a>
        )}

        <Link
          to={`/sistema/perfil/${p.id}`}
          className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold cursor-pointer transition-all w-full"
          style={{ background: "linear-gradient(135deg, #166534, #22C55E)", color: "white" }}
        >
          <i className="ri-user-line"></i> Ver Perfil Completo
        </Link>
      </div>

      {/* Lightbox para fotos do portfólio */}
      <ImageLightbox
        imageUrl={lightboxUrl}
        title="Portfólio de Serviços"
        isOpen={!!lightboxUrl}
        onClose={() => setLightboxUrl(null)}
      />
    </div>
  );
}