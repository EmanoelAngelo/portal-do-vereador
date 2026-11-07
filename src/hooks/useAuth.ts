import { useState, useEffect, useCallback } from "react";
import { supabase, waitForAuthReady } from "@/lib/supabase";

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  full_name: string;
  display_name: string;
  avatar_url: string;
}

const SESSION_KEY = "ah_session";

export function getStoredUser(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function storeUser(user: AuthUser): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function clearStoredUser(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export interface LoginResult {
  ok: boolean;
  user?: AuthUser;
  error?: string;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} (timeout ${ms}ms)`)), ms)
    ),
  ]);
}

export async function loginWithCredentials(
  email: string,
  password: string
): Promise<LoginResult> {
  try {
    const { data: signInData, error: signInErr } = await withTimeout(
      supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      }),
      10000,
      "signInWithPassword"
    );

    if (signInErr) {
      if (signInErr.message.toLowerCase().includes("email not confirmed") || signInErr.message.toLowerCase().includes("not confirmed")) {
        return { ok: false, error: "Email ainda não confirmado. Verifique sua caixa de entrada e confirme seu email antes de fazer login." };
      }
      return { ok: false, error: signInErr.message || "E-mail ou senha inválidos." };
    }

    if (!signInData?.user) {
      return { ok: false, error: "E-mail ou senha inválidos." };
    }

    const { data: profile } = await withTimeout(
      supabase
        .from("profiles")
        .select("role, display_name, full_name, avatar_url")
        .eq("id", signInData.user.id)
        .maybeSingle(),
      8000,
      "fetchProfile"
    );

    if (!profile) {
      const meta = signInData.user.user_metadata || {};
      const role = meta.role || "citizen";
      const fullName = meta.full_name || "";
      const displayName = meta.display_name || fullName || "";
      await withTimeout(
        supabase.from("profiles").insert({
          id: signInData.user.id,
          full_name: fullName,
          display_name: displayName,
          role,
          registration_complete: false,
          onboarding_step: "email_verified",
        }),
        8000,
        "createProfile"
      );

      const user: AuthUser = {
        id: signInData.user.id,
        email: signInData.user.email ?? email,
        role,
        full_name: fullName,
        display_name: displayName,
        avatar_url: "",
      };
      storeUser(user);
      return { ok: true, user };
    }

    const user: AuthUser = {
      id: signInData.user.id,
      email: signInData.user.email ?? email,
      role: profile.role ?? "citizen",
      full_name: profile.full_name ?? signInData.user.user_metadata?.full_name ?? "",
      display_name: profile.display_name ?? signInData.user.user_metadata?.display_name ?? "",
      avatar_url: profile.avatar_url ?? "",
    };

    storeUser(user);
    return { ok: true, user };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro de conexão. Tente novamente.";
    return { ok: false, error: msg };
  }
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === SESSION_KEY) {
        setUser(e.newValue ? (JSON.parse(e.newValue) as AuthUser) : null);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const checkSession = async () => {
      try {
        await waitForAuthReady();

        const { data: { session } } = await withTimeout(
          supabase.auth.getSession(),
          8000,
          "getSession"
        );

        if (cancelled) return;

        if (session?.user) {
          // Guarda o usuario atual (se existir) para nao perder dados
          const currentStored = getStoredUser();

          const { data: profile } = await withTimeout(
            supabase
              .from("profiles")
              .select("role, display_name, full_name, avatar_url")
              .eq("id", session.user.id)
              .maybeSingle(),
            8000,
            "fetchProfileInit"
          );

          // NEVER overwrite storedUser with empty strings — keep previous values as fallback
          const fullName = profile?.full_name
            || session.user.user_metadata?.full_name
            || currentStored?.full_name
            || "";
          let displayName = profile?.display_name
            || session.user.user_metadata?.display_name
            || currentStored?.display_name
            || "";
          // Se displayName ainda estiver vazio, gera do fullName ou email
          if (!displayName && fullName) {
            displayName = fullName.split(" ")[0];
          }
          if (!displayName) {
            const emailPrefix = (session.user.email || currentStored?.email || "").split("@")[0] || "";
            displayName = emailPrefix || "Cidadão";
          }
          const avatarUrl = profile?.avatar_url
            || currentStored?.avatar_url
            || "";

          // Se profile do banco NAO tem nome mas storedUser tem, atualiza o banco
          if ((!profile?.full_name || !profile?.display_name) && (currentStored?.full_name || currentStored?.display_name)) {
            const updatePayload: Record<string, string> = {};
            if (!profile?.full_name && currentStored?.full_name) updatePayload.full_name = currentStored.full_name;
            if (!profile?.display_name && currentStored?.display_name) updatePayload.display_name = currentStored.display_name;
            if (Object.keys(updatePayload).length > 0) {
              supabase.from("profiles").update(updatePayload).eq("id", session.user.id).then(() => {}).catch(() => {});
            }
          }

          const authUser: AuthUser = {
            id: session.user.id,
            email: session.user.email ?? currentStored?.email ?? "",
            role: profile?.role ?? currentStored?.role ?? "citizen",
            full_name: fullName,
            display_name: displayName,
            avatar_url: avatarUrl,
          };
          storeUser(authUser);
          if (!cancelled) setUser(authUser);
        } else {
          // Nenhuma sessão ativa — limpa tudo
          clearStoredUser();
          if (!cancelled) setUser(null);
        }
      } catch (err: unknown) {
        // Erro durante getSession ou fetchProfile.
        // Se for erro de refresh token inválido, a sessão está morta — força limpeza.
        const isAuthError =
          err instanceof Error &&
          (err.message?.includes("Invalid Refresh Token") ||
           err.message?.includes("Refresh Token Not Found") ||
           err.message?.includes("Auth session missing") ||
           err.name === "AuthSessionMissingError");

        if (isAuthError) {
          console.warn("[useAuth] Auth error during session check — clearing all auth state");
          clearStoredUser();
          // Limpa tokens Supabase do storage também
          Object.keys(localStorage).forEach((k) => {
            if (k.startsWith("sb-") || k.includes("supabase")) localStorage.removeItem(k);
          });
          Object.keys(sessionStorage).forEach((k) => {
            if (k.startsWith("sb-") || k.includes("supabase")) sessionStorage.removeItem(k);
          });
          if (!cancelled) setUser(null);
        }
        // Para outros erros (timeout, rede), mantém storedUser existente
      } finally {
        if (!cancelled) setInitialized(true);
      }
    };

    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const userId = session.user.id;
        const userEmail = session.user.email ?? "";
        const meta = session.user.user_metadata ?? {};
        const currentStored = getStoredUser();

        supabase
          .from("profiles")
          .select("role, display_name, full_name, avatar_url")
          .eq("id", userId)
          .maybeSingle()
          .then(({ data: profile }) => {
            const fullName = profile?.full_name
              || meta.full_name
              || currentStored?.full_name
              || "";
            let displayName = profile?.display_name
              || meta.display_name
              || currentStored?.display_name
              || "";
            if (!displayName && fullName) {
              displayName = fullName.split(" ")[0];
            }
            if (!displayName) {
              const emailPrefix = (session.user.email || currentStored?.email || "").split("@")[0] || "";
              displayName = emailPrefix || "Cidadão";
            }
            const avatarUrl = profile?.avatar_url
              || currentStored?.avatar_url
              || "";

            const authUser: AuthUser = {
              id: userId,
              email: userEmail,
              role: profile?.role ?? meta.role ?? currentStored?.role ?? "citizen",
              full_name: fullName,
              display_name: displayName,
              avatar_url: avatarUrl,
            };
            storeUser(authUser);
            if (!cancelled) setUser(authUser);
          })
          .catch(() => {/* ignorar erro silenciosamente — mantem storedUser existente */});
      } else if (event === "SIGNED_OUT") {
        clearStoredUser();
        // Limpa TODOS os tokens do Supabase no storage
        Object.keys(localStorage).forEach((k) => {
          if (k.startsWith("sb-") || k.includes("supabase")) localStorage.removeItem(k);
        });
        Object.keys(sessionStorage).forEach((k) => {
          if (k.startsWith("sb-") || k.includes("supabase")) sessionStorage.removeItem(k);
        });
        if (!cancelled) setUser(null);

        // Se está em página autenticada, redireciona para login
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
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    setLoading(true);
    try {
      const result = await loginWithCredentials(email, password);
      if (result.ok && result.user) {
        setUser(result.user);
      }
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro de conexão.";
      return { ok: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try { await supabase.auth.signOut(); } catch (_) { /* ignore */ }
    clearStoredUser();
    Object.keys(localStorage).forEach((k) => { if (k.startsWith("sb-") || k.includes("supabase")) localStorage.removeItem(k); });
    Object.keys(sessionStorage).forEach((k) => { if (k.startsWith("sb-") || k.includes("supabase")) sessionStorage.removeItem(k); });
    setUser(null);
  }, []);

  return { user, loading, initialized, login, logout };
}