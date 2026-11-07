import { useState, useEffect, useCallback, useRef } from "react";
import { supabase, supabaseUrl, supabaseAnonKey } from "@/lib/supabase";
import { playNotificationSound, getLastCheckTime, setLastCheckTime, getLastRead, setLastRead } from "@/hooks/useChatNotification";
import { criarNotificacao, notificarRelevantes } from "@/hooks/useNotifications";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";

interface Chat {
  id: number;
  citizen_id: string;
  citizen_name: string | null;
  assessor_id: string | null;
  assessor_name: string | null;
  status: string;
  created_at: string;
  expires_at: string;
  closed_at: string | null;
  last_message?: {
    message: string | null;
    sender_name: string | null;
    created_at: string;
  } | null;
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

interface ChatPanelProps {
  assessorId: string;
  assessorName: string;
  onUnreadChange?: (count: number) => void;
  onCitizenClick?: (citizenId: string) => void;
}

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  open: { label: "Aguardando", color: "#D97706", bg: "rgba(217,119,6,0.12)", border: "rgba(217,119,6,0.25)" },
  in_progress: { label: "Em atendimento", color: "#22C55E", bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.25)" },
  closed: { label: "Encerrada", color: "#6B7280", bg: "rgba(107,114,128,0.12)", border: "rgba(107,114,128,0.25)" },
};

