import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};

interface Payload {
  chatId: number;
  limit?: number;
  offset?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const payload: Payload = await req.json();
    const { chatId, limit = 200, offset = 0 } = payload;

    if (!chatId || typeof chatId !== "number") {
      return new Response(JSON.stringify({ error: "ID da conversa inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    // Busca mensagens do chat
    const { data: messages, error } = await supabase
      .from("mensagens_chat_items")
      .select("id, chat_id, sender_role, sender_id, sender_name, message, image_url, image_data, created_at")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[chat-mensagens] Erro:", error.message);
      return new Response(JSON.stringify({ error: "Falha ao buscar mensagens" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Busca info do chat
    const { data: chat } = await supabase
      .from("mensagens_chat")
      .select("id, status, citizen_id, citizen_name, assessor_id, assessor_name, created_at, expires_at, closed_at")
      .eq("id", chatId)
      .maybeSingle();

    return new Response(
      JSON.stringify({
        success: true,
        messages: messages ?? [],
        chat: chat ?? null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    console.error("[chat-mensagens] Erro:", msg);
    return new Response(JSON.stringify({ error: "Erro interno no servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
