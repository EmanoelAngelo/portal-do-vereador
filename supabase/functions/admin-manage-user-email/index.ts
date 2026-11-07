import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getServiceRoleKey(): string {
  const possibleNames = ["SERVICE_ROLE_KEY", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_KEY"];
  for (const name of possibleNames) {
    const val = Deno.env.get(name);
    if (val && val.trim().length > 20) return val.trim();
  }
  return "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = getServiceRoleKey();
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ success: false, error: "Config missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

    const body = await req.json();
    const { user_id, email, action } = body;

    if (!user_id) {
      return new Response(JSON.stringify({ success: false, error: "user_id é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // AÇÃO: Obter email atual
    if (action === "get") {
      try {
        const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(user_id);
        if (userErr || !userData?.user) {
          return new Response(JSON.stringify({ success: false, error: "Usuário não encontrado" }), {
            status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("emails_notificacao, is_default_user")
          .eq("id", user_id)
          .single();

        return new Response(JSON.stringify({
          success: true,
          email: userData.user.email,
          confirmed_at: userData.user.email_confirmed_at,
          emails_notificacao: profile?.emails_notificacao ?? null,
          is_default_user: profile?.is_default_user ?? false,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        return new Response(JSON.stringify({ success: false, error: (e as Error).message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // AÇÃO: Atualizar email (v5 — RESETA senha + LIMPA avatar ao trocar email)
    // Motivo: o usuário SEMPRE será redirecionado ao /complete-profile (onboarding_step="email_reset")
    // onde ele DEVE definir uma NOVA foto de perfil e uma NOVA senha própria.
    // Resetar pra Teste@123 garante que o admin consiga testar o login.
    // Limpar avatar_url/profile_photo garante que a foto do email antigo não vaze.
    const DEFAULT_PASSWORD = "CONFIGURE_EM_AMBIENTE_DE_TESTE";

    if (action === "update") {
      if (!email || !email.includes("@")) {
        return new Response(JSON.stringify({ success: false, error: "Email inválido" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        // Atualiza email E reseta senha pra Teste@123
        const { data: updated, error: updateErr } = await supabase.auth.admin.updateUserById(user_id, {
          email: email.trim().toLowerCase(),
          password: DEFAULT_PASSWORD,
          email_confirm: true,
        });

        if (updateErr || !updated?.user) {
          return new Response(JSON.stringify({ success: false, error: updateErr?.message || "Erro ao atualizar email" }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // onboarding_step="email_reset" força o usuário ao /complete-profile no próximo login
        // LIMPA avatar_url e profile_photo — o vereador DEVE enviar nova foto
        // Isso resolve o bug onde a foto do email antigo persistia
        await supabase.from("profiles").update({
          email: email.trim().toLowerCase(),
          is_default_user: false,
          onboarding_step: "email_reset",
          avatar_url: null,
          profile_photo: null,
        }).eq("id", user_id);

        const userProfile = await supabase.from("profiles").select("full_name").eq("id", user_id).single();
        const userName = userProfile?.data?.full_name || "Usuário";

        if (resendApiKey) {
          try {
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${resendApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: "Gabinete Arthur Halal <gabinete@emanoel.shop>",
                to: [email.trim().toLowerCase()],
                subject: "Seu email foi cadastrado — Sistema Arthur Halal",
                html: `
                  <div style="font-family: 'Segoe UI', system-ui, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #0D1629; color: #fff; border-radius: 16px;">
                    <div style="text-align: center; margin-bottom: 24px;">
                      <h2 style="color: #22C55E; margin: 0 0 4px; font-size: 20px; font-weight: 800;">Email Cadastrado com Sucesso!</h2>
                      <p style="color: #3BBFD4; font-size: 11px; letter-spacing: 2px; text-transform: uppercase;">Gabinete Arthur Halal</p>
                    </div>
                    <div style="background: rgba(255,255,255,0.06); border-radius: 12px; padding: 16px; margin-bottom: 20px;">
                      <p style="color: rgba(255,255,255,0.75); font-size: 14px; line-height: 1.6; margin: 0;">
                        Olá ${userName},<br><br>
                        O administrador do sistema cadastrou seu email (<strong>${email}</strong>) para receber notificações do Sistema de Oportunidades do Vereador Arthur Halal.<br><br>
                        No seu primeiro login, use a senha <strong>Teste@123</strong>. Você será direcionado para definir uma foto de perfil e uma nova senha própria. A partir de agora, você receberá notificações por email sobre novos compromissos na agenda, atualizações de demandas, vagas de emprego e muito mais.
                      </p>
                    </div>
                    <p style="font-size: 11px; color: rgba(255,255,255,0.25); text-align: center; margin: 0;">
                      Para deixar de receber, acesse as configurações do seu perfil.
                    </p>
                  </div>
                `,
              }),
            });
          } catch (_) { /* email de boas-vindas é opcional */ }
        }

        return new Response(JSON.stringify({
          success: true,
          message: `Email de "${userName}" atualizado para ${email}. Senha resetada para ${DEFAULT_PASSWORD}. Foto de perfil removida. O usuário deverá definir nova foto e nova senha no primeiro login.`,
          email: email.trim().toLowerCase(),
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        return new Response(JSON.stringify({ success: false, error: (e as Error).message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // AÇÃO: Remover email
    if (action === "remove") {
      try {
        const { error: updateErr } = await supabase.auth.admin.updateUserById(user_id, {
          email: `${user_id.slice(0, 8)}@noemail.system`,
          email_confirm: false,
        });

        if (updateErr) {
          return new Response(JSON.stringify({ success: false, error: updateErr.message }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await supabase.from("profiles").update({ email: null }).eq("id", user_id);

        return new Response(JSON.stringify({
          success: true,
          message: "Email removido com sucesso. O usuário não receberá mais notificações por email.",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        return new Response(JSON.stringify({ success: false, error: (e as Error).message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ success: false, error: "Ação inválida. Use: get, update, remove" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
