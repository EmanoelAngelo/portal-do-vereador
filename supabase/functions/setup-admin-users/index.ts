import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-setup-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
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

    const usersToCreate = [
      { email: "admin@arthurhalal.com.br",        password: "CONFIGURE_EM_AMBIENTE_DE_TESTE",       full_name: "Administrador",        role: "admin" },
      { email: "assessor@arthurhalal.com.br",     password: "CONFIGURE_EM_AMBIENTE_DE_TESTE",    full_name: "Carlos Assessor",      role: "assessor" },
      { email: "vereador@arthurhalal.com.br",     password: "CONFIGURE_EM_AMBIENTE_DE_TESTE",    full_name: "Arthur Halal",         role: "vereador" },
      { email: "cidadao.teste@gmail.com",         password: "CONFIGURE_EM_AMBIENTE_DE_TESTE",     full_name: "João Silva",           role: "citizen",  phone: "(53) 9 9999-1234", neighborhood: "Centro" },
      { email: "empresa.teste@gmail.com",         password: "CONFIGURE_EM_AMBIENTE_DE_TESTE",     full_name: "Construtora Exemplo",  role: "empresa",  company_name: "Construtora Exemplo Ltda", cnpj: "12.345.678/0001-90", responsible_name: "Construtora Exemplo", phone: "(53) 3232-0000" },
      { email: "desenvolvedor@example.com",           password: "CONFIGURE_EM_AMBIENTE_DE_TESTE",     full_name: "Emanoel Angelo",       role: "citizen",  phone: "(53) 9 8888-5678", neighborhood: "Areal" },
    ];

    const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (listError) throw new Error(`Erro ao listar usuários: ${listError.message}`);

    const existingUsers = listData?.users ?? [];
    const results = [];

    for (const u of usersToCreate) {
      const existing = existingUsers.find((x) => x.email === u.email);

      const profileData = {
        full_name:        u.full_name,
        role:             u.role,
        phone:            (u as Record<string,unknown>).phone            ?? null,
        neighborhood:     (u as Record<string,unknown>).neighborhood     ?? null,
        company_name:     (u as Record<string,unknown>).company_name     ?? null,
        cnpj:             (u as Record<string,unknown>).cnpj             ?? null,
        responsible_name: (u as Record<string,unknown>).responsible_name ?? null,
        is_default_user:  true,
      };

      if (existing) {
        const { error: upErr } = await supabaseAdmin
          .from("profiles")
          .upsert({ id: existing.id, ...profileData }, { onConflict: "id" });
        results.push({
          email:  u.email,
          status: upErr ? "error" : "already_exists_updated",
          role:   u.role,
          error:  upErr?.message,
        });
        continue;
      }

      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email:         u.email,
        password:      u.password,
        email_confirm: true,
        user_metadata: { full_name: u.full_name },
      });

      if (createErr) {
        results.push({ email: u.email, status: "error", error: createErr.message });
        continue;
      }

      if (created?.user) {
        await new Promise((r) => setTimeout(r, 400));
        const { error: profErr } = await supabaseAdmin
          .from("profiles")
          .upsert({ id: created.user.id, ...profileData }, { onConflict: "id" });
        results.push({
          email:  u.email,
          status: profErr ? "error" : "created",
          role:   u.role,
          error:  profErr?.message,
        });
      }
    }

    return new Response(JSON.stringify({ success: true, results, senha_padrao: "CONFIGURE_EM_AMBIENTE_DE_TESTE" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
