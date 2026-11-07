import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/feature/Navbar";

const professionalAreas = [
  "Administração", "Saúde", "Educação", "Tecnologia", "Construção Civil",
  "Varejo", "Automotivo", "Gastronomia", "Segurança", "Transporte", "Outros"
];

const MAX_FILE_SIZE_MB = 5;
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"];

interface AttachedFile {
  file: File;
  type: "pdf" | "image";
  previewUrl?: string;
}

export default function CadastroCidadaoPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    display_name: "",
    name: "", cpf: "", phone: "", email: "", password: "", confirmPassword: "",
    neighborhood: "", area: "", skills: "", experience: ""
  });
  // NOVOS: Campos de empregabilidade
  const [isEmployed, setIsEmployed] = useState<boolean | null>(null);
  const [isLookingForWork, setIsLookingForWork] = useState<boolean | null>(null);
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError("");
  };

  const processFile = (file: File) => {
    setFileError(null);
    if (!ALLOWED_TYPES.includes(file.type)) {
      setFileError("Formato inválido. Use PDF, JPG, PNG ou WEBP.");
      return;
    }
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_FILE_SIZE_MB) {
      setFileError(`Arquivo muito grande. Máximo ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }
    const isPdf = file.type === "application/pdf";
    const attached: AttachedFile = { file, type: isPdf ? "pdf" : "image" };
    if (!isPdf) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setAttachedFile({ ...attached, previewUrl: ev.target?.result as string });
      };
      reader.readAsDataURL(file);
    } else {
      setAttachedFile(attached);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleRemoveFile = () => {
    setAttachedFile(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    if (!form.name.trim()) {
      setError("Informe seu nome completo.");
      return;
    }
    if (!form.display_name.trim()) {
      setError("Informe como quer ser chamado no sistema.");
      return;
    }
    setError("");
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const displayName = form.display_name.trim() || form.name.trim();

    // Criar usuário no Supabase Auth — dados extras vão no user_metadata
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: {
          full_name: form.name.trim(),
          display_name: displayName,
          phone: form.phone,
          neighborhood: form.neighborhood,
          role: "citizen",
          is_employed: isEmployed,
          job_status: isLookingForWork ? "looking" : "not_looking",
          employment_survey_completed: true,
        },
        emailRedirectTo: `${window.location.origin}/auth`,
      },
    });

    if (authError) {
      setLoading(false);
      setError(authError.message || "Erro ao criar conta. Tente novamente.");
      return;
    }

    // Atualiza o perfil com dados de empregabilidade após o signUp
    if (authData?.user?.id) {
      try {
        await supabase.from("profiles").upsert({
          id: authData.user.id,
          is_employed: isEmployed,
          job_status: isLookingForWork ? "looking" : "not_looking",
          employment_survey_completed: true,
        }, { onConflict: "id" });
      } catch (_) { /* não impede o fluxo */ }
    }

    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#030912] flex items-center justify-center px-4">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-12 max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
            <span className="w-10 h-10 flex items-center justify-center">
              <i className="ri-checkbox-circle-fill text-emerald-400 text-4xl"></i>
            </span>
          </div>
          <h2 className="text-2xl font-black text-white mb-3">Cadastro Enviado!</h2>
          <p className="text-white/50 text-sm leading-relaxed mb-4">
            Enviamos um link de confirmação para <strong className="text-white">{form.email}</strong>.
          </p>
          <p className="text-white/40 text-sm leading-relaxed mb-8">
            Abra seu e-mail, clique no link de confirmação e depois faça login para acessar sua conta.
          </p>
          <div className="space-y-3">
            <button onClick={() => navigate("/auth")} className="block w-full py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-400 transition-colors cursor-pointer whitespace-nowrap">
              Ir para o Login
            </button>
            <Link to="/oportunidades" className="block py-2 text-white/40 text-sm hover:text-white/60 transition-colors">
              Voltar às Oportunidades
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030912]">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-28 pb-16">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-emerald-400 text-sm font-semibold uppercase tracking-widest mb-2">Sistema de Oportunidades</p>
          <h1 className="text-3xl md:text-4xl font-black text-white">Cadastro de Cidadão</h1>
          <p className="text-white/40 text-sm mt-2">Crie seu perfil e candidate-se a vagas de emprego</p>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-2 mb-8 px-4">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${step >= s ? "bg-emerald-500 text-white" : "bg-white/10 text-white/40"}`}>
                {s}
              </div>
              <span className={`text-xs ${step >= s ? "text-white/70" : "text-white/30"}`}>
                {s === 1 ? "Dados Pessoais" : "Perfil Profissional"}
              </span>
              {s < 2 && <div className={`flex-1 h-px ${step > s ? "bg-emerald-500" : "bg-white/10"}`}></div>}
            </div>
          ))}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
          {error && (
            <div className="mb-5 p-4 rounded-xl text-red-400 text-sm flex items-start gap-2 bg-red-500/10 border border-red-500/20">
              <i className="ri-error-warning-line mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleNext} className="space-y-5">
              <div>
                <label className="block text-white/70 text-sm font-medium mb-2">Como quer ser chamado no sistema? *</label>
                <input type="text" name="display_name" value={form.display_name} onChange={handleChange} required placeholder="Apelido ou nome que prefere" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 outline-none focus:border-emerald-400 transition-colors" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/70 text-sm font-medium mb-2">Nome Completo *</label>
                  <input type="text" name="name" value={form.name} onChange={handleChange} required placeholder="Seu nome completo" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 outline-none focus:border-emerald-400 transition-colors" />
                </div>
                <div>
                  <label className="block text-white/70 text-sm font-medium mb-2">CPF</label>
                  <input type="text" name="cpf" value={form.cpf} onChange={handleChange} placeholder="000.000.000-00" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 outline-none focus:border-emerald-400 transition-colors" />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/70 text-sm font-medium mb-2">Telefone *</label>
                  <input type="tel" name="phone" value={form.phone} onChange={handleChange} required placeholder="(53) 99999-9999" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 outline-none focus:border-emerald-400 transition-colors" />
                </div>
                <div>
                  <label className="block text-white/70 text-sm font-medium mb-2">Bairro</label>
                  <input type="text" name="neighborhood" value={form.neighborhood} onChange={handleChange} placeholder="Seu bairro" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 outline-none focus:border-emerald-400 transition-colors" />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/70 text-sm font-medium mb-2">E-mail *</label>
                  <input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="seu@email.com" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 outline-none focus:border-emerald-400 transition-colors" />
                </div>
                <div>
                  <label className="block text-white/70 text-sm font-medium mb-2">Senha *</label>
                  <input type="password" name="password" value={form.password} onChange={handleChange} required placeholder="Mínimo 6 caracteres" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 outline-none focus:border-emerald-400 transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-white/70 text-sm font-medium mb-2">Confirmar Senha *</label>
                <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} required placeholder="Confirme sua senha" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 outline-none focus:border-emerald-400 transition-colors" />
              </div>
              {form.password && form.confirmPassword && form.password !== form.confirmPassword && (
                <p className="text-red-400 text-xs flex items-center gap-1">
                  <i className="ri-error-warning-line"></i> As senhas não coincidem.
                </p>
              )}
              <button
                type="submit"
                disabled={!!(form.password && form.confirmPassword && form.password !== form.confirmPassword)}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continuar
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* NOVO: Empregabilidade — campos obrigatórios */}
              <div className="p-4 rounded-xl" style={{ background: "rgba(232,160,32,0.08)", border: "1px solid rgba(232,160,32,0.20)" }}>
                <p className="text-white/80 text-sm font-bold mb-3 flex items-center gap-2">
                  <i className="ri-briefcase-4-line" style={{ color: "#E8A020" }}></i>
                  Situação Atual de Trabalho
                </p>

                {/* Está empregado? */}
                <div className="mb-4">
                  <p className="text-white/50 text-xs font-semibold mb-2">Você está empregado atualmente?</p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsEmployed(true)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                        isEmployed === true
                          ? "text-[#0D1629]"
                          : "text-white/50"
                      }`}
                      style={isEmployed === true
                        ? { background: "linear-gradient(135deg, #22C55E, #4ade80)" }
                        : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}
                    >
                      <i className="ri-check-line mr-1"></i> Sim, estou empregado
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEmployed(false)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                        isEmployed === false
                          ? "text-[#0D1629]"
                          : "text-white/50"
                      }`}
                      style={isEmployed === false
                        ? { background: "linear-gradient(135deg, #E8A020, #f5b94a)" }
                        : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}
                    >
                      <i className="ri-close-line mr-1"></i> Não, estou desempregado
                    </button>
                  </div>
                </div>

                {/* Está buscando emprego? */}
                <div>
                  <p className="text-white/50 text-xs font-semibold mb-2">
                    {isEmployed === true
                      ? "Mesmo empregado, você está buscando novas oportunidades?"
                      : "Você está buscando emprego ativamente?"}
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsLookingForWork(true)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                        isLookingForWork === true
                          ? "text-[#0D1629]"
                          : "text-white/50"
                      }`}
                      style={isLookingForWork === true
                        ? { background: "linear-gradient(135deg, #3BBFD4, #60d5e8)" }
                        : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}
                    >
                      <i className="ri-search-line mr-1"></i> Sim, quero oportunidades
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsLookingForWork(false)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                        isLookingForWork === false
                          ? "text-white/80"
                          : "text-white/50"
                      }`}
                      style={isLookingForWork === false
                        ? { background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.20)" }
                        : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}
                    >
                      <i className="ri-pause-circle-line mr-1"></i> Não no momento
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-white/70 text-sm font-medium mb-2">Área Profissional</label>
                <select name="area" value={form.area} onChange={handleChange} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-emerald-400 transition-colors cursor-pointer">
                  <option value="">Selecione sua área</option>
                  {professionalAreas.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-white/70 text-sm font-medium mb-2">Habilidades</label>
                <textarea name="skills" value={form.skills} onChange={handleChange} rows={3} placeholder="Ex: Excel, atendimento ao cliente, operação de caixa..." className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 outline-none focus:border-emerald-400 transition-colors resize-none" />
              </div>
              <div>
                <label className="block text-white/70 text-sm font-medium mb-2">Experiência Profissional</label>
                <textarea name="experience" value={form.experience} onChange={handleChange} rows={3} placeholder="Descreva suas experiências anteriores (empresa, cargo, período)..." className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 outline-none focus:border-emerald-400 transition-colors resize-none" />
              </div>

              {/* Upload de Documento */}
              <div>
                <label className="block text-white/70 text-sm font-medium mb-2">
                  Currículo ou Foto de Documento <span className="text-white/30 font-normal">(opcional)</span>
                </label>
                <p className="text-white/30 text-xs mb-3">Aceito: PDF, JPG, PNG — Máximo 5MB</p>

                {!attachedFile ? (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex flex-col items-center justify-center gap-3 px-6 py-8 border-2 border-dashed rounded-2xl transition-all cursor-pointer group
                      ${dragOver
                        ? "border-emerald-400 bg-emerald-400/10"
                        : "border-white/15 bg-white/5 hover:border-emerald-400/50 hover:bg-white/8"
                      }`}
                  >
                    <div className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 group-hover:bg-emerald-500/20 transition-colors">
                      <i className="ri-upload-cloud-2-line text-white/50 group-hover:text-emerald-400 text-2xl transition-colors"></i>
                    </div>
                    <div className="text-center">
                      <p className="text-white/60 text-sm font-medium">
                        {dragOver ? "Solte o arquivo aqui" : "Arraste ou clique para selecionar"}
                      </p>
                      <p className="text-white/30 text-xs mt-1">PDF do currículo ou foto do documento</p>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2.5 py-1 bg-white/10 rounded-full text-white/40 text-xs flex items-center gap-1">
                        <i className="ri-file-pdf-line text-red-400"></i> PDF
                      </span>
                      <span className="px-2.5 py-1 bg-white/10 rounded-full text-white/40 text-xs flex items-center gap-1">
                        <i className="ri-image-line text-emerald-400"></i> JPG
                      </span>
                      <span className="px-2.5 py-1 bg-white/10 rounded-full text-white/40 text-xs flex items-center gap-1">
                        <i className="ri-image-line text-emerald-400"></i> PNG
                      </span>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={handleFileInput}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-4 p-4 bg-white/5 border border-emerald-400/30 rounded-2xl">
                    {attachedFile.type === "image" && attachedFile.previewUrl ? (
                      <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-white/10">
                        <img src={attachedFile.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-red-500/15 border border-red-400/20 flex items-center justify-center shrink-0">
                        <i className="ri-file-pdf-2-fill text-red-400 text-2xl"></i>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{attachedFile.file.name}</p>
                      <p className="text-white/40 text-xs mt-0.5">
                        {attachedFile.type === "pdf" ? "PDF" : "Imagem"} • {" "}
                        {(attachedFile.file.size / (1024 * 1024)).toFixed(2)}MB
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <i className="ri-checkbox-circle-fill text-emerald-400 text-xs"></i>
                        <span className="text-emerald-400 text-xs">Arquivo pronto para envio</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-colors cursor-pointer shrink-0"
                    >
                      <i className="ri-close-line text-sm"></i>
                    </button>
                  </div>
                )}

                {fileError && (
                  <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <i className="ri-error-warning-line text-red-400 text-sm"></i>
                    <span className="text-red-400 text-xs">{fileError}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} className="flex-1 py-4 border border-white/10 text-white/70 hover:text-white font-semibold rounded-xl transition-colors cursor-pointer">
                  Voltar
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 transition-all cursor-pointer disabled:opacity-50">
                  {loading ? "Cadastrando..." : "Finalizar Cadastro"}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-white/40 text-sm">
            Já tem conta?{" "}
            <Link to="/auth" className="text-emerald-400 hover:text-emerald-300 cursor-pointer">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  );
}