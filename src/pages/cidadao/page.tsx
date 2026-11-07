import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase, supabaseUrl, supabaseAnonKey, getEdgeFunctionUrl } from "@/lib/supabase";
import Navbar from "@/components/feature/Navbar";
import Footer from "@/components/feature/Footer";
import { getStoredUser, clearStoredUser, storeUser } from "@/hooks/useAuth";
import CidadaoChat from "@/pages/cidadao/components/CidadaoChat";
import PortfolioUploader from "@/pages/cidadao/components/PortfolioUploader";
import { playNotificationSound, getLastRead, setLastRead, getLastCheckTime, setLastCheckTime } from "@/hooks/useChatNotification";
import { PELOTAS_BG } from "@/components/feature/PainelSidebar";
import WeatherWidget from "@/components/feature/WeatherWidget";
import NotificationBell from "@/components/feature/NotificationBell";
import TourGuide from "@/components/feature/TourGuide";
import { useTour } from "@/hooks/useTour";
import { cidadaoTour } from "@/mocks/tours/cidadao-tour";

const USER_AVATARS = [
  "https://readdy.ai/api/search-image?query=professional%20headshot%20portrait%20of%20a%20confident%20young%20Brazilian%20adult%20with%20warm%20smile%2C%20plain%20light%20neutral%20gray%20background%2C%20soft%20studio%20lighting%2C%20realistic%20photo%20style%2C%20business%20casual%20clothing%2C%20high%20quality%20portrait&width=80&height=80&seq=cid-av1&orientation=squarish",
  "https://readdy.ai/api/search-image?query=professional%20portrait%20of%20a%20Brazilian%20person%20with%20dark%20hair%20and%20friendly%20expression%2C%20clean%20white%20minimalist%20background%2C%20natural%20soft%20lighting%2C%20realistic%20headshot%2C%20smart%20casual%20top&width=80&height=80&seq=cid-av2&orientation=squarish",
  "https://readdy.ai/api/search-image?query=professional%20headshot%20of%20a%20young%20adult%20with%20curly%20hair%20and%20neutral%20expression%2C%20plain%20beige%20background%2C%20soft%20diffused%20lighting%2C%20realistic%20photo%2C%20business%20casual%20attire&width=80&height=80&seq=cid-av3&orientation=squarish",
  "https://readdy.ai/api/search-image?query=professional%20portrait%20of%20a%20person%20with%20glasses%20and%20calm%20confident%20expression%2C%20clean%20light%20gray%20studio%20background%2C%20realistic%20high%20quality%20headshot%2C%20formal%20smart%20casual%20shirt&width=80&height=80&seq=cid-av4&orientation=squarish",
  "https://readdy.ai/api/search-image?query=professional%20headshot%20of%20a%20smiling%20adult%20with%20short%20hair%2C%20plain%20off-white%20background%2C%20natural%20window%20lighting%2C%20realistic%20photo%20style%2C%20professional%20attire%2C%20high%20resolution&width=80&height=80&seq=cid-av5&orientation=squarish",
  "https://readdy.ai/api/search-image?query=professional%20portrait%20of%20a%20young%20professional%20with%20straight%20hair%20and%20serene%20expression%2C%20light%20neutral%20background%2C%20soft%20studio%20lighting%2C%20realistic%20headshot%2C%20smart%20casual%20clothing&width=80&height=80&seq=cid-av6&orientation=squarish",
];

function getUserAvatar(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) & 0xffffffff;
  }
  return USER_AVATARS[Math.abs(hash) % USER_AVATARS.length];
}

function compressChatImage(file: File, maxW = 800, maxH = 800, quality = 0.7): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > maxW) { h = Math.round(h * (maxW / w)); w = maxW; }
        if (h > maxH) { w = Math.round(w * (maxH / h)); h = maxH; }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Falha ao processar imagem"));
        }, "image/jpeg", quality);
      };
      img.onerror = () => reject(new Error("Falha ao processar imagem"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Falha ao ler arquivo"));
    reader.readAsDataURL(file);
  });
}

interface Demand {
  id: number;
  type: string;
  title: string;
  category: string;
  status: string;
  created_at: string;
  updated_at: string;
  description: string;
  admin_notes: string | null;
  assessor_id: string | null;
  assessor_name: string | null;
  assessor_notes: string | null;
  citizen_name: string | null;
  citizen_email: string | null;
  citizen_phone: string | null;
  citizen_neighborhood: string | null;
}

interface Profile {
  id: string;
  full_name: string | null;
  display_name: string | null;
  phone: string | null;
  neighborhood: string | null;
  job_status: string | null;
  curriculo_pdf: string | null;
  education: string | null;
  expertise: string | null;
  job_type: string | null;
  profile_photo: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_employed: boolean | null;
  employment_survey_completed: boolean | null;
  wants_opportunities: boolean | null;
  employed_through_platform: boolean | null;
  platform_job_details: string | null;
  is_service_provider: boolean | null;
  service_categories: string | null;
  service_description: string | null;
  portfolio_photos: string | null;
  worker_profile_type: string | null;
}

interface Vaga {
  id: number;
  title: string;
  area: string | null;
  type: string;
  location: string | null;
  salary: string | null;
  description: string | null;
  requirements: string | null;
  status: string;
  company_name: string | null;
  created_at: string;
}

interface ChatMsg {
  id: number;
  chat_id: number;
  sender_role: string;
  sender_id: string | null;
  sender_name: string | null;
  message: string | null;
  image_url: string | null;
  image_data: string | null;
  created_at: string;
}

interface Chat {
  id: number;
  status: string;
  citizen_name: string | null;
  assessor_name: string | null;
  created_at: string;
  expires_at: string;
}

type Tab = "demandas" | "mensagens" | "vagas" | "perfil";

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  aberto: { label: "Em Aberto", color: "text-amber-600", bg: "bg-amber-50 border-amber-100" },
  em_andamento: { label: "Em Andamento", color: "text-[#1B2A5E]", bg: "bg-[#E8FAFB] border-[#E8FAFB]" },
  aguardando_externa: { label: "Ag. Resp. Ext.", color: "text-purple-600", bg: "bg-purple-50 border-purple-100" },
  finalizada: { label: "Finalizada", color: "text-green-600", bg: "bg-green-50 border-green-100" },
};

const typeLabel: Record<string, string> = {
  requerimento: "Requerimento",
  sugestao: "Sugestão de Projeto",
  contato: "Contato",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" });
}

