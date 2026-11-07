import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, supabaseAnonKey, getEdgeFunctionUrl } from "@/lib/supabase";
import { getStoredUser, storeUser, type AuthUser } from "@/hooks/useAuth";
import { criarNotificacao } from "@/hooks/useNotifications";

interface CepData {
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
}

const JOB_TYPES = ["CLT", "PJ", "Freelancer", "Estágio", "Temporário", "Trabalho Remoto", "Aprendiz", "Outro"];
const MAX_FILE_MB = 5;

/**
 * Faz upload da foto de perfil via Edge Function upload-profile-photo.
 * A edge function usa SERVICE_ROLE_KEY, bypassando a necessidade de RLS policies.
 */
async function uploadProfilePhoto(file: File, userId: string): Promise<string | null> {
  console.log("[uploadPhoto] Iniciando upload via edge function, size:", file.size);

  try {
    const edgeFnUrl = getEdgeFunctionUrl("upload-profile-photo");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", userId);

    const fnRes = await fetch(edgeFnUrl, {
      method: "POST",
      headers: { apikey: supabaseAnonKey },
      body: formData,
    });

    if (!fnRes.ok) {
      const errBody = await fnRes.text().catch(() => "");
      console.error("[uploadPhoto] Edge function failed:", fnRes.status, errBody.slice(0, 200));
      return null;
    }

    const result = await fnRes.json();
    if (!result.success || !result.url) {
      console.error("[uploadPhoto] Edge function error:", result.error);
      return null;
    }

    console.log("[uploadPhoto] OK, publicUrl:", result.url);
    return result.url as string;
  } catch (err) {
    console.error("[uploadPhoto] Exception:", err);
    return null;
  }
}

