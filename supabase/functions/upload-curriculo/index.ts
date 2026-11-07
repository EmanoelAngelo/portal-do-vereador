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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = getEnv("SUPABASE_URL");
    const serviceKey = getEnv("SERVICE_ROLE_KEY");

    console.log("[upload-curriculo] URL:", supabaseUrl ? "present" : "MISSING");
    console.log("[upload-curriculo] Key length:", serviceKey.length || 0);

    if (!supabaseUrl || !serviceKey) {
      const missing = [];
      if (!supabaseUrl) missing.push("SUPABASE_URL");
      if (!serviceKey) missing.push("SERVICE_ROLE_KEY");
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
        JSON.stringify({ success: false, error: "Content-Type deve ser multipart/form-data." }),
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

    const fileName = (file.name || "").toLowerCase();
    const fileType = file.type || "";
    const isPdf = fileName.endsWith(".pdf") || fileType === "application/pdf";

    if (!isPdf) {
      return new Response(
        JSON.stringify({ success: false, error: "Apenas PDF. Recebido: " + (fileName || fileType) }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (file.size > 15 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ success: false, error: "Arquivo excede 15MB." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const uniqueId = Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
    const storagePath = "curriculo_" + userId + "/" + uniqueId + ".pdf";

    console.log("[upload-curriculo] Uploading:", storagePath, "size:", file.size);

    const fileBuffer = await file.arrayBuffer();
    const uploadUrl = baseUrl + "/storage/v1/object/curriculos/" + storagePath;

    console.log("[upload-curriculo] Upload URL:", uploadUrl);

    const uploadRes = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + serviceKey,
        "Content-Type": "application/pdf",
        "x-upsert": "true",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
      body: new Uint8Array(fileBuffer),
    });

    if (!uploadRes.ok) {
      const errBody = await uploadRes.text().catch(() => "");
      console.error("[upload-curriculo] Storage upload FAILED:", uploadRes.status, errBody.slice(0, 300));
      return new Response(
        JSON.stringify({ success: false, error: "Falha no storage (" + uploadRes.status + "): " + errBody.slice(0, 200) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[upload-curriculo] Storage OK");

    const publicUrl = baseUrl + "/storage/v1/object/public/curriculos/" + storagePath;
    console.log("[upload-curriculo] Public URL:", publicUrl);

    // v4: NÃO atualiza curriculo_pdf automaticamente.
    // O usuário decide manualmente na página de preview se quer salvar no perfil.
    // Apenas atualizamos updated_at para registro de atividade.
    const supabaseAdmin = createClient(baseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    try {
      const { error: patchError } = await supabaseAdmin
        .from("profiles")
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (patchError) {
        console.error("[upload-curriculo] Profile activity update failed:", patchError.message);
      } else {
        console.log("[upload-curriculo] Profile activity updated (NO curriculo_pdf auto-set)");
      }
    } catch (profileErr) {
      const msg = profileErr instanceof Error ? profileErr.message : String(profileErr);
      console.error("[upload-curriculo] Profile update error:", msg);
    }

    return new Response(
      JSON.stringify({ success: true, url: publicUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[upload-curriculo] FATAL:", msg);
    return new Response(
      JSON.stringify({ success: false, error: "Erro interno: " + msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
