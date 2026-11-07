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

    let errors: string[] = [];

    // 1. Deletar demand_messages
    const { count: msgCount, error: msgErr } = await supabase
      .from("demand_messages")
      .delete({ count: "exact" })
      .neq("id", 0);
    if (msgErr) errors.push("demand_messages: " + msgErr.message);

    // 2. Deletar demands
    const { count: demandCount, error: demandErr } = await supabase
      .from("demands")
      .delete({ count: "exact" })
      .neq("id", 0);
    if (demandErr) errors.push("demands: " + demandErr.message);

    // 3. Deletar notificacoes relacionadas a demandas
    const { count: notifCount, error: notifErr } = await supabase
      .from("notificacoes")
      .delete({ count: "exact" })
      .eq("referencia_tipo", "demanda");
    if (notifErr) errors.push("notificacoes_demanda: " + notifErr.message);

    return new Response(
      JSON.stringify({
        success: errors.length === 0,
        summary: {
          demandasDeletadas: demandCount ?? 0,
          mensagensDeletadas: msgCount ?? 0,
          notificacoesDeletadas: notifCount ?? 0,
        },
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    console.error("[admin-delete-demands] Erro:", msg);
    return new Response(JSON.stringify({ error: "Erro interno no servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
