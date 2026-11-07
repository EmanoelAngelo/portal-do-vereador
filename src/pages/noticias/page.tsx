import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/feature/Navbar";
import Footer from "@/components/feature/Footer";
import FloatingButtons from "@/components/feature/FloatingButtons";
import { supabase, waitForAuthReady, getEdgeFunctionUrl, supabaseAnonKey } from "@/lib/supabase";
import WeatherWidget from "@/components/feature/WeatherWidget";

interface NewsItem {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  image_url: string | null;
  image_position_x: number | null;
  image_position_y: number | null;
  image_zoom: number | null;
  category: string;
  featured: boolean;
  published_at: string;
}

const fallback: NewsItem[] = [
  { id: 19, title: "Em Brasília pelo Povo: Arthur Halal Reforça Parcerias no Congresso Nacional para Novos Investimentos em Pelotas", slug: "arthur-halal-brasilia-congresso-conquistas-2026", summary: "Vereador Arthur Halal visita o Congresso Nacional e intensifica articulações com parlamentares federais para garantir novos recursos e investimentos para Pelotas em 2026.", image_url: "https://storage.readdy-site.link/project_files/a648b711-aef8-4081-817f-4b2b1812e139/af9527d0-a586-4846-80a5-c97941a9bbd6_17.jpeg", category: "Política", featured: false, published_at: "2026-05-28T14:00:00.000Z" },
  { id: 18, title: "Recursos Garantidos para Pelotas: Arthur Halal e Deputado Westphalen Confirmam R$ 520 Mil em Emendas", slug: "recursos-garantidos-pelotas-520-mil-emendas-westphalen-2026", summary: "Em encontro em Brasília, Arthur Halal e o Deputado Federal Pedro Westphalen confirmam mais R$ 520 mil em emendas parlamentares para Pelotas.", image_url: "https://storage.readdy-site.link/project_files/a648b711-aef8-4081-817f-4b2b1812e139/d32b8bed-c308-4c5c-8843-f434d2017981_16.jpeg", category: "Infraestrutura", featured: false, published_at: "2026-05-28T10:00:00.000Z" },
  { id: 1, title: "Uma Nova História Começa: Arthur Halal Toma Posse como Vereador de Pelotas", slug: "arthur-halal-toma-posse-vereador-pelotas", summary: "Com esperança, fé e determinação, o mais jovem vereador de Pelotas inicia seu mandato com um compromisso inabalável com o povo pelotense.", image_url: "https://public.readdy.ai/ai/img_res/edited_2408a0b15bf1118b66aae5c040453306_74cbe606.jpg", category: "Mandato", featured: true, published_at: "2025-01-02T10:00:00.000Z" },
  { id: 2, title: "R$ 1,5 Milhão em Recursos para Pelotas: Arthur Halal Garante Investimento Histórico na Limpeza de Rios e Drenagem", slug: "arthur-halal-garante-1-5-milhao-desassorear-rs", summary: "Vereador Arthur Halal conquista junto à Secretaria de Desenvolvimento Urbano e Metropolitano recursos que vão transformar a infraestrutura hídrica de Pelotas.", image_url: "https://public.readdy.ai/ai/img_res/edited_528c3803a76af89881636b400ff9eabc_74cbe606.jpg", category: "Infraestrutura", featured: false, published_at: "2025-02-12T10:00:00.000Z" },
  { id: 3, title: "Investimento de R$ 1,5 Milhão é Confirmado: Arthur Halal Celebra Conquista para a Infraestrutura de Pelotas", slug: "investimento-1-5-milhao-confirmado-caff", summary: "O vereador Arthur Halal confirma oficialmente a liberação dos recursos do programa Desassorear RS para limpeza de rios e manutenção do sistema pluvial de Pelotas.", image_url: "https://public.readdy.ai/ai/img_res/edited_28d81c4651f83c820a7fa8b65914a7e5_74cbe606.jpg", category: "Infraestrutura", featured: false, published_at: "2025-02-20T10:00:00.000Z" },
  { id: 4, title: "35ª Abertura Oficial da Colheita do Arroz: Arthur Halal Celebra a Força do Agro Pelotense", slug: "35-abertura-colheita-arroz-pelotas", summary: "O vereador prestigiou a 35ª Abertura Oficial da Colheita do Arroz, evento que consolida a importância do setor agropecuário para a economia do Rio Grande do Sul.", image_url: "https://public.readdy.ai/ai/img_res/edited_b7f86f4ccb7547ddec75a7aa351a8a22_74cbe606.jpg", category: "Agricultura", featured: false, published_at: "2025-02-20T14:00:00.000Z" },
  { id: 5, title: "Reajuste de 6,27% para os Professores de Pelotas é Aprovado na Câmara: Vitória da Educação", slug: "reajuste-magisterio-aprovado-camara", summary: "A Câmara de Vereadores aprova reajuste salarial para o magistério municipal, reafirmando o compromisso com uma educação de qualidade e valorização dos educadores.", image_url: "https://public.readdy.ai/ai/img_res/edited_1f0de37e74f8e8bc69684097f3eca5b4_74cbe606.jpg", category: "Educação", featured: false, published_at: "2025-03-12T10:00:00.000Z" },
  { id: 6, title: "Arthur Halal em Brasília: R$ 600 Mil Conquistados para Pelotas em Apenas Um Dia", slug: "arthur-halal-brasilia-600-mil-pelotas", summary: "Em missão em Brasília, o vereador Arthur Halal já começa com excelentes notícias para a cidade, garantindo investimentos federais que beneficiarão a população.", image_url: "https://public.readdy.ai/ai/img_res/edited_e0270bb8c0f0b795b4cd6a486e1a5a9e_74cbe606.jpg", category: "Política", featured: false, published_at: "2025-03-18T10:00:00.000Z" },
  { id: 7, title: "R$ 600 Mil em Recursos Chegam para Pelotas: Infraestrutura, Saúde e Ação Social são Beneficiadas", slug: "600-mil-recursos-chegam-pelotas-infra-saude-social", summary: "Três importantes projetos pelotenses recebem investimentos: melhorias na Colônia Z3, laboratório de prótese dentária na UFPel e manutenção de entidades sociais.", image_url: "https://public.readdy.ai/ai/img_res/edited_9f69a7421eb41c00a0dcef79291b5392_74cbe606.jpg", category: "Ação Social", featured: false, published_at: "2025-03-22T10:00:00.000Z" },
  { id: 8, title: "Lei de Incentivos para a Moradia Digna é Aprovada: Arthur Halal Amplia o Acesso à Casa Própria em Pelotas", slug: "lei-incentivos-moradia-digna-aprovada-pelotas", summary: "A nova lei de incentivos fiscais para o programa Minha Casa, Minha Vida representa um avanço histórico na garantia do direito à moradia digna para as famílias pelotenses.", image_url: "https://public.readdy.ai/ai/img_res/edited_c0bab62f405e7658f248c92b31197d3b_74cbe606.jpg", category: "Habitação", featured: false, published_at: "2025-04-01T10:00:00.000Z" },
  { id: 9, title: "R$ 400 Mil para a Saúde de Pelotas: Arthur Halal Agradece Destinação do Senador Heinze", slug: "400-mil-saude-pelotas-senador-heinze", summary: "Recursos federais serão investidos em procedimentos de média e alta complexidade, reforçando o atendimento da Santa Casa de Pelotas e do Hospital Universitário.", image_url: "https://public.readdy.ai/ai/img_res/edited_658d2f5203a889847ef616a4d667e261_74cbe606.jpg", category: "Saúde", featured: false, published_at: "2025-05-15T10:00:00.000Z" },
  { id: 10, title: "CPI do Sanep é Instalada: Arthur Halal Preside Comissão que Investiga Contratos Superfaturados", slug: "cpi-sanep-instalada-arthur-halal-preside", summary: "A Câmara de Pelotas instala oficialmente a Comissão Parlamentar de Inquérito para apurar denúncias de superfaturamento em contratos da companhia de saneamento.", image_url: "https://public.readdy.ai/ai/img_res/edited_bc5ccdf3c5f6c2072a932dcc575e075f_74cbe606.jpg", category: "Transparência", featured: false, published_at: "2025-05-29T10:00:00.000Z" },
];

