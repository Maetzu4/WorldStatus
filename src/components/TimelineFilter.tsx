"use client";

import { useState } from "react";
import { TimelineEntry } from "@/lib/dashboard";
import { formatDistanceToNow } from "date-fns";
import { enUS } from "date-fns/locale";
import { Globe } from "lucide-react";

const CATEGORIES = [
  { id: "all", label: "All", emoji: "🌍" },
  { id: "clima", label: "Climate", emoji: "🌡" },
  { id: "desastre", label: "Disaster", emoji: "🌪" },
  { id: "noticia", label: "News", emoji: "📰" },
  { id: "finanzas", label: "Finance", emoji: "📈" },
  { id: "astronomía", label: "Astronomy", emoji: "🌌" },
];

const badgeColors: Record<string, string> = {
  clima: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  desastre: "bg-red-500/10 text-red-400 border-red-500/20",
  noticia: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  finanzas: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  astronomía: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

const dotColors: Record<string, string> = {
  clima: "group-hover:border-blue-400",
  desastre: "group-hover:border-red-400",
  noticia: "group-hover:border-emerald-400",
  finanzas: "group-hover:border-yellow-400",
  astronomía: "group-hover:border-purple-400",
};

export default function TimelineFilter({ data }: { data: TimelineEntry[] }) {
  const [filter, setFilter] = useState("all");

  const filteredData =
    filter === "all" ? data : data.filter((item) => item.category === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setFilter(cat.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all
              ${
                filter === cat.id
                  ? "bg-slate-700 text-white shadow-md"
                  : "bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white"
              }
            `}
          >
            <span>{cat.emoji}</span>
            {cat.label}
          </button>
        ))}
      </div>

      <div className="space-y-1 relative">
        <div className="absolute left-[21px] top-4 bottom-4 w-px bg-slate-800 z-0" />
        {filteredData.length > 0 ? (
          filteredData.map((item, idx) => {
            const timeStr = formatDistanceToNow(new Date(item.timestamp), {
              addSuffix: true,
              locale: enUS,
            });
            const catEmoji = CATEGORIES.find(c => c.id === item.category)?.emoji;

            return (
              <div
                key={`${item.category}-${item.id}-${idx}`}
                className="flex gap-4 p-4 rounded-xl hover:bg-slate-800/40 transition-all group cursor-pointer border border-transparent hover:border-slate-700/50 relative z-10 animate-fade-in-up"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex flex-col items-center">
                  <div
                    className={"w-3 h-3 rounded-full border-2 border-slate-700 bg-slate-900 " + (dotColors[item.category] || "group-hover:border-slate-400") + " group-hover:scale-125 mt-2 transition-all shadow-sm"}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-1.5">
                    <span
                      className={"text-[10px] font-extrabold px-2 py-0.5 rounded-md border tracking-wider " + (badgeColors[item.category] || "bg-slate-800 text-slate-300")}
                    >
                      {catEmoji} {item.category.toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">
                      {timeStr}
                    </span>
                  </div>
                  <p className="text-slate-200 font-medium group-hover:text-white transition-colors leading-snug">
                    {item.title}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 space-y-4">
            <Globe className="w-12 h-12 text-slate-700 mx-auto opacity-50" />
            <p className="text-slate-500 font-medium">
              No events found for this category.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
