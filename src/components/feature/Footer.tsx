import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-[#F0F7FF] border-t border-[#DBEAFE] pb-20 md:pb-0">
      <div className="max-w-screen-xl mx-auto px-4 md:px-8 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0369A1] to-[#0EA5E9] flex items-center justify-center shadow-md shadow-blue-200">
                <span className="text-white font-black text-sm">AH</span>
              </div>
              <div>
                <p className="text-gray-900 font-bold text-sm">Arthur Halal</p>
                <p className="text-[#0369A1] text-xs font-medium tracking-widest uppercase">Vereador · Pelotas</p>
              </div>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed mb-5">
              O vereador mais jovem de Pelotas — trazendo novas ideias e proximidade com a população.
            </p>
            <div className="flex items-center gap-3">
              {[
                { icon: "ri-instagram-line", href: "https://instagram.com", label: "Instagram" },
                { icon: "ri-facebook-circle-line", href: "https://facebook.com", label: "Facebook" },
                { icon: "ri-youtube-line", href: "https://youtube.com", label: "YouTube" },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  aria-label={s.label}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-[#DBEAFE] text-gray-500 hover:text-[#0369A1] hover:border-[#0369A1]/30 hover:bg-[#EFF6FF] transition-all"
                >
                  <i className={`${s.icon} text-base`}></i>
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-gray-900 font-bold text-sm mb-4">
              <a href="#navegacao" id="navegacao">Navegação</a>
            </h4>
            <ul className="space-y-2.5">
              {[
                { label: "Início", href: "/" },
                { label: "Sobre Arthur Halal", href: "/#sobre" },
                { label: "Notícias do Mandato", href: "/noticias" },

              ].map((l) => (
                <li key={l.href}>
                  <Link to={l.href} className="text-gray-500 text-sm hover:text-[#0369A1] transition-colors flex items-center gap-1.5">
                    <i className="ri-arrow-right-s-line text-xs text-gray-300"></i>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-gray-900 font-bold text-sm mb-4">
              <a href="#participacao" id="participacao">Participação</a>
            </h4>
            <ul className="space-y-2.5">
              {[
                { label: "Enviar Requerimento", href: "/requerimento" },
                { label: "Sugestão de Projeto", href: "/sugestao-projeto" },
                { label: "Fale Conosco", href: "/fale-conosco" },
                { label: "Área do Cidadão", href: "/cidadao" },
              ].map((l) => (
                <li key={l.href}>
                  <Link to={l.href} className="text-gray-500 text-sm hover:text-[#0369A1] transition-colors flex items-center gap-1.5">
                    <i className="ri-arrow-right-s-line text-xs text-gray-300"></i>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-gray-900 font-bold text-sm mb-4">
              <a href="#contato" id="contato">Contato</a>
            </h4>
            <ul className="space-y-3">
              {[
                { icon: "ri-map-pin-line", text: "Câmara Municipal de Pelotas — RS" },
                { icon: "ri-whatsapp-line", text: "(53) 9 0000-0000" },
                { icon: "ri-mail-line", text: "gabinete@arthurhalal.com.br" },
              ].map((c) => (
                <li key={c.text} className="flex items-start gap-2.5">
                  <span className="w-4 h-4 flex items-center justify-center shrink-0 mt-0.5">
                    <i className={`${c.icon} text-[#0369A1] text-sm`}></i>
                  </span>
                  <span className="text-gray-500 text-sm">{c.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-[#DBEAFE] bg-[#EFF6FF]">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-gray-500 text-xs text-center sm:text-left">
            © 2025 Arthur Halal — Vereador de Pelotas/RS. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-4">
            <Link to="/admin" className="text-gray-400 text-xs hover:text-[#0369A1] transition-colors">Admin</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}