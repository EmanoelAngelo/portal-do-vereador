import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getEnvUrl(): string {
  for (const c of [Deno.env.get("SUPABASE_URL"), Deno.env.get("VITE_PUBLIC_SUPABASE_URL")]) {
    if (c && c.startsWith("https://")) return c.trim().replace(/\/$/, "");
  }
  return "";
}

function getEnvServiceKey(): string {
  return (Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { id, full_name, display_name, phone, neighborhood, role, company_name, cnpj, responsible_name, registration_complete, email } = await req.json();

    if (!id || !role) {
      return new Response(JSON.stringify({ error: "Missing required fields: id, role" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = getEnvUrl();
    const serviceKey = getEnvServiceKey();
    const supabase = createClient(supabaseUrl, serviceKey);

    // Se email não foi fornecido, tenta buscar do auth.users
    let userEmail = email || "";
    if (!userEmail && serviceKey) {
      try {
        const { data: authUser } = await supabase.auth.admin.getUserById(id);
        if (authUser?.user?.email) {
          userEmail = authUser.user.email;
        }
      } catch (_) {
        // silent
      }
    }

    const payload: Record<string, unknown> = {
      id,
      full_name: full_name || display_name || "",
      display_name: display_name || full_name || "",
      email: userEmail,
      phone: phone || "",
      neighborhood: neighborhood || "",
      role,
      registration_complete: registration_complete ?? false,
      onboarding_step: (registration_complete ?? false) ? null : "email_verified",
      status: role === "assessor" ? "pending" : "active",
    };

    if (role === "empresa") {
      payload.company_name = company_name || "";
      payload.cnpj = cnpj || "";
      payload.responsible_name = responsible_name || "";
    }

    const { error } = await supabase.from("profiles").upsert(payload);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
