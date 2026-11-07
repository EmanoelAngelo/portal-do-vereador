import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchREST } from "@/lib/supabase";
import { shareContent } from "@/lib/share";
import Navbar from "@/components/feature/Navbar";
import Footer from "@/components/feature/Footer";
import FloatingButtons from "@/components/feature/FloatingButtons";

interface VagaReal {
  id: number;
  title: string;
  company_name: string | null;
  location: string | null;
  area: string | null;
  salary: string | null;
  type: string;
  description: string | null;
  image_url: string | null;
}

export default function OportunidadesPage() {
  const [search, setSearch] = useState("");
  const [activeArea, setActiveArea] = useState("Todas");
  const [activeJob, setActiveJob] = useState<VagaReal | null>(null);
  const [vagasReais, setVagasReais] = useState<VagaReal[]>([]);
  const [loading, setLoading] = useState(true);

  const loadVagas = async (retryCount = 0) => {
    const MAX_RETRIES = 2;
    try {
      const data = await fetchREST<VagaReal>("vagas", {
        select: "id,title,company_name,location,area,salary,type,description,image_url",
        status: "eq.active",
        order: "created_at.desc",
      });
      setVagasReais(data ?? []);
    } catch (err) {
      console.error("[Oportunidades] loadVagas exception:", err);
      if (retryCount < MAX_RETRIES) {
        setTimeout(() => loadVagas(retryCount + 1), 1000 * (retryCount + 1));
      }
    }
  };

  useEffect(() => {
    loadVagas().finally(() => setLoading(false));
  }, []);

  const areas = ["Todas", ...Array.from(new Set(vagasReais.map((v) => v.area).filter(Boolean)))];

  const filtered = vagasReais.filter((j) => {
    const matchSearch = j.title.toLowerCase().includes(search.toLowerCase()) || (j.company_name ?? "").toLowerCase().includes(search.toLowerCase());
    const matchArea = activeArea === "Todas" || j.area === activeArea;
    return matchSearch && matchArea;
  });

  const defaultImage = "https://readdy.ai/api/search-image?query=Professional%20job%20opportunity%20modern%20office%20clean%20bright%20workspace%20with%20warm%20lighting%20professional%20environment%20abstract%20geometric%20background%20corporate%20style%20high%20quality%20editorial%20photography&width=400&height=250&seq=oportunidade-default&orientation=landscape";

  const handleShare = (job: VagaReal, platform: "whatsapp" | "instagram" | "share") => {
    const url = `${window.location.origin}/sistema/vaga/${job.id}`;
    const text = `Vaga: ${job.title} — ${job.company_name ?? "Empresa"} em ${job.location ?? "Pelotas/RS"}. Confira esta oportunidade!`;
    shareContent(platform, { title: job.title, text, url });
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Navbar />

      {/* Hero */}
      <section className="bg-[#030912] pt-28 pb-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div style={{ backgroundImage: `radial-gradient(circle at 1px 1px, rgba(16,185,129,0.8) 1px, transparent 0)`, backgroundSize: "40px 40px" }} className="w-full h-full"></div>
        </div>
        <div className="relative max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8">
            <div>
              <p className="text-emerald-400 text-sm font-semibold uppercase tracking-widest mb-3">Geração de Renda</p>
              <h1 className="text-4xl md:text-6xl font-black text-white mb-4">Sistema de<br />Oportunidades</h1>
              <p className="text-white/50 text-lg max-w-xl">Conectando cidadãos pelotenses com as melhores oportunidades de emprego na cidade.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/oportunidades/login" className="flex items-center gap-2 px-6 py-3 border border-white/20 bg-white/5 text-white font-semibold rounded-xl hover:bg-white/10 transition-colors cursor-pointer whitespace-nowrap">
                <span className="w-4 h-4 flex items-center justify-center"><i className="ri-login-box-line text-sm"></i></span>
                Entrar
              </Link>
              <Link to="/oportunidades/cadastro/cidadao" className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap">
                <span className="w-4 h-4 flex items-center justify-center"><i className="ri-user-add-line text-sm"></i></span>
                Cadastrar Currículo
              </Link>
              <Link to="/oportunidades/cadastro/empresa" className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap">
                <span className="w-4 h-4 flex items-center justify-center"><i className="ri-building-4-line text-sm"></i></span>
                Cadastrar Empresa
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-screen-xl mx-auto px-4 md:px-8 py-12">
        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl focus-within:border-emerald-400 transition-colors">
            <span className="w-4 h-4 flex items-center justify-center text-gray-400">
              <i className="ri-search-line text-sm"></i>
            </span>
            <input
              type="text"
              placeholder="Buscar vagas, empresas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder-gray-400"
            />
          </div>
        </div>

        {/* Area filters */}
        <div className="flex items-center gap-2 flex-wrap mb-8">
          {areas.map((area) => (
            <button
              key={area}
              onClick={() => setActiveArea(area)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeArea === area
                  ? "bg-emerald-500 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {area}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="w-10 h-10 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400 text-sm">Carregando vagas...</p>
          </div>
        ) : (
          <>
            {/* Jobs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((job) => (
                <div key={job.id} className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-300">
                  <div className="relative h-44 overflow-hidden">
                    <img src={job.image_url || defaultImage} alt={job.title} className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500" />
                    {job.area && <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/90 text-gray-700 text-xs font-semibold">{job.area}</span>}
                    <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold">{job.type}</span>
                  </div>
                  <div className="p-5">
                    <h3 className="text-gray-900 font-bold text-base mb-1 group-hover:text-emerald-600 transition-colors">{job.title}</h3>
                    <p className="text-gray-500 text-sm flex items-center gap-1 mb-1">
                      <i className="ri-building-line text-xs"></i>{job.company_name ?? "Empresa"}
                    </p>
                    <p className="text-gray-400 text-sm flex items-center gap-1 mb-3">
                      <i className="ri-map-pin-line text-xs"></i>{job.location ?? "Pelotas/RS"}
                    </p>
                    {job.description && <p className="text-gray-500 text-xs leading-relaxed line-clamp-2 mb-4">{job.description}</p>}
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-emerald-600 font-black text-base">{job.salary ?? "A combinar"}</span>
                      <button
                        onClick={() => setActiveJob(job)}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Candidatar-se
                      </button>
                    </div>
                    {/* Botões de compartilhamento */}
                    <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                      <span className="text-gray-400 text-xs font-medium">Compartilhar:</span>
                      <button
                        onClick={() => handleShare(job, "instagram")}
                        className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-50"
                        style={{ color: "#E1306C" }}
                        title="Instagram"
                      >
                        <i className="ri-instagram-line text-base"></i>
                      </button>
                      <button
                        onClick={() => handleShare(job, "whatsapp")}
                        className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-50"
                        style={{ color: "#25D366" }}
                        title="WhatsApp"
                      >
                        <i className="ri-whatsapp-line text-base"></i>
                      </button>
                      <button
                        onClick={() => handleShare(job, "share")}
                        className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-50 text-emerald-600"
                        title="Compartilhar"
                      >
                        <i className="ri-share-forward-line text-base"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filtered.length === 0 && !loading && (
              <div className="text-center py-16">
                <span className="w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <i className="ri-search-line text-gray-200 text-5xl"></i>
                </span>
                <p className="text-gray-400 text-lg">Nenhuma vaga encontrada para os filtros selecionados.</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {activeJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setActiveJob(null)}>
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="relative h-48 overflow-hidden">
              <img src={activeJob.image_url || defaultImage} alt={activeJob.title} className="w-full h-full object-cover object-top" />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent"></div>
              <button onClick={() => setActiveJob(null)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-xl text-white hover:bg-black/60 transition-colors cursor-pointer">
                <i className="ri-close-line text-sm"></i>
              </button>
            </div>
            <div className="p-6">
              <h2 className="text-2xl font-black text-gray-900 mb-1">{activeJob.title}</h2>
              <p className="text-gray-500 text-sm mb-4">{activeJob.company_name ?? "Empresa"} · {activeJob.location ?? "Pelotas/RS"}</p>
              {activeJob.description && <p className="text-gray-600 text-sm leading-relaxed mb-4">{activeJob.description}</p>}
              <div className="flex items-center justify-between py-4 border-t border-gray-100">
                <span className="text-emerald-600 font-black text-xl">{activeJob.salary ?? "A combinar"}</span>
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold">{activeJob.type}</span>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-gray-400 text-xs font-medium">Compartilhar:</span>
                <button onClick={() => handleShare(activeJob, "instagram")} className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-50" style={{ color: "#E1306C" }} title="Instagram">
                  <i className="ri-instagram-line text-base"></i>
                </button>
                <button onClick={() => handleShare(activeJob, "whatsapp")} className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-50" style={{ color: "#25D366" }} title="WhatsApp">
                  <i className="ri-whatsapp-line text-base"></i>
                </button>
                <button onClick={() => handleShare(activeJob, "share")} className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-50 text-emerald-600" title="Compartilhar">
                  <i className="ri-share-forward-line text-base"></i>
                </button>
              </div>
              <p className="text-gray-400 text-sm text-center mb-4">Para se candidatar, faça login ou cadastre-se no sistema.</p>
              <div className="flex gap-3">
                <Link
                  to="/oportunidades/login"
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl transition-colors cursor-pointer text-sm text-center whitespace-nowrap"
                >
                  Entrar e Candidatar-se
                </Link>
                <Link
                  to="/oportunidades/cadastro/cidadao"
                  className="flex-1 py-3 border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold rounded-xl transition-colors cursor-pointer text-sm text-center whitespace-nowrap"
                >
                  Cadastrar-se
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
      <FloatingButtons />
    </div>
  );
}