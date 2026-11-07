import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase, supabaseAnonKey, getEdgeFunctionUrl } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { formatEdgeFunctionError, type DiagnosticEntry } from "@/pages/auth/diagnostics";
import { notificarRelevantes } from "@/hooks/useNotifications";

type Mode = "login" | "register" | "verify" | "forgot" | "reset" | "confirm";
type AccountType = "citizen" | "empresa" | "assessor";

/**
 * Wrapper seguro para chamar Edge Functions.
 * NUNCA quebra com JSON parse error — sempre retorna { success, ... } ou { success: false, error }
 */
async function callEdgeFunction(
  functionName: string,
  payload: Record<string, unknown>
): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string; httpStatus: number }> {
  const url = getEdgeFunctionUrl(functionName);
  const startTime = performance.now();
  const requestId = `fn-${Date.now().toString(36)}`;

  console.log(`[AUTH:${requestId}] 🚀 Calling ${functionName}`, payload);

  // AbortController com timeout de 15 segundos — evita travamento eterno
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.warn(`[AUTH:${requestId}] ⏰ TIMEOUT — aborting ${functionName}`);
    controller.abort();
  }, 15000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const durationMs = Math.round(performance.now() - startTime);

    // Tenta ler o corpo como texto primeiro
    const responseText = await res.text();
    let responseData: Record<string, unknown> | undefined;

    try {
      responseData = JSON.parse(responseText);
    } catch {
      clearTimeout(timeoutId);
      // Corpo não é JSON — captura os primeiros 300 caracteres pra diagnóstico
      const snippet = responseText.slice(0, 300);
      console.error(`[AUTH:${requestId}] ❌ ${functionName} → HTTP ${res.status} — NON-JSON response (${durationMs}ms):`, snippet);

      // Log estruturado para diagnóstico
      const diag: DiagnosticEntry = {
        requestId,
        functionName,
        url,
        timestamp: new Date().toISOString(),
        payload,
        status: res.status,
        statusText: res.statusText,
        responseBody: snippet,
        durationMs,
        result: "http_error",
        errorMessage: `HTTP ${res.status}: ${snippet}`,
      };

      // Armazena no array global de diagnosticos
      try {
        const { diagnosticLog } = await import("@/pages/auth/diagnostics");
        diagnosticLog.push(diag);
        if (diagnosticLog.length > 20) diagnosticLog.shift();
      } catch {
        /* non-critical: diagnostic storage failed */
      }

      return {
        success: false,
        error: `Erro do servidor (HTTP ${res.status}). Tente novamente em instantes.`,
        httpStatus: res.status,
      };
    }

    console.log(`[AUTH:${requestId}] ${res.ok ? "✅" : "⚠️"} ${functionName} → HTTP ${res.status} (${durationMs}ms):`, responseData);

    return {
      success: responseData?.success === true,
      data: responseData,
      error: responseData?.error ? String(responseData.error) : undefined,
      httpStatus: res.status,
    };
  } catch (networkErr) {
    clearTimeout(timeoutId);
    const durationMs = Math.round(performance.now() - startTime);
    const isTimeout = networkErr instanceof DOMException && networkErr.name === "AbortError";
    const msg = networkErr instanceof Error ? networkErr.message : String(networkErr);
    console.error(`[AUTH:${requestId}] 💥 ${functionName} → ${isTimeout ? "TIMEOUT" : "NETWORK ERROR"} (${durationMs}ms):`, msg);

    return {
      success: false,
      error: isTimeout
        ? "O servidor está demorando muito para responder. Tente novamente em instantes."
        : "Erro de conexão. Verifique sua internet e tente novamente.",
      httpStatus: 0,
    };
  }
}

