import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const steps: Record<string, unknown>[] = [];
  const startTime = Date.now();

  try {
    // STEP 1: Check RESEND_API_KEY
    const resendKey = (Deno.env.get("RESEND_API_KEY") || "").trim();
    steps.push({
      step: 1,
      name: "RESEND_API_KEY",
      status: resendKey ? (resendKey.startsWith("re_") ? "pass" : "warn") : "fail",
      detail: resendKey
        ? `Presente (${resendKey.length} chars, prefixo: ${resendKey.slice(0, 6)}...)`
        : "AUSENTE — Nenhum email será enviado!",
      fix: resendKey
        ? (resendKey.startsWith("re_") ? null : "A chave deve começar com 're_'. Verifique no dashboard do Resend.")
        : "Configure RESEND_API_KEY nas secrets da Edge Function no Supabase Dashboard.",
    });

    // STEP 2: Check SERVICE_ROLE_KEY
    let serviceKey = "";
    for (const name of ["SERVICE_ROLE_KEY", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_KEY"]) {
      const v = Deno.env.get(name);
      if (v && v.trim().length > 20) { serviceKey = v.trim(); break; }
    }
    steps.push({
      step: 2,
      name: "SERVICE_ROLE_KEY",
      status: serviceKey ? "pass" : "warn",
      detail: serviceKey
        ? `Presente (${serviceKey.length} chars)`
        : "AUSENTE — Não será possível resolver userId → email automaticamente. Emails que dependem de userId (sem recipientEmail) vão falhar.",
      fix: serviceKey ? null : "Configure SERVICE_ROLE_KEY nas secrets da Edge Function.",
    });

    // STEP 3: Check SUPABASE_URL
    const supabaseUrl = (Deno.env.get("SUPABASE_URL") || "").trim().replace(/\/$/, "");
    steps.push({
      step: 3,
      name: "SUPABASE_URL",
      status: supabaseUrl ? "pass" : "fail",
      detail: supabaseUrl ? supabaseUrl : "AUSENTE",
    });

    // STEP 4: Test Resend API connection (list domains)
    let resendDomains: string[] = [];
    if (resendKey && resendKey.startsWith("re_")) {
      try {
        const domainRes = await fetch("https://api.resend.com/domains", {
          headers: { "Authorization": `Bearer ${resendKey}` },
        });
        const domainBody = await domainRes.json();
        if (domainRes.ok && Array.isArray(domainBody.data)) {
          resendDomains = domainBody.data.map((d: { name: string; status: string }) =>
            `${d.name} (${d.status})`
          );
          steps.push({
            step: 4,
            name: "Domínios Resend",
            status: resendDomains.length > 0 ? "pass" : "warn",
            detail: resendDomains.length > 0
              ? `${resendDomains.length} domínio(s): ${resendDomains.join(", ")}`
              : "Nenhum domínio verificado no Resend.",
            domains: resendDomains,
            fix: resendDomains.length === 0
              ? "Adicione e verifique um domínio em https://resend.com/domains"
              : null,
          });
        } else {
          steps.push({
            step: 4,
            name: "Domínios Resend",
            status: "fail",
            detail: `Erro ao listar domínios: ${domainRes.status} — ${JSON.stringify(domainBody).slice(0, 200)}`,
          });
        }
      } catch (e) {
        steps.push({
          step: 4,
          name: "Domínios Resend",
          status: "fail",
          detail: `Exceção: ${(e as Error).message}`,
        });
      }
    } else {
      steps.push({
        step: 4,
        name: "Domínios Resend",
        status: "skipped",
        detail: "RESEND_API_KEY não configurada corretamente.",
      });
    }

    // STEP 5: Check from addresses used in edge functions
    steps.push({
      step: 5,
      name: "Remetentes (from)",
      status: "info",
      detail: "send-verification usa: ArthurHalal@emanoel.shop | send-email-notification usa: gabinete@emanoel.shop",
      fix: "Ambos os remetentes precisam ter o domínio verificado no Resend. O domínio 'emanoel.shop' aparece como verificado?",
    });

    // STEP 6: Test actual email send (if API key present)
    let testEmailResult: Record<string, unknown> | null = null;
    if (resendKey && resendKey.startsWith("re_")) {
      try {
        const testRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Diagnóstico Arthur Halal <diagnostico@emanoel.shop>",
            to: "diagnostico@emanoel.shop",
            subject: "[TESTE] Diagnóstico de Email — Arthur Halal",
            html: `<div style="font-family:sans-serif;padding:24px;background:#0D1629;color:#fff;border-radius:12px"><h2 style="color:#E8A020">✅ Diagnóstico de Email</h2><p>Se você está vendo este email, o envio está FUNCIONANDO!</p><p style="color:rgba(255,255,255,0.5);font-size:12px">Timestamp: ${new Date().toISOString()}</p></div>`,
          }),
        });
        const testBody = await testRes.json();
        testEmailResult = { status: testRes.status, ok: testRes.ok, id: testBody.id, error: testBody.message };

        steps.push({
          step: 6,
          name: "Teste de Envio Real",
          status: testRes.ok ? "pass" : "fail",
          detail: testRes.ok
            ? `Email de teste enviado com sucesso! ID: ${testBody.id}`
            : `Falha no envio: ${testBody.message || "Erro desconhecido"}`,
          result: testEmailResult,
          fix: !testRes.ok
            ? `Verifique: 1) Domínio 'emanoel.shop' está verificado no Resend? 2) O DNS (MX, SPF, DKIM) está configurado? 3) A API key tem permissão de sending? Erro: ${testBody.message}`
            : null,
        });
      } catch (e) {
        steps.push({
          step: 6,
          name: "Teste de Envio Real",
          status: "fail",
          detail: `Exceção: ${(e as Error).message}`,
        });
      }
    } else {
      steps.push({
        step: 6,
        name: "Teste de Envio Real",
        status: "skipped",
        detail: "RESEND_API_KEY não configurada.",
      });
    }

    // STEP 7: Test Supabase admin API (can we resolve user emails?)
    let userCount = 0;
    if (serviceKey && supabaseUrl) {
      try {
        const supabase = createClient(supabaseUrl, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { data: users, error: usersErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        if (!usersErr && users?.users) {
          userCount = users.users.length;

          // Show sample: first 5 users with emails
          const sample = users.users.slice(0, 5).map((u: { email?: string; id: string }) => ({
            email: u.email || "sem email",
            id: u.id.slice(0, 8) + "...",
          }));

          // Count users without emails
          const withoutEmail = users.users.filter((u: { email?: string }) => !u.email).length;

          steps.push({
            step: 7,
            name: "Resolução de Usuários",
            status: "pass",
            detail: `${userCount} usuários no Auth. ${withoutEmail} sem email. Amostra: ${JSON.stringify(sample)}`,
            userCount,
            withoutEmail,
            sample,
          });
        } else {
          steps.push({
            step: 7,
            name: "Resolução de Usuários",
            status: "fail",
            detail: `Erro: ${usersErr?.message || "Desconhecido"}`,
          });
        }
      } catch (e) {
        steps.push({
          step: 7,
          name: "Resolução de Usuários",
          status: "fail",
          detail: `Exceção: ${(e as Error).message}`,
        });
      }
    } else {
      steps.push({
        step: 7,
        name: "Resolução de Usuários",
        status: "skipped",
        detail: "SERVICE_ROLE_KEY ou SUPABASE_URL ausente.",
      });
    }

    // STEP 8: Check send-email-notification edge function
    const edgeFnUrl = supabaseUrl
      ? `${supabaseUrl}/functions/v1/send-email-notification`
      : null;

    if (edgeFnUrl && resendKey) {
      try {
        // Simula envio sem destinatário real pra testar fluxo
        const fnRes = await fetch(edgeFnUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${serviceKey || resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "default",
            subject: "[TESTE] Diagnóstico do Sistema",
            data: { title: "Teste", message: "Diagnóstico automático", sender: "Sistema", panel_url: "https://arthurhalal.com.br", date: new Date().toLocaleString("pt-BR"), type_label: "Teste" },
            recipientEmail: "diagnostico@emanoel.shop",
          }),
        });

        const fnBody = await fnRes.json();
        steps.push({
          step: 8,
          name: "Edge Function send-email-notification",
          status: fnBody.success ? "pass" : "fail",
          detail: fnBody.success
            ? `Funcionando! ID: ${fnBody.id}`
            : `Falhou: ${fnBody.error}`,
          logs: fnBody.logs,
          fix: !fnBody.success
            ? `A edge function retornou erro. Logs: ${JSON.stringify(fnBody.logs || [])}`
            : null,
        });
      } catch (e) {
        steps.push({
          step: 8,
          name: "Edge Function send-email-notification",
          status: "fail",
          detail: `Exceção ao chamar: ${(e as Error).message}`,
        });
      }
    } else {
      steps.push({
        step: 8,
        name: "Edge Function send-email-notification",
        status: "skipped",
        detail: "SUPABASE_URL ou RESEND_API_KEY ausente.",
      });
    }

    // STEP 9: Check verification flow (send-verification edge function)
    const verifyFnUrl = supabaseUrl
      ? `${supabaseUrl}/functions/v1/send-verification`
      : null;

    if (verifyFnUrl && resendKey) {
      try {
        const vRes = await fetch(verifyFnUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${serviceKey || resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: "diagnostico@emanoel.shop",
            role: "citizen",
            purpose: "register",
          }),
        });
        const vBody = await vRes.json();
        steps.push({
          step: 9,
          name: "Edge Function send-verification",
          status: vBody.emailSent ? "pass" : (vBody.success ? "warn" : "fail"),
          detail: vBody.emailSent
            ? "Email de verificação enviado com sucesso!"
            : vBody.codeStored
              ? "Código armazenado no banco, mas email NÃO foi enviado (RESEND_API_KEY pode estar ausente)"
              : `Falha: ${vBody.error || "Desconhecido"}`,
          emailSent: vBody.emailSent,
          codeStored: vBody.codeStored,
          fix: !vBody.emailSent
            ? "A função send-verification gerou o código mas não enviou o email. Verifique RESEND_API_KEY."
            : null,
        });
      } catch (e) {
        steps.push({
          step: 9,
          name: "Edge Function send-verification",
          status: "fail",
          detail: `Exceção: ${(e as Error).message}`,
        });
      }
    }

    // STEP 10: Summary
    const allPass = steps.every((s) => s.status === "pass" || s.status === "info" || s.status === "skipped");
    const criticalFails = steps.filter((s) => s.status === "fail");

    const summary = {
      totalSteps: steps.length,
      passed: steps.filter((s) => s.status === "pass").length,
      warnings: steps.filter((s) => s.status === "warn").length,
      failed: steps.filter((s) => s.status === "fail").length,
      skipped: steps.filter((s) => s.status === "skipped").length,
      overallStatus: criticalFails.length === 0 ? (allPass ? "healthy" : "attention") : "broken",
      duration: `${Date.now() - startTime}ms`,
    };

    return json({
      success: true,
      summary,
      steps,
      generalFixes: [
        "1. Domínio no Resend: Verifique se 'emanoel.shop' está verificado em https://resend.com/domains",
        "2. SERVICE_ROLE_KEY: Precisa estar configurada nas secrets das Edge Functions para resolver userId → email",
        "3. RESEND_API_KEY: Precisa ser uma chave de API válida do Resend (começa com 're_')",
        "4. DNS: MX, SPF e DKIM precisam estar configurados para o domínio no Resend",
      ],
    });
  } catch (fatalErr) {
    return json({
      success: false,
      error: (fatalErr as Error).message,
      steps,
    });
  }
});
