import { useState } from "react";
import { supabase } from "@/lib/supabase";

interface EmploymentSurveyProps {
  userId: string;
  onComplete: () => void;
  onSkip: () => void;
}

export default function EmploymentSurvey({ userId, onComplete, onSkip }: EmploymentSurveyProps) {
  const [step, setStep] = useState<"employed_question" | "platform_question" | "platform_details" | "done">("employed_question");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Está desempregado?
  const handleEmployedAnswer = async (isEmployed: boolean) => {
    setError("");
    if (!isEmployed) {
      // Desempregado → salva e finaliza
      setSaving(true);
      const { error: err } = await supabase.from("profiles").update({
        is_employed: false,
        job_status: "looking",
        employment_survey_completed: true,
        employed_through_platform: false,
      }).eq("id", userId);
      setSaving(false);
      if (err) { setError("Erro ao salvar. Tente novamente."); return; }
      onComplete();
    } else {
      // Empregado → pergunta se foi pela plataforma
      setStep("platform_question");
    }
  };

  // Step 2: Conseguiu esse emprego pelo sistema?
  const handlePlatformAnswer = async (throughPlatform: boolean) => {
    setError("");
    if (!throughPlatform) {
      // Emprego por fora → salva e finaliza
      setSaving(true);
      const { error: err } = await supabase.from("profiles").update({
        is_employed: true,
        employment_survey_completed: true,
        employed_through_platform: false,
      }).eq("id", userId);
      setSaving(false);
      if (err) { setError("Erro ao salvar. Tente novamente."); return; }
      onComplete();
    } else {
      // Pela plataforma → pede descrição
      setStep("platform_details");
    }
  };

  // Step 3: Descrição do emprego conseguido pela plataforma
  const handlePlatformDetails = async (description: string) => {
    if (!description.trim()) { setError("Conte um pouco sobre como foi conseguir esse emprego pela plataforma."); return; }
    setSaving(true);
    setError("");
    const { error: err } = await supabase.from("profiles").update({
      is_employed: true,
      employment_survey_completed: true,
      employed_through_platform: true,
      platform_job_details: description.trim(),
    }).eq("id", userId);
    setSaving(false);
    if (err) { setError("Erro ao salvar. Tente novamente."); return; }
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-5 text-white" style={{ background: "linear-gradient(135deg, #1B2A5E, #3BBFD4)" }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.15)" }}>
              <i className="ri-briefcase-4-line text-xl"></i>
            </div>
            <div>
              <h2 className="font-extrabold text-lg leading-tight">
                {step === "employed_question" && "Pesquisa de Empregabilidade"}
                {step === "platform_question" && "Emprego pela Plataforma"}
                {step === "platform_details" && "Conte sua experiência"}
              </h2>
              <p className="text-white/60 text-xs">Sua resposta ajuda a melhorar o sistema</p>
            </div>
          </div>
        </div>

        <div className="p-5">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-start gap-2">
              <i className="ri-error-warning-line mt-0.5 shrink-0"></i>
              <span>{error}</span>
            </div>
          )}

          {/* Step 1: Está desempregado? */}
          {step === "employed_question" && (
            <div>
              <p className="text-gray-800 font-semibold text-base mb-4">Você está desempregado atualmente?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleEmployedAnswer(false)}
                  disabled={saving}
                  className="flex-1 flex flex-col items-center gap-2 p-4 md:p-5 rounded-2xl border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 transition-all cursor-pointer disabled:opacity-50"
                >
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(217,119,6,0.15)" }}>
                    <i className="ri-search-line text-xl md:text-2xl" style={{ color: "#D97706" }}></i>
                  </div>
                  <span className="font-bold text-xs md:text-sm text-center leading-tight" style={{ color: "#D97706" }}>
                    <span className="hidden md:inline">Sim, estou desempregado</span>
                    <span className="md:hidden">Desempregado</span>
                  </span>
                  <span className="text-[10px] md:text-xs text-amber-600 text-center leading-tight">
                    <span className="hidden md:inline">Busco oportunidades de trabalho</span>
                    <span className="md:hidden">Buscando vagas</span>
                  </span>
                </button>
                <button
                  onClick={() => handleEmployedAnswer(true)}
                  disabled={saving}
                  className="flex-1 flex flex-col items-center gap-2 p-4 md:p-5 rounded-2xl border-2 border-green-200 bg-green-50 hover:bg-green-100 transition-all cursor-pointer disabled:opacity-50"
                >
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(22,163,74,0.15)" }}>
                    <i className="ri-briefcase-line text-xl md:text-2xl" style={{ color: "#16A34A" }}></i>
                  </div>
                  <span className="font-bold text-xs md:text-sm text-center leading-tight" style={{ color: "#16A34A" }}>
                    <span className="hidden md:inline">Não, estou empregado</span>
                    <span className="md:hidden">Empregado</span>
                  </span>
                  <span className="text-[10px] md:text-xs text-green-600 text-center leading-tight">
                    <span className="hidden md:inline">Já tenho um trabalho atual</span>
                    <span className="md:hidden">Tenho trabalho</span>
                  </span>
                </button>
              </div>
              <button
                onClick={onSkip}
                className="w-full mt-3 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all cursor-pointer whitespace-nowrap"
              >
                Responder depois
              </button>
            </div>
          )}

          {/* Step 2: Conseguiu pela plataforma? */}
          {step === "platform_question" && (
            <div>
              <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-green-50 border border-green-100">
                <i className="ri-briefcase-fill text-green-600 text-xl"></i>
                <p className="text-green-800 text-sm font-semibold">Você está empregado!</p>
              </div>
              <p className="text-gray-700 text-sm mb-4">Esse emprego foi conseguido <strong>através da nossa plataforma</strong> (se candidatando a uma vaga do sistema)?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => handlePlatformAnswer(true)}
                  disabled={saving}
                  className="flex-1 flex flex-col items-center gap-2 p-4 md:p-5 rounded-2xl border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 transition-all cursor-pointer disabled:opacity-50"
                >
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(59,130,246,0.15)" }}>
                    <i className="ri-check-line text-xl md:text-2xl" style={{ color: "#3B82F6" }}></i>
                  </div>
                  <span className="font-bold text-xs md:text-sm text-center leading-tight" style={{ color: "#3B82F6" }}>
                    <span className="hidden md:inline">Sim, pela plataforma!</span>
                    <span className="md:hidden">Pela plataforma</span>
                  </span>
                  <span className="text-[10px] md:text-xs text-blue-500 text-center leading-tight">
                    <span className="hidden md:inline">Consegui por uma vaga do sistema</span>
                    <span className="md:hidden">Consegui por vaga</span>
                  </span>
                </button>
                <button
                  onClick={() => handlePlatformAnswer(false)}
                  disabled={saving}
                  className="flex-1 flex flex-col items-center gap-2 p-4 md:p-5 rounded-2xl border-2 border-gray-200 bg-gray-50 hover:bg-gray-100 transition-all cursor-pointer disabled:opacity-50"
                >
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(107,114,128,0.15)" }}>
                    <i className="ri-external-link-line text-xl md:text-2xl" style={{ color: "#6B7280" }}></i>
                  </div>
                  <span className="font-bold text-xs md:text-sm text-center leading-tight text-gray-600">
                    <span className="hidden md:inline">Não, foi por fora</span>
                    <span className="md:hidden">Por fora</span>
                  </span>
                  <span className="text-[10px] md:text-xs text-gray-500 text-center leading-tight">
                    <span className="hidden md:inline">Consegui por outros meios</span>
                    <span className="md:hidden">Outros meios</span>
                  </span>
                </button>
              </div>
              <button
                onClick={() => setStep("employed_question")}
                className="w-full mt-3 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-gray-600 transition-all cursor-pointer whitespace-nowrap"
              >
                ← Voltar
              </button>
            </div>
          )}

          {/* Step 3: Descrição */}
          {step === "platform_details" && (
            <PlatformDetailsForm
              saving={saving}
              onSubmit={handlePlatformDetails}
              onBack={() => setStep("platform_question")}
            />
          )}

          {saving && (
            <div className="mt-4 flex items-center justify-center gap-2 text-gray-400 text-sm">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
              Salvando...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PlatformDetailsForm({ saving, onSubmit, onBack }: { saving: boolean; onSubmit: (desc: string) => void; onBack: () => void }) {
  const [description, setDescription] = useState("");

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-blue-50 border border-blue-100">
        <i className="ri-trophy-fill text-2xl" style={{ color: "#3B82F6" }}></i>
        <div>
          <p className="text-blue-800 text-sm font-bold">Que incrível!</p>
          <p className="text-blue-600 text-xs">Conte como foi sua experiência</p>
        </div>
      </div>
      <p className="text-gray-700 text-sm mb-3">
        Para qual vaga você se candidatou? Como foi o processo? Essa informação ajuda o sistema a acompanhar os resultados.
      </p>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Ex: Me candidatei à vaga de Auxiliar Administrativo na empresa XPTO, fui chamado para entrevista e consegui o emprego! O processo foi rápido e bem organizado."
        rows={4}
        maxLength={500}
        className="w-full rounded-xl px-4 py-3 text-sm text-gray-800 border border-gray-200 focus:outline-none focus:border-blue-300 resize-none"
      />
      <p className="text-xs text-gray-400 text-right mt-1">{description.length}/500</p>
      <div className="flex gap-3 mt-3">
        <button
          onClick={onBack}
          disabled={saving}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50 border border-gray-200 transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
        >
          ← Voltar
        </button>
        <button
          onClick={() => onSubmit(description)}
          disabled={saving || !description.trim()}
          className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #1B2A5E, #3BBFD4)" }}
        >
          {saving ? "Salvando..." : "Confirmar"}
        </button>
      </div>
    </div>
  );
}