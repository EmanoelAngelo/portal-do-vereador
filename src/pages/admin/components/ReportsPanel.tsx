import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface ReportData {
  totalCidadaos: number;
  totalEmpresas: number;
  totalAssessores: number;
  totalDemands: number;
  aberto: number;
  em_andamento: number;
  aguardando_externa: number;
  finalizada: number;
  totalVagas: number;
  activeVagas: number;
  totalNews: number;
  publishedNews: number;
  lookingWork: number;
  employed: number;
  demandsByType: { type: string; count: number }[];
  recentDemands: { id: number; title: string; type: string; status: string; citizen_name: string | null; created_at: string }[];
}

export default function ReportsPanel() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [
        { data: cidadaos },
        { data: empresas },
        { data: assessores },
        { data: demands },
        { data: vagas },
        { data: news },
        { data: profiles },
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact" }).eq("role", "citizen"),
        supabase.from("profiles").select("id", { count: "exact" }).eq("role", "empresa"),
        supabase.from("profiles").select("id", { count: "exact" }).in("role", ["assessor", "admin"]),
        supabase.from("demands").select("id, title, type, status, citizen_name, created_at").order("created_at", { ascending: false }),
        supabase.from("vagas").select("id, status"),
        supabase.from("news").select("id, status"),
        supabase.from("profiles").select("job_status").eq("role", "citizen"),
      ]);

      const demList = (demands as { id: number; title: string; type: string; status: string; citizen_name: string | null; created_at: string }[]) ?? [];
      const vagList = (vagas as { id: number; status: string }[]) ?? [];
      const newsList = (news as { id: number; status: string }[]) ?? [];
      const profList = (profiles as { job_status: string | null }[]) ?? [];

      const typeMap: Record<string, number> = {};
      demList.forEach((d) => { typeMap[d.type] = (typeMap[d.type] ?? 0) + 1; });

      setData({
        totalCidadaos: (cidadaos?.length ?? 0),
        totalEmpresas: (empresas?.length ?? 0),
        totalAssessores: (assessores?.length ?? 0),
        totalDemands: demList.length,
        aberto: demList.filter((d) => (d.status ?? "aberto") === "aberto").length,
        em_andamento: demList.filter((d) => (d.status ?? "aberto") === "em_andamento").length,
        aguardando_externa: demList.filter((d) => (d.status ?? "aberto") === "aguardando_externa").length,
        finalizada: demList.filter((d) => (d.status ?? "aberto") === "finalizada").length,
        totalVagas: vagList.length,
        activeVagas: vagList.filter((v) => v.status === "active").length,
        totalNews: newsList.length,
        publishedNews: newsList.filter((n) => n.status === "published").length,
        lookingWork: profList.filter((p) => !p.job_status || p.job_status !== "not_looking").length,
        employed: profList.filter((p) => p.is_employed === true || (p as any).employed_through_platform === true).length,
        demandsByType: Object.entries(typeMap).map(([type, count]) => ({ type, count })),
        recentDemands: demList.slice(0, 10),
      });
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-2 border-[#0369A1] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!data) return null;

  const typeLabel: Record<string, string> = { requerimento: "Requerimentos", sugestao: "Sugestões", contato: "Contatos" };
  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    aberto: { label: "Em Aberto", color: "text-amber-600", bg: "bg-amber-50" },
    em_andamento: { label: "Em Andamento", color: "text-[#0369A1]", bg: "bg-[#EFF6FF]" },
    aguardando_externa: { label: "Ag. Resp. Ext.", color: "text-purple-600", bg: "bg-purple-50" },
    finalizada: { label: "Finalizada", color: "text-green-600", bg: "bg-green-50" },
  };

  return (
    <div className="space-y-6">
      {/* Usuários */}
      <div>
        <h2 className="text-gray-900 font-extrabold text-base mb-3 flex items-center gap-2">
          <i className="ri-group-line text-[#0369A1]"></i>Usuários do Sistema
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Cidadãos", value: data.totalCidadaos, icon: "ri-user-line", color: "text-[#0369A1]", bg: "bg-[#EFF6FF]" },
            { label: "Empresas", value: data.totalEmpresas, icon: "ri-building-line", color: "text-violet-600", bg: "bg-violet-50" },
            { label: "Assessores/Admins", value: data.totalAssessores, icon: "ri-user-star-line", color: "text-[#0369A1]", bg: "bg-[#DBEAFE]" },
            { label: "Total", value: data.totalCidadaos + data.totalEmpresas + data.totalAssessores, icon: "ri-team-line", color: "text-gray-700", bg: "bg-gray-50" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-4 border border-gray-100">
              <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-2`}>
                <i className={`${s.icon} ${s.color} text-lg`}></i>
              </div>
              <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
              <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Demandas */}
      <div>
        <h2 className="text-gray-900 font-extrabold text-base mb-3 flex items-center gap-2">
          <i className="ri-file-list-line text-[#0369A1]"></i>Demandas
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          {[
            { label: "Em Aberto", value: data.aberto, icon: "ri-inbox-line", color: "text-amber-600", bg: "bg-amber-50" },
            { label: "Em Andamento", value: data.em_andamento, icon: "ri-loader-4-line", color: "text-[#0369A1]", bg: "bg-[#EFF6FF]" },
            { label: "Ag. Externa", value: data.aguardando_externa, icon: "ri-mail-send-line", color: "text-purple-600", bg: "bg-purple-50" },
            { label: "Finalizadas", value: data.finalizada, icon: "ri-checkbox-circle-line", color: "text-green-600", bg: "bg-green-50" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-4 border border-gray-100">
              <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-2`}>
                <i className={`${s.icon} ${s.color} text-lg`}></i>
              </div>
              <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
              <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {data.demandsByType.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-sm font-semibold text-gray-700 mb-4">Distribuição por tipo</p>
            <div className="space-y-3">
              {data.demandsByType.map((dt) => (
                <div key={dt.type}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">{typeLabel[dt.type] ?? dt.type}</span>
                    <span className="text-sm font-bold text-gray-800">{dt.count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(dt.count / data.totalDemands) * 100}%`, background: "linear-gradient(to right, #0369A1, #0EA5E9)" }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Empregabilidade */}
      <div>
        <h2 className="text-gray-900 font-extrabold text-base mb-3 flex items-center gap-2">
          <i className="ri-briefcase-4-line text-[#0369A1]"></i>Empregabilidade em Pelotas
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          {[
            { label: "Cidadãos cadastrados", value: data.totalCidadaos, icon: "ri-group-line", color: "text-gray-700", bg: "bg-gray-50" },
            { label: "Procurando emprego", value: data.lookingWork, icon: "ri-search-line", color: "text-amber-600", bg: "bg-amber-50" },
            { label: "Empregados", value: data.employed, icon: "ri-briefcase-line", color: "text-green-600", bg: "bg-green-50" },
            { label: "Vagas ativas", value: data.activeVagas, icon: "ri-briefcase-4-line", color: "text-[#0369A1]", bg: "bg-[#EFF6FF]" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-4 border border-gray-100">
              <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-2`}>
                <i className={`${s.icon} ${s.color} text-lg`}></i>
              </div>
              <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
              <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
        {data.totalCidadaos > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">Taxa de emprego</span>
              <span className="text-sm font-bold text-gray-900">{((data.lookingWork + data.employed) > 0 ? Math.round((data.employed / (data.lookingWork + data.employed)) * 100) : 0)}%</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${(data.lookingWork + data.employed) > 0 ? ((data.employed / (data.lookingWork + data.employed)) * 100) : 0}%`, background: "linear-gradient(to right, #0369A1, #22C55E)" }}></div>
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
              <span>{data.lookingWork} buscando</span>
              <span>{data.employed} empregados</span>
            </div>
          </div>
        )}
      </div>

      {/* Últimas demandas */}
      <div>
        <h2 className="text-gray-900 font-extrabold text-base mb-3 flex items-center gap-2">
          <i className="ri-history-line text-[#0369A1]"></i>Demandas Recentes
        </h2>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-50">
            {data.recentDemands.map((d) => {
              const sc = statusConfig[d.status] ?? statusConfig.pending;
              return (
                <div key={d.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-[#0369A1] uppercase">{typeLabel[d.type] ?? d.type}</span>
                    </div>
                    <p className="text-gray-800 font-semibold text-sm truncate">{d.title}</p>
                    <p className="text-gray-400 text-xs">{d.citizen_name ?? "Cidadão"} · {new Date(d.created_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap ${sc.color} ${sc.bg}`}>{sc.label}</span>
                </div>
              );
            })}
            {data.recentDemands.length === 0 && (
              <div className="py-8 text-center text-gray-400 text-sm">Nenhuma demanda registrada</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}