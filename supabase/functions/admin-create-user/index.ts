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

function getSupabaseUrl(): string {
  return (Deno.env.get("SUPABASE_URL") ?? "").trim();
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
    if (!res.ok) console.error(`[admin-create-user] Email dispatch HTTP ${res.status} para notif ${notifId}`);
  }).catch((err) => {
    clearTimeout(timeout);
    console.error(`[admin-create-user] Email dispatch falhou para notif ${notifId}: ${err?.message || err}`);
  });
}

async function notificarTodos(supabase: any, nome: string, userId: string, role: string): Promise<string[]> {
  const notifIds: string[] = [];
  try {
    const rolesAlvo = ["assessor", "vereador", "admin"];
    const { data: relevantes } = await supabase
      .from("profiles")
      .select("id")
      .in("role", rolesAlvo);

    if (relevantes) {
      const labelRole: Record<string, string> = {
        citizen: "cidadao",
        empresa: "empresa",
        assessor: "assessor",
        vereador: "vereador",
        admin: "admin",
      };
      const roleLabel = labelRole[role] || role;

      for (const r of relevantes) {
        const { data: notifId } = await supabase.rpc("insert_notification", {
          p_user_id: r.id,
          p_tipo: "novo_usuario",
          p_titulo: `Novo ${roleLabel} cadastrado`,
          p_mensagem: `${nome} foi cadastrado como ${roleLabel} no sistema.`,
          p_remetente_id: null,
          p_remetente_nome: "Administrador",
          p_referencia_id: userId,
          p_referencia_tipo: "perfil",
        });
        if (notifId) notifIds.push(notifId as string);
      }
    }
    console.log("[admin-create-user v4] Notificacoes enviadas sobre:", nome, "notifIds:", notifIds.length);
  } catch (err) {
    console.error("[admin-create-user v4] Erro ao notificar:", err);
  }
  return notifIds;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = getSupabaseUrl();
    const serviceRoleKey = getServiceRoleKey();

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ success: false, error: "Config missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json();
    const { email, password, full_name, role, phone, company_name, neighborhood } = body;

    if (!email || !password || !full_name || !role) {
      return new Response(JSON.stringify({ success: false, error: "Campos obrigatórios: email, password, full_name, role" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    const trimmedName = full_name.trim();

    if (trimmedPassword.length < 6) {
      return new Response(JSON.stringify({ success: false, error: "Senha deve ter pelo menos 6 caracteres" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: trimmedEmail,
      password: trimmedPassword,
      email_confirm: true,
      user_metadata: { full_name: trimmedName },
    });

    if (authError || !authData.user) {
      const errMsg = authError?.message || "Erro ao criar usuário";
      if (errMsg.toLowerCase().includes("already") || errMsg.toLowerCase().includes("duplicate")) {
        return new Response(JSON.stringify({ success: false, error: "Este email já está cadastrado no sistema." }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: false, error: errMsg }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authData.user.id;

    const profilePayload: Record<string, unknown> = {
      id: userId,
      full_name: trimmedName,
      email: trimmedEmail,
      phone: (phone as string) || null,
      neighborhood: (neighborhood as string) || null,
      company_name: (company_name as string) || null,
      role,
      status: role === "assessor" ? "pending" : "active",
      registration_complete: false,
      onboarding_step: "email_verified",
      is_default_user: false,
    };

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(profilePayload, { onConflict: "id" });

    if (profileError) {
      console.error("[admin-create-user v4] Erro ao criar perfil:", profileError.message);
      await supabase.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({
        success: false,
        error: "Usuário criado no Auth mas falha ao criar perfil: " + profileError.message,
      }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const notifIds = await notificarTodos(supabase, trimmedName, userId, role);

    // 🔥 BUGFIX EMAIL: Disparar pipeline de email para cada notificação
    for (const nid of notifIds) {
      dispatchEmail(supabaseUrl, serviceRoleKey, nid);
    }

    return new Response(JSON.stringify({
      success: true,
      ok: true,
      user_id: userId,
      message: `Usuário "${trimmedName}" criado com sucesso!`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
