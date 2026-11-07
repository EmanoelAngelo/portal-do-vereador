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

    const VEREADOR_EMAIL = "vereador@arthurhalal.com.br";
    const VEREADOR_PASSWORD = "CONFIGURE_EM_AMBIENTE_DE_TESTE";
    const VEREADOR_NAME = "Arthur Halal";

    const summary: string[] = [];

    // 1. Listar todos os users do auth
    const { data: userList, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (listErr) throw new Error("Failed to list users: " + listErr.message);

    const allUsers = userList?.users ?? [];

    // 2. Encontrar o profile com role='vereador'
    const { data: vereadorProfile } = await supabase
      .from("profiles")
      .select("id, email, full_name, role")
      .eq("role", "vereador")
      .maybeSingle();

    let vereadorAuthId: string | null = null;

    if (vereadorProfile) {
      vereadorAuthId = vereadorProfile.id;
      summary.push(`Found vereador profile: ${vereadorProfile.email} (id: ${vereadorAuthId})`);
    }

    const existingByEmail = allUsers.find(
      (u) => u.email?.toLowerCase() === VEREADOR_EMAIL.toLowerCase()
    );

    if (vereadorAuthId) {
      const authUser = allUsers.find((u) => u.id === vereadorAuthId);
      if (authUser) {
        const { error: updateErr } = await supabase.auth.admin.updateUserById(vereadorAuthId, {
          email: VEREADOR_EMAIL,
          password: VEREADOR_PASSWORD,
          email_confirm: true,
        });
        if (updateErr) {
          summary.push(`Error updating auth user: ${updateErr.message}`);
        } else {
          summary.push(`Updated auth user email to ${VEREADOR_EMAIL} and reset password`);
        }

        // REGRA DE OURO: após reset, vereador volta com credenciais padrão.
        // onboarding_step: null = perfil completo, NÃO força /complete-profile.
        // Apenas quando admin edita email manualmente que onboarding_step = "email_reset".
        await supabase.from("profiles").update({
          email: VEREADOR_EMAIL,
          full_name: VEREADOR_NAME,
          is_default_user: true,
          status: "active",
          onboarding_step: null,
        }).eq("id", vereadorAuthId);
        summary.push("Profile updated — onboarding_step=null (perfil completo, sem forçar /complete-profile)");
      } else {
        await supabase.from("profiles").delete().eq("id", vereadorAuthId);
        summary.push("Deleted orphan profile, will recreate");
        vereadorAuthId = null;
      }
    }

    if (!vereadorAuthId) {
      if (existingByEmail) {
        const { error: updErr } = await supabase.auth.admin.updateUserById(existingByEmail.id, {
          password: VEREADOR_PASSWORD,
          email_confirm: true,
        });
        if (updErr) summary.push(`Error resetting existing auth user: ${updErr.message}`);

        await supabase.from("profiles").upsert({
          id: existingByEmail.id,
          email: VEREADOR_EMAIL,
          full_name: VEREADOR_NAME,
          role: "vereador",
          is_default_user: true,
          status: "active",
          onboarding_step: null,
        }, { onConflict: "id" });

        summary.push(`Reused existing auth user and upserted profile for ${VEREADOR_EMAIL}`);
      } else {
        const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
          email: VEREADOR_EMAIL,
          password: VEREADOR_PASSWORD,
          email_confirm: true,
          user_metadata: { full_name: VEREADOR_NAME },
        });

        if (createErr) {
          throw new Error("Failed to create auth user: " + createErr.message);
        }

        if (newUser?.user) {
          await new Promise((r) => setTimeout(r, 500));
          const { error: profErr } = await supabase.from("profiles").upsert({
            id: newUser.user.id,
            email: VEREADOR_EMAIL,
            full_name: VEREADOR_NAME,
            role: "vereador",
            is_default_user: true,
            status: "active",
            onboarding_step: null,
          }, { onConflict: "id" });

          if (profErr) summary.push(`Profile error: ${profErr.message}`);
          else summary.push(`Created new auth user and profile for ${VEREADOR_EMAIL}`);
        }
      }
    }

    summary.push("VEREADOR RECRIADO COM SUCESSO");
    summary.push(`Email: ${VEREADOR_EMAIL}`);
    summary.push(`Senha: ${VEREADOR_PASSWORD}`);

    return new Response(
      JSON.stringify({ success: true, summary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});