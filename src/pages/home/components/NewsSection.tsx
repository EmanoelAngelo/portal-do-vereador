import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase, waitForAuthReady, getEdgeFunctionUrl, supabaseAnonKey } from "@/lib/supabase";

interface NewsItem {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  image_url: string | null;
  category: string;
  published_at: string;
}

const fallbackNews: NewsItem[] = [
  {
    id: 1,
    title: "Uma Nova História Começa: Arthur Halal Toma Posse como Vereador de Pelotas",
    slug: "arthur-halal-toma-posse-vereador-pelotas",
    summary: "Com esperança, fé e determinação, o mais jovem vereador de Pelotas inicia seu mandato com um compromisso inabalável com o povo pelotense.",
    image_url: "https://public.readdy.ai/ai/img_res/edited_2408a0b15bf1118b66aae5c040453306_74cbe606.jpg",
    category: "Mandato",
    published_at: "2025-01-02T10:00:00.000Z",
  },
  {
    id: 2,
    title: "R$ 1,5 Milhão em Recursos para Pelotas: Arthur Halal Garante Investimento Histórico na Limpeza de Rios e Drenagem",
    slug: "arthur-halal-garante-1-5-milhao-desassorear-rs",
    summary: "Vereador Arthur Halal conquista junto à Secretaria de Desenvolvimento Urbano e Metropolitano recursos que vão transformar a infraestrutura hídrica de Pelotas.",
    image_url: "https://public.readdy.ai/ai/img_res/edited_528c3803a76af89881636b400ff9eabc_74cbe606.jpg",
    category: "Infraestrutura",
    published_at: "2025-02-12T10:00:00.000Z",
  },
  {
    id: 3,
    title: "Reajuste de 6,27% para os Professores de Pelotas é Aprovado na Câmara: Vitória da Educação",
    slug: "reajuste-magisterio-aprovado-camara",
    summary: "A Câmara de Vereadores aprova reajuste salarial para o magistério municipal, reafirmando o compromisso com uma educação de qualidade e valorização dos educadores.",
    image_url: "https://public.readdy.ai/ai/img_res/edited_1f0de37e74f8e8bc69684097f3eca5b4_74cbe606.jpg",
    category: "Educação",
    published_at: "2025-03-12T10:00:00.000Z",
  },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });
}

