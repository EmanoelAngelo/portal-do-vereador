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
    const role = String(body.role || "citizen");
    const userMetadata = (body.user_metadata as Record<string, unknown>) || {};
    const purpose = String(body.purpose || "register");

    if (!email) return json({ success: false, error: "Email obrigatorio." });

    const supabaseUrl = getSupabaseUrl();
    const supabaseKey = getSupabaseKey();

    if (!supabaseUrl) {
      return json({ success: false, error: "SUPABASE_URL nao configurada no ambiente da Edge Function." });
    }
    if (!supabaseKey) {
      return json({ success: false, error: "SERVICE_ROLE_KEY / SUPABASE_SERVICE_ROLE_KEY nao configurada. Va no Dashboard do Supabase > Project Settings > API e configure." });
    }

    console.log("[send-verification] Iniciando para:", email, "role:", role);

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ═══════════════════════════════════════════════════════
    // Check if user already exists — só bloqueia se a conta
    // estiver 100% completa. Cadastro incompleto? Deixa continuar!
    // ═══════════════════════════════════════════════════════
    let existingUserId: string | null = null;

    try {
      console.log("[send-verification] Verificando se usuario ja existe:", email);
      const { data: users, error: rpcErr } = await supabase.rpc("get_user_by_email", { email_arg: email });
      if (rpcErr) {
        console.error("[send-verification] RPC error:", JSON.stringify(rpcErr));
      }

      if (users && Array.isArray(users) && users.length > 0) {
        existingUserId = String(users[0].id);
        console.log("[send-verification] Usuario ja existe no auth:", existingUserId);

        let shouldBlock = false;
        let blockMessage = "";

        try {
          const { data: prof } = await supabase.from("profiles")
            .select("onboarding_step,registration_complete,status,role")
            .eq("id", existingUserId)
            .maybeSingle();

          if (prof) {
            const p = prof as Record<string, unknown>;

            if (p.onboarding_step === null && p.registration_complete === true) {
              shouldBlock = true;
              blockMessage = "Este e-mail ja tem uma conta ativa. Faca login para acessar.";
            }
            else if (p.role === "assessor" && p.status === "pending") {
              shouldBlock = true;
              blockMessage = "Sua solicitacao de acesso como assessor esta em analise. Aguarde a aprovacao.";
            }
            else {
              console.log("[send-verification] Cadastro incompleto detectado — deixando continuar. onboarding_step:", p.onboarding_step);
            }
          } else {
            console.log("[send-verification] Usuario sem perfil — deixando continuar (vai criar perfil no confirm-registration)");
          }
        } catch (profileErr) {
          console.error("[send-verification] Profile check error:", profileErr);
        }

        if (shouldBlock) {
          return json({ success: true, userAlreadyExists: true, message: blockMessage });
        }

        console.log("[send-verification] Usuario existe mas cadastro incompleto. Enviando codigo para continuar...");
      }
    } catch (userCheckErr) {
      console.error("[send-verification] User check exception:", userCheckErr);
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    console.log("[send-verification] Codigo gerado:", code, "expira:", expiresAt);

    try {
      await supabase.from("verification_codes")
        .update({ used_at: new Date().toISOString() })
        .eq("email", email)
        .is("used_at", null);
    } catch (invErr) {
      console.error("[send-verification] Invalidate exception:", invErr);
    }

    const { error: insErr } = await supabase.from("verification_codes").insert({
      email, code, role, user_metadata: userMetadata, purpose, expires_at: expiresAt,
    });

    if (insErr) {
      console.error("[send-verification] Insert error:", JSON.stringify(insErr));
      return json({ success: false, error: "Erro ao gerar codigo. Detalhe: " + String(insErr.message || insErr) });
    }

    let emailSent = false;
    const resendKey = (Deno.env.get("RESEND_API_KEY") || "").trim();

    if (resendKey.startsWith("re_")) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 8000);
        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + resendKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "ArthurHalal@emanoel.shop",
            to: email,
            subject: "Codigo de Verificacao — Arthur Halal",
            html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#020C1B;color:#fff;border-radius:12px"><div style="text-align:center;margin-bottom:24px"><h2 style="color:#E8A020;margin:0;font-size:20px">Verificacao de Conta</h2><p style="color:rgba(255,255,255,0.6);margin:8px 0 0;font-size:13px">Arthur Halal — Vereador de Pelotas</p></div><p style="color:rgba(255,255,255,0.8);font-size:14px;line-height:1.6">Use o codigo abaixo para confirmar seu e-mail:</p><div style="background:rgba(232,160,32,0.15);border:1px solid rgba(232,160,32,0.3);border-radius:8px;padding:20px;text-align:center;margin:20px 0"><p style="color:rgba(255,255,255,0.6);margin:0 0 8px;font-size:12px;text-transform:uppercase">Seu codigo</p><h1 style="font-size:40px;letter-spacing:12px;color:#E8A020;margin:0;font-weight:800">${code}</h1></div><p style="color:rgba(255,255,255,0.5);font-size:12px;text-align:center">Valido por 30 minutos.</p></div>`,
          }),
          signal: ctrl.signal,
        });
        clearTimeout(t);
        emailSent = r.ok;

        if (!r.ok) {
          const resendBody = await r.text();
          console.error("[send-verification] Resend API error:", r.status, resendBody.slice(0, 300));
        } else {
          console.log("[send-verification] Email enviado com sucesso para", email);
        }
      } catch (emailErr) {
        console.error("[send-verification] Email send exception:", emailErr);
      }
    } else {
      console.log("[send-verification] RESEND_API_KEY nao configurada. Email NAO sera enviado. O codigo eh:", code);
    }

    const msg = existingUserId
      ? "Codigo enviado! Use-o para continuar seu cadastro."
      : emailSent
        ? "Codigo enviado para seu e-mail!"
        : "Codigo gerado! (Email nao configurado — use o codigo: " + code + ")";

    return json({
      success: true,
      emailSent,
      codeStored: true,
      existingUser: !!existingUserId,
      code: emailSent ? undefined : code,
      message: msg,
    });
  } catch (fatalErr) {
    console.error("[send-verification] FATAL UNHANDLED ERROR:", fatalErr);
    const msg = fatalErr instanceof Error ? fatalErr.message : String(fatalErr);
    return json({
      success: false,
      error: "Erro interno do servidor. Nossa equipe ja foi notificada.",
      detail: msg,
    });
  }
});

function generateCode(): string {
  return String(Math.floor(10000 + Math.random() * 90000));
}
