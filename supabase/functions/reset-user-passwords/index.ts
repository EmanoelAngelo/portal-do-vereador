import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

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
  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const users = [
    { email: "admin@arthurhalal.com.br",        password: "CONFIGURE_EM_AMBIENTE_DE_TESTE" },
    { email: "assessor@arthurhalal.com.br",     password: "CONFIGURE_EM_AMBIENTE_DE_TESTE" },
    { email: "vereador@arthurhalal.com.br",     password: "CONFIGURE_EM_AMBIENTE_DE_TESTE" },
    { email: "cidadao.teste@gmail.com",         password: "CONFIGURE_EM_AMBIENTE_DE_TESTE" },
    { email: "empresa.teste@gmail.com",         password: "CONFIGURE_EM_AMBIENTE_DE_TESTE" },
    { email: "desenvolvedor@example.com",           password: "CONFIGURE_EM_AMBIENTE_DE_TESTE" },
  ];

  const { data: listData, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) {
    return new Response(JSON.stringify({ error: listErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const existingUsers = listData?.users ?? [];
  const results = [];

  for (const u of users) {
    const existing = existingUsers.find((x) => x.email === u.email);
    if (!existing) {
      results.push({ email: u.email, status: "not_found" });
      continue;
    }

    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
      password: u.password,
      email_confirm: true,
    });

    results.push({
      email: u.email,
      status: updateErr ? "error" : "updated",
      error: updateErr?.message,
    });
  }

  return new Response(JSON.stringify({ success: true, results, senha_padrao: "CONFIGURE_EM_AMBIENTE_DE_TESTE" }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
