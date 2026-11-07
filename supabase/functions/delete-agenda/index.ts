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
    if (!res.ok) console.error(`[delete-agenda] Email dispatch HTTP ${res.status} para notif ${notifId}`);
  }).catch((err) => {
    clearTimeout(timeout);
    console.error(`[delete-agenda] Email dispatch falhou para notif ${notifId}: ${err?.message || err}`);
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
    const { id, deleted_by, deleted_by_name } = body;

    if (!id) {
      return new Response(JSON.stringify({ success: false, error: "id é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existing } = await supabase
      .from("agenda")
      .select("title")
      .eq("id", id)
      .single();

    const { error: deleteErr } = await supabase
      .from("agenda")
      .delete()
      .eq("id", id);

    if (deleteErr) {
      return new Response(JSON.stringify({ success: false, error: deleteErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const titulo = existing?.title ?? "Compromisso";

    // 🔥 BUGFIX: Incluir ADMIN também
    const roles = ["assessor", "vereador", "admin"];
    const { data: relevantes } = await supabase
      .from("profiles")
      .select("id")
      .in("role", roles);

    const nomeQuemExcluiu = deleted_by_name ?? "Sistema";
    const notifIds: string[] = [];

    if (relevantes) {
      for (const r of relevantes) {
        const { data: notifId } = await supabase.rpc("insert_notification", {
          p_user_id: r.id,
          p_tipo: "agenda",
          p_titulo: `Compromisso cancelado: ${titulo}`,
          p_mensagem: `${nomeQuemExcluiu} cancelou o compromisso "${titulo}".`,
          p_remetente_id: deleted_by ?? null,
          p_remetente_nome: nomeQuemExcluiu,
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

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
