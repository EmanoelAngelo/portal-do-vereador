import { createClient } from "@supabase/supabase-js";

export const supabaseUrl = (import.meta.env.VITE_PUBLIC_SUPABASE_URL as string || "").replace(/\/$/, "");
export const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("[Supabase] Missing env variables.");
}

type SupabaseClient = ReturnType<typeof createClient>;
let _supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return _supabase;
}

export const supabase = getSupabaseClient();

// ── Manual Token Refresh — evita o erro "unhandled rejection" ──
// O autoRefreshToken foi desabilitado. Em vez disso, fazemos o refresh
// manualmente de 5 em 5 minutos. Se o refresh falhar (token expirado),
// limpamos o storage e redirecionamos para login.
// ─────────────────────────────────────────────────────────────
if (typeof window !== "undefined") {
  const MANUAL_REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos
  let refreshTimer: ReturnType<typeof setInterval> | null = null;

  function startManualRefresh() {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(async () => {
      const { data } = await getSupabaseClient().auth.getSession();
      if (!data.session) return;
      try {
        const { error } = await getSupabaseClient().auth.refreshSession();
        if (error) {
          console.warn("[Supabase] Manual refresh falhou — sessão expirada:", error.message);
          cleanupAndRedirect();
        }
      } catch (err: unknown) {
        console.warn("[Supabase] Exceção no refresh manual:", err);
        cleanupAndRedirect();
      }
    }, MANUAL_REFRESH_INTERVAL_MS);
  }

  function cleanupAndRedirect() {
    // Limpa todo o storage do Supabase
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("sb-") || key.includes("supabase"))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));

    const sessionKeysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.startsWith("sb-") || key.includes("supabase") || key === "ah_session")) {
        sessionKeysToRemove.push(key);
      }
    }
    sessionKeysToRemove.forEach((k) => sessionStorage.removeItem(k));

    getSupabaseClient().auth.signOut().catch(() => {});

    const currentPath = window.location.pathname;
    const basePath = (window as any).__BASE_PATH__ || "";
    const cleanPath = basePath ? currentPath.replace(new RegExp("^" + basePath), "") : currentPath;
    const authRequiredPaths = ["/cidadao", "/empresa", "/vereador", "/admin", "/assessor", "/sistema/painel", "/sistema/perfil", "/complete-profile"];
    const isAuthPage = authRequiredPaths.some((p) => cleanPath.startsWith(p));

    if (isAuthPage) {
      setTimeout(() => {
        window.location.href = basePath ? `/${basePath}/auth` : "/auth";
      }, 100);
    }
  }

  // Inicia o refresh manual quando a sessão estiver ativa
  getSupabaseClient().auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" && session) {
      startManualRefresh();
    }
    if (event === "SIGNED_OUT" || event === "USER_DELETED") {
      if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
      }
    }
  });

  // Se já tiver sessão ao carregar a página, inicia o timer
  getSupabaseClient().auth.getSession().then(({ data }) => {
    if (data.session) startManualRefresh();
  });

  // Handler de segurança — captura erros que possam escapar (fallback)
  window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
    const reason = event?.reason;
    if (!reason) return;
    const isSupabaseAuthError =
      reason instanceof Error &&
      (reason.message?.includes("Invalid Refresh Token") ||
       reason.message?.includes("Refresh Token Not Found") ||
       reason.message?.includes("Auth session missing") ||
       reason.name === "AuthSessionMissingError");
    if (!isSupabaseAuthError) return;
    event.preventDefault();
    cleanupAndRedirect();
  });
}

/**
 * fetchREST — faz uma query DIRETA na API REST do Supabase com a anon key.
 * Bypassa completamente o Supabase JS client e seu estado de auth/lock.
 * Ideal para queries de leitura pública que precisam funcionar sempre.
 * 
 * ⚠️ IMPORTANTE: O parâmetro "select" é tratado separadamente para evitar
 * que o URLSearchParams encode as vírgulas (%2C), o que pode quebrar o PostgREST.
 * Vírgulas e asteriscos são mantidos literais (PostgREST special chars).
 */
export async function fetchREST<T>(
  table: string,
  params: Record<string, string> = {}
): Promise<T[]> {
  try {
    // Constrói a URL manualmente para evitar encode indevido de vírgulas no select
    // O PostgREST espera select=id,email,role (com vírgulas literais, não %2C)
    const selectValue = params.select || "*";
    const otherParams = { ...params };
    delete otherParams.select;
    
    const searchParams = new URLSearchParams(otherParams);
    const queryString = searchParams.toString();
    
    // encodeURIComponent para segurança, mas reverte vírgulas e asteriscos (PostgREST special chars)
    const encodedSelect = encodeURIComponent(selectValue)
      .replace(/%2C/g, ',')
      .replace(/%2A/g, '*');
    
    const url = `${supabaseUrl}/rest/v1/${table}?select=${encodedSelect}${queryString ? '&' + queryString : ''}`;
    
    const res = await fetch(url, {
      method: "GET",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`[fetchREST] Error ${res.status} on ${table}:`, text);
      return [];
    }
    return (await res.json()) as T[];
  } catch (err) {
    console.error(`[fetchREST] Network error on ${table}:`, err);
    return [];
  }
}

/**
 * insertREST — insere um registro via REST API com anon key.
 * Bypassa o Supabase client e seu estado de auth/lock.
 * Retorna o registro inserido ou null.
 */
export async function insertREST<T = Record<string, unknown>>(
  table: string,
  body: Record<string, unknown>
): Promise<T | null> {
  try {
    const url = `${supabaseUrl}/rest/v1/${table}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`[insertREST] Error ${res.status} on ${table}:`, text);
      return null;
    }
    const data = await res.json();
    return (data?.[0] as T) ?? null;
  } catch (err) {
    console.error(`[insertREST] Network error on ${table}:`, err);
    return null;
  }
}

/**
 * patchREST — atualiza registros via REST API com anon key.
 * Bypassa o Supabase client e seu estado de auth/lock.
 * queryParams: filtros como "user_id=eq.xxx&lida=eq.false"
 * Retorna true se sucesso.
 */
export async function patchREST(
  table: string,
  queryParams: string,
  body: Record<string, unknown>
): Promise<boolean> {
  try {
    const url = `${supabaseUrl}/rest/v1/${table}?${queryParams}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`[patchREST] Error ${res.status} on ${table}:`, text);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[patchREST] Network error on ${table}:`, err);
    return false;
  }
}

// Kept for compatibility with other files
export function waitForAuthReady(): Promise<void> {
  return new Promise((resolve) => {
    const check = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        // Aguarda ate 3s para o token ser restaurado se necessario
        if (!data.session) {
          // Tenta uma segunda vez apos 500ms (autoRefreshToken pode estar em andamento)
          await new Promise((r) => setTimeout(r, 500));
          await supabase.auth.getSession();
        }
      } catch (_) {
        // Ignora erro - o importante e nao travar o app
      }
      resolve();
    };
    check();
  });
}

export function isAuthReady(): boolean {
  return true;
}

export function getEdgeFunctionUrl(functionName: string): string {
  return `${supabaseUrl}/functions/v1/${functionName}`;
}