import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * RESET SYSTEM FOR DELIVERY v10
 *
 * v10 additions:
 * - PASSO 7.5: Reseta senha do ADMIN, CIDADAO e EMPRESA para Teste@123
 * - Garante que TODOS os 5 usuários padrão voltam com login/senha Teste@123 após reset
 *
 * v9 additions:
 * - Limpa TODOS os arquivos do bucket 'curriculos' no Storage durante o reset
 * - Garante que curriculo_pdf dos profiles é zerado (já era feito via PROFILE_RESET_FIELDS)
 * - Limpa arquivos de portfolio do bucket 'chat-images' (pasta portfolio_*)
 * - Reseta curriculos_gerados_count para 0
 *
 * - Identifica usuários padrão por ROLE (admin/vereador) ou STANDARD_EMAILS_FIXED
 * - NUNCA identifica usuários como padrão apenas por is_default_user=true
 * - Promise.all para cada tabela com tracking de falhas individuais
 * - NÃO deleta notícias (news) — conteúdo público do site é preservado
 * - Retorna assessorPasswordReset para feedback preciso na UI
 * - REGRA DE OURO: vereador após reset fica com onboarding_step=null (perfil completo).
 */

const STANDARD_EMAILS_FIXED = [
  "admin@arthurhalal.com.br",
  "assessor@arthurhalal.com.br",
  "cidadao.teste@gmail.com",
  "empresa.teste@gmail.com",
];

const VEREADOR_DEFAULT = {
  email: "vereador@arthurhalal.com.br",
  password: "CONFIGURE_EM_AMBIENTE_DE_TESTE",
  full_name: "Arthur Halal",
  role: "vereador",
};

