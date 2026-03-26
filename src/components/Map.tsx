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
interface CircleMarkerProps {
  center: [number, number];
  radius?: number;
  pathOptions?: {
    color?: string;
    fillColor?: string;
    fillOpacity?: number;
    weight?: number;
    className?: string;
  };
  children?: React.ReactNode;
}
interface PopupProps {
  children?: React.ReactNode;
}

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false },
) as ComponentType<MapContainerProps>;
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false },
) as ComponentType<TileLayerProps>;
const CircleMarker = dynamic(
  () => import("react-leaflet").then((mod) => mod.CircleMarker),
  { ssr: false },
) as ComponentType<CircleMarkerProps>;
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), {
  ssr: false,
}) as ComponentType<PopupProps>;

import { type MapPoint } from "@/lib/dashboard";

const emptySubscribe = () => () => {};

// Color config per point type
const markerStyles: Record<
  string,
  { fillColor: string; color: string; radius: number; label: string }
> = {
  weather: {
    fillColor: "#22d3ee",
    color: "#0891b2",
    radius: 7,
    label: "Weather",
  },
  disaster: {
    fillColor: "#ef4444",
    color: "#dc2626",
    radius: 9,
    label: "Disaster",
  },
  news: {
    fillColor: "#34d399",
    color: "#059669",
    radius: 7,
    label: "News",
  },
};

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

  return (
    <div className="w-full h-[500px] rounded-xl overflow-hidden border border-slate-800 relative z-0">
      <MapContainer
        center={[20, 0]}
        zoom={2}
        scrollWheelZoom={false}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {points.map((point) => {
          const style = markerStyles[point.type] ?? markerStyles.news;
          return (
            <CircleMarker
              key={point.id}
              center={[point.lat, point.lon]}
              radius={style.radius}
              pathOptions={{
                fillColor: style.fillColor,
                color: style.color,
                fillOpacity: 0.85,
                weight: 2,
              }}
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
                    className="text-xs text-blue-600 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View details
                  </a>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Inline legend */}
      <div className="absolute bottom-4 right-4 z-1000 bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-lg px-3 py-2.5 shadow-xl">
        <p className="text-[9px] uppercase font-bold text-slate-400 tracking-widest mb-1.5">
          Legend
        </p>
        <div className="flex flex-col gap-1.5">
          {Object.entries(markerStyles).map(([key, style]) => (
            <div key={key} className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: style.fillColor }}
              />
              <span className="text-[10px] text-slate-300 font-medium">
                {style.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
