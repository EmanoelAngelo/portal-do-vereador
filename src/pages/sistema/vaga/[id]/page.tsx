import { useState, useEffect, useLayoutEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { fetchREST } from "@/lib/supabase";
import { getStoredUser } from "@/hooks/useAuth";
import { setPageMeta, setPageMetaFromQueryParams } from "@/lib/og";
import { shareContent } from "@/lib/share";
import Navbar from "@/components/feature/Navbar";
import Footer from "@/components/feature/Footer";

interface VagaPublica {
  id: number;
  title: string;
  company_name: string | null;
  company_id: string | null;
  location: string | null;
  area: string | null;
  salary: string | null;
  type: string;
  description: string | null;
  requirements: string | null;
  image_url: string | null;
  created_at: string;
  status: string;
}

interface Profile {
  id: string;
  role: string;
  job_status: string | null;
}

const defaultImage =
  "https://readdy.ai/api/search-image?query=Professional%20job%20opportunity%20modern%20office%20clean%20bright%20workspace%20with%20warm%20lighting%20professional%20environment%20abstract%20geometric%20background%20corporate%20style%20high%20quality%20editorial%20photography&width=400&height=250&seq=oportunidade-default&orientation=landscape";

/** Fetch com timeout de 5 segundos */
async function fetchWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs = 5000
): Promise<T | null> {
  const timeout = new Promise<null>((_, reject) =>
    setTimeout(() => reject(new Error("Timeout")), timeoutMs)
  );
  try {
    return (await Promise.race([promise, timeout])) as T;
  } catch {
    return null;
  }
}

