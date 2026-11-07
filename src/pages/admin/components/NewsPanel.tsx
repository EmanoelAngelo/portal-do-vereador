import { useState, useEffect, useRef } from "react";
import { supabase, supabaseUrl, supabaseAnonKey } from "@/lib/supabase";
import { notificarRelevantes } from "@/hooks/useNotifications";
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
  published_at: string;
  author: string | null;
}

const categories = ["Mandato", "Ação Social", "Tecnologia", "Emprego", "Segurança", "Educação", "Saúde", "Infraestrutura", "Agricultura", "Política", "Habitação", "Transparência"];

const importanceOptions = [
  { value: "high", label: "Alta", color: "#DC2626", bg: "#FEF2F2", icon: "ri-arrow-up-double-line" },
  { value: "normal", label: "Normal", color: "#0369A1", bg: "#EFF6FF", icon: "ri-equal-line" },
  { value: "low", label: "Informativo", color: "#6B7280", bg: "#F9FAFB", icon: "ri-arrow-down-line" },
];

function slugify(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" });
}

function formatDateInput(iso: string) {
  const d = new Date(iso);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

export default function NewsPanel() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<NewsItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imagePosX, setImagePosX] = useState(50);
  const [imagePosY, setImagePosY] = useState(50);
  const [imageZoom, setImageZoom] = useState(1.0);
  const [filterStatus, setFilterStatus] = useState("all");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: "", summary: "", content: "", image_url: "",
    category: "Mandato", status: "published", featured: false, importance: "normal",
    published_at: formatDateInput(new Date().toISOString()),
  });

  const load = async () => {
    setLoading(true);
    try {
      const result = await newsManage("load-news");
      if (result.success && Array.isArray(result.news)) {
        setNews(result.news as NewsItem[]);
      } else {
        console.error("[NewsPanel] load via edge function falhou:", result.error);
        // Fallback: REST API direta
        const { data, error } = await supabase
          .from("news")
          .select("*")
          .order("sort_order", { ascending: true, nullsFirst: false })
          .order("importance", { ascending: false })
          .order("published_at", { ascending: false });
        if (error) console.error("[NewsPanel] load fallback error:", error.message);
        setNews((data as NewsItem[]) ?? []);
      }
    } catch (loadErr) {
      console.error("[NewsPanel] load exception:", loadErr);
      // Fallback via REST
      try {
        const { data, error } = await supabase
          .from("news")
          .select("*")
          .order("sort_order", { ascending: true, nullsFirst: false })
          .order("importance", { ascending: false })
          .order("published_at", { ascending: false });
        if (error) console.error("[NewsPanel] load fallback error:", error.message);
        setNews((data as NewsItem[]) ?? []);
      } catch (_) {
        setNews([]);
      }
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setForm({ title: "", summary: "", content: "", image_url: "", category: "Mandato", status: "published", featured: false, importance: "normal", published_at: formatDateInput(new Date().toISOString()) });
    setEditing(null);
    setImagePreview(null);
    setImagePosX(50);
    setImagePosY(50);
    setImageZoom(1.0);
    setCreating(true);
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
      published_at: formatDateInput(item.published_at),
    });
    setEditing(item);
    setImagePreview(item.image_url ?? null);
    setImagePosX(item.image_position_x ?? 50);
    setImagePosY(item.image_position_y ?? 50);
    setImageZoom(item.image_zoom ?? 1.0);
    setCreating(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("Imagem máx. 5MB"); return; }
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
        const { error: uploadErr } = await supabase.storage.from("news-images").upload(uniqueName, file, { contentType: file.type, upsert: true });
        if (uploadErr) throw new Error(uploadErr.message);
      }
      const { data: urlData } = supabase.storage.from("news-images").getPublicUrl(uniqueName);
      const publicUrl = urlData?.publicUrl ?? `${supabaseUrl}/storage/v1/object/public/news-images/${uniqueName}`;
      setForm((p) => ({ ...p, image_url: publicUrl }));
      setImagePreview(publicUrl);
    } catch (err) {
      console.error("[NewsPanel] Image upload failed:", err);
      alert("Erro ao enviar imagem. Tente colar a URL diretamente.");
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    setSaveError(null);
    const publishedAt = new Date(form.published_at + "T10:00:00.000Z").toISOString();
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
      author: "Arthur Halal",
      published_at: publishedAt,
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
        console.log("[NewsPanel] Notícia atualizada via edge function, id:", editing.id);
      } else {
        const result = await newsManage("insert-news", { data: payload });
        if (!result.success) {
          setSaveError(`Falha ao publicar: ${result.error}`);
          setSaving(false);
          return;
        }
        console.log("[NewsPanel] Notícia criada via edge function, id:", result.id);
        const slug = slugify(form.title);
        // Notificar todos os usuários (regra do vereador default tratada internamente)
        await notificarRelevantes(
          "noticia",
          form.title.trim(),
          form.summary?.trim() || `"${form.title.trim()}" foi publicada no portal.`,
          {
            remetenteNome: "Admin",
            referenciaId: slug,
            referenciaTipo: "noticia",
          }
        );
      }
    } catch (err: any) {
      console.error("[NewsPanel] Edge function error:", err);
      setSaveError(`Erro de rede: ${err.message || "Falha na conexão"}. Tente novamente.`);
      setSaving(false);
      return;
    }
    setSaving(false);
    setEditing(null);
    setCreating(false);
    setImagePreview(null);
    await load();
  };

  const toggleStatus = async (item: NewsItem) => {
    const newStatus = item.status === "published" ? "draft" : "published";
    try {
      const result = await newsManage("toggle-field", { id: item.id, field: "status", value: newStatus });
      if (!result.success) {
        console.error("[NewsPanel] toggleStatus falhou:", result.error);
        await load();
        return;
      }
      setNews((prev) => prev.map((n) => n.id === item.id ? { ...n, status: newStatus } : n));
    } catch (err) {
      console.error("[NewsPanel] toggleStatus error:", err);
      await load();
    }
  };

  const toggleFeatured = async (item: NewsItem) => {
    const newFeatured = !item.featured;
    try {
      const result = await newsManage("toggle-field", { id: item.id, field: "featured", value: newFeatured });
      if (!result.success) {
        console.error("[NewsPanel] toggleFeatured falhou:", result.error);
        await load();
        return;
      }
      setNews((prev) => prev.map((n) => n.id === item.id ? { ...n, featured: newFeatured } : n));
    } catch (err) {
      console.error("[NewsPanel] toggleFeatured error:", err);
      await load();
    }
  };

  const changeImportance = async (item: NewsItem, importance: string) => {
    try {
      const result = await newsManage("toggle-field", { id: item.id, field: "importance", value: importance });
      if (!result.success) {
        console.error("[NewsPanel] changeImportance falhou:", result.error);
        await load();
        return;
      }
      setNews((prev) => prev.map((n) => n.id === item.id ? { ...n, importance } : n));
    } catch (err) {
      console.error("[NewsPanel] changeImportance error:", err);
      await load();
    }
  };

  const initializeSortOrders = async () => {
    const needsInit = filtered.some((n) => n.sort_order === null || n.sort_order === undefined);
    if (!needsInit) return true;
    try {
      const result = await newsManage("init-sort-orders");
      if (!result.success) {
        console.error("[NewsPanel] initializeSortOrders falhou:", result.error);
        return false;
      }
      console.log("[NewsPanel] sort_order inicializado para", result.total, "notícias,", result.failures, "falhas");
      return result.failures === 0;
    } catch (err) {
      console.error("[NewsPanel] initializeSortOrders error:", err);
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
        console.error("[NewsPanel] moveUp falhou:", result.error);
      } else {
        console.log("[NewsPanel] moveUp ok:", item.id, "<->", above.id);
      }
    } catch (err) {
      console.error("[NewsPanel] moveUp error:", err);
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
        console.error("[NewsPanel] moveDown falhou:", result.error);
      } else {
        console.log("[NewsPanel] moveDown ok:", item.id, "<->", below.id);
      }
    } catch (err) {
      console.error("[NewsPanel] moveDown error:", err);
    }
    await load();
  };

  const handleDelete = async (item: NewsItem) => {
    if (!confirm(`Tem certeza que deseja excluir a notícia "${item.title}"? Esta ação é irreversível.`)) return;
    setDeleting(item.id);
    try {
      const result = await newsManage("delete-news", { id: item.id });
      if (!result.success) {
        console.error("[NewsPanel] Delete falhou:", result.error);
        alert("Falha ao excluir notícia. Tente novamente.");
        setDeleting(null);
        return;
      }
      setNews((prev) => prev.filter((n) => n.id !== item.id));
    } catch (err) {
      console.error("[NewsPanel] Delete error:", err);
      alert("Falha ao excluir notícia. Tente novamente.");
    }
    setDeleting(null);
  };

  const filtered = news.filter((n) => {
    if (filterStatus === "published") return n.status === "published";
    if (filterStatus === "draft") return n.status === "draft";
    return true;
  });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-[#0369A1] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (creating || editing) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => { setCreating(false); setEditing(null); setImagePreview(null); }}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm cursor-pointer">
            <i className="ri-arrow-left-line"></i> Voltar
          </button>
          <h2 className="text-gray-900 font-extrabold text-xl">{editing ? "Editar Notícia" : "Nova Notícia"}</h2>
        </div>

        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-100 p-5 md:p-7 space-y-5">
          {saveError && (
            <div className="p-3 rounded-xl flex items-start gap-2" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
              <i className="ri-error-warning-line shrink-0 mt-0.5" style={{ color: "#DC2626" }}></i>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: "#DC2626" }}>{saveError}</p>
                <p className="text-xs mt-1" style={{ color: "#EF4444" }}>Verifique sua conexão e tente novamente. Se o problema persistir, recarregue a página.</p>
              </div>
              <button type="button" onClick={() => setSaveError(null)} className="shrink-0 text-red-400 hover:text-red-600 cursor-pointer">
                <i className="ri-close-line"></i>
              </button>
            </div>
          )}
          {/* Título */}
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-1.5">Título *</label>
            <input type="text" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Título da notícia" required
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:border-[#0369A1]" />
          </div>

          {/* Importância */}
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2">Importância / Prioridade</label>
            <div className="flex gap-2 flex-wrap">
              {importanceOptions.map((opt) => (
                <button key={opt.value} type="button" onClick={() => setForm((p) => ({ ...p, importance: opt.value }))}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all cursor-pointer whitespace-nowrap"
                  style={form.importance === opt.value
                    ? { color: opt.color, background: opt.bg, borderColor: opt.color }
                    : { color: "#9CA3AF", background: "#F9FAFB", borderColor: "#E5E7EB" }}>
                  <i className={opt.icon}></i> {opt.label}
                </button>
              ))}
            </div>
            <p className="text-gray-400 text-xs mt-1.5 flex items-center gap-1">
              <i className="ri-information-line"></i>
              Notícias de alta importância aparecem primeiro no feed. Define a ordem de exibição no site.
            </p>
          </div>

          {/* Categoria + Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 text-sm font-semibold mb-1.5">Categoria</label>
              <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none cursor-pointer">
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-semibold mb-1.5">Status</label>
              <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none cursor-pointer">
                <option value="published">Publicado</option>
                <option value="draft">Rascunho</option>
              </select>
            </div>
          </div>

          {/* Data da notícia */}
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-1.5">Data da Notícia</label>
            <input
              type="date"
              value={form.published_at}
              onChange={(e) => setForm((p) => ({ ...p, published_at: e.target.value }))}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:border-[#0369A1] cursor-pointer"
            />
            <p className="text-gray-400 text-xs mt-1.5 flex items-center gap-1">
              <i className="ri-information-line"></i>
              Data que aparece publicamente no site. A ordem de exibição segue esta data.
            </p>
          </div>

          {/* Imagem de capa */}
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-1.5">Imagem de Capa</label>
            {imagePreview && (
              <div className="relative mb-3 rounded-xl overflow-hidden w-full h-40">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button type="button" onClick={() => { setImagePreview(null); setForm((p) => ({ ...p, image_url: "" })); }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center cursor-pointer hover:bg-red-600">
                  <i className="ri-close-line text-sm"></i>
                </button>
              </div>
            )}
            <div className="flex gap-2 flex-wrap">
              <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} className="hidden" />
              <button type="button" onClick={() => imageInputRef.current?.click()} disabled={uploadingImage}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60">
                {uploadingImage
                  ? <><span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span><span className="hidden sm:inline"> Enviando...</span></>
                  : <><i className="ri-upload-cloud-line"></i><span className="hidden sm:inline"> Fazer upload</span></>}
              </button>
              <input type="text" value={form.image_url}
                onChange={(e) => { setForm((p) => ({ ...p, image_url: e.target.value })); setImagePreview(e.target.value || null); }}
                placeholder="Ou cole a URL da imagem..."
                className="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 text-sm focus:outline-none focus:border-[#0369A1]" />
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
            <label className="block text-gray-700 text-sm font-semibold mb-1.5">Resumo (aparece nos cards)</label>
            <textarea value={form.summary} onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))}
              rows={2} maxLength={500} placeholder="Breve resumo da notícia..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none resize-none" />
          </div>

          {/* Conteúdo */}
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-1.5">Conteúdo completo</label>
            <textarea value={form.content} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
              rows={8} placeholder="Conteúdo completo da notícia..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none resize-none" />
          </div>

          {/* Destaque */}
          <div className="flex items-center gap-3">
            <input type="checkbox" id="featured-admin" checked={form.featured}
              onChange={(e) => setForm((p) => ({ ...p, featured: e.target.checked }))}
              className="w-4 h-4 cursor-pointer accent-[#0369A1]" />
            <label htmlFor="featured-admin" className="text-gray-700 text-sm font-medium cursor-pointer">
              Destaque na home — aparece no carrossel principal
            </label>
          </div>

          <div className="flex gap-3 pt-2 flex-wrap">
            <button type="submit" disabled={saving}
              className="px-6 py-3 text-white font-semibold text-sm rounded-xl hover:opacity-90 transition-all cursor-pointer whitespace-nowrap"
              style={{ background: "linear-gradient(135deg, #0369A1, #0EA5E9)" }}>
              {saving ? "Salvando..." : editing ? "Salvar alterações" : "Publicar Notícia"}
            </button>
            <button type="button" onClick={() => { setCreating(false); setEditing(null); setImagePreview(null); setSaveError(null); }}
              className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold text-sm rounded-xl hover:bg-gray-200 cursor-pointer whitespace-nowrap">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div>
      {/* Controles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filtro status */}
          <div className="flex rounded-xl bg-gray-100 p-1 gap-0.5">
            {[
              { value: "all", label: `Todas (${news.length})` },
              { value: "published", label: `Publicadas (${news.filter((n) => n.status === "published").length})` },
              { value: "draft", label: `Rascunhos (${news.filter((n) => n.status === "draft").length})` },
            ].map((opt) => (
              <button key={opt.value} onClick={() => setFilterStatus(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${filterStatus === opt.value ? "bg-white text-gray-800" : "text-gray-500 hover:text-gray-700"}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold rounded-xl cursor-pointer whitespace-nowrap shrink-0"
          style={{ background: "linear-gradient(135deg, #0369A1, #0EA5E9)" }}>
          <i className="ri-add-line"></i> Nova Notícia
        </button>
      </div>

      {/* Info sobre importância */}
      <div className="mb-4 p-3 rounded-xl flex items-start gap-2" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
        <i className="ri-information-line shrink-0 mt-0.5" style={{ color: "#0369A1" }}></i>
        <p className="text-xs" style={{ color: "#0369A1" }}>
          <strong>Prioridade de exibição:</strong> Use os botões de importância para controlar a ordem no feed do site. Notícias de <strong>Alta importância</strong> aparecem primeiro. Clique no ícone de estrela para destacar na home.
        </p>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
          <i className="ri-newspaper-line text-gray-200 text-4xl mb-3 block"></i>
          <p className="text-gray-400 font-semibold">Nenhuma notícia encontrada</p>
          <p className="text-gray-300 text-sm mt-1">Clique em &quot;Nova Notícia&quot; para começar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item, idx) => {
            const imp = importanceOptions.find((o) => o.value === (item.importance ?? "normal")) ?? importanceOptions[1];
            return (
              <div key={item.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex flex-col sm:flex-row gap-3 items-start">
                  {/* Thumbnail */}
                  {item.image_url && (
                    <div className="w-full sm:w-16 h-32 sm:h-14 md:w-20 md:h-16 rounded-xl overflow-hidden shrink-0">
                      <img src={item.image_url} alt={item.title} className="w-full h-full object-cover object-top" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0 w-full">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <span className="text-xs font-bold text-[#0369A1] uppercase tracking-wide">{item.category}</span>
                      <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: imp.color, background: imp.bg }}>
                        <i className={imp.icon}></i>
                        <span className="hidden sm:inline">{imp.label}</span>
                      </span>
                      {item.featured && (
                        <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 text-xs font-bold rounded-full border border-amber-100 flex items-center gap-1">
                          <i className="ri-star-fill text-xs"></i>
                          <span className="hidden sm:inline">Destaque</span>
                        </span>
                      )}
                    </div>

                    <p className="text-gray-800 font-semibold text-sm line-clamp-1">{item.title}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{formatDate(item.published_at)}</p>

                    <div className="flex items-center gap-1 mt-2 flex-wrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${item.status === "published" ? "text-green-600 bg-green-50 border-green-100" : "text-gray-400 bg-gray-50 border-gray-100"}`}>
                        {item.status === "published" ? "Publicado" : "Rascunho"}
                      </span>

                      {importanceOptions.map((opt) => (
                        <button key={opt.value} onClick={() => changeImportance(item, opt.value)} title={`Importância: ${opt.label}`}
                          className="w-6 h-6 flex items-center justify-center rounded-lg transition-all cursor-pointer"
                          style={item.importance === opt.value
                            ? { background: opt.bg, color: opt.color }
                            : { background: "transparent", color: "#D1D5DB" }}>
                          <i className={`${opt.icon} text-xs`}></i>
                        </button>
                      ))}

                      <button onClick={() => toggleFeatured(item)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg transition-all cursor-pointer"
                        style={item.featured ? { background: "#FEF3DC", color: "#D97706" } : { background: "#F9FAFB", color: "#9CA3AF" }}
                        title="Alternar destaque na home">
                        <i className={`${item.featured ? "ri-star-fill" : "ri-star-line"} text-sm`}></i>
                      </button>

                      <button onClick={() => toggleStatus(item)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 transition-all cursor-pointer"
                        title={item.status === "published" ? "Ocultar" : "Publicar"}>
                        <i className={`${item.status === "published" ? "ri-eye-off-line" : "ri-eye-line"} text-sm`}></i>
                      </button>

                      <button onClick={() => moveUp(item, idx)}
                        disabled={idx === 0}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 transition-all cursor-pointer disabled:opacity-30"
                        title="Mover para cima">
                        <i className="ri-arrow-up-line text-sm"></i>
                      </button>

                      <button onClick={() => moveDown(item, idx)}
                        disabled={idx === filtered.length - 1}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 transition-all cursor-pointer disabled:opacity-30"
                        title="Mover para baixo">
                        <i className="ri-arrow-down-line text-sm"></i>
                      </button>

                      <button onClick={() => openEdit(item)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#0369A1] transition-all cursor-pointer"
                        title="Editar notícia">
                        <i className="ri-edit-line text-sm"></i>
                      </button>

                      <button onClick={() => handleDelete(item)} disabled={deleting === item.id}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all cursor-pointer disabled:opacity-50"
                        title="Excluir notícia">
                        {deleting === item.id
                          ? <span className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></span>
                          : <i className="ri-delete-bin-line text-sm"></i>}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}