export default function CompleteProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // CEP states
  const [cep, setCep] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [cepData, setCepData] = useState<CepData | null>(null);

  // Photo upload
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState("");

  // Common fields
  const [form, setForm] = useState({
    phone: "",
    neighborhood: "",
    street: "",
    number: "",
    complement: "",
    city: "Pelotas",
    state: "RS",
  });

  // Citizen-specific
  const [citizenFields, setCitizenFields] = useState({
    job_type: "",
    job_type_other: "",
    opportunities_seeking: "",
    professional_bio: "",
  });
  // NOVO: Campos de empregabilidade
  const [citizenEmployed, setCitizenEmployed] = useState<boolean | null>(null);
  const [citizenLooking, setCitizenLooking] = useState<boolean | null>(null);

  // NOVO: Forced password reset (admin editou email)
  const [isForcedReset, setIsForcedReset] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [passwordChanged, setPasswordChanged] = useState(false);

  // Company-specific
  const [companyFields, setCompanyFields] = useState({
    mission: "",
    values: "",
    about: "",
    looking_for_professional: "",
  });

  // Computed: cidadão quer oportunidades?
  const citizenWantsOpportunities = citizenLooking === true;

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      navigate("/auth");
      return;
    }
    setUser(stored);

    // Preencher dados existentes do perfil
    supabase.from("profiles").select("*").eq("id", stored.id).maybeSingle().then(({ data: prof }) => {
      if (!prof) {
        setLoading(false);
        return;
      }

      const step = (prof as any)?.onboarding_step as string | null;

      if (step === "email_reset") {
        setIsForcedReset(true);
      }

      if (step === null) {
        if (stored.role === "empresa") navigate("/sistema/painel/empresa", { replace: true });
        else if (stored.role === "assessor") navigate("/assessor/painel", { replace: true });
        else if (stored.role === "vereador") navigate("/vereador", { replace: true });
        else if (stored.role === "admin") navigate("/admin", { replace: true });
        else navigate("/cidadao", { replace: true });
        return;
      }

      setForm({
        phone: prof.phone ?? "",
        neighborhood: prof.neighborhood ?? "",
        street: prof.street ?? "",
        number: prof.number ?? "",
        complement: prof.complement ?? "",
        city: prof.city ?? "Pelotas",
        state: prof.state ?? "RS",
      });
      setCep(prof.cep ?? "");

      if (!isForcedReset && prof.avatar_url) {
        setPhotoPreview(prof.avatar_url);
      }

      if (stored.role === "citizen") {
        setCitizenFields({
          job_type: prof.job_type ?? "",
          job_type_other: prof.job_type_other ?? "",
          opportunities_seeking: prof.opportunities_seeking ?? "",
          professional_bio: prof.bio ?? "",
        });
        setCitizenEmployed(prof.is_employed ?? null);
        setCitizenLooking(prof.job_status !== "not_looking" ? true : false);
      } else if (stored.role === "empresa") {
        setCompanyFields({
          mission: prof.mission ?? "",
          values: prof.values ?? "",
          about: prof.about ?? "",
          looking_for_professional: prof.looking_for_professional ?? "",
        });
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleCepBlur = async () => {
    const raw = cep.replace(/\D/g, "");
    if (raw.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
      const data: CepData & { erro?: boolean } = await res.json();
      if (data.erro) {
        setError("CEP não encontrado. Digite o endereço manualmente.");
        setCepData(null);
      } else {
        setCepData(data);
        setForm((p) => ({
          ...p,
          street: data.logradouro ?? p.street,
          neighborhood: data.bairro ?? p.neighborhood,
          city: data.localidade ?? p.city,
          state: data.uf ?? p.state,
        }));
        setError("");
      }
    } catch {
      setError("Erro ao consultar CEP. Tente novamente.");
    } finally {
      setCepLoading(false);
    }
  };

  const formatCep = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 8);
    if (d.length <= 5) return d;
    return d.slice(0, 5) + "-" + d.slice(5);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoUploadError("");

    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`Arquivo muito grande. Máximo ${MAX_FILE_MB}MB.`);
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Formato inválido. Use JPG, PNG ou WEBP.");
      return;
    }

    setPhotoFile(file);
    setPhotoRemoved(false);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
    setError("");
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoRemoved(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSaveClick = async () => {
    if (!user) return;
    const e = { preventDefault: () => {} } as React.FormEvent;
    handleSubmit(e);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate citizen
    if (user.role === "citizen") {
      // Só exige job_type se o cidadão QUER oportunidades
      if (citizenWantsOpportunities && !citizenFields.job_type && !citizenFields.job_type_other) {
        setError("Selecione a modalidade de trabalho desejada.");
        return;
      }
    }

    const hasPhoto = photoFile || photoPreview || user.avatar_url;
    if (!hasPhoto) {
      setError("Adicione uma foto de perfil para continuar.");
      return;
    }

    if (isForcedReset) {
      if (!newPassword || newPassword.length < 6) {
        setError("Defina uma nova senha com pelo menos 6 caracteres.");
        return;
      }
      if (newPassword !== newPasswordConfirm) {
        setError("As senhas não coincidem. Verifique e tente novamente.");
        return;
      }
    }

    setSaving(true);
    setError("");
    setSuccess("");
    setPasswordChanged(false);

    let avatarUrl: string | null = isForcedReset ? "" : (user.avatar_url || "");
    setPhotoUploadError("");
    if (photoRemoved) {
      avatarUrl = null;
    } else if (photoFile) {
      setUploadingPhoto(true);
      const uploadedUrl = await uploadProfilePhoto(photoFile, user.id);
      setUploadingPhoto(false);
      if (uploadedUrl) {
        avatarUrl = uploadedUrl;
      } else {
        setPhotoUploadError("Falha ao enviar foto. Você pode tentar novamente depois no seu perfil.");
      }
    }

    if (isForcedReset && newPassword) {
      try {
        const { error: pwdErr } = await supabase.auth.updateUser({ password: newPassword });
        if (pwdErr) {
          setError("Erro ao definir nova senha. Tente novamente.");
          setSaving(false);
          return;
        }
        setPasswordChanged(true);
      } catch (pwdCatchErr) {
        setError("Erro ao definir nova senha. Tente novamente.");
        setSaving(false);
        return;
      }
    }

    try {
      const jobType = citizenFields.job_type === "Outro"
        ? citizenFields.job_type_other
        : citizenFields.job_type;

      const profilePayload: Record<string, unknown> = {
        registration_complete: true,
        onboarding_step: null,
        updated_at: new Date().toISOString(),
      };

      if (!isForcedReset) {
        profilePayload.phone = form.phone;
        profilePayload.neighborhood = form.neighborhood;
        profilePayload.cep = cep;
        profilePayload.street = form.street;
        profilePayload.number = form.number;
        profilePayload.complement = form.complement;
        profilePayload.city = form.city;
        profilePayload.state = form.state;

        if (user.role === "citizen") {
          // NOVA LÓGICA INTELIGENTE DE EMPREGABILIDADE
          profilePayload.is_employed = citizenEmployed;
          profilePayload.wants_opportunities = citizenWantsOpportunities;

          if (citizenWantsOpportunities) {
            profilePayload.job_status = "looking";
            profilePayload.job_type = jobType;
            profilePayload.opportunities_seeking = citizenFields.opportunities_seeking;
          } else {
            profilePayload.job_status = "not_looking";
            profilePayload.job_type = null;
            profilePayload.opportunities_seeking = null;
          }

          profilePayload.bio = citizenFields.professional_bio;
          profilePayload.employment_survey_completed = true;
        } else if (user.role === "empresa") {
          profilePayload.mission = companyFields.mission;
          profilePayload.values = companyFields.values;
          profilePayload.about = companyFields.about;
          profilePayload.looking_for_professional = companyFields.looking_for_professional;
        }
      }

      if (photoRemoved) {
        profilePayload.avatar_url = null;
        profilePayload.profile_photo = null;
      } else if (avatarUrl) {
        profilePayload.avatar_url = avatarUrl;
        profilePayload.profile_photo = avatarUrl;
      }

      const { error: updateErr } = await supabase.from("profiles").update(profilePayload).eq("id", user.id);

      if (updateErr) {
        setError("Erro ao salvar perfil. Tente novamente.");
        setSaving(false);
        return;
      }

      const updatedUser = {
        ...user,
        avatar_url: photoRemoved ? "" : (avatarUrl || user.avatar_url),
      };
      storeUser(updatedUser);

      if (user.role === "citizen") {
        try {
          await criarNotificacao(
            user.id,
            "cadastro_concluido",
            "Cadastro enviado para análise",
            "Seu cadastro foi concluído e está disponível para as empresas. As empresas podem analisar seu perfil e, se houver interesse, você receberá uma notificação de aprovação. A empresa entrará em contato em até 5 dias úteis após a aprovação. Fique atento às suas notificações!",
            undefined,
            "Sistema"
          );
        } catch (_) { /* não impede o fluxo */ }
      }

      try { sessionStorage.setItem(`ah_tour_welcome_${user.id}`, "1"); } catch (_) { /* ignora */ }

      setSuccess("Perfil salvo com sucesso!");
      setTimeout(() => {
        if (user.role === "empresa") navigate("/sistema/painel/empresa");
        else if (user.role === "assessor") navigate("/assessor/painel");
        else if (user.role === "vereador") navigate("/vereador");
        else if (user.role === "admin") navigate("/admin");
        else navigate("/cidadao");
      }, 1500);
    } catch (err) {
      console.error("[complete-profile] Erro ao salvar:", err);
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    if (!user) return;
    try { sessionStorage.setItem(`ah_tour_welcome_${user.id}`, "1"); } catch (_) { /* ignora */ }
    supabase.from("profiles").update({
      registration_complete: true,
      onboarding_step: null,
    }).eq("id", user.id).then(() => {
      if (user.role === "empresa") navigate("/sistema/painel/empresa");
      else if (user.role === "assessor") navigate("/assessor/painel");
      else if (user.role === "vereador") navigate("/vereador");
      else if (user.role === "admin") navigate("/admin");
      else navigate("/cidadao");
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0D1629" }}>
        <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "rgba(232,160,32,0.3)", borderTopColor: "#E8A020" }}></div>
      </div>
    );
  }

  if (!user) return null;

  const roleLabel = user.role === "empresa" ? "Empresa" : user.role === "assessor" ? "Assessor" : "Cidadão";
  const roleIcon = user.role === "empresa" ? "ri-building-line" : user.role === "assessor" ? "ri-user-star-line" : "ri-user-line";
  const roleColor = user.role === "empresa" ? "#3BBFD4" : "#E8A020";

  return (
    <div className="min-h-screen py-8 px-4" style={{ background: "#0D1629" }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(232,160,32,0.15)", border: "2px solid rgba(232,160,32,0.25)" }}>
            <i className={`${roleIcon} text-2xl`} style={{ color: "#E8A020" }}></i>
          </div>
          <h1 className="text-white font-extrabold text-2xl">{isForcedReset ? "Redefinição de Segurança" : "Complete seu Perfil"}</h1>
          <p className="text-white/50 text-sm mt-1">
            {isForcedReset
              ? "O administrador alterou seu email. Por segurança, defina uma foto de perfil e uma nova senha."
              : user.role === "citizen"
              ? "Conte-nos sobre seu perfil profissional para acessar as vagas"
              : user.role === "empresa"
              ? "Conte-nos sobre sua empresa para começar a publicar vagas"
              : "Envie sua foto e aguarde a aprovação do administrador"}
          </p>
          <div className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-full" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: roleColor }}></span>
            <span className="text-white/60 text-xs font-semibold">{roleLabel}</span>
          </div>
        </div>

        {/* Feedback */}
        {error && (
          <div className="mb-5 p-4 rounded-xl text-red-400 text-sm flex items-start gap-2" style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.20)" }}>
            <i className="ri-error-warning-line mt-0.5 shrink-0"></i>
            <span>{error}</span>
          </div>
        )}
        {photoUploadError && (
          <div className="mb-5 p-4 rounded-xl text-amber-400 text-sm flex items-start gap-2" style={{ background: "rgba(232,160,32,0.10)", border: "1px solid rgba(232,160,32,0.20)" }}>
            <i className="ri-image-line mt-0.5 shrink-0"></i>
            <span>{photoUploadError}</span>
          </div>
        )}
        {success && (
          <div className="mb-5 p-4 rounded-xl text-green-400 text-sm flex items-start gap-2" style={{ background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.20)" }}>
            <i className="ri-checkbox-circle-line mt-0.5 shrink-0"></i>
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="rounded-3xl p-6 md:p-8 space-y-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {/* ===== PHOTO UPLOAD ===== */}
          <div>
            <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-3">
              {user.role === "empresa" ? "Logo da Empresa" : "Foto de Perfil"}
              <span className="text-red-400 ml-1">*</span>
            </label>
            <div className="flex items-center gap-4">
              <div
                className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center cursor-pointer transition-all hover:opacity-80"
                style={{ background: "rgba(255,255,255,0.08)", border: "2px dashed rgba(255,255,255,0.15)" }}
                onClick={() => fileInputRef.current?.click()}
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover object-top" />
                ) : (photoRemoved || !user.avatar_url) ? (
                  <i className="ri-camera-line text-2xl text-white/25"></i>
                ) : (
                  <img src={user.avatar_url} alt="Foto atual" className="w-full h-full object-cover object-top" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-white/50 text-xs mb-1">
                  {photoPreview || photoFile ? "Clique para trocar" : photoRemoved ? "Clique para adicionar foto" : user.avatar_url ? "Clique para trocar" : "Clique para adicionar foto"}
                </p>
                <p className="text-white/25 text-xs">JPG, PNG ou WEBP · Máx. {MAX_FILE_MB}MB</p>
                {(photoPreview || photoFile) && (
                  <button type="button" onClick={handleRemovePhoto} className="text-red-400 text-xs font-semibold mt-1 hover:underline cursor-pointer">Remover foto</button>
                )}
                {!photoFile && !photoRemoved && user.avatar_url && (
                  <button type="button" onClick={() => { setPhotoPreview(null); setPhotoRemoved(true); }} className="text-red-400 text-xs font-semibold mt-1 hover:underline cursor-pointer ml-2">Remover foto atual</button>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoSelect} className="hidden" />
            </div>
            {photoFile && (
              <p className="text-white/30 text-xs mt-2 flex items-center gap-1">
                <i className="ri-image-line"></i>{photoFile.name} — será enviada ao salvar
              </p>
            )}
          </div>

          {/* ===== PHONE + CEP + ADDRESS ===== */}
          {!isForcedReset && (
            <>
              <div>
                <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Telefone</label>
                <input name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="(53) 9 0000-0000" className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }} />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">CEP</label>
                <div className="flex gap-2">
                  <input type="text" value={cep} onChange={(e) => { setCep(formatCep(e.target.value)); setCepData(null); }} onBlur={handleCepBlur} placeholder="96000-000" maxLength={9} className="flex-1 rounded-xl px-4 py-3 text-sm text-white focus:outline-none" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }} />
                  {cepLoading && (
                    <div className="w-10 h-10 flex items-center justify-center rounded-xl" style={{ background: "rgba(59,191,212,0.10)" }}>
                      <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "rgba(59,191,212,0.3)", borderTopColor: "#3BBFD4" }}></div>
                    </div>
                  )}
                </div>
                {cepData && (
                  <p className="text-green-400 text-xs mt-1.5 flex items-center gap-1">
                    <i className="ri-check-line"></i>{cepData.logradouro} — {cepData.bairro}, {cepData.localidade}/{cepData.uf}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Logradouro</label>
                  <input name="street" type="text" value={form.street} onChange={handleChange} placeholder="Rua, Avenida..." className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Número</label>
                  <input name="number" type="text" value={form.number} onChange={handleChange} placeholder="123" className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Complemento</label>
                  <input name="complement" type="text" value={form.complement} onChange={handleChange} placeholder="Apto, Bloco..." className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Bairro</label>
                  <input name="neighborhood" type="text" value={form.neighborhood} onChange={handleChange} placeholder="Bairro" className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Cidade / UF</label>
                  <input type="text" value={`${form.city}/${form.state}`} readOnly className="w-full rounded-xl px-4 py-3 text-sm text-white/50 focus:outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }} />
                </div>
              </div>
            </>
          )}

          {/* ===== CITIZEN-SPECIFIC FIELDS ===== */}
          {!isForcedReset && user.role === "citizen" && (
            <div className="pt-2 space-y-5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-white/40 text-xs font-bold uppercase tracking-wider">Perfil Profissional</p>

              {/* Empregabilidade */}
              <div className="p-4 rounded-xl" style={{ background: "rgba(232,160,32,0.08)", border: "1px solid rgba(232,160,32,0.20)" }}>
                <p className="text-white/80 text-xs font-bold mb-3 flex items-center gap-2">
                  <i className="ri-briefcase-4-line text-sm" style={{ color: "#E8A020" }}></i>
                  Situação Atual de Trabalho
                </p>
                <div className="mb-3">
                  <p className="text-white/40 text-xs font-semibold mb-2">Você está empregado atualmente?</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setCitizenEmployed(true)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${citizenEmployed === true ? "text-[#0D1629]" : "text-white/40"}`}
                      style={citizenEmployed === true ? { background: "linear-gradient(135deg, #22C55E, #4ade80)" } : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}>
                      Sim, empregado
                    </button>
                    <button type="button" onClick={() => setCitizenEmployed(false)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${citizenEmployed === false ? "text-[#0D1629]" : "text-white/40"}`}
                      style={citizenEmployed === false ? { background: "linear-gradient(135deg, #E8A020, #f5b94a)" } : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}>
                      Não, desempregado
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-white/40 text-xs font-semibold mb-2">Está buscando emprego?</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setCitizenLooking(true)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${citizenLooking === true ? "text-[#0D1629]" : "text-white/40"}`}
                      style={citizenLooking === true ? { background: "linear-gradient(135deg, #3BBFD4, #60d5e8)" } : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}>
                      Sim, quero oportunidades
                    </button>
                    <button type="button" onClick={() => setCitizenLooking(false)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${citizenLooking === false ? "text-white/70" : "text-white/40"}`}
                      style={citizenLooking === false ? { background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.18)" } : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}>
                      Não no momento
                    </button>
                  </div>
                </div>
                {citizenLooking === false && (
                  <p className="text-white/30 text-xs mt-3 flex items-start gap-1.5">
                    <i className="ri-information-line mt-0.5"></i>
                    O ambiente de vagas de emprego não será exibido no seu painel. Você ainda poderá acessar requerimentos, sugestões de projetos e mensagens com assessores.
                  </p>
                )}
              </div>

              {/* Modalidade — SÓ aparece se quer oportunidades */}
              {citizenWantsOpportunities && (
                <div>
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">
                    Modalidade de Trabalho Desejada <span className="text-red-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {JOB_TYPES.map((type) => (
                      <button key={type} type="button" onClick={() => setCitizenFields((p) => ({ ...p, job_type: type, job_type_other: type === "Outro" ? p.job_type_other : "" }))}
                        className={`px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${citizenFields.job_type === type ? "text-[#0D1629]" : "text-white/50"}`}
                        style={citizenFields.job_type === type
                          ? { background: "linear-gradient(135deg, #E8A020, #f5b94a)" }
                          : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}>
                        {type}
                      </button>
                    ))}
                  </div>
                  {citizenFields.job_type === "Outro" && (
                    <input type="text" value={citizenFields.job_type_other} onChange={(e) => setCitizenFields((p) => ({ ...p, job_type_other: e.target.value }))} placeholder="Especifique a modalidade..." className="mt-2 w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }} />
                  )}
                </div>
              )}

              {/* Oportunidades — SÓ aparece se quer oportunidades */}
              {citizenWantsOpportunities && (
                <div>
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">
                    Que tipo de oportunidade você procura?
                  </label>
                  <textarea value={citizenFields.opportunities_seeking} onChange={(e) => setCitizenFields((p) => ({ ...p, opportunities_seeking: e.target.value }))} rows={3} maxLength={500} placeholder="Ex: Busco uma vaga na área de vendas..." className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none resize-none" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }} />
                  <p className="text-white/25 text-xs mt-1 text-right">{citizenFields.opportunities_seeking.length}/500</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">
                  Apresentação Profissional
                </label>
                <textarea value={citizenFields.professional_bio} onChange={(e) => setCitizenFields((p) => ({ ...p, professional_bio: e.target.value }))} rows={4} maxLength={500} placeholder="Fale um pouco sobre sua trajetória profissional..." className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none resize-none" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }} />
                <p className="text-white/25 text-xs mt-1 text-right">{citizenFields.professional_bio.length}/500</p>
              </div>
            </div>
          )}

          {/* ===== COMPANY-SPECIFIC FIELDS ===== */}
          {!isForcedReset && user.role === "empresa" && (
            <div className="pt-2 space-y-5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-white/40 text-xs font-bold uppercase tracking-wider">Identidade da Empresa</p>
              <div>
                <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Missão da Empresa</label>
                <textarea value={companyFields.mission} onChange={(e) => setCompanyFields((p) => ({ ...p, mission: e.target.value }))} rows={2} maxLength={300} placeholder="Qual a missão da sua empresa?" className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none resize-none" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }} />
              </div>
              <div>
                <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Valores</label>
                <textarea value={companyFields.values} onChange={(e) => setCompanyFields((p) => ({ ...p, values: e.target.value }))} rows={2} maxLength={300} placeholder="Quais os valores que guiam sua empresa?" className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none resize-none" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }} />
              </div>
              <div>
                <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Sobre a Empresa</label>
                <textarea value={companyFields.about} onChange={(e) => setCompanyFields((p) => ({ ...p, about: e.target.value }))} rows={3} maxLength={500} placeholder="Conte um pouco sobre a história e atuação da empresa..." className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none resize-none" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }} />
                <p className="text-white/25 text-xs mt-1 text-right">{companyFields.about.length}/500</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">O que a empresa mais procura em um profissional?</label>
                <textarea value={companyFields.looking_for_professional} onChange={(e) => setCompanyFields((p) => ({ ...p, looking_for_professional: e.target.value }))} rows={3} maxLength={500} placeholder="Descreva o perfil profissional ideal..." className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none resize-none" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }} />
                <p className="text-white/25 text-xs mt-1 text-right">{companyFields.looking_for_professional.length}/500</p>
              </div>
            </div>
          )}

          {/* ===== ASSESSOR INFO ===== */}
          {!isForcedReset && user.role === "assessor" && (
            <div className="pt-2 p-4 rounded-xl" style={{ background: "rgba(232,160,32,0.08)", border: "1px solid rgba(232,160,32,0.20)" }}>
              <p className="text-white/60 text-sm flex items-start gap-2">
                <i className="ri-information-line mt-0.5" style={{ color: "#E8A020" }}></i>
                <span>Seu cadastro como assessor foi aprovado! Complete seus dados para acessar o painel do gabinete.</span>
              </p>
            </div>
          )}

          {/* ===== FORCED PASSWORD RESET ===== */}
          {isForcedReset && (
            <div className="pt-2 space-y-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="p-4 rounded-xl" style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.25)" }}>
                <p className="text-red-300 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-2"><i className="ri-lock-line"></i> Redefinição de Segurança</p>
                <p className="text-white/50 text-xs leading-relaxed">O administrador alterou seu email de acesso. Por segurança, você precisa definir uma <strong className="text-white/70">nova senha</strong> antes de continuar.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Nova Senha <span className="text-red-400">*</span></label>
                <input type="password" value={newPassword} onChange={(e) => { setNewPassword(e.target.value); setError(""); }} placeholder="Mínimo 6 caracteres" className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }} />
              </div>
              <div>
                <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Confirmar Nova Senha <span className="text-red-400">*</span></label>
                <input type="password" value={newPasswordConfirm} onChange={(e) => { setNewPasswordConfirm(e.target.value); setError(""); }} placeholder="Repita a senha" className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }} />
              </div>
              {passwordChanged && !error && (
                <div className="p-3 rounded-xl text-green-400 text-sm flex items-start gap-2" style={{ background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.20)" }}>
                  <i className="ri-checkbox-circle-line mt-0.5 shrink-0"></i><span>Senha atualizada com sucesso!</span>
                </div>
              )}
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-3 pt-3">
            {!isForcedReset && (
              <button type="button" onClick={handleSkip} className="flex-1 py-3.5 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.08)" }}>Pular por enquanto</button>
            )}
            <button type="button" onClick={handleSaveClick} disabled={saving || uploadingPhoto} className="flex-[2] py-3.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap flex items-center justify-center gap-2" style={{ background: (saving || uploadingPhoto) ? "rgba(232,160,32,0.4)" : "linear-gradient(135deg, #E8A020, #f5b94a)", color: "#0D1629", opacity: (saving || uploadingPhoto) ? 0.7 : 1 }}>
              {saving || uploadingPhoto ? (
                <><div className="w-4 h-4 border-2 border-[#0D1629]/30 border-t-[#0D1629] rounded-full animate-spin"></div> Salvando...</>
              ) : (
                <>Salvar e Continuar</>
              )}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.25) !important; }
        input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus,
        textarea:-webkit-autofill, textarea:-webkit-autofill:hover, textarea:-webkit-autofill:focus {
          -webkit-text-fill-color: #ffffff !important;
          -webkit-box-shadow: 0 0 0px 1000px rgba(13,22,41,0.8) inset !important;
        }
      `}</style>
    </div>
  );
}