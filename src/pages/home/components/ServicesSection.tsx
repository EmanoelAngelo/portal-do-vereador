import { Link } from "react-router-dom";
import { mockServices } from "@/mocks/services";

export default function ServicesSection() {
  return (
    <section className="py-20 md:py-28 bg-white relative z-10">
      <div className="max-w-screen-xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-14">
          <div>
            <p className="text-[#0369A1] text-sm font-semibold uppercase tracking-widest mb-2">Serviços do Gabinete</p>
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight">
              Como posso<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0369A1] to-[#0EA5E9]">ajudar você?</span>
            </h2>
          </div>
          <p className="text-gray-500 text-base leading-relaxed max-w-md">
            Acesso direto aos serviços do mandato. Arthur Halal trabalha por transparência, inovação e participação de todos os pelotenses.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {mockServices.map((service) => (
            <Link
              key={service.id}
              to={service.link}
              className="group relative bg-gray-50/80 hover:bg-white rounded-2xl p-6 border border-gray-100 hover:border-[#0369A1]/20 transition-all duration-300 hover:shadow-lg hover:shadow-blue-100 cursor-pointer overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-gradient-to-br from-[#0369A1]/5 to-[#0EA5E9]/5 -translate-y-8 translate-x-8 group-hover:scale-150 transition-transform duration-500"></div>

              <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-[#0369A1] to-[#0EA5E9] flex items-center justify-center mb-5 shadow-md shadow-blue-200">
                <span className="w-5 h-5 flex items-center justify-center">
                  <i className={`${service.icon} text-white text-lg`}></i>
                </span>
              </div>

              <h3 className="text-gray-900 font-bold text-base mb-2 group-hover:text-[#0369A1] transition-colors">
                {service.title}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed">{service.description}</p>

              <div className="mt-5 flex items-center gap-2 text-[#0369A1] text-sm font-semibold">
                <span>Acessar</span>
                <span className="w-4 h-4 flex items-center justify-center group-hover:translate-x-1.5 transition-transform">
                  <i className="ri-arrow-right-line text-sm"></i>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}