export default function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [accountType, setAccountType] = useState<AccountType>("citizen");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const loadingRef = useRef(false);

  const { user, login } = useAuth();

  // Redirecionar automaticamente se já estiver logado
  useEffect(() => {
    if (!user) return;
    const role = user.role;

    // Se tem parâmetro "from" na URL, redireciona pra lá após login
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("from");
    if (fromUrl) {
      navigate(fromUrl, { replace: true });
      return;
    }

    supabase
      .from("profiles")
      .select("onboarding_step, registration_complete, status")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data: prof }) => {
        const onboardingStep = (prof as any)?.onboarding_step as string | null;
        const status = (prof as any)?.status as string | null;

        if (role === "assessor" && status === "pending") {
          return;
        }

        if (onboardingStep && role !== "admin") {
          navigate("/complete-profile", { replace: true });
          return;
        }

        if (role === "empresa") navigate("/sistema/painel/empresa", { replace: true });
        else if (role === "assessor") navigate("/assessor/painel", { replace: true });
        else if (role === "admin") navigate("/admin", { replace: true });
        else if (role === "vereador") navigate("/vereador", { replace: true });
        else navigate("/cidadao", { replace: true });
      })
      .catch(() => {
        if (role === "empresa") navigate("/sistema/painel/empresa", { replace: true });
        else if (role === "assessor") navigate("/assessor/painel", { replace: true });
        else if (role === "admin") navigate("/admin", { replace: true });
        else if (role === "vereador") navigate("/vereador", { replace: true });
        else navigate("/cidadao", { replace: true });
      });
  }, [user, navigate]);

  const [form, setForm] = useState({
    display_name: "",
    name: "",
    email: "",
    password: "",
    phone: "",
    neighborhood: "",
    company_name: "",
    cnpj: "",
    responsible_name: "",
    code: "",
  });

  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingRole, setPendingRole] = useState<AccountType>("citizen");
  const [pendingMetadata, setPendingMetadata] = useState<Record<string, unknown>>();
  const [pendingPassword, setPendingPassword] = useState("");

  // ═══════════════════════════════════════════
  // Reset automático de senhas dos usuários teste
  // ═══════════════════════════════════════════
  const [resettingTestUsers, setResettingTestUsers] = useState(false);
  const [resetTestMsg, setResetTestMsg] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shouldReset = params.get("reset_test_users") === "true";
    if (!shouldReset) return;

    const doReset = async () => {
      setResettingTestUsers(true);
      setResetTestMsg("Conectando ao servidor...");
      try {
        const fnUrl = getEdgeFunctionUrl("reset-test-users-v2");
        const res = await fetch(fnUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({ action: "reset_all" }),
        });
        const result = await res.json();
        if (result.success) {
          setResetTestMsg("Senhas resetadas com sucesso! Use: Teste@123");
        } else {
          setResetTestMsg("Erro: " + (result.error || "desconhecido"));
        }
      } catch (err) {
        setResetTestMsg("Erro de conexão: " + (err instanceof Error ? err.message : "tente novamente"));
      } finally {
        setResettingTestUsers(false);
      }
    };
    doReset();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError("");
  };

  const safeSetLoading = (v: boolean) => {
    loadingRef.current = v;
    setLoading(v);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password) {
      setError("Preencha e-mail e senha.");
      return;
    }
    safeSetLoading(true);
    setError("");

    // Usa o login do useAuth que gerencia storeUser, perfil, role, etc.
    const result = await login(form.email.trim().toLowerCase(), form.password);

    safeSetLoading(false);

    if (!result.ok) {
      if (result.error?.toLowerCase().includes("não confirmado") || result.error?.toLowerCase().includes("not confirmed")) {
        setError("Email ainda não confirmado. Verifique sua caixa de entrada e clique no link de confirmação.");
        return;
      }
      setError(result.error || "E-mail ou senha inválidos.");
      return;
    }

    // Redirecionamento sera feito pelo useEffect que observa `user`
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const displayNameValue = form.display_name.trim() || (accountType === "empresa" ? form.company_name.trim() : form.name.trim());

    if (accountType === "citizen" && !form.name.trim()) {
      setError("Informe seu nome completo.");
      return;
    }
    if (accountType === "empresa" && !form.company_name.trim()) {
      setError("Informe o nome da empresa.");
      return;
    }
    if (accountType === "assessor" && !form.name.trim()) {
      setError("Informe seu nome completo.");
      return;
    }
    if (!displayNameValue) {
      setError("Informe como quer ser chamado no sistema.");
      return;
    }
    if (form.password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    safeSetLoading(true);
    setError("");

    const fullName = accountType === "empresa" ? form.company_name : form.name;
    const email = form.email.trim().toLowerCase();

    const metadata = {
      full_name: fullName,
      display_name: displayNameValue,
      phone: form.phone,
      neighborhood: form.neighborhood,
      company_name: form.company_name,
      cnpj: form.cnpj,
      responsible_name: form.responsible_name,
      role: accountType,
    };

    // Chamar Edge Function para enviar código de verificação
    const { success: fnSuccess, data, error: fnError, httpStatus } = await callEdgeFunction("send-verification", {
      email,
      role: accountType,
      user_metadata: metadata,
      purpose: "register",
    });

    if (!fnSuccess) {
      safeSetLoading(false);
      // Mensagem mais detalhada baseada no status HTTP
      if (httpStatus === 500) {
        setError("Erro interno do servidor. Nossa equipe já foi notificada. Tente novamente em alguns instantes.");
      } else if (fnError) {
        setError(fnError);
      } else {
        setError("Erro ao enviar código. Tente novamente.");
      }
      return;
    }

    const result = data!;

    // Se usuário já existe
    if (result.userAlreadyExists) {
      safeSetLoading(false);
      setError(String(result.message || "Este e-mail já está cadastrado. Faça login."));
      return;
    }

    // Guardar dados para criar conta depois da verificação
    setPendingEmail(email);
    setPendingRole(accountType);
    setPendingMetadata(metadata);
    setPendingPassword(form.password);

    safeSetLoading(false);
    setSuccess(String(result.message || "Código enviado! Verifique seu e-mail."));
    setMode("verify");
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || form.code.trim().length < 5) {
      setError("Digite o código de 5 dígitos.");
      return;
    }

    safeSetLoading(true);
    setError("");

    // Verificar código via Edge Function
    const { success: fnSuccess, data, error: fnError } = await callEdgeFunction("verify-code", {
      email: pendingEmail,
      code: form.code.trim(),
    });

    if (!fnSuccess) {
      safeSetLoading(false);
      if (fnError) {
        setError(fnError);
      } else {
        setError("Código inválido ou expirado.");
      }
      return;
    }

    const verifyResult = data!;

    if (!verifyResult.success) {
      safeSetLoading(false);
      setError(String(verifyResult.error || "Código inválido ou expirado."));
      return;
    }

    // Código verificado! Agora criar o usuário no Supabase Auth via Edge Function
    // Usamos confirm-registration (com SERVICE_ROLE_KEY) para criar com email_confirm: true
    // Passamos o codigo para que ele seja consumido APENAS apos criacao bem-sucedida
    // Isso evita que o codigo seja queimado e a conta falhe, prendendo o usuario
    const { success: regSuccess, data: regData, error: regError } = await callEdgeFunction("confirm-registration", {
      email: pendingEmail,
      password: pendingPassword,
      role: pendingRole,
      user_metadata: pendingMetadata,
      code: form.code.trim(),
    });

    if (!regSuccess) {
      safeSetLoading(false);
      setError(regError || "Erro ao criar conta. Tente novamente.");
      return;
    }

    // Assessor precisa de aprovação — não faz login automático
    if (pendingRole === "assessor") {
      safeSetLoading(false);
      setSuccess("Solicitação enviada! Um administrador analisará seu cadastro. Você receberá um e-mail confirmando o recebimento e outro quando for aprovado.");
      
      // Notificar admin sobre novo assessor pendente de aprovação
      const assessorName = (pendingMetadata as any)?.full_name || pendingEmail;
      notificarRelevantes(
        "novo_usuario",
        "Novo assessor pendente de aprovação",
        `${assessorName} (${pendingEmail}) solicitou acesso ao sistema e aguarda aprovação.`,
        {
          remetenteNome: assessorName,
          referenciaTipo: "assessor",
        }
      ).catch(() => {});
      
      setMode("login");
      return;
    }

    // 🎯 LOGIN AUTOMÁTICO — usuário NUNCA deve precisar digitar login/senha depois de verificar o código
    setSuccess("Conta criada! Fazendo login automático...");

    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
      email: pendingEmail,
      password: pendingPassword,
    });

    safeSetLoading(false);

    if (signInErr || !signInData?.user) {
      const motivo = signInErr?.message || "Credenciais inválidas";
      console.error("[AUTH] Auto-login falhou após confirm-registration:", motivo);
      // Fallback: se o login automático falhar (raro), mostra tela de login com mensagem clara
      setError("Conta criada, mas houve um problema no login automático. Tente fazer login manualmente. Se o erro persistir, use 'Esqueceu a senha?'.");
      setMode("login");
      return;
    }

    // ✅ Login automático realizado! O useEffect que observa `user` vai redirecionar automaticamente
    // Não precisa mudar de tela — o redirecionamento é instantâneo
    setSuccess("Login realizado! Redirecionando...");
  };

  const handleResendCode = async () => {
    if (!pendingEmail) {
      setError("Não há e-mail pendente.");
      return;
    }
    safeSetLoading(true);
    setError("");

    const { success: fnSuccess, data, error: fnError } = await callEdgeFunction("resend-code", {
      email: pendingEmail,
      role: pendingRole,
      user_metadata: pendingMetadata,
      purpose: "register",
    });

    if (!fnSuccess) {
      safeSetLoading(false);
      setError(fnError || "Erro ao reenviar código.");
      return;
    }

    const result = data!;
    safeSetLoading(false);

    if (!result.success) {
      setError(String(result.error || "Erro ao reenviar código."));
      return;
    }

    setSuccess(String(result.message || "Código reenviado! Verifique seu e-mail."));
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim()) {
      setError("Digite seu e-mail.");
      return;
    }
    safeSetLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(form.email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/auth?mode=reset`,
      });

      safeSetLoading(false);
      if (error) {
        setError(error.message || "Erro ao enviar.");
        return;
      }
      setSuccess("Link de recuperação enviado! Verifique seu e-mail.");
      setMode("login");
    } catch (err) {
      safeSetLoading(false);
      setError("Erro de conexão.");
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.password || form.password.length < 6) {
      setError("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    safeSetLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.updateUser({
        password: form.password,
      });

      safeSetLoading(false);
      if (error) {
        setError(error.message || "Erro ao redefinir senha.");
        return;
      }
      setSuccess("Senha redefinida! Faça login.");
      setMode("login");
      setForm((p) => ({ ...p, password: "" }));
    } catch (err) {
      safeSetLoading(false);
      setError("Erro de conexão.");
    }
  };

  const ACCOUNT_TYPES = [
    { key: "citizen" as AccountType, icon: "ri-user-line", label: "Cidadão", desc: "Busco emprego e acompanho demandas" },
    { key: "empresa" as AccountType, icon: "ri-building-line", label: "Empresa", desc: "Quero contratar e publicar vagas" },
    { key: "assessor" as AccountType, icon: "ri-user-star-line", label: "Assessor", desc: "Solicitar acesso ao sistema" },
  ];

  const renderLogo = () => (
    <Link to="/" className="inline-flex items-center gap-3">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "#E8A020" }}>
        <i className="ri-lightbulb-line text-xl" style={{ color: "#0D1629" }} />
      </div>
      <div className="text-left">
        <p className="text-white font-bold text-base">Arthur Halal</p>
        <p className="text-xs tracking-widest uppercase" style={{ color: "#3BBFD4" }}>Vereador · Pelotas</p>
      </div>
    </Link>
  );

  const renderCard = (children: React.ReactNode) => (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden" style={{ background: "#020C1B" }}>
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] pointer-events-none" style={{ background: "radial-gradient(circle, rgba(3,105,161,0.15) 0%, transparent 70%)" }} />
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          {renderLogo()}
        </div>
        <div className="rounded-3xl p-6 md:p-8 backdrop-blur-xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          {children}
        </div>
      </div>
      <style>{`
        input::placeholder { color: rgba(255,255,255,0.3) !important; }
        input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus {
          -webkit-text-fill-color: #ffffff !important;
          -webkit-box-shadow: 0 0 0px 1000px rgba(13,22,41,0.8) inset !important;
        }
      `}</style>
    </div>
  );

  const renderFeedback = () => (
    <>
      {success && (
        <div className="mb-5 p-4 rounded-xl text-emerald-400 text-sm flex items-start gap-2" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)" }}>
          <i className="ri-checkbox-circle-line mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="mb-5 p-4 rounded-xl text-red-400 text-sm flex items-start gap-2" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>
          <i className="ri-error-warning-line mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </>
  );

  // TELA: VERIFICAÇÃO DE CÓDIGO
  if (mode === "verify") {
    return renderCard(
      <>
        <h1 className="text-white font-extrabold text-2xl text-center">Verifique seu e-mail</h1>
        <p className="text-sm mt-1 text-center" style={{ color: "rgba(255,255,255,0.5)" }}>
          Enviamos um código de 5 dígitos para <span className="text-white font-bold">{pendingEmail}</span>
        </p>
        {renderFeedback()}
        <form onSubmit={handleVerify} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.6)" }}>
              Código de verificação
            </label>
            <input
              name="code"
              type="text"
              value={form.code}
              onChange={handleChange}
              placeholder="00000"
              maxLength={5}
              required
              className="w-full rounded-xl px-4 py-3 text-sm text-center tracking-[0.5em] font-bold focus:outline-none transition-all"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#ffffff", fontSize: "24px" }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 text-white font-bold text-sm rounded-xl transition-all duration-200 cursor-pointer whitespace-nowrap"
            style={{ background: loading ? "rgba(232,160,32,0.5)" : "linear-gradient(135deg, #E8A020, #f5b94a)", color: loading ? "rgba(255,255,255,0.7)" : "#0D1629" }}
          >
            {loading ? "Verificando..." : "Verificar código e criar conta"}
          </button>
        </form>
        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={handleResendCode}
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap"
            style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.10)" }}
          >
            {loading ? "Reenviando..." : "Reenviar código"}
          </button>
          <button
            type="button"
            onClick={() => { setMode("login"); setSuccess(""); setError(""); }}
            className="w-full py-3 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap"
            style={{ background: "transparent", color: "#3BBFD4" }}
          >
            ← Voltar ao login
          </button>
        </div>
      </>
    );
  }

  // TELA: ESQUECI SENHA
  if (mode === "forgot") {
    return renderCard(
      <>
        <h1 className="text-white font-extrabold text-2xl text-center">Recuperar senha</h1>
        <p className="text-sm mt-1 text-center" style={{ color: "rgba(255,255,255,0.5)" }}>
          Enviaremos um link para seu e-mail
        </p>
        {renderFeedback()}
        <form onSubmit={handleForgot} className="space-y-4 mt-6">
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.6)" }}>
              E-mail cadastrado
            </label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="seu@email.com"
              required
              className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#ffffff" }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 text-white font-bold text-sm rounded-xl transition-all duration-200 cursor-pointer whitespace-nowrap"
            style={{ background: loading ? "rgba(232,160,32,0.5)" : "linear-gradient(135deg, #E8A020, #f5b94a)", color: loading ? "rgba(255,255,255,0.7)" : "#0D1629" }}
          >
            {loading ? "Enviando..." : "Enviar link de recuperação"}
          </button>
        </form>
        <button
          type="button"
          onClick={() => setMode("login")}
          className="mt-6 block w-full text-center text-sm hover:underline cursor-pointer"
          style={{ color: "#3BBFD4" }}
        >
          ← Voltar ao login
        </button>
      </>
    );
  }

  // TELA: REDEFINIR SENHA
  if (mode === "reset") {
    return renderCard(
      <>
        <h1 className="text-white font-extrabold text-2xl text-center">Nova senha</h1>
        <p className="text-sm mt-1 text-center" style={{ color: "rgba(255,255,255,0.5)" }}>
          Digite sua nova senha
        </p>
        {renderFeedback()}
        <form onSubmit={handleReset} className="space-y-4 mt-6">
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.6)" }}>
              Nova senha
            </label>
            <div className="relative">
              <input
                name="password"
                type={showPass ? "text" : "password"}
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none transition-all"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#ffffff" }}
              />
              <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer" style={{ color: "rgba(255,255,255,0.4)" }}>
                <i className={showPass ? "ri-eye-off-line" : "ri-eye-line"} />
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 text-white font-bold text-sm rounded-xl transition-all duration-200 cursor-pointer whitespace-nowrap"
            style={{ background: loading ? "rgba(232,160,32,0.5)" : "linear-gradient(135deg, #E8A020, #f5b94a)", color: loading ? "rgba(255,255,255,0.7)" : "#0D1629" }}
          >
            {loading ? "Redefinindo..." : "Redefinir senha"}
          </button>
        </form>
        <button
          type="button"
          onClick={() => setMode("login")}
          className="mt-6 block w-full text-center text-sm hover:underline cursor-pointer"
          style={{ color: "#3BBFD4" }}
        >
          ← Voltar ao login
        </button>
      </>
    );
  }

  // TELA PRINCIPAL: LOGIN / CADASTRO
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden" style={{ background: "#020C1B" }}>
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] pointer-events-none" style={{ background: "radial-gradient(circle, rgba(3,105,161,0.15) 0%, transparent 70%)" }} />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          {renderLogo()}
          <h1 className="text-white font-extrabold text-2xl mt-6">
            {mode === "login" ? "Acessar minha conta" : "Criar conta"}
          </h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
            {mode === "login"
              ? "Área do cidadão, empresas e assessores"
              : "Cadastre-se para acessar os serviços"}
          </p>
        </div>

        <div className="rounded-3xl p-6 md:p-8 backdrop-blur-xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          {/* Tabs */}
          <div className="flex rounded-xl p-1 mb-6" style={{ background: "rgba(255,255,255,0.05)" }}>
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(""); setSuccess(""); }}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap"
                style={mode === m
                  ? { background: "linear-gradient(135deg, #E8A020, #f5b94a)", color: "#0D1629" }
                  : { color: "rgba(255,255,255,0.5)", background: "transparent" }}
              >
                {m === "login" ? "Entrar" : "Cadastrar"}
              </button>
            ))}
          </div>

          {/* Account type selector */}
          {mode === "register" && (
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>
                Tipo de conta
              </p>
              <div className="space-y-2">
                {ACCOUNT_TYPES.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => { setAccountType(t.key); setError(""); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer text-left"
                    style={accountType === t.key
                      ? { background: "rgba(232,160,32,0.15)", border: "1px solid rgba(232,160,32,0.35)" }
                      : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: accountType === t.key ? "rgba(232,160,32,0.25)" : "rgba(255,255,255,0.08)" }}>
                      <i className={`${t.icon} text-sm`} style={{ color: accountType === t.key ? "#E8A020" : "rgba(255,255,255,0.45)" }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: accountType === t.key ? "#E8A020" : "rgba(255,255,255,0.75)" }}>{t.label}</p>
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{t.desc}</p>
                    </div>
                    {accountType === t.key && (
                      <i className="ri-checkbox-circle-fill ml-auto" style={{ color: "#E8A020" }} />
                    )}
                  </button>
                ))}
              </div>
              {accountType === "assessor" && (
                <div className="mt-3 p-3 rounded-xl text-xs leading-relaxed" style={{ background: "rgba(232,160,32,0.10)", border: "1px solid rgba(232,160,32,0.25)", color: "#E8A020" }}>
                  <i className="ri-shield-keyhole-line mr-1.5" />
                  <strong>Acesso restrito:</strong> Requer aprovação de um Administrador.
                </div>
              )}
            </div>
          )}

          {renderFeedback()}

          <form onSubmit={mode === "login" ? handleLogin : handleRegister} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.6)" }}>
                  Como quer ser chamado no sistema? *
                </label>
                <input
                  name="display_name"
                  type="text"
                  value={form.display_name}
                  onChange={handleChange}
                  placeholder={accountType === "empresa" ? "Nome fantasia da empresa" : "Apelido ou nome que prefere"}
                  required
                  className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#ffffff" }}
                />
              </div>
            )}

            {mode === "register" && accountType === "citizen" && (
              <>
                <InputField label="Nome Completo *" name="name" type="text" value={form.name} onChange={handleChange} placeholder="Seu nome completo" required />
                <div className="grid grid-cols-2 gap-3">
                  <InputField label="Telefone" name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="(53) 9 0000-0000" />
                  <InputField label="Bairro" name="neighborhood" type="text" value={form.neighborhood} onChange={handleChange} placeholder="Seu bairro" />
                </div>
              </>
            )}

            {mode === "register" && accountType === "empresa" && (
              <>
                <InputField label="Nome da Empresa *" name="company_name" type="text" value={form.company_name} onChange={handleChange} placeholder="Razão social ou nome fantasia" required />
                <div className="grid grid-cols-2 gap-3">
                  <InputField label="CNPJ" name="cnpj" type="text" value={form.cnpj} onChange={handleChange} placeholder="00.000.000/0001-00" />
                  <InputField label="Telefone" name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="(53) 3232-0000" />
                </div>
                <InputField label="Nome do Responsável" name="responsible_name" type="text" value={form.responsible_name} onChange={handleChange} placeholder="Responsável pela conta" />
              </>
            )}

            {mode === "register" && accountType === "assessor" && (
              <>
                <InputField label="Nome Completo *" name="name" type="text" value={form.name} onChange={handleChange} placeholder="Seu nome completo" required />
                <InputField label="Telefone" name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="(53) 9 0000-0000" />
              </>
            )}

            <InputField label="E-mail *" name="email" type="email" value={form.email} onChange={handleChange} placeholder="seu@email.com" required autoComplete="email" />

            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.6)" }}>
                Senha *
              </label>
              <div className="relative">
                <input
                  name="password"
                  type={showPass ? "text" : "password"}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  minLength={6}
                  className="w-full rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#ffffff" }}
                />
                <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer" style={{ color: "rgba(255,255,255,0.4)" }}>
                  <i className={showPass ? "ri-eye-off-line" : "ri-eye-line"} />
                </button>
              </div>
            </div>

            {mode === "login" && (
              <button type="button" onClick={() => { setMode("forgot"); setError(""); setSuccess(""); }} className="text-xs hover:underline cursor-pointer" style={{ color: "#3BBFD4" }}>
                Esqueceu a senha?
              </button>
            )}

            {mode === "register" && accountType === "citizen" && (
              <div className="p-3 rounded-xl text-xs leading-relaxed" style={{ background: "rgba(59,191,212,0.08)", border: "1px solid rgba(59,191,212,0.20)", color: "#3BBFD4" }}>
                <i className="ri-information-line mr-1.5" />
                Você poderá se cadastrar sem currículo. Para acessar o feed de vagas, complete seu perfil profissional.
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 text-white font-bold text-sm rounded-xl transition-all duration-200 cursor-pointer whitespace-nowrap mt-2"
              style={{ background: loading ? "rgba(232,160,32,0.5)" : "linear-gradient(135deg, #E8A020, #f5b94a)", color: loading ? "rgba(255,255,255,0.7)" : "#0D1629", opacity: loading ? 0.8 : 1 }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 rounded-full animate-spin inline-block" style={{ borderColor: "rgba(0,0,0,0.2)", borderTopColor: "#0D1629" }} />
                  Processando...
                </span>
              ) : mode === "login" ? "Entrar" : accountType === "assessor" ? "Solicitar Acesso" : "Criar Conta"}
            </button>
          </form>

          {/* Credenciais de teste - sempre visivel no modo login */}
          {mode === "login" && (
            <div className="mt-5 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex items-center gap-2 mb-3">
                <i className="ri-key-2-line text-sm" style={{ color: "#E8A020" }} />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#E8A020" }}>
                  Credenciais de teste
                </span>
              </div>

              {/* Botao de reset rapido */}
              <button
                type="button"
                onClick={async () => {
                  setResettingTestUsers(true);
                  setResetTestMsg("Conectando ao servidor...");
                  try {
                    const fnUrl = getEdgeFunctionUrl("reset-test-users-v2");
                    const res = await fetch(fnUrl, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        apikey: supabaseAnonKey,
                        Authorization: "Bearer " + supabaseAnonKey,
                      },
                      body: JSON.stringify({ action: "reset_all" }),
                    });
                    const result = await res.json();
                    if (result.success) {
                      setResetTestMsg("Senhas resetadas! Todas agora sao: Teste@123");
                    } else {
                      setResetTestMsg("Erro: " + (result.error || "desconhecido"));
                    }
                  } catch (err) {
                    setResetTestMsg("Erro de conexao. Tente novamente.");
                  } finally {
                    setResettingTestUsers(false);
                  }
                }}
                disabled={resettingTestUsers}
                className="w-full mb-3 py-2 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap transition-all"
                style={{
                  background: resettingTestUsers ? "rgba(232,160,32,0.15)" : "rgba(232,160,32,0.10)",
                  color: "#E8A020",
                  border: "1px solid rgba(232,160,32,0.25)",
                }}
              >
                {resettingTestUsers ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <span className="w-3 h-3 border-2 rounded-full animate-spin inline-block" style={{ borderColor: "rgba(232,160,32,0.3)", borderTopColor: "#E8A020" }} />
                    Resetando senhas...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1.5">
                    <i className="ri-refresh-line" />
                    Resetar senhas de teste
                  </span>
                )}
              </button>

              {resetTestMsg && (
                <div className="mb-3 p-2.5 rounded-xl text-xs" style={{ background: resetTestMsg.indexOf("resetadas") !== -1 ? "rgba(34,197,94,0.10)" : "rgba(239,68,68,0.10)", border: resetTestMsg.indexOf("resetadas") !== -1 ? "1px solid rgba(34,197,94,0.25)" : "1px solid rgba(239,68,68,0.25)", color: resetTestMsg.indexOf("resetadas") !== -1 ? "#22C55E" : "#EF4444" }}>
                  {resetTestMsg}
                </div>
              )}

              <div className="space-y-2">
                {[
                  { role: "Vereador", email: "vereador@arthurhalal.com.br", icon: "ri-government-line", color: "#E8A020" },
                  { role: "Assessor", email: "assessor@arthurhalal.com.br", icon: "ri-user-star-line", color: "#3BBFD4" },
                  { role: "Cidadao", email: "cidadao.teste@gmail.com", icon: "ri-user-line", color: "#22C55E" },
                  { role: "Empresa", email: "empresa.teste@gmail.com", icon: "ri-building-line", color: "#F59E0B" },
                ].map((cred) => (
                  <div
                    key={cred.email}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:brightness-110 transition-all duration-150"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                    onClick={() => {
                      setForm((p) => ({ ...p, email: cred.email, password: "CONFIGURE_EM_AMBIENTE_DE_TESTE" }));
                    }}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: cred.color + "20" }}>
                      <i className={cred.icon + " text-sm"} style={{ color: cred.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold" style={{ color: cred.color }}>{cred.role}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>LOGIN:</span>
                        <span className="text-xs truncate" style={{ color: "rgba(255,255,255,0.6)" }}>{cred.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>SENHA:</span>
                        <span className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.6)" }}>Teste@123</span>
                      </div>
                    </div>
                  </div>
                ))}
                <p className="text-xs text-center pt-1" style={{ color: "rgba(255,255,255,0.2)" }}>
                  Clique em um usuario para preencher automaticamente
                </p>
              </div>
            </div>
          )}

          <p className="text-center text-xs mt-6" style={{ color: "rgba(255,255,255,0.35)" }}>
            <Link to="/" className="hover:underline" style={{ color: "#3BBFD4" }}>
              ← Voltar ao site
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        input::placeholder { color: rgba(255,255,255,0.3) !important; }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-text-fill-color: #ffffff !important;
          -webkit-box-shadow: 0 0 0px 1000px rgba(13,22,41,0.8) inset !important;
        }
      `}</style>
    </div>
  );
}

interface InputFieldProps {
  label: string;
  name: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
}

function InputField({ label, name, type, value, onChange, placeholder, required, autoComplete }: InputFieldProps) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.6)" }}>
        {label}
      </label>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all"
        style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#ffffff" }}
      />
    </div>
  );
}