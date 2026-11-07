import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function getEnv(key: string): string {
  return (Deno.env.get(key) ?? "").trim();
}

function getServiceRoleKey(): string {
  // Fallback multi-nome — Supabase pode nomear SERVICE_ROLE_KEY ou SUPABASE_SERVICE_ROLE_KEY
  return getEnv("SERVICE_ROLE_KEY") || getEnv("SUPABASE_SERVICE_ROLE_KEY");
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = getEnv("SUPABASE_URL");
    const serviceKey = getServiceRoleKey();

    console.log("[upload-profile-photo] URL:", supabaseUrl ? "present" : "MISSING");
    console.log("[upload-profile-photo] Key length:", serviceKey.length || 0);

    if (!supabaseUrl || !serviceKey) {
      const missing = [];
      if (!supabaseUrl) missing.push("SUPABASE_URL");
      if (!serviceKey) missing.push("SERVICE_ROLE_KEY / SUPABASE_SERVICE_ROLE_KEY");
      return new Response(
        JSON.stringify({ success: false, error: `Variaveis faltando: ${missing.join(", ")}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let baseUrl = supabaseUrl;
    if (!baseUrl.startsWith("http")) {
      baseUrl = `https://${baseUrl.replace(/^@/, "").trim()}.supabase.co`;
    }
    baseUrl = baseUrl.replace(/\/$/, "");

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return new Response(
        JSON.stringify({ success: false, error: "Content-Type deve ser multipart/form-data.", received: contentType }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const userId = (formData.get("userId") as string)?.trim() || "";

    if (!file || !(file instanceof File)) {
      return new Response(
        JSON.stringify({ success: false, error: "Arquivo invalido ou ausente." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: "userId e obrigatorio." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return new Response(
        JSON.stringify({ success: false, error: `Tipo nao suportado: ${file.type}. Use JPG, PNG ou WEBP.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ success: false, error: "Arquivo muito grande. Maximo 5MB." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const uniqueId = Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
    const storagePath = `profile_${userId}/${uniqueId}.${ext}`;

    console.log("[upload-profile-photo] Uploading:", storagePath, "type:", file.type, "size:", file.size);

    // Usando Supabase Storage SDK — mais confiável que fetch direto
    const supabase = createClient(baseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const fileBuffer = await file.arrayBuffer();

    const { error: uploadErr } = await supabase.storage
      .from("chat-images")
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        cacheControl: "public, max-age=31536000, immutable",
        upsert: true,
      });

    if (uploadErr) {
      console.error("[upload-profile-photo] Storage upload FAILED:", uploadErr.message);
      return new Response(
        JSON.stringify({ success: false, error: `Falha no storage: ${uploadErr.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[upload-profile-photo] Storage OK:", storagePath);

    const { data: publicUrlData } = supabase.storage
      .from("chat-images")
      .getPublicUrl(storagePath);

    const publicUrl = publicUrlData?.publicUrl || "";

    // Atualizar perfil com a nova URL
    try {
      const { error: patchError } = await supabase
        .from("profiles")
        .update({
          avatar_url: publicUrl,
          profile_photo: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (patchError) {
        console.error("[upload-profile-photo] Profile update failed:", patchError.message);
      } else {
        console.log("[upload-profile-photo] Profile updated OK");
      }
    } catch (profileErr) {
      const msg = profileErr instanceof Error ? profileErr.message : String(profileErr);
      console.error("[upload-profile-photo] Profile update error:", msg);
    }

    console.log("[upload-profile-photo] SUCCESS:", publicUrl);

    return new Response(
      JSON.stringify({ success: true, url: publicUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[upload-profile-photo] FATAL:", msg);
    return new Response(
      JSON.stringify({ success: false, error: `Erro interno: ${msg}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
