import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { getStoredUser } from "@/hooks/useAuth";
import { notificarRelevantes } from "@/hooks/useNotifications";
import Navbar from "@/components/feature/Navbar";
import Footer from "@/components/feature/Footer";

// Polyfill Promise.withResolvers para navegadores antigos (iOS Safari, Chrome antigo)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (typeof Promise !== "undefined" && !(Promise as any).withResolvers) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Promise as any).withResolvers = function () {
    let resolve: (value: unknown) => void;
    let reject: (reason: unknown) => void;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

interface StoredFormData {
  nome: string;
  email: string;
  telefone: string;
  cidade: string;
  objetivo: string;
  resumo: string;
  habilidades: string;
  idiomas: string;
  isPrestador: boolean;
  categoriasServico: string[];
  descricaoServico: string;
  temaId: string;
}

interface PdfPage {
  pageNum: number;
  dataUrl: string;
  width: number;
  height: number;
}

export default function CurriculoPreviewPage() {
  const navigate = useNavigate();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState<StoredFormData | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [authUserId, setAuthUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [showPdfFallback, setShowPdfFallback] = useState(false);

  // PDF render states
  const [pdfPages, setPdfPages] = useState<PdfPage[]>([]);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [renderProgress, setRenderProgress] = useState(0);
  const renderCancelRef = useRef(false);

  // Load auth & session data
  useEffect(() => {
    const stored = getStoredUser();
    if (!stored?.id) {
      navigate("/auth?from=/cidadao/curriculo/criar");
      return;
    }
    setAuthUserId(stored.id);
    setUserName(stored.display_name || stored.full_name || stored.email || "");

    try {
      const url = sessionStorage.getItem("curriculo_preview_url");
      const data = sessionStorage.getItem("curriculo_preview_data");

      if (!url || !data) {
        navigate("/cidadao/curriculo/criar");
        return;
      }

      setPdfUrl(url);
      setFormData(JSON.parse(data));
    } catch {
      navigate("/cidadao/curriculo/criar");
    }
  }, [navigate]);

  // Render PDF pages to canvas images using pdfjs-dist
  const renderPdf = useCallback(async (url: string) => {
    setPdfLoading(true);
    setPdfError(null);
    setPdfPages([]);
    setRenderProgress(0);
    renderCancelRef.current = false;

    try {
      // Dynamic import to avoid SSR issues
      const pdfjs = await import("pdfjs-dist");

      // Set worker — use CDN to avoid bundle issues
      if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs`;
      }

      // Fetch the PDF as ArrayBuffer (bypasses CORS restrictions on direct embed)
      let pdfData: ArrayBuffer;
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        pdfData = await res.arrayBuffer();
      } catch {
        throw new Error("Não foi possível baixar o PDF. Verifique sua conexão.");
      }

      if (renderCancelRef.current) return;

      const loadingTask = pdfjs.getDocument({ data: pdfData });
      const pdf = await loadingTask.promise;

      if (renderCancelRef.current) return;

      const totalPages = pdf.numPages;
      const pages: PdfPage[] = [];

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        if (renderCancelRef.current) return;

        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 }); // 2x for retina quality

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas não suportado");

        // White background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({ canvasContext: ctx, viewport }).promise;

        const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

        pages.push({
          pageNum,
          dataUrl,
          width: viewport.width,
          height: viewport.height,
        });

        setRenderProgress(Math.round((pageNum / totalPages) * 100));
      }

      if (!renderCancelRef.current) {
        setPdfPages(pages);
      }
    } catch (err) {
      if (!renderCancelRef.current) {
        const msg = err instanceof Error ? err.message : "Erro ao renderizar o PDF";
        setPdfError(msg);
      }
    } finally {
      if (!renderCancelRef.current) {
        setPdfLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (pdfUrl) {
      renderPdf(pdfUrl);
    }
    return () => {
      renderCancelRef.current = true;
    };
  }, [pdfUrl, renderPdf]);

  const handleVoltar = () => {
    navigate("/cidadao/curriculo/criar?from=preview");
  };

  const handleDownload = async () => {
    if (!pdfUrl) return;
    setDownloading(true);
    try {
      const res = await fetch(pdfUrl);
      const blob = await res.blob();
      const dl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = dl;
      a.download = `curriculo-${(formData?.nome || "curriculo").replace(/\s+/g, "-").toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(dl);
    } catch {
      window.open(pdfUrl, "_blank", "noopener,noreferrer");
    }
    setDownloading(false);
  };

  const handleSalvarNoPerfil = async () => {
    if (!authUserId || !pdfUrl || saved) return;
    setSaving(true);
    setSaveError("");

    try {
      // Primeiro: busca o perfil atual para NÃO sobrescrever dados que não queremos alterar
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("job_status, is_employed, wants_opportunities, curriculos_gerados_count")
        .eq("id", authUserId)
        .maybeSingle();

      const profileUpdate: Record<string, unknown> = {
        curriculo_pdf: pdfUrl,
        wants_opportunities: true,
        updated_at: new Date().toISOString(),
      };

      // Incrementa contador de currículos gerados (se não existir, começa em 1)
      const currentCount = (currentProfile as any)?.curriculos_gerados_count || 0;
      profileUpdate.curriculos_gerados_count = currentCount + 1;

      // Só altera job_status se o cidadão NÃO está marcado como "não procuro"
      const currentStatus = (currentProfile as any)?.job_status;
      const currentIsEmployed = (currentProfile as any)?.is_employed;
      if (currentStatus !== "not_looking") {
        profileUpdate.job_status = "looking";
      }

      if (formData) {
        if (formData.resumo) profileUpdate.bio = formData.resumo;
        if (formData.habilidades) profileUpdate.expertise = formData.habilidades;
        if (formData.isPrestador) {
          profileUpdate.is_service_provider = true;
          profileUpdate.service_categories = formData.categoriasServico.join(", ");
          profileUpdate.service_description = formData.descricaoServico || null;
          profileUpdate.worker_profile_type = "freelancer";
        }
      }

      const { error } = await supabase
        .from("profiles")
        .update(profileUpdate)
        .eq("id", authUserId);

      if (error) throw new Error(error.message);

      setSaved(true);

      try {
        const nomeCidadao = formData?.nome || userName || "Cidadão";
        await notificarRelevantes(
          "curriculo_criado",
          "Novo Currículo Criado",
          `${nomeCidadao} acabou de criar e salvar seu currículo no sistema de oportunidades.`,
          {
            remetenteId: authUserId,
            remetenteNome: nomeCidadao,
            referenciaId: authUserId,
            referenciaTipo: "profile",
            excluirIds: [authUserId],
          }
        );
      } catch {
        // silente
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Erro ao salvar");
    }
    setSaving(false);
  };

  const handleIrParaSistema = () => {
    if (formData?.isPrestador) {
      navigate("/sistema/painel/cidadao?tab=prestadores");
    } else {
      navigate("/sistema/painel/cidadao?tab=feed");
    }
  };

  const pdfFileName = `curriculo-${(formData?.nome || "curriculo").replace(/\s+/g, "-").toLowerCase()}.pdf`;

  if (!pdfUrl || !formData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F5F4F0" }}>
        <div className="text-center">
          <div
            className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: "rgba(27,42,94,0.2)", borderTopColor: "#1B2A5E" }}
          />
          <p className="text-gray-500 text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#F5F4F0" }}>
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, #22C55E, #16A34A)" }}
            >
              <i className="ri-check-line text-white text-xl"></i>
            </div>
            <div>
              <h1 className="text-xl md:text-3xl font-extrabold text-gray-900">Currículo Gerado!</h1>
              <p className="text-gray-500 text-sm mt-0.5">
                Seu currículo em PDF está pronto. Revise, baixe e salve no seu perfil.
              </p>
            </div>
          </div>

          {/* ============ BANNER DESTAQUE: SALVAR NO PERFIL — AGORA NO TOPO ============ */}
          <div className="mb-6 rounded-2xl border-2 overflow-hidden" style={{ borderColor: "#22C55E", background: "linear-gradient(135deg, #F0FDF4, #ffffff)" }}>
            <div className="p-5 md:p-6 flex flex-col md:flex-row items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "rgba(34,197,94,0.15)" }}>
                <i className="ri-save-line text-3xl" style={{ color: "#16A34A" }}></i>
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-gray-900 font-extrabold text-lg">Salvar no Meu Perfil</h3>
                <p className="text-gray-500 text-sm mt-0.5">
                  Vincule seu currículo ao cadastro para que empresas e o gabinete possam encontrá-lo.
                </p>
              </div>
              {saved ? (
                <div
                  className="flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold"
                  style={{
                    background: "rgba(34,197,94,0.10)",
                    color: "#16A34A",
                    border: "1px solid rgba(34,197,94,0.30)",
                  }}
                >
                  <i className="ri-checkbox-circle-fill text-lg"></i>
                  <span>Salvo no Perfil</span>
                </div>
              ) : (
                <button
                  onClick={handleSalvarNoPerfil}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap transition-all disabled:opacity-50 text-white shadow-lg"
                  style={{ background: "linear-gradient(135deg, #22C55E, #16A34A)", boxShadow: "0 6px 20px rgba(34,197,94,0.40)" }}
                >
                  {saving ? (
                    <><i className="ri-loader-4-line animate-spin mr-1"></i> Salvando...</>
                  ) : (
                    <><i className="ri-save-line mr-1"></i> Salvar no Meu Perfil</>
                  )}
                </button>
              )}
            </div>
            {saveError && (
              <div className="px-5 pb-4">
                <div
                  className="p-3 rounded-xl text-xs"
                  style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626" }}
                >
                  <i className="ri-error-warning-line mr-1"></i>
                  {saveError}
                </div>
              </div>
            )}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Coluna esquerda: PDF Preview */}
            <div className="lg:col-span-2 space-y-5">
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {/* Card header */}
                <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-2">
                  <h2 className="text-gray-900 font-bold text-sm flex items-center gap-2">
                    <i className="ri-file-pdf-line" style={{ color: "#EF4444" }}></i>
                    Pré-visualização do PDF
                  </h2>
                  <span className="text-xs text-gray-400 truncate max-w-[140px] sm:max-w-none">
                    {pdfFileName}
                  </span>
                </div>

                {/* Loading state */}
                {pdfLoading && (
                  <div className="p-10 flex flex-col items-center justify-center gap-4">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg, #1B2A5E15, #3BBFD415)" }}
                    >
                      <i className="ri-file-pdf-2-line text-3xl" style={{ color: "#1B2A5E" }}></i>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-700 font-semibold text-sm mb-1">Renderizando seu currículo...</p>
                      <p className="text-gray-400 text-xs mb-4">Isso pode levar alguns segundos</p>
                      {/* Progress bar */}
                      <div className="w-48 mx-auto">
                        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${renderProgress}%`,
                              background: "linear-gradient(to right, #1B2A5E, #3BBFD4)",
                            }}
                          />
                        </div>
                        <p className="text-gray-400 text-xs mt-1 text-center">{renderProgress}%</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error state */}
                {pdfError && !pdfLoading && (
                  <div className="p-8 flex flex-col items-center justify-center gap-4">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center"
                      style={{ background: "rgba(239,68,68,0.10)" }}
                    >
                      <i className="ri-error-warning-line text-2xl" style={{ color: "#EF4444" }}></i>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-700 font-semibold text-sm mb-1">Erro ao carregar pré-visualização</p>
                      <p className="text-gray-400 text-xs mb-4 max-w-xs">{pdfError}</p>
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                          onClick={() => pdfUrl && renderPdf(pdfUrl)}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer"
                          style={{ background: "linear-gradient(135deg, #1B2A5E, #3BBFD4)", color: "white" }}
                        >
                          <i className="ri-refresh-line"></i> Tentar novamente
                        </button>
                        <button
                          onClick={() => setShowPdfFallback(true)}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer border border-gray-200 text-gray-700"
                          style={{ background: "#F9FAFB" }}
                        >
                          <i className="ri-eye-line"></i> Ver visual simples
                        </button>
                        <button
                          onClick={handleDownload}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer border border-gray-200 text-gray-700"
                          style={{ background: "#F9FAFB" }}
                        >
                          <i className="ri-download-line"></i> Baixar PDF
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* PDF pages rendered as images */}
                {!pdfLoading && !pdfError && pdfPages.length > 0 && (
                  <div className="bg-gray-100 p-4 space-y-3">
                    {pdfPages.map((page) => (
                      <div
                        key={page.pageNum}
                        className="relative bg-white rounded-lg overflow-hidden shadow-sm mx-auto"
                        style={{ maxWidth: "100%" }}
                      >
                        <img
                          src={page.dataUrl}
                          alt={`Página ${page.pageNum}`}
                          className="w-full h-auto block"
                          style={{ imageRendering: "crisp-edges" }}
                        />
                        {pdfPages.length > 1 && (
                          <div
                            className="absolute bottom-2 right-2 text-xs px-2 py-1 rounded-lg font-medium"
                            style={{ background: "rgba(0,0,0,0.45)", color: "white" }}
                          >
                            {page.pageNum} / {pdfPages.length}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* HTML fallback: quando PDF não renderiza, mostra pré-visualização visual */}
                {(pdfError || (!pdfLoading && pdfPages.length === 0) || showPdfFallback) && formData && (
                  <div className="p-6" style={{ background: "#ffffff" }}>
                    <div className="mb-4 flex items-center gap-2">
                      <i className="ri-eye-line text-sm" style={{ color: "#E8A020" }}></i>
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Pré-visualização visual do currículo</span>
                    </div>

                    {/* Header */}
                    <div style={{ borderBottom: "2px solid #1B2A5E", paddingBottom: "16px", marginBottom: "16px" }}>
                      <h3 className="text-xl font-extrabold mb-1" style={{ color: "#1B2A5E" }}>{formData.nome || "Seu Nome"}</h3>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700">
                        {formData.email && <span><i className="ri-mail-line mr-1" style={{ color: "#3BBFD4" }}></i>{formData.email}</span>}
                        {formData.telefone && <span><i className="ri-phone-line mr-1" style={{ color: "#3BBFD4" }}></i>{formData.telefone}</span>}
                        {formData.cidade && <span><i className="ri-map-pin-line mr-1" style={{ color: "#3BBFD4" }}></i>{formData.cidade}</span>}
                      </div>
                    </div>

                    {formData.objetivo && (
                      <div style={{ marginBottom: "14px" }}>
                        <h4 className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#1B2A5E" }}>Objetivo</h4>
                        <p className="text-sm text-gray-700">{formData.objetivo}</p>
                      </div>
                    )}

                    {formData.resumo && (
                      <div style={{ marginBottom: "14px" }}>
                        <h4 className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#1B2A5E" }}>Resumo Profissional</h4>
                        <p className="text-sm leading-relaxed text-gray-700">{formData.resumo}</p>
                      </div>
                    )}

                    {formData.habilidades && (
                      <div style={{ marginBottom: "14px" }}>
                        <h4 className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#1B2A5E" }}>Habilidades</h4>
                        <p className="text-sm text-gray-700">{formData.habilidades}</p>
                      </div>
                    )}

                    {formData.idiomas && (
                      <div style={{ marginBottom: "14px" }}>
                        <h4 className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#1B2A5E" }}>Idiomas</h4>
                        <p className="text-sm text-gray-700">{formData.idiomas}</p>
                      </div>
                    )}

                    {formData.isPrestador && formData.categoriasServico.length > 0 && (
                      <div style={{ marginBottom: "14px" }}>
                        <h4 className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#E8A020" }}>Serviços</h4>
                        <p className="text-sm text-gray-700">{formData.categoriasServico.join(", ")}</p>
                        {formData.descricaoServico && <p className="text-xs mt-1 text-gray-500">{formData.descricaoServico}</p>}
                      </div>
                    )}

                    {pdfError && (
                      <div className="mt-4 p-3 rounded-xl flex items-start gap-2" style={{ background: "#FFFBF0", border: "1px solid #FDE68A" }}>
                        <i className="ri-information-line shrink-0 mt-0.5" style={{ color: "#92400E" }}></i>
                        <div>
                          <p className="text-xs font-semibold text-amber-900">PDF não pôde ser renderizado</p>
                          <p className="text-xs text-amber-700 mt-0.5">O download do PDF está disponível abaixo. A pré-visualização acima mostra o conteúdo exato do seu currículo.</p>
                          <button
                            onClick={() => pdfUrl && renderPdf(pdfUrl)}
                            className="mt-2 text-xs font-bold cursor-pointer" style={{ color: "#E8A020" }}
                          >
                            <i className="ri-refresh-line mr-1"></i>Tentar renderizar PDF novamente
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Instruções */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-start gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "rgba(232,160,32,0.15)" }}
                  >
                    <i className="ri-information-line text-lg" style={{ color: "#E8A020" }}></i>
                  </div>
                  <div>
                    <h3 className="text-gray-900 font-bold text-sm">Como inserir seu currículo no sistema</h3>
                    <p className="text-gray-500 text-xs mt-1 leading-relaxed">
                      O currículo <strong>não é salvo automaticamente</strong> no seu perfil. Você decide quando salvar.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { step: "1", text: "Revise o currículo na pré-visualização acima.", color: "#3BBFD4" },
                    { step: "2", text: "Clique em \"Baixar PDF\" para salvar o arquivo no seu dispositivo.", color: "#1B2A5E" },
                    { step: "3", text: "Clique em \"Salvar no Meu Perfil\" para vincular ao seu cadastro.", color: "#22C55E" },
                    { step: "4", text: "Após salvar, o currículo fica disponível para empresas e para o gabinete.", color: "#E8A020" },
                  ].map((item) => (
                    <div key={item.step} className="flex items-start gap-3">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                        style={{ background: `${item.color}15`, color: item.color }}
                      >
                        {item.step}
                      </div>
                      <p className="text-gray-600 text-sm leading-relaxed">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Coluna direita: Ações */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 p-5 lg:sticky lg:top-28">
                <h3 className="text-gray-900 font-bold text-sm mb-4 flex items-center gap-2">
                  <i className="ri-settings-3-line" style={{ color: "#1B2A5E" }}></i>
                  Ações
                </h3>

                {/* Download */}
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap mb-3 transition-all disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #1B2A5E, #3BBFD4)", color: "white" }}
                >
                  {downloading ? (
                    <><i className="ri-loader-4-line animate-spin"></i> Baixando...</>
                  ) : (
                    <><i className="ri-download-line"></i> Baixar PDF</>
                  )}
                </button>

                {/* Abrir PDF */}
                <button
                  onClick={() => pdfUrl && window.open(pdfUrl, "_blank", "noopener,noreferrer")}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap mb-3 transition-all border border-gray-200 text-gray-700"
                  style={{ background: "#F9FAFB" }}
                >
                  <i className="ri-external-link-line"></i> Abrir PDF em nova aba
                </button>

                {/* Ir para Oportunidades */}
                <button
                  onClick={handleIrParaSistema}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap transition-all"
                  style={{
                    background: "rgba(232,160,32,0.12)",
                    color: "#92400E",
                    border: "1px solid rgba(232,160,32,0.30)",
                  }}
                >
                  <i className="ri-rocket-line"></i> Ir para Oportunidades
                </button>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={handleVoltar}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap transition-all"
                    style={{ background: "#F9FAFB", color: "#6B7280", border: "1px solid #E5E7EB" }}
                  >
                    <i className="ri-arrow-left-line"></i> Voltar e Editar
                  </button>
                  <p className="text-gray-400 text-xs text-center mt-3 leading-relaxed">
                    Ao voltar, todas as informações preenchidas serão preservadas.
                  </p>
                </div>
              </div>

              {/* Info privacidade */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <i className="ri-shield-check-line text-sm" style={{ color: "#22C55E" }}></i>
                  <p className="text-gray-700 font-semibold text-xs">Privacidade</p>
                </div>
                <p className="text-gray-400 text-xs leading-relaxed">
                  Seu currículo só fica visível para empresas e para o gabinete do vereador após clicar em
                  &quot;Salvar no Meu Perfil&quot;. Você pode removê-lo a qualquer momento.
                </p>
              </div>

              {/* Reload preview */}
              {pdfError && (
                <div className="bg-white rounded-2xl border border-gray-100 p-4">
                  <button
                    onClick={() => pdfUrl && renderPdf(pdfUrl)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap transition-all"
                    style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" }}
                  >
                    <i className="ri-refresh-line"></i> Recarregar pré-visualização
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}