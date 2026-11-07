import { Link } from "react-router-dom";

const FEATURES_CIDADAO = [
  { icon: "ri-newspaper-line", color: "#E8A020", text: "Feed de vagas em tempo real de todas as empresas" },
  { icon: "ri-cursor-line", color: "#3BBFD4", text: "Candidature-se com 1 clique e acompanhe status" },
  { icon: "ri-file-user-line", color: "#22C55E", text: "Monte seu perfil e currículo gratuitamente" },
];

const FEATURES_EMPRESA = [
  { icon: "ri-megaphone-line", color: "#3BBFD4", text: "Publique vagas e gerencie-as facilmente" },
  { icon: "ri-group-line", color: "#E8A020", text: "Acesse banco completo de currículos da região" },
  { icon: "ri-search-2-line", color: "#22C55E", text: "Filtre candidatos por competência e formação" },
];

export default function OpportunitiesTeaser() {
  return (
    <section className="py-24 relative overflow-hidden" style={{ background: "#0D1629" }}>
      {/* Decorative background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-8" style={{ background: "radial-gradient(circle, #3BBFD4 0%, transparent 70%)" }}></div>
        <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full opacity-8" style={{ background: "radial-gradient(circle, #E8A020 0%, transparent 70%)" }}></div>
        <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.9) 1px, transparent 0)", backgroundSize: "36px 36px" }}></div>
      </div>

      <div className="relative max-w-screen-xl mx-auto px-4 md:px-8">

        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-5" style={{ background: "rgba(232,160,32,0.15)", border: "1px solid rgba(232,160,32,0.30)" }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#E8A020" }}></span>
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#E8A020" }}>Geração de Renda · Pelotas</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
            Sistema de <span style={{ color: "#3BBFD4" }}>Oportunidades</span>
          </h2>
          <p className="text-white/50 text-lg max-w-xl mx-auto leading-relaxed">
            Uma plataforma pública e gratuita que conecta cidadãos pelotenses às melhores vagas de emprego da região.
          </p>
        </div>

        {/* Cards cidadão + empresa */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Cidadão */}
          <div className="rounded-3xl overflow-hidden flex flex-col" style={{ background: "rgba(232,160,32,0.06)", border: "1px solid rgba(232,160,32,0.22)" }}>
            <div className="p-6 border-b flex items-center gap-4" style={{ borderColor: "rgba(232,160,32,0.15)" }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "rgba(232,160,32,0.20)" }}>
                <i className="ri-user-heart-line text-2xl" style={{ color: "#E8A020" }}></i>
              </div>
              <div>
                <h3 className="text-white font-extrabold text-xl">Sou Cidadão</h3>
                <p className="text-white/40 text-sm">Quero encontrar emprego</p>
              </div>
            </div>
            <div className="p-6 flex-1 flex flex-col">
              <p className="text-white/55 text-sm leading-relaxed mb-5">
                Crie sua conta gratuitamente, monte seu perfil profissional e acesse o <strong className="text-white/75">Feed de Vagas</strong> — um mural
                coletivo e atualizado em tempo real com todas as oportunidades das empresas cadastradas na plataforma.
              </p>
              <div className="space-y-3 mb-6 flex-1">
                {FEATURES_CIDADAO.map((f) => (
                  <div key={f.text} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${f.color}18` }}>
                      <i className={`${f.icon} text-sm`} style={{ color: f.color }}></i>
                    </div>
                    <p className="text-white/60 text-sm">{f.text}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  to="/auth?from=/sistema/painel/cidadao"
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm cursor-pointer whitespace-nowrap"
                  style={{ background: "linear-gradient(135deg, #E8A020, #f5b94a)", color: "#0D1629" }}
                >
                  <i className="ri-user-add-line"></i> Criar conta
                </Link>
                <Link
                  to="/auth?from=/sistema/painel/cidadao"
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm cursor-pointer whitespace-nowrap"
                  style={{ background: "rgba(232,160,32,0.12)", border: "1px solid rgba(232,160,32,0.25)", color: "#E8A020" }}
                >
                  <i className="ri-login-box-line"></i> Fazer login
                </Link>
              </div>
            </div>
          </div>

          {/* Empresa */}
          <div className="rounded-3xl overflow-hidden flex flex-col" style={{ background: "rgba(59,191,212,0.06)", border: "1px solid rgba(59,191,212,0.22)" }}>
            <div className="p-6 border-b flex items-center gap-4" style={{ borderColor: "rgba(59,191,212,0.15)" }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "rgba(59,191,212,0.20)" }}>
                <i className="ri-building-4-line text-2xl" style={{ color: "#3BBFD4" }}></i>
              </div>
              <div>
                <h3 className="text-white font-extrabold text-xl">Sou Empresa</h3>
                <p className="text-white/40 text-sm">Quero contratar talentos</p>
              </div>
            </div>
            <div className="p-6 flex-1 flex flex-col">
              <p className="text-white/55 text-sm leading-relaxed mb-5">
                Cadastre sua empresa, publique anúncios de vagas que aparecem imediatamente para todos os cidadãos, e acesse o
                <strong className="text-white/75"> banco completo de currículos</strong> para encontrar o candidato ideal.
              </p>
              <div className="space-y-3 mb-6 flex-1">
                {FEATURES_EMPRESA.map((f) => (
                  <div key={f.text} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${f.color}18` }}>
                      <i className={`${f.icon} text-sm`} style={{ color: f.color }}></i>
                    </div>
                    <p className="text-white/60 text-sm">{f.text}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  to="/auth?from=/sistema/painel/empresa"
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm cursor-pointer whitespace-nowrap"
                  style={{ background: "rgba(59,191,212,0.20)", border: "1px solid rgba(59,191,212,0.40)", color: "#3BBFD4" }}
                >
                  <i className="ri-building-line"></i> Cadastrar empresa
                </Link>
                <Link
                  to="/auth?from=/sistema/painel/empresa"
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm cursor-pointer whitespace-nowrap"
                  style={{ background: "rgba(59,191,212,0.10)", border: "1px solid rgba(59,191,212,0.20)", color: "#3BBFD4" }}
                >
                  <i className="ri-login-box-line"></i> Fazer login
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* CTA bottom */}
        <div className="text-center">
          <Link
            to="/sistema"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-sm font-bold cursor-pointer whitespace-nowrap transition-all"
            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.12)" }}
          >
            <i className="ri-information-line"></i>
            Saiba mais sobre o Sistema de Oportunidades
            <i className="ri-arrow-right-line"></i>
          </Link>
        </div>
      </div>
    </section>
  );
}