import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function getSupabaseUrl(): string {
  const url = Deno.env.get("SUPABASE_URL");
  if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
    return url.replace(/\/$/, "");
  }
  return "";
}

function getSupabaseKey(): string {
  return (Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ success: false, error: "Corpo invalido." });
    }

    const email = String(body.email || "").trim().toLowerCase();
    const code = String(body.code || "").trim();

    if (!email || !code) {
      return json({ success: false, error: "Email e codigo obrigatorios." });
    }

    const supabaseUrl = getSupabaseUrl();
    const supabaseKey = getSupabaseKey();

    if (!supabaseUrl) {
      return json({ success: false, error: "SUPABASE_URL nao configurada." });
    }
    if (!supabaseKey) {
      return json({ success: false, error: "SERVICE_ROLE_KEY / SUPABASE_SERVICE_ROLE_KEY nao configurada. Configure no Dashboard do Supabase." });
    }

    console.log("[verify-code] Verificando codigo para:", email);
    console.log("[verify-code] Supabase URL:", supabaseUrl);

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Find valid code - ONLY validate, do NOT consume
    const { data: rows, error: selectErr } = await supabase
      .from("verification_codes")
      .select("*")
      .eq("email", email)
      .eq("code", code)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    if (selectErr) {
      console.error("[verify-code] Select error:", JSON.stringify(selectErr));
      return json({ success: false, error: "Erro ao verificar codigo. Detalhe: " + String(selectErr.message || selectErr) });
    }

    if (!rows || rows.length === 0) {
      console.log("[verify-code] Nenhum codigo valido encontrado para", email);

      // Diagnostico: verificar se tem codigos expirados ou ja usados para esse email
      const { data: diagRows } = await supabase
        .from("verification_codes")
        .select("code, used_at, expires_at, created_at")
        .eq("email", email)
        .order("created_at", { ascending: false })
        .limit(3);

      if (diagRows && diagRows.length > 0) {
        const diag = diagRows.map((r: Record<string, unknown>) => ({
          code: r.code,
          used: r.used_at ? "sim" : "nao",
          expired: new Date(String(r.expires_at)) < new Date() ? "sim" : "nao",
        }));
        console.log("[verify-code] Diagnostico para", email, ":", JSON.stringify(diag));
      }

      return json({ success: false, error: "Codigo invalido ou expirado." });
    }

    console.log("[verify-code] Codigo ENCONTRADO e valido para:", email, "— NAO consumido (aguardando confirm-registration)");
    return json({
      success: true,
      email: rows[0].email,
      role: rows[0].role,
      user_metadata: rows[0].user_metadata,
      purpose: rows[0].purpose,
      code_id: rows[0].id,
      message: "Codigo verificado!",
    });
  } catch (fatalErr) {
    console.error("[verify-code] FATAL UNHANDLED ERROR:", fatalErr);
    const msg = fatalErr instanceof Error ? fatalErr.message : String(fatalErr);
    return json({
      success: false,
      error: "Erro interno do servidor.",
      detail: msg,
    });
  }
});
