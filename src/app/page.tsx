import Link from "next/link";
import {
  CloudRain,
  ShieldAlert,
  Newspaper,
  TrendingUp,
  Moon,
  ArrowRight,
} from "lucide-react";

export default function Home() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12">
      <header className="space-y-4">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
          World Status
        </h1>
        <p className="text-lg text-slate-300 max-w-3xl leading-relaxed">
          Estado del mundo en las últimas 24 horas. Monitoreo en tiempo real de{" "}
          <span className="text-blue-400 font-medium">clima global</span>,{" "}
          <span className="text-red-400 font-medium">desastres naturales</span>{" "}
          registrados,{" "}
          <span className="text-emerald-400 font-medium">
            noticias globales
          </span>
          ,{" "}
          <span className="text-yellow-400 font-medium">
            índices financieros
          </span>{" "}
          y{" "}
          <span className="text-purple-400 font-medium">
            eventos astronómicos
          </span>
          .
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <DashboardCard
          title="Clima"
          description="Condiciones y alertas"
          href="/climate"
          icon={<CloudRain className="w-8 h-8 text-blue-400" />}
          bgClass="bg-blue-950/20 hover:bg-blue-900/30 border-blue-900/50"
        />
        <DashboardCard
          title="Desastres"
          description="Reportes recientes"
          href="/disasters"
          icon={<ShieldAlert className="w-8 h-8 text-red-400" />}
          bgClass="bg-red-950/20 hover:bg-red-900/30 border-red-900/50"
        />
        <DashboardCard
          title="Noticias"
          description="Titulares globales"
          href="/news"
          icon={<Newspaper className="w-8 h-8 text-emerald-400" />}
          bgClass="bg-emerald-950/20 hover:bg-emerald-900/30 border-emerald-900/50"
        />
        <DashboardCard
          title="Finanzas"
          description="Índices de mercado"
          href="/finance"
          icon={<TrendingUp className="w-8 h-8 text-yellow-400" />}
          bgClass="bg-yellow-950/20 hover:bg-yellow-900/30 border-yellow-900/50"
        />
        <DashboardCard
          title="Astronomía"
          description="Fenómenos y alertas"
          href="/astronomy"
          icon={<Moon className="w-8 h-8 text-purple-400" />}
          bgClass="bg-purple-950/20 hover:bg-purple-900/30 border-purple-900/50"
        />
      </section>

      <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            Línea de Tiempo (Últimas 24h)
          </h2>
          <span className="text-sm px-3 py-1 bg-slate-800 text-slate-300 rounded-full">
            Actualización automática
          </span>
        </div>

        {/* En un entorno real, este componente haría fetch a un endpoint agregado o a los 5 endpoints */}
        <div className="space-y-4">
          <TimelineItem
            category="desastre"
            title="Sismo Magnitud 6.1 reportado en la costa del Pacífico"
            time="Hace 1 hora"
          />
          <TimelineItem
            category="clima"
            title="Alerta de huracán elevada a Categoría 3 en el golfo"
            time="Hace 2 horas"
          />
          <TimelineItem
            category="finanzas"
            title="El S&P 500 cierra con un alza del 1.2%"
            time="Hace 4 horas"
          />
          <TimelineItem
            category="noticia"
            title="Cumbre global sobre cambio climático concluye acuerdos importantes"
            time="Hace 5 horas"
          />
          <TimelineItem
            category="astronomía"
            title="Eyección de masa coronal (CME) detectada por NASA DONKI"
            time="Hace 6 horas"
          />
        </div>
      </section>
    </div>
  );
}

function DashboardCard({
  title,
  description,
  href,
  icon,
  bgClass,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  bgClass: string;
}) {
  return (
    <Link
      href={href}
      className={`block group relative rounded-2xl border p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl overflow-hidden ${bgClass}`}
    >
      <div className="absolute inset-0 from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative z-10 flex flex-col h-full justify-between space-y-4">
        <div className="flex justify-between items-start">
          <div className="p-3 bg-slate-900/50 rounded-xl rounded-tl-none">
            {icon}
          </div>
          <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-all -translate-x-4 group-hover:translate-x-0 text-white/50" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white mb-1 group-hover:text-blue-100 transition-colors">
            {title}
          </h3>
          <p className="text-sm font-medium text-slate-400 group-hover:text-slate-300 transition-colors">
            {description}
          </p>
        </div>
      </div>
    </Link>
  );
}

function TimelineItem({
  category,
  title,
  time,
}: {
  category: string;
  title: string;
  time: string;
}) {
  const badgeColors: Record<string, string> = {
    clima: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    desastre: "bg-red-500/10 text-red-400 border-red-500/20",
    noticia: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    finanzas: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    astronomía: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  };

  return (
    <div className="flex gap-4 p-4 rounded-xl hover:bg-slate-800/50 transition-colors group cursor-pointer border border-transparent hover:border-slate-700/50">
      <div className="flex flex-col items-center">
        <div className="w-2 h-2 rounded-full bg-slate-600 group-hover:bg-blue-400 mt-2 transition-colors" />
        <div className="flex-1 w-px bg-slate-800 my-2" />
      </div>
      <div className="flex-1 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${badgeColors[category] || "bg-slate-800 text-slate-300"}`}
          >
            {category.toUpperCase()}
          </span>
          <span className="text-sm text-slate-500 font-medium">{time}</span>
        </div>
        <p className="text-slate-200 font-medium group-hover:text-white transition-colors">
          {title}
        </p>
      </div>
    </div>
  );
}
