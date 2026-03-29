"use client";

import { useEffect, useSyncExternalStore, type ComponentType } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

// Leaflet is strictly client-side. We use dynamic import to avoid SSR errors.
interface MapContainerProps {
  center?: [number, number];
  zoom?: number;
  scrollWheelZoom?: boolean;
  className?: string;
  children?: React.ReactNode;
}
interface TileLayerProps {
  attribution?: string;
  url: string;
}
interface MarkerProps {
  position: [number, number];
  children?: React.ReactNode;
}
interface PopupProps {
  children?: React.ReactNode;
}

let L: typeof import("leaflet") | null = null;
if (typeof window !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  L = require("leaflet");
}

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false },
) as ComponentType<MapContainerProps>;
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false },
) as ComponentType<TileLayerProps>;
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false },
) as ComponentType<MarkerProps & { icon?: import("leaflet").Icon | import("leaflet").DivIcon }>;
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), {
  ssr: false,
}) as ComponentType<PopupProps>;

interface MapPoint {
  id: string;
  type: "weather" | "disaster" | "news";
  lat: number;
  lon: number;
  title: string;
  description: string;
  link: string;
}

const emptySubscribe = () => () => {};

export default function GlobalMap({ points }: { points: MapPoint[] }) {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  useEffect(() => {
    // Fix leaflet marker icon issues with Webpack
    const w = window as unknown as {
      L?: {
        Icon?: {
          Default?: {
            prototype?: {
              _getIconUrl?: string;
            };
          };
        };
      };
    };
    if (w.L?.Icon?.Default?.prototype) {
      delete w.L.Icon.Default.prototype._getIconUrl;
    }
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-[500px] bg-slate-900 animate-pulse rounded-xl" />
    );
  }

  const createIcon = (type: MapPoint["type"]) => {
    if (!L) return undefined;

    let colorClass, ringClass;
    if (type === "disaster") {
      colorClass = "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)]";
      ringClass = "border-red-500 animate-[ping_2s_ease-in-out_infinite]";
    } else if (type === "weather") {
      colorClass = "bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)]";
      ringClass = "border-blue-500";
    } else {
      colorClass = "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)]";
      ringClass = "border-emerald-500";
    }

    return L.divIcon({
      className: "custom-leaflet-icon",
      html: `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-4 h-4 rounded-full border ${ringClass} opacity-75"></div>
          <div class="w-2.5 h-2.5 rounded-full border border-slate-900 ${colorClass}"></div>
        </div>
      `,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
  };

  return (
    <div className="w-full h-[500px] rounded-xl overflow-hidden border border-slate-800 relative z-0">
      {/* Legend Overlay */}
      <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-md border border-slate-700/50 p-3 rounded-lg flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
          <span className="text-xs font-medium text-slate-300">Disasters</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
          <span className="text-xs font-medium text-slate-300">Climate</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
          <span className="text-xs font-medium text-slate-300">News</span>
        </div>
      </div>

      <MapContainer
        center={[20, 0]}
        zoom={2}
        scrollWheelZoom={false}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {points.map((point) => (
          <Marker
            key={point.id}
            position={[point.lat, point.lon]}
            icon={createIcon(point.type)}
          >
            <Popup>
              <div className="p-1">
                <strong className="block mb-1 text-slate-900">
                  {point.title}
                </strong>
                <p className="text-sm text-slate-600 mb-2">
                  {point.description}
                </p>
                <a
                  href={point.link}
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  View details &rarr;
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
