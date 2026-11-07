import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";

interface SetupResult {
  email: string;
  status: string;
  role?: string;
  error?: string;
}

const USERS_LIST = [
  { email: "admin@arthurhalal.com.br",        senha: "CONFIGURE_EM_AMBIENTE_DE_TESTE",       tipo: "Admin" },
  { email: "assessor@arthurhalal.com.br",     senha: "CONFIGURE_EM_AMBIENTE_DE_TESTE",    tipo: "Assessor" },
  { email: "vereador@arthurhalal.com.br",     senha: "CONFIGURE_EM_AMBIENTE_DE_TESTE",    tipo: "Vereador" },
  { email: "cidadao.teste@gmail.com",         senha: "CONFIGURE_EM_AMBIENTE_DE_TESTE",     tipo: "Cidadão Teste" },
  { email: "empresa.teste@gmail.com",         senha: "CONFIGURE_EM_AMBIENTE_DE_TESTE",     tipo: "Empresa Teste" },
  { email: "desenvolvedor@example.com",           senha: "CONFIGURE_EM_AMBIENTE_DE_TESTE",     tipo: "Emanoel Angelo" },
];

export default function AdminSetupPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SetupResult[]>([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const runSetup = async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error: rpcErr } = await supabase.rpc("create_initial_users");

      if (rpcErr) throw new Error(rpcErr.message);
      if (!data?.success) throw new Error(data?.error ?? "Erro desconhecido no setup.");

      setResults((data.results as SetupResult[]) ?? []);
      setDone(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#020C1B] flex items-center justify-center px-4 py-12">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 bg-sky-700/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-700 to-sky-400 flex items-center justify-center mx-auto shadow-xl shadow-sky-500/30 mb-4">
            <span className="w-7 h-7 flex items-center justify-center">
              <i className="ri-settings-line text-white text-2xl" />
            </span>
          </div>
          <h1 className="text-white font-extrabold text-2xl">Setup Inicial</h1>
          <p className="text-white/50 text-sm mt-1">Criar usuários de teste do sistema</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8">
          {!done ? (
            <>
              <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <p className="text-amber-300 text-sm font-semibold mb-3">Usuários que serão criados:</p>
                <ul className="space-y-2">
                  {USERS_LIST.map((u) => (
                    <li key={u.email} className="text-xs text-white/70">
                      <strong className="text-white">{u.tipo}:</strong>{" "}
                      <span className="text-white/60">{u.email}</span>{" "}
                      <span className="text-amber-300/80 ml-1">· {u.senha}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {error && (
                <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-xs break-all">
                  <p className="font-bold text-red-400 mb-1">Erro:</p>
                  {error}
                </div>
              )}

              <button
                onClick={runSetup}
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-sky-700 to-sky-400 text-white font-bold text-sm rounded-xl hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                    Criando usuários...
                  </span>
                ) : "Executar Setup"}
              </button>
            </>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-5">
                <span className="w-6 h-6 flex items-center justify-center">
                  <i className="ri-checkbox-circle-fill text-green-400 text-xl" />
                </span>
                <p className="text-white font-bold">Setup concluído!</p>
              </div>
              <div className="space-y-2 mb-6">
                {results.map((r) => (
                  <div
                    key={r.email}
                    className={`p-3 rounded-xl border ${
                      r.status === "error"
                        ? "bg-red-500/10 border-red-500/20"
                        : r.status === "already_exists"
                        ? "bg-amber-500/10 border-amber-500/20"
                        : "bg-green-500/10 border-green-500/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-white/80 text-xs">{r.email}</span>
                      <span
                        className={`text-xs font-semibold ${
                          r.status === "error"
                            ? "text-red-400"
                            : r.status === "already_exists"
                            ? "text-amber-400"
                            : "text-green-400"
                        }`}
                      >
                        {r.status === "created"
                          ? "Criado"
                          : r.status === "already_exists_updated"
                          ? "Atualizado"
                          : r.status === "already_exists"
                          ? "Já existe"
                          : "Erro"}
                      </span>
                    </div>
                    {r.error && (
                      <p className="text-red-300 text-xs mt-1 break-all">{r.error}</p>
                    )}
                  </div>
                ))}
              </div>
              <Link
                to="/admin"
                className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-sky-700 to-sky-400 text-white font-semibold text-sm rounded-xl hover:opacity-90 transition-all whitespace-nowrap"
              >
                <i className="ri-login-box-line" />
                Ir para o Painel Admin
              </Link>
            </div>
          )}
        </div>

        <p className="text-center text-white/30 text-xs mt-4">
          Esta página é apenas para configuração inicial do sistema
        </p>
      </div>
    </div>
  );
}