import { useState, useEffect, useCallback, useRef } from "react";
import { supabase, supabaseUrl, supabaseAnonKey } from "@/lib/supabase";
import { notificarRelevantes } from "@/hooks/useNotifications";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";

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

interface EmpresaChatProps {
  userId: string;
  companyName: string;
}

function isBusinessHours(): boolean {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    hour: "numeric",
    minute: "numeric",
    weekday: "short",
    hour12: false,
  }).formatToParts(now);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value;
  const hour = parseInt(getPart("hour") || "0");
  const minute = parseInt(getPart("minute") || "0");
  const dayStr = getPart("weekday") || "";
  const dayMap: Record<string, number> = {
    Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0,
  };
  const day = dayMap[dayStr] ?? 0;
  const timeDecimal = hour + minute / 60;
  const isWeekday = day >= 1 && day <= 5;
  const isWithinHours = timeDecimal >= 8.0 && timeDecimal < 18.0;
  return isWeekday && isWithinHours;
}

function getBusinessHoursText(): string {
  return "Segunda a sexta, das 8h00 às 18h00";
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

export default function EmpresaChat({ userId, companyName }: EmpresaChatProps) {
  const [chat, setChat] = useState<Chat | null>(null);
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [showImageInput, setShowImageInput] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [newChatLoading, setNewChatLoading] = useState(false);
  const [newChatError, setNewChatError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const realtimeRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const chatIdRef = useRef<number | null>(null);
  const [outsideHours, setOutsideHours] = useState(false);

  const displayName = companyName || "Empresa";

  // Typing indicator
  const { typingUsers, sendTyping } = useTypingIndicator(chat?.id ?? null, displayName);

  const loadChatData = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from("mensagens_chat")
        .select("*")
        .eq("citizen_id", userId)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) return;

      const chats: Chat[] = ((data ?? []) as Chat[]).filter((c: Chat) => c.status !== "closed");
      if (chats.length > 0) {
        const activeChat = chats[0];
        setChat(activeChat);
        chatIdRef.current = activeChat.id;
        await loadMessages(activeChat.id);
      }
    } catch (err) {
      console.error("[EmpresaChat] loadChatData error:", err);
    }
  }, [userId]);

  const loadMessages = useCallback(async (chatId: number) => {
    try {
      const { data } = await supabase
        .from("mensagens_chat_items")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

      const serverMsgs: ChatMsg[] = (data ?? []) as ChatMsg[];
      setChatMsgs((prev) => {
        if (prev.length === serverMsgs.length) {
          const allSame = prev.every((m, i) => m.id === serverMsgs[i]?.id);
          if (allSame) return prev;
        }
        return serverMsgs;
      });

      // Verifica se chat foi fechado
      const { data: freshChat } = await supabase
        .from("mensagens_chat")
        .select("*")
        .eq("id", chatId)
        .maybeSingle();
      if (freshChat && (freshChat as Chat).status === "closed") {
        setChat((prev) => prev ? { ...prev, status: "closed" } : prev);
      }
    } catch (err) {
      console.error("[EmpresaChat] loadMessages error:", err);
    }
  }, []);

  // Re-verifica horário de atendimento a cada minuto
  useEffect(() => {
    const check = () => setOutsideHours(!isBusinessHours());
    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!userId) return;
    setOutsideHours(!isBusinessHours());
    loadChatData();
  }, [userId, loadChatData]);

  // Polling de mensagens a cada 3 segundos + realtime
  useEffect(() => {
    const currentChatId = chatIdRef.current;
    if (!currentChatId || !chat || chat.status === "closed") return;

    const interval = setInterval(() => loadMessages(currentChatId), 1000);
    intervalRef.current = interval;

    const channel = supabase
      .channel(`empresa-chat-${currentChatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mensagens_chat_items",
          filter: `chat_id=eq.${currentChatId}`,
        },
        () => loadMessages(currentChatId)
      )
      .subscribe();
    realtimeRef.current = channel;

    return () => {
      clearInterval(interval);
      if (realtimeRef.current) {
        supabase.removeChannel(realtimeRef.current);
      }
    };
  }, [chat, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMsgs]);

  const openNewChat = async () => {
    if (!userId) return;
    setNewChatLoading(true);
    setNewChatError(null);
    try {
      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase.from("mensagens_chat").insert({
        citizen_id: userId,
        citizen_name: displayName,
        status: "open",
        created_at: now,
        expires_at: expiresAt,
      }).select().maybeSingle();
      if (!error && data) {
        const newChat = data as Chat;
        setChat(newChat);
        chatIdRef.current = newChat.id;
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
      setSendError("Por favor, selecione um arquivo de imagem.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSendError("A imagem deve ter no máximo 5MB.");
      return;
    }

    setUploadingImage(true);
    setSendError(null);

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
      setSendError("Falha ao processar imagem. Tente novamente.");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const sendMessage = useCallback(async () => {
    const hasText = newMsg.trim().length > 0;
    const hasImage = imageUrl.trim().length > 0;
    if ((!hasText && !hasImage) || !chat || !userId || sendingMsg) return;

    const finalImage = hasImage ? imageUrl.trim() : null;
    const isStorageUrl = finalImage && (finalImage.startsWith("http://") || finalImage.startsWith("https://"));

    setSendingMsg(true);
    setSendError(null);
    try {
      const payload: Record<string, unknown> = {
        chat_id: chat.id,
        sender_role: "citizen",
        sender_id: userId,
        sender_name: displayName,
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
        
        // Notificar assessores e vereador sobre nova mensagem da empresa
        const preview = hasText ? newMsg.trim().substring(0, 60) : "[Imagem]";
        notificarRelevantes(
          "chat",
          "Nova mensagem de empresa",
          `${displayName} enviou: "${preview}${hasText && newMsg.trim().length > 60 ? "..." : ""}"`,
          {
            remetenteId: userId,
            remetenteNome: displayName,
            referenciaId: String(chat.id),
            referenciaTipo: "chat",
            excluirIds: [userId],
          }
        ).catch((e) => console.error("[EmpresaChat] Erro ao notificar:", e));
      }
    } catch (err) {
      setSendError("Falha ao enviar. Verifique sua conexão.");
    } finally {
      setSendingMsg(false);
    }
  }, [newMsg, imageUrl, chat, userId, displayName, sendingMsg]);

  return (
    <div className="max-w-2xl mx-auto">
      {!chat ? (
        <div className="rounded-2xl p-8 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(124,58,237,0.20)" }}>
          <i className="ri-chat-3-line text-5xl mb-4 block" style={{ color: "rgba(255,255,255,0.12)" }}></i>
          <h2 className="text-white font-bold text-lg mb-2">Converse com um Assessor</h2>
          <p className="text-white/40 text-sm mb-1">Envie mensagens diretas para o gabinete do vereador.</p>
          <p className="text-white/25 text-xs mb-4">As conversas expiram automaticamente em 7 dias.</p>

          {/* Horário de atendimento */}
          <div className="rounded-xl p-3 mb-4 text-left" style={{ background: "rgba(232,160,32,0.08)", border: "1px solid rgba(232,160,32,0.18)" }}>
            <div className="flex items-start gap-2">
              <i className="ri-time-line mt-0.5 shrink-0" style={{ color: "#E8A020" }}></i>
              <div>
                <p className="text-xs text-white/70 font-semibold">Horário de atendimento</p>
                <p className="text-xs text-white/40">{getBusinessHoursText()}</p>
              </div>
            </div>
          </div>

          {outsideHours && (
            <div className="rounded-xl p-3 mb-4 text-left" style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.18)" }}>
              <div className="flex items-start gap-2">
                <i className="ri-time-line mt-0.5 shrink-0" style={{ color: "#A78BFA" }}></i>
                <div>
                  <p className="text-xs text-white/70 font-semibold">Fora do horário de atendimento</p>
                  <p className="text-xs text-white/40">
                    Nosso gabinete responde de {getBusinessHoursText()}. Você pode deixar sua mensagem e nossa equipe responderá assim que possível.
                  </p>
                </div>
              </div>
            </div>
          )}

          {newChatError && (
            <div className="mb-4 p-3 rounded-xl text-red-400 text-xs flex items-center gap-2 justify-center" style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.20)" }}>
              <i className="ri-error-warning-line"></i> {newChatError}
            </div>
          )}
          <button
            onClick={openNewChat}
            disabled={newChatLoading}
            className="px-6 py-3 text-white font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #7C3AED, #A78BFA)" }}
          >
            {newChatLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Iniciando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <i className="ri-add-line"></i>Iniciar Conversa
              </span>
            )}
          </button>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden flex flex-col" style={{ height: "560px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(124,58,237,0.20)" }}>
          {/* Header */}
          <div className="p-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(124,58,237,0.15)" }}>
                <i className="ri-customer-service-2-line" style={{ color: "#A78BFA" }}></i>
              </div>
              <div>
                <p className="font-semibold text-sm text-white">Mensagens</p>
                <p className="text-xs text-white/40">
                  {chat.status === "open" && "Aguardando atendimento"}
                  {chat.status === "in_progress" && <span style={{ color: "#22C55E" }}>Em atendimento</span>}
                  {chat.status === "closed" && <span style={{ color: "#F87171" }}>Conversa encerrada</span>}
                </p>
              </div>
            </div>
          </div>

          {/* Banner de horário */}
          {outsideHours && (
            <div className="px-4 py-2" style={{ background: "rgba(124,58,237,0.08)", borderBottom: "1px solid rgba(124,58,237,0.15)" }}>
              <div className="flex items-start gap-2">
                <i className="ri-time-line mt-0.5 shrink-0 text-xs" style={{ color: "#A78BFA" }}></i>
                <p className="text-xs text-white/50">
                  <strong className="text-white/70">Fora do horário.</strong> Nosso gabinete responde de {getBusinessHoursText()}. Sua mensagem será respondida assim que possível.
                </p>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: "rgba(0,0,0,0.15)" }}>
            {chatMsgs.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <p className="text-white/25 text-sm">Nenhuma mensagem ainda. Diga olá!</p>
              </div>
            )}
            {chatMsgs.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender_role === "citizen" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-xs px-4 py-2.5 rounded-2xl text-sm ${
                  msg.sender_role === "citizen"
                    ? "text-white rounded-br-sm"
                    : "rounded-bl-sm"
                }`}
                style={msg.sender_role === "citizen"
                  ? { background: "linear-gradient(135deg, #7C3AED, #A78BFA)" }
                  : { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "white" }}
                >
                  <p className="text-xs font-semibold mb-1 opacity-70">{msg.sender_name}</p>
                  {msg.message && <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.message}</p>}
                  {(msg.image_url || msg.image_data) && (
                    <a href={msg.image_url || msg.image_data || "#"} target="_blank" rel="noopener noreferrer" className="block mt-2">
                      <img
                        src={msg.image_url || msg.image_data || ""}
                        alt="Imagem enviada"
                        className="rounded-lg max-w-full max-h-48 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      />
                    </a>
                  )}
                  <p className="text-xs mt-1 opacity-60">{new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef}></div>
            {/* Typing indicator */}
            {typingUsers.filter(u => u.name !== displayName).length > 0 && (
              <div className="flex items-center gap-2 px-1 pb-1">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#A78BFA", animationDelay: "0ms" }}></span>
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#A78BFA", animationDelay: "150ms" }}></span>
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#A78BFA", animationDelay: "300ms" }}></span>
                </div>
                <span className="text-xs text-white/50">
                  {typingUsers.filter(u => u.name !== displayName).map(u => u.name).join(", ")} digitando...
                </span>
              </div>
            )}
          </div>

          {/* Input area */}
          {chat.status !== "closed" ? (
            <div className="p-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              {showImageInput && imageUrl && (
                <div className="flex items-center gap-2 mb-2 p-2 rounded-xl" style={{ background: "rgba(124,58,237,0.10)", border: "1px solid rgba(124,58,237,0.20)" }}>
                  <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0" style={{ background: "rgba(124,58,237,0.20)" }}>
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-xs text-white/50 flex-1 truncate">Imagem pronta para enviar</span>
                  <button onClick={() => { setImageUrl(""); setShowImageInput(false); }} className="w-6 h-6 flex items-center justify-center rounded-lg text-white/30 hover:bg-white/5 cursor-pointer shrink-0">
                    <i className="ri-close-line text-xs"></i>
                  </button>
                </div>
              )}
              {sendError && (
                <div className="mb-2 p-2 rounded-xl text-red-400 text-xs flex items-center gap-2" style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.20)" }}>
                  <i className="ri-error-warning-line"></i> {sendError}
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => fileInputRef.current?.click()} disabled={uploadingImage} className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-colors shrink-0 disabled:opacity-50" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.40)" }} title="Anexar foto">
                  {uploadingImage ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <i className="ri-image-line text-base"></i>}
                </button>
                <input type="text" value={newMsg} onChange={(e) => { setNewMsg(e.target.value); sendTyping(); }}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()} placeholder="Escreva sua mensagem..." maxLength={500} className="flex-1 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }} />
                <button onClick={sendMessage} disabled={sendingMsg || (!newMsg.trim() && !imageUrl.trim())} className="w-10 h-10 rounded-xl text-white flex items-center justify-center transition-all cursor-pointer disabled:opacity-50" style={{ background: "linear-gradient(135deg, #7C3AED, #A78BFA)" }}>
                  {sendingMsg ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <i className="ri-send-plane-fill text-base"></i>}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 text-center" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="text-white/30 text-sm mb-1">Conversa encerrada pelo assessor</p>
              <button onClick={() => { setChat(null); setChatMsgs([]); chatIdRef.current = null; }} className="text-sm font-semibold hover:underline cursor-pointer" style={{ color: "#A78BFA" }}>Iniciar nova conversa</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}