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
) as ComponentType<MarkerProps>;
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
      <div className="w-full h-[400px] bg-slate-900 animate-pulse rounded-xl" />
    );
  }

  return (
    <div className="w-full h-[400px] rounded-xl overflow-hidden border border-slate-800 relative z-0">
      <MapContainer
        center={[20, 0]}
        zoom={2}
        scrollWheelZoom={false}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map((point) => (
          <Marker key={point.id} position={[point.lat, point.lon]}>
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
                  Ver detalles
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
