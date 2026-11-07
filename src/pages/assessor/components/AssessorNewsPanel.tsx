import { useState, useEffect, useRef } from "react";
import { supabase, supabaseUrl, supabaseAnonKey } from "@/lib/supabase";
import ImagePositionEditor from "@/components/feature/ImagePositionEditor";

interface NewsItem {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  content: string | null;
  image_url: string | null;
  image_position_x: number | null;
  image_position_y: number | null;
  image_zoom: number | null;
  category: string;
  status: string;
  featured: boolean;
  importance: string;
  sort_order?: number | null;
  published_at: string;
  author: string;
}

interface Props {
  authorName: string;
}

const categories = ["Mandato", "Ação Social", "Tecnologia", "Segurança", "Educação", "Saúde", "Infraestrutura", "Transparência"];

const importanceOptions = [
  { value: "high", label: "Alta importância", color: "#EF4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.25)", icon: "ri-arrow-up-double-line" },
  { value: "normal", label: "Normal", color: "#3BBFD4", bg: "rgba(59,191,212,0.12)", border: "rgba(59,191,212,0.25)", icon: "ri-equal-line" },
  { value: "low", label: "Informativo", color: "#6B7280", bg: "rgba(107,114,128,0.10)", border: "rgba(107,114,128,0.20)", icon: "ri-arrow-down-line" },
];

// Dark theme tokens
const dark = {
  cardBg: "rgba(255,255,255,0.04)",
  cardBorder: "rgba(255,255,255,0.08)",
  inputBg: "rgba(255,255,255,0.06)",
  inputBorder: "rgba(255,255,255,0.12)",
  textPrimary: "white",
  textMuted: "rgba(255,255,255,0.45)",
  textFaint: "rgba(255,255,255,0.25)",
  divider: "rgba(255,255,255,0.08)",
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });
}

// ── Edge Function helper: bypassa RLS usando service role key ──
async function newsManage(action: string, payload?: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("admin-news-manage", {
    body: { action, payload },
  });
  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || "Operação falhou");
  return data;
}

