import { useState, useEffect, useRef } from "react";
import { getEdgeFunctionUrl, supabaseAnonKey } from "@/lib/supabase";

interface DiagResult {
  success: boolean;
  summary: {
    totalSteps: number;
    passed: number;
    warnings: number;
    failed: number;
    skipped: number;
    overallStatus: string;
    duration: string;
  };
  steps: {
    step: number;
    name: string;
    status: "pass" | "fail" | "warn" | "info" | "skipped";
    detail: string;
    fix?: string | null;
    logs?: string[];
  }[];
  generalFixes: string[];
  error?: string;
}

export default function EmailDiagnosticsPanel() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<DiagResult | null>(null);
  const [error, setError] = useState("");
  const [resendRunning, setResendRunning] = useState(false);
  const [resendResult, setResendResult] = useState<{ sent: number; skipped: number; failed: number; msg: string } | null>(null);
  const didRunRef = useRef(false);

  const runDiagnostic = async () => {
    setRunning(true);
    setError("");
    setResult(null);

    try {
      const edgeFnUrl = getEdgeFunctionUrl("diagnose-email");
      const res = await fetch(edgeFnUrl, {
        method: "POST",
        headers: {
          apikey: supabaseAnonKey,
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      setResult(data as DiagResult);

      if (!data.success) {
        setError(data.error || "Erro ao executar diagnóstico");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro de conexão com a Edge Function");
    } finally {
      setRunning(false);
    }
  };

  const runResendPending = async () => {
    setResendRunning(true);
    setResendResult(null);
    try {
      const edgeFnUrl = getEdgeFunctionUrl("resend-pending-notifications");
      const res = await fetch(edgeFnUrl, {
        method: "POST",
        headers: {
          apikey: supabaseAnonKey,
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      if (data.success) {
        setResendResult({
          sent: data.sent,
          skipped: data.skipped,
          failed: data.failed,
          msg: `${data.sent} email(s) enviado(s), ${data.skipped} ignorado(s), ${data.failed} falha(s).`,
        });
      } else {
        setResendResult({ sent: 0, skipped: 0, failed: 0, msg: `Erro: ${data.error || "Falha desconhecida"}` });
      }
    } catch (err) {
      setResendResult({ sent: 0, skipped: 0, failed: 0, msg: err instanceof Error ? err.message : "Erro de conexão" });
    } finally {
      setResendRunning(false);
    }
  };

  useEffect(() => {
    if (!didRunRef.current) {
      didRunRef.current = true;
      runDiagnostic();
    }
  }, []);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-foreground-950 font-extrabold text-lg flex items-center gap-2">
            <i className="ri-mail-check-line text-amber-500"></i>
            Diagnóstico de Email
          </h2>
          <p className="text-foreground-600 text-xs mt-0.5">Verifica toda a infraestrutura de envio de emails do sistema</p>
        </div>
        <button
          onClick={runDiagnostic}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold cursor-pointer whitespace-nowrap disabled:opacity-50 bg-gradient-to-r from-amber-500 to-amber-400"
        >
          {running ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Diagnosticando...
            </>
          ) : (
            <>
              <i className="ri-refresh-line"></i> Executar Diagnóstico
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
          <i className="ri-error-warning-line mt-0.5 shrink-0"></i>
          <span>{error}</span>
        </div>
      )}

      {/* Resend Pending Button */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center gap-2 mb-3">
          <i className="ri-send-plane-fill text-green-500"></i>
          <h3 className="text-gray-900 font-bold text-sm">Enviar Emails Pendentes</h3>
        </div>
        <p className="text-gray-500 text-xs mb-3">
          Envia automaticamente todos os emails de notificações que ainda não foram enviados.
          Apenas usuários com email real confirmado e curriculum cadastrado recebem.
        </p>
        <button
          onClick={runResendPending}
          disabled={resendRunning}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold cursor-pointer whitespace-nowrap disabled:opacity-50 bg-gradient-to-r from-green-600 to-green-500"
        >
          {resendRunning ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Enviando...
            </>
          ) : (
            <>
              <i className="ri-send-plane-fill"></i> Enviar Emails Pendentes
            </>
          )}
        </button>
        {resendResult && (
          <div className={`mt-3 p-3 rounded-xl text-sm flex items-start gap-2 ${resendResult.sent > 0 ? "bg-green-50 border border-green-200 text-green-700" : "bg-amber-50 border border-amber-200 text-amber-700"}`}>
            <i className={`${resendResult.sent > 0 ? "ri-checkbox-circle-fill" : "ri-information-fill"} mt-0.5 shrink-0`}></i>
            <span>{resendResult.msg}</span>
          </div>
        )}
      </div>

      {result && (
        <>
          <div
            className="rounded-2xl p-5 text-white"
            style={{
              background: result.summary.overallStatus === "healthy"
                ? "linear-gradient(135deg, #065F46, #059669)"
                : result.summary.overallStatus === "attention"
                  ? "linear-gradient(135deg, #92400E, #D97706)"
                  : "linear-gradient(135deg, #991B1B, #DC2626)",
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-xs font-bold uppercase tracking-wider">Status do Sistema de Email</p>
                <h3 className="text-2xl font-extrabold mt-1">
                  {result.summary.overallStatus === "healthy" ? "Saudável" : result.summary.overallStatus === "attention" ? "Atenção Necessária" : "Quebrado"}
                </h3>
              </div>
              <div className="text-right">
                <p className="text-white/50 text-xs">Executado em {result.summary.duration}</p>
              </div>
            </div>
            <div className="flex gap-4 mt-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-green-300"></span>
                <span className="text-sm font-semibold">{result.summary.passed} passos OK</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-300"></span>
                <span className="text-sm font-semibold">{result.summary.warnings} avisos</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-300"></span>
                <span className="text-sm font-semibold">{result.summary.failed} falhas</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2">
              <i className="ri-list-check text-gray-400"></i>
              <span className="text-gray-700 font-bold text-sm">Detalhamento dos Testes ({result.steps.length} passos)</span>
            </div>
            <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
              {result.steps.map((step) => {
                const sc = {
                  pass: { icon: "ri-checkbox-circle-fill", color: "#22C55E", bg: "rgba(34,197,94,0.10)", label: "OK" },
                  fail: { icon: "ri-close-circle-fill", color: "#EF4444", bg: "rgba(239,68,68,0.10)", label: "FALHA" },
                  warn: { icon: "ri-error-warning-fill", color: "#E8A020", bg: "rgba(232,160,32,0.10)", label: "AVISO" },
                  info: { icon: "ri-information-fill", color: "#3BBFD4", bg: "rgba(59,191,212,0.10)", label: "INFO" },
                  skipped: { icon: "ri-skip-forward-fill", color: "#9CA3AF", bg: "rgba(156,163,175,0.10)", label: "PULADO" },
                }[step.status] ?? { icon: "ri-skip-forward-fill", color: "#9CA3AF", bg: "rgba(156,163,175,0.10)", label: "PULADO" };
                return (
                  <div key={step.step} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: sc.bg }}>
                        <i className={`${sc.icon} text-base`} style={{ color: sc.color }}></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold uppercase text-gray-400">Passo {step.step}</span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                          <h4 className="text-gray-900 font-semibold text-sm">{step.name}</h4>
                        </div>
                        <p className="text-gray-600 text-sm leading-relaxed">{step.detail}</p>
                        {step.logs && step.logs.length > 0 && (
                          <details className="mt-2">
                            <summary className="text-xs text-gray-400 cursor-pointer font-semibold">Logs da Edge Function</summary>
                            <div className="mt-1 p-2 rounded-lg bg-gray-900 text-green-400 text-xs font-mono max-h-32 overflow-y-auto">
                              {step.logs.map((l, i) => <div key={i}>{l}</div>)}
                            </div>
                          </details>
                        )}
                        {step.fix && (
                          <div className="mt-2 p-3 rounded-xl flex items-start gap-2 bg-amber-50 border border-amber-200">
                            <i className="ri-lightbulb-line text-sm shrink-0 mt-0.5 text-amber-500"></i>
                            <span className="text-sm font-medium text-amber-800">{step.fix}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {result.generalFixes && result.generalFixes.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                <i className="ri-tools-line text-gray-400"></i>
                <span className="text-gray-700 font-bold text-sm">Guia de Correção Geral</span>
              </div>
              <div className="p-4 space-y-3">
                {result.generalFixes.map((fix, i) => (
                  <div key={i} className="p-4 rounded-xl flex items-start gap-3 bg-amber-50 border border-amber-100">
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-bold text-sm bg-amber-100 text-amber-600">{i + 1}</span>
                    <p className="text-sm text-amber-900 font-medium leading-relaxed">{fix}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!result && running && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-12 h-12 border-3 rounded-full animate-spin mx-auto mb-4 border-amber-300 border-t-amber-500"></div>
            <p className="text-gray-500 font-semibold">Executando diagnóstico completo...</p>
            <p className="text-gray-400 text-xs mt-1">Verificando Resend, Supabase, Edge Functions e mais</p>
          </div>
        </div>
      )}
    </div>
  );
}