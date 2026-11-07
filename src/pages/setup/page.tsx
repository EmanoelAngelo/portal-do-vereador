import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";

interface SetupResult {
  email: string;
  status: string;
  error?: string;
}

interface ResendTestResult {
  success: boolean;
  resendConfigured: boolean;
  emailSent?: boolean;
  message: string;
  error?: unknown;
  status?: number;
}

interface SecretDiagnostics {
  serviceRoleKey: {
    tested: boolean;
    ok: boolean;
    hasSecret: boolean;
    details: string;
  };
  resendKey: {
    tested: boolean;
    ok: boolean;
    hasSecret: boolean;
    details: string;
  };
}

const USERS_LIST = [
  { email: "admin@arthurhalal.com.br",        senha: "CONFIGURE_EM_AMBIENTE_DE_TESTE",      tipo: "Admin" },
  { email: "assessor@arthurhalal.com.br",     senha: "CONFIGURE_EM_AMBIENTE_DE_TESTE",   tipo: "Assessor" },
  { email: "vereador@arthurhalal.com.br",     senha: "CONFIGURE_EM_AMBIENTE_DE_TESTE",   tipo: "Vereador" },
  { email: "cidadao.teste@gmail.com",         senha: "CONFIGURE_EM_AMBIENTE_DE_TESTE",    tipo: "Cidadão Teste" },
  { email: "empresa.teste@gmail.com",         senha: "CONFIGURE_EM_AMBIENTE_DE_TESTE",    tipo: "Empresa Teste" },
  { email: "desenvolvedor@example.com",           senha: "CONFIGURE_EM_AMBIENTE_DE_TESTE",    tipo: "Emanoel Angelo" },
];

