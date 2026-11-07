import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getEnvUrl(): string {
  const url = Deno.env.get("SUPABASE_URL");
  if (url && url.startsWith("https://")) return url.trim().replace(/\/$/, "");
  return "";
}

function getEnvServiceKey(): string {
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
    if (!res.ok) console.error(`[register-user] Email dispatch HTTP ${res.status} para notif ${notifId}`);
  }).catch((err) => {
    clearTimeout(timeout);
    console.error(`[register-user] Email dispatch falhou para notif ${notifId}: ${err?.message || err}`);
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
      };
      const roleLabel = labelRole[role] || role;

      for (const r of relevantes) {
        const { data: notifId } = await supabase.rpc("insert_notification", {
          p_user_id: r.id,
          p_tipo: "novo_usuario",
          p_titulo: `Novo ${roleLabel} cadastrado`,
          p_mensagem: `${nome} se cadastrou como ${roleLabel} no sistema.`,
          p_remetente_id: null,
          p_remetente_nome: "Sistema",
          p_referencia_id: userId,
          p_referencia_tipo: "perfil",
        });
        if (notifId) notifIds.push(notifId as string);
      }
    }
    console.log("[register-user v8] Notificacoes enviadas sobre:", nome, "notifIds:", notifIds.length);
  } catch (err) {
    console.error("[register-user v8] Erro ao notificar:", err);
  }
  return notifIds;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const diagnostics: string[] = [];

  try {
    const {
      email,
      password,
      full_name,
      display_name,
      phone,
      neighborhood,
      role,
      company_name,
      cnpj,
      responsible_name,
    } = await req.json();

    if (!email || !password || !role) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: email, password, role" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = getEnvUrl();
    const supabaseServiceRole = getEnvServiceKey();

    diagnostics.push("url=" + supabaseUrl.slice(0, 40) + "... key_len=" + supabaseServiceRole.length);

    if (!supabaseUrl.startsWith("https://") || !supabaseServiceRole) {
      diagnostics.push("FATAL: env config bad - SERVICE_ROLE_KEY / SUPABASE_SERVICE_ROLE_KEY missing");
      return new Response(
        JSON.stringify({ success: false, error: "Erro de configuracao do servidor. SERVICE_ROLE_KEY / SUPABASE_SERVICE_ROLE_KEY nao configurada.", diagnostics }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRole, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    diagnostics.push("email=" + email.trim().toLowerCase() + " role=" + role);

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        display_name,
        role,
      },
    });

    if (authError || !authData.user) {
      diagnostics.push("auth createUser FAILED: " + (authError?.message || "no user returned"));
      return new Response(
        JSON.stringify({ success: false, error: authError?.message || "Failed to create user", diagnostics }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = authData.user.id;
    diagnostics.push("user created id=" + userId);

    const profilePayload: Record<string, unknown> = {
      id: userId,
      full_name: full_name || display_name || email,
      display_name: display_name || full_name || email,
      email: email || "",
      phone: phone || "",
      neighborhood: neighborhood || "",
      role,
      status: role === "assessor" ? "pending" : "active",
      registration_complete: false,
      onboarding_step: "email_verified",
    };

    if (role === "empresa") {
      profilePayload.company_name = company_name || "";
      profilePayload.cnpj = cnpj || "";
      profilePayload.responsible_name = responsible_name || "";
    }

    const { error: profileError } = await supabase.from("profiles").upsert(profilePayload);

    if (profileError) {
      diagnostics.push("profile upsert FAILED: " + profileError.message);
      return new Response(
        JSON.stringify({ success: false, error: profileError.message, diagnostics }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    diagnostics.push("profile ok");

    // Notificar + disparar emails
    const nomeUsuario = String(display_name || full_name || email);
    const notifIds = await notificarTodos(supabase, nomeUsuario, userId, role);

    // 🔥 BUGFIX EMAIL: Disparar pipeline de email para cada notificação criada
    for (const nid of notifIds) {
      dispatchEmail(supabaseUrl, supabaseServiceRole, nid);
    }

    return new Response(
      JSON.stringify({ success: true, user_id: userId, role, diagnostics }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    diagnostics.push("FATAL: " + msg);
    return new Response(
      JSON.stringify({ success: false, error: msg, diagnostics }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
