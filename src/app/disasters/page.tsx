import { ShieldAlert, AlertTriangle, Clock, Flame } from "lucide-react";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

interface DisasterArticle {
  id: number;
  source: string | null;
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  image_url: string | null;
  published_at: string | Date;
  category: string;
  country: string | null;
  severity: number | null;
  created_at: string | Date;
}

async function getDisasterData(): Promise<DisasterArticle[]> {
  try {
    const res = await query<DisasterArticle>(
      `SELECT * FROM news_articles
       WHERE category = 'desastre'
       ORDER BY published_at DESC LIMIT 100;`,
    );
    return res.rows;
  } catch (error) {
    console.warn("Failed to fetch disaster data:", error);
    return [];
  }
}

function severityLabel(severity: number | null): {
  text: string;
  className: string;
} {
  if (severity === null || severity === undefined)
    return {
      text: "Sin clasificar",
      className: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    };
  if (severity >= 4)
    return {
      text: `Crítico (${severity})`,
      className: "bg-red-500/10 text-red-400 border-red-500/20",
    };
  if (severity >= 2)
    return {
      text: `Moderado (${severity})`,
      className: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    };
  return {
    text: `Bajo (${severity})`,
    className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  };
}

export default async function DisastersPage() {
  const disasters = await getDisasterData();

  const totalReports = disasters.length;
  const criticalCount = disasters.filter(
    (d) => d.severity !== null && d.severity >= 4,
  ).length;
  const latestEvent = disasters[0]?.title || "Sin reportes recientes";

  return (
    <div className="flex-1 p-8 overflow-y-auto w-full">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <section className="space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
            <ShieldAlert className="w-4 h-4" />
            <span className="text-sm font-medium tracking-wide uppercase">
              Desastres Naturales
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">
            Alertas{" "}
            <span className="text-transparent bg-clip-text from-red-400 to-orange-400">
              Globales
            </span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl">
            Reportes de desastres naturales detectados a través de filtrado
            inteligente de noticias globales. Actualización cada 30 minutos.
          </p>
        </section>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative group overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 transition-all hover:border-slate-700">
            <div className="absolute inset-0 from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-red-500/10 rounded-2xl text-red-400">
                <ShieldAlert className="w-6 h-6" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-400 mb-1">
              Reportes Totales
            </p>
            <p className="text-3xl font-bold text-slate-50">{totalReports}</p>
          </div>

          <div className="relative group overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 transition-all hover:border-slate-700">
            <div className="absolute inset-0 from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-orange-500/10 rounded-2xl text-orange-400">
                <Flame className="w-6 h-6" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-400 mb-1">
              Eventos Críticos
            </p>
            <p className="text-3xl font-bold text-slate-50">{criticalCount}</p>
          </div>

          <div className="relative group overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 transition-all hover:border-slate-700">
            <div className="absolute inset-0 from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-400 mb-1">
              Último Evento
            </p>
            <p className="text-lg font-bold text-slate-50 line-clamp-2">
              {latestEvent.length > 60
                ? latestEvent.slice(0, 60) + "..."
                : latestEvent}
            </p>
          </div>
        </div>

        {/* Disaster List */}
        <section className="rounded-3xl border border-slate-800 bg-slate-900/50 backdrop-blur-xl overflow-hidden">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white">
              Reportes Recientes
            </h2>
          </div>
          <div className="divide-y divide-slate-800/50">
            {disasters.length > 0 ? (
              disasters.slice(0, 20).map((disaster, idx) => {
                const sev = severityLabel(disaster.severity);
                return (
                  <a
                    key={idx}
                    href={disaster.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-4 sm:p-6 hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row gap-4 items-start">
                      <div className="w-12 h-12 rounded-full bg-red-950/50 flex items-center justify-center text-red-400 shrink-0">
                        <ShieldAlert className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span
                            className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${sev.className}`}
                          >
                            {sev.text}
                          </span>
                          {disaster.source && (
                            <span className="text-xs text-slate-500">
                              {disaster.source}
                            </span>
                          )}
                          <span className="text-xs text-slate-600 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(disaster.published_at).toLocaleString()}
                          </span>
                        </div>
                        <h3 className="text-slate-200 font-medium mb-1 line-clamp-2">
                          {disaster.title}
                        </h3>
                        {disaster.description && (
                          <p className="text-sm text-slate-500 line-clamp-2">
                            {disaster.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </a>
                );
              })
            ) : (
              <div className="p-12 text-center text-slate-500">
                No hay reportes de desastres disponibles todavía. Ejecuta el
                cron job <code className="text-slate-400">news-sync.ts</code>{" "}
                para recolectar datos.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
