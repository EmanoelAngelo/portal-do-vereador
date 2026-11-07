import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};

interface Payload {
  status?: string;
  citizenId?: string;
  assessorId?: string;
  limit?: number;
  offset?: number;
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
    const { status = "all", citizenId, assessorId, limit = 200, offset = 0 } = payload;

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceKey) {
      console.error("[chat-listar] CRITICO: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao configurados");
      return new Response(JSON.stringify({ error: "Configuracao do servidor incompleta", chats: [] }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // IMPORTANTE: usar service key para bypasaar RLS
    // Chats anonimos tem citizen_id=NULL e assessor_id=NULL
    // A RLS policy SELECT so permite (citizen_id = auth.uid()) OR (assessor_id = auth.uid())
    // Com citizen_id=NULL, NENHUM usuario autenticado pode ler via anon/user key
    // Por isso OBRIGATORIAMENTE usamos service key aqui
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date().toISOString();

    console.log("[chat-listar] Buscando todos os chats com service key...");

    // Busca TODOS os chats com service key (bypassa RLS completamente)
    const { data: allChats, error } = await supabase
      .from("mensagens_chat")
      .select("id, citizen_id, citizen_name, assessor_id, assessor_name, status, created_at, expires_at, closed_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[chat-listar] Erro ao buscar chats:", error.message, error.code, error.details);
      return new Response(JSON.stringify({ error: "Falha ao buscar conversas", details: error.message, chats: [] }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[chat-listar] Total de chats no banco:", (allChats ?? []).length);

    // Filtra em JS — evita bug de .or() chaining no PostgREST
    const filtered = (allChats ?? []).filter((c) => {
      // 1. Nao expirado
      const notExpired = !c.expires_at || new Date(c.expires_at) >= new Date(now);
      if (!notExpired) return false;

      // 2. Status filter
      if (status !== "all" && c.status !== status) return false;

      // 3. Cidadao especifico
      if (citizenId && c.citizen_id !== citizenId) return false;

      // 4. Assessor: ve chats NAO assumidos (assessor_id IS NULL)
      //    OU assumidos por ESTE assessor
      if (assessorId) {
        if (c.assessor_id && c.assessor_id !== assessorId) return false;
      }

      return true;
    });

    console.log("[chat-listar] Chats filtrados:", filtered.length);

    // Paginacao manual
    const paginated = filtered.slice(offset, offset + limit);

    // Para cada chat, busca a ultima mensagem
    const chatIds = paginated.map((c) => c.id);
    const lastMessages: Record<number, { message: string | null; sender_name: string | null; created_at: string }> = {};

    if (chatIds.length > 0) {
      const { data: msgs, error: msgsError } = await supabase
        .from("mensagens_chat_items")
        .select("chat_id, message, sender_name, created_at")
        .in("chat_id", chatIds)
        .order("created_at", { ascending: false });

      if (msgsError) {
        console.error("[chat-listar] Erro ao buscar ultima mensagem:", msgsError.message);
      }

      if (msgs) {
        const seen = new Set<number>();
        for (const m of msgs) {
          if (!seen.has(m.chat_id)) {
            seen.add(m.chat_id);
            lastMessages[m.chat_id] = {
              message: m.message,
              sender_name: m.sender_name,
              created_at: m.created_at,
            };
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: filtered.length,
        chats: paginated.map((c) => ({
          ...c,
          last_message: lastMessages[c.id] ?? null,
        })),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    console.error("[chat-listar] Erro:", msg);
    return new Response(JSON.stringify({ error: "Erro interno no servidor", chats: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
