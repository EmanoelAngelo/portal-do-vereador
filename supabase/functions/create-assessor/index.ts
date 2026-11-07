
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function notificarNovoAssessor(supabase: ReturnType<typeof createClient>, nome: string, userId: string) {
  try {
    const roles = ["admin", "vereador"];
    const { data: relevantes } = await supabase
      .from("profiles")
      .select("id")
      .in("role", roles);

    if (relevantes) {
      for (const r of relevantes) {
        await supabase.rpc("insert_notification", {
          p_user_id: r.id,
          p_tipo: "novo_assessor",
          p_titulo: "Novo assessor cadastrado",
          p_mensagem: `${nome} se cadastrou como assessor e aguarda aprovação.`,
          p_remetente_id: null,
          p_remetente_nome: "Sistema",
          p_referencia_id: userId,
          p_referencia_tipo: "perfil",
        });
      }
    }
    console.log("[create-assessor] Notified admin + vereador about new assessor:", nome);
  } catch (err) {
    console.error("[create-assessor] notificarNovoAssessor error:", err);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const full_name = String(body.full_name || "").trim();
    const phone = String(body.phone || "").trim();
    const role = String(body.role || "assessor");

    if (!email || !password || !full_name) {
      return json({ success: false, error: "Nome, email e senha são obrigatórios." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !serviceKey) {
      return json({ success: false, error: "Configuração do servidor incompleta (SERVICE_ROLE_KEY)." }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    console.log("[create-assessor] Criando:", email, "role:", role);

    const { data: existing, error: listErr } = await supabase.auth.admin.listUsers();
    if (!listErr && existing?.users) {
      const found = existing.users.find((u) => u.email === email);
      if (found) {
        return json({ success: false, error: "Este e-mail já está cadastrado no sistema." });
      }
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role },
    });

    if (authError || !authData?.user) {
      console.error("[create-assessor] Erro auth:", authError?.message);
      return json({ success: false, error: authError?.message || "Erro ao criar usuário." });
    }

    const userId = authData.user.id;
    console.log("[create-assessor] Usuário criado:", userId);

    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      full_name,
      display_name: full_name.split(" ")[0],
      phone,
      role,
      status: role === "admin" ? "active" : "pending",
      registration_complete: true,
    });

    if (profileError) {
      console.error("[create-assessor] Erro perfil:", profileError.message);
      return json({ success: false, error: "Usuário criado mas perfil falhou: " + profileError.message });
    }

    // N4: Notificar admin e vereador sobre novo assessor
    if (role === "assessor") {
      await notificarNovoAssessor(supabase, full_name, userId);
    }

    console.log("[create-assessor] SUCESSO:", email);
    return json({
      success: true,
      user_id: userId,
      message: role === "assessor"
        ? "Assessor criado com sucesso! Aguardando aprovação."
        : "Admin criado com sucesso!",
    });
  } catch (err) {
    console.error("[create-assessor] FATAL:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return json({ success: false, error: "Erro interno: " + msg }, 500);
  }
});
