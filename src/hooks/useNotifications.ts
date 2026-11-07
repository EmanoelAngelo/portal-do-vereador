import { useState, useEffect, useCallback, useRef } from "react";
import { supabase, supabaseAnonKey, supabaseUrl, getEdgeFunctionUrl, fetchREST, insertREST, patchREST } from "@/lib/supabase";

export interface Notificacao {
  id: string;
  user_id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  remetente_id: string | null;
  remetente_nome: string | null;
  referencia_id: string | null;
  referencia_tipo: string | null;
  lida: boolean;
  email_enviado: boolean;
  email_enviado_em: string | null;
  created_at: string;
}

const TIPO_ICONS: Record<string, string> = {
  candidatura: "ri-send-plane-line",
  candidatura_enviada: "ri-send-plane-line",
  candidatura_recusada: "ri-close-circle-line",
  curriculo_criado: "ri-file-user-line",
  mensagem: "ri-chat-3-line",
  demanda: "ri-file-list-line",
  novo_usuario: "ri-user-add-line",
  noticia: "ri-newspaper-line",
  aprovacao: "ri-checkbox-circle-line",
  cadastro_concluido: "ri-user-star-line",
  vaga: "ri-briefcase-4-line",
  vaga_criada: "ri-add-circle-line",
  vaga_excluida: "ri-delete-bin-line",
  vaga_status: "ri-time-line",
  usuario_excluido: "ri-user-unfollow-line",
  chat: "ri-message-3-line",
  default: "ri-notification-3-line",
};

const TIPO_COLORS: Record<string, string> = {
  candidatura: "#3BBFD4",
  candidatura_enviada: "#3BBFD4",
  candidatura_recusada: "#F87171",
  curriculo_criado: "#22C55E",
  mensagem: "#22C55E",
  demanda: "#E8A020",
  novo_usuario: "#A78BFA",
  noticia: "#F97316",
  aprovacao: "#22C55E",
  cadastro_concluido: "#3BBFD4",
  vaga: "#3BBFD4",
  vaga_criada: "#22C55E",
  vaga_excluida: "#EF4444",
  vaga_status: "#E8A020",
  usuario_excluido: "#EF4444",
  chat: "#22C55E",
  default: "#E8A020",
};

export function getNotificacaoIcon(tipo: string): string {
  return TIPO_ICONS[tipo] ?? TIPO_ICONS.default;
}

export function getNotificacaoColor(tipo: string): string {
  return TIPO_COLORS[tipo] ?? TIPO_COLORS.default;
}

