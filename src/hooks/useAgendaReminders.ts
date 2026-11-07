import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Hook que faz polling do endpoint check-agenda-reminders a cada 30 minutos.
 * Garante que lembretes de 12h, 1h, 30min e 10min sejam enviados para todos os eventos futuros.
 * Tambem processa emails pendentes (notificacoes com email_enviado=false).
 * So e ativado se houver eventos futuros na agenda.
 */
export function useAgendaReminders(enabled: boolean = true) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const checkReminders = async () => {
      try {
        // Verificar se existem eventos futuros antes de chamar
        const today = new Date().toISOString().split("T")[0];
        const { count, error } = await supabase
          .from("agenda")
          .select("*", { count: "exact", head: true })
          .gte("event_date", today);

        if (error) {
          console.error("[useAgendaReminders] Erro ao verificar eventos futuros:", error.message);
          return;
        }
        
        if (!count || count === 0) {
          // Mesmo sem eventos futuros, processa emails pendentes
          supabase.functions.invoke("resend-pending-notifications", {}).catch((e) => {
            console.warn("[useAgendaReminders] resend-pending-notifications falhou:", e?.message || e);
          });
          return;
        }

        console.log("[useAgendaReminders] Verificando lembretes para", count, "eventos futuros...");
        
        // Chamar edge function de lembretes
        const { data, error: fnErr } = await supabase.functions.invoke("check-agenda-reminders", {});
        
        if (fnErr) {
          console.error("[useAgendaReminders] check-agenda-reminders falhou:", fnErr.message || fnErr);
        } else {
          console.log("[useAgendaReminders] check-agenda-reminders resultado:", data);
        }

        // Tambem processar emails pendentes que possam ter ficado para tras
        supabase.functions.invoke("resend-pending-notifications", {}).catch((e) => {
          console.warn("[useAgendaReminders] resend-pending-notifications falhou:", e?.message || e);
        });
      } catch (err) {
        console.error("[useAgendaReminders] Excecao ao verificar lembretes:", err instanceof Error ? err.message : String(err));
      }
    };

    // Primeira execucao apos 10 segundos (para nao competir com mount)
    const initialTimeout = setTimeout(() => {
      checkReminders();
    }, 10_000);

    // BUGFIX B5: Polling reduzido de 30min para 10min para melhor cobertura de janelas de lembrete
    intervalRef.current = setInterval(checkReminders, 10 * 60 * 1000);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled]);
}