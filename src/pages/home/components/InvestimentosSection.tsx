import { Link } from "react-router-dom";
import { useEffect, useState, useRef } from "react";

const investimentos = [
  { area: "Infraestrutura", valor: 2220000, icon: "ri-road-map-line", desc: "Desassorear RS + Colônia Z3 + Playgrounds" },
  { area: "Saúde", valor: 2892000, icon: "ri-heart-pulse-line", desc: "Heinze + UFPel + Pasin + Prótese Fase 2" },
  { area: "Ação Social", valor: 100000, icon: "ri-hand-heart-line", desc: "Entidades sociais" },
  { area: "Parlamentar", valor: 1120000, icon: "ri-government-line", desc: "Brasília + Emendas Westphalen" },
];

const totalInvestido = investimentos.reduce((s, i) => s + i.valor, 0);

function formatCurrency(val: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(val);
}

function AnimatedNumber({ target }: { target: number }) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const duration = 2000;
            const start = performance.now();
            const animate = (now: number) => {
              const progress = Math.min((now - start) / duration, 1);
              const ease = 1 - Math.pow(1 - progress, 3);
              setValue(Math.floor(ease * target));
              if (progress < 1) requestAnimationFrame(animate);
            };
            requestAnimationFrame(animate);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  return (
    <div ref={ref} className="font-black text-4xl md:text-6xl tracking-tight" style={{ color: "#E8A020" }}>
      {formatCurrency(value)}
    </div>
  );
}

// [NOVO] Calcula tempo de mandato em tempo real
function useMandatoTexto() {
  const [texto, setTexto] = useState("Em 1 ano de mandato");

  useEffect(() => {
    const calcular = () => {
      const inicio = new Date("2025-01-01T00:00:00-03:00"); // Posse em 1º de janeiro de 2025
      const agora = new Date();
      const diffMs = agora.getTime() - inicio.getTime();

      const totalMeses = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44));
      const anos = Math.floor(totalMeses / 12);
      const meses = totalMeses % 12;

      let partes: string[] = [];
      if (anos > 0) {
        partes.push(`${anos} ano${anos !== 1 ? "s" : ""}`);
      }
      if (meses > 0) {
        partes.push(`${meses} mes${meses !== 1 ? "es" : ""}`);
      }
      if (partes.length === 0) {
        setTexto("No início do mandato");
      } else {
        setTexto(`Em ${partes.join(" e ")} de mandato`);
      }
    };

    calcular();
    // Atualiza a cada hora (não precisa ser mais frequente — mês não muda a cada minuto)
    const interval = setInterval(calcular, 3600000);
    return () => clearInterval(interval);
  }, []);

  return texto;
}

export default function InvestimentosSection() {
  const mandatoTexto = useMandatoTexto(); // [NOVO]

  return (
    <section className="py-2 md:py-4 relative overflow-hidden" style={{ background: "#0D1629" }}>
      {/* Background grid */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(59,191,212,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(59,191,212,0.04) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
        }}
      ></div>
      {/* Glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full pointer-events-none"
        style={{ background: "rgba(232,160,32,0.06)", filter: "blur(100px)" }}
      ></div>

      <div className="relative max-w-screen-xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="text-center mb-3">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-2"
            style={{ border: "1px solid rgba(232,160,32,0.30)", background: "rgba(232,160,32,0.08)" }}
          >
            <span className="text-xs font-semibold tracking-wider uppercase leading-tight" style={{ color: "#E8A020" }}>
              Resultados do Mandato
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-2">
            Investimentos <span style={{ color: "#E8A020" }}>Conquistados</span>
          </h2>
          <p className="text-white/50 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            {mandatoTexto}, Arthur Halal já conseguiu aprovar e articular mais de <strong style={{ color: "#E8A020" }}>R$ 6,3 milhões</strong> em recursos para Pelotas.
          </p>
        </div>

        {/* Total Big Number */}
        <div className="text-center mb-4">
          <AnimatedNumber target={totalInvestido} />
          <p className="text-white/30 text-sm uppercase tracking-widest mt-1 font-medium">Total de Recursos Captados</p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
          {investimentos.map((item) => (
            <div
              key={item.area}
              className="rounded-2xl p-6 transition-all hover:scale-105"
              style={{ background: "rgba(27,42,94,0.35)", border: "1px solid rgba(59,191,212,0.15)" }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ background: "rgba(232,160,32,0.12)" }}
              >
                <span className="w-6 h-6 flex items-center justify-center">
                  <i className={`${item.icon} text-lg`} style={{ color: "#E8A020" }}></i>
                </span>
              </div>
              <p className="text-white/40 text-xs uppercase tracking-wider font-semibold mb-1">{item.area}</p>
              <p className="text-white font-extrabold text-xl mb-1">{formatCurrency(item.valor)}</p>
              <p className="text-white/30 text-xs leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            to="/noticias"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105 cursor-pointer whitespace-nowrap"
            style={{ background: "#E8A020", color: "#0D1629" }}
          >
            <span className="w-4 h-4 flex items-center justify-center">
              <i className="ri-newspaper-line text-sm"></i>
            </span>
            Acompanhar todas as conquistas
            <span className="w-4 h-4 flex items-center justify-center">
              <i className="ri-arrow-right-line text-sm"></i>
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}