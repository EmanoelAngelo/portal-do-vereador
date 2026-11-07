
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const possibleKeys = [
      "SERVICE_ROLE_KEY",
      "SUPABASE_SERVICE_KEY",
      "VITE_SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
    ];

    let serviceKey = "";
    for (const name of possibleKeys) {
      const val = Deno.env.get(name);
      if (val && val.trim().length > 20) {
        serviceKey = val.trim();
        console.log("[fix-password-hashes] Found key in:", name);
        break;
      }
    }

    if (!serviceKey) {
      const allKeys = Object.keys(Deno.env.toObject()).filter(k =>
        k.toLowerCase().includes("supabase") || k.toLowerCase().includes("service") || k.toLowerCase().includes("key")
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: "Service role key not found in environment variables",
          available_keys: allKeys
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = (Deno.env.get("SUPABASE_URL") ?? "").trim().replace(/\/$/, "");

    if (!supabaseUrl) {
      return new Response(
        JSON.stringify({ success: false, error: "SUPABASE_URL not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // TODOS os 6 usuarios com senha PADRAO Teste@123 — alinhado com a tela de login e demais edge functions
    const users = [
      { email: "admin@arthurhalal.com.br",        password: "CONFIGURE_EM_AMBIENTE_DE_TESTE",      role: "admin", full_name: "Administrador" },
      { email: "assessor@arthurhalal.com.br",     password: "CONFIGURE_EM_AMBIENTE_DE_TESTE",   role: "assessor", full_name: "Carlos Assessor" },
      { email: "vereador@arthurhalal.com.br",     password: "CONFIGURE_EM_AMBIENTE_DE_TESTE",   role: "vereador", full_name: "Arthur Halal" },
      { email: "cidadao.teste@gmail.com",         password: "CONFIGURE_EM_AMBIENTE_DE_TESTE",    role: "citizen", full_name: "Joao Silva" },
      { email: "empresa.teste@gmail.com",         password: "CONFIGURE_EM_AMBIENTE_DE_TESTE",    role: "empresa", full_name: "Construtora Exemplo" },
      { email: "desenvolvedor@example.com",           password: "CONFIGURE_EM_AMBIENTE_DE_TESTE",    role: "citizen", full_name: "Emanoel Angelo" },
    ];

    const results: { email: string; status: string; password: string; error?: string }[] = [];

    for (const u of users) {
      try {
        const { data: listData, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 100 });

        if (listErr) {
          console.error("[fix-password-hashes] listUsers error:", listErr.message);
          results.push({ email: u.email, status: "list_error", password: u.password, error: listErr.message });
          continue;
        }

        const existingUser = listData?.users?.find(
          (user) => user.email?.toLowerCase() === u.email.toLowerCase()
        );

        if (existingUser) {
          const { error: updateErr } = await supabase.auth.admin.updateUserById(existingUser.id, {
            password: u.password,
            email_confirm: true,
            user_metadata: {
              role: u.role,
              full_name: u.full_name,
              display_name: u.full_name.split(" ")[0],
            },
          });

          if (updateErr) {
            console.error("[fix-password-hashes] updateUser error for", u.email, ":", updateErr.message);
            results.push({ email: u.email, status: "update_error", password: u.password, error: updateErr.message });
          } else {
            console.log("[fix-password-hashes] Updated:", u.email);
            results.push({ email: u.email, status: "updated", password: u.password });

            await supabase.from("profiles").upsert({
              id: existingUser.id,
              full_name: u.full_name,
              display_name: u.full_name.split(" ")[0],
              role: u.role,
              status: "active",
              registration_complete: true,
              onboarding_step: "completed",
            }, { onConflict: "id" }).then(({ error: upsertErr }) => {
              if (upsertErr) console.error("[fix-password-hashes] profile upsert error:", upsertErr.message);
            });
          }
        } else {
          const { data: createData, error: createErr } = await supabase.auth.admin.createUser({
            email: u.email,
            password: u.password,
            email_confirm: true,
            user_metadata: {
              role: u.role,
              full_name: u.full_name,
              display_name: u.full_name.split(" ")[0],
            },
          });

          if (createErr) {
            console.error("[fix-password-hashes] createUser error for", u.email, ":", createErr.message);
            results.push({ email: u.email, status: "create_error", password: u.password, error: createErr.message });
          } else if (createData?.user) {
            console.log("[fix-password-hashes] Created:", u.email, createData.user.id);
            results.push({ email: u.email, status: "created", password: u.password });

            await supabase.from("profiles").upsert({
              id: createData.user.id,
              full_name: u.full_name,
              display_name: u.full_name.split(" ")[0],
              role: u.role,
              status: "active",
              registration_complete: true,
              onboarding_step: "completed",
            }, { onConflict: "id" }).then(({ error: upsertErr }) => {
              if (upsertErr) console.error("[fix-password-hashes] profile upsert error:", upsertErr.message);
            });
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[fix-password-hashes] exception for", u.email, ":", msg);
        results.push({ email: u.email, status: "exception", password: u.password, error: msg });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results, senha_padrao: "CONFIGURE_EM_AMBIENTE_DE_TESTE" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[fix-password-hashes] FATAL:", msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