function compressChatImage(file: File, maxW = 300, maxH = 300, quality = 0.4): Promise<Blob> {
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

export default function ChatPanel({ assessorId, assessorName, onUnreadChange, onCitizenClick }: ChatPanelProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [showImageInput, setShowImageInput] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sending, setSending] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showList, setShowList] = useState(true);
  const [unreadChats, setUnreadChats] = useState<Set<number>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastCheckRef = useRef<string>(getLastCheckTime(assessorId));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const realtimeRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const selectedChatRef = useRef<Chat | null>(null);

  // Typing indicator
  const { typingUsers, sendTyping } = useTypingIndicator(selectedChat?.id ?? null, assessorName);

  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  const loadChats = useCallback(async () => {
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/chat-listar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ status: "all", limit: 100, assessorId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        console.error("[ChatPanel] loadChats error:", data.error);
        setLoading(false);
        return;
      }
      setChats(data.chats ?? []);
      setLoading(false);
    } catch (err) {
      console.error("[ChatPanel] loadChats exception:", err);
      setLoading(false);
    }
  }, [assessorId]);

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
      setMsgs((prev) => {
        if (prev.length === serverMsgs.length) {
          const allSame = prev.every((m, i) => m.id === serverMsgs[i]?.id);
          if (allSame) return prev;
        }
        return serverMsgs;
      });

      if (data.chat && data.chat.status === "closed") {
        setSelectedChat((prev) => prev ? { ...prev, status: "closed" } : prev);
      }
    } catch (err) {
      console.error("[ChatPanel] loadMessages error:", err);
    }
  }, []);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  // Polling + Realtime
  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/chat-listar`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({ status: "all", limit: 100, assessorId }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setChats(data.chats ?? []);
        }
      } catch (err) {
        console.error("[ChatPanel] poll chats error:", err);
      }

      const currentChat = selectedChatRef.current;
      if (currentChat) {
        await loadMessages(currentChat.id);
      }

      const checkTime = lastCheckRef.current;
      const nowIso = new Date().toISOString();
      try {
        const { data: newMsgs } = await supabase
          .from("mensagens_chat_items")
          .select("id, chat_id, sender_role")
          .gt("created_at", checkTime)
          .neq("sender_role", "assessor")
          .order("created_at", { ascending: true });

        if (newMsgs && newMsgs.length > 0) {
          let hasExternal = false;
          setUnreadChats((prev) => {
            const next = new Set(prev);
            (newMsgs as { id: number; chat_id: number; sender_role: string }[]).forEach((m) => {
              const lastRead = getLastRead(assessorId, m.chat_id);
              if (m.id > lastRead) {
                if (selectedChatRef.current?.id !== m.chat_id) {
                  next.add(m.chat_id);
                  hasExternal = true;
                } else {
                  setLastRead(assessorId, m.chat_id, m.id);
                }
              }
            });
            return next;
          });
          if (hasExternal) {
            playNotificationSound();
          }
        }
      } catch (_) { /* silent */ }

      lastCheckRef.current = nowIso;
      setLastCheckTime(assessorId, nowIso);
    }, 1000);
    intervalRef.current = poll;

    const channel = supabase
      .channel("assessor-chat-global")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mensagens_chat_items",
        },
        (payload) => {
          const msg = payload.new as { chat_id: number; sender_role: string; id: number };
          const currentChat = selectedChatRef.current;
          if (currentChat && msg.chat_id === currentChat.id) {
            loadMessages(currentChat.id);
          } else {
            setUnreadChats((prev) => {
              const next = new Set(prev);
              next.add(msg.chat_id);
              return next;
            });
            playNotificationSound();
          }
        }
      )
      .subscribe();
    realtimeRef.current = channel;

    return () => {
      clearInterval(poll);
      if (realtimeRef.current) {
        supabase.removeChannel(realtimeRef.current);
      }
    };
  }, [assessorId, loadMessages, loadChats]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  useEffect(() => {
    onUnreadChange?.(unreadChats.size);
  }, [unreadChats, onUnreadChange]);

  const openChat = useCallback(async (chat: Chat) => {
    setUnreadChats((prev) => {
      const next = new Set(prev);
      next.delete(chat.id);
      return next;
    });

    let updatedChat = chat;
    if (chat.status === "open" && !chat.assessor_id) {
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/chat-assessor-action`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            action: "assumir",
            chatId: chat.id,
            assessorId,
            assessorName,
          }),
        });
        const data = await res.json();
        if (res.ok && data.success && data.chat) {
          updatedChat = data.chat as Chat;
          setChats((prev) => prev.map((c) => c.id === chat.id ? updatedChat : c));
        }
      } catch (err) {
        console.error("[ChatPanel] openChat assumir error:", err);
      }
    }
    setSelectedChat(updatedChat);
    setShowList(false);
    await loadMessages(chat.id);

    const msgsRes = await fetch(`${supabaseUrl}/functions/v1/chat-mensagens`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ chatId: chat.id, limit: 1 }),
    });
    const msgsData = await msgsRes.json();
    if (msgsData.success && msgsData.messages?.length > 0) {
      const lastMsg = msgsData.messages[msgsData.messages.length - 1];
      setLastRead(assessorId, chat.id, lastMsg.id);
    }
  }, [assessorId, assessorName, loadMessages]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChat) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("Por favor, selecione um arquivo de imagem.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("A imagem deve ter no maximo 5MB.");
      return;
    }
    setUploadingImage(true);
    setUploadError(null);
    try {
      const compressedBlob = await compressChatImage(file);
      const formData = new FormData();
      formData.append("file", compressedBlob, "imagem.jpg");
      formData.append("chat_id", String(selectedChat.id));
      const uploadRes = await fetch(`${supabaseUrl}/functions/v1/upload-chat-image`, {
        method: "POST",
        headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` },
        body: formData,
      });
      if (uploadRes.ok) {
        const uploadResult = await uploadRes.json();
        if (uploadResult.url) { setImageUrl(uploadResult.url); setShowImageInput(true); return; }
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Falha ao ler imagem"));
        reader.readAsDataURL(compressedBlob);
      });
      setImageUrl(dataUrl);
      setShowImageInput(true);
    } catch {
      setImageUrl(""); setShowImageInput(false);
      setUploadError("Falha ao processar imagem. Tente novamente.");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const sendMessage = useCallback(async () => {
    const hasText = newMsg.trim().length > 0;
    const hasImage = imageUrl.trim().length > 0;
    if ((!hasText && !hasImage) || !selectedChat || sending) return;
    const finalImage = hasImage ? imageUrl.trim() : null;
    const isStorageUrl = finalImage && (finalImage.startsWith("http://") || finalImage.startsWith("https://"));
    setSending(true);
    setUploadError(null);
    try {
      const payload: Record<string, unknown> = {
        chat_id: selectedChat.id,
        sender_role: "assessor",
        sender_id: assessorId,
        sender_name: assessorName,
        message: hasText ? newMsg.trim() : "",
      };
      if (finalImage) {
        if (isStorageUrl) payload.image_url = finalImage;
        else payload.image_data = finalImage;
      }
      const { data, error } = await supabase.from("mensagens_chat_items").insert(payload).select().maybeSingle();
      if (error) {
        setUploadError(error.message?.includes("payload") || error.message?.includes("large")
          ? "Imagem muito grande. Tente uma foto menor."
          : "Falha ao enviar mensagem. Tente novamente.");
        return;
      }
      if (data) {
        setMsgs((prev) => [...prev, data as ChatMsg]);
        setNewMsg(""); setImageUrl(""); setShowImageInput(false); setUploadError(null);
        if (selectedChat.citizen_id) {
          criarNotificacao(selectedChat.citizen_id, "chat", "Nova mensagem do gabinete",
            `O assessor ${assessorName} respondeu sua mensagem.`, assessorId, assessorName,
            String(selectedChat.id), "chat");
        }
        notificarRelevantes("chat", "Nova mensagem em conversa",
          `O assessor ${assessorName} respondeu ao cidadao ${selectedChat.citizen_name ?? "anonimo"}.`,
          { remetenteId: assessorId, remetenteNome: assessorName, referenciaId: String(selectedChat.id), referenciaTipo: "chat", excluirIds: [assessorId] });
      }
    } catch {
      setUploadError("Falha ao enviar. Verifique sua conexao.");
    } finally {
      setSending(false);
    }
  }, [newMsg, imageUrl, selectedChat, sending, assessorId, assessorName]);

  const closeChat = async (chatId: number) => {
    if (!confirm("Tem certeza que deseja encerrar esta conversa? O cidadao sera convidado a avaliar o atendimento e o historico sera apagado em 24 horas.")) return;
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/chat-assessor-action`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` },
        body: JSON.stringify({ action: "fechar", chatId, assessorId, assessorName }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.chat) {
        const closedChat = data.chat as Chat;
        setChats((prev) => prev.map((c) => c.id === chatId ? closedChat : c));
        if (selectedChat?.id === chatId) { setSelectedChat(closedChat); await loadMessages(chatId); }
      }
    } catch (err) { console.error("[ChatPanel] closeChat error:", err); }
  };

  const deleteChat = async (chatId: number, citizenName: string | null) => {
    const name = citizenName ?? "Cidadao";
    if (!confirm(`Tem certeza que deseja EXCLUIR PERMANENTEMENTE a conversa com ${name}?\n\nEsta acao e IRREVERSIVEL. Todas as mensagens, imagens e notificacoes serao removidas definitivamente do banco de dados.`)) return;
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/chat-assessor-action`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` },
        body: JSON.stringify({ action: "deletar", chatId, assessorId, assessorName }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setChats((prev) => prev.filter((c) => c.id !== chatId));
        if (selectedChat?.id === chatId) { setSelectedChat(null); setMsgs([]); setShowList(true); }
      } else {
        alert(data.error || "Falha ao excluir conversa.");
      }
    } catch (err) { console.error("[ChatPanel] deleteChat error:", err); alert("Falha ao excluir conversa. Tente novamente."); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#3BBFD4] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const openChats = chats.filter((c) => c.status !== "closed");
  const closedChats = chats.filter((c) => c.status === "closed");
  const totalUnread = [...unreadChats].filter((id) => chats.some((c) => c.id === id && c.status !== "closed")).length;

  const cardBg = "#111827";
  const cardBorder = "rgba(255,255,255,0.12)";
  const dividerColor = "rgba(255,255,255,0.09)";
  const msgsBg = "#0D1629";

  const ChatList = (
    <div className="rounded-2xl overflow-hidden flex flex-col h-full" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
      <div className="p-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${dividerColor}` }}>
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-white text-sm">Conversas</h2>
          {totalUnread > 0 && (
            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">{totalUnread}</span>
          )}
        </div>
        <button onClick={loadChats} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 cursor-pointer transition-colors">
          <i className="ri-refresh-line text-base"></i>
        </button>
      </div>

      {openChats.length === 0 && closedChats.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center p-8">
          <div>
            <i className="ri-chat-3-line text-4xl mb-3 block" style={{ color: "rgba(255,255,255,0.12)" }}></i>
            <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.30)" }}>Nenhuma conversa ativa</p>
            <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.18)" }}>As mensagens dos cidadaos aparecem aqui</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {openChats.length > 0 && (
            <>
              <div className="px-4 py-2" style={{ background: "rgba(255,255,255,0.05)" }}>
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Em aberto ({openChats.length})
                </p>
              </div>
              {openChats.map((chat) => {
                const sc = statusConfig[chat.status] ?? statusConfig.open;
                const hasUnread = unreadChats.has(chat.id);
                const isSelected = selectedChat?.id === chat.id;
                return (
                  <div key={chat.id}
                    className={`flex items-stretch hover:bg-white/[0.06] transition-colors ${isSelected ? "bg-white/10" : ""}`}
                    style={{ borderBottom: `1px solid ${dividerColor}` }}>
                    <button onClick={() => openChat(chat)} className="flex-1 text-left p-4 cursor-pointer">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <button
                              onClick={(e) => { e.stopPropagation(); onCitizenClick?.(chat.citizen_id); }}
                              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 cursor-pointer hover:scale-110 transition-transform"
                              style={{ background: "rgba(59,191,212,0.18)" }}
                              title="Ver perfil completo"
                            >
                              <i className="ri-user-line text-xs" style={{ color: "#3BBFD4" }}></i>
                            </button>
                            {hasUnread && (
                              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border-2 border-[#0D1629]"></span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate text-white">{chat.citizen_name ?? "Cidadao"}</p>
                            {chat.assessor_name && (
                              <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.35)" }}>
                                {chat.assessor_id === assessorId ? "Assumido por voce" : `Assumido por ${chat.assessor_name}`}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0"
                          style={{ color: sc.color, background: sc.bg, borderColor: sc.border }}>
                          {sc.label}
                        </span>
                      </div>
                      {chat.last_message && (
                        <p className="text-xs ml-10 truncate" style={{ color: "rgba(255,255,255,0.25)" }}>
                          {chat.last_message.sender_name}: {chat.last_message.message ?? "..."}
                        </p>
                      )}
                      <p className="text-xs ml-10" style={{ color: "rgba(255,255,255,0.25)" }}>
                        {chat.status === "open" ? "Aguardando ser assumida" : `Expira ${new Date(chat.expires_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}`}
                      </p>
                    </button>
                    {/* Botao excluir conversa individual */}
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteChat(chat.id, chat.citizen_name); }}
                      className="w-10 flex items-center justify-center shrink-0 hover:bg-red-500/10 cursor-pointer transition-colors group"
                      title="Excluir conversa permanentemente"
                    >
                      <i className="ri-delete-bin-line text-sm text-gray-500 group-hover:text-red-400 transition-colors"></i>
                    </button>
                  </div>
                );
              })}
            </>
          )}
          {closedChats.length > 0 && (
            <>
              <div className="px-4 py-2" style={{ background: "rgba(255,255,255,0.05)" }}>
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Encerradas ({closedChats.length})
                </p>
              </div>
              {closedChats.slice(0, 10).map((chat) => {
                const isSelected = selectedChat?.id === chat.id;
                return (
                  <div key={chat.id}
                    className={`flex items-stretch hover:bg-white/[0.06] transition-colors opacity-60 ${isSelected ? "bg-white/10 opacity-100" : ""}`}
                    style={{ borderBottom: `1px solid ${dividerColor}` }}>
                    <button onClick={() => openChat(chat)} className="flex-1 text-left p-4 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.10)" }}>
                          <i className="ri-user-line text-xs" style={{ color: "rgba(255,255,255,0.40)" }}></i>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate" style={{ color: "rgba(255,255,255,0.60)" }}>{chat.citizen_name ?? "Cidadao"}</p>
                          <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.25)" }}>
                            Expira {new Date(chat.expires_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}
                          </p>
                        </div>
                        <span className="text-xs whitespace-nowrap shrink-0" style={{ color: "rgba(255,255,255,0.30)" }}>Encerrada</span>
                      </div>
                    </button>
                    {/* Botao excluir - tambem disponivel para encerradas */}
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteChat(chat.id, chat.citizen_name); }}
                      className="w-10 flex items-center justify-center shrink-0 hover:bg-red-500/10 cursor-pointer transition-colors group"
                      title="Excluir conversa permanentemente"
                    >
                      <i className="ri-delete-bin-line text-sm text-gray-500 group-hover:text-red-400 transition-colors"></i>
                    </button>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );

  const ChatMessages = (
    <div className="rounded-2xl overflow-hidden flex flex-col h-full" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
      {!selectedChat ? (
        <div className="flex-1 flex items-center justify-center text-center p-8">
          <div>
            <i className="ri-chat-1-line text-5xl mb-4 block" style={{ color: "rgba(255,255,255,0.10)" }}></i>
            <p className="font-semibold" style={{ color: "rgba(255,255,255,0.30)" }}>Selecione uma conversa</p>
            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.18)" }}>Ao entrar em uma conversa em aberto, voce a assume automaticamente</p>
          </div>
        </div>
      ) : (
        <>
          <div className="p-4 flex items-center justify-between gap-2" style={{ borderBottom: `1px solid ${dividerColor}` }}>
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => setShowList(true)} className="md:hidden w-8 h-8 flex items-center justify-center rounded-xl bg-white/10 text-gray-400 cursor-pointer shrink-0">
                <i className="ri-arrow-left-line"></i>
              </button>
              <button
                onClick={() => onCitizenClick?.(selectedChat.citizen_id)}
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 cursor-pointer hover:scale-110 transition-transform"
                style={{ background: "rgba(59,191,212,0.15)" }}
                title="Ver perfil completo"
              >
                <i className="ri-user-line" style={{ color: "#3BBFD4" }}></i>
              </button>
              <div className="min-w-0">
                <p className="font-bold text-sm text-white truncate">{selectedChat.citizen_name ?? "Cidadao"}</p>
                <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {selectedChat.status === "in_progress" && (
                    <span style={{ color: "#22C55E" }}>
                      Em atendimento por {selectedChat.assessor_id === assessorId ? "voce" : selectedChat.assessor_name}
                    </span>
                  )}
                  {selectedChat.status === "open" && "Aguardando assessor"}
                  {selectedChat.status === "closed" && (
                    <span style={{ color: "rgba(255,255,255,0.30)" }}>
                      Encerrada · Expira {new Date(selectedChat.expires_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {selectedChat.status !== "closed" && (
                <button onClick={() => closeChat(selectedChat.id)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  style={{ color: "#EF4444", background: "rgba(239,68,68,0.12)", borderColor: "rgba(239,68,68,0.25)" }}>
                  <i className="ri-close-circle-line mr-1"></i>
                  <span className="hidden sm:inline">Encerrar</span>
                </button>
              )}
              <button onClick={() => deleteChat(selectedChat.id, selectedChat.citizen_name)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/10 cursor-pointer transition-colors shrink-0 group"
                title="Excluir conversa permanentemente">
                <i className="ri-delete-bin-line text-sm text-gray-500 group-hover:text-red-400 transition-colors"></i>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: msgsBg }}>
            {msgs.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.25)" }}>Nenhuma mensagem ainda</p>
              </div>
            )}
            {msgs.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender_role === "assessor" ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[80%] px-4 py-2.5 rounded-2xl text-sm"
                  style={msg.sender_role === "assessor"
                    ? { background: "#1E4E6B", color: "white", borderBottomRightRadius: "4px" }
                    : { background: "#1E2535", color: "rgba(255,255,255,0.92)", border: "1px solid rgba(255,255,255,0.10)", borderBottomLeftRadius: "4px" }}>
                  <p className="text-xs font-semibold mb-1 opacity-60">{msg.sender_name}</p>
                  {msg.message && <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.message}</p>}
                  {(msg.image_url || msg.image_data) && (
                    <a href={msg.image_url || msg.image_data || "#"} target="_blank" rel="noopener noreferrer" className="block mt-2">
                      <img src={msg.image_url || msg.image_data || ""} alt="Imagem enviada"
                        className="rounded-lg max-w-full max-h-60 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                    </a>
                  )}
                  <p className="text-xs mt-1 opacity-50">
                    {new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef}></div>
            {/* Typing indicator */}
            {typingUsers.filter(u => u.name !== assessorName).length > 0 && (
              <div className="flex items-center gap-2 px-4 pb-1">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#3BBFD4", animationDelay: "0ms" }}></span>
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#3BBFD4", animationDelay: "150ms" }}></span>
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#3BBFD4", animationDelay: "300ms" }}></span>
                </div>
                <span className="text-xs" style={{ color: "rgba(59,191,212,0.70)" }}>
                  {typingUsers.filter(u => u.name !== assessorName).map(u => u.name).join(", ")} digitando...
                </span>
              </div>
            )}
          </div>

          {selectedChat.status !== "closed" ? (
            <div className="p-3 md:p-4" style={{ borderTop: `1px solid ${dividerColor}` }}>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              {showImageInput && imageUrl && (
                <div className="flex items-center gap-2 mb-2 p-2 rounded-xl" style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${dividerColor}` }}>
                  <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0" style={{ background: "rgba(255,255,255,0.10)" }}>
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-xs flex-1 truncate" style={{ color: "rgba(255,255,255,0.45)" }}>Imagem pronta para enviar</span>
                  <button onClick={() => { setImageUrl(""); setShowImageInput(false); }}
                    className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/10 cursor-pointer shrink-0" style={{ color: "rgba(255,255,255,0.40)" }}>
                    <i className="ri-close-line text-xs"></i>
                  </button>
                </div>
              )}
              {uploadError && (
                <div className="flex items-center gap-2 mb-2 p-2.5 rounded-xl text-xs" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", color: "#EF4444" }}>
                  <i className="ri-error-warning-line shrink-0"></i>
                  <span className="flex-1">{uploadError}</span>
                  <button onClick={() => setUploadError(null)} className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-red-500/20 cursor-pointer shrink-0" style={{ color: "rgba(239,68,68,0.60)" }}>
                    <i className="ri-close-line text-xs"></i>
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => fileInputRef.current?.click()} disabled={uploadingImage}
                  className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-colors shrink-0 disabled:opacity-50"
                  style={{ background: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.50)" }} title="Anexar foto">
                  {uploadingImage ? (
                    <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "rgba(255,255,255,0.30)", borderTopColor: "white" }}></div>
                  ) : (
                    <i className="ri-image-line text-base"></i>
                  )}
                </button>
                <input type="text" value={newMsg} onChange={(e) => { setNewMsg(e.target.value); sendTyping(); }}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder="Responda ao cidadao..." maxLength={500}
                  className="flex-1 min-w-0 rounded-xl px-3 md:px-4 py-2.5 text-sm focus:outline-none transition-all placeholder:text-white/30"
                  style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.15)", color: "white" }} />
                <button onClick={sendMessage} disabled={sending || (!newMsg.trim() && !imageUrl.trim())}
                  className="w-10 h-10 rounded-xl text-white flex items-center justify-center cursor-pointer disabled:opacity-50 shrink-0"
                  style={{ background: "linear-gradient(135deg, #0369A1, #0EA5E9)" }}>
                  <i className="ri-send-plane-fill text-base"></i>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 text-center" style={{ borderTop: `1px solid ${dividerColor}` }}>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.30)" }}>Conversa encerrada</p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.18)" }}>Historico sera apagado em 24 horas</p>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <>
      <div className="md:hidden" style={{ height: "calc(100vh - 220px)" }}>
        {showList ? ChatList : ChatMessages}
      </div>
      <div className="hidden md:grid md:grid-cols-5 gap-5" style={{ height: "calc(100vh - 210px)", minHeight: "500px" }}>
        <div className="md:col-span-2">{ChatList}</div>
        <div className="md:col-span-3">{ChatMessages}</div>
      </div>
    </>
  );
}