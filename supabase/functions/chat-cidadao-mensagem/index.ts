import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};

interface MensagemPayload {
  chatId: number;
  nome: string;
  mensagem: string;
  image_url?: string;
  image_data?: string;
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
    if (!res.ok) console.error(`[chat-cidadao-mensagem] Email dispatch HTTP ${res.status} para notif ${notifId}`);
  }).catch((err) => {
    clearTimeout(timeout);
    console.error(`[chat-cidadao-mensagem] Email dispatch falhou para notif ${notifId}: ${err?.message || err}`);
  });
}

async function criarNotificacao(
  supabase: any,
  userId: string,
  tipo: string,
  titulo: string,
  mensagem: string,
  remetenteNome: string | null,
  referenciaId: string | null,
  referenciaTipo: string | null
): Promise<string | null> {
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
    console.error(`[chat-cidadao-mensagem] Erro ao notificar user ${userId}:`, err);
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
    const payload: MensagemPayload = await req.json();
    const { chatId, nome, mensagem, image_url, image_data } = payload;

    if (!chatId || typeof chatId !== "number") {
      return new Response(JSON.stringify({ error: "ID da conversa invalido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!nome || nome.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Nome e obrigatorio" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hasText = mensagem && mensagem.trim().length > 0;
    const hasImage = (image_url && image_url.trim().length > 0) || (image_data && image_data.trim().length > 0);

    if (!hasText && !hasImage) {
      return new Response(JSON.stringify({ error: "Mensagem ou imagem e obrigatoria" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    const cleanNome = nome.trim().substring(0, 100);
    const cleanMensagem = hasText ? mensagem.trim().substring(0, 500) : "";
    const cleanImageUrl = image_url ? image_url.trim().substring(0, 2000) : null;
    const cleanImageData = image_data ? image_data.trim().substring(0, 500000) : null;
    const now = new Date().toISOString();

    const { data: chat } = await supabase
      .from("mensagens_chat")
      .select("id, status, assessor_id, citizen_id, citizen_name")
      .eq("id", chatId)
      .maybeSingle();

    if (!chat) {
      return new Response(JSON.stringify({ error: "Conversa nao encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (chat.status === "closed") {
      return new Response(JSON.stringify({ error: "Conversa ja foi encerrada" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const insertData: Record<string, unknown> = {
      chat_id: chatId,
      sender_role: "citizen",
      sender_name: cleanNome,
      message: cleanMensagem,
      created_at: now,
    };
    if (cleanImageUrl) insertData.image_url = cleanImageUrl;
    if (cleanImageData) insertData.image_data = cleanImageData;

    const { data: msg, error: msgError } = await supabase
      .from("mensagens_chat_items")
      .insert(insertData)
      .select()
      .maybeSingle();

    if (msgError) {
      console.error("[chat-cidadao-mensagem v4] Erro:", msgError.message);
      return new Response(JSON.stringify({ error: "Falha ao enviar mensagem" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const preview = cleanMensagem
      ? `"${cleanMensagem.substring(0, 60)}${cleanMensagem.length > 60 ? "..." : ""}"`
      : "[Imagem]";

    const notifTargets: string[] = [];
    const notifIds: string[] = [];

    if (chat.assessor_id) {
      notifTargets.push(chat.assessor_id);
    } else {
      const { data: assessores } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "assessor");
      if (assessores) {
        assessores.forEach((a: any) => notifTargets.push(a.id));
      }
    }

    const { data: vereadoresAdmins } = await supabase
      .from("profiles")
      .select("id")
      .or("role.eq.vereador,role.eq.admin");
    if (vereadoresAdmins) {
      vereadoresAdmins.forEach((v: any) => {
        if (!notifTargets.includes(v.id)) notifTargets.push(v.id);
      });
    }

    for (const uid of notifTargets) {
      const nid = await criarNotificacao(
        supabase,
        uid,
        "chat",
        "Nova mensagem de cidadao",
        `${cleanNome} enviou: ${preview}`,
        cleanNome,
        String(chatId),
        "chat"
      );
      if (nid) notifIds.push(nid);
    }

    // 🔥 BUGFIX EMAIL: Disparar email para cada notificação criada
    for (const nid of notifIds) {
      dispatchEmail(supabaseUrl, serviceKey, nid);
    }

    console.log(`[chat-cidadao-mensagem v4] ${notifTargets.length} notificacoes, ${notifIds.length} emails disparados`);

    return new Response(
      JSON.stringify({
        success: true,
        messageId: msg?.id,
        message: "Mensagem enviada com sucesso",
        msg: msg ?? null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    console.error("[chat-cidadao-mensagem v4] Erro:", msg);
    return new Response(JSON.stringify({ error: "Erro interno no servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
