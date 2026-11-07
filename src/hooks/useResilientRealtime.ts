import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";

/**
 * useResilientRealtime — canal Supabase Realtime com reconexão automática.
 *
 * Quando CHANNEL_ERROR, CLOSED ou TIMED_OUT ocorrem, o hook tenta re-subscribe
 * com backoff exponencial (1s → 2s → 4s → 8s → máx 30s).
 * Ao receber SUBSCRIBED, o backoff reseta.
 *
 * O callback `onChange` é chamado em toda alteração na tabela (INSERT/UPDATE/DELETE).
 *
 * @param channelName  Nome único do canal (ex: "sistema-cidadao-vagas")
 * @param tableName    Nome da tabela no schema public
 * @param onChange     Callback disparado em cada evento postgres_changes
 * @param enabled      Se false, o canal não é criado
 * @param filter       Filtro opcional no formato "coluna=eq.valor" (ex: "cidadao_id=eq.xxx")
 */
export function useResilientRealtime(
  channelName: string,
  tableName: string,
  onChange: () => void | Promise<void>,
  enabled: boolean = true,
  filter?: string
) {
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const mountedRef = useRef(true);

  const getBackoff = useCallback(() => {
    // 1s, 2s, 4s, 8s, 16s, 30s (cap)
    return Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
  }, []);

  const subscribe = useCallback(() => {
    if (!mountedRef.current || !enabled) return;

    // Remove canal anterior se existir
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Configuração do canal
    const channelConfig: { event: string; schema: string; table: string; filter?: string } = {
      event: "*",
      schema: "public",
      table: tableName,
    };
    if (filter) {
      channelConfig.filter = filter;
    }

    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", channelConfig, () => {
        try {
          onChange();
        } catch (e) {
          console.warn(`[Realtime:${channelName}] Callback erro (ignorado):`, e);
        }
      })
      .subscribe((status: string) => {
        if (!mountedRef.current) return;

        if (status === "SUBSCRIBED") {
          console.log(`[Realtime:${channelName}] Conectado`);
          retryCountRef.current = 0; // reset backoff
        } else if (status === "CHANNEL_ERROR") {
          console.warn(`[Realtime:${channelName}] Erro de conexão — reconectando em ${getBackoff() / 1000}s...`);
          scheduleRetry();
        } else if (status === "TIMED_OUT") {
          console.warn(`[Realtime:${channelName}] Timeout — reconectando em ${getBackoff() / 1000}s...`);
          scheduleRetry();
        } else if (status === "CLOSED") {
          console.warn(`[Realtime:${channelName}] Fechado — reconectando em ${getBackoff() / 1000}s...`);
          scheduleRetry();
        }
      });

    channelRef.current = channel;
  }, [channelName, tableName, onChange, enabled, filter, getBackoff]);

  const scheduleRetry = useCallback(() => {
    if (!mountedRef.current) return;

    // Limpa timer pendente
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    const delay = getBackoff();
    retryCountRef.current++;

    retryTimerRef.current = setTimeout(() => {
      if (mountedRef.current) {
        subscribe();
      }
    }, delay);
  }, [getBackoff, subscribe]);

  useEffect(() => {
    mountedRef.current = true;
    retryCountRef.current = 0;

    subscribe();

    return () => {
      mountedRef.current = false;

      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [subscribe]);

  return {
    /** Força uma reconexão manual (reseta backoff) */
    reconnect: () => {
      retryCountRef.current = 0;
      subscribe();
    },
  };
}