export default function VagaPublicaPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vaga, setVaga] = useState<VagaPublica | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  // OG IMEDIATO via query params
  useLayoutEffect(() => {
    setPageMetaFromQueryParams();
  }, []);

  // Verifica se usuário está logado e redireciona
  useEffect(() => {
    const checkAuth = async () => {
      const stored = getStoredUser();
      if (stored && stored.id) {
        setIsLoggedIn(true);
        setUserRole(stored.role);
        const prof = await fetchREST<Profile>("profiles", {
          select: "id,role,job_status",
          id: `eq.${stored.id}`,
        });
        const profile = prof?.[0] ?? null;
        const role = profile?.role ?? stored.role;
        if (role === "citizen") {
          navigate("/sistema/painel/cidadao", { replace: true });
          return;
        }
        if (role === "empresa") {
          navigate("/sistema/painel/empresa", { replace: true });
          return;
        }
        if (role === "vereador") {
          navigate("/vereador", { replace: true });
          return;
        }
        if (role === "assessor") {
          navigate("/assessor/painel", { replace: true });
          return;
        }
        if (role === "admin") {
          navigate("/admin", { replace: true });
          return;
        }
      } else {
        setIsLoggedIn(false);
      }
    };
    checkAuth();
  }, [navigate]);

  // Carrega a vaga — fetchREST bypassa auth, mais rápido
  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const vagaId = parseInt(id, 10);
      if (isNaN(vagaId)) {
        setLoading(false);
        return;
      }
      const data = await fetchREST<VagaPublica>("vagas", {
        select: "id,title,company_name,company_id,location,area,salary,type,description,requirements,image_url,created_at,status",
        id: `eq.${vagaId}`,
      });
      const loaded = data[0] ?? null;
      setVaga(loaded);
      setLoading(false);
      if (loaded) {
        const desc =
          `${loaded.company_name ?? "Empresa"} esta contratando: ${loaded.title} em ${loaded.location ?? "Pelotas/RS"}. ${loaded.type}. ${loaded.salary ?? ""} ${(loaded.description ?? "").slice(0, 120)}`;
        setPageMeta({
          title: `${loaded.title} — ${loaded.company_name ?? "Empresa"} | Oportunidades Pelotas`,
          description: desc.trim(),
          image: loaded.image_url ?? defaultImage,
        });
      }
    };
    load();
  }, [id]);

  // URL do site real para compartilhamento
  const getShareUrl = useCallback(() => {
    if (typeof window === "undefined" || !vaga) return "";
    return `${window.location.origin}/sistema/vaga/${vaga.id}`;
  }, [vaga]);

  // Compartilhamento
  const handleShare = useCallback(
    (platform: "whatsapp" | "instagram" | "share") => {
      if (!vaga) return;
      const text = `Vaga: ${vaga.title} — ${vaga.company_name ?? "Empresa"} em ${vaga.location ?? "Pelotas/RS"}. Confira esta oportunidade!`;
      shareContent(platform, { title: vaga.title, text, url: getShareUrl() });
    },
    [vaga, getShareUrl]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!vaga) {
    return (
      <div className="min-h-screen bg-[#f8fafc]">
        <Navbar />
        <div className="max-w-screen-xl mx-auto px-4 py-20 text-center">
          <i className="ri-briefcase-line text-gray-200 text-6xl mb-4 block"></i>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Vaga não encontrada</h1>
          <p className="text-gray-500 mb-6">
            Esta oportunidade pode ter sido removida ou encerrada.
          </p>
          <Link
            to="/oportunidades"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white font-semibold rounded-xl cursor-pointer whitespace-nowrap"
          >
            <i className="ri-arrow-left-line"></i> Ver todas as vagas
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Navbar />

      <div className="max-w-screen-xl mx-auto px-4 md:px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link to="/" className="hover:text-emerald-600 transition-colors">
            Início
          </Link>
          <i className="ri-arrow-right-s-line text-gray-300"></i>
          <Link to="/oportunidades" className="hover:text-emerald-600 transition-colors">
            Oportunidades
          </Link>
          <i className="ri-arrow-right-s-line text-gray-300"></i>
          <span className="text-emerald-600 font-medium line-clamp-1">{vaga.title}</span>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Conteúdo principal */}
          <div className="lg:col-span-2">
            {/* Card da vaga */}
            <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
              {vaga.image_url && (
                <div className="w-full h-56 md:h-72 overflow-hidden">
                  <img
                    src={vaga.image_url}
                    alt={vaga.title}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
              )}
              <div className="p-6 md:p-8">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                    {vaga.area ?? "Geral"}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-bold">
                    {vaga.type}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-bold">
                    {vaga.location ?? "Pelotas/RS"}
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-2">
                  {vaga.title}
                </h1>
                <p className="text-gray-500 text-sm mb-4">{vaga.company_name ?? "Empresa"}</p>

                <div className="flex items-center gap-2 mb-6">
                  <span className="text-emerald-600 font-black text-2xl">
                    {vaga.salary ?? "A combinar"}
                  </span>
                </div>

                {/* Descrição */}
                {vaga.description && (
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">
                      Descrição
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                      {vaga.description}
                    </p>
                  </div>
                )}

                {/* Requisitos */}
                {vaga.requirements && (
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">
                      Requisitos
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                      {vaga.requirements}
                    </p>
                  </div>
                )}

                {/* Compartilhar */}
                <div className="pt-6 border-t border-gray-100">
                  <p className="text-gray-700 font-bold mb-3 text-sm uppercase tracking-wider">
                    Compartilhar esta vaga
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      onClick={() => handleShare("instagram")}
                      className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white text-sm font-semibold cursor-pointer whitespace-nowrap hover:opacity-90 transition-all shadow-lg shadow-purple-500/20"
                    >
                      <i className="ri-instagram-line text-base"></i> Instagram
                    </button>
                    <button
                      onClick={() => handleShare("whatsapp")}
                      className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#25D366] text-white text-sm font-semibold cursor-pointer whitespace-nowrap hover:bg-[#1ebe5c] transition-all shadow-lg shadow-green-500/20"
                    >
                      <i className="ri-whatsapp-line text-base"></i> WhatsApp
                    </button>
                    <button
                      onClick={() => handleShare("share")}
                      className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold cursor-pointer whitespace-nowrap hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
                    >
                      <i className="ri-share-forward-line text-base"></i> Compartilhar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-5">
            {/* CTA Login */}
            <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-6">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center mb-4">
                <i className="ri-user-add-line text-emerald-600 text-xl"></i>
              </div>
              <h3 className="text-gray-900 font-bold mb-2">Quer se candidatar?</h3>
              <p className="text-gray-500 text-sm mb-4">
                Faça login ou cadastre-se para enviar sua candidatura a esta vaga.
              </p>
              <Link
                to={`/auth?from=/sistema/vaga/${vaga.id}`}
                className="block w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl text-center text-sm cursor-pointer whitespace-nowrap transition-colors"
              >
                Entrar ou Cadastrar-se
              </Link>
            </div>

            {/* Outras vagas */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="text-gray-900 font-bold mb-4 text-sm uppercase tracking-wider">
                Mais oportunidades
              </h3>
              <Link
                to="/oportunidades"
                className="flex items-center gap-2 text-emerald-600 font-semibold text-sm cursor-pointer hover:gap-3 transition-all"
              >
                Ver todas as vagas <i className="ri-arrow-right-line"></i>
              </Link>
            </div>
          </aside>
        </div>
      </div>

      <Footer />
    </div>
  );
}