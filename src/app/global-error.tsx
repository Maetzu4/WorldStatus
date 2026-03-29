"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-50 min-h-screen flex flex-col items-center justify-center p-8 space-y-4">
        <h2 className="text-3xl font-bold text-red-500">Something went wrong globally!</h2>
        <p className="text-slate-400 max-w-md text-center">
          A critical error occurred. Please try to recover by clicking the button below.
        </p>
        <button
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          onClick={() => reset()}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
