import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/feature/Navbar";
import Footer from "@/components/feature/Footer";

export default function CurriculoDicasPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ background: "#F5F4F0" }}>
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 md:px-6">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(232,160,32,0.12)", border: "1px solid rgba(232,160,32,0.25)" }}>
              <i className="ri-file-list-3-line text-2xl" style={{ color: "#E8A020" }}></i>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">Como Fazer um Currículo Excelente</h1>
            <p className="text-gray-500 text-base max-w-xl mx-auto">Um guia completo com tudo que as empresas esperam ver no seu currículo. Siga estas dicas e aumente suas chances de ser contratado.</p>
          </div>

          {/* Conteúdo */}
          <div className="space-y-6">
            {/* 1. Estrutura */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black shrink-0" style={{ background: "#1B2A5E", color: "white" }}>1</span>
                <h2 className="text-xl font-extrabold text-gray-900">Estrutura do Currículo</h2>
              </div>
              <p className="text-gray-600 leading-relaxed mb-4">Um bom currículo segue uma estrutura clara e organizada. As empresas gastam em média <strong>6 segundos</strong> olhando um currículo — então a primeira impressão é tudo.</p>
              <div className="space-y-3">
                {[
                  { titulo: "Dados Pessoais", desc: "Nome completo, telefone com DDD, e-mail profissional e cidade/bairro. Não inclua RG, CPF ou estado civil — isso não é mais necessário." },
                  { titulo: "Objetivo Profissional", desc: "Uma frase curta e direta sobre a área que você quer atuar e o que busca. Ex: \"Atuar como Auxiliar Administrativo, contribuindo com organização e atendimento ao público.\"" },
                  { titulo: "Resumo / Sobre Mim", desc: "Um parágrafo de 3-5 linhas resumindo sua trajetória, principais habilidades e o que te diferencia. Seja específico e use números quando possível." },
                  { titulo: "Experiência Profissional", desc: "Liste as últimas 3 experiências, da mais recente para a mais antiga. Inclua: nome da empresa, cargo, período (mês/ano) e 2-3 frases sobre o que você fazia." },
                  { titulo: "Formação Acadêmica", desc: "Da mais recente para a mais antiga. Inclua: curso, instituição e ano de conclusão (ou previsão)." },
                  { titulo: "Habilidades", desc: "Liste habilidades relevantes para a vaga. Separe em técnicas (ex: Pacote Office, CNH B) e comportamentais (ex: comunicação, trabalho em equipe)." },
                  { titulo: "Cursos Complementares", desc: "Cursos rápidos, workshops, certificações. Inclua o nome do curso, instituição e ano." },
                ].map((item, i) => (
                  <div key={i} className="p-4 rounded-xl" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                    <p className="text-gray-900 font-bold text-sm mb-1">{item.titulo}</p>
                    <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. O que NÃO colocar */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black shrink-0" style={{ background: "#DC2626", color: "white" }}>2</span>
                <h2 className="text-xl font-extrabold text-gray-900">O que <span className="text-red-500">NÃO</span> colocar no currículo</h2>
              </div>
              <div className="space-y-2">
                {[
                  "Foto informal ou selfie — use foto profissional, com fundo neutro",
                  "RG, CPF, título de eleitor — dados sensíveis desnecessários",
                  "Pretensão salarial — deixe para negociar na entrevista",
                  "Referências pessoais — \"forneço sob consulta\" é suficiente",
                  "Mentiras ou exageros — são descobertos facilmente",
                  "Erros de português — revise antes de enviar",
                  "Currículo com mais de 2 páginas — seja conciso",
                  "Endereço completo — bairro e cidade bastam",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5 py-2">
                    <i className="ri-close-circle-fill text-red-400 shrink-0 mt-0.5"></i>
                    <p className="text-gray-600 text-sm">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Dicas de ouro */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black shrink-0" style={{ background: "#E8A020", color: "#0D1629" }}>3</span>
                <h2 className="text-xl font-extrabold text-gray-900">Dicas de Ouro</h2>
              </div>
              <div className="space-y-2">
                {[
                  "Adapte o currículo para cada vaga — destaque as habilidades que a empresa pede",
                  "Use verbos de ação: \"liderei\", \"implementei\", \"organizei\", \"aumentei\"",
                  "Quantifique resultados: \"aumentei as vendas em 20%\" é melhor que \"trabalhei com vendas\"",
                  "Mantenha formatação limpa — fontes como Arial ou Calibri, tamanho 11-12pt",
                  "Salve como PDF — garante que a formatação não quebre em nenhum dispositivo",
                  "Peça para alguém revisar — um segundo olhar sempre encontra melhorias",
                  "Mantenha seu LinkedIn atualizado — muitas empresas checam antes de chamar",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5 py-2">
                    <i className="ri-star-fill shrink-0 mt-0.5" style={{ color: "#E8A020" }}></i>
                    <p className="text-gray-600 text-sm">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="text-center pt-6">
              <p className="text-gray-500 text-sm mb-4">Agora que você já sabe como montar um currículo profissional, que tal criar o seu?</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => navigate("/cidadao/curriculo/criar")}
                  className="px-8 py-3.5 rounded-xl text-white font-bold text-sm cursor-pointer whitespace-nowrap"
                  style={{ background: "linear-gradient(135deg, #1B2A5E, #3BBFD4)" }}
                >
                  <i className="ri-edit-line mr-2"></i>Criar Meu Currículo Agora
                </button>
                <button
                  onClick={() => navigate("/cidadao")}
                  className="px-6 py-3.5 rounded-xl text-gray-600 font-semibold text-sm cursor-pointer whitespace-nowrap border border-gray-200 hover:bg-gray-50 transition-all"
                >
                  <i className="ri-arrow-left-line mr-2"></i>Voltar para Área do Cidadão
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}