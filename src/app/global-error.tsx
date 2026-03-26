"use client";

import { Inter } from "next/font/google";
import { AlertTriangle } from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.className} bg-slate-950 text-slate-50 min-h-screen flex flex-col items-center justify-center`}
      >
        <div className="p-8 max-w-xl mx-auto text-center space-y-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl">
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            System Error
          </h1>
          <p className="text-slate-400">
            A critical error occurred while rendering the dashboard. Our systems
            have logged the event.
          </p>
          <div className="pt-4">
            <button
              onClick={() => reset()}
              className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors shadow-lg shadow-blue-500/20"
            >
              Recover Application
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
