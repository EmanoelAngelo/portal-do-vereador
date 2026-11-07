
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function getSupabaseUrl(): string {
  const url = Deno.env.get("SUPABASE_URL");
  if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
    return url.replace(/\/$/, "");
  }
  return "";
}

function getServiceKey(): string {
  return (Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
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
    if (!res.ok) console.error(`[confirm-registration] Email dispatch HTTP ${res.status} para notif ${notifId}`);
  }).catch((err) => {
    clearTimeout(timeout);
    console.error(`[confirm-registration] Email dispatch falhou para notif ${notifId}: ${err?.message || err}`);
  });
}

async function sendAssessorPendingEmail(email: string, nome: string) {
  const resendKey = (Deno.env.get("RESEND_API_KEY") || "").trim();
  if (!resendKey.startsWith("re_")) {
    console.log("[confirm-registration] RESEND_API_KEY não configurada — pulando email ao assessor");
    return;
  }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + resendKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ArthurHalal@emanoel.shop",
        to: email,
        subject: "Cadastro Recebido — Arthur Halal",
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#020C1B;color:#fff;border-radius:12px"><div style="text-align:center;margin-bottom:24px"><h2 style="color:#E8A020;margin:0;font-size:20px">Cadastro Recebido!</h2><p style="color:rgba(255,255,255,0.6);margin:8px 0 0;font-size:13px">Arthur Halal — Vereador de Pelotas</p></div><p style="color:rgba(255,255,255,0.8);font-size:14px;line-height:1.6">Olá <strong style="color:#E8A020">${nome}</strong>,</p><p style="color:rgba(255,255,255,0.8);font-size:14px;line-height:1.6">Sua solicitação de acesso como <strong>Assessor</strong> foi recebida com sucesso!</p><div style="background:rgba(232,160,32,0.15);border:1px solid rgba(232,160,32,0.3);border-radius:8px;padding:16px;margin:20px 0"><p style="color:rgba(255,255,255,0.7);margin:0;font-size:13px;line-height:1.5">⏳ Seu cadastro está em análise. Um administrador revisará sua solicitação e você receberá um e-mail de aprovação em breve.</p></div><p style="color:rgba(255,255,255,0.5);font-size:12px;text-align:center">Após a aprovação, você poderá acessar o sistema com seu e-mail e senha.</p></div>`,
      }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (r.ok) {
      console.log("[confirm-registration] Email de pendência enviado ao assessor:", email);
    } else {
      const errBody = await r.text();
      console.error("[confirm-registration] Erro ao enviar email ao assessor:", r.status, errBody.slice(0, 200));
    }
  } catch (err) {
    console.error("[confirm-registration] Exceção ao enviar email ao assessor:", err);
  }
}

