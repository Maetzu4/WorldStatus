import { Moon, Star, Telescope, Calendar } from "lucide-react";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

interface AstronomyEvent {
  id: number;
  event: string;
  date: string | Date;
  extra_info: {
    title?: string;
    url?: string;
    hdurl?: string;
    media_type?: string;
    explanation?: string;
    messageID?: string;
    messageBody?: string;
  } | null;
  created_at: string | Date;
}

async function getAstronomyData(): Promise<AstronomyEvent[]> {
  try {
    const res = await query<AstronomyEvent>(
      "SELECT * FROM astronomy_events ORDER BY date DESC LIMIT 50;",
    );
    return res.rows;
  } catch (error) {
    console.warn("Failed to fetch astronomy data:", error);
    return [];
  }
}

const eventBadge: Record<string, string> = {
  APOD: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  CME: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  FLR: "bg-red-500/10 text-red-400 border-red-500/20",
  GST: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  IPS: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  SEP: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  DONKI_NOTIFICATION: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
};
const defaultBadge = "bg-slate-500/10 text-slate-400 border-slate-500/20";

function isEmbedVideo(url: string): boolean {
  return (
    url.includes("youtube") || url.includes("vimeo") || url.includes("youtu.be")
  );
}

export default async function AstronomyPage() {
  const events = await getAstronomyData();

  const totalEvents = events.length;
  const latestApod = events.find((e) => e.event === "APOD");
  const donkiCount = events.filter((e) => e.event !== "APOD").length;

  return (
    <div className="flex-1 p-8 overflow-y-auto w-full">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <section className="space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Moon className="w-4 h-4" />
            <span className="text-sm font-medium tracking-wide uppercase">
              Astronomy
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">
            Cosmic{" "}
            <span className="text-transparent bg-clip-text from-purple-400 to-violet-400">
              Events
            </span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl">
            Astronomy Picture of the Day (APOD) and solar event notifications
            detected by NASA DONKI. Updated daily.
          </p>
        </section>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative group overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 transition-all hover:border-slate-700">
            <div className="absolute inset-0 from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-400">
                <Star className="w-6 h-6" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-400 mb-1">
              Recorded Events
            </p>
            <p className="text-3xl font-bold text-slate-50">{totalEvents}</p>
          </div>

          <div className="relative group overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 transition-all hover:border-slate-700">
            <div className="absolute inset-0 from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-violet-500/10 rounded-2xl text-violet-400">
                <Telescope className="w-6 h-6" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-400 mb-1">
              Latest APOD
            </p>
            <p className="text-lg font-bold text-slate-50 line-clamp-2">
              {latestApod?.extra_info?.title || "No data yet"}
            </p>
          </div>

          <div className="relative group overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 transition-all hover:border-slate-700">
            <div className="absolute inset-0 from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400">
                <Moon className="w-6 h-6" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-400 mb-1">
              DONKI Alerts
            </p>
            <p className="text-3xl font-bold text-slate-50">{donkiCount}</p>
          </div>
        </div>

        {/* APOD Highlight */}
        {latestApod?.extra_info?.url && (
          <section className="rounded-3xl border border-purple-900/30 bg-slate-900/50 backdrop-blur-xl overflow-hidden">
            <div className="p-6 border-b border-slate-800">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Star className="w-5 h-5 text-purple-400" />
                {latestApod.extra_info.media_type === "video"
                  ? "Astronomy Video of the Day"
                  : "Astronomy Picture of the Day"}
              </h2>
            </div>
            <div className="p-6">
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="w-full lg:w-1/2 rounded-2xl overflow-hidden bg-slate-800">
                  {latestApod.extra_info.media_type === "video" ? (
                    isEmbedVideo(latestApod.extra_info.url) ? (
                      <iframe
                        src={latestApod.extra_info.url}
                        title={latestApod.extra_info.title || "APOD"}
                        className="w-full aspect-video"
                        allowFullScreen
                      />
                    ) : (
                      <video
                        src={latestApod.extra_info.url}
                        controls
                        className="w-full aspect-video"
                      >
                        Your browser does not support the video tag.
                      </video>
                    )
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={
                        latestApod.extra_info.hdurl || latestApod.extra_info.url
                      }
                      alt={latestApod.extra_info.title || "APOD"}
                      className="w-full h-auto object-cover max-h-96"
                    />
                  )}
                </div>
                <div className="flex-1 space-y-3">
                  <h3 className="text-2xl font-bold text-white">
                    {latestApod.extra_info.title}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {new Date(latestApod.date).toLocaleDateString()}
                  </p>
                  {latestApod.extra_info.explanation && (
                    <p className="text-slate-400 leading-relaxed line-clamp-6">
                      {latestApod.extra_info.explanation}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Events List */}
        <section className="rounded-3xl border border-slate-800 bg-slate-900/50 backdrop-blur-xl overflow-hidden">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white">
              All Events
            </h2>
          </div>
          <div className="divide-y divide-slate-800/50">
            {events.length > 0 ? (
              events.slice(0, 20).map((event, idx) => {
                const badge = eventBadge[event.event] || defaultBadge;
                const title =
                  event.extra_info?.title ||
                  event.extra_info?.messageID ||
                  event.event;
                const description =
                  event.extra_info?.explanation ||
                  event.extra_info?.messageBody;

                return (
                  <div
                    key={idx}
                    className="p-4 sm:p-6 hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row gap-4 items-start">
                      <div className="w-12 h-12 rounded-full bg-purple-950/50 flex items-center justify-center text-purple-400 shrink-0">
                        <Moon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span
                            className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${badge}`}
                          >
                            {event.event}
                          </span>
                          <span className="text-xs text-slate-600 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(event.date).toLocaleString()}
                          </span>
                        </div>
                        <h3 className="text-slate-200 font-medium mb-1 line-clamp-2">
                          {title}
                        </h3>
                        {description && (
                          <p className="text-sm text-slate-500 line-clamp-3">
                            {description.slice(0, 300)}
                            {description.length > 300 ? "..." : ""}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-12 text-center text-slate-500">
                No astronomy events available yet. Run the cron job{" "}
                <code className="text-slate-400">astronomy-sync.ts</code> to
                collect data.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