export default function AssessorNewsPanel({ authorName }: Props) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [editing, setEditing] = useState<NewsItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imagePosX, setImagePosX] = useState(50);
  const [imagePosY, setImagePosY] = useState(50);
  const [imageZoom, setImageZoom] = useState(1.0);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [filterImportance, setFilterImportance] = useState("all");
  const [form, setForm] = useState({
    title: "",
    summary: "",
    content: "",
    image_url: "",
    category: "Mandato",
    status: "published",
    featured: false,
    importance: "normal",
  });

  const load = async () => {
    setLoading(true);
    try {
      const result = await newsManage("load-news");
      if (result.success && Array.isArray(result.news)) {
        setNews(result.news as NewsItem[]);
      } else {
        console.error("[AssessorNewsPanel] load via edge function falhou:", result.error);
        // Fallback: REST API direta
        const { data, error } = await supabase
          .from("news")
          .select("*")
          .order("sort_order", { ascending: true, nullsFirst: false })
          .order("importance", { ascending: false })
          .order("published_at", { ascending: false });
        if (error) console.error("[AssessorNewsPanel] load fallback error:", error.message);
        setNews((data as NewsItem[]) ?? []);
      }
    } catch (loadErr) {
      console.error("[AssessorNewsPanel] load exception:", loadErr);
      // Fallback via REST
      try {
        const { data, error } = await supabase
          .from("news")
          .select("*")
          .order("sort_order", { ascending: true, nullsFirst: false })
          .order("importance", { ascending: false })
          .order("published_at", { ascending: false });
        if (error) console.error("[AssessorNewsPanel] load fallback error:", error.message);
        setNews((data as NewsItem[]) ?? []);
      } catch (_) {
        setNews([]);
      }
    }
    setLoading(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { return; }
    setUploadingImage(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const uniqueName = `news-${Date.now()}.${ext}`;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? supabaseAnonKey;
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${supabaseUrl}/storage/v1/object/news-images/${uniqueName}`, {
        method: "POST",
        headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${token}`, "x-upsert": "true" },
        body: formData,
      });
      if (!res.ok) {
        const { error: uploadErr } = await supabase.storage
          .from("news-images")
          .upload(uniqueName, file, { contentType: file.type, upsert: true });
        if (uploadErr) throw new Error(uploadErr.message);
      }
      const { data: urlData } = supabase.storage.from("news-images").getPublicUrl(uniqueName);
      const publicUrl = urlData?.publicUrl ?? `${supabaseUrl}/storage/v1/object/public/news-images/${uniqueName}`;
      setForm((p) => ({ ...p, image_url: publicUrl }));
      setImagePreview(publicUrl);
    } catch (err) {
      console.error("[AssessorNewsPanel] Image upload failed:", err);
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setForm({ title: "", summary: "", content: "", image_url: "", category: "Mandato", status: "published", featured: false, importance: "normal" });
    setEditing(null);
    setImagePreview(null);
    setImagePosX(50);
    setImagePosY(50);
    setImageZoom(1.0);
    setMode("create");
  };

  const openEdit = (item: NewsItem) => {
    setForm({
      title: item.title,
      summary: item.summary ?? "",
      content: item.content ?? "",
      image_url: item.image_url ?? "",
      category: item.category,
      status: item.status,
      featured: item.featured,
      importance: item.importance ?? "normal",
    });
    setEditing(item);
    setImagePreview(item.image_url ?? null);
    setImagePosX(item.image_position_x ?? 50);
    setImagePosY(item.image_position_y ?? 50);
    setImageZoom(item.image_zoom ?? 1.0);
    setMode("edit");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    setSaveError(null);
    const payload = {
      title: form.title,
      slug: slugify(form.title),
      summary: form.summary || null,
      content: form.content || null,
      image_url: form.image_url || null,
      image_position_x: imagePosX,
      image_position_y: imagePosY,
      image_zoom: imageZoom,
      category: form.category,
      status: form.status,
      featured: form.featured,
      importance: form.importance,
      author: authorName,
      updated_at: new Date().toISOString(),
    };
    try {
      if (editing) {
        const result = await newsManage("update-news", { id: editing.id, data: payload });
        if (!result.success) {
          setSaveError(`Falha ao salvar: ${result.error}`);
          setSaving(false);
          return;
        }
        console.log("[AssessorNewsPanel] Notícia atualizada via edge function, id:", editing.id);
      } else {
        const result = await newsManage("insert-news", { data: { ...payload, published_at: new Date().toISOString() } });
        if (!result.success) {
          setSaveError(`Falha ao publicar: ${result.error}`);
          setSaving(false);
          return;
        }
        console.log("[AssessorNewsPanel] Notícia criada via edge function, id:", result.id);
      }
    } catch (err: any) {
      console.error("[AssessorNewsPanel] Edge function error:", err);
      setSaveError(`Erro de rede: ${err.message || "Falha na conexão"}. Tente novamente.`);
      setSaving(false);
      return;
    }
    setSaving(false);
    setMode("list");
    setEditing(null);
    setImagePreview(null);
    await load();
  };

  const toggleStatus = async (item: NewsItem) => {
    const newStatus = item.status === "published" ? "draft" : "published";
    try {
      const result = await newsManage("toggle-field", { id: item.id, field: "status", value: newStatus });
      if (!result.success) {
        console.error("[AssessorNewsPanel] toggleStatus falhou:", result.error);
        await load();
        return;
      }
      setNews((prev) => prev.map((n) => n.id === item.id ? { ...n, status: newStatus } : n));
    } catch (err) {
      console.error("[AssessorNewsPanel] toggleStatus error:", err);
      await load();
    }
  };

  const handleDelete = async (item: NewsItem) => {
    if (!window.confirm(`Excluir a notícia "${item.title}"? Esta ação é irreversível.`)) return;
    try {
      const result = await newsManage("delete-news", { id: item.id });
      if (!result.success) {
        console.error("[AssessorNewsPanel] Delete falhou:", result.error);
        return;
      }
      setNews((prev) => prev.filter((n) => n.id !== item.id));
    } catch (err) {
      console.error("[AssessorNewsPanel] Delete error:", err);
    }
  };

  const initializeSortOrders = async () => {
    const needsInit = filtered.some((n) => n.sort_order === null || n.sort_order === undefined);
    if (!needsInit) return true;
    try {
      const result = await newsManage("init-sort-orders");
      if (!result.success) {
        console.error("[AssessorNewsPanel] initializeSortOrders falhou:", result.error);
        return false;
      }
      console.log("[AssessorNewsPanel] sort_order inicializado para", result.total, "notícias,", result.failures, "falhas");
      return result.failures === 0;
    } catch (err) {
      console.error("[AssessorNewsPanel] initializeSortOrders error:", err);
      return false;
    }
  };

  const moveUp = async (item: NewsItem, idx: number) => {
    if (idx <= 0) return;
    const above = filtered[idx - 1];
    const ok = await initializeSortOrders();
    if (!ok) { await load(); return; }
    try {
      const result = await newsManage("swap-sort-orders", {
        id1: item.id, order1: idx - 1,
        id2: above.id, order2: idx,
      });
      if (!result.success) {
        console.error("[AssessorNewsPanel] moveUp falhou:", result.error);
      } else {
        console.log("[AssessorNewsPanel] moveUp ok:", item.id, "<->", above.id);
      }
    } catch (err) {
      console.error("[AssessorNewsPanel] moveUp error:", err);
    }
    await load();
  };

  const moveDown = async (item: NewsItem, idx: number) => {
    if (idx >= filtered.length - 1) return;
    const below = filtered[idx + 1];
    const ok = await initializeSortOrders();
    if (!ok) { await load(); return; }
    try {
      const result = await newsManage("swap-sort-orders", {
        id1: item.id, order1: idx + 1,
        id2: below.id, order2: idx,
      });
      if (!result.success) {
        console.error("[AssessorNewsPanel] moveDown falhou:", result.error);
      } else {
        console.log("[AssessorNewsPanel] moveDown ok:", item.id, "<->", below.id);
      }
    } catch (err) {
      console.error("[AssessorNewsPanel] moveDown error:", err);
    }
    await load();
  };

  const importanceInfo = (v: string) => importanceOptions.find((o) => o.value === v) ?? importanceOptions[1];
  const filtered = news.filter((n) => filterImportance === "all" || n.importance === filterImportance);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "rgba(59,191,212,0.3)", borderTopColor: "#3BBFD4" }}></div>
      </div>
    );
  }

  // ── FORM MODE ──
  if (mode === "create" || mode === "edit") {
    return (
      <div>
        <button
          onClick={() => { setMode("list"); setEditing(null); setImagePreview(null); }}
          className="flex items-center gap-2 text-sm mb-5 cursor-pointer"
          style={{ color: "rgba(255,255,255,0.50)" }}
        >
          <i className="ri-arrow-left-line"></i> Voltar para lista
        </button>
        <h2 className="font-extrabold text-xl mb-5 text-white">
          {mode === "edit" ? "Editar Notícia" : "Nova Notícia"}
        </h2>
        <form onSubmit={handleSave} className="rounded-2xl p-5 md:p-6 space-y-5" style={{ background: dark.cardBg, border: `1px solid ${dark.cardBorder}` }}>
          {saveError && (
            <div className="p-3 rounded-xl flex items-start gap-2" style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.30)" }}>
              <i className="ri-error-warning-line shrink-0 mt-0.5" style={{ color: "#EF4444" }}></i>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: "#FCA5A5" }}>{saveError}</p>
                <p className="text-xs mt-1" style={{ color: "rgba(239,68,68,0.70)" }}>Verifique sua conexão e tente novamente. Se o problema persistir, recarregue a página.</p>
              </div>
              <button type="button" onClick={() => setSaveError(null)} className="shrink-0 cursor-pointer" style={{ color: "rgba(239,68,68,0.60)" }}>
                <i className="ri-close-line"></i>
              </button>
            </div>
          )}
          {/* Título */}
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: dark.textMuted }}>Título *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Título da notícia"
              className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
              style={{ background: dark.inputBg, border: `1px solid ${dark.inputBorder}`, color: "white" }}
              required
            />
          </div>

          {/* Importância */}
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: dark.textMuted }}>Nível de importância</label>
            <div className="flex gap-2 flex-wrap">
              {importanceOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, importance: opt.value }))}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap"
                  style={
                    form.importance === opt.value
                      ? { color: opt.color, background: opt.bg, border: `1px solid ${opt.border}` }
                      : { color: dark.textFaint, background: "rgba(255,255,255,0.04)", border: `1px solid ${dark.inputBorder}` }
                  }
                >
                  <span className="w-4 h-4 flex items-center justify-center"><i className={opt.icon}></i></span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Categoria + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: dark.textMuted }}>Categoria</label>
              <select
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none cursor-pointer"
                style={{ background: dark.inputBg, border: `1px solid ${dark.inputBorder}`, color: "white" }}
              >
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: dark.textMuted }}>Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none cursor-pointer"
                style={{ background: dark.inputBg, border: `1px solid ${dark.inputBorder}`, color: "white" }}
              >
                <option value="published">Publicar agora</option>
                <option value="draft">Salvar como rascunho</option>
              </select>
            </div>
          </div>

          {/* Imagem */}
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: dark.textMuted }}>Imagem de Capa</label>
            {imagePreview && (
              <div className="relative mb-3 rounded-xl overflow-hidden w-full h-40">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => { setImagePreview(null); setForm((p) => ({ ...p, image_url: "" })); }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center cursor-pointer hover:bg-red-600"
                >
                  <i className="ri-close-line text-sm"></i>
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} className="hidden" />
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={uploadingImage}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap transition-all disabled:opacity-60"
                style={{ background: dark.inputBg, border: `1px solid ${dark.inputBorder}`, color: "rgba(255,255,255,0.60)" }}
              >
                {uploadingImage ? (
                  <><span className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "rgba(255,255,255,0.30)", borderTopColor: "white" }}></span> Enviando...</>
                ) : (
                  <><i className="ri-upload-cloud-line"></i> Upload</>
                )}
              </button>
              <input
                type="text"
                value={form.image_url}
                onChange={(e) => { setForm((p) => ({ ...p, image_url: e.target.value })); setImagePreview(e.target.value || null); }}
                placeholder="Ou cole URL da imagem..."
                className="flex-1 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                style={{ background: dark.inputBg, border: `1px solid ${dark.inputBorder}`, color: "white" }}
              />
            </div>
          </div>

          {/* Image Position Editor */}
          {imagePreview && (
            <ImagePositionEditor
              imageUrl={imagePreview}
              positionX={imagePosX}
              positionY={imagePosY}
              zoom={imageZoom}
              onPositionXChange={setImagePosX}
              onPositionYChange={setImagePosY}
              onZoomChange={setImageZoom}
            />
          )}

          {/* Resumo */}
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: dark.textMuted }}>Resumo (aparece nos cards)</label>
            <textarea
              value={form.summary}
              onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))}
              rows={2}
              maxLength={300}
              placeholder="Breve resumo para aparecer nas listagens..."
              className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none resize-none"
              style={{ background: dark.inputBg, border: `1px solid ${dark.inputBorder}`, color: "white" }}
            />
          </div>

          {/* Conteúdo */}
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: dark.textMuted }}>Conteúdo completo</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
              rows={7}
              maxLength={500}
              placeholder="Escreva o conteúdo completo da notícia..."
              className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none resize-none"
              style={{ background: dark.inputBg, border: `1px solid ${dark.inputBorder}`, color: "white" }}
            />
          </div>

          {/* Destaque */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="featured-assessor"
              checked={form.featured}
              onChange={(e) => setForm((p) => ({ ...p, featured: e.target.checked }))}
              className="w-4 h-4 cursor-pointer accent-[#3BBFD4]"
            />
            <label htmlFor="featured-assessor" className="text-sm font-medium cursor-pointer" style={{ color: dark.textMuted }}>
              Destacar na homepage
            </label>
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || !form.title.trim()}
              className="px-6 py-3 text-white font-bold text-sm rounded-xl transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #0369A1, #0EA5E9)" }}
            >
              {saving ? "Publicando..." : mode === "edit" ? "Salvar alterações" : "Publicar Notícia"}
            </button>
            <button
              type="button"
              onClick={() => { setMode("list"); setEditing(null); setSaveError(null); }}
              className="px-6 py-3 text-sm font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap"
              style={{ background: dark.inputBg, color: "rgba(255,255,255,0.60)", border: `1px solid ${dark.inputBorder}` }}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ── LIST MODE ──
  return (
    <div>
      <div className="flex items-center justify-between mb-5 gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm shrink-0" style={{ color: dark.textMuted }}>{filtered.length} notícia(s)</span>
          <select
            value={filterImportance}
            onChange={(e) => setFilterImportance(e.target.value)}
            className="rounded-xl px-3 py-2 text-xs focus:outline-none cursor-pointer"
            style={{ background: dark.inputBg, border: `1px solid ${dark.inputBorder}`, color: "rgba(255,255,255,0.70)" }}
          >
            <option value="all">Todas as importâncias</option>
            <option value="high">Alta importância</option>
            <option value="normal">Normal</option>
            <option value="low">Informativo</option>
          </select>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 px-3 py-2 md:px-5 md:py-2.5 text-white text-xs md:text-sm font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0"
          style={{ background: "linear-gradient(135deg, #0369A1, #0EA5E9)" }}
        >
          <i className="ri-add-line text-sm md:text-base"></i>
          <span className="hidden sm:inline">Nova Notícia</span>
          <span className="sm:hidden">Nova</span>
        </button>
      </div>

      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className="rounded-2xl p-10 text-center" style={{ background: dark.cardBg, border: `1px solid ${dark.cardBorder}` }}>
            <span className="w-12 h-12 flex items-center justify-center mx-auto mb-3">
              <i className="ri-newspaper-line text-4xl" style={{ color: "rgba(255,255,255,0.12)" }}></i>
            </span>
            <p className="text-sm" style={{ color: dark.textFaint }}>Nenhuma notícia encontrada</p>
          </div>
        ) : (
          filtered.map((item, idx) => {
            const imp = importanceInfo(item.importance ?? "normal");
            return (
              <div
                key={item.id}
                className="rounded-2xl p-4 flex gap-4 items-center"
                style={{ background: dark.cardBg, border: `1px solid ${dark.cardBorder}` }}
              >
                {item.image_url && (
                  <div className="w-16 h-14 rounded-xl overflow-hidden shrink-0">
                    <img src={item.image_url} alt={item.title} className="w-full h-full object-cover object-top" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "#3BBFD4" }}>{item.category}</span>
                    <span
                      className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ color: imp.color, background: imp.bg, border: `1px solid ${imp.border}` }}
                    >
                      <i className={imp.icon}></i>
                      {imp.label}
                    </span>
                  </div>
                  <p className="font-semibold text-sm truncate text-white">{item.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: dark.textFaint }}>{formatDate(item.published_at)} · {item.author}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                      item.status === "published"
                        ? ""
                        : ""
                    }`}
                    style={
                      item.status === "published"
                        ? { color: "#22C55E", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)" }
                        : { color: dark.textMuted, background: dark.inputBg, border: `1px solid ${dark.inputBorder}` }
                    }
                  >
                    {item.status === "published" ? "Publicado" : "Rascunho"}
                  </span>
                  <button
                    onClick={() => toggleStatus(item)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer transition-all"
                    style={{ background: dark.inputBg, color: "rgba(255,255,255,0.45)" }}
                    title="Alternar status"
                  >
                    <i className={`${item.status === "published" ? "ri-eye-off-line" : "ri-eye-line"} text-sm`}></i>
                  </button>
                  <button
                    onClick={() => moveUp(item, idx)}
                    disabled={idx === 0}
                    className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer transition-all disabled:opacity-30"
                    style={{ background: dark.inputBg, color: "rgba(255,255,255,0.45)" }}
                    title="Mover para cima"
                  >
                    <i className="ri-arrow-up-line text-sm"></i>
                  </button>
                  <button
                    onClick={() => moveDown(item, idx)}
                    disabled={idx === filtered.length - 1}
                    className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer transition-all disabled:opacity-30"
                    style={{ background: dark.inputBg, color: "rgba(255,255,255,0.45)" }}
                    title="Mover para baixo"
                  >
                    <i className="ri-arrow-down-line text-sm"></i>
                  </button>
                  <button
                    onClick={() => openEdit(item)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer transition-all"
                    style={{ background: "rgba(59,191,212,0.12)", color: "#3BBFD4", border: "1px solid rgba(59,191,212,0.20)" }}
                    title="Editar notícia"
                  >
                    <i className="ri-edit-line text-sm"></i>
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer transition-all"
                    style={{ background: "rgba(239,68,68,0.08)", color: "rgba(239,68,68,0.60)" }}
                    title="Excluir notícia"
                  >
                    <i className="ri-delete-bin-line text-sm"></i>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}