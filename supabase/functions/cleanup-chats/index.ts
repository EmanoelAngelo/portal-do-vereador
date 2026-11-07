import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("VITE_PUBLIC_SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: expired, error: findErr } = await supabase
      .from("mensagens_chat")
      .select("id")
      .eq("status", "closed")
      .lt("expires_at", new Date().toISOString());

    if (findErr) {
      console.error("Error finding expired chats:", findErr);
      return new Response(JSON.stringify({ error: "Failed to find expired chats" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!expired || expired.length === 0) {
      return new Response(JSON.stringify({ deleted: 0, message: "No expired chats found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ids = expired.map((c: { id: number }) => c.id);

    const { error: msgErr } = await supabase
      .from("mensagens_chat_items")
      .delete()
      .in("chat_id", ids);

    if (msgErr) {
      console.error("Error deleting messages:", msgErr);
    }

    const { error: chatErr } = await supabase
      .from("mensagens_chat")
      .delete()
      .in("id", ids);

    if (chatErr) {
      console.error("Error deleting chats:", chatErr);
      return new Response(JSON.stringify({ error: "Failed to delete chats", detail: chatErr }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      deleted: ids.length,
      ids: ids,
      message: `Successfully deleted ${ids.length} expired chat(s)`,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});