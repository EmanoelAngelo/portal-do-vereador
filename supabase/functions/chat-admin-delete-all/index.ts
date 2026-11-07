import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    let itemCount = 0;
    let chatCount = 0;
    let notifCount = 0;
    let typingCount = 0;

    // 1. Deleta TODAS as mensagens de TODOS os chats
    const { count: ic, error: itemsErr } = await supabase
      .from("mensagens_chat_items")
      .delete({ count: "exact" })
      .neq("id", 0);
    if (!itemsErr) itemCount = ic ?? 0;

    // 2. Deleta TODOS os chats
    const { count: cc, error: chatErr } = await supabase
      .from("mensagens_chat")
      .delete({ count: "exact" })
      .neq("id", 0);
    if (!chatErr) chatCount = cc ?? 0;

    // 3. Deleta TODAS as notificacoes de chat
    const { count: nc, error: notifErr } = await supabase
      .from("notificacoes")
      .delete({ count: "exact" })
      .eq("type", "chat");
    if (!notifErr) notifCount = nc ?? 0;

    // 4. Limpa chat_typing indicators
    const { count: tc, error: typingErr } = await supabase
      .from("chat_typing")
      .delete({ count: "exact" })
      .neq("id", 0);
    if (!typingErr) typingCount = tc ?? 0;

    // 5. Limpa bucket de imagens (best-effort)
    let storageCleaned = 0;
    let storageError: string | null = null;
    try {
      const { data: files } = await supabase.storage.from("chat-images").list();
      if (files && files.length > 0) {
        const paths = files.map((f) => f.name);
        const { data: removed } = await supabase.storage.from("chat-images").remove(paths);
        storageCleaned = removed?.length ?? 0;
      }
    } catch (storageErr) {
      const msg = storageErr instanceof Error ? storageErr.message : String(storageErr);
      storageError = msg;
      console.error("[chat-admin-delete-all] Erro ao limpar storage:", storageErr);
    }

    let errors: string[] = [];
    if (itemsErr) errors.push("mensagens: " + itemsErr.message);
    if (chatErr) errors.push("chats: " + chatErr.message);
    if (notifErr) errors.push("notificacoes: " + notifErr.message);
    if (typingErr) errors.push("chat_typing: " + typingErr.message);
    if (storageError) errors.push("storage: " + storageError);

    return new Response(
      JSON.stringify({
        success: errors.length === 0,
        summary: {
          mensagensDeletadas: itemCount,
          conversasDeletadas: chatCount,
          notificacoesDeletadas: notifCount,
          chatTypingLimpas: typingCount,
          imagensStorageLimpas: storageCleaned,
        },
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    console.error("[chat-admin-delete-all] Erro:", msg);
    return new Response(JSON.stringify({ error: "Erro interno no servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