const allCategories = ["Todas", "Mandato", "Infraestrutura", "Agricultura", "Educação", "Política", "Ação Social", "Habitação", "Saúde", "Transparência"];

function getImageStyle(item: NewsItem): React.CSSProperties {
  const x = item.image_position_x ?? 50;
  const y = item.image_position_y ?? 50;
  const z = item.image_zoom ?? 1.0;
  return {
    objectPosition: `${x}% ${y}%`,
    transform: `scale(${z})`,
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" });
}

export default function NoticiasPage() {
  const [news, setNews] = useState<NewsItem[]>(fallback);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todas");
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
            const published = data.news.filter((n: NewsItem) => n.status === undefined || (n as any).status === "published");
            if (!cancelled) setNews(published as NewsItem[]);
            if (!cancelled) setLoading(false);
            return;
          }
        }
      } catch (_) { /* fallback below */ }
      // Fallback: REST API direta
      supabase
        .from("news")
        .select("id, title, slug, summary, image_url, image_position_x, image_position_y, image_zoom, category, featured, published_at")
        .eq("status", "published")
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("importance", { ascending: false })
        .order("published_at", { ascending: false })
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

  const filtered = news.filter((n) => {
    const matchSearch = n.title.toLowerCase().includes(search.toLowerCase()) || (n.summary ?? "").toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === "Todas" || n.category === activeCategory;
    return matchSearch && matchCat;
  });

  const featured = news.find((n) => n.featured) ?? news[0];
  const rest = filtered.filter((n) => n.id !== featured?.id);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />

      {/* Page Hero */}
      <section className="bg-[#020C1B] pt-28 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-4">
          <div style={{ backgroundImage: `radial-gradient(circle at 1px 1px, rgba(14,165,233,0.5) 1px, transparent 0)`, backgroundSize: "40px 40px" }} className="w-full h-full"></div>
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-40 bg-[#0369A1]/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative max-w-screen-xl mx-auto px-4 md:px-8 text-center">
          <p className="text-[#38BDF8] text-sm font-semibold uppercase tracking-widest mb-3">Portal de Notícias</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">Notícias do Mandato</h1>
          <p className="text-white/50 text-lg max-w-2xl mx-auto">
            Acompanhe todas as ações, projetos e iniciativas do mandato de Arthur Halal na Câmara Municipal de Pelotas.
          </p>
        </div>
      </section>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-[#0369A1] border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      <div className="max-w-screen-xl mx-auto px-4 md:px-8 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Featured - Imagem grande SEM gradiente branco */}
            {featured && (
              <Link to={`/noticias/${featured.slug}`} className="group block bg-white rounded-3xl overflow-hidden border border-[#DBEAFE] hover:border-[#0369A1]/30 hover:shadow-xl hover:shadow-blue-100 transition-all duration-300 cursor-pointer">
                <div className="relative h-64 md:h-80 overflow-hidden">
                  {featured.image_url && (
                    <img src={featured.image_url} alt={featured.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" style={getImageStyle(featured)} />
                  )}
                  {/* Overlay leve só no topo para badges, não cobrir a imagem */}
                  <div className="absolute inset-0 bg-gradient-to-b from-[#020C1B]/30 to-transparent"></div>
                  <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-[#0369A1] text-white text-xs font-bold">{featured.category}</span>
                  <span className="absolute top-4 right-4 px-3 py-1 rounded-full bg-[#38BDF8]/20 border border-[#38BDF8]/50 text-[#0369A1] text-xs font-bold">DESTAQUE</span>
                </div>
                <div className="p-6 md:p-8">
                  <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-3 group-hover:text-[#0369A1] transition-colors leading-tight">
                    {featured.title}
                  </h2>
                  {featured.summary && <p className="text-gray-500 text-base leading-relaxed mb-4 line-clamp-2">{featured.summary}</p>}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm flex items-center gap-1">
                      <span className="w-4 h-4 flex items-center justify-center"><i className="ri-calendar-line text-xs text-[#0369A1]"></i></span>
                      {formatDate(featured.published_at)}
                    </span>
                    <span className="text-[#0369A1] font-semibold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                      Saiba Mais <i className="ri-arrow-right-line text-xs"></i>
                    </span>
                  </div>
                </div>
              </Link>
            )}

            {/* Grid cards - Imagem sem branco */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {rest.map((item) => (
                <Link key={item.id} to={`/noticias/${item.slug}`} className="group bg-white rounded-2xl overflow-hidden border border-[#DBEAFE] hover:border-[#0369A1]/30 hover:shadow-lg hover:shadow-blue-100 transition-all duration-300 cursor-pointer">
                  <div className="relative h-48 overflow-hidden">
                    {item.image_url && (
                      <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" style={getImageStyle(item)} />
                    )}
                    {/* Overlay sutil no topo para badge */}
                    <div className="absolute inset-0 bg-gradient-to-b from-[#020C1B]/20 to-transparent"></div>
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#0369A1] text-white text-xs font-semibold">{item.category}</span>
                  </div>
                  <div className="p-5">
                    <h3 className="text-gray-900 font-bold text-base leading-snug mb-2 group-hover:text-[#0369A1] transition-colors line-clamp-2">{item.title}</h3>
                    {item.summary && <p className="text-gray-400 text-sm line-clamp-2 mb-4">{item.summary}</p>}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-xs flex items-center gap-1">
                        <span className="w-3 h-3 flex items-center justify-center"><i className="ri-calendar-line text-xs"></i></span>
                        {formatDate(item.published_at)}
                      </span>
                      <span className="text-[#0369A1] text-sm font-semibold">Saiba Mais &rarr;</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-5">
            {/* Search */}
            <div className="bg-white rounded-2xl border border-[#DBEAFE] p-5">
              <h3 className="text-gray-900 font-bold mb-4 text-sm uppercase tracking-wider">Buscar</h3>
              <div className="flex items-center gap-2 px-4 py-3 bg-[#F8FBFF] rounded-xl border border-[#DBEAFE]">
                <span className="w-4 h-4 flex items-center justify-center text-[#0369A1]">
                  <i className="ri-search-line text-sm"></i>
                </span>
                <input
                  type="text"
                  placeholder="Buscar notícias..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 bg-transparent text-gray-900 text-sm outline-none placeholder-gray-400"
                />
              </div>
            </div>

            {/* Categories */}
            <div className="bg-white rounded-2xl border border-[#DBEAFE] p-5">
              <h3 className="text-gray-900 font-bold mb-4 text-sm uppercase tracking-wider">Categorias</h3>
              <ul className="space-y-1">
                {allCategories.map((cat) => {
                  const count = cat === "Todas" ? news.length : news.filter((n) => n.category === cat).length;
                  if (count === 0 && cat !== "Todas") return null;
                  return (
                    <li key={cat}>
                      <button
                        onClick={() => setActiveCategory(cat)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                          activeCategory === cat ? "bg-[#EFF6FF] text-[#0369A1] border border-[#DBEAFE]" : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${activeCategory === cat ? "bg-[#0369A1]" : "bg-gray-300"}`}></span>
                          {cat}
                        </div>
                        <span className="text-xs text-gray-400">{count}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Últimas publicações */}
            <div className="bg-white rounded-2xl border border-[#DBEAFE] p-5">
              <h3 className="text-gray-900 font-bold mb-4 text-sm uppercase tracking-wider">Últimas publicações</h3>
              <ul className="space-y-4">
                {news.slice(0, 4).map((n, idx) => (
                  <li key={n.id}>
                    <Link to={`/noticias/${n.slug}`} className="group flex items-start gap-3 cursor-pointer">
                      <span className="text-2xl font-extrabold text-gray-100 leading-none mt-0.5 min-w-[22px]">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <p className="text-gray-800 font-semibold text-sm leading-snug group-hover:text-[#0369A1] transition-colors line-clamp-2">{n.title}</p>
                        <p className="text-gray-400 text-xs mt-1">{formatDate(n.published_at)}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Date / Weather */}
            <WeatherWidget variant="dark" />

            {/* CTA */}
            <div className="bg-gradient-to-br from-[#020C1B] to-[#051525] rounded-2xl p-6 text-white">
              <h3 className="font-bold mb-2 text-sm">Participe do mandato</h3>
              <p className="text-white/50 text-xs mb-4">Envie requerimentos, sugestões e acompanhe suas demandas.</p>
              <div className="space-y-2">
                <Link to="/requerimento" className="flex items-center gap-2 px-4 py-2.5 bg-[#0369A1]/25 border border-[#0369A1]/30 text-[#BAE6FD] text-xs font-semibold rounded-xl hover:bg-[#0369A1]/35 transition-all whitespace-nowrap">
                  <i className="ri-file-add-line"></i> Enviar Requerimento
                </Link>
                <Link to="/sugestao-projeto" className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-white/70 text-xs font-semibold rounded-xl hover:bg-white/10 transition-all whitespace-nowrap">
                  <i className="ri-lightbulb-line"></i> Sugestão de Projeto
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <Footer />
      <FloatingButtons />
    </div>
  );
}