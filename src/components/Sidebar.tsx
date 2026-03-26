"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CloudRain,
  ShieldAlert,
  Newspaper,
  TrendingUp,
  Moon,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/climate", label: "Climate", icon: CloudRain },
  { href: "/disasters", label: "Natural Disasters", icon: ShieldAlert },
  { href: "/news", label: "Global News", icon: Newspaper },
  { href: "/finance", label: "Finance", icon: TrendingUp },
  { href: "/astronomy", label: "Astronomy", icon: Moon },
];

const emptySubscribe = () => () => {};

export default function Sidebar() {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  
  const pathname = usePathname() || "";
  
  // Return a non-interactive shell during SSR to avoid hook issues and focus on layout
  if (!mounted) {
    return (
      <aside className="w-64 bg-slate-900 border-r border-slate-800 hidden md:flex flex-col h-screen sticky top-0">
        <div className="p-6">
          <h1 className="text-2xl font-bold from-blue-400 to-indigo-500 bg-clip-text">
            World Status
          </h1>
          <p className="text-sm text-slate-400 mt-2">24h Global Monitor</p>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4" />
        <div className="p-6 border-t border-slate-800/50">
          <div className="text-xs text-slate-500 text-center uppercase tracking-tighter font-bold">
            Initializing...
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 hidden md:flex flex-col h-screen sticky top-0">
      <div className="p-6">
        <h1 className="text-2xl font-bold from-blue-400 to-indigo-500 bg-clip-text">
          World Status
        </h1>
        <p className="text-sm text-slate-400 mt-2">24h Global Monitor</p>
      </div>
      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? "bg-blue-500/10 text-blue-400 shadow-[inset_0_1px_0_0_rgba(148,163,184,0.1)]"
                  : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
              }`}
            >
              <item.icon
                className={`w-5 h-5 ${isActive ? "text-blue-400" : "text-slate-400"}`}
              />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-6 border-t border-slate-800/50">
        <div className="text-xs text-slate-500 text-center">
          Updated every 6h
        </div>
      </div>
    </aside>
  );
}