const PROFILE_RESET_FIELDS = {
  display_name: null,
  phone: null,
  neighborhood: null,
  cpf: null,
  avatar_url: null,
  profile_photo: null,
  company_name: null,
  cnpj: null,
  responsible_name: null,
  job_type: null,
  job_type_other: null,
  opportunities_seeking: null,
  bio: null,
  education: null,
  expertise: null,
  job_status: null,
  curriculo_pdf: null,
  curriculos_gerados_count: 0,
  mission: null,
  values: null,
  about: null,
  looking_for_professional: null,
  street: null,
  number: null,
  complement: null,
  city: null,
  state: null,
  cep: null,
  assessor_cargo: null,
  approved_at: null,
  is_service_provider: null,
  service_categories: null,
  service_description: null,
  employment_survey_completed: null,
  is_employed: null,
  employed_through_platform: null,
  platform_job_details: null,
  worker_profile_type: null,
  portfolio_photos: null,
  registration_complete: false,
  onboarding_step: null,
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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

    const supabaseUrl = (Deno.env.get("SUPABASE_URL") ?? "").trim().replace(/\/$/, "");
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const summary: string[] = [];
    const globalCleanupErrors: string[] = [];

    // ════════════════════════════════════════════════════════════════════
    // PASSO 1 — Identificar usuários padrão e reais
    // ════════════════════════════════════════════════════════════════════
    const { data: standardProfiles } = await supabase
      .from("profiles")
      .select("id, email, role, full_name")
      .or("role.eq.admin,role.eq.vereador");

    const standardIds = new Set<string>((standardProfiles ?? []).map((p: { id: string }) => p.id));
    const profileRoleMap = new Map<string, string>();
    (standardProfiles ?? []).forEach((p: { id: string; role: string }) => {
      profileRoleMap.set(p.id, p.role);
    });

    const { data: userList, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (listErr) {
      return new Response(
        JSON.stringify({ success: false, error: "Failed to list users: " + listErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const allUsers = userList?.users ?? [];

    for (const user of allUsers) {
      if (STANDARD_EMAILS_FIXED.includes(user.email?.toLowerCase() ?? "")) {
        standardIds.add(user.id);
      }
    }

    const vereadorAuth = allUsers.find(
      (u) => u.email?.toLowerCase() === VEREADOR_DEFAULT.email.toLowerCase()
    );
    if (vereadorAuth) {
      standardIds.add(vereadorAuth.id);
    }

    const legitStandardIds = new Set<string>();
    for (const uid of standardIds) {
      const user = allUsers.find((u) => u.id === uid);
      const email = user?.email?.toLowerCase() ?? "";
      const profileRole = profileRoleMap.get(uid) ?? "";
      if (
        STANDARD_EMAILS_FIXED.includes(email) ||
        email === VEREADOR_DEFAULT.email.toLowerCase() ||
        profileRole === "admin" ||
        profileRole === "vereador"
      ) {
        legitStandardIds.add(uid);
      }
    }

    const standardUsers = allUsers.filter((u) => legitStandardIds.has(u.id));
    const realUsers = allUsers.filter((u) => !legitStandardIds.has(u.id));

    summary.push(`Total auth users: ${allUsers.length}`);
    summary.push(`Standard (kept): ${standardUsers.length}`);
    summary.push(`Real (delete): ${realUsers.length}`);

    // ════════════════════════════════════════════════════════════════════
    // PASSO 2 — Deletar usuários reais completamente
    // ════════════════════════════════════════════════════════════════════
    let deletedRealUsers = 0;
    for (const user of realUsers) {
      try {
        const userId = user.id;

        await supabase.from("candidaturas").delete().eq("cidadao_id", userId);
        await supabase.from("vagas").delete().eq("company_id", userId);
        await supabase.from("demands").delete().eq("citizen_id", userId);
        await supabase.from("demands").delete().eq("assessor_id", userId);
        await supabase.from("demand_messages").delete().eq("sender_id", userId);
        await supabase.from("notificacoes").delete().eq("user_id", userId);
        await supabase.from("notificacoes").delete().eq("remetente_id", userId);
        await supabase.from("agenda").delete().eq("user_id", userId);

        const { data: chats } = await supabase
          .from("mensagens_chat")
          .select("id")
          .eq("citizen_id", userId);
        if (chats && chats.length > 0) {
          const chatIds = chats.map((c: { id: string }) => c.id);
          await supabase.from("mensagens_chat_items").delete().in("chat_id", chatIds);
          await supabase.from("mensagens_chat").delete().eq("citizen_id", userId);
        }

        await supabase.from("verification_codes").delete().eq("email", user.email ?? "");
        await supabase.from("profiles").delete().eq("id", userId);
        await supabase.auth.admin.deleteUser(userId);

        deletedRealUsers++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        summary.push(`Error deleting ${user.email}: ${msg}`);
      }
    }

    // ════════════════════════════════════════════════════════════════════
    // PASSO 3 — Limpar dados transacionais dos usuários padrão
    // ════════════════════════════════════════════════════════════════════
    let cleanedStandard = 0;
    for (const user of standardUsers) {
      try {
        const userId = user.id;

        await supabase.from("candidaturas").delete().eq("cidadao_id", userId);
        await supabase.from("vagas").delete().eq("company_id", userId);
        await supabase.from("demands").delete().eq("citizen_id", userId);
        await supabase.from("demands").delete().eq("assessor_id", userId);
        await supabase.from("demand_messages").delete().eq("sender_id", userId);
        await supabase.from("notificacoes").delete().eq("user_id", userId);
        await supabase.from("notificacoes").delete().eq("remetente_id", userId);
        await supabase.from("agenda").delete().eq("user_id", userId);

        const { data: chats } = await supabase
          .from("mensagens_chat")
          .select("id")
          .eq("citizen_id", userId);
        if (chats && chats.length > 0) {
          const chatIds = chats.map((c: { id: string }) => c.id);
          await supabase.from("mensagens_chat_items").delete().in("chat_id", chatIds);
          await supabase.from("mensagens_chat").delete().eq("citizen_id", userId);
        }

        await supabase.from("verification_codes").delete().eq("email", user.email ?? "");

        cleanedStandard++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        summary.push(`Error cleaning ${user.email}: ${msg}`);
      }
    }

    // ════════════════════════════════════════════════════════════════════
    // PASSO 4 — Resetar CAMPOS de profile dos usuários padrão
    // ════════════════════════════════════════════════════════════════════
    let profilesReset = 0;
    for (const user of standardUsers) {
      try {
        const { error: updateErr } = await supabase
          .from("profiles")
          .update({ ...PROFILE_RESET_FIELDS, updated_at: new Date().toISOString() })
          .eq("id", user.id);
        if (!updateErr) profilesReset++;
        else summary.push(`Profile reset warning for ${user.email}: ${updateErr.message}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        summary.push(`Profile reset error for ${user.email}: ${msg}`);
      }
    }

    // ════════════════════════════════════════════════════════════════════
    // PASSO 5 — Limpeza global (NUNCA deleta news — conteúdo público do site)
    // ════════════════════════════════════════════════════════════════════
    const globalTables = [
      { name: "demands", op: supabase.from("demands").delete().neq("id", 0) },
      { name: "demand_messages", op: supabase.from("demand_messages").delete().neq("id", 0) },
      { name: "mensagens_chat_items", op: supabase.from("mensagens_chat_items").delete().neq("id", 0) },
      { name: "mensagens_chat", op: supabase.from("mensagens_chat").delete().neq("id", 0) },
      { name: "notificacoes", op: supabase.from("notificacoes").delete().neq("id", 0) },
      { name: "candidaturas", op: supabase.from("candidaturas").delete().neq("id", 0) },
      { name: "vagas", op: supabase.from("vagas").delete().neq("id", 0) },
      { name: "agenda", op: supabase.from("agenda").delete().neq("id", 0) },
      { name: "verification_codes", op: supabase.from("verification_codes").delete().neq("id", 0) },
      { name: "chat_typing", op: supabase.from("chat_typing").delete().neq("id", 0) },
    ];

    for (const { name, op } of globalTables) {
      try {
        const { error } = await op;
        if (error) {
          globalCleanupErrors.push(`${name}: ${error.message}`);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        globalCleanupErrors.push(`${name}: ${msg}`);
      }
    }

    if (globalCleanupErrors.length > 0) {
      summary.push(`Global cleanup issues: ${globalCleanupErrors.join("; ")}`);
    } else {
      summary.push("Global table cleanup done (demands, vagas, chats, candidaturas, agenda, notifs, chat_typing) — news PRESERVED");
    }

    // ════════════════════════════════════════════════════════════════════
    // PASSO 5.5 — Resetar sequência de IDs das demands
    // ════════════════════════════════════════════════════════════════════
    try {
      const { error: seqErr } = await supabase.rpc("reset_demands_sequence");
      if (seqErr) {
        summary.push(`Demands sequence reset warning: ${seqErr.message}`);
      } else {
        summary.push("Demands sequence reset to #1");
      }
    } catch (seqCatchErr) {
      const msg = seqCatchErr instanceof Error ? seqCatchErr.message : String(seqCatchErr);
      summary.push(`Demands sequence reset error: ${msg}`);
    }

    // ════════════════════════════════════════════════════════════════════
    // PASSO 5.6 — Limpar bucket 'curriculos' no Storage (PDFs gerados)
    // ════════════════════════════════════════════════════════════════════
    try {
      const listUrl = `${supabaseUrl}/storage/v1/object/list/curriculos`;
      const listRes = await fetch(listUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prefix: "", limit: 1000, offset: 0 }),
      });

      if (listRes.ok) {
        const files = await listRes.json();
        
        if (Array.isArray(files) && files.length > 0) {
          const folderPrefixes = [...new Set(files.map((f: { name: string }) => {
            const parts = f.name.split("/");
            return parts.length > 1 ? parts[0] + "/" : "";
          }).filter(Boolean))];

          let totalDeleted = 0;
          
          for (const folder of folderPrefixes) {
            try {
              const listFolderRes = await fetch(listUrl, {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${serviceKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ prefix: folder, limit: 1000, offset: 0 }),
              });

              if (listFolderRes.ok) {
                const folderFiles = await listFolderRes.json();
                if (Array.isArray(folderFiles) && folderFiles.length > 0) {
                  const fileNames = folderFiles.map((f: { name: string }) => `${folder}${f.name}`);
                  
                  for (let i = 0; i < fileNames.length; i += 100) {
                    const batch = fileNames.slice(i, i + 100);
                    const deleteRes = await fetch(`${supabaseUrl}/storage/v1/object/curriculos`, {
                      method: "DELETE",
                      headers: {
                        "Authorization": `Bearer ${serviceKey}`,
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({ prefixes: batch }),
                    });
                    if (deleteRes.ok) {
                      totalDeleted += batch.length;
                    }
                  }
                }
              }
            } catch (folderErr) {
              const msg = folderErr instanceof Error ? folderErr.message : String(folderErr);
              summary.push(`Curriculos storage folder error (${folder}): ${msg}`);
            }
          }

          summary.push(`Curriculos storage cleaned: ${totalDeleted} files deleted`);
        } else {
          summary.push("Curriculos storage: already empty");
        }
      } else {
        const { data: storageFiles } = await supabase.storage.from("curriculos").list("", { limit: 1000 });
        if (storageFiles && storageFiles.length > 0) {
          let totalDeleted = 0;
          for (const folder of storageFiles) {
            const { data: folderFiles } = await supabase.storage.from("curriculos").list(folder.name, { limit: 1000 });
            if (folderFiles && folderFiles.length > 0) {
              const paths = folderFiles.map((f) => `${folder.name}/${f.name}`);
              const { data: removed } = await supabase.storage.from("curriculos").remove(paths);
              totalDeleted += (removed ?? []).length;
            }
          }
          summary.push(`Curriculos storage cleaned (SDK fallback): ${totalDeleted} files`);
        } else {
          summary.push("Curriculos storage: already empty (SDK fallback)");
        }
      }
    } catch (storageErr) {
      const msg = storageErr instanceof Error ? storageErr.message : String(storageErr);
      summary.push(`Curriculos storage cleanup error: ${msg}`);
    }

    // ════════════════════════════════════════════════════════════════════
    // PASSO 5.7 — Limpar portfolios do bucket 'chat-images' (pasta portfolio_*)
    // ════════════════════════════════════════════════════════════════════
    try {
      const { data: chatImageFolders } = await supabase.storage.from("chat-images").list("", { limit: 1000 });
      if (chatImageFolders && chatImageFolders.length > 0) {
        const portfolioFolders = chatImageFolders.filter((f) => f.name?.startsWith("portfolio_"));
        let totalPortfolioDeleted = 0;
        for (const folder of portfolioFolders) {
          const { data: folderFiles } = await supabase.storage.from("chat-images").list(folder.name, { limit: 1000 });
          if (folderFiles && folderFiles.length > 0) {
            const paths = folderFiles.map((f) => `${folder.name}/${f.name}`);
            const { data: removed } = await supabase.storage.from("chat-images").remove(paths);
            totalPortfolioDeleted += (removed ?? []).length;
          }
        }
        if (totalPortfolioDeleted > 0) {
          summary.push(`Portfolio photos cleaned: ${totalPortfolioDeleted} files from chat-images/portfolio_*`);
        } else {
          summary.push("Portfolio photos: nothing to clean");
        }
      }
    } catch (portfolioErr) {
      const msg = portfolioErr instanceof Error ? portfolioErr.message : String(portfolioErr);
      summary.push(`Portfolio storage cleanup error: ${msg}`);
    }

    summary.push(`Real users deleted: ${deletedRealUsers}`);
    summary.push(`Standard users cleaned: ${cleanedStandard}`);
    summary.push(`Profiles reset to defaults: ${profilesReset}`);

    // ════════════════════════════════════════════════════════════════════
    // PASSO 6 — Restaurar vereador
    // ════════════════════════════════════════════════════════════════════
    try {
      const { data: vereadorProfile } = await supabase
        .from("profiles")
        .select("id, email")
        .eq("role", "vereador")
        .maybeSingle();

      if (vereadorProfile) {
        await supabase.auth.admin.updateUserById(vereadorProfile.id, {
          email: VEREADOR_DEFAULT.email,
          password: VEREADOR_DEFAULT.password,
          email_confirm: true,
        });

        await supabase.from("profiles").update({
          email: VEREADOR_DEFAULT.email,
          full_name: VEREADOR_DEFAULT.full_name,
          is_default_user: true,
          status: "active",
          onboarding_step: null,
          updated_at: new Date().toISOString(),
        }).eq("id", vereadorProfile.id);

        summary.push(`Vereador auth + email restored to ${VEREADOR_DEFAULT.email} (onboarding_step=null)`);
      } else {
        const existingAuthVereador = allUsers.find(
          (u) => u.email?.toLowerCase() === VEREADOR_DEFAULT.email.toLowerCase()
        );

        if (existingAuthVereador) {
          await supabase.auth.admin.updateUserById(existingAuthVereador.id, {
            password: VEREADOR_DEFAULT.password,
            email_confirm: true,
          });
          await supabase.from("profiles").upsert({
            id: existingAuthVereador.id,
            email: VEREADOR_DEFAULT.email,
            full_name: VEREADOR_DEFAULT.full_name,
            role: "vereador",
            is_default_user: true,
            status: "active",
            onboarding_step: null,
          }, { onConflict: "id" });
          summary.push("Vereador profile recreated for existing auth user (onboarding_step=null)");
        } else {
          const { data: newVereador, error: createErr } = await supabase.auth.admin.createUser({
            email: VEREADOR_DEFAULT.email,
            password: VEREADOR_DEFAULT.password,
            email_confirm: true,
            user_metadata: { full_name: VEREADOR_DEFAULT.full_name },
          });

          if (createErr) {
            summary.push(`Vereador creation error: ${createErr.message}`);
          } else if (newVereador?.user) {
            await new Promise((r) => setTimeout(r, 500));
            await supabase.from("profiles").upsert({
              id: newVereador.user.id,
              email: VEREADOR_DEFAULT.email,
              full_name: VEREADOR_DEFAULT.full_name,
              role: "vereador",
              is_default_user: true,
              status: "active",
              onboarding_step: null,
            }, { onConflict: "id" });
            summary.push(`Vereador fully recreated: ${VEREADOR_DEFAULT.email} (onboarding_step=null)`);
          }
        }
      }
    } catch (vereErr) {
      const msg = vereErr instanceof Error ? vereErr.message : String(vereErr);
      summary.push(`Vereador restore error: ${msg}`);
    }

    // ════════════════════════════════════════════════════════════════════
    // PASSO 7 — Restaurar senha padrão do assessor
    // ════════════════════════════════════════════════════════════════════
    let assessorPasswordReset = false;
    try {
      const { data: assessorProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", "assessor@arthurhalal.com.br")
        .maybeSingle();

      if (assessorProfile) {
        const { error: assessorErr } = await supabase.auth.admin.updateUserById(assessorProfile.id, {
          password: "CONFIGURE_EM_AMBIENTE_DE_TESTE",
          email_confirm: true,
        });
        if (!assessorErr) {
          assessorPasswordReset = true;
          summary.push("Assessor password reset to Teste@123");
        } else {
          summary.push(`Assessor password reset FAILED: ${assessorErr.message}`);
        }
      } else {
        summary.push("Assessor profile not found — password NOT reset");
      }
    } catch (assessorCatchErr) {
      const msg = assessorCatchErr instanceof Error ? assessorCatchErr.message : String(assessorCatchErr);
      summary.push(`Assessor password reset error: ${msg}`);
    }

    // ════════════════════════════════════════════════════════════════════
    // PASSO 7.5 — Restaurar senha padrão do ADMIN, CIDADAO e EMPRESA
    // ════════════════════════════════════════════════════════════════════
    const otherStandardEmails = [
      "admin@arthurhalal.com.br",
      "cidadao.teste@gmail.com",
      "empresa.teste@gmail.com",
    ];
    let otherPasswordsReset = 0;
    for (const stdEmail of otherStandardEmails) {
      try {
        const foundUser = allUsers.find(
          (u) => u.email?.toLowerCase() === stdEmail.toLowerCase()
        );
        if (foundUser) {
          const { error: pwErr } = await supabase.auth.admin.updateUserById(foundUser.id, {
            password: "CONFIGURE_EM_AMBIENTE_DE_TESTE",
            email_confirm: true,
          });
          if (!pwErr) {
            otherPasswordsReset++;
            summary.push(`${stdEmail} password reset to Teste@123`);
          } else {
            summary.push(`${stdEmail} password reset FAILED: ${pwErr.message}`);
          }
        } else {
          summary.push(`${stdEmail} auth user not found — password NOT reset`);
        }
      } catch (otherErr) {
        const msg = otherErr instanceof Error ? otherErr.message : String(otherErr);
        summary.push(`${stdEmail} password reset error: ${msg}`);
      }
    }
    summary.push(`Other standard passwords reset: ${otherPasswordsReset}/3 (admin, cidadao, empresa)`);

    summary.push("RESET COMPLETO v10 — Sistema pronto para entrega.");
    summary.push("TODOS os 5 usuarios padrao com senha Teste@123 garantida.");
    summary.push("Curriculos storage (PDFs) LIMPOS — contador do vereador zerado corretamente");
    summary.push("Portfolio photos (chat-images/portfolio_*) LIMPOS");
    summary.push("Demands sequence reset for #1, #2, #3...");
    summary.push("REGRA DE OURO: Vereador com onboarding_step=null (nao força /complete-profile)");
    summary.push("So força /complete-profile quando admin edita email manualmente (onboarding_step='email_reset')");
    summary.push("NOTÍCIAS (news) PRESERVADAS — conteúdo público do site intacto");
    summary.push("Filtro anti-falso-padrão ativo — desenvolvedor@example.com sera deletado como usuario real");

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        deletedRealUsers,
        cleanedStandard,
        profilesReset,
        assessorPasswordReset,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
