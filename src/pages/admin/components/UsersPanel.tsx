import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import ProfilePhotoLightbox from "@/components/feature/ProfilePhotoLightbox";
import { notificarRelevantes } from "@/hooks/useNotifications";

interface UserProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  company_name: string | null;
  neighborhood: string | null;
  created_at: string;
  updated_at: string;
  avatar_url: string | null;
  profile_photo: string | null;
  bio: string | null;
  education: string | null;
  expertise: string | null;
  job_type: string | null;
  job_status: string | null;
  cpf: string | null;
  responsible_name: string | null;
  cnpj: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  city: string | null;
  state: string | null;
  cep: string | null;
  assessor_cargo: string | null;
  approved_at: string | null;
  status: string | null;
  registration_complete: boolean | null;
}

interface UserDetails {
  email: string | null;
  last_sign_in_at: string | null;
  auth_created_at: string | null;
  confirmed_at: string | null;
}

const ROLES = [
  { value: "citizen", label: "Cidadão", icon: "ri-user-line", color: "#1B2A5E", bg: "#EEF1FB" },
  { value: "empresa", label: "Empresa", icon: "ri-building-line", color: "#0D7A5F", bg: "#E6F4F0" },
  { value: "assessor", label: "Assessor", icon: "ri-user-star-line", color: "#3BBFD4", bg: "#E6F7FA" },
  { value: "vereador", label: "Vereador", icon: "ri-government-line", color: "#E8A020", bg: "#FEF3DC" },
  { value: "admin", label: "Admin", icon: "ri-shield-user-line", color: "#DC2626", bg: "#FEF2F2" },
];

