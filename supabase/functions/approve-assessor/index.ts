

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** Envia email ao assessor avisando que foi aprovado - SEM link de redirecionamento (regra de negócio) */
async function sendApprovalEmail(email: string, nome: string) {
  const resendKey = (Deno.env.get("RESEND_API_KEY") || "").trim();
  if (!resendKey.startsWith("re_")) {
    console.log("[approve-assessor] RESEND_API_KEY nao configurada — pulando email de aprovacao");
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
        subject: "Cadastro Aprovado! — Arthur Halal",
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#020C1B;color:#fff;border-radius:12px"><div style="text-align:center;margin-bottom:24px"><h2 style="color:#22C55E;margin:0;font-size:20px">✅ Cadastro Aprovado!</h2><p style="color:rgba(255,255,255,0.6);margin:8px 0 0;font-size:13px">Arthur Halal — Vereador de Pelotas</p></div><p style="color:rgba(255,255,255,0.8);font-size:14px;line-height:1.6">Olá <strong style="color:#E8A020">${nome}</strong>,</p><p style="color:rgba(255,255,255,0.8);font-size:14px;line-height:1.6">Seu cadastro como <strong>Assessor</strong> foi <strong style="color:#22C55E">APROVADO</strong>!</p><div style="background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.3);border-radius:8px;padding:16px;margin:20px 0"><p style="color:rgba(255,255,255,0.7);margin:0;font-size:13px;line-height:1.5">🔓 Você já pode acessar o sistema com seu e-mail e senha. Ao fazer login, complete seu perfil com sua foto e cargo no gabinete.</p></div><p style="color:rgba(255,255,255,0.5);font-size:12px;text-align:center;margin-top:20px">Acesse o sistema usando seu e-mail e senha cadastrados. Bem-vindo ao gabinete!</p></div>`,
      }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (r.ok) {
      console.log("[approve-assessor] Email de aprovação enviado ao assessor:", email);
    } else {
      const errBody = await r.text();
      console.error("[approve-assessor] Erro ao enviar email de aprovacao:", r.status, errBody.slice(0, 200));
    }
  } catch (err) {
    console.error("[approve-assessor] Exceção ao enviar email de aprovacao:", err);
  }
}

async function criarNotificacao(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  tipo: string,
  titulo: string,
  mensagem: string,
  remetenteNome?: string | null,
  referenciaId?: string | null,
  referenciaTipo?: string | null
) {
  try {
    await supabaseAdmin.rpc("insert_notification", {
      p_user_id: userId,
      p_tipo: tipo,
      p_titulo: titulo,
      p_mensagem: mensagem,
      p_remetente_id: null,
      p_remetente_nome: remetenteNome ?? "Sistema",
      p_referencia_id: referenciaId ?? null,
      p_referencia_tipo: referenciaTipo ?? null,
    });
  } catch (err) {
    console.error("[approve-assessor] criarNotificacao error:", err);
  }
}

async function notificarRelevantes(
  supabaseAdmin: ReturnType<typeof createClient>,
  tipo: string,
  titulo: string,
  mensagem: string,
  opts?: { remetenteNome?: string; referenciaId?: string; referenciaTipo?: string }
) {
  try {
    const roles = ["assessor", "vereador", "admin"];
    const { data: relevantes } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .in("role", roles);

    if (relevantes) {
      for (const r of relevantes) {
        await criarNotificacao(supabaseAdmin, r.id, tipo, titulo, mensagem, opts?.remetenteNome ?? "Sistema", opts?.referenciaId ?? null, opts?.referenciaTipo ?? null);
      }
    }
  } catch (err) {
    console.error("[approve-assessor] notificarRelevantes error:", err);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { user_id } = body;

    if (!user_id) {
      return new Response(JSON.stringify({ success: false, error: "user_id é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!callerProfile || callerProfile.role !== "admin") {
      return new Response(JSON.stringify({ success: false, error: "Apenas administradores podem aprovar assessores" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("id, role, status, full_name, email, onboarding_step")
      .eq("id", user_id)
      .single();

    if (!targetProfile) {
      return new Response(JSON.stringify({ success: false, error: "Usuário não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (targetProfile.role !== "assessor") {
      return new Response(JSON.stringify({ success: false, error: "Usuário não é um assessor" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ✅ CORREÇÃO v5.25: NÃO sobrescreve onboarding_step durante aprovação
    // O assessor DEVE passar pelo /complete-profile após primeiro login
    // Mantém onboarding_step como está (ex: "email_verified") para o auth redirecionar
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        status: "active",
        approved_at: new Date().toISOString(),
      })
      .eq("id", user_id);

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(JSON.stringify({ success: false, error: "Erro ao atualizar perfil: " + updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // N5: Notificar o assessor aprovado
    const assessorNome = targetProfile.full_name ?? "Assessor";
    await criarNotificacao(
      supabase,
      user_id,
      "aprovacao",
      "Cadastro aprovado!",
      `Seu cadastro como assessor foi aprovado. Você já pode acessar o sistema com seu email e senha.`,
      "Admin",
      user_id,
      "perfil"
    );

    // N5: Notificar vereador sobre novo assessor ativo
    await notificarRelevantes(
      supabase,
      "novo_assessor",
      "Novo assessor aprovado",
      `O assessor "${assessorNome}" foi aprovado e está ativo no sistema.`,
      { remetenteNome: "Admin", referenciaId: user_id, referenciaTipo: "perfil" }
    );

    // Enviar email de aprovação ao assessor (SEM link de redirecionamento)
    const assessorEmail = (targetProfile as any).email;
    if (assessorEmail && assessorEmail.includes("@")) {
      await sendApprovalEmail(assessorEmail, assessorNome);
    } else {
      try {
        const { data: authUser } = await supabase.auth.admin.getUserById(user_id);
        if (authUser?.user?.email) {
          await sendApprovalEmail(authUser.user.email, assessorNome);
        }
      } catch (_) {
        console.error("[approve-assessor] Não foi possível obter email do assessor");
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Assessor "${assessorNome}" aprovado com sucesso! Um e-mail foi enviado.`,
      user_id: user_id,
      approved_at: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ success: false, error: "Erro interno do servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
