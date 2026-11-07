import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function getEnv(key: string): string {
  return (Deno.env.get(key) ?? "").trim();
}

function getServiceRoleKey(): string {
  const possibleNames = [
    "SERVICE_ROLE_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SERVICE_KEY",
    "VITE_SUPABASE_SERVICE_ROLE_KEY",
  ];
  for (const name of possibleNames) {
    const val = getEnv(name);
    if (val && val.length > 20) return val;
  }
  return "";
}

function getSupabaseUrl(): string {
  return getEnv("SUPABASE_URL");
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = getSupabaseUrl();
    const serviceKey = getServiceRoleKey();

    console.log("[update-citizen-profile v4] URL:", supabaseUrl ? "present" : "MISSING");
    console.log("[update-citizen-profile v4] Service key length:", serviceKey.length);

    if (!supabaseUrl || !serviceKey) {
      const missing = [];
      if (!supabaseUrl) missing.push("SUPABASE_URL");
      if (!serviceKey) missing.push("SERVICE_ROLE_KEY / SUPABASE_SERVICE_ROLE_KEY");
      return new Response(
        JSON.stringify({ error: `Configuracao incompleta: ${missing.join(", ")}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const body = await req.json();
    const { citizen_id, vaga_title, candidatura_id, vaga_id } = body;

    console.log("[update-citizen-profile v4] Received:", { citizen_id, vaga_title, candidatura_id, vaga_id });

    if (!citizen_id) {
      return new Response(JSON.stringify({ error: "citizen_id obrigatorio" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // v4: Quando contratado pela plataforma, muda job_status para "not_looking"
    // O cidadao pode mudar manualmente depois no perfil se quiser voltar a procurar
    const updates: Record<string, unknown> = {
      is_employed: true,
      employed_through_platform: true,
      platform_job_details: vaga_title ?? "Vaga via plataforma",
      job_status: "not_looking",
      updated_at: new Date().toISOString(),
    };

    const { error: profileError } = await serviceClient
      .from("profiles")
      .update(updates)
      .eq("id", citizen_id);

    if (profileError) {
      console.error("[update-citizen-profile v4] Erro profiles:", profileError.message);
      return new Response(
        JSON.stringify({ error: profileError.message, step: "profiles" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[update-citizen-profile v4] profiles atualizado para:", citizen_id);

    let candidaturaUpdated = false;
    if (vaga_id && citizen_id) {
      const { error: candError } = await serviceClient
        .from("candidaturas")
        .update({
          status: "accepted",
          updated_at: new Date().toISOString(),
        })
        .eq("vaga_id", vaga_id)
        .eq("cidadao_id", citizen_id);

      if (candError) {
        console.warn("[update-citizen-profile v4] Aviso candidaturas:", candError.message);
      } else {
        candidaturaUpdated = true;
        console.log("[update-citizen-profile v4] candidatura marcada como accepted");
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        profile_updated: true,
        candidatura_updated: candidaturaUpdated,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[update-citizen-profile v4] FATAL:", message);
    return new Response(JSON.stringify({ error: `Erro interno: ${message}` }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
