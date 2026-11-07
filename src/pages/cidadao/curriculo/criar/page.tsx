import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { jsPDF } from "jspdf";
import { supabase, supabaseUrl, supabaseAnonKey } from "@/lib/supabase";
import { getStoredUser } from "@/hooks/useAuth";
import Navbar from "@/components/feature/Navbar";
import Footer from "@/components/feature/Footer";

/** Temas disponíveis */
const TEMAS = [
  { id: "classic", nome: "Clássico", corPrimaria: "#1B2A5E", corSecundaria: "#3BBFD4", bg: "#FFFFFF", textoCor: "#1F2937", bordaCor: "#E5E7EB" },
  { id: "modern", nome: "Moderno", corPrimaria: "#0D1629", corSecundaria: "#E8A020", bg: "#FFFFFF", textoCor: "#1F2937", bordaCor: "#D1D5DB" },
  { id: "elegant", nome: "Elegante", corPrimaria: "#2D1B4E", corSecundaria: "#7C3AED", bg: "#FFFFFF", textoCor: "#1F2937", bordaCor: "#E5E7EB" },
  { id: "minimal", nome: "Minimalista", corPrimaria: "#374151", corSecundaria: "#6B7280", bg: "#F9FAFB", textoCor: "#111827", bordaCor: "#E5E7EB" },
  { id: "warm", nome: "Aconchegante", corPrimaria: "#78350F", corSecundaria: "#D97706", bg: "#FFFBEB", textoCor: "#1F2937", bordaCor: "#FDE68A" },
  { id: "green", nome: "Natureza", corPrimaria: "#064E3B", corSecundaria: "#059669", bg: "#ECFDF5", textoCor: "#1F2937", bordaCor: "#A7F3D0" },
];

/** Passos do formulário */
const STEPS = [
  { key: "dados", label: "Dados Pessoais", icon: "ri-user-line" },
  { key: "resumo", label: "Resumo", icon: "ri-file-text-line" },
  { key: "experiencia", label: "Experiência", icon: "ri-briefcase-line" },
  { key: "formacao", label: "Formação", icon: "ri-graduation-cap-line" },
  { key: "servicos", label: "Serviços", icon: "ri-tools-line" },
  { key: "tema", label: "Tema", icon: "ri-palette-line" },
];

interface ExperienciaItem {
  cargo: string;
  empresa: string;
  periodo: string;
  descricao: string;
}

interface FormacaoItem {
  curso: string;
  instituicao: string;
  ano: string;
}