export default function CidadaoPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [demands, setDemands] = useState<Demand[]>([]);
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [chat, setChat] = useState<Chat | null>(null);
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [showImageInput, setShowImageInput] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Demand | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>((searchParams.get("tab") as Tab) || "demandas");
  const [demandsFilter, setDemandsFilter] = useState<"all" | "requerimento" | "sugestao">("all");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");
  const [savingProfileModal, setSavingProfileModal] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [profileForm, setProfileForm] = useState({ full_name: "", phone: "", neighborhood: "", bio: "", education: "", expertise: "", job_type: "", job_status: "looking", curriculo_pdf: "", is_employed: null as boolean | null, is_service_provider: false, service_categories: "", service_description: "", portfolio_photos: "", worker_profile_type: "" as string });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const curriculoFileRef = useRef<HTMLInputElement>(null);
  const profilePhotoRef = useRef<HTMLInputElement>(null);
  const [curriculoError, setCurriculoError] = useState<string | null>(null);
  const [uploadingProfilePhoto, setUploadingProfilePhoto] = useState(false);
  const [profilePhotoMsg, setProfilePhotoMsg] = useState("");
  const userIdRef = useRef<string | null>(null);
  const [newChatLoading, setNewChatLoading] = useState(false);
  const [newChatError, setNewChatError] = useState<string | null>(null);
  const [mensagensUnread, setMensagensUnread] = useState(0);
  const lastMsgCheckRef = useRef<string>("");
  const currentTabRef = useRef<Tab>("demandas");

  // Tour guiado — primeiro acesso pós-cadastro dispara automaticamente
  const tour = useTour(cidadaoTour, true);

  // Ao finalizar tour — fica no painel do cidadão (oportunidades só se quis)
  const handleTourFinished = () => {
    // Não redireciona: o cidadão acabou de chegar, deixa ele explorar o painel
  };

  const getAvatarUrl = (profile?: Profile | null) => {
    if (profile?.avatar_url) return profile.avatar_url;
    if (profile?.profile_photo) return profile.profile_photo;
    return null;
  };

  async function uploadCurriculoPDF(file: File, userId: string): Promise<string | null> {
    setCurriculoError(null);
    try {
      const edgeFnUrl = getEdgeFunctionUrl("upload-curriculo");
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("userId", userId);
      const fnRes = await fetch(edgeFnUrl, { method: "POST", headers: { apikey: supabaseAnonKey }, body: uploadFormData });
      if (!fnRes.ok) { setCurriculoError("Erro ao enviar currículo. Tente novamente."); return null; }
      const result = await fnRes.json();
      if (!result.success || !result.url) { setCurriculoError(result.error || "Erro ao processar currículo."); return null; }
      return result.url;
    } catch (err) {
      setCurriculoError("Falha de conexão. Verifique sua internet e tente novamente.");
      return null;
    }
  }

  const [storedUser, setStoredUser] = useState<ReturnType<typeof getStoredUser>>(null);

  const loadDemands = useCallback(async (userId: string) => {
    setLoadError(null);
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke("get-demands", { body: { citizen_id: userId } });

      if (!fnError && Array.isArray(fnData)) {
        setDemands(fnData as Demand[]);
        setSelected((prev) => {
          if (!prev) return null;
          const fresh = (fnData as Demand[]).find((d: Demand) => d.id === prev.id);
          return fresh ?? prev;
        });
        return;
      }

      const { data, error } = await supabase
        .from("demands")
        .select("*")
        .eq("citizen_id", userId)
        .order("created_at", { ascending: false });

      if (!error && data && Array.isArray(data)) {
        setDemands(data as Demand[]);
        setSelected((prev) => {
          if (!prev) return null;
          const fresh = (data as Demand[]).find((d) => d.id === prev.id);
          return fresh ?? prev;
        });
        return;
      }

      setLoadError("Não foi possível carregar suas demandas. Tente novamente.");
    } catch (err) {
      setLoadError("Falha ao carregar suas demandas. Verifique sua conexão.");
    }
  }, []);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) { navigate("/auth?from=/cidadao"); return; }
    if (stored.role !== "citizen") { navigate("/auth"); return; }
    const u = { id: stored.id, email: stored.email };
    setUser(u);
    setStoredUser(stored);
    userIdRef.current = stored.id;

    (async () => {
      let prof: Profile | null = null;
      try {
        const { data: profData } = await supabase.from("profiles").select("*").eq("id", u.id).maybeSingle();
        prof = profData as Profile;
      } catch (_) { /* perfil opcional */ }

      const { data: vagasData } = await supabase.from("vagas").select("*").eq("status", "active").order("created_at", { ascending: false });

      const effectiveProfile: Profile = prof ?? {
        id: stored.id,
        full_name: stored.full_name,
        display_name: stored.display_name,
        phone: null,
        neighborhood: null,
        job_status: "looking",
        curriculo_pdf: null,
        education: null,
        expertise: null,
        job_type: null,
        bio: null,
        avatar_url: stored.avatar_url || null,
        profile_photo: null,
      };
      setProfile(effectiveProfile);
      setProfileForm({
        full_name: effectiveProfile.full_name ?? "",
        phone: effectiveProfile.phone ?? "",
        neighborhood: effectiveProfile.neighborhood ?? "",
        bio: effectiveProfile.bio ?? "",
        education: effectiveProfile.education ?? "",
        expertise: effectiveProfile.expertise ?? "",
        job_type: effectiveProfile.job_type ?? "",
        job_status: effectiveProfile.job_status ?? "looking",
        curriculo_pdf: effectiveProfile.curriculo_pdf ?? "",
        is_employed: effectiveProfile.is_employed ?? null,
        is_service_provider: effectiveProfile.is_service_provider ?? false,
        service_categories: effectiveProfile.service_categories ?? "",
        service_description: effectiveProfile.service_description ?? "",
        portfolio_photos: effectiveProfile.portfolio_photos ?? "",
        worker_profile_type: effectiveProfile.worker_profile_type ?? "",
      });
      setVagas((vagasData as Vaga[]) ?? []);
      await loadDemands(u.id);

      const { data: chatData } = await supabase
        .from("mensagens_chat")
        .select("*")
        .eq("citizen_id", u.id)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (chatData) {
        setChat(chatData as Chat);
        const { data: msgs } = await supabase
          .from("mensagens_chat_items")
          .select("*")
          .eq("chat_id", (chatData as Chat).id)
          .order("created_at", { ascending: true });
        setChatMsgs((msgs as ChatMsg[]) ?? []);
      }
      setLoading(false);
    })();
  }, [navigate, loadDemands]);

  useEffect(() => {
    if (!user) return;
    const userId = user.id;

    const stored = getLastCheckTime(`cidadao_notif_${userId}`);
    lastMsgCheckRef.current = stored === new Date(0).toISOString() ? stored : stored;

    const checkNewMsgs = async () => {
      const checkTime = lastMsgCheckRef.current;
      const nowIso = new Date().toISOString();

      try {
        const { data: newMsgs } = await supabase
          .from("mensagens_chat_items")
          .select("id, chat_id, sender_role")
          .gt("created_at", checkTime)
          .neq("sender_role", "citizen")
          .order("created_at", { ascending: true });

        if (newMsgs && newMsgs.length > 0) {
          let newCount = 0;
          (newMsgs as { id: number; chat_id: number }[]).forEach((m) => {
            const lastRead = getLastRead(`cidadao_${userId}`, m.chat_id);
            if (m.id > lastRead) newCount++;
          });
          if (newCount > 0 && currentTabRef.current !== "mensagens") {
            setMensagensUnread((prev) => prev + newCount);
            playNotificationSound();
          }
        }
      } catch (_) { /* ignora erros de polling */ }

      lastMsgCheckRef.current = nowIso;
      setLastCheckTime(`cidadao_notif_${userId}`, nowIso);
    };

    checkNewMsgs();
    // Realtime + polling 30s como fallback de segurança
    const interval = setInterval(checkNewMsgs, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Polling 30s como fallback de segurança para mensagens do chat (Realtime no CidadaoChat cobre os updates)
  useEffect(() => {
    if (loading || !chat || chat.status === "closed") return;
    const interval = setInterval(async () => {
      if (!chat) return;
      const { data: freshMsgs } = await supabase
        .from("mensagens_chat_items")
        .select("*")
        .eq("chat_id", chat.id)
        .order("created_at", { ascending: true });
      if (freshMsgs) {
        setChatMsgs((prev) => {
          const fresh = freshMsgs as ChatMsg[];
          if (fresh.length !== prev.length) return fresh;
          return prev;
        });
      }
      const { data: freshChat } = await supabase
        .from("mensagens_chat")
        .select("*")
        .eq("id", chat.id)
        .maybeSingle();
      if (freshChat) {
        setChat((prev) => {
          const fc = freshChat as Chat;
          if (prev && prev.status !== fc.status) return fc;
          return prev;
        });
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [loading, chat]);

  // Realtime: atualiza demandas do cidadão automaticamente quando assessor muda status (R2 fix)
  useEffect(() => {
    if (loading || !userIdRef.current) return;
    const userId = userIdRef.current;
    const channel = supabase
      .channel("cidadao-demands-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "demands", filter: `citizen_id=eq.${userId}` },
        () => { loadDemands(userId); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loading, loadDemands]);

  // Polling fallback de segurança (30s): se o realtime falhar, o polling garante demands atualizadas
  useEffect(() => {
    if (loading || !userIdRef.current) return;
    const userId = userIdRef.current;
    const interval = setInterval(() => {
      try { loadDemands(userId); } catch (e) { console.error("[Cidadao] Polling demands fallback erro:", e); }
    }, 30000);
    return () => clearInterval(interval);
  }, [loading, loadDemands]);

  // Sync activeTab with URL params (supports notification redirects)
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab") as Tab | null;
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  // Handle ?selected= from notification redirects — abre a demanda específica
  useEffect(() => {
    if (loading) return;
    const selId = searchParams.get("selected");
    if (selId && demands.length > 0) {
      const d = demands.find((d) => String(d.id) === selId);
      if (d) setSelected(d);
    }
  }, [loading, demands, searchParams]);

  // Realtime: atualiza vagas automaticamente quando empresa publica/edita/exclui
  useEffect(() => {
    if (loading) return;
    const channel = supabase
      .channel("cidadao-vagas-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vagas" },
        async () => {
          const { data } = await supabase
            .from("vagas")
            .select("*")
            .eq("status", "active")
            .order("created_at", { ascending: false });
          if (data) setVagas(data as Vaga[]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loading]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMsgs]);

  const openNewChat = async () => {
    if (!user) return;
    setNewChatLoading(true);
    setNewChatError(null);
    try {
      const { data, error } = await supabase.from("mensagens_chat").insert({
        citizen_id: user.id,
        citizen_name: profile?.full_name ?? user.email,
        status: "open",
      }).select().maybeSingle();
      if (!error && data) {
        setChat(data as Chat);
        setChatMsgs([]);
      } else if (error) {
        setNewChatError("Falha ao iniciar conversa. Tente novamente.");
      }
    } catch (err) {
      setNewChatError("Falha ao iniciar conversa. Tente novamente.");
    } finally {
      setNewChatLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !chat) return;

    if (!file.type.startsWith("image/")) {
      setNewChatError("Por favor, selecione um arquivo de imagem.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setNewChatError("A imagem deve ter no máximo 5MB.");
      return;
    }

    setUploadingImage(true);
    setNewChatError(null);

    try {
      const compressedBlob = await compressChatImage(file, 300, 300, 0.4);
      const uniqueId = Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
      const storagePath = `chat_${chat.id}/${uniqueId}.jpg`;

      const { data: { session: s } } = await supabase.auth.getSession();
      const token = s?.access_token || supabaseAnonKey;

      const formData = new FormData();
      formData.append("file", compressedBlob, `${uniqueId}.jpg`);

      const fbRes = await fetch(`${supabaseUrl}/storage/v1/object/chat-images/${storagePath}`, {
        method: "POST",
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${token}`,
          "x-upsert": "true",
        },
        body: formData,
      });

      if (!fbRes.ok) {
        const { error: uploadErr } = await supabase.storage
          .from("chat-images")
          .upload(storagePath, compressedBlob, {
            contentType: "image/jpeg",
            cacheControl: "public, max-age=31536000, immutable",
            upsert: true,
            resumable: false,
          });

        if (uploadErr) {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error("Falha ao ler imagem"));
            reader.readAsDataURL(compressedBlob);
          });
          setImageUrl(dataUrl);
          setShowImageInput(true);
          return;
        }
      }

      const { data: urlData } = supabase.storage.from("chat-images").getPublicUrl(storagePath);
      const publicUrl = urlData?.publicUrl || `${supabaseUrl}/storage/v1/object/public/chat-images/${storagePath}`;
      setImageUrl(publicUrl);
      setShowImageInput(true);

    } catch (err) {
      setImageUrl("");
      setShowImageInput(false);
      setNewChatError("Falha ao processar imagem. Tente novamente.");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const sendMessage = useCallback(async () => {
    const hasText = newMsg.trim().length > 0;
    const hasImage = imageUrl.trim().length > 0;
    if ((!hasText && !hasImage) || !chat || !user || sendingMsg) return;

    const finalImage = hasImage ? imageUrl.trim() : null;
    const isStorageUrl = finalImage && (finalImage.startsWith("http://") || finalImage.startsWith("https://"));

    setSendingMsg(true);
    setSendError(null);
    try {
      const payload: Record<string, unknown> = {
        chat_id: chat.id,
        sender_role: "citizen",
        sender_id: user.id,
        sender_name: profile?.full_name ?? user.email,
        message: hasText ? newMsg.trim() : "",
      };
      if (finalImage) {
        if (isStorageUrl) {
          payload.image_url = finalImage;
        } else {
          payload.image_data = finalImage;
        }
      }

      const { data, error } = await supabase.from("mensagens_chat_items")
        .insert(payload)
        .select()
        .maybeSingle();

      if (error) {
        setSendError(error.message?.includes("payload") || error.message?.includes("large")
          ? "Imagem muito grande. Tente uma foto menor."
          : "Falha ao enviar mensagem. Tente novamente.");
        return;
      }

      if (data) {
        setChatMsgs((prev) => [...prev, data as ChatMsg]);
        setNewMsg("");
        setImageUrl("");
        setShowImageInput(false);
        setSendError(null);
      }
    } catch (err) {
      setSendError("Falha ao enviar. Verifique sua conexão.");
    } finally {
      setSendingMsg(false);
    }
  }, [newMsg, imageUrl, chat, user, profile, sendingMsg]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfileModal('saving');
    setProfileMsg("");

    // Determina wants_opportunities com base no job_status E currículo
    // Quer oportunidades se NÃO marcou "não procuro" OU se tem currículo
    const wantsOpp = profileForm.job_status !== "not_looking" || !!profileForm.curriculo_pdf;

    const { error } = await supabase.from("profiles").update({
      full_name: profileForm.full_name,
      phone: profileForm.phone,
      neighborhood: profileForm.neighborhood,
      bio: profileForm.bio,
      education: profileForm.education,
      expertise: profileForm.expertise,
      job_type: profileForm.job_status !== "not_looking" ? profileForm.job_type : null,
      job_status: profileForm.job_status,
      curriculo_pdf: profileForm.curriculo_pdf || null,
      is_employed: profileForm.is_employed,
      wants_opportunities: wantsOpp,
      employment_survey_completed: true,
      is_service_provider: profileForm.is_service_provider ?? undefined,
      service_categories: profileForm.service_categories ?? undefined,
      service_description: profileForm.service_description ?? undefined,
      portfolio_photos: profileForm.portfolio_photos ?? undefined,
      worker_profile_type: profileForm.worker_profile_type ?? undefined,
    }).eq("id", user.id);
    setSavingProfile(false);
    if (error) { setSavingProfileModal('idle'); setProfileMsg("Erro ao salvar. Tente novamente."); return; }
    setSavingProfileModal('saved');
    const updatedProfile = { ...profile, ...profileForm, wants_opportunities: wantsOpp } as Profile;
    setProfile(updatedProfile);
    const stored = getStoredUser();
    if (stored) {
      storeUser({
        ...stored,
        full_name: profileForm.full_name || stored.full_name,
        display_name: profileForm.full_name?.split(" ")[0] || stored.display_name,
      });
    }
    setTimeout(() => { setSavingProfileModal('idle'); setProfileMsg("success"); }, 2500);
  };

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } catch (_) { /* ignore */ }
    clearStoredUser();
    Object.keys(localStorage).forEach((k) => { if (k.startsWith("sb-") || k.includes("supabase")) localStorage.removeItem(k); });
    Object.keys(sessionStorage).forEach((k) => { if (k.startsWith("sb-") || k.includes("supabase")) sessionStorage.removeItem(k); });
    navigate("/");
  };

  const filteredDemands = demands.filter((d) => demandsFilter === "all" || d.type === demandsFilter);

  // Só mostra a aba de vagas se o cidadão quer oportunidades
  const citizenWantsOpportunities = profile?.wants_opportunities !== false && profile?.job_status !== "not_looking";

  const navItems: { key: Tab; icon: string; label: string }[] = [
    { key: "demandas", icon: "ri-file-list-line", label: "Demandas" },
    { key: "mensagens", icon: "ri-chat-3-line", label: "Mensagens" },
    ...(citizenWantsOpportunities ? [{ key: "vagas" as Tab, icon: "ri-briefcase-4-line", label: "Vagas de Emprego" }] : []),
    { key: "perfil", icon: "ri-user-line", label: "Meu Perfil" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F4F0] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#1B2A5E] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (loadError && demands.length === 0) {
    return (
      <div className="min-h-screen bg-[#F5F4F0]">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="max-w-6xl mx-auto px-4 md:px-6">
            <div className="bg-white rounded-2xl border border-red-100 p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <i className="ri-error-warning-line text-red-500 text-2xl"></i>
              </div>
              <h2 className="text-gray-900 font-extrabold text-lg mb-2">Erro ao carregar dados</h2>
              <p className="text-gray-500 text-sm mb-6">{loadError}</p>
              <button
                onClick={() => { if (userIdRef.current) loadDemands(userIdRef.current); }}
                className="px-6 py-2.5 text-white font-bold text-sm rounded-xl transition-all cursor-pointer whitespace-nowrap"
                style={{ background: "linear-gradient(135deg, #1B2A5E, #3BBFD4)" }}
              >
                <i className="ri-refresh-line mr-2"></i>Tentar novamente
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F4F0]">
      <Navbar />
      <main className="pt-20 pb-24 md:pb-16">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          {/* Header com banner */}
          <div className="relative overflow-hidden rounded-2xl mb-6">
            <img src={PELOTAS_BG} alt="Pelotas" className="absolute inset-0 w-full h-full object-cover object-center" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(13,22,41,0.90) 0%, rgba(27,42,94,0.80) 100%)" }}></div>
            <div className="relative z-10 p-4 md:p-6">
              <div className="flex items-center justify-between gap-3" data-tour="cidadao-header">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0" style={{ border: "2px solid rgba(59,191,212,0.50)" }}>
                    {getAvatarUrl(profile) ? (
                      <img
                        src={getAvatarUrl(profile)!}
                        alt={profile?.display_name || profile?.full_name || storedUser?.display_name || "Cidadão"}
                        className="w-full h-full object-cover object-top"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: "rgba(59,191,212,0.15)" }}>
                        <i className="ri-user-line" style={{ color: "#3BBFD4", fontSize: "20px" }}></i>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-white/65 text-xs font-semibold uppercase tracking-widest mb-0.5">Área do Cidadão</p>
                    <h1 className="text-base md:text-xl font-extrabold text-white">
                      Olá, {profile?.display_name?.split(" ")[0] || profile?.full_name?.split(" ")[0] || storedUser?.display_name?.split(" ")[0] || storedUser?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "Cidadão"}!
                    </h1>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-white/55 text-xs">Vereador Arthur Halal · Pelotas/RS</p>
                      <span className="w-px h-2.5 bg-white/20 rounded-full hidden sm:inline"></span>
                      <WeatherWidget compact />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div data-tour="cidadao-notificacoes">
                    <NotificationBell userId={storedUser?.id ?? null} userRole={storedUser?.role ?? null} onNavigate={(path) => navigate(path)} />
                  </div>
                  <button onClick={handleLogout} className="w-9 h-9 flex items-center justify-center text-white/50 hover:text-white/80 rounded-xl transition-colors cursor-pointer shrink-0" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <i className="ri-logout-box-r-line text-lg"></i>
                  </button>
                </div>
              </div>
              <div className="flex gap-2 mt-2 flex-wrap">
                <Link to="/requerimento" id="cidadao-requerimento-btn" data-tour="cidadao-requerimento" className="flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer shrink-0" style={{ background: "rgba(232,160,32,0.25)", border: "1px solid rgba(232,160,32,0.35)" }}>
                  <i className="ri-file-add-line"></i> Novo Requerimento
                </Link>
                <Link to="/sugestao-projeto" id="cidadao-sugestao-btn" data-tour="cidadao-sugestao" className="flex items-center gap-1.5 px-3 py-1.5 text-white border border-white/20 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer shrink-0" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <i className="ri-lightbulb-line"></i> Sugerir Projeto
                </Link>
                {citizenWantsOpportunities && (
                <Link to="/sistema/painel/cidadao" id="cidadao-vagas-link-btn" data-tour="cidadao-vagas-link" className="flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer shrink-0" style={{ background: "rgba(59,191,212,0.25)", border: "1px solid rgba(59,191,212,0.40)" }}>
                  <i className="ri-briefcase-4-line"></i> Oportunidades
                </Link>
                )}
              </div>
            </div>
          </div>

          {/* Cards de resumo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Total", value: demands.length, icon: "ri-file-list-line", color: "text-[#1B2A5E]", bg: "bg-[#E8F0FF]" },
              { label: "Em Aberto", value: demands.filter((d) => (d.status ?? "aberto") === "aberto").length, icon: "ri-inbox-line", color: "text-amber-600", bg: "bg-amber-50" },
              { label: "Em Andamento", value: demands.filter((d) => (d.status ?? "aberto") === "em_andamento").length, icon: "ri-loader-4-line", color: "text-[#1B2A5E]", bg: "bg-[#E8FAFB]" },
              { label: "Finalizados", value: demands.filter((d) => (d.status ?? "aberto") === "finalizada").length, icon: "ri-checkbox-circle-line", color: "text-green-600", bg: "bg-green-50" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl p-4 border border-gray-100">
                <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-2`}>
                  <i className={`${s.icon} ${s.color} text-base`}></i>
                </div>
                <p className={`text-xl font-extrabold ${s.color}`}>{s.value}</p>
                <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Desktop tabs */}
          <div id="cidadao-tabs-bar" data-tour="cidadao-tabs" className="hidden md:flex bg-white rounded-2xl border border-gray-100 p-1 gap-1 mb-6 overflow-x-auto">
            {navItems.map((item) => {
              const isMensagens = item.key === "mensagens";
              const badgeCount = isMensagens ? mensagensUnread : 0;
              const handleTabClick = () => {
                setActiveTab(item.key as Tab);
                setSearchParams({ tab: item.key });
                currentTabRef.current = item.key as Tab;
                if (isMensagens) {
                  setMensagensUnread(0);
                  const nowIso = new Date().toISOString();
                  lastMsgCheckRef.current = nowIso;
                  if (user) {
                    setLastCheckTime(`cidadao_notif_${user.id}`, nowIso);
                    if (chat && chatMsgs.length > 0) {
                      setLastRead(`cidadao_${user.id}`, chat.id, chatMsgs[chatMsgs.length - 1].id);
                    }
                  }
                }
              };
              return (
                <button
                  key={item.key}
                  onClick={handleTabClick}
                  className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${activeTab === item.key ? "text-white" : "text-gray-500 hover:text-gray-700"}`}
                  style={activeTab === item.key ? { background: "linear-gradient(135deg, #1B2A5E, #3BBFD4)" } : {}}
                  {...(item.key === "vagas" ? { "data-tour": "cidadao-vagas" } : {})}
                >
                  <i className={`${item.icon} text-base`}></i>
                  {item.label}
                  {badgeCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold" style={{ background: "#EF4444", color: "white" }}>
                      {badgeCount > 9 ? "9+" : badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Mobile bottom nav */}
          <nav
            data-tour="cidadao-tabs"
            className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-1 py-1.5"
            style={{
              background: "rgba(255,255,255,0.97)",
              backdropFilter: "blur(16px)",
              borderTop: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            {navItems.map((item) => {
              const isMensagens = item.key === "mensagens";
              const badgeCount = isMensagens ? mensagensUnread : 0;
              const isActive = activeTab === item.key;
              const handleTabClick = () => {
                setActiveTab(item.key as Tab);
                setSearchParams({ tab: item.key });
                currentTabRef.current = item.key as Tab;
                if (isMensagens) {
                  setMensagensUnread(0);
                  const nowIso = new Date().toISOString();
                  lastMsgCheckRef.current = nowIso;
                  if (user) {
                    setLastCheckTime(`cidadao_notif_${user.id}`, nowIso);
                    if (chat && chatMsgs.length > 0) {
                      setLastRead(`cidadao_${user.id}`, chat.id, chatMsgs[chatMsgs.length - 1].id);
                    }
                  }
                }
              };
              return (
                <button
                  key={item.key}
                  onClick={handleTabClick}
                  className="relative flex flex-col items-center justify-center py-1.5 px-1 min-w-[56px] cursor-pointer"
                  {...(item.key === "vagas" ? { "data-tour": "cidadao-vagas" } : {})}
                >
                  <div className="relative">
                    <span
                      className="w-5 h-5 flex items-center justify-center"
                      style={{ color: isActive ? "#1B2A5E" : "rgba(0,0,0,0.40)" }}
                    >
                      <i className={`${item.icon} text-lg`}></i>
                    </span>
                    {badgeCount > 0 && (
                      <span
                        className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 flex items-center justify-center rounded-full text-[10px] font-black px-1"
                        style={{ background: "#EF4444", color: "#fff", border: "1.5px solid #fff" }}
                      >
                        {badgeCount > 9 ? "9+" : badgeCount}
                      </span>
                    )}
                  </div>
                  <span
                    className="text-[10px] font-semibold mt-0.5 truncate max-w-[60px]"
                    style={{ color: isActive ? "#1B2A5E" : "rgba(0,0,0,0.40)" }}
                  >
                    {item.label}
                  </span>
                  {isActive && (
                    <div
                      className="absolute bottom-0 w-6 h-0.5 rounded-full"
                      style={{ background: "#1B2A5E" }}
                    ></div>
                  )}
                </button>
              );
            })}
          </nav>

          {/* DEMANDAS */}
          {activeTab === "demandas" && (
            <div id="cidadao-demandas-section" className="grid lg:grid-cols-5 gap-5">
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="p-4 border-b border-gray-100" data-tour="cidadao-demandas">
                    <div className="flex rounded-xl bg-gray-50 p-1 gap-0.5">
                      {[{ key: "all", label: "Todos" }, { key: "requerimento", label: "Requer." }, { key: "sugestao", label: "Sugestões" }].map((t) => (
                        <button key={t.key} onClick={() => setDemandsFilter(t.key as typeof demandsFilter)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${demandsFilter === t.key ? "text-white" : "text-gray-500 hover:text-gray-700"}`}
                          style={demandsFilter === t.key ? { background: "linear-gradient(135deg, #1B2A5E, #3BBFD4)" } : {}}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="divide-y divide-gray-50 max-h-[520px] overflow-y-auto">
                    {filteredDemands.length === 0 ? (
                      <div className="p-8 text-center">
                        {loadError ? (
                          <>
                            <i className="ri-error-warning-line text-red-200 text-3xl mb-3 block"></i>
                            <p className="text-red-500 text-sm font-semibold mb-3">{loadError}</p>
                            <button
                              onClick={() => { if (userIdRef.current) loadDemands(userIdRef.current); }}
                              className="px-5 py-2 text-white text-sm font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap"
                              style={{ background: "linear-gradient(135deg, #1B2A5E, #3BBFD4)" }}
                            >
                              <i className="ri-refresh-line mr-2"></i>Tentar novamente
                            </button>
                          </>
                        ) : (
                          <>
                            <i className="ri-file-list-3-line text-gray-200 text-3xl mb-3 block"></i>
                            <p className="text-gray-400 text-sm">Nenhuma demanda</p>
                            <Link to="/requerimento" className="text-sm font-semibold mt-2 inline-block hover:underline cursor-pointer" style={{ color: "#3BBFD4" }}>Enviar requerimento</Link>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="md:divide-y divide-gray-50">
                        {filteredDemands.map((d) => {
                          const sc = statusConfig[d.status] ?? statusConfig.aberto;
                          return (
                            <button key={d.id} onClick={() => setSelected(selected?.id === d.id ? null : d)}
                              className={`w-full text-left p-4 hover:bg-gray-50 transition-colors cursor-pointer ${selected?.id === d.id ? "bg-blue-50/40" : ""} md:block`}>
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500 font-mono">#{d.id}</span>
                                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#3BBFD4" }}>{typeLabel[d.type] ?? d.type}</span>
                                </div>
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${sc.color} ${sc.bg} whitespace-nowrap`}>{sc.label}</span>
                              </div>
                              <p className="text-gray-800 font-semibold text-sm leading-snug line-clamp-2">{d.title}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <p className="text-gray-400 text-xs">{formatDate(d.created_at)}</p>
                                {d.assessor_name && (
                                  <span className="text-xs flex items-center gap-1" style={{ color: "#1B2A5E" }}>
                                    <i className="ri-shield-user-line text-xs"></i>
                                    {d.assessor_name}
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="lg:col-span-3">
                {selected ? (
                  <CidadaoDemandDetail demand={selected} onClose={() => setSelected(null)} />
                ) : (
                  <div className="bg-white rounded-2xl border border-dashed border-gray-200 flex items-center justify-center" style={{ minHeight: "380px" }}>
                    <div className="text-center p-8">
                      <i className="ri-file-search-line text-gray-200 text-4xl mb-3 block"></i>
                      <p className="text-gray-400 font-semibold">Selecione uma demanda</p>
                      <p className="text-gray-300 text-sm mt-1">para ver os detalhes e o acompanhamento</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MENSAGENS */}
          {activeTab === "mensagens" && user && (
            <div id="cidadao-chat-section" data-tour="cidadao-chat">
              <CidadaoChat
                userId={user.id}
                userName={user.email}
                profileFullName={profile?.full_name ?? null}
              />
            </div>
          )}

          {/* VAGAS */}
          {activeTab === "vagas" && (
            <div>
              <div className="mb-5 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-xl font-extrabold text-gray-900">Vagas de Emprego</h2>
                  <p className="text-gray-500 text-sm mt-0.5">{vagas.length} vagas disponíveis em Pelotas</p>
                </div>
                <Link to="/sistema/painel/cidadao" className="flex items-center gap-2 px-5 py-2.5 text-white text-sm font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer" style={{ background: "linear-gradient(135deg, #1B2A5E, #3BBFD4)" }}>
                  <i className="ri-user-star-line"></i> Candidatar-me a uma vaga
                </Link>
              </div>
              {vagas.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-gray-200 flex items-center justify-center py-16 text-center">
                  <div><i className="ri-briefcase-4-line text-gray-200 text-4xl mb-3 block"></i><p className="text-gray-400 font-semibold">Nenhuma vaga disponível no momento</p></div>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {vagas.map((vaga) => (
                    <div key={vaga.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-gray-200 transition-colors">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1"><h3 className="text-gray-900 font-bold text-base leading-snug">{vaga.title}</h3><p className="text-sm font-medium mt-0.5" style={{ color: "#3BBFD4" }}>{vaga.company_name ?? "Empresa"}</p></div>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-600 border border-green-100 whitespace-nowrap">Ativa</span>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {vaga.area && <span className="flex items-center gap-1 text-xs text-gray-500"><i className="ri-list-check" style={{ color: "#3BBFD4" }}></i>{vaga.area}</span>}
                        <span className="flex items-center gap-1 text-xs text-gray-500"><i className="ri-map-pin-line" style={{ color: "#3BBFD4" }}></i>{vaga.location ?? "Pelotas/RS"}</span>
                        <span className="flex items-center gap-1 text-xs text-gray-500"><i className="ri-file-text-line" style={{ color: "#3BBFD4" }}></i>{vaga.type}</span>
                        {vaga.salary && <span className="flex items-center gap-1 text-xs text-gray-500"><i className="ri-money-dollar-circle-line" style={{ color: "#3BBFD4" }}></i>{vaga.salary}</span>}
                      </div>
                      {vaga.description && <p className="text-gray-500 text-sm line-clamp-2 mb-3">{vaga.description}</p>}
                      {vaga.requirements && (<div className="p-3 bg-gray-50 rounded-xl"><p className="text-xs font-semibold text-gray-500 mb-1">Requisitos</p><p className="text-xs text-gray-600 line-clamp-2">{vaga.requirements}</p></div>)}
                      <div className="flex items-center justify-between mt-3"><p className="text-gray-300 text-xs">{formatDate(vaga.created_at)}</p><Link to="/sistema/painel/cidadao" className="text-xs font-semibold hover:underline cursor-pointer" style={{ color: "#3BBFD4" }}>Ver e candidatar-se →</Link></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PERFIL */}
          {activeTab === "perfil" && (
            <div className="max-w-xl">
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="p-5 border-b border-gray-100">
                  <h2 className="text-gray-900 font-extrabold text-lg">Meu Perfil</h2>
                  <p className="text-gray-500 text-sm mt-0.5">Mantenha seus dados atualizados para que empresas possam te encontrar</p>
                </div>
                <form onSubmit={saveProfile} className="p-5 space-y-4">
                  {profileMsg === "success" && (<div className="p-3 rounded-xl text-green-600 text-sm flex items-center gap-2 bg-green-50 border border-green-100"><i className="ri-checkbox-circle-line"></i> Perfil salvo com sucesso!</div>)}
                  {profileMsg && profileMsg !== "success" && (<div className="p-3 rounded-xl text-red-500 text-sm flex items-center gap-2 bg-red-50 border border-red-100"><i className="ri-error-warning-line"></i> {profileMsg}</div>)}
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center bg-gray-100 cursor-pointer hover:opacity-80 transition-opacity" style={{ border: "2px solid #E8FAFB" }} onClick={() => profilePhotoRef.current?.click()}>
                      {getAvatarUrl(profile) ? (<img src={getAvatarUrl(profile)!} alt="Foto" className="w-full h-full object-cover object-top" />) : (<i className="ri-user-line text-2xl text-gray-300"></i>)}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-semibold">Foto de perfil</p>
                      <button type="button" onClick={() => profilePhotoRef.current?.click()} className="text-xs font-semibold cursor-pointer whitespace-nowrap" style={{ color: "#3BBFD4" }}>{getAvatarUrl(profile) ? "Trocar foto" : "Adicionar foto"}</button>
                    </div>
                    <input ref={profilePhotoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !user) return;
                      if (file.size > 5 * 1024 * 1024) { setProfilePhotoMsg("Erro: máximo 5MB"); return; }
                      setUploadingProfilePhoto(true);
                      setProfilePhotoMsg("");
                      try {
                        const edgeFnUrl = getEdgeFunctionUrl("upload-profile-photo");
                        const uploadFormData = new FormData();
                        uploadFormData.append("file", file);
                        uploadFormData.append("userId", user.id);
                        const fnRes = await fetch(edgeFnUrl, { method: "POST", headers: { apikey: supabaseAnonKey }, body: uploadFormData });
                        if (!fnRes.ok) throw new Error("Falha ao enviar foto.");
                        const result = await fnRes.json();
                        if (!result.success || !result.url) throw new Error(result.error || "Falha ao processar foto.");
                        const publicUrl: string = result.url;
                        setProfile((prev) => prev ? { ...prev, avatar_url: publicUrl } : prev);
                        const stored = getStoredUser();
                        if (stored) storeUser({ ...stored, avatar_url: publicUrl });
                        setProfilePhotoMsg("Foto atualizada!");
                        setTimeout(() => setProfilePhotoMsg(""), 4000);
                      } catch (err) {
                        setProfilePhotoMsg(`Erro: ${err instanceof Error ? err.message : "Erro inesperado"}`);
                      } finally {
                        setUploadingProfilePhoto(false);
                        if (profilePhotoRef.current) profilePhotoRef.current.value = "";
                      }
                    }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Currículo</p>
                    <div className="flex items-center gap-3">
                      {profileForm.curriculo_pdf ? (<a href={profileForm.curriculo_pdf} target="_blank" rel="nofollow noopener noreferrer" className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E8FAFB] border border-[#E8FAFB] text-sm font-semibold hover:opacity-80 transition-opacity" style={{ color: "#1B2A5E" }}><i className="ri-file-pdf-line text-lg"></i><span className="truncate max-w-[200px]">Ver currículo</span></a>) : (<span className="text-xs text-gray-400">Nenhum currículo enviado</span>)}
                      <input ref={curriculoFileRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !user) return;
                        if (file.size > 5 * 1024 * 1024) { setCurriculoError("PDF deve ter no máximo 5MB."); return; }
                        setCurriculoError(null);
                        const url = await uploadCurriculoPDF(file, user.id);
                        if (url) { setProfileForm((p) => ({ ...p, curriculo_pdf: url })); setProfileMsg("Currículo enviado! Clique em Salvar Perfil."); }
                        else { setCurriculoError("Erro ao enviar currículo. Tente novamente."); }
                      }} />
                      <button type="button" onClick={() => curriculoFileRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap" style={{ background: "linear-gradient(135deg, #1B2A5E, #3BBFD4)", color: "white" }}><i className="ri-upload-cloud-line"></i>{profileForm.curriculo_pdf ? "Trocar PDF" : "Enviar PDF"}</button>
                    </div>
                    {curriculoError && (<p className="text-red-500 text-xs mt-1.5 flex items-center gap-1"><i className="ri-error-warning-line"></i> {curriculoError}</p>)}
                    <div className="mt-3 p-4 rounded-xl border border-[#E8FAFB] bg-[#E8FAFB]/30">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1B2A5E] to-[#3BBFD4] flex items-center justify-center shrink-0"><i className="ri-file-edit-line text-white text-sm"></i></div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">Monte seu Currículo no Sistema</p>
                          <p className="text-xs text-gray-500 mt-0.5 mb-3">Crie um currículo profissional direto na plataforma, com temas e layouts bonitos.</p>
                          <div className="flex flex-wrap gap-2">
                            <Link to="/cidadao/curriculo/dicas" className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer whitespace-nowrap"><i className="ri-lightbulb-line"></i> Como fazer um bom currículo</Link>
                            <Link to="/cidadao/curriculo/criar" className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg text-white hover:opacity-90 transition-all cursor-pointer whitespace-nowrap" style={{ background: "linear-gradient(135deg, #1B2A5E, #3BBFD4)" }}><i className="ri-edit-line"></i> Criar Currículo Agora</Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div><p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Status no mercado</p>
                    <p className="text-xs text-gray-400 mb-2">Selecione &quot;Quero emprego&quot; para participar do feed de vagas e oportunidades de trabalho.</p>
                    <div className="flex gap-3">
                      {[{ value: "looking", label: "Quero emprego", icon: "ri-search-line", color: "text-amber-600 bg-amber-50 border-amber-200" }, { value: "not_looking", label: "Não procuro emprego", icon: "ri-pause-circle-line", color: "text-gray-600 bg-gray-100 border-gray-300" }].map((opt) => (<button key={opt.value} type="button" onClick={() => setProfileForm((p) => ({ ...p, job_status: opt.value }))} className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${profileForm.job_status === opt.value ? opt.color : "bg-gray-50 border-gray-200 text-gray-500"}`}><i className={`${opt.icon}`}></i><span className="text-xs">{opt.label}</span></button>))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Nome Completo</label><input type="text" value={profileForm.full_name} onChange={(e) => setProfileForm((p) => ({ ...p, full_name: e.target.value }))} placeholder="Seu nome" className="w-full rounded-xl px-4 py-2.5 border border-gray-200 bg-white text-gray-800 text-sm focus:outline-none" /></div>
                    <div><label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Telefone</label><input type="text" value={profileForm.phone} onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))} placeholder="(53) 99999-9999" className="w-full rounded-xl px-4 py-2.5 border border-gray-200 bg-white text-gray-800 text-sm focus:outline-none" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Bairro</label><input type="text" value={profileForm.neighborhood} onChange={(e) => setProfileForm((p) => ({ ...p, neighborhood: e.target.value }))} placeholder="Bairro em Pelotas" className="w-full rounded-xl px-4 py-2.5 border border-gray-200 bg-white text-gray-800 text-sm focus:outline-none" /></div>
                    <div><label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Tipo de Vaga Desejada</label><select value={profileForm.job_type} onChange={(e) => setProfileForm((p) => ({ ...p, job_type: e.target.value }))} className="w-full rounded-xl px-4 py-2.5 border border-gray-200 bg-white text-gray-800 text-sm focus:outline-none cursor-pointer"><option value="">Selecione</option>{["CLT", "PJ", "Freelance", "Estágio", "Temporário", "Aprendiz", "Outro"].map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
                  </div>
                  {/* NOVO: Situação de emprego */}
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Situação de Trabalho</p>
                    <div className="flex gap-3 mb-3">
                      <button type="button" onClick={() => setProfileForm((p) => ({ ...p, is_employed: true }))} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap border ${profileForm.is_employed === true ? "bg-green-50 border-green-300 text-green-700" : "bg-gray-50 border-gray-200 text-gray-500"}`}>
                        <i className="ri-briefcase-line mr-1"></i> Empregado
                      </button>
                      <button type="button" onClick={() => setProfileForm((p) => ({ ...p, is_employed: false }))} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap border ${profileForm.is_employed === false ? "bg-amber-50 border-amber-300 text-amber-700" : "bg-gray-50 border-gray-200 text-gray-500"}`}>
                        <i className="ri-user-search-line mr-1"></i> Desempregado
                      </button>
                    </div>
                    <p className="text-xs text-gray-400">Você pode alterar esta informação a qualquer momento. Seus dados de empregabilidade ajudam o gabinete do vereador a entender melhor as necessidades da população.</p>
                  </div>
                  {/* PRESTADOR DE SERVIÇOS */}
                  <div className="pt-2" style={{ borderTop: "1px solid #E5E7EB" }}>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">
                      <i className="ri-tools-line mr-1" style={{ color: "#22C55E" }}></i>
                      Prestador de Serviços
                    </p>
                    <button
                      type="button"
                      onClick={() => setProfileForm((p) => ({ ...p, is_service_provider: !p.is_service_provider }))}
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left cursor-pointer mb-3 ${profileForm.is_service_provider ? "bg-green-50 border-green-300" : "bg-gray-50 border-gray-200"}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-7 rounded-full transition-all relative shrink-0 ${profileForm.is_service_provider ? "bg-green-500" : "bg-gray-300"}`}>
                          <div className={`w-5 h-5 rounded-full bg-white absolute top-1 transition-all shadow-sm ${profileForm.is_service_provider ? "left-6" : "left-1"}`}></div>
                        </div>
                        <div>
                          <p className={`font-bold text-sm ${profileForm.is_service_provider ? "text-green-800" : "text-gray-600"}`}>Ofereço serviços como prestador autônomo</p>
                          <p className="text-gray-500 text-xs">Ative para mostrar seus serviços para cidadãos e empresas</p>
                        </div>
                      </div>
                    </button>
                    {profileForm.is_service_provider && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Categorias de Serviço</label>
                          <div className="grid grid-cols-3 gap-1.5">
                            {["Encanador", "Eletricista", "Pedreiro", "Pintor", "Marceneiro", "Jardinagem", "Frete/Mudança", "Limpeza", "Fotógrafo", "Designer", "Programador", "Professor/Aula", "Babá/Cuidador", "Motorista", "Cozinheiro", "Costureira", "Manicure", "Mecânico", "Técnico TI", "Consultor"].map((cat) => {
                              const cats = (profileForm.service_categories || "").split(",").map((s) => s.trim()).filter(Boolean);
                              const sel = cats.includes(cat);
                              return (
                                <button
                                  key={cat}
                                  type="button"
                                  onClick={() => {
                                    const current = (profileForm.service_categories || "").split(",").map((s) => s.trim()).filter(Boolean);
                                    const updated = current.includes(cat) ? current.filter((c) => c !== cat) : [...current, cat];
                                    setProfileForm((p) => ({ ...p, service_categories: updated.join(", ") }));
                                  }}
                                  className={`px-2 py-1.5 rounded-lg text-xs font-semibold text-left transition-all cursor-pointer whitespace-nowrap border ${sel ? "text-green-700 border-green-400 bg-green-100" : "text-gray-500 border-gray-200 bg-gray-50 hover:bg-gray-100"}`}
                                >
                                  {sel && <i className="ri-check-line mr-1 text-green-600"></i>}
                                  {cat}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Descrição dos Serviços</label>
                          <textarea value={profileForm.service_description} onChange={(e) => setProfileForm((p) => ({ ...p, service_description: e.target.value }))} rows={3} maxLength={500} placeholder="Descreva os serviços que você oferece com detalhes..." className="w-full rounded-xl px-4 py-2.5 border border-gray-200 bg-white text-gray-800 text-sm focus:outline-none resize-none" />
                          <p className="text-gray-400 text-xs text-right mt-0.5">{profileForm.service_description.length}/500</p>
                        </div>
                        {/* Portfolio de fotos */}
                        <PortfolioUploader
                          currentPhotos={profileForm.portfolio_photos}
                          userId={user?.id ?? ""}
                          onPhotosChange={(photos) => setProfileForm((p) => ({ ...p, portfolio_photos: photos }))}
                        />
                      </div>
                    )}
                  </div>
                  {/* /PRESTADOR */}
                  <div><label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Formação</label><input type="text" value={profileForm.education} onChange={(e) => setProfileForm((p) => ({ ...p, education: e.target.value }))} placeholder="Ex: Ensino médio, Técnico em Informática, Bacharel em Administração" className="w-full rounded-xl px-4 py-2.5 border border-gray-200 bg-white text-gray-800 text-sm focus:outline-none" /></div>
                  <div><label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Expertise / Área de Atuação</label><input type="text" value={profileForm.expertise} onChange={(e) => setProfileForm((p) => ({ ...p, expertise: e.target.value }))} placeholder="Ex: Vendas, Atendimento, Programação, Administração" className="w-full rounded-xl px-4 py-2.5 border border-gray-200 bg-white text-gray-800 text-sm focus:outline-none" /></div>
                  <div><label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Sobre mim</label><textarea value={profileForm.bio} onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))} placeholder="Conte um pouco sobre você, experiências e objetivos profissionais..." rows={3} maxLength={500} className="w-full rounded-xl px-4 py-2.5 border border-gray-200 bg-white text-gray-800 text-sm focus:outline-none resize-none" /></div>
                  <button type="submit" disabled={savingProfileModal !== 'idle'} className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all cursor-pointer whitespace-nowrap disabled:opacity-60" style={{ background: "linear-gradient(135deg, #1B2A5E, #3BBFD4)" }}>{savingProfileModal === 'saving' ? "Salvando..." : "Salvar Perfil"}</button>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />

      {/* Botão flutuante "?" — sempre disponível para iniciar/rever o tour */}
      {/* Ao clicar, redireciona para demandas ANTES de iniciar para garantir que todos os elementos estejam visíveis */}
      {!tour.isActive && (
        <button
          onClick={() => tour.startTour(() => {
            setActiveTab("demandas");
            setSearchParams({ tab: "demandas" });
            window.scrollTo({ top: 0, behavior: "instant" });
          })}
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 w-12 h-12 rounded-full flex items-center justify-center cursor-pointer shadow-lg transition-all hover:scale-110"
          style={{
            background: "linear-gradient(135deg, #E8A020, #f5b94a)",
            color: "#0D1629",
          }}
          title="Rever tour guiado"
        >
          <i className="ri-question-mark text-xl font-bold"></i>
        </button>
      )}

      {/* Tour Guiado */}
      <TourGuide
        isActive={tour.isActive}
        currentStep={tour.currentStep}
        totalSteps={tour.totalSteps}
        currentTourStep={tour.currentTourStep}
        tourName={cidadaoTour.name}
        onNext={tour.nextStep}
        onPrev={tour.prevStep}
        onSkip={tour.skipTour}
        onFinish={tour.finishTour}
        onTourFinished={handleTourFinished}
      />

      {/* Modal de Salvamento do Perfil */}
      {savingProfileModal !== 'idle' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.40)", backdropFilter: "blur(4px)" }}>
          <div className="bg-white rounded-2xl p-8 shadow-lg max-w-sm w-full mx-4 animate-in">
            <div className="flex flex-col items-center gap-4">
              {savingProfileModal === 'saving' ? (
                <>
                  <div className="w-12 h-12 border-2 border-[#1B2A5E] border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-gray-900 font-bold text-base">Aguarde, estamos carregando suas informações...</p>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <i className="ri-check-line text-green-600 text-2xl"></i>
                  </div>
                  <p className="text-gray-900 font-bold text-base">Salvo com sucesso!</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const statusSteps = [
  { key: "aberto", label: "Em Aberto", icon: "ri-inbox-line", color: "#D97706", bg: "rgba(217,119,6,0.10)", border: "rgba(217,119,6,0.25)" },
  { key: "em_andamento", label: "Em Andamento", icon: "ri-loader-4-line", color: "#0369A1", bg: "rgba(3,105,161,0.10)", border: "rgba(3,105,161,0.25)" },
  { key: "aguardando_externa", label: "Ag. Resp. Externa", icon: "ri-time-line", color: "#7C3AED", bg: "rgba(124,58,237,0.10)", border: "rgba(124,58,237,0.25)" },
  { key: "finalizada", label: "Finalizada", icon: "ri-checkbox-circle-line", color: "#16A34A", bg: "rgba(22,163,74,0.10)", border: "rgba(22,163,74,0.25)" },
];

function CidadaoDemandDetail({ demand, onClose }: { demand: Demand; onClose: () => void }) {
  const sc = statusConfig[demand.status] ?? statusConfig.aberto;
  const currentStepIndex = statusSteps.findIndex((s) => s.key === demand.status);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col" style={{ maxHeight: "620px" }}>
      <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500 font-mono">#{demand.id}</span>
            <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "#3BBFD4" }}>{typeLabel[demand.type] ?? demand.type}</span>
            {demand.category && (<><span className="text-gray-300">·</span><span className="text-xs text-gray-400">{demand.category}</span></>)}
          </div>
          <h2 className="text-gray-900 font-extrabold text-base leading-snug mb-2">{demand.title}</h2>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border" style={{ color: sc.color, background: sc.bg, borderColor: sc.border }}><i className={`${statusSteps.find((s) => s.key === demand.status)?.icon ?? "ri-circle-line"} text-xs`}></i>{sc.label}</span>
        </div>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 transition-all cursor-pointer shrink-0"><i className="ri-close-line"></i></button>
      </div>
      <div className="overflow-y-auto flex-1">
        <div className="p-5 border-b border-gray-100">
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-4">Acompanhamento do Status</p>
          <div className="flex items-start gap-0">
            {statusSteps.map((step, idx) => {
              const isPast = idx <= currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              return (<div key={step.key} className="flex-1 flex flex-col items-center relative">
                {idx < statusSteps.length - 1 && (<div className="absolute top-4 left-1/2 w-full h-0.5 z-0" style={{ background: isPast && idx < currentStepIndex ? step.color : "#E5E7EB" }}></div>)}
                <div className="relative z-10 w-8 h-8 rounded-full flex items-center justify-center mb-2 transition-all" style={{ background: isCurrent ? step.color : isPast ? step.color : "#F3F4F6", border: isCurrent ? `2px solid ${step.color}` : isPast ? "none" : "2px solid #E5E7EB", boxShadow: isCurrent ? `0 0 0 3px ${step.bg}` : "none" }}><i className={`${step.icon} text-xs`} style={{ color: isPast ? "white" : "#9CA3AF" }}></i></div>
                <p className="text-center text-xs leading-tight font-semibold px-1" style={{ color: isCurrent ? step.color : isPast ? "#6B7280" : "#D1D5DB" }}>{step.label}</p>
              </div>);
            })}
          </div>
        </div>
        <div className="p-5 border-b border-gray-100">
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-3">Assessor responsável</p>
          {demand.assessor_name ? (<div className="flex items-center gap-3 px-4 py-3 rounded-xl border" style={{ background: "rgba(27,42,94,0.04)", borderColor: "rgba(27,42,94,0.12)" }}><div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(27,42,94,0.10)" }}><i className="ri-shield-user-line text-sm" style={{ color: "#1B2A5E" }}></i></div><div><p className="text-gray-900 font-bold text-sm">{demand.assessor_name}</p><p className="text-gray-500 text-xs">Assessor do Gabinete · Assumiu esta demanda</p></div><span className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-full" style={{ color: "#0369A1", background: "rgba(3,105,161,0.10)", border: "1px solid rgba(3,105,161,0.20)" }}>Responsável</span></div>) : (<div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-amber-100 bg-amber-50"><i className="ri-user-unfollow-line text-amber-500"></i><div><p className="text-amber-700 text-sm font-semibold">Aguardando um assessor assumir</p><p className="text-amber-600 text-xs mt-0.5">Sua demanda foi recebida e será atribuída em breve</p></div></div>)}
        </div>
        <div className="p-5 border-b border-gray-100"><p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Sua solicitação</p><p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{demand.description ?? "—"}</p></div>
        {demand.assessor_notes && (<div className="p-5 border-b border-gray-100"><p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5"><i className="ri-shield-user-line" style={{ color: "#1B2A5E" }}></i> Observações do Assessor</p><div className="p-4 rounded-xl border" style={{ background: "rgba(27,42,94,0.03)", borderColor: "rgba(27,42,94,0.10)" }}><p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{demand.assessor_notes}</p></div></div>)}
        {demand.admin_notes && (<div className="p-5 border-b border-gray-100"><p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5"><i className="ri-government-line" style={{ color: "#16A34A" }}></i> Resposta Oficial do Gabinete</p><div className="p-4 rounded-xl bg-green-50 border border-green-100"><p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{demand.admin_notes}</p></div></div>)}
        <div className="p-5"><p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-3">Histórico</p><div className="space-y-2.5">
          <div className="flex items-center gap-2.5 text-sm"><div className="w-6 h-6 flex items-center justify-center"><i className="ri-calendar-check-line text-gray-400 text-sm"></i></div><span className="text-gray-500 text-xs">Enviado em:</span><span className="text-gray-800 font-semibold text-xs">{new Date(demand.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}</span></div>
          {demand.updated_at && demand.updated_at !== demand.created_at && (<div className="flex items-center gap-2.5 text-sm"><div className="w-6 h-6 flex items-center justify-center"><i className="ri-refresh-line text-gray-400 text-sm"></i></div><span className="text-gray-500 text-xs">Última atualização:</span><span className="text-gray-800 font-semibold text-xs">{new Date(demand.updated_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}</span></div>)}
          {demand.assessor_name && (<div className="flex items-center gap-2.5 text-sm"><div className="w-6 h-6 flex items-center justify-center"><i className="ri-user-received-line text-gray-400 text-sm"></i></div><span className="text-gray-500 text-xs">Assumido por:</span><span className="font-semibold text-xs" style={{ color: "#1B2A5E" }}>{demand.assessor_name}</span></div>)}
        </div></div>
      </div>
    </div>
  );
}

