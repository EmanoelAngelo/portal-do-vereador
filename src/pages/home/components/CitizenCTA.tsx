import { Link } from "react-router-dom";

const channels = [
  {
    icon: "ri-file-text-line",
    title: "Requerimento",
    desc: "Solicite obras e melhorias para o seu bairro oficialmente.",
    href: "/requerimento",
    badge: "Mais usado",
  },
  {
    icon: "ri-lightbulb-line",
    title: "Sugestão de Projeto",
    desc: "Proponha novas ideias e contribua com o mandato.",
    href: "/sugestao-projeto",
    badge: "",
  },
  {
    icon: "ri-chat-3-line",
    title: "Fale Conosco",
    desc: "Entre em contato direto com o gabinete do vereador.",
    href: "/fale-conosco",
    badge: "",
  },
  {
    icon: "ri-user-line",
    title: "Área do Cidadão",
    desc: "Acompanhe suas demandas e histórico de atendimentos.",
    href: "/cidadao",
    badge: "",
  },
];

export default function CitizenCTA() {
  return (
    <section className="py-20 md:py-28 bg-white relative z-10">
      <div className="max-w-screen-xl mx-auto px-4 md:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <div className="space-y-8">
            <div>
              <p className="text-[#0369A1] text-sm font-semibold uppercase tracking-widest mb-3">Participação Cidadã</p>
              <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight">
                Sua voz<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0369A1] to-[#0EA5E9]">transforma Pelotas</span>
              </h2>
            </div>
            <p className="text-gray-500 text-lg leading-relaxed">
              Arthur Halal acredita que a melhor política nasce do diálogo com os cidadãos. 
              Envie requerimentos, sugira projetos e acompanhe tudo de perto.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {channels.map((c) => (
                <Link
                  key={c.href}
                  to={c.href}
                  className="relative group flex flex-col gap-3 p-5 rounded-2xl border border-gray-100 hover:border-[#0369A1]/25 bg-gray-50/70 hover:bg-white hover:shadow-lg hover:shadow-blue-100/50 transition-all duration-300 cursor-pointer"
                >
                  {c.badge && (
                    <span className="absolute top-4 right-4 px-2 py-0.5 bg-[#0369A1] text-white text-xs font-bold rounded-full">{c.badge}</span>
                  )}
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0369A1] to-[#0EA5E9] flex items-center justify-center shadow-md shadow-blue-200">
                    <span className="w-5 h-5 flex items-center justify-center">
                      <i className={`${c.icon} text-white text-lg`}></i>
                    </span>
                  </div>
                  <div>
                    <p className="text-gray-900 font-bold text-sm group-hover:text-[#0369A1] transition-colors">{c.title}</p>
                    <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{c.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Right — Image */}
          <div className="relative rounded-3xl overflow-hidden">
            <img
              src="https://readdy.ai/api/search-image?query=Diverse%20Brazilian%20people%20gathered%20in%20a%20vibrant%20outdoor%20public%20square%20in%20southern%20Brazil%20Pelotas%20Rio%20Grande%20do%20Sul%2C%20citizens%20smiling%20and%20talking%20near%20a%20gazebo%20with%20warm%20afternoon%20golden%20sunlight%2C%20trees%20with%20green%20leaves%2C%20authentic%20civic%20participation%20scene%2C%20editorial%20photography%2C%20high%20quality%20warm%20tones&width=600&height=650&seq=citizen-cta-participacao-2026&orientation=portrait"
              alt="Cidadãos participando do mandato de Arthur Halal"
              className="w-full h-full object-cover object-top"
              style={{ maxHeight: "520px" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#020C1B]/50 via-transparent to-transparent"></div>
            <div className="absolute bottom-6 left-6 right-6 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-5">
              <p className="text-white font-bold text-base mb-1">"Pelotas precisa de participação, não de espectadores."</p>
              <p className="text-white/60 text-sm">— Arthur Halal, Vereador</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}