export default function UsersPanel() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [filterRole, setFilterRole] = useState("all");
  const [detailUser, setDetailUser] = useState<UserProfile | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState({ type: "", text: "" });
  const [form, setForm] = useState({
    name: "", email: "", phone: "", password: "", role: "citizen",
    company_name: "", neighborhood: "",
  });
  const [photoLightbox, setPhotoLightbox] = useState<{ url: string | null; name: string | null }>({ url: null, name: null });

  // Gestão de email
  const [emailManaging, setEmailManaging] = useState<string | null>(null);
  const [emailEditMode, setEmailEditMode] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMsg, setEmailMsg] = useState({ type: "", text: "" });
  const [managedEmail, setManagedEmail] = useState<{ email: string | null; confirmed_at: string | null; emails_notificacao: string | null; is_default_user?: boolean } | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  const loadEmailInfo = async (uid: string) => {
    setEmailLoading(true);
    setEmailMsg({ type: "", text: "" });
    try {
      const { data, error } = await supabase.functions.invoke("admin-manage-user-email", {
        body: { user_id: uid, action: "get" },
      });
      if (!error && data?.success) {
        setManagedEmail({
          email: data.email ?? null,
          confirmed_at: data.confirmed_at ?? null,
          emails_notificacao: data.emails_notificacao ?? null,
          is_default_user: data.is_default_user ?? false,
        });
      } else {
        setEmailMsg({ type: "error", text: data?.error || "Erro ao buscar email" });
      }
    } catch (_) {
      setEmailMsg({ type: "error", text: "Erro ao buscar informações de email" });
    }
    setEmailLoading(false);
  };

  const handleSaveEmail = async () => {
    if (!emailManaging || !newEmail.includes("@")) {
      setEmailMsg({ type: "error", text: "Insira um email válido" });
      return;
    }
    setEmailSaving(true);
    setEmailMsg({ type: "", text: "" });
    try {
      const { data, error } = await supabase.functions.invoke("admin-manage-user-email", {
        body: { user_id: emailManaging, email: newEmail.trim(), action: "update" },
      });
      if (!error && data?.success) {
        setEmailMsg({ type: "success", text: data.message || "Email atualizado com sucesso!" });
        setManagedEmail({ email: data.email, confirmed_at: new Date().toISOString(), emails_notificacao: managedEmail?.emails_notificacao ?? null });
        setEmailEditMode(false);
        setNewEmail("");
        if (userDetails) {
          setUserDetails({ ...userDetails, email: data.email, confirmed_at: new Date().toISOString() });
        }
      } else {
        setEmailMsg({ type: "error", text: data?.error || error?.message || "Erro ao atualizar email" });
      }
    } catch (err) {
      setEmailMsg({ type: "error", text: err instanceof Error ? err.message : "Erro ao salvar" });
    }
    setEmailSaving(false);
  };

  const handleRemoveEmail = async () => {
    if (!emailManaging) return;
    setEmailSaving(true);
    setEmailMsg({ type: "", text: "" });
    try {
      const { data, error } = await supabase.functions.invoke("admin-manage-user-email", {
        body: { user_id: emailManaging, action: "remove" },
      });
      if (!error && data?.success) {
        setEmailMsg({ type: "success", text: data.message || "Email removido com sucesso!" });
        setManagedEmail({ email: null, confirmed_at: null, emails_notificacao: null });
        setEmailEditMode(false);
        setNewEmail("");
        if (userDetails) {
          setUserDetails({ ...userDetails, email: null, confirmed_at: null });
        }
      } else {
        setEmailMsg({ type: "error", text: data?.error || error?.message || "Erro ao remover email" });
      }
    } catch (err) {
      setEmailMsg({ type: "error", text: err instanceof Error ? err.message : "Erro ao remover" });
    }
    setEmailSaving(false);
  };

  const loadUsers = async () => {
    let q = supabase
      .from("profiles")
      .select("id, full_name, phone, role, company_name, neighborhood, created_at, updated_at, avatar_url, profile_photo, bio, education, expertise, job_type, job_status, cpf, responsible_name, cnpj, street, number, complement, city, state, cep, assessor_cargo, approved_at, status, registration_complete")
      .order("created_at", { ascending: false });
    if (filterRole !== "all") q = q.eq("role", filterRole);
    const { data } = await q;
    setUsers((data as UserProfile[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, [filterRole]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || form.password.length < 6) {
      setMsg({ type: "error", text: "Preencha todos os campos. Senha mínima: 6 caracteres." });
      return;
    }
    setSaving(true);
    setMsg({ type: "", text: "" });

    const { data, error } = await supabase.functions.invoke("admin-create-user", {
      body: {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        full_name: form.name.trim(),
        role: form.role,
        phone: form.phone || undefined,
        company_name: form.company_name || undefined,
        neighborhood: form.neighborhood || undefined,
      },
    });

    if (error || !data?.success) {
      setMsg({ type: "error", text: data?.error ?? error?.message ?? "Erro ao criar usuário." });
      setSaving(false);
      return;
    }

    setMsg({ type: "success", text: data.message ?? `Usuário "${form.name}" criado com sucesso!` });
    setForm({ name: "", email: "", phone: "", password: "", role: "citizen", company_name: "", neighborhood: "" });
    setSaving(false);
    await loadUsers();

    // 🔥 Fallback client-side: notificarRelevantes garante que vereador + assessores saibam
    const roleLabel: Record<string, string> = {
      citizen: "cidadão",
      empresa: "empresa",
      assessor: "assessor",
      vereador: "vereador",
      admin: "admin",
    };
    notificarRelevantes(
      "novo_usuario",
      `Novo ${roleLabel[form.role] || form.role} cadastrado`,
      `${form.name.trim()} foi cadastrado como ${roleLabel[form.role] || form.role} no sistema.`,
      {
        remetenteNome: "Administrador",
        referenciaTipo: "perfil",
        referenciaId: data?.user_id || undefined,
      }
    ).catch(() => {});

    setTimeout(() => { setShowForm(false); setMsg({ type: "", text: "" }); }, 2000);
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    const expected = deleteTarget.full_name?.trim().toLowerCase() ?? "";
    const actual = deleteConfirm.trim().toLowerCase();
    if (actual !== expected) {
      setDeleteMsg({ type: "error", text: "Digite o nome exato do usuário para confirmar." });
      return;
    }
    setDeleting(true);
    setDeleteMsg({ type: "", text: "" });

    try {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { user_id: deleteTarget.id },
      });

      if (error || !data?.success) {
        throw new Error(data?.error ?? error?.message ?? "Erro ao excluir");
      }

      setDeleteMsg({ type: "success", text: data.message ?? "Usuário excluído com sucesso!" });
      await loadUsers();
      setTimeout(() => {
        setDeleteTarget(null);
        setDeleteConfirm("");
        setDeleteMsg({ type: "", text: "" });
      }, 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setDeleteMsg({ type: "error", text: msg });
    } finally {
      setDeleting(false);
    }
  };

  const openDetail = async (u: UserProfile) => {
    setDetailUser(u);
    setDetailLoading(true);
    setUserDetails(null);
    setEmailManaging(u.id);
    setEmailEditMode(false);
    setNewEmail("");
    setEmailMsg({ type: "", text: "" });
    setManagedEmail(null);
    try {
      const { data, error } = await supabase.functions.invoke("get-user-details", {
        body: { user_id: u.id },
      });
      if (!error && data?.success) {
        setUserDetails({
          email: data.user.email ?? null,
          last_sign_in_at: data.user.last_sign_in_at ?? null,
          auth_created_at: data.user.created_at ?? null,
          confirmed_at: data.user.confirmed_at ?? null,
        });
      }
    } catch (_) { /* silent */ }
    setDetailLoading(false);
    // Carregar info de email em paralelo
    loadEmailInfo(u.id);
  };

  const roleConfig = (role: string) => ROLES.find((r) => r.value === role) ?? ROLES[0];

  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" });
  };

  const formatDateTime = (iso: string | null | undefined) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo",
    });
  };

  const counts = ROLES.map((r) => ({ ...r, count: users.filter((u) => u.role === r.value).length }));

  const renderAvatar = (u: UserProfile, size: "sm" | "lg" = "sm") => {
    const photoPath = u.profile_photo || u.avatar_url;
    const rc = roleConfig(u.role);
    const dims = size === "lg" ? "w-20 h-20" : "w-9 h-9";
    const iconSize = size === "lg" ? "text-3xl" : "text-sm";

    if (photoPath) {
      let url = photoPath;
      if (!photoPath.startsWith("http")) {
        const bucket = u.profile_photo ? "profile-photos" : "avatars";
        const { data } = supabase.storage.from(bucket).getPublicUrl(photoPath);
        url = data?.publicUrl ?? photoPath;
      }
      return (
        <div className={`${dims} rounded-full overflow-hidden shrink-0 border-2`} style={{ borderColor: rc.color }}>
          <img src={url} alt={u.full_name ?? ""} className="w-full h-full object-cover object-top" />
        </div>
      );
    }

    return (
      <div className={`${dims} rounded-full shrink-0 border-2 flex items-center justify-center`} style={{ borderColor: rc.color, background: rc.bg }}>
        <span className={`font-bold ${iconSize}`} style={{ color: rc.color }}>
          {(u.full_name ?? u.company_name ?? "?").charAt(0).toUpperCase()}
        </span>
      </div>
    );
  };

  const openDeleteConfirm = (u: UserProfile) => {
    setDeleteTarget(u);
    setDeleteConfirm("");
    setDeleteMsg({ type: "", text: "" });
  };

  return (
    <div>
      {/* Filtros + stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
          <button onClick={() => setFilterRole("all")}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 leading-none ${filterRole === "all" ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
            Todos
          </button>
          {ROLES.map((r) => (
            <button key={r.value} onClick={() => setFilterRole(r.value)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 leading-none ${filterRole === r.value ? "text-white" : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"}`}
              style={filterRole === r.value ? { background: r.color } : {}}>
              {r.label}
            </button>
          ))}
        </div>
        <button onClick={() => { setShowForm(true); setMsg({ type: "", text: "" }); }}
          className="flex items-center gap-2 px-3.5 py-2 text-white text-xs font-bold rounded-xl cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-auto"
          style={{ background: "linear-gradient(135deg, #0369A1, #0EA5E9)" }}>
          <i className="ri-user-add-line"></i> Novo Usuário
        </button>
      </div>

      {/* Cards contagem */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 no-scrollbar sm:grid sm:grid-cols-5">
        {counts.map((r) => (
          <div key={r.value} className="bg-white rounded-xl p-3 border border-gray-100 text-center cursor-pointer hover:border-gray-200 transition-colors shrink-0 min-w-[80px] sm:min-w-0" onClick={() => setFilterRole(r.value)}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center mx-auto mb-1.5" style={{ background: r.bg }}>
              <i className={`${r.icon} text-xs`} style={{ color: r.color }}></i>
            </div>
            <p className="text-lg font-extrabold leading-none" style={{ color: r.color }}>{r.count}</p>
            <p className="text-gray-500 text-xs mt-0.5">{r.label}</p>
          </div>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(3,105,161,0.3)", borderTopColor: "#0369A1" }}></div>
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
          <i className="ri-group-line text-gray-200 text-4xl mb-3 block"></i>
          <p className="text-gray-400 font-semibold">Nenhum usuário encontrado</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 mb-6">
          <div className="divide-y divide-gray-50">
            {users.map((u) => {
              const rc = roleConfig(u.role);
              const isPending = u.role === "assessor" && u.status === "pending";
              return (
                <div key={u.id} className="px-3 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 overflow-hidden">
                  {/* Linha 1: Avatar + Nome + Badge */}
                  <div className="flex items-center gap-2.5 mb-1">
                    <div className="shrink-0">{renderAvatar(u, "sm")}</div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                        <p className="text-gray-900 font-semibold text-[13px] truncate min-w-0 leading-tight">{u.full_name ?? u.company_name ?? "—"}</p>
                        {isPending && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 whitespace-nowrap shrink-0 leading-none">
                            Pend.
                          </span>
                        )}
                      </div>
                      {u.phone && <p className="text-gray-400 text-[11px] truncate leading-tight">{u.phone}</p>}
                    </div>
                  </div>

                  {/* Linha 2: Botões de ação */}
                  <div className="flex flex-col sm:flex-row gap-2 mt-2">
                    <button
                      onClick={() => openDetail(u)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap"
                      title="Saiba Mais"
                    >
                      <i className="ri-information-line text-sm"></i>
                      Saiba Mais
                    </button>

                    <button
                      onClick={() => openDeleteConfirm(u)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap"
                      title="Excluir usuário"
                    >
                      <i className="ri-delete-bin-line text-sm"></i>
                      Excluir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============ MODAL SAIBA MAIS V2 ============ */}
      {detailUser && (() => {
        const rc = roleConfig(detailUser.role);
        const isAssessor = detailUser.role === "assessor";
        const isCitizen = detailUser.role === "citizen";
        const isEmpresa = detailUser.role === "empresa";
        const cargoLabel = detailUser.assessor_cargo ?? "Não informado";
        const aprovado = detailUser.approved_at;
        const pending = detailUser.role === "assessor" && detailUser.status === "pending";
        const photoUrl = (() => {
          const photoPath = detailUser.profile_photo || detailUser.avatar_url;
          if (!photoPath) return null;
          if (photoPath.startsWith("http")) return photoPath;
          const bucket = detailUser.profile_photo ? "profile-photos" : "avatars";
          const { data } = supabase.storage.from(bucket).getPublicUrl(photoPath);
          return data?.publicUrl ?? photoPath;
        })();

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="absolute inset-0 cursor-pointer"
              style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
              onClick={() => { setDetailUser(null); setUserDetails(null); }}
            />

            {/* Modal container */}
            <div className="relative w-full max-w-xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col bg-white shadow-2xl">
              {/* Header com cor do papel */}
              <div className="relative h-28 shrink-0" style={{ background: rc.bg }}>
                <div className="absolute inset-0 opacity-50" style={{ background: `linear-gradient(135deg, ${rc.color}20, ${rc.color}05)` }} />
                <button
                  onClick={() => { setDetailUser(null); setUserDetails(null); }}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-colors hover:bg-black/10"
                >
                  <i className="ri-close-line text-gray-500"></i>
                </button>
                <span
                  className="absolute bottom-4 right-4 inline-flex text-xs font-bold px-3 py-1 rounded-full"
                  style={{ color: rc.color, background: "white", border: `1px solid ${rc.color}30` }}
                >
                  {rc.label}{pending ? " · Pendente" : ""}
                </span>
              </div>

              {/* Avatar — absolutamente posicionado */}
              <div className="absolute top-[88px] left-5 z-20">
                {photoUrl ? (
                  <button
                    onClick={() => setPhotoLightbox({ url: photoUrl, name: detailUser.full_name ?? detailUser.company_name ?? "Usuário" })}
                    className="w-20 h-20 rounded-2xl overflow-hidden border-4 block cursor-pointer hover:scale-105 transition-transform shrink-0 bg-white"
                    style={{ borderColor: "white", boxShadow: "0 4px 12px rgba(0,0,0,0.10)" }}
                  >
                    <img
                      src={photoUrl}
                      alt={detailUser.full_name ?? ""}
                      className="w-full h-full object-cover object-top"
                    />
                  </button>
                ) : (
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-extrabold border-4 shrink-0 bg-white"
                    style={{ color: rc.color, borderColor: "white", boxShadow: "0 4px 12px rgba(0,0,0,0.10)" }}
                  >
                    {(detailUser.full_name ?? detailUser.company_name ?? "?").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto px-5 pt-14 pb-6">
                {/* Name row */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-20 shrink-0"></div>
                  <div className="min-w-0">
                    <h2 className="text-gray-900 font-extrabold text-lg leading-tight">
                      {detailUser.full_name ?? detailUser.company_name ?? "—"}
                    </h2>
                    {isAssessor && detailUser.assessor_cargo && (
                      <p className="text-sm font-semibold mt-1" style={{ color: rc.color }}>{detailUser.assessor_cargo}</p>
                    )}
                    {pending && (
                      <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        Aguardando aprovação
                      </p>
                    )}
                  </div>
                </div>

                {/* Seção: Dados da Conta */}
                <div className="mb-5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
                    <i className="ri-account-circle-line text-sm" style={{ color: rc.color }}></i> Dados da Conta
                  </h4>
                  <div className="bg-gray-50 rounded-2xl p-4 grid grid-cols-1 gap-2">
                    <InfoRow icon="ri-calendar-line" label="Cadastrado em" value={formatDateTime(detailUser.created_at)} />
                    <InfoRow icon="ri-history-line" label="Última atividade" value={formatDateTime(detailUser.updated_at)} />
                    {userDetails?.last_sign_in_at && (
                      <InfoRow icon="ri-login-box-line" label="Último login" value={formatDateTime(userDetails.last_sign_in_at)} />
                    )}
                    {userDetails?.email && (
                      <InfoRow icon="ri-mail-line" label="E-mail" value={userDetails.email} />
                    )}
                    {userDetails?.confirmed_at && (
                      <InfoRow icon="ri-check-double-line" label="E-mail confirmado em" value={formatDate(userDetails.confirmed_at)} />
                    )}
                    <InfoRow icon="ri-fingerprint-line" label="ID" value={detailUser.id.slice(0, 12) + "..."} />
                  </div>
                </div>

                {/* Seção: Gestão de Email (Admin) */}
                <div className="mb-5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
                    <i className="ri-mail-settings-line text-sm" style={{ color: "#F97316" }}></i> Gestão de Email
                  </h4>
                  <div className="rounded-2xl p-4" style={{ background: "#FFF7ED", border: "1px solid rgba(249,115,22,0.15)" }}>
                    {emailLoading ? (
                      <div className="flex items-center gap-2 py-2">
                        <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(249,115,22,0.3)", borderTopColor: "#F97316" }}></div>
                        <span className="text-sm text-gray-500">Carregando informações de email...</span>
                      </div>
                    ) : (
                      <>
                        {/* Status atual */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`w-2 h-2 rounded-full ${
                            managedEmail?.is_default_user
                              ? "bg-amber-400"
                              : managedEmail?.email && managedEmail?.confirmed_at
                                ? "bg-green-500"
                                : managedEmail?.email
                                  ? "bg-yellow-400"
                                  : "bg-gray-300"
                          }`}></span>
                          <span className="text-sm font-semibold" style={{
                            color: managedEmail?.is_default_user
                              ? "#B45309"
                              : managedEmail?.email && managedEmail?.confirmed_at
                                ? "#166534"
                                : managedEmail?.email
                                  ? "#854D0E"
                                  : "#6B7280"
                          }}>
                            {managedEmail?.is_default_user
                              ? "Email padrão do sistema (não notificado)"
                              : managedEmail?.email && managedEmail?.confirmed_at
                                ? "Email verificado e ativo"
                                : managedEmail?.email
                                  ? "Email pendente de confirmação"
                                  : "Sem email cadastrado"}
                          </span>
                        </div>

                        {managedEmail?.email && (
                          <div className="bg-white rounded-xl p-3 mb-3 border border-orange-100">
                            <div className="flex items-center gap-2">
                              <i className="ri-mail-line text-[#F97316]"></i>
                              <span className="text-sm font-medium text-gray-800 break-all">{managedEmail.email}</span>
                            </div>
                            {managedEmail.confirmed_at && (
                              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                <i className="ri-check-double-line text-green-500"></i>
                                Confirmado em {new Date(managedEmail.confirmed_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Modo edição */}
                        {emailEditMode ? (
                          <div className="space-y-2">
                            <input
                              type="email"
                              value={newEmail}
                              onChange={(e) => setNewEmail(e.target.value)}
                              placeholder="novo@email.com.br"
                              className="w-full px-3 py-2 rounded-xl text-sm border border-orange-200 focus:outline-none focus:border-[#F97316] bg-white"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={handleSaveEmail}
                                disabled={emailSaving}
                                className="flex-1 py-2 rounded-xl text-white text-xs font-bold cursor-pointer whitespace-nowrap disabled:opacity-50 transition-all"
                                style={{ background: "linear-gradient(135deg, #F97316, #EA580C)" }}
                              >
                                {emailSaving ? (
                                  <span className="flex items-center justify-center gap-1.5">
                                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                    Salvando...
                                  </span>
                                ) : "Salvar Email"}
                              </button>
                              <button
                                onClick={() => { setEmailEditMode(false); setNewEmail(""); setEmailMsg({ type: "", text: "" }); }}
                                className="py-2 px-3 rounded-xl text-gray-500 text-xs font-semibold cursor-pointer whitespace-nowrap border border-gray-200 hover:bg-gray-50"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setEmailEditMode(true); setNewEmail(managedEmail?.email || ""); setEmailMsg({ type: "", text: "" }); }}
                              className="flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap transition-all flex items-center justify-center gap-1.5 bg-white border border-orange-200 hover:bg-orange-50"
                              style={{ color: "#F97316" }}
                            >
                              <i className="ri-edit-line"></i>
                              {managedEmail?.email ? "Alterar Email" : "Cadastrar Email"}
                            </button>
                            {managedEmail?.email && (
                              <button
                                onClick={handleRemoveEmail}
                                disabled={emailSaving}
                                className="py-2 px-3 rounded-xl text-xs font-semibold cursor-pointer whitespace-nowrap transition-all bg-red-50 hover:bg-red-100 text-red-500 border border-red-200 disabled:opacity-50"
                              >
                                {emailSaving ? (
                                  <span className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin inline-block"></span>
                                ) : (
                                  <><i className="ri-delete-bin-line"></i> Remover</>
                                )}
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    )}

                    {/* Mensagens de feedback */}
                    {emailMsg.text && (
                      <div className={`mt-3 p-3 rounded-xl text-xs flex items-start gap-2 ${
                        emailMsg.type === "success" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-600"
                      }`}>
                        <i className={`${emailMsg.type === "success" ? "ri-checkbox-circle-line" : "ri-error-warning-line"} mt-0.5`}></i>
                        <span>{emailMsg.text}</span>
                      </div>
                    )}

                    <p className="text-xs text-gray-400 mt-3 leading-relaxed">
                      <i className="ri-information-line mr-1"></i>
                      Ao alterar o email, a senha é <strong className="text-gray-600">resetada para Teste@123</strong>. No primeiro login com o novo email, o usuário será direcionado para definir uma foto de perfil e nova senha própria. O sistema confirma o email automaticamente e o usuário passa a receber notificações de compromissos da agenda, demandas, vagas e mensagens.
                    </p>
                  </div>
                </div>

                {/* Seção: Assessor — Aprovação */}
                {isAssessor && (
                  <div className="mb-5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
                      <i className="ri-shield-user-line text-sm" style={{ color: "#3BBFD4" }}></i> Informações do Assessor
                    </h4>
                    <div className="bg-blue-50 rounded-2xl p-4 grid grid-cols-1 gap-2">
                      <InfoRow icon="ri-user-star-line" label="Cargo" value={cargoLabel} />
                      <InfoRow icon="ri-flag-line" label="Status" value={pending ? "Pendente de aprovação" : "Ativo"} />
                      {aprovado ? (
                        <InfoRow icon="ri-check-line" label="Aprovado em" value={formatDateTime(aprovado)} />
                      ) : pending ? (
                        <div className="flex items-center gap-2 text-sm py-1">
                          <i className="ri-time-line text-amber-500 w-5 text-center shrink-0"></i>
                          <span className="text-amber-600 font-medium">Aguardando aprovação do admin</span>
                        </div>
                      ) : (
                        <InfoRow icon="ri-check-line" label="Aprovado em" value="Já estava ativo" />
                      )}
                    </div>
                  </div>
                )}

                {/* Seção: Dados Pessoais (todos) */}
                <div className="mb-5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
                    <i className="ri-user-line text-sm" style={{ color: rc.color }}></i> Dados Pessoais
                  </h4>
                  <div className="bg-gray-50 rounded-2xl p-4 grid grid-cols-1 gap-2">
                    {detailUser.phone && <InfoRow icon="ri-phone-line" label="Telefone" value={detailUser.phone} />}
                    {detailUser.neighborhood && <InfoRow icon="ri-map-pin-line" label="Bairro" value={detailUser.neighborhood} />}
                    {detailUser.cpf && <InfoRow icon="ri-id-card-line" label="CPF" value={detailUser.cpf} />}
                    {(detailUser.street || detailUser.city) && (
                      <InfoRow icon="ri-home-4-line" label="Endereço" value={
                        [detailUser.street, detailUser.number, detailUser.complement, detailUser.city, detailUser.state, detailUser.cep]
                          .filter(Boolean).join(", ")
                      } />
                    )}
                    {!detailUser.phone && !detailUser.neighborhood && !detailUser.cpf && !detailUser.street && (
                      <p className="text-gray-300 text-sm py-1">Nenhum dado pessoal cadastrado</p>
                    )}
                  </div>
                </div>

                {/* Seção: Empresa */}
                {isEmpresa && (
                  <div className="mb-5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
                      <i className="ri-building-line text-sm" style={{ color: "#0D7A5F" }}></i> Dados da Empresa
                    </h4>
                    <div className="bg-gray-50 rounded-2xl p-4 grid grid-cols-1 gap-2">
                      {detailUser.cnpj && <InfoRow icon="ri-file-copy-2-line" label="CNPJ" value={detailUser.cnpj} />}
                      {detailUser.responsible_name && <InfoRow icon="ri-user-3-line" label="Responsável" value={detailUser.responsible_name} />}
                    </div>
                  </div>
                )}

                {/* Seção: Dados Profissionais (cidadão) */}
                {isCitizen && (
                  <div className="mb-5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
                      <i className="ri-briefcase-4-line text-sm" style={{ color: "#1B2A5E" }}></i> Dados Profissionais
                    </h4>
                    <div className="bg-gray-50 rounded-2xl p-4 grid grid-cols-1 gap-2">
                      {detailUser.education && <InfoRow icon="ri-graduation-cap-line" label="Formação" value={detailUser.education} />}
                      {detailUser.expertise && <InfoRow icon="ri-award-line" label="Área / Expertise" value={detailUser.expertise} />}
                      {detailUser.job_type && <InfoRow icon="ri-calendar-check-line" label="Tipo de Vaga" value={detailUser.job_type} />}
                      {detailUser.job_status && <InfoRow icon="ri-user-location-line" label="Status" value={detailUser.job_status === "not_looking" ? "Não procura emprego" : detailUser.job_status === "looking" ? "Quer emprego" : detailUser.job_status} />}
                    </div>
                  </div>
                )}

                {/* Bio */}
                {detailUser.bio && (
                  <div className="mb-5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                      <i className="ri-edit-line mr-1"></i>Descrição Profissional
                    </h4>
                    <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-2xl p-4">{detailUser.bio}</p>
                  </div>
                )}

                {detailLoading && (
                  <div className="flex items-center justify-center py-4">
                    <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(3,105,161,0.3)", borderTopColor: "#0369A1" }}></div>
                    <span className="text-gray-400 text-sm ml-2">Carregando dados da conta...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ============ MODAL CONFIRMAÇÃO DE EXCLUSÃO ============ */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
          <div className="bg-white rounded-3xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-gray-900 font-extrabold text-lg flex items-center gap-2">
                <i className="ri-alert-line text-red-500"></i>
                Excluir Usuário
              </h3>
              <button onClick={() => { setDeleteTarget(null); setDeleteConfirm(""); setDeleteMsg({ type: "", text: "" }); }} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer">
                <i className="ri-close-line"></i>
              </button>
            </div>
            <div className="p-6 space-y-4">
              {deleteMsg.type === "success" ? (
                <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm flex items-start gap-2">
                  <i className="ri-checkbox-circle-line mt-0.5"></i>
                  <span>{deleteMsg.text}</span>
                </div>
              ) : (
                <>
                  <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                    <p className="text-red-800 font-semibold text-sm mb-1">Esta ação é IRREVERSÍVEL</p>
                    <p className="text-red-600 text-sm leading-relaxed">
                      Você está prestes a excluir permanentemente{" "}
                      <strong>{deleteTarget.full_name ?? deleteTarget.company_name}</strong>{" "}
                      ({roleConfig(deleteTarget.role).label}) e todos os seus dados do sistema.
                    </p>
                    <ul className="mt-2 text-red-600 text-sm space-y-0.5 list-disc list-inside">
                      <li>Perfil e conta de acesso</li>
                      <li>Demandas e mensagens</li>
                      <li>Candidaturas e vagas</li>
                      <li>Conversas do chat</li>
                      <li>Códigos de verificação</li>
                    </ul>
                  </div>

                  {deleteMsg.type === "error" && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm flex items-start gap-2">
                      <i className="ri-error-warning-line mt-0.5"></i>
                      <span>{deleteMsg.text}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                      Digite o nome exato do usuário para confirmar
                    </label>
                    <input
                      type="text"
                      value={deleteConfirm}
                      onChange={(e) => setDeleteConfirm(e.target.value)}
                      placeholder={deleteTarget.full_name ?? ""}
                      className="w-full rounded-xl px-4 py-3 border-2 border-red-200 text-sm focus:outline-none focus:border-red-400"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => { setDeleteTarget(null); setDeleteConfirm(""); setDeleteMsg({ type: "", text: "" }); }}
                      className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 cursor-pointer whitespace-nowrap"
                    >Cancelar</button>
                    <button
                      onClick={handleDeleteUser}
                      disabled={deleting || deleteConfirm.trim().toLowerCase() !== (deleteTarget.full_name?.trim().toLowerCase() ?? "")}
                      className="flex-1 py-3 rounded-xl text-white font-bold text-sm cursor-pointer whitespace-nowrap disabled:opacity-40"
                      style={{ background: "#DC2626" }}
                    >
                      {deleting ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          Excluindo...
                        </span>
                      ) : "Excluir Permanentemente"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============ MODAL CRIAR USUÁRIO ============ */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-3xl z-10">
              <h3 className="text-gray-900 font-extrabold text-lg">Criar Novo Usuário</h3>
              <button onClick={() => { setShowForm(false); setMsg({ type: "", text: "" }); }} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer">
                <i className="ri-close-line"></i>
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {msg.type === "success" && <div className="p-3 rounded-xl text-green-600 text-sm flex items-center gap-2 bg-green-50 border border-green-100"><i className="ri-checkbox-circle-line"></i>{msg.text}</div>}
              {msg.type === "error" && <div className="p-3 rounded-xl text-red-500 text-sm flex items-center gap-2 bg-red-50 border border-red-100"><i className="ri-error-warning-line"></i>{msg.text}</div>}

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Tipo de Conta *</label>
                <div className="grid grid-cols-3 gap-2">
                  {ROLES.map((r) => (
                    <button key={r.value} type="button" onClick={() => setForm((p) => ({ ...p, role: r.value }))}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer`}
                      style={form.role === r.value ? { background: r.bg, borderColor: r.color, color: r.color } : { borderColor: "#E5E7EB", color: "#6B7280" }}>
                      <i className={`${r.icon} text-base`}></i>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  {form.role === "empresa" ? "Razão Social *" : "Nome Completo *"}
                </label>
                <input type="text" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder={form.role === "empresa" ? "Nome da empresa" : "Nome do usuário"} required
                  className="w-full rounded-xl px-4 py-3 border border-gray-200 text-sm focus:outline-none focus:border-[#0369A1]" />
              </div>

              {form.role === "empresa" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Responsável</label>
                  <input type="text" value={form.company_name} onChange={(e) => setForm((p) => ({ ...p, company_name: e.target.value }))}
                    placeholder="Nome do responsável" className="w-full rounded-xl px-4 py-3 border border-gray-200 text-sm focus:outline-none focus:border-[#0369A1]" />
                </div>
              )}

              {form.role === "citizen" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Bairro</label>
                  <input type="text" value={form.neighborhood} onChange={(e) => setForm((p) => ({ ...p, neighborhood: e.target.value }))}
                    placeholder="Bairro em Pelotas" className="w-full rounded-xl px-4 py-3 border border-gray-200 text-sm focus:outline-none focus:border-[#0369A1]" />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">E-mail *</label>
                <input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="email@exemplo.com.br" required className="w-full rounded-xl px-4 py-3 border border-gray-200 text-sm focus:outline-none focus:border-[#0369A1]" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Telefone</label>
                  <input type="tel" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="(53) 9 0000-0000" className="w-full rounded-xl px-4 py-3 border border-gray-200 text-sm focus:outline-none focus:border-[#0369A1]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Senha *</label>
                  <input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    placeholder="Mín. 6 caracteres" required minLength={6} className="w-full rounded-xl px-4 py-3 border border-gray-200 text-sm focus:outline-none focus:border-[#0369A1]" />
                </div>
              </div>

              <div className="p-3 rounded-xl text-xs" style={{ background: "#EFF6FF", color: "#0369A1" }}>
                <i className="ri-information-line mr-1"></i>
                Assessores acessam <strong>/assessor</strong> · Admins acessam <strong>/admin</strong> · Cidadãos/Empresas acessam <strong>/auth</strong>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setMsg({ type: "", text: "" }); }}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 cursor-pointer whitespace-nowrap">Cancelar</button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-3 rounded-xl text-white font-bold text-sm cursor-pointer whitespace-nowrap"
                  style={{ background: "linear-gradient(135deg, #0369A1, #0EA5E9)", opacity: saving ? 0.7 : 1 }}>
                  {saving ? "Criando..." : "Criar Usuário"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox de foto de perfil */}
      <ProfilePhotoLightbox
        imageUrl={photoLightbox.url}
        userName={photoLightbox.name}
        isOpen={!!photoLightbox.url}
        onClose={() => setPhotoLightbox({ url: null, name: null })}
      />
    </div>
  );
}

/** InfoRow v2 — layout limpo sem sobreposição */
function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 text-sm py-0.5">
      <i className={`${icon} w-5 text-center shrink-0 mt-0.5 text-gray-400`}></i>
      <div className="flex-1 min-w-0">
        <span className="text-gray-400 text-xs font-medium block leading-tight">{label}</span>
        <span className="text-gray-700 font-semibold break-all leading-tight block mt-0.5">{value}</span>
      </div>
    </div>
  );
}