export function timeAgoNotification(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function isNotificacaoVisivel(_n: Notificacao): boolean {
  // REGRA DE OURO: Todas as notificações são visíveis no histórico.
  // O fetch já limita a 50 itens (order by created_at desc).
  // Marcar como lida só zera o contador do badge vermelho — o histórico permanece.
  return true;
}

export function useNotifications(userId: string | null) {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const [loading, setLoading] = useState(false);
  const lastFetchRef = useRef<string>("");

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      let list: Notificacao[] = [];

      // Método 1: Edge function (bypass RLS, mais confiável com service role key)
      try {
        const edgeFnUrl = getEdgeFunctionUrl("get-notifications-by-user");
        const res = await fetch(edgeFnUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: supabaseAnonKey,
          },
          body: JSON.stringify({ userId }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.notifications)) {
            list = data.notifications as Notificacao[];
          }
        }
      } catch (edgeErr) {
        console.warn("[useNotifications] Edge function fetch failed, using REST fallback:", edgeErr);
      }

      // Método 2: REST API direta (fallback, bypass auth state do Supabase client)
      if (list.length === 0) {
        list = await fetchREST<Notificacao>("notificacoes", {
          "user_id": `eq.${userId}`,
          "order": "created_at.desc",
          "limit": "50",
        });
      }

      const visiveis = list.filter(isNotificacaoVisivel);
      setNotificacoes(visiveis);
      setNaoLidas(visiveis.filter((n) => !n.lida).length);
    } catch (_) {
      /* silent */
    }
  }, [userId]);

  const marcarComoLida = useCallback(async (id: string) => {
    if (!userId) return;
    try {
      await supabase.from("notificacoes").update({ lida: true }).eq("id", id).eq("user_id", userId);
      setNotificacoes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, lida: true } : n))
      );
      setNaoLidas((prev) => Math.max(0, prev - 1));
    } catch (_) {
      /* silent */
    }
  }, [userId]);

  const marcarTodasComoLidas = useCallback(async () => {
    if (!userId) return;
    try {
      // Usa o cliente Supabase autenticado (MESMO padrão do marcarComoLida individual)
      // patchREST com anon key NÃO tem permissão RLS para UPDATE na tabela notificacoes
      const { error } = await supabase
        .from("notificacoes")
        .update({ lida: true })
        .eq("user_id", userId)
        .eq("lida", false);
      if (error) {
        console.error("[marcarTodasComoLidas] Erro ao marcar como lidas:", error.message);
        return;
      }
      setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
      setNaoLidas(0);
      // Sincroniza com o servidor para garantir que o polling nao sobrescreva
      fetchNotifications();
    } catch (_) {
      /* silent */
    }
  }, [userId, fetchNotifications]);

  useEffect(() => {
    if (!userId) {
      setNotificacoes([]);
      setNaoLidas(0);
      return;
    }
    // Carrega notificações uma vez ao montar
    fetchNotifications();

    // Realtime: atualiza automaticamente quando novas notificações chegam
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notificacoes",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Recarrega tudo — o fetch já lida com cache e dedup
          fetchNotifications();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("[useNotifications] Realtime subscribed for", userId);
        } else if (status === "CHANNEL_ERROR") {
          console.warn("[useNotifications] Realtime channel error, polling fallback ativo");
        }
      });

    // Fallback de segurança a cada 30s (se Realtime falhar por qualquer motivo)
    const safetyInterval = setInterval(fetchNotifications, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(safetyInterval);
    };
  }, [userId, fetchNotifications]);

  return {
    notificacoes,
    naoLidas,
    loading,
    marcarComoLida,
    marcarTodasComoLidas,
    refetch: fetchNotifications,
  };
}

/** Verifica se um usuario deve receber email (email real + curriculo cadastrado) */
export async function verificarEmailPermitido(userId: string): Promise<{ email: string | null; shouldSend: boolean }> {
  try {
    // Buscar profile do usuario (email + curriculo) — funciona no frontend com anon key
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("email, curriculo_pdf, role")
      .eq("id", userId)
      .single();

    if (error || !profile?.email) {
      console.log("[verificarEmailPermitido] Profile nao encontrado ou sem email para userId:", userId);
      return { email: null, shouldSend: false };
    }

    const email = profile.email;

    // Verificar se eh email fake
    const isFake = email.includes("teste") || email.includes("fake") || email.includes("example");
    if (isFake) {
      console.log("[verificarEmailPermitido] Email fake detectado:", email);
      return { email, shouldSend: false };
    }

    // Apenas cidadaos precisam ter curriculo cadastrado.
    // Assessor, vereador, admin e empresa so precisam de email real confirmado.
    const isCitizen = profile.role === "cidadao" || profile.role === "citizen";
    if (isCitizen) {
      const hasCurriculo = !!(profile.curriculo_pdf && profile.curriculo_pdf.length > 5);
      console.log("[verificarEmailPermitido] userId:", userId, "role: citizen, email:", email, "hasCurriculo:", hasCurriculo, "shouldSend:", hasCurriculo);
      return { email, shouldSend: hasCurriculo };
    }

    // Nao-cidadao com email real: pode receber sempre
    console.log("[verificarEmailPermitido] userId:", userId, "role:", profile.role, "email:", email, "shouldSend: true (non-citizen)");
    return { email, shouldSend: true };
  } catch (err) {
    console.error("[verificarEmailPermitido] error:", err);
    return { email: null, shouldSend: false };
  }
}

