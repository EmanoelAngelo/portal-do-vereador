import { useState } from "react";
import { supabase } from "@/lib/supabase";

const VEREADOR_DEFAULT_EMAIL = "vereador@arthurhalal.com.br";
const VEREADOR_DEFAULT_PASS = "CONFIGURE_EM_AMBIENTE_DE_TESTE";

export default function CleanupPanel() {
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [activeOp, setActiveOp] = useState<string | null>(null);
  const [vereadorLoading, setVereadorLoading] = useState(false);
  const [vereadorResult, setVereadorResult] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const runCleanup = async (operation: "demands" | "chats" | "notifications") => {
    if (confirmText !== "DELETAR TUDO") {
      setResult({ type: "error", text: 'Digite "DELETAR TUDO" para confirmar.' });
      return;
    }

    setLoading(operation);
    setResult(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      if (operation === "demands") {
        const { data, error } = await supabase.functions.invoke("admin-delete-demands", { body: {} });
        if (error) throw new Error(error.message || "Erro na Edge Function.");
        const s = (data as { summary?: { demandasDeletadas: number; mensagensDeletadas: number; notificacoesDeletadas: number }; errors?: string[] });
        if (s.errors?.length) throw new Error(s.errors.join(", "));
        setResult({
          type: "success",
          text: `${s.summary?.demandasDeletadas ?? 0} demandas, ${s.summary?.mensagensDeletadas ?? 0} mensagens e ${s.summary?.notificacoesDeletadas ?? 0} notificações relacionadas removidas permanentemente.`,
        });
      } else if (operation === "chats") {
        const { data, error } = await supabase.functions.invoke("chat-admin-delete-all", { body: {} });
        if (error) throw new Error(error.message || "Erro na Edge Function.");
        const c = data as { success?: boolean; summary?: { mensagensDeletadas: number; conversasDeletadas: number; notificacoesDeletadas: number; imagensStorageLimpas: number }; errors?: string[] };
        if (!c.success) {
          throw new Error(c.errors?.join(", ") || "Erro desconhecido");
        }
        const s = c.summary ?? { mensagensDeletadas: 0, conversasDeletadas: 0, notificacoesDeletadas: 0, imagensStorageLimpas: 0 };
        setResult({
          type: "success",
          text: `${s.conversasDeletadas} conversas, ${s.mensagensDeletadas} mensagens e ${s.notificacoesDeletadas} notificações removidas permanentemente. ${s.imagensStorageLimpas} imagens do storage limpas.`,
        });
      } else if (operation === "notifications") {
        const { data, error } = await supabase.functions.invoke("admin-delete-notifications", { body: {} });
        if (error) throw new Error(error.message || "Erro na Edge Function.");
        const n = data as { summary?: { notificacoesDeletadas: number }; errors?: string[] };
        if (n.errors?.length) throw new Error(n.errors.join(", "));
        setResult({
          type: "success",
          text: `${n.summary?.notificacoesDeletadas ?? 0} notificações removidas permanentemente.`,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      if (err instanceof DOMException && err.name === "AbortError") {
        setResult({ type: "error", text: "Operação excedeu o tempo limite (30s). Tente novamente." });
      } else {
        setResult({ type: "error", text: `Erro: ${msg}` });
      }
    } finally {
      clearTimeout(timeout);
      setLoading(null);
      setActiveOp(null);
      setConfirmText("");
    }
  };

  const runResetDelivery = async () => {
    if (confirmText !== "ENTREGAR PROJETO") {
      setResult({ type: "error", text: 'Digite "ENTREGAR PROJETO" para confirmar.' });
      return;
    }

    setLoading("reset");
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("reset-system-for-delivery", {
        body: {},
      });

      if (error) {
        throw new Error(error.message || "Erro na Edge Function.");
      }

      const response = data as {
        success?: boolean;
        summary?: string[];
        deletedRealUsers?: number;
        cleanedStandard?: number;
        profilesReset?: number;
        assessorPasswordReset?: boolean;
        error?: string;
      };

      if (!response?.success) {
        throw new Error(response?.error ?? "Erro desconhecido no reset.");
      }

      // Montar resultado dinamicamente a partir do summary da edge function
      const assessorLinha = response.assessorPasswordReset
        ? "Assessor senha padrão: Teste@123"
        : "Assessor: senha NÃO resetada (verificar manualmente)";

      setResult({
        type: "success",
        text: [
          "✅ SISTEMA PRONTO PARA ENTREGA",
          "",
          `Usuários reais excluídos: ${response.deletedRealUsers ?? 0}`,
          `Usuários padrão limpos: ${response.cleanedStandard ?? 0}`,
          `Perfis resetados para defaults: ${response.profilesReset ?? 0}`,
          "",
          "Dados removidos: demandas, vagas, candidaturas,",
          "chats, notificações, agenda, verificações.",
          "",
          `Vereador restaurado: ${VEREADOR_DEFAULT_EMAIL}`,
          assessorLinha,
          "",
          ...(response.summary?.slice(-5) ?? []),
        ].join("\n"),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setResult({ type: "error", text: `Erro no reset: ${msg}` });
    } finally {
      setLoading(null);
      setActiveOp(null);
      setConfirmText("");
    }
  };

  const runRecreateVereador = async () => {
    setVereadorLoading(true);
    setVereadorResult(null);
    try {
      // Tenta recreate-vereador primeiro, fallback para recreate-system-users com only_vereador
      const { data, error } = await supabase.functions.invoke("recreate-vereador", { body: {} });
      if (error) {
        // Fallback: usa recreate-system-users apenas para o vereador
        const { data: data2, error: error2 } = await supabase.functions.invoke("recreate-system-users", {
          body: { only_vereador: true },
        });
        if (error2) throw new Error(error2.message);
        const r2 = data2 as { success?: boolean; results?: Array<{ email: string; status: string }> };
        const vereadorResult2 = r2?.results?.find((x) => x.email === VEREADOR_DEFAULT_EMAIL);
        if (!vereadorResult2 || (vereadorResult2.status !== "created_ok" && vereadorResult2.status !== "updated_ok")) {
          throw new Error("Falha ao recriar vereador: " + (vereadorResult2?.status ?? "desconhecido"));
        }
      } else {
        const r = data as { success?: boolean; summary?: string[]; error?: string };
        if (!r?.success) throw new Error(r?.error ?? "Erro desconhecido");
      }
      setVereadorResult({
        type: "success",
        text: [
          "Vereador restaurado com sucesso!",
          `E-mail: ${VEREADOR_DEFAULT_EMAIL}`,
          `Senha: ${VEREADOR_DEFAULT_PASS}`,
        ].join("\n"),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setVereadorResult({ type: "error", text: `Erro: ${msg}` });
    } finally {
      setVereadorLoading(false);
    }
  };

  const openConfirm = (op: string) => {
    setActiveOp(op);
    setConfirmText("");
    setResult(null);
  };

  return (
    <div>
      {/* RESET COMPLETO PARA ENTREGA */}
      <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 mb-8">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(220,38,38,0.12)" }}>
            <i className="ri-skull-line text-xl" style={{ color: "#DC2626" }}></i>
          </div>
          <div className="flex-1">
            <p className="text-red-800 font-bold text-sm mb-1">RESET COMPLETO PARA ENTREGA</p>
            <p className="text-red-700 text-sm leading-relaxed mb-3">
              Esta operação realiza o <strong>reset completo do sistema</strong> para entrega ao cliente:
            </p>
            <ul className="text-red-700 text-sm space-y-1 list-disc list-inside ml-2">
              <li><strong>Apaga TODOS os usuários reais</strong> (criados com email autenticado) e seus registros</li>
              <li><strong>Limpa os dados transacionais</strong> dos usuários padrão (demandas, vagas, chats, candidaturas, agenda, notificações)</li>
              <li><strong>Reseta os campos de perfil</strong> de todos os usuários padrão (bio, currículo, fotos, status de emprego, etc.)</li>
              <li>Limpeza global de todas as tabelas transacionais (nenhum dado órfão sobrevive)</li>
              <li><strong>Notícias e conteúdo público do site são PRESERVADOS</strong></li>
              <li>O vereador é <strong>identificado pelo cargo</strong> (não pelo e-mail) — mesmo se o e-mail foi alterado, o usuário é preservado e <strong>restaurado para as credenciais padrão</strong></li>
              <li>Após o reset, <strong>TODOS os 5 usuários padrão</strong> voltam com senha <strong>Teste@123</strong> e emails originais restaurados</li>
              <li className="text-red-800 font-bold">Esta ação é IRREVERSÍVEL</li>
            </ul>
          </div>
        </div>

        {activeOp === "reset" ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-red-600 font-semibold">
              Você está prestes a apagar TODOS os usuários reais e seus dados. Os 5 usuários padrão serão mantidos com dados limpos.
            </p>
            <div>
              <label className="block text-xs font-bold text-red-600 uppercase tracking-wider mb-1.5">
                Digite <span className="text-red-700 font-black">ENTREGAR PROJETO</span> para confirmar
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="ENTREGAR PROJETO"
                className="w-full rounded-xl px-4 py-2.5 border-2 border-red-200 text-sm focus:outline-none focus:border-red-400"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveOp(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap bg-gray-100 text-gray-600 hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={runResetDelivery}
                disabled={loading === "reset" || confirmText !== "ENTREGAR PROJETO"}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap text-white disabled:opacity-40"
                style={{ background: "#DC2626" }}
              >
                {loading === "reset" ? "Resetando..." : "RESET COMPLETO"}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => openConfirm("reset")}
            className="mt-4 w-full py-3 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap hover:opacity-90 transition-opacity text-white"
            style={{ background: "#DC2626" }}
          >
            <i className="ri-skull-line mr-1.5"></i>
            RESET COMPLETO PARA ENTREGA
          </button>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-amber-100">
            <i className="ri-alert-line text-xl text-amber-600"></i>
          </div>
          <div>
            <p className="text-amber-800 font-bold text-sm mb-1">Atenção — Operações Individuais</p>
            <p className="text-amber-700 text-sm leading-relaxed">
              As operações abaixo realizam exclusão <strong>física e permanente</strong> dos dados.
              Use apenas para limpeza pontual durante os testes.
            </p>
          </div>
        </div>
      </div>

      {result && (
        <div className={`mb-6 p-4 rounded-xl text-sm flex items-start gap-2 whitespace-pre-line ${
          result.type === "success"
            ? "bg-green-50 border border-green-200 text-green-700"
            : "bg-red-50 border border-red-200 text-red-600"
        }`}>
          <i className={result.type === "success" ? "ri-checkbox-circle-line" : "ri-error-warning-line"}></i>
          <span>{result.text}</span>
        </div>
      )}

      {/* RECRIAR VEREADOR */}
      <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 mb-6">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-amber-100">
            <i className="ri-user-star-line text-xl text-amber-600"></i>
          </div>
          <div className="flex-1">
            <p className="text-amber-800 font-bold text-sm mb-1">RESTAURAR USUÁRIO VEREADOR</p>
            <p className="text-amber-700 text-sm leading-relaxed">
              Recria o usuário vereador no sistema com as credenciais padrão.
              Use se o vereador não consegue fazer login ou se o e-mail/senha foram alterados.
            </p>
            <p className="text-amber-800 text-xs font-semibold mt-1">
              E-mail: <strong>{VEREADOR_DEFAULT_EMAIL}</strong> · Senha: <strong>{VEREADOR_DEFAULT_PASS}</strong>
            </p>
          </div>
        </div>

        {vereadorResult && (
          <div className={`mb-3 p-3 rounded-xl text-sm flex items-start gap-2 whitespace-pre-line ${
            vereadorResult.type === "success"
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-600"
          }`}>
            <i className={vereadorResult.type === "success" ? "ri-checkbox-circle-line" : "ri-error-warning-line"}></i>
            <span>{vereadorResult.text}</span>
          </div>
        )}

        <button
          onClick={runRecreateVereador}
          disabled={vereadorLoading}
          className="w-full py-3 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap hover:opacity-90 transition-opacity disabled:opacity-50 text-amber-900"
          style={{ background: "rgba(217, 119, 6, 0.15)", border: "1px solid rgba(217, 119, 6, 0.4)" }}
        >
          {vereadorLoading ? (
            <><i className="ri-loader-4-line animate-spin mr-1.5"></i>Restaurando...</>
          ) : (
            <><i className="ri-user-star-line mr-1.5"></i>RESTAURAR VEREADOR (email + senha padrão)</>
          )}
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Delete all demands */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(220,38,38,0.10)" }}>
              <i className="ri-file-list-3-line text-xl" style={{ color: "#DC2626" }}></i>
            </div>
            <div>
              <h3 className="text-gray-900 font-extrabold text-base">Remover Demandas</h3>
              <p className="text-gray-500 text-xs">Inclui mensagens, histórico e vínculos</p>
            </div>
          </div>

          {activeOp === "demands" ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Esta ação removerá <strong>permanentemente</strong> todas as demandas e suas mensagens associadas.
              </p>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Digite <span className="text-red-500 font-black">DELETAR TUDO</span> para confirmar
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETAR TUDO"
                  className="w-full rounded-xl px-4 py-2.5 border border-gray-200 text-sm focus:outline-none focus:border-red-400"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveOp(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap bg-gray-100 text-gray-600 hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => runCleanup("demands")}
                  disabled={loading === "demands" || confirmText !== "DELETAR TUDO"}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap text-white disabled:opacity-40"
                  style={{ background: "#DC2626" }}
                >
                  {loading === "demands" ? "Removendo..." : "Deletar"}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => openConfirm("demands")}
              className="w-full py-3 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap hover:opacity-90 transition-opacity"
              style={{ background: "rgba(220,38,38,0.10)", color: "#DC2626", border: "1px solid rgba(220,38,38,0.25)" }}
            >
              <i className="ri-delete-bin-line mr-1.5"></i>
              Remover Demandas
            </button>
          )}
        </div>

        {/* Delete all chats */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(220,38,38,0.10)" }}>
              <i className="ri-chat-3-line text-xl" style={{ color: "#DC2626" }}></i>
            </div>
            <div>
              <h3 className="text-gray-900 font-extrabold text-base">Remover Mensagens</h3>
              <p className="text-gray-500 text-xs">Inclui conversas, anexos e notificações</p>
            </div>
          </div>

          {activeOp === "chats" ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Esta ação removerá <strong>permanentemente</strong> todas as conversas do chat entre cidadãos e assessores.
              </p>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Digite <span className="text-red-500 font-black">DELETAR TUDO</span> para confirmar
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETAR TUDO"
                  className="w-full rounded-xl px-4 py-2.5 border border-gray-200 text-sm focus:outline-none focus:border-red-400"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveOp(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap bg-gray-100 text-gray-600 hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => runCleanup("chats")}
                  disabled={loading === "chats" || confirmText !== "DELETAR TUDO"}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap text-white disabled:opacity-40"
                  style={{ background: "#DC2626" }}
                >
                  {loading === "chats" ? "Removendo..." : "Deletar"}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => openConfirm("chats")}
              className="w-full py-3 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap hover:opacity-90 transition-opacity"
              style={{ background: "rgba(220,38,38,0.10)", color: "#DC2626", border: "1px solid rgba(220,38,38,0.25)" }}
            >
              <i className="ri-delete-bin-line mr-1.5"></i>
              Remover Mensagens
            </button>
          )}
        </div>

        {/* Delete all notifications */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(220,38,38,0.10)" }}>
              <i className="ri-notification-3-line text-xl" style={{ color: "#DC2626" }}></i>
            </div>
            <div>
              <h3 className="text-gray-900 font-extrabold text-base">Remover Notificações</h3>
              <p className="text-gray-500 text-xs">Inclui todas as notificações do sistema</p>
            </div>
          </div>

          {activeOp === "notifications" ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Esta ação removerá <strong>permanentemente</strong> todas as notificações do sistema.
              </p>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Digite <span className="text-red-500 font-black">DELETAR TUDO</span> para confirmar
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETAR TUDO"
                  className="w-full rounded-xl px-4 py-2.5 border border-gray-200 text-sm focus:outline-none focus:border-red-400"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveOp(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap bg-gray-100 text-gray-600 hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => runCleanup("notifications")}
                  disabled={loading === "notifications" || confirmText !== "DELETAR TUDO"}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap text-white disabled:opacity-40"
                  style={{ background: "#DC2626" }}
                >
                  {loading === "notifications" ? "Removendo..." : "Deletar"}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => openConfirm("notifications")}
              className="w-full py-3 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap hover:opacity-90 transition-opacity"
              style={{ background: "rgba(220,38,38,0.10)", color: "#DC2626", border: "1px solid rgba(220,38,38,0.25)" }}
            >
              <i className="ri-delete-bin-line mr-1.5"></i>
              Remover Notificações
            </button>
          )}
        </div>
      </div>
    </div>
  );
}