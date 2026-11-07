import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};

interface AnonimoPayload {
  nome: string;
  email: string;
  telefone?: string;
  mensagem: string;
  whatsapp?: string;
  contactEmail?: string;
  isContactOnly?: boolean;
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
    if (!res.ok) console.error(`[chat-cidadao-anonimo] Email dispatch HTTP ${res.status} para notif ${notifId}`);
  }).catch((err) => {
    clearTimeout(timeout);
    console.error(`[chat-cidadao-anonimo] Email dispatch falhou para notif ${notifId}: ${err?.message || err}`);
  });
}

async function criarNotificacaoRPC(
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
    const { data: notifId, error } = await supabase.rpc("insert_notification", {
      p_user_id: userId,
      p_tipo: tipo,
      p_titulo: titulo,
      p_mensagem: mensagem,
      p_remetente_id: null,
      p_remetente_nome: remetenteNome,
      p_referencia_id: referenciaId,
      p_referencia_tipo: referenciaTipo,
    });
    if (error) {
      console.error(`[chat-cidadao-anonimo] Erro RPC ao notificar user ${userId}:`, error.message);
    }
    return notifId as string | null;
  } catch (err) {
    console.error(`[chat-cidadao-anonimo] Excecao RPC ao notificar ${userId}:`, err);
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
    const payload: AnonimoPayload = await req.json();
    const { nome, email, mensagem, telefone, whatsapp, contactEmail, isContactOnly } = payload;

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceKey) {
      console.error("[chat-cidadao-anonimo] CRITICO: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao configurados");
      return new Response(JSON.stringify({ error: "Configuracao do servidor incompleta" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // --- MODO CONTATO FORA DO HORARIO ---
    if (isContactOnly) {
      const cleanNome = (nome || "Anônimo").trim().substring(0, 100);
      const cleanWhatsapp = (whatsapp || "").trim().substring(0, 50);
      const cleanContactEmail = (contactEmail || "").trim().substring(0, 100);
      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      if (!cleanWhatsapp && !cleanContactEmail) {
        return new Response(JSON.stringify({ error: "Informe WhatsApp ou e-mail" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const ciudadaoLabel = `${cleanNome} (fora do horário)`;
      const { data: chat, error: chatError } = await supabase
        .from("mensagens_chat")
        .insert({
          citizen_name: ciudadaoLabel,
          status: "open",
          created_at: now,
          expires_at: expiresAt,
        })
        .select()
        .maybeSingle();

      if (chatError || !chat) {
        console.error("[chat-cidadao-anonimo] Erro ao criar chat de contato:", chatError?.message);
        return new Response(JSON.stringify({ error: "Falha ao registrar contato" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const contactParts: string[] = ["[CONTATO FORA DO HORÁRIO]"];
      if (cleanWhatsapp) contactParts.push(`WhatsApp: ${cleanWhatsapp}`);
      if (cleanContactEmail) contactParts.push(`E-mail: ${cleanContactEmail}`);
      const contactMsg = contactParts.join(" | ");

      const { error: msgError } = await supabase
        .from("mensagens_chat_items")
        .insert({
          chat_id: chat.id,
          sender_role: "citizen",
          sender_name: cleanNome,
          message: contactMsg,
          created_at: now,
        });

      if (msgError) {
        console.error("[chat-cidadao-anonimo] Erro ao inserir mensagem de contato:", msgError.message);
      }

      const { data: relevantes } = await supabase
        .from("profiles")
        .select("id")
        .in("role", ["assessor", "vereador", "admin"]);

      const notifIds: string[] = [];

      if (relevantes && relevantes.length > 0) {
        const notifMsg = `${cleanNome} deixou contato fora do horário: ${contactMsg.substring(0, 80)}`;
        for (const u of (relevantes as any[])) {
          const nid = await criarNotificacaoRPC(supabase, u.id, "chat", "Contato fora do horário", notifMsg, cleanNome, String(chat.id), "chat");
          if (nid) notifIds.push(nid);
        }
      }

      // 🔥 BUGFIX EMAIL
      for (const nid of notifIds) {
        dispatchEmail(supabaseUrl, serviceKey, nid);
      }

      return new Response(
        JSON.stringify({ success: true, chatId: chat.id, message: "Contato registrado com sucesso" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- MODO NORMAL: inicio de conversa ---
    if (!nome || (nome as string).trim().length < 2) {
      return new Response(JSON.stringify({ error: "Nome e obrigatorio" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!email || !(email as string).includes("@")) {
      return new Response(JSON.stringify({ error: "Email valido e obrigatorio" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!mensagem || (mensagem as string).trim().length === 0) {
      return new Response(JSON.stringify({ error: "Mensagem e obrigatoria" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanNome = (nome as string).trim().substring(0, 100);
    const cleanEmail = (email as string).trim().substring(0, 100);
    const cleanMensagem = (mensagem as string).trim().substring(0, 500);
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const citizenLabel = `${cleanNome} (${cleanEmail})`;
    const { data: chat, error: chatError } = await supabase
      .from("mensagens_chat")
      .insert({
        citizen_name: citizenLabel,
        status: "open",
        created_at: now,
        expires_at: expiresAt,
      })
      .select()
      .maybeSingle();

    if (chatError || !chat) {
      console.error("[chat-cidadao-anonimo] Erro ao criar chat:", chatError?.message);
      return new Response(JSON.stringify({ error: "Falha ao criar conversa" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let insertedMsg = null;
    const { data: msg, error: msgError } = await supabase
      .from("mensagens_chat_items")
      .insert({
        chat_id: chat.id,
        sender_role: "citizen",
        sender_name: cleanNome,
        message: cleanMensagem,
        created_at: now,
      })
      .select()
      .maybeSingle();

    if (msgError) {
      console.error("[chat-cidadao-anonimo] ERRO ao inserir mensagem:", JSON.stringify(msgError));
    }

    if (msg) {
      insertedMsg = msg;
    } else {
      const { data: fallbackMsg } = await supabase
        .from("mensagens_chat_items")
        .select("id, chat_id, sender_role, sender_id, sender_name, message, image_url, image_data, created_at")
        .eq("chat_id", chat.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (fallbackMsg) {
        insertedMsg = fallbackMsg;
      } else {
        const { data: retryMsg } = await supabase
          .from("mensagens_chat_items")
          .insert({
            chat_id: chat.id,
            sender_role: "citizen",
            sender_name: cleanNome,
            message: cleanMensagem,
            created_at: new Date().toISOString(),
          })
          .select()
          .maybeSingle();

        if (retryMsg) insertedMsg = retryMsg;
      }
    }

    const { data: relevantes } = await supabase
      .from("profiles")
      .select("id")
      .in("role", ["assessor", "vereador", "admin"]);

    const notifIds: string[] = [];

    if (relevantes && relevantes.length > 0) {
      const notifTitulo = "Novo chat de cidadão";
      const notifMsgBody = `${cleanNome} iniciou uma conversa: "${cleanMensagem.substring(0, 60)}${cleanMensagem.length > 60 ? "..." : ""}"`;
      
      for (const u of (relevantes as any[])) {
        const nid = await criarNotificacaoRPC(supabase, u.id, "chat", notifTitulo, notifMsgBody, cleanNome, String(chat.id), "chat");
        if (nid) notifIds.push(nid);
      }
      console.log(`[chat-cidadao-anonimo v7] ${relevantes.length} notificacoes RPC enviadas`);
    }

    // 🔥 BUGFIX EMAIL: Disparar email para cada notificação
    for (const nid of notifIds) {
      dispatchEmail(supabaseUrl, serviceKey, nid);
    }

    return new Response(
      JSON.stringify({
        success: true,
        chatId: chat.id,
        message: "Conversa iniciada com sucesso",
        firstMessage: insertedMsg ?? null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    console.error("[chat-cidadao-anonimo v7] Erro:", msg);
    return new Response(JSON.stringify({ error: "Erro interno no servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
