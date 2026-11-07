import { useParams, Link } from "react-router-dom";
import { useState, useEffect, useLayoutEffect, useCallback } from "react";
import Navbar from "@/components/feature/Navbar";
import Footer from "@/components/feature/Footer";
import FloatingButtons from "@/components/feature/FloatingButtons";
import { fetchREST } from "@/lib/supabase";
import { setPageMeta, setPageMetaFromQueryParams } from "@/lib/og";
import { shareContent } from "@/lib/share";

interface NewsItem {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  content: string | null;
  image_url: string | null;
  category: string;
  author: string;
  published_at: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });
}

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

export default function NewsDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [news, setNews] = useState<NewsItem | null>(null);
  const [related, setRelated] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // OG IMEDIATO via query params — antes de qualquer render
  useLayoutEffect(() => {
    setPageMetaFromQueryParams();
  }, []);

  // Carrega a notícia — pública, sem necessidade de auth
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    const load = async () => {
      const itemPromise = fetchREST<NewsItem>("news", {
        select: "*",
        slug: `eq.${slug}`,
        status: "eq.published",
      });

      const item = await fetchWithTimeout(itemPromise, 5000);
      if (cancelled) return;

      if (!item || item.length === 0) {
        setError(true);
        setLoading(false);
        return;
      }

      const loaded = item[0];
      setNews(loaded);

      const relatedPromise = fetchREST<NewsItem>("news", {
        select: "id,title,slug,image_url,category,published_at,summary,content,author",
        status: "eq.published",
        slug: `neq.${slug}`,
        order: "published_at.desc",
        limit: "3",
      });
      const rel = await fetchWithTimeout(relatedPromise, 5000);
      if (!cancelled) {
        setRelated(rel ?? []);
      }

      setLoading(false);

      setPageMeta({
        title: `${loaded.title} — Arthur Halal | Vereador de Pelotas`,
        description: loaded.summary ?? loaded.title,
        image: loaded.image_url ?? "https://static.readdy.ai/image/c11839f9cb40eb5a775c7152bc2e0943/c74a8221312599494c652306a9b66f21.jpeg",
      });
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // URL do site real para compartilhamento
  const shareUrl = useCallback(() => {
    if (typeof window === "undefined" || !news) return "";
    return `${window.location.origin}/noticias/${news.slug}`;
  }, [news]);

  const shareText = useCallback(() => news?.title ?? "", [news]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#0369A1] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !news) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <Navbar />
        <div className="max-w-screen-xl mx-auto px-4 md:px-8 py-20 text-center">
          <i className="ri-newspaper-line text-gray-200 text-6xl mb-4 block"></i>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Notícia não encontrada</h1>
          <p className="text-gray-500 mb-6">Esta notícia pode ter sido removida ou não está mais disponível.</p>
          <Link
            to="/noticias"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#0369A1] text-white font-semibold rounded-xl cursor-pointer whitespace-nowrap"
          >
            <i className="ri-arrow-left-line"></i> Ver todas as notícias
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />

      {/* Banner */}
      <section className="relative h-72 md:h-[420px] overflow-hidden">
        {news.image_url ? (
          <img
            src={news.image_url}
            alt={news.title}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: "50% 20%" }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#020C1B] to-[#051525]"></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#020C1B]/90 via-[#020C1B]/30 to-[#020C1B]/10"></div>
        <div className="absolute bottom-0 left-0 right-0 max-w-screen-xl mx-auto px-4 md:px-8 pb-8 md:pb-12">
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#0369A1] text-white text-xs font-bold mb-4">
            {news.category}
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-tight max-w-4xl">
            {news.title}
          </h1>
        </div>
      </section>

      <div className="max-w-screen-xl mx-auto px-4 md:px-8 py-10">
        <div className="grid lg:grid-cols-3 gap-10">
          {/* Article */}
          <article className="lg:col-span-2">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
              <Link to="/" className="hover:text-[#0369A1] transition-colors">
                Início
              </Link>
              <i className="ri-arrow-right-s-line text-gray-300"></i>
              <Link to="/noticias" className="hover:text-[#0369A1] transition-colors">
                Notícias
              </Link>
              <i className="ri-arrow-right-s-line text-gray-300"></i>
              <span className="text-[#0369A1] font-medium line-clamp-1">{news.title}</span>
            </div>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 mb-8 pb-6 border-b border-[#DBEAFE]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center">
                  <span className="w-4 h-4 flex items-center justify-center">
                    <i className="ri-user-line text-[#0369A1] text-xs"></i>
                  </span>
                </div>
                <span className="text-gray-700 text-sm font-medium">{news.author}</span>
              </div>
              <span className="text-gray-400 text-sm flex items-center gap-1">
                <span className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-calendar-line text-xs text-[#0369A1]"></i>
                </span>
                {formatDate(news.published_at)}
              </span>
            </div>

            {/* Summary */}
            {news.summary && (
              <p className="text-gray-600 text-lg leading-relaxed font-medium mb-8 p-5 bg-[#EFF6FF] border-l-4 border-[#0369A1] rounded-r-xl">
                {news.summary}
              </p>
            )}

            {/* Content */}
            <div className="space-y-5">
              {news.content ? (
                news.content.split("\n\n").map((para, i) => (
                  <p key={i} className="text-gray-700 text-base leading-relaxed">
                    {para}
                  </p>
                ))
              ) : (
                <>
                  <p className="text-gray-700 text-base leading-relaxed">{news.summary}</p>
                  <p className="text-gray-700 text-base leading-relaxed">
                    Arthur Halal destacou a importância da participação popular neste processo.
                    "Cada projeto nasce do diálogo com a comunidade. Ouvimos os moradores,
                    identificamos as necessidades reais e trabalhamos para transformar essas
                    demandas em realidade", afirmou o parlamentar.
                  </p>
                  <blockquote className="border-l-4 border-[#0369A1] pl-6 py-2 my-8 bg-[#F0F7FF] rounded-r-xl">
                    <p className="text-gray-700 text-lg italic leading-relaxed">
                      "Novas ideias, nova política. Pelotas merece um futuro mais justo e inovador."
                    </p>
                    <footer className="mt-3">
                      <cite className="text-[#0369A1] font-semibold not-italic">
                        — Arthur Halal, Vereador de Pelotas
                      </cite>
                    </footer>
                  </blockquote>
                </>
              )}
            </div>

            {/* Share */}
            <div className="mt-10 pt-8 border-t border-[#DBEAFE]">
              <p className="text-gray-700 font-bold mb-4 text-sm uppercase tracking-wider">
                Compartilhar
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                {/* Instagram */}
                <button
                  onClick={() =>
                    shareContent("instagram", {
                      title: news.title,
                      text: shareText(),
                      url: shareUrl(),
                    })
                  }
                  className="flex items-center gap-2 px-5 py-3 rounded-xl text-white text-sm font-semibold bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] hover:opacity-90 transition-all cursor-pointer whitespace-nowrap shadow-lg shadow-purple-500/20"
                >
                  <span className="w-5 h-5 flex items-center justify-center">
                    <i className="ri-instagram-line text-base"></i>
                  </span>
                  Instagram
                </button>

                {/* WhatsApp */}
                <button
                  onClick={() =>
                    shareContent("whatsapp", {
                      title: news.title,
                      text: shareText(),
                      url: shareUrl(),
                    })
                  }
                  className="flex items-center gap-2 px-5 py-3 rounded-xl text-white text-sm font-semibold bg-[#25D366] hover:bg-[#1ebe5c] transition-all cursor-pointer whitespace-nowrap shadow-lg shadow-green-500/20"
                >
                  <span className="w-5 h-5 flex items-center justify-center">
                    <i className="ri-whatsapp-line text-base"></i>
                  </span>
                  WhatsApp
                </button>

                {/* Compartilhar (menu nativo) */}
                <button
                  onClick={() =>
                    shareContent("share", {
                      title: news.title,
                      text: shareText(),
                      url: shareUrl(),
                    })
                  }
                  className="flex items-center gap-2 px-5 py-3 rounded-xl text-white text-sm font-semibold bg-[#0369A1] hover:bg-[#0284C7] transition-all cursor-pointer whitespace-nowrap shadow-lg shadow-blue-500/20"
                >
                  <span className="w-5 h-5 flex items-center justify-center">
                    <i className="ri-share-forward-line text-base"></i>
                  </span>
                  Compartilhar
                </button>
              </div>
            </div>

            <div className="mt-8">
              <Link
                to="/noticias"
                className="flex items-center gap-2 text-[#0369A1] font-semibold hover:gap-3 transition-all cursor-pointer"
              >
                <span className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-arrow-left-line text-sm"></i>
                </span>
                Voltar para Notícias
              </Link>
            </div>
          </article>

          {/* Sidebar */}
          <aside className="space-y-5">
            {related.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#DBEAFE] p-5">
                <h3 className="text-gray-900 font-bold mb-4 text-sm uppercase tracking-wider">
                  Notícias Relacionadas
                </h3>
                <ul className="space-y-4">
                  {related.map((r) => (
                    <li key={r.id}>
                      <Link to={`/noticias/${r.slug}`} className="group flex gap-3 cursor-pointer">
                        <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-gray-100">
                          {r.image_url && (
                            <img
                              src={r.image_url}
                              alt={r.title}
                              className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-800 font-semibold text-sm leading-snug group-hover:text-[#0369A1] transition-colors line-clamp-2">
                            {r.title}
                          </p>
                          <p className="text-gray-400 text-xs mt-1">{formatDate(r.published_at)}</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-gradient-to-br from-[#020C1B] to-[#051525] rounded-2xl p-6 text-center">
              <div className="w-14 h-14 flex items-center justify-center rounded-2xl bg-[#0369A1]/20 mx-auto mb-4">
                <span className="w-7 h-7 flex items-center justify-center">
                  <i className="ri-file-add-line text-[#38BDF8] text-2xl"></i>
                </span>
              </div>
              <h3 className="text-white font-bold mb-2">Tem uma solicitação?</h3>
              <p className="text-white/50 text-sm mb-4">
                Envie um requerimento para o gabinete de Arthur Halal
              </p>
              <Link
                to="/requerimento"
                className="block w-full py-3 bg-gradient-to-r from-[#0369A1] to-[#0EA5E9] text-white font-semibold rounded-xl transition-all cursor-pointer text-sm whitespace-nowrap hover:shadow-lg hover:shadow-blue-500/20"
              >
                Enviar Requerimento
              </Link>
            </div>
          </aside>
        </div>
      </div>

      <Footer />
      <FloatingButtons />
    </div>
  );
}