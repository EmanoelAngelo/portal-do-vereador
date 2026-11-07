
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = (Deno.env.get("SUPABASE_URL") ?? "").trim().replace(/\/$/, "");
    const serviceKey = (Deno.env.get("SERVICE_ROLE_KEY") ?? "").trim();

    if (!supabaseUrl || !serviceKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing SUPABASE_URL or SERVICE_ROLE_KEY" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const buckets = ["chat-images", "curriculos"];
    const results: { bucket: string; status: string; error?: string }[] = [];

    for (const bucketName of buckets) {
      try {
        // Criar bucket
        const createRes = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: bucketName,
            name: bucketName,
            public: true,
            file_size_limit: 52428800, // 50MB
            allowed_mime_types: bucketName === "chat-images"
              ? ["image/jpeg", "image/png", "image/webp", "image/gif"]
              : ["application/pdf"],
          }),
        });

        if (createRes.ok || createRes.status === 409) {
          // Bucket criado ou já existe — configurar políticas

          // Política: leitura pública
          await fetch(`${supabaseUrl}/storage/v1/bucket/${bucketName}/policy`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${serviceKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: `${bucketName}-public-read`,
              definition: { read: true, write: false },
              allowed_operations: ["select"],
            }),
          }).catch(() => {});

          // Política: upload autenticado
          await fetch(`${supabaseUrl}/storage/v1/bucket/${bucketName}/policy`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${serviceKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: `${bucketName}-auth-upload`,
              definition: { roles: ["authenticated"], read: false, write: true, delete: true },
              allowed_operations: ["insert", "update", "delete"],
            }),
          }).catch(() => {});

          results.push({ bucket: bucketName, status: "ok" });
        } else {
          const errText = await createRes.text().catch(() => "");
          results.push({ bucket: bucketName, status: "error", error: errText.slice(0, 200) });
        }
      } catch (e) {
        results.push({ bucket: bucketName, status: "error", error: (e as Error).message });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
