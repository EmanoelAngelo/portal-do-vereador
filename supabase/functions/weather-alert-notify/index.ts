import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getServiceRoleKey(): string {
  const possibleNames = [
    "SERVICE_ROLE_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SERVICE_KEY",
    "VITE_SUPABASE_SERVICE_ROLE_KEY",
    "VITE_SUPABASE_SERVICE_KEY",
  ];
  for (const name of possibleNames) {
    const val = Deno.env.get(name);
    if (val && val.trim().length > 20) return val.trim();
  }
  return "";
}

function getTodayKey(): string {
  return new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function formatBRDate(date: string | Date | number): string {
  return new Date(date).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function buildWeatherAlertHTML(alert: Record<string, unknown>): string {
  const title = (alert.title as string) || "Alerta de Tempo";
  const message = (alert.message as string) || "";
  const safety = (alert.safety as string) || "";
  const level = (alert.level as string) || "orange";
  const color = level === "red" ? "#EF4444" : "#F97316";
  const icon = level === "red" ? "⚠️" : "🌩️";

  return `
    <div style="font-family: 'Segoe UI', system-ui, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #0D1629; color: #fff; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="font-size: 32px; margin-bottom: 8px;">${icon}</div>
        <h2 style="color: ${color}; margin: 0 0 4px; font-size: 20px; font-weight: 800;">${title}</h2>
        <p style="color: #3BBFD4; font-size: 11px; letter-spacing: 2px; text-transform: uppercase;">Gabinete Arthur Halal — Pelotas/RS</p>
      </div>
      <div style="background: rgba(255,255,255,0.06); border-radius: 12px; padding: 16px; margin-bottom: 20px;">
        <p style="color: rgba(255,255,255,0.75); font-size: 14px; line-height: 1.6; margin: 0 0 12px;">${message}</p>
        ${safety ? `<div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 12px; margin-top: 12px;">
          <p style="color: #3BBFD4; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px;">Recomendações de Segurança</p>
          <p style="color: rgba(255,255,255,0.65); font-size: 13px; line-height: 1.5; margin: 0;">${safety}</p>
        </div>` : ""}
      </div>
      <p style="font-size: 11px; color: rgba(255,255,255,0.25); text-align: center; margin: 0;">
        Você recebeu este alerta porque está cadastrado no Sistema de Oportunidades do Vereador Arthur Halal.<br>
        Mantenha-se seguro e siga as recomendações das autoridades locais.
      </p>
    </div>
  `;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const logs: string[] = [];
  const startTime = new Date().toISOString();
  logs.push(`[${startTime}] weather-alert-notify v1 iniciado`);

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = getServiceRoleKey();

  if (!resendApiKey || !supabaseUrl || !serviceRoleKey) {
    const missing = [];
    if (!resendApiKey) missing.push("RESEND_API_KEY");
    if (!supabaseUrl) missing.push("SUPABASE_URL");
    if (!serviceRoleKey) missing.push("SERVICE_ROLE_KEY");
    logs.push(`FATAL: Config missing: ${missing.join(", ")}`);
    return new Response(JSON.stringify({ success: false, error: "Configuração incompleta no servidor", logs }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const body = await req.json();
    const { alert, dateKey } = body;

    if (!alert || !alert.title || !alert.message) {
      logs.push("ERRO: alerta inválido ou incompleto");
      return new Response(JSON.stringify({ success: false, error: "Alerta inválido", logs }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const todayKey = dateKey || getTodayKey();
    const alertType = alert.level === "red" ? "weather_alert_red" : "weather_alert_orange";
    const referenciaId = `${todayKey}_${alertType}`;

    logs.push(`Alerta: ${alert.title} | Data: ${todayKey} | Ref: ${referenciaId}`);

    // 1. Verificar se já existe notificação para este alerta hoje (anti-duplicata)
    const { data: existing, error: existingErr } = await supabase
      .from("notificacoes")
      .select("id")
      .eq("referencia_id", referenciaId)
      .eq("tipo", alertType)
      .limit(1);

    if (existingErr) {
      logs.push(`ERRO ao verificar duplicata: ${existingErr.message}`);
    }

    if (existing && existing.length > 0) {
      logs.push(`SKIP: Notificação já existe para ${referenciaId} (anti-duplicata)`);
      return new Response(JSON.stringify({
        success: true,
        notified: false,
        reason: "already_sent",
        logs,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Buscar todos os usuários cadastrados (exceto default)
    const { data: profiles, error: profilesErr } = await supabase
      .from("profiles")
      .select("id, email, is_default_user, role, full_name")
      .eq("is_default_user", false)
      .not("email", "is", null);

    if (profilesErr) {
      logs.push(`ERRO ao buscar profiles: ${profilesErr.message}`);
      return new Response(JSON.stringify({ success: false, error: profilesErr.message, logs }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!profiles || profiles.length === 0) {
      logs.push("Nenhum usuário encontrado para notificar");
      return new Response(JSON.stringify({ success: true, notified: false, reason: "no_users", logs }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logs.push(`Usuários encontrados: ${profiles.length}`);

    // 3. Criar notificação no sistema para cada usuário
    const notificacoes = profiles.map((p) => ({
      user_id: p.id,
      tipo: alertType,
      titulo: alert.title,
      mensagem: `${alert.message}\n\n${alert.safety || ""}`,
      remetente_id: "00000000-0000-0000-0000-000000000000",
      remetente_nome: "Sistema de Alerta de Tempo",
      referencia_id: referenciaId,
      referencia_tipo: "weather_alert",
      lida: false,
      email_enviado: false,
    }));

    const { data: inserted, error: insertErr } = await supabase
      .from("notificacoes")
      .insert(notificacoes)
      .select("id, user_id");

    if (insertErr) {
      logs.push(`ERRO ao inserir notificações: ${insertErr.message}`);
      return new Response(JSON.stringify({ success: false, error: insertErr.message, logs }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const notifCount = inserted?.length || 0;
    logs.push(`Notificações inseridas: ${notifCount}`);

    // 4. Enviar emails via Resend (batch para todos os usuários)
    const recipientEmails = profiles
      .map((p) => p.email)
      .filter((e) => e && e.includes("@")) as string[];

    if (recipientEmails.length === 0) {
      logs.push("Nenhum email válido encontrado para envio");
      return new Response(JSON.stringify({ success: true, notified: true, notifCount, emailSent: false, reason: "no_emails", logs }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = buildWeatherAlertHTML(alert);
    logs.push(`Enviando email para ${recipientEmails.length} destinatários`);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Gabinete Arthur Halal <gabinete@emanoel.shop>",
        to: recipientEmails,
        subject: alert.title,
        html,
      }),
    });

    const resBody = await res.json();
    const emailSuccess = res.ok;
    logs.push(`Resend status: ${res.status}, id: ${resBody.id || "none"}`);

    // 5. Atualizar notificações como email enviado
    if (emailSuccess && inserted) {
      const notifIds = inserted.map((n) => n.id);
      const { error: updateErr } = await supabase
        .from("notificacoes")
        .update({
          email_enviado: true,
          email_enviado_em: formatBRDate(new Date()),
        })
        .in("id", notifIds);

      if (updateErr) {
        logs.push(`ERRO ao marcar emails enviados: ${updateErr.message}`);
      } else {
        logs.push(`Emails marcados como enviados: ${notifIds.length}`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      notified: true,
      notifCount,
      emailSent: emailSuccess,
      emailCount: recipientEmails.length,
      resendId: resBody.id || null,
      logs,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logs.push(`FATAL: ${errMsg}`);
    return new Response(JSON.stringify({ success: false, error: errMsg, logs }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
