"use client";

import { useState } from "react";
import {
  CloudRain,
  ShieldAlert,
  Newspaper,
  TrendingUp,
  Moon,
  Globe,
} from "lucide-react";

export interface TimelineItemData {
  id: string;
  category: string;
  title: string;
  time: string;
}

const categoryConfig: Record<
  string,
  { color: string; dotColor: string; borderColor: string; icon: React.ReactNode; label: string; pillBg: string; pillText: string; pillBorder: string }
> = {
  climate: {
    color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    dotColor: "bg-blue-400 border-blue-400",
    borderColor: "border-l-blue-500",
    icon: <CloudRain className="w-3.5 h-3.5" />,
    label: "Climate",
    pillBg: "bg-blue-500",
    pillText: "text-blue-400",
    pillBorder: "border-blue-500/30",
  },
  disaster: {
    color: "bg-red-500/10 text-red-400 border-red-500/20",
    dotColor: "bg-red-400 border-red-400",
    borderColor: "border-l-red-500",
    icon: <ShieldAlert className="w-3.5 h-3.5" />,
    label: "Disaster",
    pillBg: "bg-red-500",
    pillText: "text-red-400",
    pillBorder: "border-red-500/30",
  },
  news: {
    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    dotColor: "bg-emerald-400 border-emerald-400",
    borderColor: "border-l-emerald-500",
    icon: <Newspaper className="w-3.5 h-3.5" />,
    label: "News",
    pillBg: "bg-emerald-500",
    pillText: "text-emerald-400",
    pillBorder: "border-emerald-500/30",
  },
  finance: {
    color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    dotColor: "bg-yellow-400 border-yellow-400",
    borderColor: "border-l-yellow-500",
    icon: <TrendingUp className="w-3.5 h-3.5" />,
    label: "Finance",
    pillBg: "bg-yellow-500",
    pillText: "text-yellow-400",
    pillBorder: "border-yellow-500/30",
  },
  astronomy: {
    color: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    dotColor: "bg-purple-400 border-purple-400",
    borderColor: "border-l-purple-500",
    icon: <Moon className="w-3.5 h-3.5" />,
    label: "Astronomy",
    pillBg: "bg-purple-500",
    pillText: "text-purple-400",
    pillBorder: "border-purple-500/30",
  },
};

const allFilters = ["all", "climate", "disaster", "news", "finance", "astronomy"] as const;

export default function TimelineClient({ items }: { items: TimelineItemData[] }) {
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const filteredItems =
    activeFilter === "all"
      ? items
      : items.filter((item) => item.category === activeFilter);

  return (
    <>
      {/* Filter pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {allFilters.map((filter) => {
          const isActive = activeFilter === filter;
          const cfg = categoryConfig[filter];

          if (filter === "all") {
            return (
              <button
                key={filter}
                onClick={() => setActiveFilter("all")}
                className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-wide border transition-all cursor-pointer ${
                  isActive
                    ? "bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/25"
                    : "bg-slate-800/60 text-slate-400 border-slate-700 hover:border-slate-600 hover:text-slate-300"
                }`}
              >
                All
              </button>
            );
          }

          return (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-wide border transition-all cursor-pointer flex items-center gap-1.5 ${
                isActive
                  ? `${cfg.pillBg} text-white border-transparent shadow-lg`
                  : `bg-slate-800/60 ${cfg.pillText} ${cfg.pillBorder} hover:bg-slate-700/60`
              }`}
            >
              {cfg.icon}
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Timeline items */}
      <div className="space-y-1 relative">
        <div className="absolute left-[21px] top-4 bottom-4 w-px bg-slate-800 z-0" />
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => {
            const cfg = categoryConfig[item.category];
            const dotColor = cfg?.dotColor || "bg-slate-500 border-slate-500";
            const borderColor = cfg?.borderColor || "border-l-slate-600";

            return (
              <div
                key={item.id}
                className={`flex gap-4 p-4 rounded-xl hover:bg-slate-800/40 transition-all group cursor-pointer border border-transparent hover:border-slate-700/50 relative z-10 border-l-[3px] ${borderColor} bg-slate-900/30`}
              >
                <div className="flex flex-col items-center">
                  <div
                    className={`w-3 h-3 rounded-full border-2 ${dotColor} mt-2 transition-all shadow-sm group-hover:scale-125`}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-1.5">
                    <div
                      className={`flex items-center gap-2 text-[10px] font-black px-2 py-0.5 rounded-md border tracking-wider ${cfg?.color || "bg-slate-800 text-slate-300"}`}
                    >
                      {cfg?.icon}
                      {item.category.toUpperCase()}
                    </div>
                    <span className="text-xs text-slate-500 font-semibold">
                      {item.time}
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
    </>
  );
}
