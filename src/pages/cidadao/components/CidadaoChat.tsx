import { useState, useEffect, useCallback, useRef } from "react";
import { supabase, supabaseUrl, supabaseAnonKey } from "@/lib/supabase";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { criarNotificacao, notificarRelevantes } from "@/hooks/useNotifications";

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

interface ChatRating {
  chatId: number;
  rating: number;
  comment: string;
}

interface CidadaoChatProps {
  userId: string;
  userName: string;
  profileFullName: string | null;
}

function isBusinessHours(): boolean {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'short',
    hour12: false,
  }).formatToParts(now);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value;
  const hour = parseInt(getPart('hour') || '0');
  const minute = parseInt(getPart('minute') || '0');
  const dayStr = getPart('weekday') || '';
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

export default function CidadaoChat({ userId, userName, profileFullName }: CidadaoChatProps) {
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
  // Avaliação de atendimento (exibida quando assessor encerra conversa)
  const [showRating, setShowRating] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const ratingShownRef = useRef<number | null>(null);

  const displayName = profileFullName || userName;

  // Typing indicator
  const { typingUsers, sendTyping } = useTypingIndicator(chat?.id ?? null, displayName);

  const loadChatData = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/chat-listar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ citizenId: userId, status: "all", limit: 5 }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) return;

      const chats: Chat[] = (data.chats ?? []).filter((c: Chat) => c.status !== "closed");
      if (chats.length > 0) {
        const activeChat = chats[0];
        setChat(activeChat);
        chatIdRef.current = activeChat.id;
        await loadMessages(activeChat.id);
      }
    } catch (err) {
      console.error("[CidadaoChat] loadChatData error:", err);
    }
  }, [userId]);

  const loadMessages = useCallback(async (chatId: number) => {
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/chat-mensagens`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ chatId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) return;

      const serverMsgs: ChatMsg[] = data.messages ?? [];
      setChatMsgs((prev) => {
        if (prev.length === serverMsgs.length) {
          const allSame = prev.every((m, i) => m.id === serverMsgs[i]?.id);
          if (allSame) return prev;
        }
        return serverMsgs;
      });

      if (data.chat && data.chat.status === "closed") {
        setChat((prev) => prev ? { ...prev, status: "closed" } : prev);
      }
    } catch (err) {
      console.error("[CidadaoChat] loadMessages error:", err);
    }
  }, []);

  // Re-verifica horario de atendimento a cada minuto (atualiza automaticamente)
  useEffect(() => {
    const check = () => setOutsideHours(!isBusinessHours());
    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, []);

  // Exibe formulação de avaliação quando chat é encerrado pelo assessor
  useEffect(() => {
    if (chat?.status === "closed" && ratingShownRef.current !== chat.id && !ratingSubmitted) {
      ratingShownRef.current = chat.id;
      // Delay de 1s para o usuário ver a mensagem de encerramento primeiro
      const timer = setTimeout(() => setShowRating(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [chat?.status, chat?.id, ratingSubmitted]);

  const handleSubmitRating = async () => {
    if (!chat || ratingValue === 0) return;
    setRatingSubmitting(true);
    try {
      // Salva avaliação na tabela mensagens_chat como mensagem especial de sistema
      await supabase.from("mensagens_chat_items").insert({
        chat_id: chat.id,
        sender_role: "system",
        sender_name: "Avaliação do Cidadão",
        message: `⭐ Avaliação: ${ratingValue}/5 estrelas${ratingComment ? ` | Comentário: ${ratingComment}` : ""}`,
      });
      // Atualiza o campo de rating no chat
      await supabase.from("mensagens_chat").update({
        citizen_rating: ratingValue,
        citizen_rating_comment: ratingComment || null,
      } as any).eq("id", chat.id);
    } catch (e) {
      console.warn("[CidadaoChat] Erro ao salvar avaliação:", e);
    } finally {
      setRatingSubmitting(false);
      setRatingSubmitted(true);
      setShowRating(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    setOutsideHours(!isBusinessHours());
    loadChatData();
  }, [userId, loadChatData]);

  useEffect(() => {
    const currentChatId = chatIdRef.current;
    if (!currentChatId || !chat || chat.status === "closed") return;

    const interval = setInterval(() => loadMessages(currentChatId), 1000);
    intervalRef.current = interval;

    const channel = supabase
      .channel(`cidadao-chat-${currentChatId}`)
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

        // 🔥 BUGFIX #2: Notificar assessor, vereador e admin sobre nova conversa
        // 🔥 BUGFIX B7: Usar notificarRelevantes em vez de criarNotificacao direto
        notificarRelevantes(
          "chat",
          "Novo chat de cidadao",
          `${displayName} iniciou uma conversa.`,
          {
            remetenteId: userId,
            remetenteNome: displayName,
            referenciaId: String(newChat.id),
            referenciaTipo: "chat",
          }
        ).catch((e) => console.error("[CidadaoChat] Erro ao notificar:", e));
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
      }
    } catch (err) {
      setSendError("Falha ao enviar. Verifique sua conexão.");
    } finally {
      setSendingMsg(false);
    }
  }, [newMsg, imageUrl, chat, userId, displayName, sendingMsg]);

  return (
    <div className="max-w-2xl">
      {!chat ? (
        <div className="bg-white rounded-2xl border border-background-200/70 p-8 text-center">
          <i className="ri-chat-3-line text-foreground-200 text-5xl mb-4 block"></i>
          <h2 className="text-foreground-900 font-bold text-lg mb-2">Converse com um Assessor</h2>
          <p className="text-foreground-500 text-sm mb-1">Envie uma mensagem direta para o gabinete do vereador.</p>
          <p className="text-foreground-400 text-xs mb-4">As conversas expiram automaticamente em 7 dias.</p>

          {/* Horário de atendimento */}
          <div className="bg-accent-50 border border-accent-200/70 rounded-xl p-3 mb-4 text-left">
            <div className="flex items-start gap-2">
              <i className="ri-time-line text-accent-600 mt-0.5 shrink-0"></i>
              <div>
                <p className="text-xs text-accent-900 font-semibold">Horário de atendimento</p>
                <p className="text-xs text-accent-700">{getBusinessHoursText()}</p>
              </div>
            </div>
          </div>

          {outsideHours && (
            <div className="bg-secondary-50 border border-secondary-200 rounded-xl p-3 mb-4 text-left">
              <div className="flex items-start gap-2">
                <i className="ri-time-line text-secondary-600 mt-0.5 shrink-0"></i>
                <div>
                  <p className="text-xs text-secondary-900 font-semibold">Fora do horário de atendimento</p>
                  <p className="text-xs text-secondary-700">
                    Nosso gabinete responde de {getBusinessHoursText()}. Você pode deixar sua mensagem e nossa equipe responderá assim que possível.
                  </p>
                </div>
              </div>
            </div>
          )}

          {newChatError && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-500 text-xs flex items-center gap-2 justify-center">
              <i className="ri-error-warning-line"></i> {newChatError}
            </div>
          )}
          <button
            onClick={openNewChat}
            disabled={newChatLoading}
            className="px-6 py-3 text-white font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap disabled:opacity-60 bg-primary-500 hover:bg-primary-600"
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
        <div className="bg-white rounded-2xl border border-background-200/70 overflow-hidden flex flex-col" style={{ height: "560px" }}>
          <div className="p-4 border-b border-background-200/70 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-accent-100">
                <i className="ri-customer-service-2-line text-accent-600"></i>
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground-900">Mensagens</p>
                <p className="text-xs text-foreground-400">
                  {chat.status === "open" && "Aguardando atendimento"}
                  {chat.status === "in_progress" && <span className="text-green-600">Em atendimento</span>}
                  {chat.status === "closed" && <span className="text-red-400">Conversa encerrada</span>}
                </p>
              </div>
            </div>
          </div>

          {/* Banner de horário */}
          {outsideHours && (
            <div className="bg-secondary-50 border-b border-secondary-200 px-4 py-2">
              <div className="flex items-start gap-2">
                <i className="ri-time-line text-secondary-600 mt-0.5 shrink-0 text-xs"></i>
                <p className="text-xs text-secondary-700">
                  <strong>Fora do horário.</strong> Nosso gabinete responde de {getBusinessHoursText()}. Sua mensagem será respondida assim que possível.
                </p>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background-50">
            {chatMsgs.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <p className="text-foreground-300 text-sm">Nenhuma mensagem ainda. Diga olá!</p>
              </div>
            )}
            {chatMsgs.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender_role === "citizen" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-xs px-4 py-2.5 rounded-2xl text-sm ${
                  msg.sender_role === "citizen"
                    ? "bg-accent-500 text-white rounded-br-sm"
                    : "bg-white border border-background-200/70 text-foreground-900 rounded-bl-sm"
                }`}>
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
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce bg-accent-500" style={{ animationDelay: "0ms" }}></span>
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce bg-accent-500" style={{ animationDelay: "150ms" }}></span>
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce bg-accent-500" style={{ animationDelay: "300ms" }}></span>
                </div>
                <span className="text-xs text-accent-700">
                  {typingUsers.filter(u => u.name !== displayName).map(u => u.name).join(", ")} digitando...
                </span>
              </div>
            )}
          </div>

          {chat.status !== "closed" ? (
            <div className="p-4 border-t border-background-200/70">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              {showImageInput && imageUrl && (
                <div className="flex items-center gap-2 mb-2 p-2 rounded-xl bg-secondary-50 border border-secondary-200">
                  <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-secondary-200">
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-xs text-secondary-600 flex-1 truncate">Imagem pronta para enviar</span>
                  <button onClick={() => { setImageUrl(""); setShowImageInput(false); }} className="w-6 h-6 flex items-center justify-center rounded-lg text-secondary-400 hover:bg-secondary-200 cursor-pointer shrink-0">
                    <i className="ri-close-line text-xs"></i>
                  </button>
                </div>
              )}
              {sendError && (
                <div className="mb-2 p-2 rounded-xl bg-red-50 border border-red-100 text-red-500 text-xs flex items-center gap-2">
                  <i className="ri-error-warning-line"></i> {sendError}
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => fileInputRef.current?.click()} disabled={uploadingImage} className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-colors shrink-0 bg-secondary-100 text-secondary-500 hover:bg-secondary-200 disabled:opacity-50" title="Anexar foto">
                  {uploadingImage ? <div className="w-4 h-4 border-2 border-secondary-500 border-t-transparent rounded-full animate-spin"></div> : <i className="ri-image-line text-base"></i>}
                </button>
                <input type="text" value={newMsg} onChange={(e) => { setNewMsg(e.target.value); sendTyping(); }}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()} placeholder="Escreva sua mensagem..." maxLength={500} className="flex-1 rounded-xl border border-background-300 px-4 py-2.5 text-sm text-foreground-900 focus:outline-none focus:ring-2 focus:ring-accent-400 bg-white" />
                <button onClick={sendMessage} disabled={sendingMsg || (!newMsg.trim() && !imageUrl.trim())} className="w-10 h-10 rounded-xl text-white flex items-center justify-center transition-all cursor-pointer disabled:opacity-50 bg-accent-500 hover:bg-accent-600">
                  {sendingMsg ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <i className="ri-send-plane-fill text-base"></i>}
                </button>
              </div>
            </div>
          ) : (
            <div className="border-t border-background-200/70">
              {showRating && !ratingSubmitted ? (
                <div className="p-4">
                  <p className="text-foreground-700 font-bold text-sm mb-1">Como foi seu atendimento?</p>
                  <p className="text-foreground-400 text-xs mb-3">Avalie o atendimento recebido</p>
                  <div className="flex gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRatingValue(star)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer transition-all hover:scale-110"
                        style={{ background: star <= ratingValue ? "rgba(232,160,32,0.15)" : "rgba(0,0,0,0.04)" }}
                      >
                        {star <= ratingValue
                          ? <i className="ri-star-fill text-xl" style={{ color: "#E8A020" }}></i>
                          : <i className="ri-star-line text-xl" style={{ color: "#9CA3AF" }}></i>
                        }
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                    placeholder="Comentário opcional..."
                    rows={2}
                    maxLength={300}
                    className="w-full rounded-xl px-3 py-2 text-sm border border-background-200 bg-white text-foreground-800 focus:outline-none resize-none mb-2"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowRating(false); setRatingSubmitted(true); }}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold cursor-pointer bg-background-100 text-foreground-500"
                    >
                      Pular
                    </button>
                    <button
                      onClick={handleSubmitRating}
                      disabled={ratingValue === 0 || ratingSubmitting}
                      className="flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer text-white disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg, #1B2A5E, #3BBFD4)" }}
                    >
                      {ratingSubmitting ? "Enviando..." : "Enviar Avaliação"}
                    </button>
                  </div>
                </div>
              ) : ratingSubmitted ? (
                <div className="p-4 text-center">
                  <i className="ri-checkbox-circle-fill text-2xl mb-1 block" style={{ color: "#22C55E" }}></i>
                  <p className="text-sm font-semibold text-foreground-700">Obrigado pela avaliação!</p>
                  <button onClick={() => { setChat(null); setChatMsgs([]); chatIdRef.current = null; setRatingSubmitted(false); setRatingValue(0); setRatingComment(""); }} className="text-xs font-semibold mt-2 cursor-pointer" style={{ color: "#3BBFD4" }}>Iniciar nova conversa</button>
                </div>
              ) : (
                <div className="p-4 text-center">
                  <p className="text-foreground-400 text-sm mb-1">Conversa encerrada pelo assessor</p>
                  <button onClick={() => { setChat(null); setChatMsgs([]); chatIdRef.current = null; }} className="text-sm font-semibold hover:underline cursor-pointer text-accent-500 hover:text-accent-600">Iniciar nova conversa</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}