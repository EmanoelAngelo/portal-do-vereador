/**
 * DIAGNOSTIC INSTRUMENTATION — NAO ALTERA LOGICA NENHUMA
 * 
 * Este modulo intercepta chamadas a Edge Functions e captura:
 * - request_id unico
 * - URL exata chamada
 * - Payload enviado
 * - Status HTTP retornado
 * - Corpo completo da resposta
 * - Stack trace de erros
 * - Timestamps de cada etapa
 * 
 * USO: substitua `supabase.functions.invoke(nome, opts)` por `diagnoseInvoke(nome, opts)`
 * O comportamento e IDENTICO — apenas adiciona logging.
 */

import { supabase as supabaseInstance } from "@/lib/supabase";

let requestCounter = 0;

export interface DiagnosticEntry {
  requestId: string;
  functionName: string;
  url: string;
  timestamp: string;
  payload: unknown;
  status?: number;
  statusText?: string;
  responseBody?: unknown;
  errorName?: string;
  errorMessage?: string;
  errorStack?: string;
  errorContext?: unknown;
  durationMs: number;
  result: "ok" | "http_error" | "network_error" | "timeout" | "unknown";
}

export interface DiagnoseResult {
  data: unknown;
  error: unknown;
  /** SEMPRE preenchido — contem todos os detalhes da chamada */
  diagnostic: DiagnosticEntry;
}

// Armazena os ultimos 20 diagnosticos para inspecao
export const diagnosticLog: DiagnosticEntry[] = [];
const MAX_LOG = 20;

function pushLog(entry: DiagnosticEntry) {
  diagnosticLog.push(entry);
  if (diagnosticLog.length > MAX_LOG) diagnosticLog.shift();

  // Log estruturado no console
  const prefix = `[DIAG:${entry.requestId}]`;
  console.groupCollapsed(
    `${prefix} ${entry.functionName} → ${entry.result} (${entry.durationMs}ms)`
  );
  console.log("URL:", entry.url);
  console.log("Payload:", entry.payload);
  if (entry.status) console.log(`Status: ${entry.status} ${entry.statusText || ""}`);
  if (entry.responseBody !== undefined) console.log("Response Body:", entry.responseBody);
  if (entry.errorName) console.log("Error Name:", entry.errorName);
  if (entry.errorMessage) console.log("Error Message:", entry.errorMessage);
  if (entry.errorContext) console.log("Error Context:", entry.errorContext);
  if (entry.errorStack) console.log("Error Stack:", entry.errorStack);
  console.groupEnd();
}

function getEdgeFunctionUrl(functionName: string): string {
  const baseUrl = (import.meta.env.VITE_PUBLIC_SUPABASE_URL as string || "").replace(/\/$/, "");
  return `${baseUrl}/functions/v1/${functionName}`;
}

/**
 * Extrai o corpo de resposta do contexto de erro do Supabase.
 * Tenta .json() primeiro, depois .text(), depois nada.
 */
async function tryReadResponseBody(context: unknown): Promise<unknown> {
  if (!context || typeof context !== "object") return undefined;
  const ctx = context as Record<string, unknown>;
  try {
    if (typeof ctx.json === "function") {
      return await (ctx.json as () => Promise<unknown>)();
    }
  } catch { /* ignora */ }
  try {
    if (typeof ctx.text === "function") {
      const txt = await (ctx.text as () => Promise<string>)();
      // Tenta parsear como JSON mesmo do .text()
      try { return JSON.parse(txt); } catch { return txt.slice(0, 500); }
    }
  } catch { /* ignora */ }
  return undefined;
}

/**
 * Formata uma mensagem de erro legivel baseada no DiagnosticEntry.
 * Exibe: [funcao] HTTP XXX — corpo da resposta
 */
export function formatEdgeFunctionError(diag: DiagnosticEntry): string {
  const fn = diag.functionName;
  const status = diag.status ? `HTTP ${diag.status}` : "sem status";

  let bodyInfo = "";
  if (diag.responseBody) {
    if (typeof diag.responseBody === "object" && diag.responseBody !== null) {
      const b = diag.responseBody as Record<string, unknown>;
      // Campos comuns de erro em Edge Functions
      const msg = b.msg || b.error || b.message || "";
      if (msg) bodyInfo = ` — ${String(msg).slice(0, 200)}`;
    } else if (typeof diag.responseBody === "string") {
      bodyInfo = ` — ${diag.responseBody.slice(0, 200)}`;
    }
  }

  return `[${fn}] ${status}${bodyInfo}`;
}

