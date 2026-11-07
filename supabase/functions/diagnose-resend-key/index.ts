import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const rawKey = Deno.env.get("RESEND_API_KEY");
    const hasSecret = rawKey !== undefined && rawKey !== null && rawKey !== "";

    if (!hasSecret) {
      return new Response(JSON.stringify({ status: "error", report: ["RESEND_API_KEY: NOT FOUND"] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleaned = rawKey.trim().replace(/^["']|["']$/g, "");
    const isValidFormat = cleaned.startsWith("re_");
    const length = cleaned.length;
    const prefix = cleaned.substring(0, 6) + "..." + cleaned.substring(cleaned.length - 4);

    const report: string[] = [
      `RESEND_API_KEY: PRESENT (len=${length}, format=${isValidFormat ? "VALID" : "INVALID"}, prefix=${prefix})`,
    ];

    if (isValidFormat) {
      report.push("Resend API key format: VALID (starts with re_)");
    } else {
      report.push("Resend API key format: INVALID (must start with re_)");
    }

    return new Response(JSON.stringify({ status: isValidFormat ? "ok" : "error", report }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ status: "error", report: ["ERROR: " + String(err)] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