export default function CurriculoCriarPage() {
  const navigate = useNavigate();
  const photoRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    cidade: "",
    objetivo: "",
    resumo: "",
    habilidades: "",
    idiomas: "",
  });
  const [experiencias, setExperiencias] = useState<ExperienciaItem[]>([]);
  const [formacoes, setFormacoes] = useState<FormacaoItem[]>([]);
  const [temaId, setTemaId] = useState("classic");
  const [mostrarPreview, setMostrarPreview] = useState(false);
  // Prestador de serviços
  const [isPrestador, setIsPrestador] = useState(false);
  const [categoriasServico, setCategoriasServico] = useState<string[]>([]);
  const [descricaoServico, setDescricaoServico] = useState("");
  // C1: PDF generation states
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState("");
  // Auth state
  const [authUserId, setAuthUserId] = useState("");

  const tema = TEMAS.find((t) => t.id === temaId) ?? TEMAS[0];

  // AUTH CHECK: verifica sessão ao montar e pré-preenche dados conhecidos
  useEffect(() => {
    const stored = getStoredUser();
    if (!stored?.id) {
      // Sem sessão ativa — redireciona para auth com return URL
      navigate("/auth?from=/cidadao/curriculo/criar");
      return;
    }
    setAuthUserId(stored.id);
    // Pré-preenche email e nome se o usuário já tem esses dados
    setForm((prev) => ({
      ...prev,
      nome: prev.nome || stored.full_name || stored.display_name || "",
      email: prev.email || stored.email || "",
    }));
  }, [navigate]);

  // Restaura dados do sessionStorage quando volta da preview
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("curriculo_preview_form");
      if (stored) {
        const data = JSON.parse(stored);
        setForm({
          nome: data.nome || "",
          email: data.email || "",
          telefone: data.telefone || "",
          cidade: data.cidade || "",
          objetivo: data.objetivo || "",
          resumo: data.resumo || "",
          habilidades: data.habilidades || "",
          idiomas: data.idiomas || "",
        });
        if (data.experiencias) setExperiencias(data.experiencias);
        if (data.formacoes) setFormacoes(data.formacoes);
        if (data.temaId) setTemaId(data.temaId);
        if (data.isPrestador) setIsPrestador(data.isPrestador);
        if (data.categoriasServico) setCategoriasServico(data.categoriasServico);
        if (data.descricaoServico) setDescricaoServico(data.descricaoServico);
        // Limpa do sessionStorage após restaurar
        sessionStorage.removeItem("curriculo_preview_form");
      }
    } catch {
      // Ignora erro de parse
    }
  }, []);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const addExperiencia = () => {
    setExperiencias([...experiencias, { cargo: "", empresa: "", periodo: "", descricao: "" }]);
  };

  const removeExperiencia = (i: number) => {
    setExperiencias(experiencias.filter((_, idx) => idx !== i));
  };

  const updateExperiencia = (i: number, field: keyof ExperienciaItem, value: string) => {
    const nova = [...experiencias];
    nova[i] = { ...nova[i], [field]: value };
    setExperiencias(nova);
  };

  const addFormacao = () => {
    setFormacoes([...formacoes, { curso: "", instituicao: "", ano: "" }]);
  };

  const removeFormacao = (i: number) => {
    setFormacoes(formacoes.filter((_, idx) => idx !== i));
  };

  const updateFormacao = (i: number, field: keyof FormacaoItem, value: string) => {
    const nova = [...formacoes];
    nova[i] = { ...nova[i], [field]: value };
    setFormacoes(nova);
  };

  const toggleCategoria = (cat: string) => {
    if (!cat || typeof cat !== "string") return;
    try {
      setCategoriasServico((prev) => {
        if (!Array.isArray(prev)) return [cat];
        return prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat];
      });
    } catch (err) {
      console.error("[Curriculo] toggleCategoria error:", err);
    }
  };

  const canNext = () => {
    if (step === 0) return form.nome.trim() && form.email.trim() && form.telefone.trim();
    if (step === 1) return form.objetivo.trim() || form.resumo.trim();
    return true;
  };

  const nextStep = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 0) setStep(step - 1);
  };

  function hexToRgb(hex: string): [number, number, number] {
    const c = hex.replace("#", "");
    return [
      parseInt(c.substring(0, 2), 16),
      parseInt(c.substring(2, 4), 16),
      parseInt(c.substring(4, 6), 16),
    ];
  }

  const helpTexts: Record<string, string> = {
    objetivo: "Seja direto: \"Profissional de [área] buscando oportunidade como [cargo desejado], contribuindo com [habilidade principal].\" Evite frases genéricas como \"crescer profissionalmente\".",
    resumo: "Escreva 3-5 linhas resumindo sua trajetória. Inclua: anos de experiência, principais conquistas, habilidades-chave e o que te diferencia. Use números sempre que possível. Ex: \"Profissional com 5 anos de experiência em vendas, tendo liderado equipe de 8 pessoas e aumentado o faturamento em 35%.\"",
    habilidades: "Liste habilidades relevantes separadas por vírgula. Inclua habilidades técnicas (Pacote Office, CNH B, AutoCAD) e comportamentais (liderança, comunicação, trabalho em equipe). Priorize as que aparecem na descrição da vaga.",
    idiomas: "Liste os idiomas que você domina e o nível: Básico, Intermediário, Avançado ou Fluente. Ex: \"Inglês - Intermediário, Espanhol - Básico\".",
  };

  // C1: Gera PDF do currículo e faz upload para Supabase Storage
  const handleFinalizar = async () => {
    setIsFinalizing(true);
    setFinalizeError("");

    try {
      // Verifica autenticação antes de qualquer operação pesada
      const userId = authUserId;
      if (!userId) {
        setFinalizeError("Sessão expirada. Por favor, faça login novamente.");
        setIsFinalizing(false);
        setTimeout(() => navigate("/auth?from=/cidadao/curriculo/criar"), 2000);
        return;
      }

      // 1. Gerar PDF com jsPDF
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageW = 210;
      const margin = 15;
      let y = margin;

      // Cores do tema
      const primaryHex = tema.corPrimaria;
      const secondaryHex = tema.corSecundaria;

      // Cabeçalho
      doc.setFillColor(primaryHex);
      doc.rect(0, 0, pageW, 35, "F");

      if (photoPreview) {
        try {
          doc.addImage(photoPreview, "JPEG", margin, 7, 22, 22);
        } catch {
          // Ignora erro de imagem
        }
      }

      const nameX = photoPreview ? margin + 26 : margin;
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(form.nome || "Currículo", nameX, 18);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const contactParts: string[] = [];
      if (form.email) contactParts.push(form.email);
      if (form.telefone) contactParts.push(form.telefone);
      if (form.cidade) contactParts.push(form.cidade);
      doc.text(contactParts.join("  ·  "), nameX, 26);

      y = 42;

      // Objetivo
      if (form.objetivo) {
        doc.setTextColor(...hexToRgb(primaryHex));
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("OBJETIVO", margin, y);
        y += 6;

        doc.setTextColor(60, 60, 60);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const objLines = doc.splitTextToSize(form.objetivo, pageW - margin * 2);
        doc.text(objLines, margin, y);
        y += objLines.length * 5 + 5;
      }

      // Resumo
      if (form.resumo) {
        doc.setTextColor(...hexToRgb(primaryHex));
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("RESUMO PROFISSIONAL", margin, y);
        y += 6;

        doc.setTextColor(60, 60, 60);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const resLines = doc.splitTextToSize(form.resumo, pageW - margin * 2);
        doc.text(resLines, margin, y);
        y += resLines.length * 5 + 5;
      }

      // Experiências
      if (experiencias.length > 0) {
        doc.setTextColor(...hexToRgb(primaryHex));
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("EXPERIÊNCIA PROFISSIONAL", margin, y);
        y += 7;

        for (const exp of experiencias) {
          if (y > 260) { doc.addPage(); y = margin; }

          doc.setTextColor(...hexToRgb(secondaryHex));
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.text(exp.cargo || "Cargo", margin, y);
          y += 5;

          const sub: string[] = [];
          if (exp.empresa) sub.push(exp.empresa);
          if (exp.periodo) sub.push(exp.periodo);
          if (sub.length > 0) {
            doc.setTextColor(100, 100, 100);
            doc.setFontSize(9);
            doc.setFont("helvetica", "italic");
            doc.text(sub.join(" · "), margin, y);
            y += 5;
          }

          if (exp.descricao) {
            doc.setTextColor(60, 60, 60);
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            const descLines = doc.splitTextToSize(exp.descricao, pageW - margin * 2);
            doc.text(descLines, margin, y);
            y += descLines.length * 5 + 3;
          }
          y += 3;
        }
      }

      // Formação
      if (formacoes.length > 0) {
        if (y > 240) { doc.addPage(); y = margin; }

        doc.setTextColor(...hexToRgb(primaryHex));
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("FORMAÇÃO", margin, y);
        y += 7;

        for (const f of formacoes) {
          doc.setTextColor(...hexToRgb(secondaryHex));
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.text(f.curso || "Curso", margin, y);
          y += 5;

          const sub: string[] = [];
          if (f.instituicao) sub.push(f.instituicao);
          if (f.ano) sub.push(f.ano);
          if (sub.length > 0) {
            doc.setTextColor(100, 100, 100);
            doc.setFontSize(9);
            doc.text(sub.join(" · "), margin, y);
            y += 8;
          }
        }
      }

      // Habilidades
      if (form.habilidades) {
        if (y > 255) { doc.addPage(); y = margin; }

        doc.setTextColor(...hexToRgb(primaryHex));
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("HABILIDADES", margin, y);
        y += 6;

        doc.setTextColor(60, 60, 60);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const habLines = doc.splitTextToSize(form.habilidades, pageW - margin * 2);
        doc.text(habLines, margin, y);
        y += habLines.length * 5 + 3;
      }

      // Idiomas
      if (form.idiomas) {
        if (y > 260) { doc.addPage(); y = margin; }

        doc.setTextColor(...hexToRgb(primaryHex));
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("IDIOMAS", margin, y);
        y += 6;

        doc.setTextColor(60, 60, 60);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(form.idiomas, margin, y);
        y += 5;
      }

      // Serviços (se prestador)
      if (isPrestador && categoriasServico.length > 0) {
        if (y > 250) { doc.addPage(); y = margin; }

        doc.setTextColor(...hexToRgb(primaryHex));
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("SERVIÇOS PRESTADOS", margin, y);
        y += 7;

        doc.setTextColor(...hexToRgb(secondaryHex));
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Categorias: " + categoriasServico.join(", "), margin, y);
        y += 6;

        if (descricaoServico) {
          doc.setTextColor(60, 60, 60);
          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          const svcLines = doc.splitTextToSize(descricaoServico, pageW - margin * 2);
          doc.text(svcLines, margin, y);
        }
      }

      // 2. Converter para blob
      const pdfBlob = doc.output("blob");

      // 3. Upload via Edge Function usando fetch com multipart/form-data
      // NOTA: supabase.functions.invoke serializa como JSON, FormData precisa de fetch direto
      const edgeFnUrl = `${supabaseUrl}/functions/v1/upload-curriculo`;
      
      const uploadFormData = new FormData();
      uploadFormData.append("file", pdfBlob, "curriculo.pdf");
      uploadFormData.append("userId", userId);

      const uploadRes = await fetch(edgeFnUrl, {
        method: "POST",
        headers: { apikey: supabaseAnonKey },
        body: uploadFormData,
      });

      if (!uploadRes.ok) {
        const errBody = await uploadRes.text();
        throw new Error(errBody || `Erro HTTP ${uploadRes.status}`);
      }

      const uploadData = await uploadRes.json();

      if (!uploadData?.success) {
        throw new Error(uploadData?.error || "Erro ao enviar currículo.");
      }

      // 4. Salvar dados no sessionStorage para a página de preview
      // ATENÇÃO: NÃO atualiza curriculo_pdf automaticamente no perfil.
      // O usuário decide na página de preview se quer salvar ou não.
      const formPayload = {
        nome: form.nome,
        email: form.email,
        telefone: form.telefone,
        cidade: form.cidade,
        objetivo: form.objetivo,
        resumo: form.resumo,
        habilidades: form.habilidades,
        idiomas: form.idiomas,
        experiencias,
        formacoes,
        isPrestador,
        categoriasServico,
        descricaoServico,
        temaId,
      };

      sessionStorage.setItem("curriculo_preview_url", uploadData.url);
      sessionStorage.setItem("curriculo_preview_data", JSON.stringify(formPayload));
      sessionStorage.setItem("curriculo_preview_form", JSON.stringify(formPayload));

      // 5. Redirecionar para página de preview do PDF
      navigate("/cidadao/curriculo/preview");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setFinalizeError(msg);
      setIsFinalizing(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "#F5F4F0" }}>
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 md:px-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <Link to="/cidadao/curriculo/dicas" className="w-10 h-10 rounded-xl flex items-center justify-center bg-white border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer shrink-0">
              <i className="ri-arrow-left-line text-gray-500"></i>
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">Criar Currículo</h1>
              <p className="text-gray-500 text-sm mt-0.5">Preencha as informações para montar um currículo profissional</p>
            </div>
            <Link to="/cidadao/curriculo/dicas" className="ml-auto text-sm font-semibold cursor-pointer flex items-center gap-1" style={{ color: "#3BBFD4" }}>
              <i className="ri-lightbulb-line"></i> Dicas
            </Link>
          </div>

          {/* Steps indicator */}
          {/* Desktop: tabs scrolláveis */}
          <div className="hidden sm:flex items-center gap-1 mb-8 overflow-x-auto pb-2">
            {STEPS.map((s, i) => {
              const isActive = i === step;
              const isPast = i < step;
              return (
                <div key={s.key} className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => i <= step && setStep(i)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      isActive ? "text-white" : isPast ? "text-gray-600 bg-gray-100" : "text-gray-400"
                    }`}
                    style={isActive ? { background: "linear-gradient(135deg, #1B2A5E, #3BBFD4)" } : {}}
                  >
                    <i className={`${s.icon} text-base`}></i>
                    {s.label}
                  </button>
                  {i < STEPS.length - 1 && (
                    <i className="ri-arrow-right-s-line text-gray-300"></i>
                  )}
                </div>
              );
            })}
          </div>

          {/* Mobile: progress bar + nome do passo atual */}
          <div className="sm:hidden mb-6">
            {/* Barra de progresso */}
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              <span className="font-semibold" style={{ color: "#1B2A5E" }}>
                <i className={`${STEPS[step].icon} mr-1`}></i>
                {STEPS[step].label}
              </span>
              <span className="font-medium">Etapa {step + 1} de {STEPS.length}</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${((step + 1) / STEPS.length) * 100}%`,
                  background: "linear-gradient(to right, #1B2A5E, #3BBFD4)",
                }}
              />
            </div>
            {/* Bolinhas dos steps */}
            <div className="flex items-center justify-between mt-2 px-1">
              {STEPS.map((s, i) => (
                <button
                  key={s.key}
                  onClick={() => i <= step && setStep(i)}
                  className="flex flex-col items-center gap-1 cursor-pointer disabled:cursor-default"
                  disabled={i > step}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center transition-all"
                    style={{
                      background: i < step ? "#22C55E" : i === step ? "#1B2A5E" : "#E5E7EB",
                    }}
                  >
                    {i < step ? (
                      <i className="ri-check-line text-white text-xs"></i>
                    ) : (
                      <span className="text-xs font-bold" style={{ color: i === step ? "white" : "#9CA3AF" }}>{i + 1}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* STEP 0: Dados Pessoais */}
          {step === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8">
              <h2 className="text-lg font-extrabold text-gray-900 mb-1">Dados Pessoais</h2>
              <p className="text-gray-500 text-sm mb-6">Comece com as informações básicas e sua foto de perfil</p>

              {/* Foto */}
              <div className="flex items-center gap-4 mb-6">
                <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoChange} />
                <button
                  onClick={() => photoRef.current?.click()}
                  className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center cursor-pointer border-2 border-dashed hover:border-solid transition-all"
                  style={{ borderColor: photoPreview ? "#3BBFD4" : "#D1D5DB", background: photoPreview ? "transparent" : "#F9FAFB" }}
                >
                  {photoPreview ? (
                    <img src={photoPreview} alt="Foto" className="w-full h-full object-cover object-top" />
                  ) : (
                    <div className="text-center">
                      <i className="ri-camera-line text-gray-300 text-2xl"></i>
                    </div>
                  )}
                </button>
                <div>
                  <p className="text-gray-900 font-semibold text-sm">Foto de Perfil</p>
                  <p className="text-gray-400 text-xs">Clique para adicionar. Use foto profissional com fundo neutro. JPG, PNG ou WEBP, até 5MB.</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Nome Completo *</label>
                  <input type="text" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    placeholder="Seu nome completo"
                    className="w-full rounded-xl px-4 py-3 border border-gray-200 text-gray-800 text-sm focus:outline-none focus:border-[#1B2A5E] transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">E-mail *</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="seu@email.com"
                    className="w-full rounded-xl px-4 py-3 border border-gray-200 text-gray-800 text-sm focus:outline-none focus:border-[#1B2A5E] transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Telefone *</label>
                  <input type="tel" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                    placeholder="(53) 99999-9999"
                    className="w-full rounded-xl px-4 py-3 border border-gray-200 text-gray-800 text-sm focus:outline-none focus:border-[#1B2A5E] transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Cidade / Bairro</label>
                  <input type="text" value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                    placeholder="Pelotas - Centro"
                    className="w-full rounded-xl px-4 py-3 border border-gray-200 text-gray-800 text-sm focus:outline-none focus:border-[#1B2A5E] transition-all" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 1: Resumo Profissional */}
          {step === 1 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8">
              <h2 className="text-lg font-extrabold text-gray-900 mb-1">Resumo Profissional</h2>
              <p className="text-gray-500 text-sm mb-6">Defina seu objetivo e faça um resumo da sua trajetória</p>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Objetivo Profissional</label>
                  <input type="text" value={form.objetivo} onChange={(e) => setForm({ ...form, objetivo: e.target.value })}
                    placeholder="Ex: Atuar como Auxiliar Administrativo, contribuindo com organização e atendimento ao público"
                    className="w-full rounded-xl px-4 py-3 border border-gray-200 text-gray-800 text-sm focus:outline-none focus:border-[#1B2A5E] transition-all" />
                  <div className="mt-2 p-3 rounded-xl flex items-start gap-2" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
                    <i className="ri-lightbulb-line shrink-0 mt-0.5" style={{ color: "#0369A1" }}></i>
                    <p className="text-xs" style={{ color: "#0369A1" }}>{helpTexts.objetivo}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Resumo / Sobre Mim</label>
                  <textarea
                    value={form.resumo}
                    onChange={(e) => setForm({ ...form, resumo: e.target.value })}
                    rows={5}
                    maxLength={800}
                    placeholder="Conte um pouco sobre sua trajetória profissional, principais conquistas e habilidades..."
                    className="w-full rounded-xl px-4 py-3 border border-gray-200 text-gray-800 text-sm focus:outline-none focus:border-[#1B2A5E] transition-all resize-none"
                  />
                  <div className="flex justify-between mt-1.5">
                    <span className="text-gray-400 text-xs">{form.resumo.length}/800</span>
                  </div>
                  <div className="mt-2 p-3 rounded-xl flex items-start gap-2" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
                    <i className="ri-lightbulb-line shrink-0 mt-0.5" style={{ color: "#0369A1" }}></i>
                    <p className="text-xs" style={{ color: "#0369A1" }}>{helpTexts.resumo}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Habilidades</label>
                  <input type="text" value={form.habilidades} onChange={(e) => setForm({ ...form, habilidades: e.target.value })}
                    placeholder="Ex: Pacote Office, Atendimento ao Cliente, CNH B, Liderança de Equipe"
                    className="w-full rounded-xl px-4 py-3 border border-gray-200 text-gray-800 text-sm focus:outline-none focus:border-[#1B2A5E] transition-all" />
                  <div className="mt-2 p-3 rounded-xl flex items-start gap-2" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
                    <i className="ri-lightbulb-line shrink-0 mt-0.5" style={{ color: "#0369A1" }}></i>
                    <p className="text-xs" style={{ color: "#0369A1" }}>{helpTexts.habilidades}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Idiomas</label>
                  <input type="text" value={form.idiomas} onChange={(e) => setForm({ ...form, idiomas: e.target.value })}
                    placeholder="Ex: Inglês - Intermediário, Espanhol - Básico"
                    className="w-full rounded-xl px-4 py-3 border border-gray-200 text-gray-800 text-sm focus:outline-none focus:border-[#1B2A5E] transition-all" />
                  <div className="mt-2 p-3 rounded-xl flex items-start gap-2" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
                    <i className="ri-lightbulb-line shrink-0 mt-0.5" style={{ color: "#0369A1" }}></i>
                    <p className="text-xs" style={{ color: "#0369A1" }}>{helpTexts.idiomas}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Experiência Profissional */}
          {step === 2 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-extrabold text-gray-900 mb-1">Experiência Profissional</h2>
                  <p className="text-gray-500 text-sm">Adicione suas experiências mais recentes</p>
                </div>
                <button onClick={addExperiencia} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-sm font-semibold cursor-pointer whitespace-nowrap" style={{ background: "linear-gradient(135deg, #1B2A5E, #3BBFD4)" }}>
                  <i className="ri-add-line"></i> Adicionar
                </button>
              </div>

              <div className="p-3 rounded-xl flex items-start gap-2 mb-5" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
                <i className="ri-lightbulb-line shrink-0 mt-0.5" style={{ color: "#0369A1" }}></i>
                <p className="text-xs" style={{ color: "#0369A1" }}>
                  Use verbos de ação para descrever suas atividades: "liderei", "implementei", "organizei", "aumentei". Se possível, inclua números e resultados concretos.
                </p>
              </div>

              {experiencias.length === 0 ? (
                <div className="text-center py-10 rounded-xl border border-dashed border-gray-200">
                  <i className="ri-briefcase-line text-gray-200 text-4xl mb-3 block"></i>
                  <p className="text-gray-400 text-sm">Nenhuma experiência adicionada</p>
                  <p className="text-gray-300 text-xs mt-1">Clique em "Adicionar" para incluir sua primeira experiência</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {experiencias.map((exp, i) => (
                    <div key={i} className="p-5 rounded-xl border border-gray-100 relative">
                      <button
                        onClick={() => removeExperiencia(i)}
                        className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 cursor-pointer transition-all"
                      >
                        <i className="ri-close-line"></i>
                      </button>
                      <div className="grid sm:grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Cargo</label>
                          <input type="text" value={exp.cargo} onChange={(e) => updateExperiencia(i, "cargo", e.target.value)}
                            placeholder="Ex: Auxiliar Administrativo"
                            className="w-full rounded-lg px-3 py-2 border border-gray-200 text-gray-800 text-sm focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Empresa</label>
                          <input type="text" value={exp.empresa} onChange={(e) => updateExperiencia(i, "empresa", e.target.value)}
                            placeholder="Nome da empresa"
                            className="w-full rounded-lg px-3 py-2 border border-gray-200 text-gray-800 text-sm focus:outline-none" />
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Período</label>
                        <input type="text" value={exp.periodo} onChange={(e) => updateExperiencia(i, "periodo", e.target.value)}
                          placeholder="Ex: Jan/2020 - Dez/2023"
                          className="w-full rounded-lg px-3 py-2 border border-gray-200 text-gray-800 text-sm focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Descrição das Atividades</label>
                        <textarea
                          value={exp.descricao}
                          onChange={(e) => updateExperiencia(i, "descricao", e.target.value)}
                          rows={2}
                          maxLength={300}
                          placeholder="Descreva suas principais responsabilidades e conquistas..."
                          className="w-full rounded-lg px-3 py-2 border border-gray-200 text-gray-800 text-sm focus:outline-none resize-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Formação */}
          {step === 3 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-extrabold text-gray-900 mb-1">Formação Acadêmica</h2>
                  <p className="text-gray-500 text-sm">Adicione sua formação e cursos complementares</p>
                </div>
                <button onClick={addFormacao} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-sm font-semibold cursor-pointer whitespace-nowrap" style={{ background: "linear-gradient(135deg, #1B2A5E, #3BBFD4)" }}>
                  <i className="ri-add-line"></i> Adicionar
                </button>
              </div>

              <div className="p-3 rounded-xl flex items-start gap-2 mb-5" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
                <i className="ri-lightbulb-line shrink-0 mt-0.5" style={{ color: "#0369A1" }}></i>
                <p className="text-xs" style={{ color: "#0369A1" }}>
                  Liste da formação mais recente para a mais antiga. Inclua cursos técnicos, graduação, pós-graduação e cursos complementares relevantes.
                </p>
              </div>

              {formacoes.length === 0 ? (
                <div className="text-center py-10 rounded-xl border border-dashed border-gray-200">
                  <i className="ri-graduation-cap-line text-gray-200 text-4xl mb-3 block"></i>
                  <p className="text-gray-400 text-sm">Nenhuma formação adicionada</p>
                  <p className="text-gray-300 text-xs mt-1">Clique em "Adicionar" para incluir seus cursos e formações</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {formacoes.map((formacao, i) => (
                    <div key={i} className="p-5 rounded-xl border border-gray-100 relative">
                      <button
                        onClick={() => removeFormacao(i)}
                        className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 cursor-pointer transition-all"
                      >
                        <i className="ri-close-line"></i>
                      </button>
                      <div className="grid sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-1">
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Curso</label>
                          <input type="text" value={formacao.curso} onChange={(e) => updateFormacao(i, "curso", e.target.value)}
                            placeholder="Ex: Bacharel em Administração"
                            className="w-full rounded-lg px-3 py-2 border border-gray-200 text-gray-800 text-sm focus:outline-none" />
                        </div>
                        <div className="sm:col-span-1">
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Instituição</label>
                          <input type="text" value={formacao.instituicao} onChange={(e) => updateFormacao(i, "instituicao", e.target.value)}
                            placeholder="Ex: UFPel"
                            className="w-full rounded-lg px-3 py-2 border border-gray-200 text-gray-800 text-sm focus:outline-none" />
                        </div>
                        <div className="sm:col-span-1">
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Ano</label>
                          <input type="text" value={formacao.ano} onChange={(e) => updateFormacao(i, "ano", e.target.value)}
                            placeholder="Ex: 2023"
                            className="w-full rounded-lg px-3 py-2 border border-gray-200 text-gray-800 text-sm focus:outline-none" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Serviços Prestados */}
          {step === 4 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8">
              <h2 className="text-lg font-extrabold text-gray-900 mb-1">Serviços Prestados</h2>
              <p className="text-gray-500 text-sm mb-6">Se você oferece serviços como autônomo, configure seu perfil de prestador</p>

              {/* Toggle prestador — onClick no próprio div, sem absolute overlay */}
              <button
                type="button"
                onClick={() => setIsPrestador(!isPrestador)}
                className="mb-6 w-full p-5 rounded-2xl border-2 transition-all text-left cursor-pointer"
                style={{ borderColor: isPrestador ? "#E8A020" : "#E5E7EB", background: isPrestador ? "#FFFBF0" : "#F9FAFB" }}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-7 rounded-full transition-all relative shrink-0 ${isPrestador ? "bg-[#E8A020]" : "bg-gray-300"}`}>
                    <div className={`w-5 h-5 rounded-full bg-white absolute top-1 transition-all shadow-sm ${isPrestador ? "left-6" : "left-1"}`}></div>
                  </div>
                  <div>
                    <p className="text-gray-900 font-bold text-sm">Ofereço serviços como prestador autônomo</p>
                    <p className="text-gray-500 text-xs">Ative para mostrar seus serviços para cidadãos e empresas que buscam contratar</p>
                  </div>
                  {isPrestador && (
                    <span className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full shrink-0" style={{ background: "rgba(232,160,32,0.20)", color: "#92400E" }}>
                      <i className="ri-check-line mr-1"></i>Ativo
                    </span>
                  )}
                </div>
              </button>

              {isPrestador && (
                <div className="space-y-5 animate-in fade-in">
                  {/* Categorias de serviço */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">
                      <i className="ri-price-tag-3-line mr-1.5" style={{ color: "#E8A020" }}></i>
                      Tipos de serviço que você oferece
                    </label>
                    <div className="p-3 rounded-xl flex items-start gap-2 mb-3" style={{ background: "#FFFBF0", border: "1px solid #FDE68A" }}>
                      <i className="ri-lightbulb-line shrink-0 mt-0.5" style={{ color: "#92400E" }}></i>
                      <p className="text-xs" style={{ color: "#92400E" }}>Selecione todas as categorias que se aplicam ao seu trabalho. Isso ajuda clientes a encontrarem você com mais facilidade.</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        "Encanador", "Eletricista", "Pedreiro", "Pintor", "Marceneiro",
                        "Jardinagem", "Frete/Mudança", "Limpeza", "Fotógrafo", "Designer",
                        "Programador", "Professor/Aula", "Babá/Cuidador", "Motorista", "Cozinheiro",
                        "Costureira", "Manicure/Cabeleireiro", "Mecânico", "Técnico TI", "Consultor",
                      ].map((cat) => {
                        const sel = categoriasServico.includes(cat);
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => toggleCategoria(cat)}
                            className={`px-3 py-2.5 rounded-xl text-xs font-semibold text-left transition-all cursor-pointer whitespace-nowrap border ${
                              sel
                                ? "text-[#92400E] border-[#E8A020]"
                                : "text-gray-600 border-gray-200 hover:border-gray-300"
                            }`}
                            style={sel ? { background: "#FFFBF0" } : { background: "#F9FAFB" }}
                          >
                            {sel && <i className="ri-check-line mr-1" style={{ color: "#E8A020" }}></i>}
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Descrição do serviço */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                      <i className="ri-file-list-3-line mr-1.5" style={{ color: "#E8A020" }}></i>
                      Descrição dos seus serviços
                    </label>
                    <textarea
                      value={descricaoServico}
                      onChange={(e) => setDescricaoServico(e.target.value)}
                      rows={4}
                      maxLength={500}
                      placeholder="Descreva com detalhes os serviços que você oferece. Ex para encanador: 'Instalação e reparo de encanamentos residenciais, troca de registros, desentupimento de pias e vasos sanitários, instalação de aquecedores a gás...'"
                      className="w-full rounded-xl px-4 py-3 border border-gray-200 text-gray-800 text-sm focus:outline-none focus:border-[#E8A020] transition-all resize-none"
                    />
                    <div className="flex justify-between mt-1.5">
                      <span className="text-gray-400 text-xs">{descricaoServico.length}/500</span>
                    </div>
                  </div>

                  {/* Dicas por profissão */}
                  <div className="p-4 rounded-xl border" style={{ background: "#F0FDF4", borderColor: "#BBF7D0" }}>
                    <p className="text-xs font-bold mb-2" style={{ color: "#166534" }}>
                      <i className="ri-lightbulb-flash-line mr-1"></i>Dica para se destacar
                    </p>
                    <p className="text-xs leading-relaxed" style={{ color: "#166534" }}>
                      {categoriasServico.includes("Fotógrafo") || categoriasServico.includes("Designer")
                        ? "Como profissional criativo, destaque seu estilo e especialidades. Mencione os tipos de projetos que já realizou e os equipamentos ou ferramentas que domina."
                        : categoriasServico.includes("Encanador") || categoriasServico.includes("Eletricista") || categoriasServico.includes("Pedreiro") || categoriasServico.includes("Pintor")
                        ? "Especifique os tipos de obra que atende (residencial, comercial, industrial). Liste materiais com os quais trabalha e se oferece orçamento gratuito."
                        : categoriasServico.includes("Professor/Aula")
                        ? "Informe as matérias, níveis de ensino e se oferece aulas presenciais ou online."
                        : "Seja específico sobre sua experiência. Mencione anos de atuação, tipos de clientes que atende e diferenciais como atendimento emergencial ou garantia dos serviços."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: Tema */}
          {step === 5 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8">
              <h2 className="text-lg font-extrabold text-gray-900 mb-1">Escolha um Tema</h2>
              <p className="text-gray-500 text-sm mb-6">Selecione o estilo visual do seu currículo</p>

              <div className="grid grid-cols-3 gap-3 mb-8">
                {TEMAS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTemaId(t.id)}
                    className={`p-4 rounded-xl text-center transition-all cursor-pointer border-2 ${temaId === t.id ? "border-[#1B2A5E]" : "border-gray-100 hover:border-gray-200"}`}
                  >
                    <div className="flex gap-1 mb-2 justify-center">
                      <span className="w-5 h-5 rounded-full" style={{ background: t.corPrimaria }}></span>
                      <span className="w-5 h-5 rounded-full" style={{ background: t.corSecundaria }}></span>
                    </div>
                    <p className="text-sm font-semibold text-gray-800">{t.nome}</p>
                  </button>
                ))}
              </div>

              {/* Preview */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-700">
                  <i className="ri-eye-line mr-1.5" style={{ color: "#3BBFD4" }}></i>
                  Pré-visualização
                </h3>
                <button
                  onClick={() => setMostrarPreview(!mostrarPreview)}
                  className="text-sm font-semibold cursor-pointer" style={{ color: "#3BBFD4" }}
                >
                  {mostrarPreview ? "Ocultar" : "Mostrar"} pré-visualização
                </button>
              </div>

              {mostrarPreview && (
                <div className="rounded-xl border border-gray-200 overflow-hidden" style={{ background: tema.bg }}>
                  {/* Mini CV Preview */}
                  <div className="p-6">
                    {/* Header com nome e contato */}
                    <div style={{ borderBottom: `2px solid ${tema.corPrimaria}`, paddingBottom: "16px", marginBottom: "16px" }}>
                      <div className="flex items-start gap-4">
                        {photoPreview && (
                          <img src={photoPreview} alt="Foto" className="w-16 h-16 rounded-xl object-cover object-top shrink-0" />
                        )}
                        <div>
                          <h3 className="text-xl font-extrabold mb-1" style={{ color: tema.corPrimaria }}>{form.nome || "Seu Nome"}</h3>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm" style={{ color: tema.textoCor }}>
                            {form.email && <span><i className="ri-mail-line mr-1" style={{ color: tema.corSecundaria }}></i>{form.email}</span>}
                            {form.telefone && <span><i className="ri-phone-line mr-1" style={{ color: tema.corSecundaria }}></i>{form.telefone}</span>}
                            {form.cidade && <span><i className="ri-map-pin-line mr-1" style={{ color: tema.corSecundaria }}></i>{form.cidade}</span>}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Objetivo */}
                    {form.objetivo && (
                      <div style={{ marginBottom: "16px" }}>
                        <h4 className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: tema.corPrimaria }}>Objetivo</h4>
                        <p className="text-sm" style={{ color: tema.textoCor }}>{form.objetivo}</p>
                      </div>
                    )}

                    {/* Resumo */}
                    {form.resumo && (
                      <div style={{ marginBottom: "16px" }}>
                        <h4 className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: tema.corPrimaria }}>Resumo Profissional</h4>
                        <p className="text-sm leading-relaxed" style={{ color: tema.textoCor }}>{form.resumo}</p>
                      </div>
                    )}

                    {/* Experiências */}
                    {experiencias.length > 0 && (
                      <div style={{ marginBottom: "16px" }}>
                        <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: tema.corPrimaria }}>Experiência Profissional</h4>
                        {experiencias.map((exp, i) => (
                          <div key={i} style={{ marginBottom: "12px", paddingLeft: "12px", borderLeft: `2px solid ${tema.corSecundaria}` }}>
                            <p className="text-sm font-bold" style={{ color: tema.textoCor }}>{exp.cargo || "Cargo"}</p>
                            <p className="text-xs" style={{ color: tema.corSecundaria }}>{exp.empresa || "Empresa"}{exp.periodo ? ` · ${exp.periodo}` : ""}</p>
                            {exp.descricao && <p className="text-xs mt-1 leading-relaxed" style={{ color: tema.textoCor }}>{exp.descricao}</p>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Formação */}
                    {formacoes.length > 0 && (
                      <div style={{ marginBottom: "16px" }}>
                        <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: tema.corPrimaria }}>Formação</h4>
                        {formacoes.map((f, i) => (
                          <div key={i} style={{ marginBottom: "8px", paddingLeft: "12px", borderLeft: `2px solid ${tema.corSecundaria}` }}>
                            <p className="text-sm font-bold" style={{ color: tema.textoCor }}>{f.curso || "Curso"}</p>
                            <p className="text-xs" style={{ color: tema.corSecundaria }}>{f.instituicao || "Instituição"}{f.ano ? ` · ${f.ano}` : ""}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Habilidades */}
                    {form.habilidades && (
                      <div style={{ marginBottom: "12px" }}>
                        <h4 className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: tema.corPrimaria }}>Habilidades</h4>
                        <p className="text-sm" style={{ color: tema.textoCor }}>{form.habilidades}</p>
                      </div>
                    )}

                    {/* Idiomas */}
                    {form.idiomas && (
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: tema.corPrimaria }}>Idiomas</h4>
                        <p className="text-sm" style={{ color: tema.textoCor }}>{form.idiomas}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={prevStep}
              disabled={step === 0}
              className="flex items-center gap-1.5 px-5 py-3 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all cursor-pointer whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <i className="ri-arrow-left-line"></i> Anterior
            </button>

            {step < STEPS.length - 1 ? (
              <button
                onClick={nextStep}
                disabled={!canNext()}
                className="flex items-center gap-1.5 px-6 py-3 rounded-xl text-white text-sm font-bold cursor-pointer whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg, #1B2A5E, #3BBFD4)" }}
              >
                Próximo <i className="ri-arrow-right-line"></i>
              </button>
            ) : (
              <button
                onClick={handleFinalizar}
                disabled={isFinalizing}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-bold cursor-pointer whitespace-nowrap disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #22C55E, #16A34A)" }}
              >
                {isFinalizing ? (
                  <>
                    <i className="ri-loader-4-line animate-spin"></i> Gerando PDF...
                  </>
                ) : (
                  <>
                    <i className="ri-check-line"></i> Finalizar Currículo
                  </>
                )}
              </button>
            )}
          </div>

          {/* Error message */}
          {finalizeError && (
            <div className="mt-4 p-4 rounded-xl flex items-start gap-2" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
              <i className="ri-error-warning-line text-red-500 mt-0.5 shrink-0"></i>
              <div>
                <p className="text-red-700 text-sm font-semibold">Erro ao gerar currículo</p>
                <p className="text-red-500 text-xs mt-1">{finalizeError}</p>
                <button
                  onClick={handleFinalizar}
                  className="mt-2 text-sm font-semibold text-red-600 hover:text-red-700 cursor-pointer"
                >
                  Tentar novamente
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}