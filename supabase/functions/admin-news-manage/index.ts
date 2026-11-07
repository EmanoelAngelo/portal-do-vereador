import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
  "Access-Control-Max-Age": "86400",
};

function ok(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function err(body: unknown, status = 500) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, payload } = body;

    if (!action) {
      return err({ success: false, error: "missing action" }, 400);
    }

    // LOAD ALL NEWS (bypass RLS, fresh data, no caching)
    if (action === "load-news") {
      const { data, error: fetchErr } = await supabase
        .from("news")
        .select("*")
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("importance", { ascending: false })
        .order("published_at", { ascending: false });

      if (fetchErr) {
        return err({ success: false, error: fetchErr.message });
      }

      return ok({ success: true, news: data ?? [] });
    }

    // INIT SORT ORDERS
    if (action === "init-sort-orders") {
      const { data: allNews, error: fetchErr } = await supabase
        .from("news")
        .select("id")
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("importance", { ascending: false })
        .order("published_at", { ascending: false });

      if (fetchErr || !allNews) {
        return err({ success: false, error: fetchErr?.message ?? "fetch failed" });
      }

      const updates = allNews.map((n: { id: number }, i: number) =>
        supabase.from("news").update({ sort_order: i }).eq("id", n.id)
      );

      const results = await Promise.allSettled(updates);
      const failures = results.filter((r) => r.status === "rejected");

      return ok({
        success: true,
        total: allNews.length,
        failures: failures.length,
      });
    }

    // SWAP SORT ORDERS
    if (action === "swap-sort-orders") {
      const { id1, order1, id2, order2 } = payload || {};
      if (!id1 || !id2) {
        return err({ success: false, error: "missing id1/id2" }, 400);
      }

      const [r1, r2] = await Promise.all([
        supabase.from("news").update({ sort_order: order1 }).eq("id", id1),
        supabase.from("news").update({ sort_order: order2 }).eq("id", id2),
      ]);

      if (r1.error || r2.error) {
        return err({
          success: false,
          error: r1.error?.message || r2.error?.message || "swap failed",
        });
      }

      return ok({ success: true });
    }

    // UPDATE NEWS
    if (action === "update-news") {
      const { id, data: rowData } = payload || {};
      if (!id || !rowData) {
        return err({ success: false, error: "missing id/data" }, 400);
      }

      const { error } = await supabase.from("news").update(rowData).eq("id", id);
      if (error) {
        return err({ success: false, error: error.message });
      }

      return ok({ success: true });
    }

    // INSERT NEWS
    if (action === "insert-news") {
      const { data: rowData } = payload || {};
      if (!rowData) {
        return err({ success: false, error: "missing data" }, 400);
      }

      const { data: inserted, error } = await supabase.from("news").insert(rowData).select("id").single();
      if (error) {
        return err({ success: false, error: error.message });
      }

      return ok({ success: true, id: inserted?.id });
    }

    // DELETE NEWS
    if (action === "delete-news") {
      const { id } = payload || {};
      if (!id) {
        return err({ success: false, error: "missing id" }, 400);
      }

      const { error } = await supabase.from("news").delete().eq("id", id);
      if (error) {
        return err({ success: false, error: error.message });
      }

      return ok({ success: true });
    }

    // TOGGLE FIELD
    if (action === "toggle-field") {
      const { id, field, value } = payload || {};
      if (!id || !field) {
        return err({ success: false, error: "missing id/field" }, 400);
      }

      const { error } = await supabase.from("news").update({
        [field]: value,
        updated_at: new Date().toISOString(),
      }).eq("id", id);

      if (error) {
        return err({ success: false, error: error.message });
      }

      return ok({ success: true });
    }

    return err({ success: false, error: "unknown action" }, 400);
  } catch (err) {
    return err({ success: false, error: String(err) });
  }
});