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

    console.log("[update-demand v3] URL:", supabaseUrl ? "present" : "MISSING");
    console.log("[update-demand v3] Service key length:", serviceKey.length);

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

    // ── AUTHORIZATION CHECK ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Nao autorizado: token ausente" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    console.log("[update-demand v3] Verificando token JWT...");

    const { data: { user }, error: authErr } = await serviceClient.auth.getUser(token);

    if (authErr || !user) {
      console.error("[update-demand v3] Auth error:", authErr?.message);
      return new Response(JSON.stringify({ error: "Nao autorizado: token invalido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = user.id;
    console.log("[update-demand v3] Caller:", callerId);

    // Verificar role do caller (admin, assessor, vereador)
    const { data: callerProfile, error: profileErr } = await serviceClient
      .from("profiles")
      .select("role")
      .eq("id", callerId)
      .maybeSingle();

    if (profileErr || !callerProfile) {
      console.error("[update-demand v3] Profile not found for caller:", callerId);
      return new Response(JSON.stringify({ error: "Perfil nao encontrado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[update-demand v3] Caller role:", callerProfile.role);

    const allowedRoles = ["admin", "vereador", "assessor"];
    if (!allowedRoles.includes(callerProfile.role)) {
      return new Response(JSON.stringify({ error: "Acesso negado: role nao permitida" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { id, fields } = body;

    if (!id || !fields || typeof fields !== "object") {
      return new Response(JSON.stringify({ error: "Campos obrigatorios: id, fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[update-demand v3] Updating demand", id, "with fields:", Object.keys(fields));

    // Para assessor: verificar se ele e o responsavel ou a demanda esta livre
    if (callerProfile.role === "assessor") {
      const { data: demand, error: demandErr } = await serviceClient
        .from("demands")
        .select("assessor_id")
        .eq("id", id)
        .maybeSingle();

      if (demandErr || !demand) {
        return new Response(JSON.stringify({ error: "Demanda nao encontrada" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const isMine = demand.assessor_id === callerId;
      const isFree = demand.assessor_id === null;

      if (!isMine && !isFree) {
        return new Response(JSON.stringify({ error: "Apenas o assessor responsavel pode editar esta demanda" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (isFree && fields.assessor_id && fields.assessor_id !== callerId) {
        return new Response(JSON.stringify({ error: "Voce so pode assumir a demanda para si mesmo" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { error: updateErr } = await serviceClient
      .from("demands")
      .update(fields)
      .eq("id", id);

    if (updateErr) {
      console.error("[update-demand v3] Erro Supabase:", updateErr.message, updateErr.code, updateErr.details);
      return new Response(
        JSON.stringify({ error: updateErr.message, code: updateErr.code }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[update-demand v3] SUCCESS — demanda", id, "atualizada");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[update-demand v3] FATAL:", message);
    return new Response(JSON.stringify({ error: `Erro interno: ${message}` }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
