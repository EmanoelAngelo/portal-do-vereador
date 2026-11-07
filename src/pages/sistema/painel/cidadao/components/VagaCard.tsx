import { useState } from "react";
import { supabase } from "@/lib/supabase";
import ImageLightbox from "@/components/feature/ImageLightbox";
import { criarNotificacao, notificarRelevantes } from "@/hooks/useNotifications";
import VagaDetailModal from "@/components/feature/VagaDetailModal";
import { shareContent } from "@/lib/share";
import type { VagaPublica } from "@/components/feature/VagaCardPublica";

interface Vaga {
  id: number;
  title: string;
  area: string | null;
  type: string;
  location: string | null;
  salary: string | null;
  description: string | null;
  requirements: string | null;
  company_name: string | null;
  company_id?: string | null;
  company_avatar: string | null;
  image_url: string | null;
  created_at: string;
  status?: string;
}

interface VagaCardProps {
  vaga: Vaga;
  userId: string;
  candidaturas: number[];
  onCandidatou: (vagaId: number) => void;
  candidaturaCount?: number;
  userCurriculoUrl?: string | null;
}

const AREA_COLORS: Record<string, string> = {
  Administrativo: "#3BBFD4",
  Tecnologia: "#E8A020",
  "Comercial/Vendas": "#22C55E",
  Saúde: "#22C55E",
  Educação: "#A78BFA",
  "Construção Civil": "#F97316",
  Alimentação: "#EC4899",
  Logística: "#64748B",
  Varejo: "#3BBFD4",
  "Serviços Gerais": "#E8A020",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

// Compartilhamento via URL do site real
function shareVaga(vagaId: number, vagaTitle: string, companyName: string, location: string | null, platform: "whatsapp" | "instagram" | "share") {
  const url = `${window.location.origin}/sistema/vaga/${vagaId}`;
  const text = `Vaga: ${vagaTitle} — ${companyName} em ${location ?? "Pelotas/RS"}. Confira esta oportunidade!`;
  shareContent(platform, { title: vagaTitle, text, url });
}

export default function VagaCard({ vaga, userId, candidaturas, onCandidatou, candidaturaCount, userCurriculoUrl }: VagaCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");

  // Lightbox states
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState<string>("");

  const jaCandidata = candidaturas.includes(vaga.id);
  const areaColor = AREA_COLORS[vaga.area ?? ""] ?? "#3BBFD4";
  const hasCurriculo = !!userCurriculoUrl;
  const hasAvatar = !!vaga.company_avatar;

  // Montar VagaPublica para o VagaDetailModal
  const vagaPublica: VagaPublica = {
    ...vaga,
    status: vaga.status ?? "active",
  };

  const handleSubmitCandidatura = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!hasCurriculo) {
      setFormError("É necessário ter um currículo cadastrado no seu perfil para se candidatar.");
      return;
    }

    setLoading(true);

    const { data: insertData, error } = await supabase.from("candidaturas").insert({
      vaga_id: vaga.id,
      cidadao_id: userId,
      status: "pending",
      curriculo_url: userCurriculoUrl || null,
      message: message.trim() || null,
    }).select("id").maybeSingle();

    setLoading(false);

    if (!error) {
      const candidaturaId = (insertData as { id: number } | null)?.id;
      onCandidatou(vaga.id);
      setShowSuccess(true);
      setShowModal(false);
      setMessage("");
      setTimeout(() => setShowSuccess(false), 4000);

      if (vaga.company_id) {
        await criarNotificacao(
          vaga.company_id,
          "candidatura",
          "Nova candidatura recebida",
          `Um cidadão se candidatou à vaga "${vaga.title}"`,
          userId,
          undefined,
          candidaturaId ? String(candidaturaId) : String(vaga.id),
          "candidatura",
          { vagaCreatedAt: vaga.created_at }
        );
      }

      await criarNotificacao(
        userId,
        "candidatura_enviada",
        "Candidatura enviada",
        `Sua candidatura para "${vaga.title}" foi enviada com sucesso! A empresa analisará seu perfil e, se aprovado, entrará em contato em até 5 dias úteis.`,
        undefined,
        vaga.company_name ?? "Empresa",
        candidaturaId ? String(candidaturaId) : String(vaga.id),
        "candidatura"
      );

      const novoTotal = candidaturaCount !== undefined ? candidaturaCount + 1 : 1;
      await notificarRelevantes(
        "candidatura",
        `Nova candidatura #${novoTotal} — ${vaga.title}`,
        `Um cidadão acabou de se candidatar à vaga "${vaga.title}" de ${vaga.company_name ?? "Empresa"}. Esta é a ${novoTotal}ª candidatura para esta vaga. Acesse a aba de Vagas para ver todos os candidatos.`,
        {
          remetenteId: userId,
          referenciaId: String(vaga.id),
          referenciaTipo: "vaga",
          excluirIds: vaga.company_id ? [vaga.company_id] : [],
        }
      );
    } else {
      setFormError("Erro ao enviar candidatura. Tente novamente.");
    }
  };

  const openImageLightbox = (url: string, title: string) => {
    setLightboxImage(url);
    setLightboxTitle(title);
  };

  return (
    <>
      {/* Card estilo Instagram */}
      <div className="rounded-2xl overflow-hidden transition-all" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
        {/* Header: Avatar empresa + nome + tempo */}
        <div className="flex items-center gap-3 p-4 pb-3">
          <button
            onClick={() => hasAvatar && openImageLightbox(vaga.company_avatar!, vaga.company_name ?? "Empresa")}
            className="w-10 h-10 rounded-full overflow-hidden shrink-0 flex items-center justify-center cursor-pointer border border-white/10"
            style={{ background: hasAvatar ? "transparent" : `${areaColor}25` }}
            title={hasAvatar ? "Clique para ver logo" : ""}
          >
            {hasAvatar ? (
              <img src={vaga.company_avatar!} alt={vaga.company_name ?? "Empresa"} className="w-full h-full object-cover object-top" />
            ) : (
              <i className="ri-building-2-line text-sm" style={{ color: areaColor }}></i>
            )}
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">{vaga.company_name ?? "Empresa"}</p>
            <p className="text-white/35 text-xs">{timeAgo(vaga.created_at)}</p>
          </div>
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
            style={{ background: `${areaColor}20`, color: areaColor, border: `1px solid ${areaColor}35` }}
          >
            {vaga.area ?? "Geral"}
          </span>
        </div>

        {/* Foto da vaga — 16:9 */}
        {vaga.image_url ? (
          <button
            onClick={() => openImageLightbox(vaga.image_url!, vaga.title)}
            className="w-full aspect-[16/9] overflow-hidden cursor-pointer block"
            title="Clique para ver em tamanho maior"
          >
            <img src={vaga.image_url} alt={vaga.title} className="w-full h-full object-cover object-top transition-transform hover:scale-105" />
          </button>
        ) : (
          <div className="w-full aspect-[16/9] flex items-center justify-center" style={{ background: "linear-gradient(135deg, #1B2A5E, #3BBFD4)" }}>
            <div className="text-center">
              <i className="ri-briefcase-4-line text-4xl text-white/20 mb-2 block"></i>
              <p className="text-white/30 text-sm font-semibold">{vaga.title}</p>
            </div>
          </div>
        )}

        {/* Action bar — estilo Instagram */}
        <div className="flex items-center gap-1 px-4 py-3 flex-wrap">
          {showSuccess ? (
            <div className="flex items-center gap-2 text-green-400 text-sm font-semibold">
              <i className="ri-checkbox-circle-fill"></i> Candidatura enviada!
            </div>
          ) : jaCandidata ? (
            <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#3BBFD4" }}>
              <i className="ri-checkbox-circle-line"></i> Já candidatado
            </div>
          ) : (
            <button
              onClick={() => setShowModal(true)}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #1B2A5E, #3BBFD4)", color: "white" }}
            >
              <i className="ri-heart-3-line"></i> Candidatar-se
            </button>
          )}
          <button
            onClick={() => setShowDetails(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer whitespace-nowrap"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            <i className="ri-information-line"></i> Saiba Mais
          </button>

          {/* Botões de compartilhamento */}
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => shareVaga(vaga.id, vaga.title, vaga.company_name ?? "Empresa", vaga.location, "instagram")}
              className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-colors hover:bg-white/10"
              style={{ color: "#E1306C" }}
              title="Compartilhar no Instagram"
            >
              <i className="ri-instagram-line text-sm"></i>
            </button>
            <button
              onClick={() => shareVaga(vaga.id, vaga.title, vaga.company_name ?? "Empresa", vaga.location, "whatsapp")}
              className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-colors hover:bg-white/10"
              style={{ color: "#25D366" }}
              title="Compartilhar no WhatsApp"
            >
              <i className="ri-whatsapp-line text-sm"></i>
            </button>
            <button
              onClick={() => shareVaga(vaga.id, vaga.title, vaga.company_name ?? "Empresa", vaga.location, "share")}
              className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-colors hover:bg-white/10"
              style={{ color: "rgba(255,255,255,0.45)" }}
              title="Compartilhar"
            >
              <i className="ri-share-forward-line text-sm"></i>
            </button>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="px-4 pb-4">
          <h3 className="text-white font-extrabold text-lg mb-2 leading-tight">{vaga.title}</h3>

          <div className="flex flex-wrap gap-2 mb-3">
            <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full" style={{ background: "rgba(59,191,212,0.12)", color: "#3BBFD4", border: "1px solid rgba(59,191,212,0.25)" }}>
              <i className="ri-file-text-line"></i>{vaga.type}
            </span>
            <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full" style={{ background: "rgba(232,160,32,0.12)", color: "#E8A020", border: "1px solid rgba(232,160,32,0.25)" }}>
              <i className="ri-map-pin-line"></i>{vaga.location ?? "Pelotas/RS"}
            </span>
            {vaga.salary && (
              <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full" style={{ background: "rgba(34,197,94,0.12)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.25)" }}>
                <i className="ri-money-dollar-circle-line"></i>{vaga.salary}
              </span>
            )}
            {candidaturaCount !== undefined && candidaturaCount > 0 && (
              <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <i className="ri-user-received-line"></i>{candidaturaCount} candidatura{candidaturaCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {vaga.description && (
            <div>
              <p className="text-white/60 text-sm leading-relaxed">
                {expanded ? vaga.description : vaga.description.slice(0, 120) + (vaga.description.length > 120 ? "..." : "")}
              </p>
              {vaga.description.length > 120 && (
                <button onClick={() => setExpanded((v) => !v)} className="text-xs font-semibold mt-1 cursor-pointer" style={{ color: "#3BBFD4" }}>
                  {expanded ? "ver menos" : "ver mais"}
                </button>
              )}
            </div>
          )}

          {expanded && vaga.requirements && (
            <div className="mt-3 p-3 rounded-xl" style={{ background: "rgba(59,191,212,0.08)", border: "1px solid rgba(59,191,212,0.15)" }}>
              <p className="text-xs font-bold mb-1" style={{ color: "#3BBFD4" }}>Requisitos</p>
              <p className="text-white/55 text-xs leading-relaxed">{vaga.requirements}</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de candidatura */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.70)" }}>
          <div className="w-full max-w-lg rounded-3xl overflow-hidden" style={{ background: "#0D1629", border: "1px solid rgba(59,191,212,0.30)" }}>
            <div className="p-5 border-b flex items-center gap-3" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(59,191,212,0.06)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${areaColor}25` }}>
                <i className="ri-send-plane-line text-xl" style={{ color: areaColor }}></i>
              </div>
              <div className="flex-1">
                <p className="text-white font-bold text-sm">Candidatar-se à vaga</p>
                <p className="text-white/40 text-xs truncate">{vaga.title} · {vaga.company_name}</p>
              </div>
              <button onClick={() => { setShowModal(false); setFormError(""); }} className="w-8 h-8 flex items-center justify-center rounded-full text-white/40 hover:text-white cursor-pointer" style={{ background: "rgba(255,255,255,0.06)" }}>
                <i className="ri-close-line"></i>
              </button>
            </div>

            <form onSubmit={handleSubmitCandidatura} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl text-red-400 text-sm flex items-center gap-2" style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.20)" }}>
                  <i className="ri-error-warning-line shrink-0"></i>{formError}
                </div>
              )}

              <div className="p-4 rounded-xl" style={{ background: hasCurriculo ? "rgba(34,197,94,0.08)" : "rgba(232,160,32,0.08)", border: hasCurriculo ? "1px solid rgba(34,197,94,0.18)" : "1px solid rgba(232,160,32,0.20)" }}>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: hasCurriculo ? "rgba(34,197,94,0.20)" : "rgba(232,160,32,0.20)" }}>
                    <i className={`${hasCurriculo ? "ri-file-user-line" : "ri-file-warning-line"} text-sm`} style={{ color: hasCurriculo ? "#22C55E" : "#E8A020" }}></i>
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-bold text-sm">{hasCurriculo ? "Currículo do perfil" : "Currículo necessário"}</p>
                    <p className="text-white/50 text-xs mt-1">
                      {hasCurriculo
                        ? "Seu currículo CLT cadastrado no perfil será enviado automaticamente para a empresa."
                        : "É necessário ter um currículo cadastrado no seu perfil. Acesse a Área do Cidadão para cadastrar."}
                    </p>
                  </div>
                  {hasCurriculo && (
                    <i className="ri-checkbox-circle-fill text-lg" style={{ color: "#22C55E" }}></i>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5">
                  Mensagem para a empresa <span className="text-white/25 font-normal normal-case">(opcional)</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  maxLength={300}
                  placeholder="Apresente-se brevemente ou destaque sua experiência..."
                  className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none resize-none"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
                />
                <p className="text-white/25 text-xs mt-1 text-right">{message.length}/300</p>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowModal(false); setFormError(""); }} className="flex-1 py-3 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.10)" }}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !hasCurriculo}
                  className="flex-[2] flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap disabled:opacity-60"
                  style={{ background: hasCurriculo ? "linear-gradient(135deg, #1B2A5E, #3BBFD4)" : "rgba(255,255,255,0.08)", color: hasCurriculo ? "white" : "rgba(255,255,255,0.30)" }}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }}></div>
                      Enviando...
                    </>
                  ) : hasCurriculo ? (
                    <><i className="ri-send-plane-line"></i> Enviar candidatura</>
                  ) : (
                    <><i className="ri-lock-line"></i> Currículo necessário</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de detalhes da vaga */}
      <VagaDetailModal
        vaga={showDetails ? vagaPublica : null}
        onClose={() => setShowDetails(false)}
      />

      {/* Lightbox para imagens */}
      <ImageLightbox
        imageUrl={lightboxImage}
        title={lightboxTitle}
        isOpen={!!lightboxImage}
        onClose={() => setLightboxImage(null)}
      />
    </>
  );
}