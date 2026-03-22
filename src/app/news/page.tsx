import { Newspaper, Globe, Clock, Tag } from "lucide-react";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

interface NewsArticle {
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
  created_at: string | Date;
}

async function getNewsData(): Promise<NewsArticle[]> {
  try {
    const res = await query<NewsArticle>(
      `SELECT * FROM news_articles
       WHERE category != 'desastre'
       ORDER BY published_at DESC LIMIT 50;`,
    );
    return res.rows;
  } catch (error) {
    console.warn("Failed to fetch news data:", error);
    return [];
  }
}

const categoryBadge: Record<string, string> = {
  noticia: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  clima: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  finanzas: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  general: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

export default async function NewsPage() {
  const articles = await getNewsData();

  const totalArticles = articles.length;
  const sources = new Set(articles.map((a) => a.source).filter(Boolean));
  const latestCategory = articles[0]?.category || "--";

  return (
    <div className="flex-1 p-8 overflow-y-auto w-full">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <section className="space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Newspaper className="w-4 h-4" />
            <span className="text-sm font-medium tracking-wide uppercase">
              Noticias Globales
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">
            Titulares{" "}
            <span className="text-transparent bg-clip-text from-emerald-400 to-teal-400">
              del Mundo
            </span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl">
            Recopilación de noticias globales actualizadas periódicamente desde
            múltiples fuentes internacionales.
          </p>
        </section>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative group overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 transition-all hover:border-slate-700">
            <div className="absolute inset-0 from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400">
                <Newspaper className="w-6 h-6" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-400 mb-1">
              Artículos Recientes
            </p>
            <p className="text-3xl font-bold text-slate-50">{totalArticles}</p>
          </div>

          <div className="relative group overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 transition-all hover:border-slate-700">
            <div className="absolute inset-0 from-teal-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-teal-500/10 rounded-2xl text-teal-400">
                <Globe className="w-6 h-6" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-400 mb-1">
              Fuentes Activas
            </p>
            <p className="text-3xl font-bold text-slate-50">{sources.size}</p>
          </div>

          <div className="relative group overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 transition-all hover:border-slate-700">
            <div className="absolute inset-0 from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-cyan-500/10 rounded-2xl text-cyan-400">
                <Tag className="w-6 h-6" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-400 mb-1">
              Última Categoría
            </p>
            <p className="text-3xl font-bold text-slate-50 capitalize">
              {latestCategory}
            </p>
          </div>
        </div>

        {/* Articles List */}
        <section className="rounded-3xl border border-slate-800 bg-slate-900/50 backdrop-blur-xl overflow-hidden">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white">
              Últimas Noticias
            </h2>
          </div>
          <div className="divide-y divide-slate-800/50">
            {articles.length > 0 ? (
              articles.slice(0, 20).map((article, idx) => (
                <a
                  key={idx}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 sm:p-6 hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-emerald-400 shrink-0">
                      <Newspaper className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${
                            categoryBadge[article.category] ||
                            categoryBadge.general
                          }`}
                        >
                          {article.category.toUpperCase()}
                        </span>
                        {article.source && (
                          <span className="text-xs text-slate-500">
                            {article.source}
                          </span>
                        )}
                        <span className="text-xs text-slate-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(article.published_at).toLocaleString()}
                        </span>
                      </div>
                      <h3 className="text-slate-200 font-medium mb-1 line-clamp-2">
                        {article.title}
                      </h3>
                      {article.description && (
                        <p className="text-sm text-slate-500 line-clamp-2">
                          {article.description}
                        </p>
                      )}
                    </div>
                  </div>
                </a>
              ))
            ) : (
              <div className="p-12 text-center text-slate-500">
                No hay noticias disponibles todavía. Ejecuta el cron job{" "}
                <code className="text-slate-400">news-sync.ts</code> para
                recolectar datos.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
