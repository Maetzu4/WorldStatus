import { TrendingUp, TrendingDown, DollarSign, BarChart3 } from "lucide-react";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

interface FinanceIndex {
  id: number;
  index_name: string;
  value: number;
  change: number | null;
  timestamp: string | Date;
  created_at: string | Date;
}

async function getFinanceData(): Promise<FinanceIndex[]> {
  try {
    const res = await query<FinanceIndex>(
      "SELECT * FROM finance_indices ORDER BY timestamp DESC LIMIT 50;",
    );
    return res.rows;
  } catch (error) {
    console.warn("Failed to fetch finance data:", error);
    return [];
  }
}

export default async function FinancePage() {
  const indices = await getFinanceData();

  // Get unique latest indices for KPI cards (up to 3)
  const seen = new Set<string>();
  const latestIndices: FinanceIndex[] = [];
  for (const idx of indices) {
    if (!seen.has(idx.index_name)) {
      seen.add(idx.index_name);
      latestIndices.push(idx);
      if (latestIndices.length >= 3) break;
    }
  }

  return (
    <div className="flex-1 p-8 overflow-y-auto w-full">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <section className="space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm font-medium tracking-wide uppercase">
              Índices Financieros
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">
            Mercados{" "}
            <span className="text-transparent bg-clip-text from-yellow-400 to-amber-400">
              Globales
            </span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl">
            Seguimiento de los principales índices financieros del mundo con
            actualización periódica.
          </p>
        </section>

        {/* KPI Cards - Latest indices */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {latestIndices.length > 0 ? (
            latestIndices.map((idx, i) => {
              const isPositive = idx.change !== null && Number(idx.change) >= 0;
              const colors = [
                {
                  bg: "bg-yellow-500/10",
                  text: "text-yellow-400",
                  gradient: "from-yellow-500/5",
                },
                {
                  bg: "bg-amber-500/10",
                  text: "text-amber-400",
                  gradient: "from-amber-500/5",
                },
                {
                  bg: "bg-orange-500/10",
                  text: "text-orange-400",
                  gradient: "from-orange-500/5",
                },
              ];
              const color = colors[i];

              return (
                <div
                  key={i}
                  className="relative group overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 transition-all hover:border-slate-700"
                >
                  <div
                    className={`absolute inset-0 ${color.gradient} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`}
                  />
                  <div className="flex justify-between items-start mb-4">
                    <div
                      className={`p-3 ${color.bg} rounded-2xl ${color.text}`}
                    >
                      <BarChart3 className="w-6 h-6" />
                    </div>
                    {idx.change !== null && (
                      <div
                        className={`flex items-center gap-1 text-sm font-semibold ${
                          isPositive ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {isPositive ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        {isPositive ? "+" : ""}
                        {Number(idx.change).toFixed(2)}%
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-medium text-slate-400 mb-1">
                    {idx.index_name}
                  </p>
                  <p className="text-3xl font-bold text-slate-50">
                    {Number(idx.value).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              );
            })
          ) : (
            <>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="relative group overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-yellow-500/10 rounded-2xl text-yellow-400">
                      <DollarSign className="w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-slate-400 mb-1">
                    Índice {i}
                  </p>
                  <p className="text-3xl font-bold text-slate-50">--</p>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Data Table */}
        <section className="rounded-3xl border border-slate-800 bg-slate-900/50 backdrop-blur-xl overflow-hidden">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white">
              Historial de Índices
            </h2>
          </div>
          <div className="divide-y divide-slate-800/50">
            {indices.length > 0 ? (
              indices.slice(0, 20).map((record, idx) => {
                const isPositive =
                  record.change !== null && Number(record.change) >= 0;
                return (
                  <div
                    key={idx}
                    className="p-4 sm:p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-yellow-400">
                        <BarChart3 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-slate-200 font-medium">
                          {record.index_name}
                        </h3>
                        <p className="text-sm text-slate-500">
                          {new Date(record.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-right">
                        <p className="text-slate-400">Valor</p>
                        <p className="font-mono text-slate-200 text-lg font-semibold">
                          {Number(record.value).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                      {record.change !== null && (
                        <div className="text-right">
                          <p className="text-slate-400">Cambio</p>
                          <p
                            className={`font-mono font-semibold flex items-center gap-1 ${
                              isPositive ? "text-emerald-400" : "text-red-400"
                            }`}
                          >
                            {isPositive ? (
                              <TrendingUp className="w-4 h-4" />
                            ) : (
                              <TrendingDown className="w-4 h-4" />
                            )}
                            {isPositive ? "+" : ""}
                            {Number(record.change).toFixed(2)}%
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-12 text-center text-slate-500">
                No hay datos financieros disponibles todavía. Configura un cron
                job de sincronización financiera para recolectar datos.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
