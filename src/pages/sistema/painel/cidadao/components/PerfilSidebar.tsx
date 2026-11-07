import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";

interface Profile {
  id: string;
  full_name: string | null;
  display_name: string | null;
  phone: string | null;
  neighborhood: string | null;
  job_status: string | null;
  is_employed: boolean | null;
  employed_through_platform: boolean | null;
  curriculo_pdf: string | null;
  education: string | null;
  expertise: string | null;
  job_type: string | null;
  bio: string | null;
  avatar_url: string | null;
  profile_photo: string | null;
  is_service_provider: boolean | null;
  service_categories: string | null;
  service_description: string | null;
  portfolio_photos: string | null;
}

interface PerfilSidebarProps {
  profile: Profile | null;
  userId: string;
  candidaturas: number[];
  vagasTotal: number;
  onProfileUpdate: (p: Profile) => void;
  fallbackName?: string;
  fallbackAvatar?: string | null;
}

export default function PerfilSidebar({ profile, userId, candidaturas, vagasTotal, onProfileUpdate, fallbackName, fallbackAvatar }: PerfilSidebarProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [verCvError, setVerCvError] = useState("");
  const [uploadCvError, setUploadCvError] = useState("");
  const [uploadCvSuccess, setUploadCvSuccess] = useState("");
  const [uploadingCv, setUploadingCv] = useState(false);
  const [form, setForm] = useState({
    full_name: profile?.full_name ?? "",
    display_name: profile?.display_name ?? "",
    phone: profile?.phone ?? "",
    neighborhood: profile?.neighborhood ?? "",
    bio: profile?.bio ?? "",
    education: profile?.education ?? "",
    expertise: profile?.expertise ?? "",
    job_type: profile?.job_type ?? "",
    job_status: profile?.job_status ?? "looking",
    curriculo_pdf: profile?.curriculo_pdf ?? "",
    is_service_provider: profile?.is_service_provider ?? false,
    service_categories: profile?.service_categories ?? "",
    service_description: profile?.service_description ?? "",
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      curriculo_pdf: form.curriculo_pdf || null,
    };
    const { error } = await supabase.from("profiles").update(payload).eq("id", userId);
    setSaving(false);
    if (!error) {
      onProfileUpdate({ ...profile!, ...payload });
      setEditing(false);
    }
  };

  const displayName = profile?.display_name || profile?.full_name || fallbackName || "Cidadao";
  const avatarUrl = profile?.avatar_url || profile?.profile_photo || fallbackAvatar || null;

  const handleVerCurriculo = () => {
    setVerCvError("");
    const url = profile?.curriculo_pdf;
    if (!url) {
      setVerCvError("Nenhum curriculo encontrado.");
      return;
    }
    try {
      const w = window.open(url, "_blank", "noopener,noreferrer");
      if (!w || w.closed || typeof w.closed === "undefined") {
        window.location.href = url;
      }
    } catch {
      window.location.href = url;
    }
  };

  const handleExcluirCurriculo = async () => {
    if (!confirm("Tem certeza que deseja excluir seu curriculo do perfil? Esta acao nao pode ser desfeita.")) return;
    const { error } = await supabase.from("profiles").update({ curriculo_pdf: null, updated_at: new Date().toISOString() }).eq("id", userId);
    if (!error) {
      onProfileUpdate({ ...profile!, curriculo_pdf: null });
      setForm((p) => ({ ...p, curriculo_pdf: "" }));
    }
  };

  // Upload de PDF direto no modal
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadCvError("");
    setUploadCvSuccess("");
    setUploadingCv(true);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("userId", userId);

      const res = await fetch(`${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/upload-curriculo`, {
        method: "POST",
        headers: { apikey: import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY },
        body: uploadFormData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || `Erro ${res.status}`);
      }

      const url = data.url;
      if (!url) throw new Error("URL do curriculo nao retornada.");

      // Atualiza curriculo_pdf no perfil automaticamente
      const { error } = await supabase.from("profiles").update({ curriculo_pdf: url, updated_at: new Date().toISOString() }).eq("id", userId);
      if (error) throw new Error("Erro ao salvar curriculo no perfil: " + error.message);

      // Atualiza estado local
      setForm((p) => ({ ...p, curriculo_pdf: url }));
      onProfileUpdate({ ...profile!, curriculo_pdf: url });
      setUploadCvSuccess("Curriculo enviado e salvo com sucesso!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao enviar curriculo";
      setUploadCvError(msg);
    } finally {
      setUploadingCv(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (editing) {
    return (
      <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}>
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <h3 className="text-white font-bold text-sm">Editar Perfil</h3>
          <button onClick={() => setEditing(false)} className="text-white/40 hover:text-white/70 cursor-pointer">
            <i className="ri-close-line"></i>
          </button>
        </div>
        <form onSubmit={handleSave} className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1">Nome no Sistema</label>
            <input
              type="text"
              value={form.display_name}
              onChange={(e) => setForm((p) => ({ ...p, display_name: e.target.value }))}
              placeholder="Como quer ser chamado"
              className="w-full rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1">Nome Completo</label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
              className="w-full rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1">Area / Expertise</label>
            <input
              type="text"
              value={form.expertise}
              onChange={(e) => setForm((p) => ({ ...p, expertise: e.target.value }))}
              placeholder="Ex: Vendas, TI, Administracao"
              className="w-full rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1">Formacao</label>
            <input
              type="text"
              value={form.education}
              onChange={(e) => setForm((p) => ({ ...p, education: e.target.value }))}
              placeholder="Ex: Ensino medio, Tecnico..."
              className="w-full rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1">Bairro</label>
            <input
              type="text"
              value={form.neighborhood}
              onChange={(e) => setForm((p) => ({ ...p, neighborhood: e.target.value }))}
              className="w-full rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
            />
          </div>

          {/* Status no mercado — determina se aparece no feed de vagas */}
          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1">Status no mercado</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, job_status: "looking" }))}
                className={`py-2.5 rounded-xl text-xs font-semibold cursor-pointer whitespace-nowrap transition-all border ${form.job_status === "looking" ? "border-amber-400/40 bg-amber-500/15 text-amber-300" : "border-white/10 bg-white/5 text-white/40"}`}
              >
                <i className="ri-search-line mr-1"></i> Quero emprego
              </button>
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, job_status: "not_looking" }))}
                className={`py-2.5 rounded-xl text-xs font-semibold cursor-pointer whitespace-nowrap transition-all border ${form.job_status === "not_looking" ? "border-white/20 bg-white/8 text-white/60" : "border-white/10 bg-white/5 text-white/40"}`}
              >
                <i className="ri-pause-circle-line mr-1"></i> Não procuro
              </button>
            </div>
            <p className="text-white/20 text-xs mt-1.5">Selecione &quot;Quero emprego&quot; para participar do feed de vagas e oportunidades de trabalho.</p>
          </div>

          {/* Curriculo: upload direto + visualizar */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1">Curriculo PDF</label>

            {/* Input file oculto */}
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handleFileSelect}
            />

            {/* Mostrar link atual se existir */}
            {form.curriculo_pdf && (
              <div className="p-3 rounded-xl" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.18)" }}>
                <div className="flex items-center gap-2">
                  <i className="ri-file-pdf-line" style={{ color: "#22C55E" }}></i>
                  <span className="text-white/60 text-xs truncate flex-1">{form.curriculo_pdf.split("/").pop() || "curriculo.pdf"}</span>
                </div>
              </div>
            )}

            {/* Botoes de acao do curriculo */}
            <div className="flex gap-2">
              {form.curriculo_pdf && (
                <button
                  type="button"
                  onClick={() => {
                    try {
                      const w = window.open(form.curriculo_pdf, "_blank", "noopener,noreferrer");
                      if (!w || w.closed || typeof w.closed === "undefined") {
                        window.location.href = form.curriculo_pdf;
                      }
                    } catch {
                      window.location.href = form.curriculo_pdf;
                    }
                  }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap transition-colors hover:opacity-90"
                  style={{ background: "rgba(59,191,212,0.15)", color: "#3BBFD4", border: "1px solid rgba(59,191,212,0.25)" }}
                >
                  <i className="ri-eye-line mr-1"></i> Ver curriculo
                </button>
              )}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploadingCv}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap transition-colors hover:opacity-90 disabled:opacity-50"
                style={{ background: "rgba(232,160,32,0.15)", color: "#E8A020", border: "1px solid rgba(232,160,32,0.25)" }}
              >
                {uploadingCv ? (
                  <>
                    <i className="ri-loader-4-line animate-spin mr-1"></i> Enviando...
                  </>
                ) : (
                  <>
                    <i className="ri-upload-cloud-2-line mr-1"></i> {form.curriculo_pdf ? "Trocar PDF" : "Enviar PDF"}
                  </>
                )}
              </button>
            </div>

            {/* Mensagens de feedback */}
            {uploadCvError && (
              <p className="text-red-400 text-xs px-1">{uploadCvError}</p>
            )}
            {uploadCvSuccess && (
              <p className="text-green-400 text-xs px-1">{uploadCvSuccess}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1">Sobre mim</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
              rows={3}
              maxLength={500}
              className="w-full rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none resize-none"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
            />
          </div>
          {/* Prestador de Servicos */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setForm((p) => ({ ...p, is_service_provider: !p.is_service_provider }))}
              className={`w-full p-3 rounded-xl border transition-all text-left cursor-pointer ${form.is_service_provider ? "bg-green-500/20 border-green-400/40" : "bg-white/5 border-white/10"}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-6 rounded-full transition-all relative shrink-0 ${form.is_service_provider ? "bg-green-500" : "bg-white/20"}`}>
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${form.is_service_provider ? "left-5" : "left-1"}`}></div>
                </div>
                <span className={`text-xs font-semibold ${form.is_service_provider ? "text-green-400" : "text-white/40"}`}>
                  <i className="ri-tools-line mr-1"></i>Prestador de Servicos
                </span>
              </div>
            </button>
            {form.is_service_provider && (
              <>
                <div className="mt-2">
                  <input
                    type="text"
                    value={form.service_categories}
                    onChange={(e) => setForm((p) => ({ ...p, service_categories: e.target.value }))}
                    placeholder="Categorias: Encanador, Eletricista..."
                    className="w-full rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
                  />
                </div>
                <div className="mt-2">
                  <textarea
                    value={form.service_description}
                    onChange={(e) => setForm((p) => ({ ...p, service_description: e.target.value }))}
                    rows={2}
                    maxLength={300}
                    placeholder="Descricao dos seus servicos..."
                    className="w-full rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none resize-none"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
                  />
                </div>
              </>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setEditing(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)" }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer" style={{ background: "linear-gradient(135deg, #E8A020, #f5b94a)", color: "#0D1629" }}>
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Card de perfil */}
      <div className="rounded-2xl overflow-hidden relative" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
        {/* Banner */}
        <div className="h-16" style={{ background: "linear-gradient(135deg, #1B2A5E, #3BBFD4)" }}>
          <div className="absolute bottom-0 right-0 left-0 h-full opacity-10" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)", backgroundSize: "20px 20px" }}></div>
        </div>

        <div className="px-4 pb-4" style={{ position: "relative", zIndex: 2 }}>
          <div className="flex items-end justify-between -mt-6 mb-3">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-14 h-14 rounded-2xl object-cover object-top border-2"
                style={{ borderColor: "#0D1629", position: "relative", zIndex: 3 }}
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-[#0D1629] font-extrabold text-xl border-2" style={{ background: "linear-gradient(135deg, #E8A020, #f5b94a)", borderColor: "#0D1629", position: "relative", zIndex: 3 }}>
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer whitespace-nowrap" style={{ background: "rgba(59,191,212,0.15)", color: "#3BBFD4", border: "1px solid rgba(59,191,212,0.25)" }}>
              <i className="ri-pencil-line"></i> Editar
            </button>
          </div>
          <h3 className="text-white font-bold text-base">{displayName}</h3>
          {profile?.expertise && <p className="text-white/50 text-xs mt-0.5">{profile.expertise}</p>}

          {profile?.is_employed ? (
            <span className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(34,197,94,0.15)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.25)" }}>
              <i className="ri-briefcase-line"></i> Empregado(a)
            </span>
          ) : profile?.job_status === "not_looking" ? (
            <span className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.50)", border: "1px solid rgba(255,255,255,0.15)" }}>
              <i className="ri-pause-circle-line"></i> Fora do mercado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(232,160,32,0.15)", color: "#E8A020", border: "1px solid rgba(232,160,32,0.25)" }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#E8A020" }}></span>
              Buscando oportunidades
            </span>
          )}
        </div>

        <div className="px-4 pb-4 space-y-2">
          {profile?.neighborhood && (
            <div className="flex items-center gap-2 text-xs text-white/45">
              <i className="ri-map-pin-line" style={{ color: "#3BBFD4" }}></i>
              {profile.neighborhood}, Pelotas/RS
            </div>
          )}
          {profile?.education && (
            <div className="flex items-center gap-2 text-xs text-white/45">
              <i className="ri-graduation-cap-line" style={{ color: "#E8A020" }}></i>
              {profile.education}
            </div>
          )}
          {profile?.curriculo_pdf && (
            <div className="space-y-2 pt-1">
              <button
                onClick={handleVerCurriculo}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold cursor-pointer w-full transition-colors hover:opacity-90"
                style={{ background: "rgba(59,191,212,0.15)", color: "#3BBFD4", border: "1px solid rgba(59,191,212,0.25)" }}
              >
                <i className="ri-file-pdf-line"></i> Ver meu curriculo (PDF)
              </button>
              {verCvError && (
                <p className="text-red-400 text-xs px-1">{verCvError}</p>
              )}
              <div className="flex gap-1.5">
                <Link
                  to="/cidadao/curriculo/criar"
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors hover:opacity-90"
                  style={{ background: "rgba(59,191,212,0.12)", color: "#3BBFD4", border: "1px solid rgba(59,191,212,0.20)" }}
                >
                  <i className="ri-edit-line"></i> Trocar
                </Link>
                <button
                  onClick={handleExcluirCurriculo}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors hover:opacity-90"
                  style={{ background: "rgba(239,68,68,0.10)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.20)" }}
                >
                  <i className="ri-delete-bin-line"></i> Excluir
                </button>
              </div>
            </div>
          )}
          {!profile?.curriculo_pdf && (
            <Link
              to="/cidadao/curriculo/criar"
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold cursor-pointer w-full transition-colors hover:opacity-90"
              style={{ background: "rgba(232,160,32,0.15)", color: "#E8A020", border: "1px solid rgba(232,160,32,0.25)" }}
            >
              <i className="ri-file-add-line"></i> Criar curriculo
            </Link>
          )}
        </div>
      </div>

      {/* Stats rapidos */}
      <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-3">Minha atividade</p>
        <div className="space-y-2">
          {[
            { label: "Candidaturas enviadas", value: candidaturas.length, color: "#3BBFD4", icon: "ri-send-plane-line" },
            { label: "Vagas disponiveis", value: vagasTotal, color: "#E8A020", icon: "ri-briefcase-4-line" },
          ].map((s) => (
            <div key={s.label} className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs text-white/50">
                <i className={`${s.icon} text-xs`} style={{ color: s.color }}></i>
                {s.label}
              </span>
              <span className="font-bold text-sm" style={{ color: s.color }}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}