import { mockTestimonials } from "@/mocks/testimonials";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1 mb-4">
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className="w-3.5 h-3.5 flex items-center justify-center">
          {i < rating ? (
            <i className="ri-star-fill text-[#38BDF8] text-sm"></i>
          ) : (
            <i className="ri-star-line text-[#38BDF8]/30 text-sm"></i>
          )}
        </span>
      ))}
    </div>
  );
}

export default function TestimonialsSection() {
  return (
    <section className="py-20 bg-[#020C1B] relative overflow-hidden">
      <div className="absolute inset-0 opacity-4">
        <div style={{ backgroundImage: `radial-gradient(circle at 1px 1px, rgba(14,165,233,0.5) 1px, transparent 0)`, backgroundSize: "50px 50px" }} className="w-full h-full"></div>
      </div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#0369A1]/6 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative max-w-screen-xl mx-auto px-4 md:px-8">
        <div className="text-center mb-12">
          <p className="text-[#38BDF8] text-sm font-semibold uppercase tracking-widest mb-2">O que dizem</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white">
            Voz da população de{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0EA5E9] to-[#38BDF8]">Pelotas</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {mockTestimonials.map((t) => (
            <div key={t.id} className="bg-white/4 backdrop-blur-sm border border-white/6 rounded-2xl p-6 hover:border-[#0369A1]/30 transition-all">
              <StarRating rating={t.rating} />
              <p className="text-white/70 text-sm leading-relaxed mb-5">&ldquo;{t.text}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#0369A1] to-[#0EA5E9] flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{t.name}</p>
                  <p className="text-white/40 text-xs">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}