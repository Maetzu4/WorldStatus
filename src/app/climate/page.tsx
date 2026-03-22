import { MapPin, Droplets, ThermometerSun, Wind } from "lucide-react";
import { query } from "@/lib/db";

// Force dynamic rendering so data is always fresh
export const dynamic = "force-dynamic";

interface WeatherSnapshot {
  location_id: string;
  timestamp: string | number | Date;
  temperature: number | string;
  humidity: number | string;
  pressure: number | string;
  wind_speed: number | string;
  uvi: number | string;
  weather_type: string;
  condition?: string;
  source: string;
}

async function getClimateData(): Promise<WeatherSnapshot[]> {
  try {
    const res = await query<WeatherSnapshot>(
      "SELECT * FROM weather_snapshots ORDER BY timestamp DESC LIMIT 100;"
    );
    return res.rows;
  } catch (error) {
    console.warn("Failed to fetch climate data:", error);
    return [];
  }
}

export default async function ClimatePage() {
  const climateData = await getClimateData();

  // Pick the latest snapshot or default values if DB is still empty
  const latest = climateData?.[0] || {
    temperature: "--",
    humidity: "--",
    condition: "Esperando datos...",
    wind_speed: "--",
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto w-full">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Section */}
        <section className="space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <ThermometerSun className="w-4 h-4" />
            <span className="text-sm font-medium tracking-wide uppercase">
              Monitor Climático
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">
            Estado Global{" "}
            <span className="text-transparent bg-clip-text from-blue-400 to-cyan-400">
              en Tiempo Real
            </span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl">
            Visualización de los ecosistemas globales actualizados cada 12 horas
            mediante monitoreo satelital y estaciones meteorológicas.
          </p>
        </section>

        {/* Hero KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative group overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 transition-all hover:border-slate-700">
            <div className="absolute inset-0 from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-orange-500/10 rounded-2xl text-orange-400">
                <ThermometerSun className="w-6 h-6" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-400 mb-1">
              Temp. Promedio
            </p>
            <p className="text-3xl font-bold text-slate-50">
              {latest.temperature}°C
            </p>
          </div>

          <div className="relative group overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 transition-all hover:border-slate-700">
            <div className="absolute inset-0 from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400">
                <Droplets className="w-6 h-6" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-400 mb-1">
              Humedad Promedio
            </p>
            <p className="text-3xl font-bold text-slate-50">
              {latest.humidity}%
            </p>
          </div>

          <div className="relative group overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 transition-all hover:border-slate-700">
            <div className="absolute inset-0 from-teal-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-teal-500/10 rounded-2xl text-teal-400">
                <Wind className="w-6 h-6" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-400 mb-1">Viento</p>
            <p className="text-3xl font-bold text-slate-50">
              {latest.wind_speed} km/h
            </p>
          </div>

          <div className="relative group overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 transition-all hover:border-slate-700">
            <div className="absolute inset-0 from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400">
                <MapPin className="w-6 h-6" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-400 mb-1">
              Condición General
            </p>
            <p className="text-3xl font-bold text-slate-50 capitalize">
              {latest.condition}
            </p>
          </div>
        </div>

        {/* Data List or Chart Placeholder */}
        <section className="rounded-3xl border border-slate-800 bg-slate-900/50 backdrop-blur-xl overflow-hidden">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white">
              Últimos Registros
            </h2>
          </div>
          <div className="divide-y divide-slate-800/50">
            {climateData && climateData.length > 0 ? (
              climateData.slice(0, 10).map((record, idx) => (
                <div
                  key={idx}
                  className="p-4 sm:p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                      <ThermometerSun className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-slate-200 font-medium capitalize">
                        {record.location_id === "global"
                          ? "Promedio Global"
                          : record.location_id}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {new Date(record.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-right">
                      <p className="text-slate-400">Temperatura</p>
                      <p className="font-mono text-slate-200">
                        {record.temperature}°C
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400">Humedad</p>
                      <p className="font-mono text-slate-200">
                        {record.humidity}%
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-slate-500">
                No hay datos climáticos disponibles todavía. Asegúrate de
                ejecutar el script recolector en Dokploy.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
