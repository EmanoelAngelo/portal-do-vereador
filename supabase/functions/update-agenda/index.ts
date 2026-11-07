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
    if (!res.ok) console.error(`[update-agenda] Email dispatch HTTP ${res.status} para notif ${notifId}`);
  }).catch((err) => {
    clearTimeout(timeout);
    console.error(`[update-agenda] Email dispatch falhou para notif ${notifId}: ${err?.message || err}`);
  });
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

    const body = await req.json();
    const { id, title, description, event_date, start_time, end_time, location, editor_id, editor_name } = body;

    if (!id || !title || !event_date) {
      return new Response(JSON.stringify({ success: false, error: "Campos obrigatórios: id, title, event_date" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date();
    today.setHours(0,0,0,0);
    const eventDate = new Date(event_date + "T00:00:00-03:00");
    if (eventDate < today) {
      return new Response(JSON.stringify({ success: false, error: "Não é possível agendar compromissos em datas passadas." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: oldEvent } = await supabase
      .from("agenda")
      .select("event_date, start_time")
      .eq("id", id)
      .single();

    const dataMudou = !oldEvent || oldEvent.event_date !== event_date || oldEvent.start_time !== start_time;

    const updatePayload: Record<string, unknown> = {
      title,
      description: description ?? null,
      event_date,
      start_time: start_time ?? null,
      end_time: end_time ?? null,
      location: location ?? null,
      updated_at: new Date().toISOString(),
    };

    if (dataMudou) {
      updatePayload.reminder_12h_sent = false;
      updatePayload.reminder_1h_sent = false;
      updatePayload.reminder_30min_sent = false;
      updatePayload.reminder_10min_sent = false;
    }

    const { data: updated, error: updateErr } = await supabase
      .from("agenda")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (updateErr || !updated) {
      return new Response(JSON.stringify({ success: false, error: updateErr?.message || "Erro ao atualizar" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const horaStr = start_time ? ` às ${start_time}` : "";
    const localStr = location ? ` — ${location}` : "";
    const dataStr = formatBRDateOnly(event_date + "T00:00:00-03:00");
    const mensagem = `${dataStr}${horaStr}${localStr}`;

    // 🔥 BUGFIX: Incluir ADMIN também
    const roles = ["assessor", "vereador", "admin"];
    const { data: relevantes } = await supabase
      .from("profiles")
      .select("id")
      .in("role", roles);

    const editorNome = editor_name ?? "Sistema";
    const notifIds: string[] = [];

    if (relevantes) {
      for (const r of relevantes) {
        const { data: notifId } = await supabase.rpc("insert_notification", {
          p_user_id: r.id,
          p_tipo: "agenda",
          p_titulo: `Compromisso atualizado: ${title}`,
          p_mensagem: `${editorNome} atualizou: "${title}" — ${mensagem}`,
          p_remetente_id: editor_id ?? null,
          p_remetente_nome: editorNome,
          p_referencia_id: String(id),
          p_referencia_tipo: "agenda",
        });
        if (notifId) notifIds.push(notifId as string);
      }
    }

    for (const nid of notifIds) {
      dispatchEmail(supabaseUrl, serviceRoleKey, nid);
    }

    fetch(`${supabaseUrl}/functions/v1/resend-pending-notifications`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceRoleKey}` },
      body: JSON.stringify({}),
    }).catch(() => {});

    return new Response(JSON.stringify({ success: true, data: updated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
