
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Insere notificacao via RPC */
async function criarNotificacao(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  tipo: string,
  titulo: string,
  mensagem: string,
  remetenteNome?: string | null,
  referenciaId?: string | null,
  referenciaTipo?: string | null
) {
  try {
    const { error } = await supabaseAdmin.rpc("insert_notification", {
      p_user_id: userId,
      p_tipo: tipo,
      p_titulo: titulo,
      p_mensagem: mensagem,
      p_remetente_id: null,
      p_remetente_nome: remetenteNome ?? "Sistema",
      p_referencia_id: referenciaId ?? null,
      p_referencia_tipo: referenciaTipo ?? null,
    });
    if (error) {
      console.error("[delete-user] insert_notification error for", userId, ":", error);
    }
  } catch (err) {
    console.error("[delete-user] criarNotificacao exception:", err);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ success: false, error: "user_id e obrigatorio" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1 - Get profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, role, company_name")
      .eq("id", user_id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ success: false, error: "Perfil nao encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userName = profile.full_name ?? profile.company_name ?? "Usuario";
    const userRole = profile.role;

    // ============================================
    // COLETAR AFETADOS PARA NOTIFICACAO (ANTES de deletar)
    // ============================================
    interface Afetado {
      id: string;
      motivo: string;
    }
    const afetadosMap = new Map<string, Afetado>();

    if (userRole === "assessor" || userRole === "vereador" || userRole === "admin") {
      const { data: demandasAfetadas } = await supabaseAdmin
        .from("demands")
        .select("id, citizen_id, title")
        .eq("assessor_id", user_id);

      if (demandasAfetadas) {
        for (const d of demandasAfetadas) {
          if (d.citizen_id && !afetadosMap.has(d.citizen_id)) {
            afetadosMap.set(d.citizen_id, { id: d.citizen_id, motivo: `demanda "${d.title ?? "sem titulo"}"` });
          }
        }
      }

      const { data: chatsAfetados } = await supabaseAdmin
        .from("mensagens_chat")
        .select("id, citizen_id")
        .eq("assessor_id", user_id);

      if (chatsAfetados) {
        for (const c of chatsAfetados) {
          if (c.citizen_id && !afetadosMap.has(c.citizen_id)) {
            afetadosMap.set(c.citizen_id, { id: c.citizen_id, motivo: "chat ativo" });
          }
        }
      }
    }

    if (userRole === "empresa") {
      const { data: vagasEmpresa } = await supabaseAdmin
        .from("vagas")
        .select("id, title")
        .eq("company_id", user_id);

      if (vagasEmpresa && vagasEmpresa.length > 0) {
        const vagaIds = vagasEmpresa.map((v: { id: number }) => v.id);
        const { data: candsAfetadas } = await supabaseAdmin
          .from("candidaturas")
          .select("cidadao_id, vaga_id")
          .in("vaga_id", vagaIds);

        if (candsAfetadas) {
          for (const candidatura of candsAfetadas) {
            if (candidatura.cidadao_id && !afetadosMap.has(candidatura.cidadao_id)) {
              const vaga = vagasEmpresa.find((v: { id: number }) => v.id === candidatura.vaga_id);
              afetadosMap.set(candidatura.cidadao_id, {
                id: candidatura.cidadao_id,
                motivo: `candidatura na vaga "${vaga?.title ?? "sem titulo"}"`,
              });
            }
          }
        }
      }
    }

    // N6: Coletar IDs dos vereadores para notificar
    let vereadorIds: string[] = [];
    const { data: vereadores } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("role", "vereador");
    if (vereadores) {
      vereadorIds = vereadores.map((v: { id: string }) => v.id);
    }

    // ============================================
    // DELETAR DADOS
    // ============================================
    let email: string | null = null;
    try {
      const { data: authData } = await supabaseAdmin.auth.admin.getUserById(user_id);
      email = authData?.user?.email ?? null;
    } catch { /* ignore */ }

    await supabaseAdmin.from("candidaturas").delete().eq("cidadao_id", user_id);

    if (userRole === "empresa") {
      const { data: vagasList } = await supabaseAdmin.from("vagas").select("id").eq("company_id", user_id);
      if (vagasList && vagasList.length > 0) {
        const vagaIds = vagasList.map((v: { id: number }) => v.id);
        await supabaseAdmin.from("candidaturas").delete().in("vaga_id", vagaIds);
      }
      await supabaseAdmin.from("vagas").delete().eq("company_id", user_id);
    }

    const { data: citizenDemands } = await supabaseAdmin.from("demands").select("id").eq("citizen_id", user_id);
    if (citizenDemands && citizenDemands.length > 0) {
      const demandIds = citizenDemands.map((d: { id: number }) => d.id);
      await supabaseAdmin.from("demand_messages").delete().in("demand_id", demandIds);
      await supabaseAdmin.from("demands").delete().in("id", demandIds);
    }

    await supabaseAdmin.from("demands")
      .update({ assessor_id: null, assessor_name: null })
      .eq("assessor_id", user_id);

    const { data: userChats } = await supabaseAdmin
      .from("mensagens_chat")
      .select("id")
      .or(`citizen_id.eq.${user_id},assessor_id.eq.${user_id}`);

    if (userChats && userChats.length > 0) {
      const chatIds = userChats.map((c: { id: number }) => c.id);
      await supabaseAdmin.from("mensagens_chat_items").delete().in("chat_id", chatIds);
      await supabaseAdmin.from("mensagens_chat").delete().in("id", chatIds);
    }

    if (email) {
      await supabaseAdmin.from("verification_codes").delete().eq("email", email);
    }

    await supabaseAdmin.from("profiles").delete().eq("id", user_id);

    // 🔴 HARD DELETE no Auth — should_soft_delete: false garante remocao total
    // Assim o usuario pode se cadastrar novamente com o mesmo email
    try {
      const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(user_id, false);
      if (deleteErr) {
        console.error("[delete-user] Hard delete error:", deleteErr.message);
      } else {
        console.log("[delete-user] Auth user hard-deleted:", user_id);
      }
    } catch (delErr) {
      console.error("[delete-user] Hard delete exception:", delErr);
    }

    // ============================================
    // NOTIFICAR AFETADOS
    // ============================================
    const roleLabel: Record<string, string> = {
      assessor: "Assessor", vereador: "Vereador", admin: "Administrador",
      empresa: "Empresa", citizen: "Cidadao",
    };
    const tipoLabel = roleLabel[userRole] ?? userRole;

    let notificados = 0;
    for (const [uid, afetado] of afetadosMap) {
      await criarNotificacao(
        supabaseAdmin, uid, "usuario_excluido",
        `${tipoLabel} removido do sistema`,
        `O ${tipoLabel.toLowerCase()} "${userName}" foi removido do sistema. Sua ${afetado.motivo} foi afetada. Um novo responsavel sera designado em breve.`,
        "Sistema Arthur Halal", user_id, "perfil"
      );
      notificados++;
    }

    for (const vid of vereadorIds) {
      if (vid !== user_id) {
        await criarNotificacao(
          supabaseAdmin, vid, "usuario_excluido",
          `${tipoLabel} removido do sistema`,
          `O ${tipoLabel.toLowerCase()} "${userName}" foi removido do sistema pelo administrador.`,
          "Sistema Arthur Halal", user_id, "perfil"
        );
      }
    }

    console.log(`[delete-user] Notified ${notificados} citizens + ${vereadorIds.length} vereadores`);

    return new Response(JSON.stringify({
      success: true,
      deleted_user: userName,
      deleted_role: userRole,
      affected_citizens_notified: notificados,
      vereadores_notificados: vereadorIds.length,
      message: `Usuario "${userName}" (${tipoLabel}) foi completamente removido.`,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
