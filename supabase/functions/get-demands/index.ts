import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

  try {
    const supabaseUrl = getSupabaseUrl();
    const serviceKey = getServiceRoleKey();

    console.log("[get-demands v3] URL:", supabaseUrl ? "present" : "MISSING");
    console.log("[get-demands v3] Service key length:", serviceKey.length);

    if (!supabaseUrl || !serviceKey) {
      const missing = [];
      if (!supabaseUrl) missing.push("SUPABASE_URL");
      if (!serviceKey) missing.push("SERVICE_ROLE_KEY / SUPABASE_SERVICE_ROLE_KEY");
      return new Response(
        JSON.stringify({ error: `Configuracao incompleta: ${missing.join(", ")}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const client = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let citizenId: string | null = null;
    let mode: string = "all";

    if (req.method === "POST") {
      try {
        const body = await req.json();
        citizenId = body?.citizen_id || null;
        mode = body?.mode || (citizenId ? "citizen" : "all");
      } catch {
        // body vazio, segue com params da URL
      }
    }

    if (!citizenId) {
      const url = new URL(req.url);
      citizenId = url.searchParams.get("citizen_id");
      mode = url.searchParams.get("mode") || (citizenId ? "citizen" : "all");
    }

    let query = client.from("demands").select("*");

    if (citizenId && mode === "citizen") {
      query = query.eq("citizen_id", citizenId);
      console.log("[get-demands v3] Buscando para citizen_id:", citizenId);
    } else {
      console.log("[get-demands v3] Buscando TODAS as demandas (modo staff)");
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("[get-demands v3] Query error:", error.message, error.code);
      return new Response(
        JSON.stringify({ error: `Erro na consulta: ${error.message}`, code: error.code }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[get-demands v3] OK, encontradas:", (data ?? []).length);

    return new Response(
      JSON.stringify(data ?? []),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[get-demands v3] FATAL:", msg);
    return new Response(
      JSON.stringify({ error: `Erro interno: ${msg}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
