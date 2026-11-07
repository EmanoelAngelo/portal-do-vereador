import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

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
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const users = [
      { email: "admin@arthurhalal.com.br", password: "CONFIGURE_EM_AMBIENTE_DE_TESTE", role: "admin", full_name: "Administrador" },
      { email: "vereador@arthurhalal.com.br", password: "CONFIGURE_EM_AMBIENTE_DE_TESTE", role: "vereador", full_name: "Arthur Halal" },
      { email: "assessor@arthurhalal.com.br", password: "CONFIGURE_EM_AMBIENTE_DE_TESTE", role: "assessor", full_name: "Carlos Assessor" },
      { email: "cidadao.teste@gmail.com", password: "CONFIGURE_EM_AMBIENTE_DE_TESTE", role: "citizen", full_name: "Joao Silva" },
      { email: "empresa.teste@gmail.com", password: "CONFIGURE_EM_AMBIENTE_DE_TESTE", role: "empresa", full_name: "Construtora Exemplo" },
      { email: "desenvolvedor@example.com", password: "CONFIGURE_EM_AMBIENTE_DE_TESTE", role: "citizen", full_name: "Emanoel Angelo" },
    ];

    const results: { email: string; status: string; userId?: string; error?: string }[] = [];

    for (const u of users) {
      try {
        const { data: listData, error: listErr } = await supabase.auth.admin.listUsers();
        
        if (listErr) {
          results.push({ email: u.email, status: "list_error", error: listErr.message });
          continue;
        }

        const existingUser = listData?.users?.find(
          (user) => user.email?.toLowerCase() === u.email.toLowerCase()
        );

        if (existingUser) {
          const { error: updateErr } = await supabase.auth.admin.updateUserById(
            existingUser.id,
            { 
              password: u.password,
              email_confirm: true,
              user_metadata: { role: u.role, full_name: u.full_name, display_name: u.full_name.split(" ")[0] }
            }
          );

          if (updateErr) {
            results.push({ email: u.email, status: "update_error", error: updateErr.message });
          } else {
            results.push({ email: u.email, status: "password_reset", userId: existingUser.id });
            
            const { data: existingProfile } = await supabase
              .from("profiles")
              .select("id")
              .eq("id", existingUser.id)
              .maybeSingle();
              
            if (!existingProfile) {
              await supabase.from("profiles").upsert({
                id: existingUser.id,
                full_name: u.full_name,
                display_name: u.full_name.split(" ")[0],
                role: u.role,
                status: "active",
                registration_complete: true,
                onboarding_step: "complete",
              });
            } else {
              await supabase.from("profiles").update({
                full_name: u.full_name,
                display_name: u.full_name.split(" ")[0],
                role: u.role,
                status: "active",
              }).eq("id", existingUser.id);
            }
          }
        } else {
          const { data: createData, error: createErr } = await supabase.auth.admin.createUser({
            email: u.email,
            password: u.password,
            email_confirm: true,
            user_metadata: { role: u.role, full_name: u.full_name, display_name: u.full_name.split(" ")[0] },
          });

          if (createErr) {
            results.push({ email: u.email, status: "create_error", error: createErr.message });
          } else if (createData?.user) {
            results.push({ email: u.email, status: "created", userId: createData.user.id });
            
            await supabase.from("profiles").upsert({
              id: createData.user.id,
              full_name: u.full_name,
              display_name: u.full_name.split(" ")[0],
              role: u.role,
              status: "active",
              registration_complete: true,
              onboarding_step: "complete",
            });
          }
        }
      } catch (e) {
        results.push({ email: u.email, status: "exception", error: (e as Error).message });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results, senha_padrao: "CONFIGURE_EM_AMBIENTE_DE_TESTE" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
