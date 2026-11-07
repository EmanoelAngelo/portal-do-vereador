import { useEffect, useRef, useCallback, useState } from "react";
import { supabase } from "@/lib/supabase";

interface TypingUser {
  name: string;
  timestamp: number;
}

/**
 * Hook de indicador de "digitando..." usando Supabase Broadcast (WebSocket real-time).
 * MAIS CONFIAVEL que postgres_changes — nao depende do banco, nao tem RLS,
 * nao tem problemas de filtro bigint, e e instantaneo.
 *
 * Fluxo:
 * 1. Usuario digita → broadcast event "typing" no canal `chat-typing-{chatId}`
 * 2. Outros clientes no mesmo canal recebem o evento em tempo real
 * 3. Cleanup de 3s remove indicadores stale do estado local
 *
 * Uso:
 *   const { typingUsers, sendTyping } = useTypingIndicator(chatId, userName);
 *   // No onChange do input: sendTyping()
 *   // No componente: mostrar "digitando..." se typingUsers.length > 0
 */
export function useTypingIndicator(chatId: number | null, userName: string | null, userRole?: string) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastSentRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Limpa usuarios que pararam de digitar ha mais de 3 segundos
  const cleanupStale = useCallback(() => {
    const now = Date.now();
    setTypingUsers((prev) => {
      const filtered = prev.filter((u) => now - u.timestamp < 3000);
      if (filtered.length !== prev.length) return filtered;
      return prev;
    });
  }, []);

  useEffect(() => {
    if (!chatId || !userName) return;

    // Canal dedicado para broadcast de typing deste chat especifico
    const channel = supabase
      .channel(`chat-typing-${chatId}`)
      .on(
        "broadcast",
        { event: "typing" },
        (payload) => {
          const payloadData = payload.payload as { user_name: string; role?: string };
          if (!payloadData.user_name || payloadData.user_name === userName) return;

          setTypingUsers((prev) => {
            const now = Date.now();
            // Remove entrada anterior do mesmo usuario (evita duplicatas)
            const filtered = prev.filter((u) => u.name !== payloadData.user_name);
            return [...filtered, { name: payloadData.user_name, timestamp: now }];
          });
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("[useTypingIndicator] Broadcast channel subscribed for chat", chatId);
        } else if (status === "CHANNEL_ERROR") {
          console.warn("[useTypingIndicator] Broadcast channel error for chat", chatId);
        }
      });

    channelRef.current = channel;

    // Cleanup de usuarios stale a cada 1s
    intervalRef.current = setInterval(cleanupStale, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [chatId, userName, cleanupStale]);

  // Envia evento de typing (throttled a cada 1.2s)
  const sendTyping = useCallback(() => {
    if (!chatId || !userName) return;
    const now = Date.now();
    if (now - lastSentRef.current < 1200) return;
    lastSentRef.current = now;

    // Broadcast direto via WebSocket — nao passa pelo banco
    channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { user_name: userName, role: userRole || "unknown" },
    });
  }, [chatId, userName, userRole]);

  return { typingUsers, sendTyping };
}