async function notificarTodos(supabase: ReturnType<typeof createClient>, nome: string, userId: string, role: string): Promise<string[]> {
  const notifIds: string[] = [];
  try {
    const rolesAlvo = ["assessor", "vereador", "admin"];
    const { data: relevantes } = await supabase
      .from("profiles")
      .select("id")
      .in("role", rolesAlvo);

    const labelRole: Record<string, string> = {
      citizen: "cidadao",
      empresa: "empresa",
      assessor: "assessor",
    };
    const roleLabel = labelRole[role] || role;
    const artigo = roleLabel === "empresa" ? "uma " : "um ";
    const genero = roleLabel === "empresa" ? "cadastrada" : "cadastrado";

    if (relevantes) {
      for (const r of relevantes) {
        const { data: notifId } = await supabase.rpc("insert_notification", {
          p_user_id: r.id,
          p_tipo: "novo_usuario",
          p_titulo: `Novo ${roleLabel} ${genero}`,
          p_mensagem: `${nome} se cadastrou como ${artigo}${roleLabel} no sistema.`,
          p_remetente_id: null,
          p_remetente_nome: "Sistema",
          p_referencia_id: userId,
          p_referencia_tipo: "perfil",
        });
        if (notifId) notifIds.push(notifId as string);
      }
    }
    console.log(`[confirm-registration] Notified staff about new ${roleLabel}:`, nome, "notifIds:", notifIds.length);
  } catch (err) {
    console.error("[confirm-registration] notificarTodos error:", err);
  }
  return notifIds;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ success: false, error: "Corpo invalido." });
    }

    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const role = String(body.role || "citizen");
    const metadata = (body.user_metadata as Record<string, unknown>) || {};
    const code = String(body.code || "").trim();

    if (!email || !password) {
      return json({ success: false, error: "Email e senha obrigatorios." });
    }

    const supabaseUrl = getSupabaseUrl();
    const serviceKey = getServiceKey();

    if (!supabaseUrl || !serviceKey) {
      return json({ success: false, error: "SERVICE_ROLE_KEY / SUPABASE_SERVICE_ROLE_KEY nao configurada." });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    console.log("[confirm-registration] Iniciando:", email, "role:", role, "temCode:", !!code);

    let codeId: number | null = null;

    if (code) {
      console.log("[confirm-registration] Validando codigo:", code, "para:", email);
      const { data: codeRows, error: codeErr } = await supabase
        .from("verification_codes")
        .select("id, code, expires_at, used_at")
        .eq("email", email)
        .eq("code", code)
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1);

      if (codeErr) {
        console.error("[confirm-registration] Erro ao validar codigo:", codeErr.message);
        return json({ success: false, error: "Erro ao validar codigo: " + codeErr.message });
      }

      if (!codeRows || codeRows.length === 0) {
        console.log("[confirm-registration] Codigo invalido/expirado para:", email);
        return json({ success: false, error: "Codigo invalido ou expirado. Solicite um novo codigo." });
      }

      codeId = Number(codeRows[0].id);
      console.log("[confirm-registration] Codigo valido! codeId:", codeId);
    }

    let existingUserId: string | null = null;
    try {
      const { data: users } = await supabase.rpc("get_user_by_email", { email_arg: email });
      if (users && Array.isArray(users) && users.length > 0) {
        existingUserId = String(users[0].id);
        console.log("[confirm-registration] Usuario ativo encontrado:", existingUserId);
      }
    } catch (e) {
      console.log("[confirm-registration] RPC get_user_by_email falhou, tentando criar direto:", e);
    }

    let userId: string;

    if (existingUserId) {
      console.log("[confirm-registration] Atualizando usuario existente:", existingUserId);
      const { error: updateErr } = await supabase.auth.admin.updateUserById(existingUserId, {
        password,
        email_confirm: true,
        user_metadata: {
          full_name: metadata.full_name,
          display_name: metadata.display_name,
          role,
        },
      });

      if (updateErr) {
        console.error("[confirm-registration] Erro ao atualizar usuario existente:", updateErr.message);
        
        const { data: authData2, error: createErr2 } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: metadata.full_name,
            display_name: metadata.display_name,
            role,
          },
        });

        if (createErr2 || !authData2.user) {
          const errMsg = createErr2?.message || "Erro desconhecido";
          console.error("[confirm-registration] Fallback createUser tambem falhou:", errMsg);
          return json({ success: false, error: "Erro ao criar conta: " + errMsg });
        }

        userId = authData2.user.id;
      } else {
        userId = existingUserId;
      }
    } else {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: metadata.full_name,
          display_name: metadata.display_name,
          role,
        },
      });

      if (authError || !authData.user) {
        const errMsg = authError?.message || "Erro desconhecido ao criar usuario";
        if (authError?.message?.toLowerCase().includes("already") || authError?.message?.toLowerCase().includes("duplicate")) {
          return json({ success: false, error: "Este e-mail ja esta cadastrado. Tente fazer login ou use 'Esqueceu a senha?'." });
        }
        return json({ success: false, error: "Erro ao criar conta: " + errMsg });
      }

      userId = authData.user.id;
    }

    const profilePayload: Record<string, unknown> = {
      id: userId,
      full_name: metadata.full_name || metadata.display_name || email,
      display_name: metadata.display_name || metadata.full_name || email,
      email: email || "",
      phone: (metadata.phone as string) || "",
      neighborhood: (metadata.neighborhood as string) || "",
      role,
      status: role === "assessor" ? "pending" : "active",
      registration_complete: false,
      onboarding_step: "email_verified",
      is_default_user: false,
    };

    if (role === "empresa") {
      profilePayload.company_name = (metadata.company_name as string) || "";
      profilePayload.cnpj = (metadata.cnpj as string) || "";
      profilePayload.responsible_name = (metadata.responsible_name as string) || "";
    }

    const { error: profileError } = await supabase.from("profiles").upsert(profilePayload);

    if (profileError) {
      console.error("[confirm-registration] Erro ao criar perfil:", profileError.message);
      return json({
        success: false,
        error: "Erro ao criar perfil: " + profileError.message + ". Tente novamente.",
        user_id: userId,
      });
    }

    const nomeUsuario = String(metadata.display_name || metadata.full_name || email);

    // N3: Se for cidadao ou empresa, notificar vereador + assessor + admin + disparar email
    if (role === "citizen" || role === "empresa") {
      const notifIds = await notificarTodos(supabase, nomeUsuario, userId, role);
      for (const nid of notifIds) {
        dispatchEmail(supabaseUrl, serviceKey, nid);
      }
    }

    if (role === "assessor") {
      await sendAssessorPendingEmail(email, nomeUsuario);
    }

    if (codeId) {
      const { error: consumeErr } = await supabase.from("verification_codes")
        .update({ used_at: new Date().toISOString() })
        .eq("id", codeId);

      if (consumeErr) {
        console.error("[confirm-registration] Erro ao consumir codigo:", consumeErr.message);
      } else {
        console.log("[confirm-registration] Codigo", codeId, "consumido com sucesso");
      }
    }

    console.log("[confirm-registration] SUCESSO total para:", email, "userId:", userId);
    return json({
      success: true,
      user_id: userId,
      role,
      message: role === "assessor"
        ? "Solicitacao enviada! Um administrador analisara seu cadastro. Voce recebera um e-mail quando for aprovado."
        : "Conta criada com sucesso!",
    });
  } catch (fatalErr) {
    console.error("[confirm-registration] FATAL:", fatalErr);
    const msg = fatalErr instanceof Error ? fatalErr.message : String(fatalErr);
    return json({ success: false, error: "Erro interno. Detalhe: " + msg });
  }
});
