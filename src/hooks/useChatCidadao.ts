import { useState, useEffect, useRef, useCallback } from "react";
import { supabase, supabaseUrl, supabaseAnonKey } from "@/lib/supabase";

interface ChatMessage {
  id: number;
  sender_role: string;
  sender_name: string | null;
  message: string | null;
  image_url: string | null;
  image_data: string | null;
  created_at: string;
}

export function useChatCidadao() {
  const [chatId, setChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClosed, setIsClosed] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const realtimeRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const chatIdRef = useRef<number | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    chatIdRef.current = chatId;
  }, [chatId]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const clearChat = useCallback(() => {
    setChatId(null);
    setMessages([]);
    setIsClosed(false);
    setError(null);
    setLoading(false);
    messagesRef.current = [];
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (realtimeRef.current) {
      supabase.removeChannel(realtimeRef.current);
      realtimeRef.current = null;
    }
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }
  }, []);

  const loadMessages = useCallback(async () => {
    const currentChatId = chatIdRef.current;
    if (!currentChatId) return;
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/chat-mensagens`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ chatId: currentChatId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        console.error("[useChatCidadao] loadMessages error:", data.error);
        return;
      }

      const serverMsgs: ChatMessage[] = data.messages ?? [];

      setMessages((prev) => {
        // Server has messages — use them directly (they're the source of truth)
        if (serverMsgs.length > 0) {
          // Preserve any local optimistic messages not yet on server
          const serverIds = new Set(serverMsgs.map((s) => s.id));
          const localOptimistic = prev.filter((m) => m.id < 0 && !serverIds.has(m.id));
          if (localOptimistic.length > 0) {
            const merged = [...serverMsgs, ...localOptimistic];
            merged.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
            return merged;
          }
          return serverMsgs;
        }
        // Server empty but local has messages — keep local (might be propagation delay)
        if (prev.length > 0) {
          return prev;
        }
        return [];
      });

      if (data.chat && data.chat.status === "closed") {
        setIsClosed(true);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    } catch (err) {
      console.error("[useChatCidadao] loadMessages exception:", err);
    }
  }, []);

  const startChat = useCallback(async (
    nome: string,
    email: string,
    telefone: string,
    mensagem: string
  ): Promise<{ success: boolean; firstMessage?: ChatMessage }> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/chat-cidadao-anonimo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ nome, email, telefone, mensagem }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Falha ao iniciar conversa");
      }

      const newChatId = data.chatId as number;
      setChatId(newChatId);
      chatIdRef.current = newChatId;
      setIsClosed(false);

      const firstMsg = data.firstMessage as ChatMessage | null;

      if (firstMsg) {
        setMessages([firstMsg]);
        messagesRef.current = [firstMsg];
      }

      // Trigger server load after a short delay for DB propagation
      loadTimeoutRef.current = setTimeout(() => {
        loadMessages();
      }, 300);

      // Safety timeout: always clear loading after 5s max
      safetyTimeoutRef.current = setTimeout(() => {
        setLoading(false);
      }, 5000);

      return { success: true, firstMessage: firstMsg ?? undefined };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setError(msg);
      setLoading(false);
      return { success: false };
    }
  }, [loadMessages]);

  const sendMessage = useCallback(async (
    nome: string,
    mensagem: string,
    imageUrl?: string,
    imageData?: string
  ): Promise<boolean> => {
    if (!chatIdRef.current) return false;
    setLoading(true);
    setError(null);
    try {
      const optimisticMsg: ChatMessage = {
        id: -Date.now(),
        sender_role: "citizen",
        sender_name: nome,
        message: mensagem || null,
        image_url: imageUrl || null,
        image_data: imageData || null,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, optimisticMsg]);

      const body: Record<string, unknown> = {
        chatId: chatIdRef.current,
        nome,
        mensagem,
      };
      if (imageUrl && imageUrl.trim()) body.image_url = imageUrl.trim();
      if (imageData && imageData.trim()) body.image_data = imageData.trim();

      const res = await fetch(`${supabaseUrl}/functions/v1/chat-cidadao-mensagem`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
        throw new Error(data.error || "Falha ao enviar mensagem");
      }

      if (data.msg) {
        setMessages((prev) => prev.map((m) =>
          m.id === optimisticMsg.id ? (data.msg as ChatMessage) : m
        ));
      }

      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Polling 30s como fallback de segurança (Realtime já cobre os updates instantâneos)
  useEffect(() => {
    if (chatId && !isClosed) {
      // Immediate first load
      const initialTimeout = setTimeout(() => {
        loadMessages();
      }, 100);

      intervalRef.current = setInterval(loadMessages, 30000);

      const channel = supabase
        .channel(`chat-anonimo-${chatId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "mensagens_chat_items",
            filter: `chat_id=eq.${chatId}`,
          },
          () => {
            loadMessages();
          }
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            console.log("[useChatCidadao] Realtime subscribed for chat", chatId);
          }
        });
      realtimeRef.current = channel;

      return () => {
        clearTimeout(initialTimeout);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        if (realtimeRef.current) {
          supabase.removeChannel(realtimeRef.current);
          realtimeRef.current = null;
        }
      };
    }
  }, [chatId, isClosed, loadMessages]);

  return {
    chatId,
    messages,
    loading,
    error,
    isClosed,
    startChat,
    sendMessage,
    clearChat,
    loadMessages,
  };
}