export default function SetupPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SetupResult[]>([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const [testEmail, setTestEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendResult, setResendResult] = useState<ResendTestResult | null>(null);
  const [resendError, setResendError] = useState("");

  const [diagLoading, setDiagLoading] = useState(false);
  const [diagResult, setDiagResult] = useState<SecretDiagnostics | null>(null);
  const [diagError, setDiagError] = useState("");
  const [showRawDebug, setShowRawDebug] = useState(false);
  const [rawDebug, setRawDebug] = useState<{ serviceKey?: Record<string, unknown>; resendKey?: Record<string, unknown> }>();

  // ── News Email Preview Test ──
  const [newsList, setNewsList] = useState<{ id: number; title: string; slug: string; category: string; image_url: string | null; summary: string | null }[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [selectedNewsSlug, setSelectedNewsSlug] = useState("");
  const [newsTestEmail, setNewsTestEmail] = useState("");
  const [newsSending, setNewsSending] = useState(false);
  const [newsResult, setNewsResult] = useState<{ success: boolean; message: string; resendId?: string; newsTitle?: string } | null>(null);

  const fetchNews = async () => {
    setNewsLoading(true);
    try {
      const { data, error } = await supabase
        .from("news")
        .select("id, title, slug, category, image_url, summary")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(50);
      if (!error && data) {
        setNewsList(data as { id: number; title: string; slug: string; category: string; image_url: string | null; summary: string | null }[]);
      }
    } catch (_) { /* silent */ }
    setNewsLoading(false);
  };

  const runSetup = async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error: fnError } = await supabase.functions.invoke("fix-password-hashes", {
        body: {},
      });

      if (fnError) {
        throw new Error(fnError.message || "Erro na Edge Function.");
      }

      const response = data as { success?: boolean; results?: SetupResult[]; error?: string };
      if (!response?.success) {
        throw new Error(response?.error ?? "Erro desconhecido no setup.");
      }

      setResults((response.results as SetupResult[]) ?? []);
      setDone(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    }
    setLoading(false);
  };

  const testResend = async () => {
    setResendLoading(true);
    setResendError("");
    setResendResult(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("test-resend", {
        body: { testEmail: testEmail.trim() || undefined },
      });

      if (fnError) {
        throw new Error(fnError.message || "Erro na Edge Function.");
      }

      setResendResult(data as ResendTestResult);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setResendError(msg);
    }
    setResendLoading(false);
  };

  const runDiagnostics = async () => {
    setDiagLoading(true);
    setDiagError("");
    setDiagResult(null);
    setRawDebug({});

    const diagnostics: SecretDiagnostics = {
      serviceRoleKey: { tested: false, ok: false, hasSecret: false, details: "" },
      resendKey: { tested: false, ok: false, hasSecret: false, details: "" },
    };

    try {
      const svcRes = await supabase.functions.invoke("diagnose-service-key", { body: {} });
      const rawSvc = svcRes.data as Record<string, unknown> | undefined;
      setRawDebug(prev => ({ ...prev, serviceKey: rawSvc }));
      
      if (svcRes.error) {
        diagnostics.serviceRoleKey.details = `Erro ao invocar função: ${svcRes.error.message}`;
      } else if (!rawSvc) {
        diagnostics.serviceRoleKey.details = "Função retornou dados vazios";
      } else {
        const diag = (rawSvc.diag || rawSvc) as Record<string, unknown>;
        diagnostics.serviceRoleKey.tested = true;
        diagnostics.serviceRoleKey.hasSecret = Boolean(diag.hasSecret);
        
        // A função diagnose-service-key retorna { status: "ok", report: [...] }
        const isOk = rawSvc.status === "ok" || diag.status === "ok" || Boolean(diag.listUsersOk) || Boolean(diag.dbTestOk);
        diagnostics.serviceRoleKey.ok = isOk;
        
        if (isOk && Array.isArray(diag.report)) {
          const report = diag.report as string[];
          const serviceLine = report.find(s => s.includes("SERVICE_ROLE_KEY")) || "";
          const authLine = report.find(s => s.includes("AUTH TEST")) || "";
          const dbLine = report.find(s => s.includes("DB TEST")) || "";
          diagnostics.serviceRoleKey.details = `${serviceLine} | ${authLine} | ${dbLine}`;
        } else if (diag.hasSecret) {
          const lines: string[] = [];
          if (diag.listUsersOk !== undefined) lines.push(`listUsers: ${diag.listUsersOk ? "OK" : "FALHOU"}`);
          if (diag.dbTestOk !== undefined) lines.push(`profiles: ${diag.dbTestOk ? "OK" : "FALHOU"}`);
          if (diag.listUsersError) lines.push(`Erro: ${diag.listUsersError}`);
          if (diag.dbTestError) lines.push(`Erro: ${diag.dbTestError}`);
          diagnostics.serviceRoleKey.details = lines.length > 0 ? lines.join(" | ") : "Key presente e válida";
        } else {
          diagnostics.serviceRoleKey.details = "Secret SERVICE_ROLE_KEY não encontrada no ambiente da Edge Function";
        }
      }
    } catch (e: unknown) {
      diagnostics.serviceRoleKey.details = `Exceção: ${e instanceof Error ? e.message : String(e)}`;
    }

    try {
      const resRes = await supabase.functions.invoke("diagnose-resend-key", { body: {} });
      const rawRes = resRes.data as Record<string, unknown> | undefined;
      setRawDebug(prev => ({ ...prev, resendKey: rawRes }));
      
      if (resRes.error) {
        diagnostics.resendKey.details = `Erro ao invocar função: ${resRes.error.message}`;
      } else if (!rawRes) {
        diagnostics.resendKey.details = "Função retornou dados vazios";
      } else {
        const diag = (rawRes.diag || rawRes) as Record<string, unknown>;
        diagnostics.resendKey.tested = true;
        diagnostics.resendKey.hasSecret = Boolean(diag.hasSecret);
        
        // A função diagnose-resend-key retorna { status: "ok", report: [...] }
        const isOk = rawRes.status === "ok" || diag.status === "ok";
        diagnostics.resendKey.ok = isOk;

        if (isOk && Array.isArray(diag.report)) {
          const report = diag.report as string[];
          const keyLine = report.find(s => s.includes("RESEND_API_KEY")) || "";
          const formatLine = report.find(s => s.includes("format")) || "";
          diagnostics.resendKey.details = `${keyLine} | ${formatLine}`;
        } else if (diag.hasSecret) {
          if (diag.testOk) {
            diagnostics.resendKey.details = `Key válida (prefixo: ${diag.prefix || "re_..."}) — API Resend respondeu OK`;
          } else if (diag.testStatus) {
            const body = diag.testBody as Record<string, unknown> | undefined;
            const errMsg = body?.message || `Status HTTP ${diag.testStatus}`;
            diagnostics.resendKey.details = `Key presente mas API retornou erro: ${errMsg}`;
          } else if (diag.testError) {
            diagnostics.resendKey.details = `Key presente mas falha de rede: ${diag.testError}`;
          } else {
            diagnostics.resendKey.details = `Key presente (prefixo: ${diag.prefix || "re_..."}) — status desconhecido`;
          }
        } else {
          diagnostics.resendKey.details = "Secret RESEND_API_KEY não encontrada no ambiente da Edge Function";
        }
      }
    } catch (e: unknown) {
      diagnostics.resendKey.details = `Exceção: ${e instanceof Error ? e.message : String(e)}`;
    }

    setDiagResult(diagnostics);
    setDiagLoading(false);
  };

  const allSecretsOk = diagResult && diagResult.serviceRoleKey.ok && diagResult.resendKey.ok;

  const sendNewsPreview = async () => {
    if (!selectedNewsSlug || !newsTestEmail.trim()) return;
    setNewsSending(true);
    setNewsResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("send-news-email-preview", {
        body: { email: newsTestEmail.trim(), newsSlug: selectedNewsSlug },
      });
      if (error) throw new Error(error.message);
      setNewsResult({
        success: data?.success === true,
        message: data?.success
          ? `E-mail enviado com sucesso para ${newsTestEmail.trim()}!`
          : (data?.error || "Falha ao enviar"),
        resendId: data?.resendId,
        newsTitle: data?.newsTitle,
      });
    } catch (e: unknown) {
      setNewsResult({
        success: false,
        message: e instanceof Error ? e.message : "Erro ao enviar e-mail",
      });
    }
    setNewsSending(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden" style={{ background: "#020C1B" }}>
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 pointer-events-none" style={{ background: "radial-gradient(circle, rgba(3,105,161,0.15) 0%, transparent 70%)" }} />
      <div className="relative w-full max-w-lg flex flex-col gap-6">

        {/* 🔍 Diagnóstico de Secrets */}
        <div className="rounded-3xl p-8 backdrop-blur-xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(34,197,94,0.15)" }}>
              <i className="ri-shield-check-line text-sm" style={{ color: "#22c55e" }} />
            </div>
            <div>
              <h2 className="text-white font-bold text-sm">Diagnóstico de Secrets</h2>
              <p className="text-white/40 text-xs">Verifica SERVICE_ROLE_KEY e RESEND_API_KEY</p>
            </div>
          </div>

          <button
            onClick={runDiagnostics}
            disabled={diagLoading}
            className="w-full py-3 font-semibold text-sm rounded-xl transition-all disabled:opacity-50 cursor-pointer whitespace-nowrap mb-4"
            style={{ background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.25)", color: "#22c55e" }}
          >
            {diagLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 rounded-full animate-spin inline-block" style={{ borderColor: "rgba(34,197,94,0.2)", borderTopColor: "#22c55e" }} />
                Testando secrets...
              </span>
            ) : "Executar Diagnóstico"}
          </button>

          {diagError && (
            <div className="p-3 rounded-xl text-xs break-all mb-3" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}>
              {diagError}
            </div>
          )}

          {diagResult && (
            <div className="space-y-3">
              {allSecretsOk && (
                <div className="p-3 rounded-xl text-xs mb-2" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
                  <div className="flex items-center gap-2">
                    <i className="ri-checkbox-circle-fill text-emerald-400 text-lg" />
                    <span className="font-bold text-emerald-400">Todas as secrets configuradas corretamente!</span>
                  </div>
                </div>
              )}

              {/* SERVICE_ROLE_KEY */}
              <div
                className="p-4 rounded-xl text-xs border"
                style={
                  diagResult.serviceRoleKey.ok
                    ? { background: "rgba(34,197,94,0.08)", borderColor: "rgba(34,197,94,0.25)" }
                    : diagResult.serviceRoleKey.tested
                      ? { background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.25)" }
                      : { background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }
                }
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${diagResult.serviceRoleKey.ok ? "bg-emerald-500/20" : diagResult.serviceRoleKey.tested ? "bg-red-500/20" : "bg-white/10"}`}>
                    {diagResult.serviceRoleKey.ok ? (
                      <i className="ri-check-line text-emerald-400 text-xs" />
                    ) : diagResult.serviceRoleKey.tested ? (
                      <i className="ri-close-line text-red-400 text-xs" />
                    ) : (
                      <i className="ri-more-line text-white/30 text-xs" />
                    )}
                  </div>
                  <span className="font-semibold text-white">SERVICE_ROLE_KEY</span>
                  <span className={`ml-auto font-bold ${diagResult.serviceRoleKey.ok ? "text-emerald-400" : "text-red-400"}`}>
                    {diagResult.serviceRoleKey.ok ? "OK" : "FALHA"}
                  </span>
                </div>
                <p className="text-white/50">{diagResult.serviceRoleKey.details}</p>
              </div>

              {/* RESEND_API_KEY */}
              <div
                className="p-4 rounded-xl text-xs border"
                style={
                  diagResult.resendKey.ok
                    ? { background: "rgba(34,197,94,0.08)", borderColor: "rgba(34,197,94,0.25)" }
                    : diagResult.resendKey.tested
                      ? { background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.25)" }
                      : { background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }
                }
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${diagResult.resendKey.ok ? "bg-emerald-500/20" : diagResult.resendKey.tested ? "bg-red-500/20" : "bg-white/10"}`}>
                    {diagResult.resendKey.ok ? (
                      <i className="ri-check-line text-emerald-400 text-xs" />
                    ) : diagResult.resendKey.tested ? (
                      <i className="ri-close-line text-red-400 text-xs" />
                    ) : (
                      <i className="ri-more-line text-white/30 text-xs" />
                    )}
                  </div>
                  <span className="font-semibold text-white">RESEND_API_KEY</span>
                  <span className={`ml-auto font-bold ${diagResult.resendKey.ok ? "text-emerald-400" : "text-red-400"}`}>
                    {diagResult.resendKey.ok ? "OK" : "FALHA"}
                  </span>
                </div>
                <p className="text-white/50">{diagResult.resendKey.details}</p>
              </div>

              {/* Raw Debug */}
              <div className="pt-2">
                <button
                  onClick={() => setShowRawDebug(!showRawDebug)}
                  className="text-xs text-white/30 hover:text-white/60 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <i className={showRawDebug ? "ri-arrow-up-s-line" : "ri-arrow-down-s-line"} />
                  {showRawDebug ? "Ocultar resposta bruta" : "Mostrar resposta bruta (debug)"}
                </button>
                {showRawDebug && (
                  <div className="mt-2 space-y-2">
                    {rawDebug.serviceKey && (
                      <div className="p-3 rounded-xl overflow-x-auto" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <p className="text-white/30 text-xs font-semibold mb-1">diagnose-service-key response:</p>
                        <pre className="text-white/40 text-xs">{JSON.stringify(rawDebug.serviceKey, null, 2)}</pre>
                      </div>
                    )}
                    {rawDebug.resendKey && (
                      <div className="p-3 rounded-xl overflow-x-auto" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <p className="text-white/30 text-xs font-semibold mb-1">diagnose-resend-key response:</p>
                        <pre className="text-white/40 text-xs">{JSON.stringify(rawDebug.resendKey, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Setup de Senhas */}
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "linear-gradient(135deg, #E8A020, #f5b94a)" }}>
            <i className="ri-settings-line text-white text-2xl" />
          </div>
          <h1 className="text-white font-extrabold text-2xl">Setup Inicial</h1>
          <p className="text-white/50 text-sm mt-1">Resetar senhas dos usuários padrões para compatibilidade com Supabase Auth</p>
        </div>

        <div className="rounded-3xl p-8 backdrop-blur-xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          {!done ? (
            <>
              <div className="mb-6 p-4 rounded-xl" style={{ background: "rgba(232,160,32,0.10)", border: "1px solid rgba(232,160,32,0.25)" }}>
                <p className="text-sm font-semibold mb-3" style={{ color: "#E8A020" }}>Usuários que serão atualizados:</p>
                <ul className="space-y-2">
                  {USERS_LIST.map((u) => (
                    <li key={u.email} className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
                      <strong className="text-white">{u.tipo}:</strong>{" "}
                      <span style={{ color: "rgba(255,255,255,0.6)" }}>{u.email}</span>{" "}
                      <span className="ml-1" style={{ color: "#E8A020" }}>· {u.senha}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {error && (
                <div className="mb-4 p-4 rounded-xl text-xs break-all" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}>
                  <p className="font-bold mb-1" style={{ color: "#ef4444" }}>Erro:</p>
                  {error}
                </div>
              )}

              <button
                onClick={runSetup}
                disabled={loading}
                className="w-full py-3.5 font-bold text-sm rounded-xl transition-all disabled:opacity-50 cursor-pointer whitespace-nowrap"
                style={{ background: "linear-gradient(135deg, #E8A020, #f5b94a)", color: "#0D1629" }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 rounded-full animate-spin inline-block" style={{ borderColor: "rgba(0,0,0,0.2)", borderTopColor: "#0D1629" }} />
                    Atualizando senhas...
                  </span>
                ) : "Executar Setup"}
              </button>
            </>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-5">
                <i className="ri-checkbox-circle-fill text-emerald-400 text-xl" />
                <p className="text-white font-bold">Setup concluído!</p>
              </div>
              <div className="space-y-2 mb-6">
                {results.map((r) => (
                  <div
                    key={r.email}
                    className="p-3 rounded-xl border"
                    style={
                      r.status === "error" || r.status === "update_error" || r.status === "create_error" || r.status === "exception"
                        ? { background: "rgba(239,68,68,0.1)", borderColor: "rgba(239,68,68,0.2)" }
                        : { background: "rgba(34,197,94,0.1)", borderColor: "rgba(34,197,94,0.2)" }
                    }
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: "rgba(255,255,255,0.8)" }}>{r.email}</span>
                      <span
                        className="text-xs font-semibold"
                        style={
                          r.status === "error" || r.status === "update_error" || r.status === "create_error" || r.status === "exception"
                            ? { color: "#ef4444" }
                            : { color: "#22c55e" }
                        }
                      >
                        {r.status === "updated" ? "Atualizado" : r.status === "created" ? "Criado" : "Erro"}
                      </span>
                    </div>
                    {r.error && (
                      <p className="text-xs mt-1 break-all" style={{ color: "#f87171" }}>{r.error}</p>
                    )}
                  </div>
                ))}
              </div>
              <Link
                to="/auth"
                className="flex items-center justify-center gap-2 w-full py-3 font-semibold text-sm rounded-xl transition-all whitespace-nowrap"
                style={{ background: "linear-gradient(135deg, #E8A020, #f5b94a)", color: "#0D1629" }}
              >
                <i className="ri-login-box-line" />
                Ir para o Login
              </Link>
            </div>
          )}
        </div>

        {/* Testar Resend com envio real */}
        <div className="rounded-3xl p-8 backdrop-blur-xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(59,191,212,0.15)" }}>
              <i className="ri-mail-send-line text-sm" style={{ color: "#3BBFD4" }} />
            </div>
            <div>
              <h2 className="text-white font-bold text-sm">Enviar Email de Teste</h2>
              <p className="text-white/40 text-xs">Envia um email real pelo Resend para confirmar tudo</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 mb-4">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Digite um e-mail para teste"
              className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none transition-all"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
            />
            <button
              onClick={testResend}
              disabled={resendLoading || !testEmail.trim()}
              className="w-full py-3 font-semibold text-sm rounded-xl transition-all disabled:opacity-50 cursor-pointer whitespace-nowrap"
              style={{ background: "rgba(59,191,212,0.15)", border: "1px solid rgba(59,191,212,0.3)", color: "#3BBFD4" }}
            >
              {resendLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 rounded-full animate-spin inline-block" style={{ borderColor: "rgba(59,191,212,0.2)", borderTopColor: "#3BBFD4" }} />
                  Enviando...
                </span>
              ) : "Enviar Email de Teste"}
            </button>
          </div>

          {resendError && (
            <div className="p-3 rounded-xl text-xs break-all mb-3" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}>
              <p className="font-bold mb-1" style={{ color: "#ef4444" }}>Erro:</p>
              {resendError}
            </div>
          )}

          {resendResult && (
            <div
              className="p-3 rounded-xl text-xs border mb-3"
              style={
                resendResult.success
                  ? { background: "rgba(34,197,94,0.1)", borderColor: "rgba(34,197,94,0.2)" }
                  : { background: "rgba(239,68,68,0.1)", borderColor: "rgba(239,68,68,0.2)" }
              }
            >
              <div className="flex items-center gap-2 mb-1">
                <i className={resendResult.success ? "ri-checkbox-circle-fill text-emerald-400" : "ri-close-circle-fill text-red-400"} />
                <span className="font-semibold" style={{ color: resendResult.success ? "#22c55e" : "#ef4444" }}>
                  {resendResult.success ? "Email enviado!" : "Falha no envio"}
                </span>
              </div>
              <p className="text-white/70">{resendResult.message}</p>
              {resendResult.resendConfigured === false && (
                <p className="mt-2 text-white/50">
                  <strong>Como configurar:</strong> Acesse o painel do Supabase → Settings → Edge Functions → Secrets → Adicione <code className="text-[#3BBFD4]">RESEND_API_KEY</code> com a chave da sua conta Resend.
                </p>
              )}
              {resendResult.resendConfigured === true && resendResult.emailSent === false && resendResult.error && (
                <p className="mt-2 text-white/50 break-all">
                  <strong>Detalhe do erro:</strong> {JSON.stringify(resendResult.error)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* 🧪 Teste de Email de Notícia com Preview */}
        <div className="rounded-3xl p-8 backdrop-blur-xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(249,115,22,0.15)" }}>
              <i className="ri-newspaper-line text-sm" style={{ color: "#F97316" }} />
            </div>
            <div>
              <h2 className="text-white font-bold text-sm">Teste de Email de Notícia</h2>
              <p className="text-white/40 text-xs">Visualize como os usuários recebem notícias por e-mail com preview e link</p>
            </div>
          </div>

          {/* Selecionar notícia */}
          <div className="mb-3">
            <label className="text-white/60 text-xs font-semibold mb-1.5 block">Selecione a notícia:</label>
            {newsList.length === 0 && !newsLoading ? (
              <button
                onClick={fetchNews}
                className="w-full py-3 font-semibold text-sm rounded-xl transition-all cursor-pointer whitespace-nowrap"
                style={{ background: "rgba(249,115,22,0.10)", border: "1px solid rgba(249,115,22,0.25)", color: "#F97316" }}
              >
                📋 Carregar notícias publicadas
              </button>
            ) : newsLoading ? (
              <div className="flex items-center justify-center py-4">
                <span className="w-5 h-5 border-2 rounded-full animate-spin inline-block" style={{ borderColor: "rgba(249,115,22,0.2)", borderTopColor: "#F97316" }} />
                <span className="text-white/40 text-xs ml-2">Carregando...</span>
              </div>
            ) : (
              <select
                value={selectedNewsSlug}
                onChange={(e) => setSelectedNewsSlug(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all cursor-pointer"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                <option value="" style={{ color: "#000" }}>-- Selecione uma notícia --</option>
                {newsList.map((n) => (
                  <option key={n.id} value={n.slug} style={{ color: "#000" }}>
                    {n.category ? `[${n.category}] ` : ""}{n.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Preview da notícia selecionada */}
          {selectedNewsSlug && (() => {
            const selected = newsList.find(n => n.slug === selectedNewsSlug);
            if (!selected) return null;
            return (
              <div className="mb-4 p-4 rounded-xl" style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.15)" }}>
                <p className="text-white/80 font-semibold text-sm mb-1">{selected.title}</p>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(249,115,22,0.15)", color: "#F97316" }}>
                    {selected.category}
                  </span>
                </div>
                {selected.summary && (
                  <p className="text-white/50 text-xs line-clamp-2">{selected.summary}</p>
                )}
                {selected.image_url && (
                  <div className="mt-2 w-full h-20 rounded-lg overflow-hidden">
                    <img src={selected.image_url} alt={selected.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <p className="text-white/30 text-xs mt-2 flex items-center gap-1">
                  <i className="ri-link"></i>
                  Link: /noticias/{selected.slug}
                </p>
              </div>
            );
          })()}

          {/* Email input + send button */}
          <div className="flex flex-col gap-3 mb-3">
            <input
              type="email"
              value={newsTestEmail}
              onChange={(e) => setNewsTestEmail(e.target.value)}
              placeholder="Digite o e-mail de destino"
              className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none transition-all"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
            />
            <button
              onClick={sendNewsPreview}
              disabled={newsSending || !selectedNewsSlug || !newsTestEmail.trim()}
              className="w-full py-3 font-semibold text-sm rounded-xl transition-all disabled:opacity-50 cursor-pointer whitespace-nowrap"
              style={{ background: "linear-gradient(135deg, #F97316, #FB923C)", color: "#fff" }}
            >
              {newsSending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 rounded-full animate-spin inline-block" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#fff" }} />
                  Enviando...
                </span>
              ) : "📨 Enviar Preview de Email"}
            </button>
          </div>

          {newsResult && (
            <div
              className="p-4 rounded-xl text-xs border"
              style={
                newsResult.success
                  ? { background: "rgba(34,197,94,0.1)", borderColor: "rgba(34,197,94,0.2)" }
                  : { background: "rgba(239,68,68,0.1)", borderColor: "rgba(239,68,68,0.2)" }
              }
            >
              <div className="flex items-center gap-2 mb-1">
                <i className={newsResult.success ? "ri-checkbox-circle-fill text-emerald-400 text-lg" : "ri-close-circle-fill text-red-400 text-lg"} />
                <span className="font-semibold" style={{ color: newsResult.success ? "#22c55e" : "#ef4444" }}>
                  {newsResult.success ? "Email enviado com sucesso!" : "Falha no envio"}
                </span>
              </div>
              <p className="text-white/70">{newsResult.message}</p>
              {newsResult.newsTitle && (
                <p className="text-white/50 mt-1">Notícia: {newsResult.newsTitle}</p>
              )}
              {newsResult.resendId && (
                <p className="text-white/30 mt-1">Resend ID: {newsResult.resendId}</p>
              )}
              {newsResult.success && (
                <div className="mt-3 p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <p className="text-white/60 text-xs mb-1">
                    <i className="ri-eye-line"></i> O e-mail contém:
                  </p>
                  <ul className="text-white/40 text-xs space-y-0.5">
                    <li>• Título e categoria da notícia</li>
                    <li>• Imagem de capa (se houver)</li>
                    <li>• Resumo/preview da notícia</li>
                    <li>• Botão &quot;Ler notícia completa →&quot; com link direto</li>
                    <li>• Link alternativo para acesso direto</li>
                    <li>• Data de publicação e autor</li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
          Esta página é apenas para configuração inicial do sistema
        </p>
      </div>
    </div>
  );
}