import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};

interface Payload {
  action: "assumir" | "fechar" | "deletar" | "update";
  chatId: number;
  assessorId?: string;
  assessorName?: string;
  fields?: Record<string, unknown>;
}

function dispatchEmail(supabaseUrl: string, serviceRoleKey: string, notifId: string): void {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  fetch(`${supabaseUrl}/functions/v1/processar-email-notificacao`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceRoleKey}` },
    body: JSON.stringify({ notifId }),
    signal: controller.signal,
  }).then((res) => {
    clearTimeout(timeout);
    if (!res.ok) console.error(`[chat-assessor-action] Email dispatch HTTP ${res.status} para notif ${notifId}`);
  }).catch((err) => {
    clearTimeout(timeout);
    console.error(`[chat-assessor-action] Email dispatch falhou para notif ${notifId}: ${err?.message || err}`);
  });
}

async function notificarViaRPC(supabase: any, userId: string, tipo: string, titulo: string, mensagem: string, remetenteNome: string | null, referenciaId: string | null, referenciaTipo: string | null): Promise<string | null> {
  try {
    const { data: notifId } = await supabase.rpc("insert_notification", {
      p_user_id: userId,
      p_tipo: tipo,
      p_titulo: titulo,
      p_mensagem: mensagem,
      p_remetente_id: null,
      p_remetente_nome: remetenteNome,
      p_referencia_id: referenciaId,
      p_referencia_tipo: referenciaTipo,
    });
    return notifId as string | null;
  } catch (err) {
    console.error(`[chat-assessor-action] Erro ao notificar user ${userId}:`, err);
    return null;
  }
}

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
    const payload: Payload = await req.json();
    const { action, chatId, assessorId, assessorName, fields } = payload;

    if (!chatId || typeof chatId !== "number") {
      return new Response(JSON.stringify({ error: "chatId invalido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date().toISOString();

    if (action === "deletar") {
      if (!assessorId) {
        return new Response(JSON.stringify({ error: "assessorId e obrigatorio" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: chat } = await supabase
        .from("mensagens_chat")
        .select("id, assessor_id, citizen_name")
        .eq("id", chatId)
        .maybeSingle();

      if (!chat) {
        return new Response(JSON.stringify({ error: "Conversa nao encontrada" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (chat.assessor_id && chat.assessor_id !== assessorId) {
        return new Response(JSON.stringify({ error: "Voce nao e o responsavel por esta conversa" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        const { data: msgsWithImages } = await supabase
          .from("mensagens_chat_items")
          .select("image_url")
          .eq("chat_id", chatId)
          .not("image_url", "is", null);

        if (msgsWithImages && msgsWithImages.length > 0) {
          const pathsToDelete: string[] = [];
          for (const m of msgsWithImages) {
            if (m.image_url && m.image_url.includes("chat-images/")) {
              const path = m.image_url.split("chat-images/")[1];
              if (path) pathsToDelete.push(path);
            }
          }
          if (pathsToDelete.length > 0) {
            await supabase.storage.from("chat-images").remove(pathsToDelete);
          }
        }
      } catch (_) {
        console.error("[chat-assessor-action] Erro ao limpar storage:", _);
      }

      const { error: itemsErr } = await supabase
        .from("mensagens_chat_items")
        .delete()
        .eq("chat_id", chatId);

      if (itemsErr) {
        console.error("[chat-assessor-action] deletar items error:", itemsErr.message);
      }

      try {
        await supabase
          .from("notificacoes")
          .delete()
          .eq("reference_type", "chat")
          .eq("reference_id", String(chatId));
      } catch (_) { /* best-effort */ }

      const { error: chatErr } = await supabase
        .from("mensagens_chat")
        .delete()
        .eq("id", chatId);

      if (chatErr) {
        console.error("[chat-assessor-action] deletar chat error:", chatErr.message);
        return new Response(JSON.stringify({ error: "Falha ao excluir conversa" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ success: true, message: "Conversa excluida permanentemente" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== ASSUMIR =====
    if (action === "assumir") {
      if (!assessorId || !assessorName) {
        return new Response(JSON.stringify({ error: "assessorId e assessorName sao obrigatorios" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: existing } = await supabase
        .from("mensagens_chat")
        .select("assessor_id, status, citizen_name")
        .eq("id", chatId)
        .maybeSingle();

      if (existing && existing.assessor_id && existing.assessor_id !== assessorId) {
        return new Response(JSON.stringify({ error: "Esta conversa ja foi assumida por outro assessor" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await supabase
        .from("mensagens_chat")
        .update({
          status: "in_progress",
          assessor_id: assessorId,
          assessor_name: assessorName,
        })
        .eq("id", chatId)
        .select()
        .maybeSingle();

      if (error) {
        console.error("[chat-assessor-action] assumir error:", error.message);
        return new Response(JSON.stringify({ error: "Falha ao assumir conversa" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const citizenLabel = existing?.citizen_name ?? "Cidadao";
      const { data: vereadoresAdmins } = await supabase
        .from("profiles")
        .select("id")
        .or("role.eq.vereador,role.eq.admin");

      const notifIds: string[] = [];

      if (vereadoresAdmins) {
        for (const v of vereadoresAdmins as any[]) {
          const nid = await notificarViaRPC(
            supabase,
            v.id,
            "chat",
            "Chat assumido",
            `${assessorName} assumiu a conversa de ${citizenLabel}.`,
            assessorName,
            String(chatId),
            "chat"
          );
          if (nid) notifIds.push(nid);
        }
        console.log(`[chat-assessor-action v6] ${vereadoresAdmins.length} notificacoes de 'assumir' enviadas`);
      }

      // 🔥 BUGFIX EMAIL: Disparar email para cada notificação
      for (const nid of notifIds) {
        dispatchEmail(supabaseUrl, serviceKey, nid);
      }

      return new Response(
        JSON.stringify({ success: true, chat: data }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== FECHAR =====
    if (action === "fechar") {
      if (!assessorId || !assessorName) {
        return new Response(JSON.stringify({ error: "assessorId e assessorName sao obrigatorios" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: chatInfo } = await supabase
        .from("mensagens_chat")
        .select("citizen_name")
        .eq("id", chatId)
        .maybeSingle();

      await supabase.from("mensagens_chat_items").insert({
        chat_id: chatId,
        sender_role: "assessor",
        sender_id: assessorId,
        sender_name: assessorName,
        message: "Seu atendimento foi encerrado. Por favor, avalie nosso atendimento respondendo com uma nota de 1 a 5 estrelas. O historico desta conversa sera apagado automaticamente em 24 horas. Obrigado por entrar em contato com o Gabinete do Vereador!",
        created_at: now,
      });

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from("mensagens_chat")
        .update({
          status: "closed",
          closed_at: now,
          expires_at: expiresAt,
        })
        .eq("id", chatId)
        .select()
        .maybeSingle();

      if (error) {
        console.error("[chat-assessor-action] fechar error:", error.message);
        return new Response(JSON.stringify({ error: "Falha ao fechar conversa" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const citizenLabel = chatInfo?.citizen_name ?? "Cidadao";
      const { data: vereadoresAdmins } = await supabase
        .from("profiles")
        .select("id")
        .or("role.eq.vereador,role.eq.admin");

      const notifIds: string[] = [];

      if (vereadoresAdmins) {
        for (const v of vereadoresAdmins as any[]) {
          const nid = await notificarViaRPC(
            supabase,
            v.id,
            "chat",
            "Chat encerrado",
            `${assessorName} encerrou a conversa com ${citizenLabel}.`,
            assessorName,
            String(chatId),
            "chat"
          );
          if (nid) notifIds.push(nid);
        }
        console.log(`[chat-assessor-action v6] ${vereadoresAdmins.length} notificacoes de 'fechar' enviadas`);
      }

      // 🔥 BUGFIX EMAIL: Disparar email para cada notificação
      for (const nid of notifIds) {
        dispatchEmail(supabaseUrl, serviceKey, nid);
      }

      return new Response(
        JSON.stringify({ success: true, chat: data }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== UPDATE =====
    if (action === "update" && fields) {
      const { data, error } = await supabase
        .from("mensagens_chat")
        .update(fields)
        .eq("id", chatId)
        .select()
        .maybeSingle();

      if (error) {
        return new Response(JSON.stringify({ error: "Falha ao atualizar conversa" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ success: true, chat: data }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Acao invalida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    console.error("[chat-assessor-action v6] Erro:", msg);
    return new Response(JSON.stringify({ error: "Erro interno no servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
