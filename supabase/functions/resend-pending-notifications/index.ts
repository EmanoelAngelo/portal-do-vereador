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
  ];
  for (const name of possibleNames) {
    const val = Deno.env.get(name);
    if (val && val.trim().length > 20) return val.trim();
  }
  return "";
}

function formatBRDate(date: string | Date | number): string {
  return new Date(date).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function genericNotificationHTML(data: Record<string, unknown>, type: string): string {
  const title = (data.title as string) || "Nova Notificação";
  const message = (data.message as string) || "";
  const sender = (data.sender as string) || "Sistema Arthur Halal";
  const date = (data.date as string) || formatBRDate(new Date());
  const typeLabel = (data.type_label as string) || "Notificação";
  const vagaCreatedAt = (data.vaga_created_at as string) || "";

  return `
    <div style="font-family: 'Segoe UI', system-ui, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #0D1629; color: #fff; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #22C55E; margin: 0 0 4px; font-size: 20px; font-weight: 800;">${title}</h2>
        <p style="color: #3BBFD4; font-size: 11px; letter-spacing: 2px; text-transform: uppercase;">Gabinete Arthur Halal</p>
      </div>
      <div style="background: rgba(255,255,255,0.06); border-radius: 12px; padding: 16px; margin-bottom: 20px;">
        <p style="color: rgba(255,255,255,0.50); font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px;">${typeLabel}</p>
        <p style="color: rgba(255,255,255,0.75); font-size: 14px; line-height: 1.6; margin: 0 0 12px;">${message}</p>
        ${vagaCreatedAt ? `<p style="color: rgba(255,255,255,0.50); font-size: 12px; margin: 0 0 8px;">📅 Data de criação da vaga: ${vagaCreatedAt}</p>` : ""}
        <div style="font-size: 12px; color: rgba(255,255,255,0.40);">
          <span>De: ${sender}</span>
          <span style="margin-left: 8px;">· ${date}</span>
        </div>
      </div>
      <p style="font-size: 11px; color: rgba(255,255,255,0.25); text-align: center; margin: 0;">
        Você recebeu esta notificação porque tem uma conta no Sistema de Oportunidades do Vereador Arthur Halal.<br>
        Para deixar de receber, acesse as configurações do seu perfil.
      </p>
    </div>
  `;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const logs: string[] = [];
  const startTime = new Date();
  logs.push(`[${startTime.toISOString()}] resend-pending-notifications v4 iniciado`);

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = getServiceRoleKey();

  logs.push(`resendApiKey: ${resendApiKey ? "present" : "MISSING"}`);
  logs.push(`supabaseUrl: ${supabaseUrl ? "present" : "MISSING"}`);
  logs.push(`serviceRoleKey: ${serviceRoleKey ? "present" : "MISSING"}`);

  if (!resendApiKey || !supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ success: false, error: "Missing config", logs }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // ⭐ V4: Só processa notificações das ÚLTIMAS 48 HORAS
    // Evita reenviar notificações antigas que já foram avaliadas dezenas de vezes
    const cutoffDate = new Date(startTime.getTime() - 48 * 60 * 60 * 1000).toISOString();
    logs.push(`Cutoff date: ${cutoffDate}`);

    // 1. Buscar notificações pendentes DENTRO DA JANELA DE 48h
    const { data: notificacoes, error: notifErr } = await supabase
      .from("notificacoes")
      .select("*")
      .or("email_enviado.eq.false,email_enviado.is.null")
      .gte("created_at", cutoffDate)
      .limit(50); // Limite razoável por execução

    if (notifErr) {
      logs.push("Error fetching notificacoes: " + notifErr.message);
      return new Response(JSON.stringify({ success: false, error: notifErr.message, logs }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const notifList = notificacoes ?? [];
    logs.push(`Found ${notifList.length} pending notifications (last 48h)`);

    // ⭐ Também conta notificações antigas pendentes (fora da janela) para o relatório
    const { count: oldCount } = await supabase
      .from("notificacoes")
      .select("*", { count: "exact", head: true })
      .or("email_enviado.eq.false,email_enviado.is.null")
      .lt("created_at", cutoffDate);
    
    if (oldCount && oldCount > 0) {
      logs.push(`⚠️ ${oldCount} notificações antigas (>48h) ignoradas — serão marcadas como expiradas`);
      
      // Marca notificações antigas (>48h) como "não enviável" para não poluir futuras execuções
      await supabase
        .from("notificacoes")
        .update({ 
          email_enviado: false, 
          email_enviado_em: formatBRDate(startTime),
        })
        .or("email_enviado.eq.false,email_enviado.is.null")
        .lt("created_at", cutoffDate);
    }

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const notif of notifList) {
      const notifAge = startTime.getTime() - new Date(notif.created_at).getTime();
      const notifAgeHours = Math.round(notifAge / (1000 * 60 * 60));

      // ⭐ V4: Se email_enviado_em já existe (já foi avaliado HOJE), pula
      if (notif.email_enviado_em) {
        const lastAttempt = new Date(notif.email_enviado_em).getTime();
        const hoursSinceLastAttempt = (startTime.getTime() - lastAttempt) / (1000 * 60 * 60);
        
        // Se já foi avaliado nas últimas 6 horas, pula pra não ficar em loop
        if (hoursSinceLastAttempt < 6) {
          skipped++;
          logs.push(`Notif ${notif.id}: SKIP (last attempt ${Math.round(hoursSinceLastAttempt)}h ago, idade ${notifAgeHours}h)`);
          continue;
        }
        logs.push(`Notif ${notif.id}: reavaliando (last attempt ${Math.round(hoursSinceLastAttempt)}h ago, idade ${notifAgeHours}h)`);
      }

      // 2. Buscar auth.user para verificar email confirmado
      let userEmail: string | null = null;
      let hasConfirmedEmail = false;

      try {
        const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(notif.user_id);
        if (!userErr && userData?.user?.email) {
          userEmail = userData.user.email;
          hasConfirmedEmail = !!userData.user.email_confirmed_at;
        } else {
          logs.push(`User ${notif.user_id}: not found or no email (${userErr?.message || "unknown"})`);
        }
      } catch (e) {
        logs.push(`User ${notif.user_id}: error fetching - ${e instanceof Error ? e.message : String(e)}`);
      }

      if (!userEmail) {
        skipped++;
        // Marca como avaliado para não tentar de novo
        await supabase
          .from("notificacoes")
          .update({ email_enviado: false, email_enviado_em: formatBRDate(startTime) })
          .eq("id", notif.id);
        continue;
      }

      // 3. Buscar profile para verificar role e curriculo_pdf
      let isCitizen = false;
      let hasCurriculo = false;
      let isDefaultUser = false;
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, curriculo_pdf, is_default_user")
          .eq("id", notif.user_id)
          .single();
        
        isCitizen = profile?.role === "cidadao" || profile?.role === "citizen";
        isDefaultUser = profile?.is_default_user === true;
        
        if (profile?.curriculo_pdf && profile.curriculo_pdf.length > 5) {
          hasCurriculo = true;
        }
      } catch (e) {
        logs.push(`User ${notif.user_id}: profile error - ${e instanceof Error ? e.message : String(e)}`);
      }

      // 4. Decidir se envia email
      const isFakeEmail = userEmail.includes("teste") || userEmail.includes("fake") || userEmail.includes("example");
      const shouldSendEmail = !isFakeEmail && !isDefaultUser && hasConfirmedEmail && (!isCitizen || hasCurriculo);

      if (!shouldSendEmail) {
        skipped++;
        const reason = isDefaultUser ? "default_user" : isFakeEmail ? "fake_email" : !hasConfirmedEmail ? "email_not_confirmed" : "citizen_no_curriculo";
        logs.push(`Notif ${notif.id}: SKIP (${reason}, idade ${notifAgeHours}h)`);
        // ⭐ Marca como avaliado para não tentar de novo nas próximas 6h
        await supabase
          .from("notificacoes")
          .update({ email_enviado: false, email_enviado_em: formatBRDate(startTime) })
          .eq("id", notif.id);
        continue;
      }

      // 5. Buscar data de criação da vaga se referencia_tipo = vaga
      let vagaCreatedAt = "";
      if (notif.referencia_tipo === "vaga" && notif.referencia_id) {
        try {
          const { data: vaga } = await supabase
            .from("vagas")
            .select("created_at")
            .eq("id", notif.referencia_id)
            .single();
          if (vaga?.created_at) {
            vagaCreatedAt = formatBRDate(vaga.created_at);
          }
        } catch (_) { /* silent */ }
      }

      // 6. Enviar email via Resend
      const html = genericNotificationHTML({
        title: notif.titulo,
        message: notif.mensagem,
        sender: notif.remetente_nome || "Sistema Arthur Halal",
        date: formatBRDate(notif.created_at),
        type_label: notif.tipo,
        vaga_created_at: vagaCreatedAt,
      }, notif.tipo);

      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Gabinete Arthur Halal <gabinete@emanoel.shop>",
            to: [userEmail],
            subject: notif.titulo,
            html,
          }),
        });

        const resBody = await res.json();

        if (res.ok) {
          // ✅ Sucesso: marca como enviado
          await supabase
            .from("notificacoes")
            .update({
              email_enviado: true,
              email_enviado_em: formatBRDate(startTime),
            })
            .eq("id", notif.id);
          sent++;
          logs.push(`✅ Enviado: notif ${notif.id} para ${userEmail} (Resend ID: ${resBody.id || "none"})`);
        } else {
          failed++;
          logs.push(`❌ Resend falhou (${res.status}): ${resBody.message || "unknown"} - notif ${notif.id}`);
          // Marca como avaliado mesmo com falha, pra não tentar infinitamente
          await supabase
            .from("notificacoes")
            .update({ email_enviado: false, email_enviado_em: formatBRDate(startTime) })
            .eq("id", notif.id);
        }
      } catch (e) {
        failed++;
        const errMsg = e instanceof Error ? e.message : String(e);
        logs.push(`❌ Exceção Resend para notif ${notif.id}: ${errMsg}`);
        await supabase
          .from("notificacoes")
          .update({ email_enviado: false, email_enviado_em: formatBRDate(startTime) })
          .eq("id", notif.id);
      }
    }

    const duration = (new Date().getTime() - startTime.getTime()) / 1000;
    logs.push(`⏱️ Execução concluída em ${duration.toFixed(1)}s — ${sent} enviados, ${skipped} pulados, ${failed} falhas`);

    return new Response(
      JSON.stringify({
        success: true,
        total: notifList.length,
        old_ignored: oldCount || 0,
        sent,
        skipped,
        failed,
        duration_seconds: duration,
        logs,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    logs.push("FATAL: " + (err instanceof Error ? err.message : String(err)));
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message, logs }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