/** Envia notificação por e-mail para um usuário */
export async function enviarEmailNotificacao(
  userId: string,
  tipo: string,
  titulo: string,
  mensagem: string,
  opts?: {
    remetenteNome?: string | null;
    panelUrl?: string;
    recipientEmail?: string | null;
    vagaCreatedAt?: string | null;
  }
) {
  const MAX_RETRIES = 2;
  let lastError: string | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const edgeFnUrl = getEdgeFunctionUrl("send-email-notification");
      const res = await fetch(edgeFnUrl, {
        method: "POST",
        headers: {
          apikey: supabaseAnonKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          type: tipo,
          subject: titulo,
          data: {
            title: titulo,
            message: mensagem,
            sender: opts?.remetenteNome ?? "Sistema Arthur Halal",
            panel_url: opts?.panelUrl ?? "https://emanuel.shop",
            date: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
            type_label: tipo,
            vaga_created_at: opts?.vagaCreatedAt ?? "",
          },
          recipientEmail: opts?.recipientEmail || undefined,
        }),
        signal: AbortSignal.timeout(12000),
      });
      const result = await res.json();
      if (!res.ok) {
        console.error(`[Email Notification] Error (attempt ${attempt + 1}/${MAX_RETRIES + 1}):`, result.error);
        lastError = result.error || `HTTP ${res.status}`;
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
      } else {
        console.log("[Email Notification] Sent OK to userId:", userId, "type:", tipo, "id:", result.id);
      }
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Email Notification] Exception (attempt ${attempt + 1}/${MAX_RETRIES + 1}):`, msg);
      lastError = msg;
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
    }
  }

  console.error("[Email Notification] ALL RETRIES FAILED. Last error:", lastError);
  return { success: false, error: lastError || "Todas as tentativas falharam", id: null };
}

async function updateEmailStatusViaEdgeFunction(notifId: string, enviado: boolean): Promise<boolean> {
  try {
    const edgeFnUrl = getEdgeFunctionUrl("update-notification-email-status");
    const res = await fetch(edgeFnUrl, {
      method: "POST",
      headers: {
        apikey: supabaseAnonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        notifId,
        emailEnviado: enviado,
        emailEnviadoEm: new Date().toISOString(),
      }),
    });
    const data = await res.json();
    if (data.success) {
      console.log("[updateEmailStatus] Updated via edge function:", notifId, "enviado:", enviado);
      return true;
    } else {
      console.error("[updateEmailStatus] Edge function error:", data.error);
      return false;
    }
  } catch (err) {
    console.error("[updateEmailStatus] Exception:", err);
    return false;
  }
}

/** Processa o envio de email de uma notificação usando a edge function server-side (bypass RLS) */
async function processarEmailNotificacaoEdge(notifId: string): Promise<{ sent: boolean; reason?: string; logs?: string[] }> {
  try {
    const edgeFnUrl = getEdgeFunctionUrl("processar-email-notificacao");
    const res = await fetch(edgeFnUrl, {
      method: "POST",
      headers: {
        apikey: supabaseAnonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ notifId }),
    });
    const data = await res.json();
    console.log("[processarEmailNotificacao] Result for", notifId, ":", data);
    return { sent: data.sent === true, reason: data.reason, logs: data.logs };
  } catch (err) {
    console.error("[processarEmailNotificacao] Exception:", err);
    return { sent: false, reason: "exception" };
  }
}

export async function criarNotificacao(
  userId: string,
  tipo: string,
  titulo: string,
  mensagem: string,
  remetenteId?: string | null,
  remetenteNome?: string | null,
  referenciaId?: string | null,
  referenciaTipo?: string | null,
  opts?: {
    recipientEmail?: string | null;
    vagaCreatedAt?: string | null;
  }
) {
  let notifId: string | null = null;

  // Método 1: RPC (insert_notification via Supabase client)
  try {
    const { data, error } = await supabase.rpc("insert_notification", {
      p_user_id: userId,
      p_tipo: tipo,
      p_titulo: titulo,
      p_mensagem: mensagem,
      p_remetente_id: remetenteId ?? null,
      p_remetente_nome: remetenteNome ?? null,
      p_referencia_id: referenciaId ?? null,
      p_referencia_tipo: referenciaTipo ?? null,
    });
    if (!error && data) {
      notifId = data as string;
      console.log("[criarNotificacao] Created via RPC, id:", notifId, "for userId:", userId, "tipo:", tipo);
    } else if (error) {
      console.warn("[criarNotificacao] RPC failed, trying REST API:", error.message || error);
    }
  } catch (rpcErr) {
    console.warn("[criarNotificacao] RPC exception, trying REST API:", rpcErr);
  }

  // Método 2: REST API direta (fallback, bypass auth state)
  if (!notifId) {
    try {
      const inserted = await insertREST<{ id: string }>("notificacoes", {
        user_id: userId,
        tipo,
        titulo,
        mensagem,
        remetente_id: remetenteId ?? null,
        remetente_nome: remetenteNome ?? null,
        referencia_id: referenciaId ?? null,
        referencia_tipo: referenciaTipo ?? null,
        lida: false,
      });
      if (inserted?.id) {
        notifId = inserted.id;
        console.log("[criarNotificacao] Created via REST API, id:", notifId, "for userId:", userId, "tipo:", tipo);
      } else {
        console.error("[criarNotificacao] Both RPC and REST API failed for userId:", userId, "tipo:", tipo);
        return;
      }
    } catch (restErr) {
      console.error("[criarNotificacao] REST API exception:", restErr);
      return;
    }
  }

  // Verificar se deve enviar email (email real + curriculo)
  const { email, shouldSend } = await verificarEmailPermitido(userId);
  const recipientEmail = opts?.recipientEmail ?? email;

  if (shouldSend && recipientEmail) {
    // Delegar o envio de email para edge function server-side (bypass RLS)
    if (notifId) {
      try {
        const result = await processarEmailNotificacaoEdge(notifId);
        console.log("[criarNotificacao] Email processado para", notifId, "enviado:", result.sent, "motivo:", result.reason);
      } catch (emailErr) {
        console.error("[criarNotificacao] Erro ao processar email:", emailErr);
      }
    } else {
      console.log("[criarNotificacao] Sem notifId, pulando processamento de email para userId:", userId);
    }
  } else {
    console.log("[criarNotificacao] Email not sent for userId:", userId, "(no real email or no curriculo). Notif still created.");
    if (notifId) {
      try {
        await supabase
          .from("notificacoes")
          .update({ email_enviado: false, email_enviado_em: new Date().toISOString() })
          .eq("id", notifId);
      } catch (_) { /* silent */ }
    }
  }
}

export async function verificarNotificacaoExistente(
  userId: string,
  tipo: string,
  referenciaId: string | null,
  minutos: number = 60
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("check_notification_exists", {
      p_user_id: userId,
      p_tipo: tipo,
      p_referencia_id: referenciaId ?? null,
      p_minutos: minutos,
    });
    if (error) {
      console.error("[verificarNotificacaoExistente] rpc error:", error);
      return false;
    }
    return (data as boolean) ?? false;
  } catch (err) {
    console.error("[verificarNotificacaoExistente] exception:", err);
    return false;
  }
}

/** Notifica todos os usuários relevantes do sistema (admin, vereador, assessor, cidadão com curriculo) sobre um evento.
 *  Exclui o remetente da lista para evitar notificação duplicada.
 *  Apenas envia email se o usuário tiver email real confirmado e curriculo cadastrado.
 */
export async function notificarRelevantes(
  tipo: string,
  titulo: string,
  mensagem: string,
  opts?: {
    remetenteId?: string | null;
    remetenteNome?: string | null;
    referenciaId?: string | null;
    referenciaTipo?: string | null;
    excluirIds?: string[];
  }
) {
  try {
    console.log("[notificarRelevantes] INICIADO — tipo:", tipo, "titulo:", titulo, "ref:", opts?.referenciaId);
    
    // vaga_criada: inclui cidadãos com currículo + admin + vereador + assessor
    // noticia: inclui TODOS os usuários de todos os grupos (admin, vereador, assessor, cidadão, empresa)
    // demais tipos: apenas admin + vereador + assessor (sem cidadãos)
    const incluirTodos = tipo === "vaga_criada" || tipo === "noticia";
    const roles = incluirTodos
      ? ["admin", "vereador", "assessor", "citizen", "empresa"]
      : ["admin", "vereador", "assessor"];

    console.log("[notificarRelevantes] Roles alvo:", roles, "incluirTodos:", incluirTodos);

    // Busca profiles em lotes de 500 (paginação) para não explodir com milhares de usuários
    const BATCH_SIZE = 500;
    let offset = 0;
    let allProfiles: { id: string; email: string | null; role: string; curriculo_pdf?: string | null; job_status?: string | null; is_default_user?: boolean | null }[] = [];
    let hasMore = true;

    const selectFields = incluirTodos
      ? "id,email,role,curriculo_pdf,job_status,is_default_user"
      : "id,email,role,is_default_user";

    while (hasMore) {
      try {
        const batch = await fetchREST<{ id: string; email: string | null; role: string; curriculo_pdf?: string | null; job_status?: string | null; is_default_user?: boolean | null }>("profiles", {
          "select": selectFields,
          "limit": String(BATCH_SIZE),
          "offset": String(offset),
        });
        if (batch.length === 0) {
          hasMore = false;
        } else {
          allProfiles = allProfiles.concat(batch);
          offset += BATCH_SIZE;
          if (batch.length < BATCH_SIZE) hasMore = false;
        }
      } catch (batchErr) {
        console.error("[notificarRelevantes] Erro no batch offset:", offset, batchErr);
        hasMore = false; // Aborta em caso de erro no batch
      }
    }

    console.log("[notificarRelevantes] Total de profiles carregados:", allProfiles.length);

    let profiles = allProfiles;

    // Método 2: Supabase client (fallback, se REST falhar ou retornar vazio)
    if (profiles.length === 0) {
      console.log("[notificarRelevantes] fetchREST vazio, tentando Supabase client...");
      try {
        const selectFields = incluirTodos
          ? "id, email, role, curriculo_pdf, job_status, is_default_user"
          : "id, email, role, is_default_user";
        const { data, error: clientErr } = await supabase
          .from("profiles")
          .select(selectFields)
          .in("role", roles);
        if (clientErr) {
          console.error("[notificarRelevantes] Supabase client error:", clientErr);
        }
        profiles = (data as { id: string; email: string | null; role: string; curriculo_pdf?: string | null; job_status?: string | null; is_default_user?: boolean | null }[]) ?? [];
        console.log("[notificarRelevantes] Supabase client retornou", profiles.length, "profiles");
      } catch (clientErr) {
        console.error("[notificarRelevantes] Supabase client profiles exception:", clientErr);
      }
    }

    // Se ambos falharam, aborta
    if (profiles.length === 0) {
      console.error("[notificarRelevantes] NENHUM profile encontrado! Abortando notificações.");
      return;
    }

    // Filtra apenas os roles relevantes
    let filtered = profiles
      .filter((p) => roles.includes(p.role))
      .filter((p) => p.id !== (opts?.remetenteId ?? ""))
      .filter((p) => !(opts?.excluirIds ?? []).includes(p.id));

    console.log("[notificarRelevantes] Após filtro:", filtered.length, "usuários. Roles:", filtered.map(p => p.role));

    // Para vaga_criada: filtrar cidadãos sem currículo E cidadãos que NÃO estão procurando emprego
    // Para noticia: NÃO filtrar ninguém — todos os usuários cadastrados recebem
    if (tipo === "vaga_criada") {
      filtered = filtered.filter((p) => {
        if (p.role === "citizen" || p.role === "cidadao") {
          const temCurriculo = !!(p.curriculo_pdf && p.curriculo_pdf.length > 5);
          const estaProcurando = p.job_status !== "not_looking";
          return temCurriculo && estaProcurando;
        }
        return true;
      });
      console.log("[notificarRelevantes] Após filtro de currículo + job_status:", filtered.length, "usuários");
    } else if (tipo === "noticia") {
      // REGRA DE OURO: Notícia vai para TODOS os usuários cadastrados, sem filtro de currículo
      console.log("[notificarRelevantes] Notícia: sem filtro adicional — todos os", filtered.length, "usuários recebem");
    }

    // Tipos que NUNCA devem ser deduplicados — cada evento é único e o vereador precisa saber de cada um
    const semDedup = ["candidatura", "candidatura_recusada", "aprovacao", "mensagem", "chat", "noticia", "agenda_compromisso", "agenda_alterada", "agenda_cancelada", "vaga_status", "vaga_criada", "vaga_excluida", "vaga_pausada", "novo_usuario", "cadastro_concluido"];

    // Dispara todas as verificações e notificações ao mesmo tempo
    const resultados = await Promise.allSettled(
      filtered.map(async (profile) => {
        const uid = profile.id;
        console.log("[notificarRelevantes] Processando usuário:", uid, "role:", profile.role);
        
        // REGRA DE OURO PARA NOTÍCIA + VEREADOR DEFAULT:
        // Vereador com email padrão (is_default_user=true) recebe APENAS email, não notificação in-app
        if (tipo === "noticia" && profile.role === "vereador" && profile.is_default_user === true) {
          console.log("[notificarRelevantes] REGRA VEREADOR DEFAULT: enviando apenas email para", uid, "(sem notificação in-app)");
          const newsSlug = opts?.referenciaId || "";
          try {
            const edgeFnUrl = getEdgeFunctionUrl("send-news-email-preview");
            await fetch(edgeFnUrl, {
              method: "POST",
              headers: { apikey: supabaseAnonKey, "Content-Type": "application/json" },
              body: JSON.stringify({ email: profile.email, newsSlug }),
            });
            console.log("[notificarRelevantes] Email de notícia enviado para vereador default:", uid);
          } catch (err) {
            console.error("[notificarRelevantes] Falha ao enviar email para vereador default:", err);
          }
          return;
        }
        
        // PULA dedup para tipos onde cada evento é importante individualmente (ex: cada candidatura nova)
        if (!semDedup.includes(tipo)) {
          const existe = await verificarNotificacaoExistente(
            uid,
            tipo,
            opts?.referenciaId ?? null,
            60
          );
          if (existe) {
            console.log("[notificarRelevantes] Skipping duplicate for uid:", uid);
            return;
          }
        }

        await criarNotificacao(
          uid,
          tipo,
          titulo,
          mensagem,
          opts?.remetenteId ?? null,
          opts?.remetenteNome ?? null,
          opts?.referenciaId ?? null,
          opts?.referenciaTipo ?? null,
          { recipientEmail: profile.email }
        );
        console.log("[notificarRelevantes] Notificação criada para:", uid, "role:", profile.role);
      })
    );
    
    const sucessos = resultados.filter(r => r.status === "fulfilled").length;
    const falhas = resultados.filter(r => r.status === "rejected").length;
    console.log("[notificarRelevantes] CONCLUÍDO —", sucessos, "sucessos,", falhas, "falhas");
    
    if (falhas > 0) {
      resultados.filter(r => r.status === "rejected").forEach((r, i) => {
        console.error("[notificarRelevantes] Falha #" + (i+1) + ":", (r as PromiseRejectedResult).reason);
      });
    }
  } catch (err) {
    console.error("[notificarRelevantes] EXCEÇÃO FATAL:", err);
  }
}

/** Reenvia o email de uma notificação existente. */
export async function reenviarEmailNotificacao(
  notificacao: Notificacao,
  _recipientEmail?: string | null
): Promise<{ success: boolean; id?: string; error?: string; logs?: string[] } | null> {
  try {
    const result = await processarEmailNotificacaoEdge(notificacao.id);
    return { success: result.sent, error: result.sent ? undefined : (result.reason || "Falha ao enviar"), logs: result.logs };
  } catch (err) {
    console.error("[reenviarEmailNotificacao] Failed:", err);
    return null;
  }
}

/** Busca notificações por email usando edge function (bypass RLS) */
export async function buscarNotificacoesPorEmailEdge(
  email: string
): Promise<{ notifications: Notificacao[]; profile: { id: string; full_name: string } | null; error: string | null }> {
  try {
    const { data: profiles, error: profileErr } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .ilike("email", email)
      .limit(1);

    if (profileErr || !profiles || profiles.length === 0) {
      return { notifications: [], profile: null, error: "Perfil não encontrado com este email" };
    }

    const profile = profiles[0] as { id: string; email: string; full_name: string };

    const edgeFnUrl = getEdgeFunctionUrl("get-notifications-by-user");
    const res = await fetch(edgeFnUrl, {
      method: "POST",
      headers: {
        apikey: supabaseAnonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId: profile.id }),
    });
    const data = await res.json();

    if (!data.success) {
      return {
        notifications: [],
        profile: { id: profile.id, full_name: profile.full_name },
        error: data.error || "Erro ao buscar notificações",
      };
    }

    return {
      notifications: (data.notifications as Notificacao[]) ?? [],
      profile: { id: profile.id, full_name: profile.full_name },
      error: null,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { notifications: [], profile: null, error: msg };
  }
}