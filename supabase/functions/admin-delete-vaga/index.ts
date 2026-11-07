import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Metodo nao permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch (_) { /* ignorar */ }

    const vaga_id = body.vaga_id as string | undefined;

    if (!vaga_id) {
      return new Response(
        JSON.stringify({ success: false, error: "vaga_id e obrigatorio" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let errors: string[] = [];

    // 1. Buscar cidadaos que se candidataram
    const { data: cands } = await supabase
      .from("candidaturas")
      .select("cidadao_id")
      .eq("vaga_id", vaga_id);

    const cidadaoIds = [...new Set((cands ?? []).map((c: { cidadao_id: string }) => c.cidadao_id))];

    // 2. Deletar candidaturas
    const { error: candErr } = await supabase
      .from("candidaturas")
      .delete()
      .eq("vaga_id", vaga_id);
    if (candErr) errors.push("candidaturas: " + candErr.message);

    // 3. Deletar a vaga
    const { error: vagaErr } = await supabase
      .from("vagas")
      .delete()
      .eq("id", vaga_id);
    if (vagaErr) errors.push("vaga: " + vagaErr.message);

    return new Response(
      JSON.stringify({
        success: errors.length === 0,
        vaga_id,
        cidadaos_afetados: cidadaoIds,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    console.error("[admin-delete-vaga] Erro:", msg);
    return new Response(JSON.stringify({ error: "Erro interno no servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
