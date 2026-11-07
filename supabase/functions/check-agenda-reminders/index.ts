import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getServiceRoleKey(): string {
  const possibleNames = ["SERVICE_ROLE_KEY","SUPABASE_SERVICE_ROLE_KEY","SUPABASE_SERVICE_KEY"];
  for (const name of possibleNames) {
    const val = Deno.env.get(name);
    if (val && val.trim().length > 20) return val.trim();
  }
  return "";
}

function formatBRDateOnly(date: string | Date | number): string {
  return new Date(date).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function dispatchEmail(supabaseUrl: string, serviceRoleKey: string, notifId: string): void {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  fetch(`${supabaseUrl}/functions/v1/processar-email-notificacao`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceRoleKey}` },
    body: JSON.stringify({ notifId }),
    signal: controller.signal,
  }).then((res) => {
    clearTimeout(timeout);
    if (!res.ok) console.error(`[agenda-email] HTTP ${res.status} para notif ${notifId}`);
  }).catch((err) => {
    clearTimeout(timeout);
    console.error(`[agenda-email] Falha ao processar notif ${notifId}: ${err?.message || err}`);
  });
}

function shouldSendReminder(
  eventDate: string,
  eventTime: string,
  createdAt: string,
  hoursBefore: number,
  alreadySent: boolean,
): boolean {
  if (alreadySent) return false;

  const eventDateTime = new Date(eventDate + "T" + (eventTime || "00:00:00") + "-03:00");
  const now = new Date();

  if (now >= eventDateTime) return false;

  const msUntilEvent = eventDateTime.getTime() - now.getTime();
  const minutesUntilEvent = msUntilEvent / (1000 * 60);
  const hoursUntilEvent = minutesUntilEvent / 60;

  const createdDateStr = new Date(createdAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const eventDateStr = eventDateTime.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const isSameDayCreation = createdDateStr === eventDateStr;

  // --- LEMBRETE DE 12 HORAS ---
  if (hoursBefore === 12) {
    if (isSameDayCreation) return false;

    const idealTime = new Date(eventDateTime.getTime() - 12 * 60 * 60 * 1000);
    const idealHour = idealTime.getHours();
    const adjustedTime = new Date(idealTime);

    if (idealHour >= 20) {
      adjustedTime.setHours(20, 0, 0, 0);
    } else if (idealHour < 8) {
      adjustedTime.setDate(adjustedTime.getDate() - 1);
      adjustedTime.setHours(20, 0, 0, 0);
    }

    return now >= adjustedTime;
  }

  // --- LEMBRETE DE 1 HORA ---
  if (hoursBefore === 1) {
    if (hoursUntilEvent < 1) return false;

    const idealTime = new Date(eventDateTime.getTime() - 1 * 60 * 60 * 1000);
    const idealHour = idealTime.getHours();
    const adjustedTime = new Date(idealTime);

    if (idealHour >= 20) {
      adjustedTime.setHours(20, 0, 0, 0);
    } else if (idealHour < 8) {
      adjustedTime.setHours(8, 0, 0, 0);
    }

    return now >= adjustedTime;
  }

  // --- LEMBRETE DE 30 MINUTOS ---
  if (hoursBefore === 0.5) {
    if (!isSameDayCreation) return false;
    if (minutesUntilEvent < 30) return false;
    const idealTime = new Date(eventDateTime.getTime() - 30 * 60 * 1000);
    return now >= idealTime;
  }

  // --- LEMBRETE DE 10 MINUTOS ---
  if (hoursBefore === 10 / 60) {
    if (!isSameDayCreation) return false;
    if (minutesUntilEvent < 10) return false;
    const idealTime = new Date(eventDateTime.getTime() - 10 * 60 * 1000);
    return now >= idealTime;
  }

  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = getServiceRoleKey();
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ success: false, error: "Config missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

    const today = new Date().toISOString().split("T")[0];
    const now = new Date();

    const { data: events, error: eventsErr } = await supabase
      .from("agenda")
      .select("*")
      .gte("event_date", today)
      .order("event_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (eventsErr || !events) {
      return new Response(JSON.stringify({ success: false, error: eventsErr?.message || "Nenhum evento" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const futureEvents = events.filter((event) => {
      const eventDateTime = new Date(
        event.event_date + "T" + (event.start_time || "00:00:00") + "-03:00"
      );
      return eventDateTime > now;
    });

    const results: string[] = [];
    // BUGFIX B2: admin incluído na lista de destinatários
    const roles = ["assessor", "vereador", "admin"];

    const { data: relevantes } = await supabase
      .from("profiles")
      .select("id")
      .in("role", roles);

    if (!relevantes || relevantes.length === 0) {
      fetch(`${supabaseUrl}/functions/v1/resend-pending-notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceRoleKey}` },
        body: JSON.stringify({}),
      }).catch(() => {});

      return new Response(JSON.stringify({ success: true, reminders_sent: 0, details: ["Nenhum usuario para notificar"] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const event of futureEvents) {
      const eventTime = event.start_time || "00:00:00";
      let justSentReminder = false;

      // 1) Lembrete de 12h
      if (shouldSendReminder(event.event_date, eventTime, event.created_at, 12, event.reminder_12h_sent)) {
        const dataStr = formatBRDateOnly(event.event_date + "T00:00:00");
        const horaStr = event.start_time ? ` as ${event.start_time}` : "";
        const localStr = event.location ? ` — ${event.location}` : "";
        const mensagem = `Lembrete: "${event.title}" acontece ${dataStr}${horaStr}${localStr}`;

        for (const r of relevantes) {
          const { data: notifId } = await supabase.rpc("insert_notification", {
            p_user_id: r.id,
            p_tipo: "agenda",
            p_titulo: `⏰ Lembrete (12h): ${event.title}`,
            p_mensagem: mensagem,
            p_remetente_id: null,
            p_remetente_nome: "Sistema",
            p_referencia_id: String(event.id),
            p_referencia_tipo: "agenda",
          });
          if (notifId) dispatchEmail(supabaseUrl, serviceRoleKey, notifId as string);
        }

        await supabase.from("agenda").update({ reminder_12h_sent: true }).eq("id", event.id);
        results.push(`12h reminder for event #${event.id}: "${event.title}"`);
        justSentReminder = true;
      }

      // 2) Lembrete de 1h
      if (!justSentReminder && shouldSendReminder(event.event_date, eventTime, event.created_at, 1, event.reminder_1h_sent)) {
        const dataStr = formatBRDateOnly(event.event_date + "T00:00:00");
        const horaStr = event.start_time ? ` as ${event.start_time}` : "";
        const localStr = event.location ? ` — ${event.location}` : "";
        const mensagem = `🔔 "${event.title}" comeca em 1 hora! ${dataStr}${horaStr}${localStr}`;

        for (const r of relevantes) {
          const { data: notifId } = await supabase.rpc("insert_notification", {
            p_user_id: r.id,
            p_tipo: "agenda",
            p_titulo: `🔔 Em 1 hora: ${event.title}`,
            p_mensagem: mensagem,
            p_remetente_id: null,
            p_remetente_nome: "Sistema",
            p_referencia_id: String(event.id),
            p_referencia_tipo: "agenda",
          });
          if (notifId) dispatchEmail(supabaseUrl, serviceRoleKey, notifId as string);
        }

        await supabase.from("agenda").update({ reminder_1h_sent: true }).eq("id", event.id);
        results.push(`1h reminder for event #${event.id}: "${event.title}"`);
        justSentReminder = true;
      }

      // 3) Lembrete de 30min
      if (!justSentReminder && shouldSendReminder(event.event_date, eventTime, event.created_at, 0.5, event.reminder_30min_sent)) {
        const dataStr = formatBRDateOnly(event.event_date + "T00:00:00");
        const horaStr = event.start_time ? ` as ${event.start_time}` : "";
        const localStr = event.location ? ` — ${event.location}` : "";
        const mensagem = `⏳ "${event.title}" comeca em 30 minutos! ${dataStr}${horaStr}${localStr}`;

        for (const r of relevantes) {
          const { data: notifId } = await supabase.rpc("insert_notification", {
            p_user_id: r.id,
            p_tipo: "agenda",
            p_titulo: `⏳ Em 30 minutos: ${event.title}`,
            p_mensagem: mensagem,
            p_remetente_id: null,
            p_remetente_nome: "Sistema",
            p_referencia_id: String(event.id),
            p_referencia_tipo: "agenda",
          });
          if (notifId) dispatchEmail(supabaseUrl, serviceRoleKey, notifId as string);
        }

        await supabase.from("agenda").update({ reminder_30min_sent: true }).eq("id", event.id);
        results.push(`30min reminder for event #${event.id}: "${event.title}"`);
        justSentReminder = true;
      }

      // 4) Lembrete de 10min
      if (!justSentReminder && shouldSendReminder(event.event_date, eventTime, event.created_at, 10/60, event.reminder_10min_sent)) {
        const dataStr = formatBRDateOnly(event.event_date + "T00:00:00");
        const horaStr = event.start_time ? ` as ${event.start_time}` : "";
        const mensagem = `🚨 "${event.title}" comeca em 10 minutos! ${dataStr}${horaStr}`;

        for (const r of relevantes) {
          const { data: notifId } = await supabase.rpc("insert_notification", {
            p_user_id: r.id,
            p_tipo: "agenda",
            p_titulo: `🚨 Em 10 minutos: ${event.title}`,
            p_mensagem: mensagem,
            p_remetente_id: null,
            p_remetente_nome: "Sistema",
            p_referencia_id: String(event.id),
            p_referencia_tipo: "agenda",
          });
          if (notifId) dispatchEmail(supabaseUrl, serviceRoleKey, notifId as string);
        }

        await supabase.from("agenda").update({ reminder_10min_sent: true }).eq("id", event.id);
        results.push(`10min reminder for event #${event.id}: "${event.title}"`);
      }
    }

    if (results.length === 0) {
      results.push("Nenhum lembrete pendente no momento");
    }

    fetch(`${supabaseUrl}/functions/v1/resend-pending-notifications`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceRoleKey}` },
      body: JSON.stringify({}),
    }).catch(() => {});

    return new Response(JSON.stringify({ success: true, reminders_sent: results.length, details: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
