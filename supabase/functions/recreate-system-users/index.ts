import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Ler parametro only_vereador do body
  let onlyVereador = false;
  try {
    const body = await req.json();
    onlyVereador = body?.only_vereador === true;
  } catch (_) { /* ignorar */ }

  const possibleKeys = [
    "SUPABASE_SERVICE_ROLE_KEY",
    "SERVICE_ROLE_KEY",
    "SUPABASE_SERVICE_KEY",
    "VITE_SUPABASE_SERVICE_ROLE_KEY",
  ];

  let serviceKey = "";
  for (const name of possibleKeys) {
    const val = Deno.env.get(name);
    if (val && val.trim().length > 20) {
      serviceKey = val.trim();
      break;
    }
  }

  if (!serviceKey) {
    return new Response(
      JSON.stringify({ success: false, error: "Service role key not found" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = (Deno.env.get("SUPABASE_URL") ?? "").trim().replace(/\/$/, "");
  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // v3 — APENAS os 5 usuários padrão legítimos.
  // desenvolvedor@example.com NÃO é usuário padrão do sistema.
  const allSystemUsers = [
    {
      email: "admin@arthurhalal.com.br",
      password: "CONFIGURE_EM_AMBIENTE_DE_TESTE",
      full_name: "Administrador",
      role: "admin",
    },
    {
      email: "assessor@arthurhalal.com.br",
      password: "CONFIGURE_EM_AMBIENTE_DE_TESTE",
      full_name: "Carlos Assessor",
      role: "assessor",
    },
    {
      email: "vereador@arthurhalal.com.br",
      password: "CONFIGURE_EM_AMBIENTE_DE_TESTE",
      full_name: "Arthur Halal",
      role: "vereador",
    },
    {
      email: "cidadao.teste@gmail.com",
      password: "CONFIGURE_EM_AMBIENTE_DE_TESTE",
      full_name: "Joao Silva",
      role: "citizen",
    },
    {
      email: "empresa.teste@gmail.com",
      password: "CONFIGURE_EM_AMBIENTE_DE_TESTE",
      full_name: "Construtora Exemplo",
      role: "empresa",
    },
  ];

  const systemUsers = onlyVereador
    ? allSystemUsers.filter((u) => u.role === "vereador")
    : allSystemUsers;

  const { data: listData, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) {
    return new Response(JSON.stringify({ error: listErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const existingUsers = listData?.users ?? [];
  const results = [];

  for (const u of systemUsers) {
    const existing = existingUsers.find((x) => x.email === u.email);

    const baseProfilePayload: Record<string, unknown> = {
      full_name: u.full_name,
      role: u.role,
      display_name: u.full_name,
      is_default_user: true,
      onboarding_step: "complete",
      status: "active",
    };

    if (u.role === "empresa") {
      baseProfilePayload.company_name = u.full_name;
      baseProfilePayload.responsible_name = u.full_name;
    }

    if (existing) {
      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
        existing.id,
        {
          password: u.password,
          email_confirm: true,
        }
      );

      if (updateErr) {
        results.push({ email: u.email, status: "update_error", error: updateErr.message });
        continue;
      }

      const profilePayload = { ...baseProfilePayload, id: existing.id };

      const { error: profileErr } = await supabaseAdmin
        .from("profiles")
        .upsert(profilePayload, { onConflict: "id" });

      results.push({
        email: u.email,
        role: u.role,
        id: existing.id,
        status: profileErr ? "profile_error" : "updated_ok",
        profile_error: profileErr?.message,
      });
    } else {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { full_name: u.full_name },
      });

      if (createErr || !created?.user) {
        results.push({ email: u.email, status: "create_error", error: createErr?.message });
        continue;
      }

      const profilePayload = { ...baseProfilePayload, id: created.user.id };

      const { error: profileErr } = await supabaseAdmin
        .from("profiles")
        .upsert(profilePayload, { onConflict: "id" });

      results.push({
        email: u.email,
        role: u.role,
        new_id: created.user.id,
        status: profileErr ? "profile_error" : "created_ok",
        profile_error: profileErr?.message,
      });
    }
  }

  const allOk = results.every((r) => r.status === "updated_ok" || r.status === "created_ok");

  return new Response(JSON.stringify({ success: allOk, results, only_vereador: onlyVereador, senha_padrao: "CONFIGURE_EM_AMBIENTE_DE_TESTE" }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});