/**
 * Wrapper DIAGNOSTICO para supabase.functions.invoke().
 * Comportamento IDENTICO ao original — apenas adiciona instrumentacao.
 * Agora retorna tambem o DiagnosticEntry para consumo direto.
 */
export async function diagnoseInvoke(
  functionName: string,
  options: { body?: unknown; headers?: Record<string, string> } = {}
): Promise<DiagnoseResult> {
  requestCounter++;
  const requestId = `req-${String(requestCounter).padStart(4, "0")}-${functionName}`;
  const url = getEdgeFunctionUrl(functionName);
  const startTime = performance.now();

  const entry: DiagnosticEntry = {
    requestId,
    functionName,
    url,
    timestamp: new Date().toISOString(),
    payload: options.body,
    durationMs: 0,
    result: "unknown",
  };

  console.log(`[DIAG:${requestId}] 🚀 START ${functionName} → ${url}`);
  console.log(`[DIAG:${requestId}] 📦 Payload:`, options.body);

  try {
    const { data, error } = await supabaseInstance.functions.invoke(functionName, options);

    entry.durationMs = Math.round(performance.now() - startTime);

    if (error) {
      // FunctionsHttpError ou FunctionsRelayError
      const errAny = error as any;
      entry.result = "http_error";
      entry.errorName = errAny?.name || "FunctionsError";
      entry.errorMessage = errAny?.message || String(error);
      entry.errorContext = errAny?.context;

      // Extrai status HTTP e corpo da resposta do contexto
      if (errAny?.context) {
        entry.status = errAny.context.status;
        entry.statusText = errAny.context.statusText;
        entry.responseBody = await tryReadResponseBody(errAny.context);
      }

      console.error(`[DIAG:${requestId}] ❌ HTTP ERROR`, {
        name: entry.errorName,
        message: entry.errorMessage,
        status: entry.status,
        context: entry.errorContext,
        responseBody: entry.responseBody,
      });
    } else {
      entry.result = "ok";
      entry.responseBody = data;
      entry.status = 200;
      console.log(`[DIAG:${requestId}] ✅ OK (${entry.durationMs}ms)`, data);
    }

    pushLog(entry);
    return { data, error, diagnostic: entry };
  } catch (err) {
    entry.durationMs = Math.round(performance.now() - startTime);

    const errAny = err as any;

    // Detecta FunctionsHttpError (edge function retornou 4xx/5xx)
    if (
      errAny?.name === "FunctionsHttpError" ||
      errAny?.message?.includes("non-2xx") ||
      errAny?.message?.includes("status code")
    ) {
      entry.result = "http_error";
      entry.errorName = errAny.name || "FunctionsHttpError";
      entry.errorMessage = errAny.message || String(err);

      // Tenta extrair status e corpo do contexto
      if (errAny?.context) {
        entry.status = errAny.context.status;
        entry.statusText = errAny.context.statusText;
      }
      if (errAny?.context && typeof errAny.context.status === "number") {
        entry.responseBody = await tryReadResponseBody(errAny.context);
      }
    } else if (err instanceof Error && err.message.includes("timeout")) {
      entry.result = "timeout";
      entry.errorName = err.name;
      entry.errorMessage = err.message;
    } else {
      entry.result = "network_error";
      entry.errorName = err instanceof Error ? err.name : "UnknownError";
      entry.errorMessage = err instanceof Error ? err.message : String(err);
    }

    entry.errorStack = err instanceof Error ? err.stack : undefined;

    console.error(`[DIAG:${requestId}] 💥 ${entry.result.toUpperCase()}`, {
      name: entry.errorName,
      message: entry.errorMessage,
      stack: entry.errorStack,
    });

    pushLog(entry);

    // NAO re-lanca — retorna o erro como parte do resultado,
    // igual ao invoke original faria se nao tivesse lancado
    return { data: null, error: err, diagnostic: entry };
  }
}

/**
 * Retorna o ultimo diagnostico para exibicao em tela (debug).
 */
export function getLastDiagnostic(): DiagnosticEntry | null {
  return diagnosticLog.length > 0 ? diagnosticLog[diagnosticLog.length - 1] : null;
}

/**
 * Retorna todos os diagnosticos em ordem cronologica.
 */
export function getAllDiagnostics(): DiagnosticEntry[] {
  return [...diagnosticLog];
}

/**
 * Limpa o log de diagnosticos.
 */
export function clearDiagnostics(): void {
  diagnosticLog.length = 0;
}