export default function NewsSection() {
  const [news, setNews] = useState<NewsItem[]>(fallbackNews);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadNews = async () => {
      await waitForAuthReady();
      if (cancelled) return;
      // Primary: edge function (bypass RLS, fresh data, no cache)
      try {
        const edgeFnUrl = getEdgeFunctionUrl("admin-news-manage");
        const res = await fetch(edgeFnUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: supabaseAnonKey,
          },
          body: JSON.stringify({ action: "load-news" }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.news) && data.news.length > 0) {
            const published = data.news.filter((n: any) => n.status === "published").slice(0, 6);
            if (!cancelled) setNews(published as NewsItem[]);
            if (!cancelled) setLoading(false);
            return;
          }
        }
      } catch (_) { /* fallback below */ }
      // Fallback: REST API direta
      supabase
        .from("news")
        .select("id, title, slug, summary, image_url, category, published_at")
        .eq("status", "published")
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("importance", { ascending: false })
        .order("published_at", { ascending: false })
        .limit(6)
        .then(({ data }) => {
          if (!cancelled && data && data.length > 0) setNews(data as NewsItem[]);
          if (!cancelled) setLoading(false);
        })
        .catch(() => {
          if (!cancelled) setLoading(false);
        });
    };
    loadNews();
    return () => { cancelled = true; };
  }, []);

  const next = useCallback(() => setActive((p) => (p + 1) % Math.min(news.length, 3)), [news.length]);
  const prev = useCallback(() => setActive((p) => (p - 1 + Math.min(news.length, 3)) % Math.min(news.length, 3)), [news.length]);

  useEffect(() => {
    const t = setInterval(next, 5000);
    return () => clearInterval(t);
  }, [next]);

  const featured = news[active];
  const others = news.filter((_, i) => i !== active).slice(0, 3);

  if (loading) return <div className="h-40 flex items-center justify-center bg-[#F8FBFF]"><div className="w-8 h-8 border-2 border-[#0369A1] border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <section className="py-20 md:py-28 bg-[#F0F7FF] relative z-10">
      <div className="max-w-screen-xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <div>
            <p className="text-[#0369A1] text-sm font-semibold uppercase tracking-widest mb-2">Mandato em Ação</p>
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight">
              Últimas <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0369A1] to-[#0EA5E9]">Notícias</span>
            </h2>
          </div>
          <Link
            to="/noticias"
            className="flex items-center gap-2 text-[#0369A1] font-semibold text-sm hover:gap-3 transition-all whitespace-nowrap"
          >
            Ver todas
            <span className="w-4 h-4 flex items-center justify-center">
              <i className="ri-arrow-right-line"></i>
            </span>
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Featured Card - Texto sobre a imagem, sem branco na frente */}
          <div className="lg:col-span-2 relative rounded-2xl overflow-hidden group min-h-[420px] md:min-h-[480px]">
            {/* Imagem de fundo - tamanho grande, sem gradiente branco */}
            {featured.image_url && (
              <div className="absolute inset-0">
                <img
                  src={featured.image_url}
                  alt={featured.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  style={{ objectPosition: "50% 20%" }}
                />
                {/* Gradiente ESCURO para dar contraste ao texto BRANCO */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#020C1B]/95 via-[#020C1B]/50 to-[#020C1B]/20"></div>
              </div>
            )}

            {/* Conteúdo sobre a imagem */}
            <div className="absolute inset-0 flex flex-col justify-end p-7 md:p-10">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-4 py-1.5 bg-[#0369A1] text-white text-xs font-bold rounded-full uppercase tracking-wide">
                  {featured.category}
                </span>
                <span className="text-white/70 text-sm font-medium flex items-center gap-1.5">
                  <span className="w-4 h-4 flex items-center justify-center">
                    <i className="ri-calendar-line text-xs"></i>
                  </span>
                  {formatDate(featured.published_at)}
                </span>
              </div>
              <h3 className="text-white font-extrabold text-2xl md:text-3xl leading-tight mb-3 line-clamp-3">
                {featured.title}
              </h3>
              {featured.summary && (
                <p className="text-white/80 text-sm md:text-base leading-relaxed line-clamp-2 mb-6">
                  {featured.summary}
                </p>
              )}
              <Link
                to={`/noticias/${featured.slug}`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#0369A1] text-white text-sm font-semibold rounded-xl hover:bg-[#0284C7] transition-all whitespace-nowrap w-fit"
              >
                Saiba Mais
                <span className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-arrow-right-line text-sm"></i>
                </span>
              </Link>
            </div>

            {/* Controls no topo direito */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
              <button onClick={prev} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/40 transition-all cursor-pointer">
                <i className="ri-arrow-left-s-line text-sm"></i>
              </button>
              <button onClick={next} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/40 transition-all cursor-pointer">
                <i className="ri-arrow-right-s-line text-sm"></i>
              </button>
            </div>

            {/* Dots */}
            <div className="absolute top-4 left-7 flex items-center gap-2 z-10">
              {news.slice(0, 3).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`rounded-full transition-all cursor-pointer ${i === active ? "w-8 h-2 bg-[#0369A1]" : "w-2 h-2 bg-white/50 hover:bg-white/70"}`}
                />
              ))}
            </div>
          </div>

          {/* Side cards */}
          <div className="flex flex-col gap-4">
            {others.map((item) => (
              <Link
                key={item.id}
                to={`/noticias/${item.slug}`}
                className="flex gap-4 bg-white rounded-xl p-4 border border-[#DBEAFE] hover:border-[#0369A1]/30 hover:shadow-md hover:shadow-blue-100 transition-all group cursor-pointer"
              >
                {item.image_url && (
                  <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0">
                    <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" style={{ objectPosition: "50% 20%" }} />
                  </div>
                )}
                <div className="min-w-0 flex flex-col justify-center">
                  <span className="text-[#0369A1] text-xs font-semibold uppercase tracking-wide">{item.category}</span>
                  <p className="text-gray-800 font-bold text-sm leading-snug mt-1 line-clamp-2 group-hover:text-[#0369A1] transition-colors">{item.title}</p>
                  <p className="text-gray-400 text-xs mt-1.5">{formatDate(item.published_at)}</p>
                </div>
              </Link>
            ))}
            <Link
              to="/noticias"
              className="mt-auto flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-[#0369A1]/30 text-[#0369A1] text-sm font-semibold hover:bg-[#0369A1]/5 transition-all cursor-pointer"
            >
              Ver portal de notícias
              <span className="w-4 h-4 flex items-center justify-center">
                <i className="ri-arrow-right-line"></i>
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}