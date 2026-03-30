"use client";

import {
  useState,
  useEffect,
  useSyncExternalStore,
  type ComponentType,
} from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

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
) as ComponentType<
  MarkerProps & { icon?: import("leaflet").Icon | import("leaflet").DivIcon }
>;
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), {
  ssr: false,
}) as ComponentType<PopupProps>;

export interface MapPoint {
  id: string;
  type: "weather" | "disaster" | "news" | "astronomy";
  lat: number;
  lon: number;
  title: string;
  description: string;
  link: string;
  severity?: "low" | "medium" | "high";
  source?: string;
  meta?: Record<string, string | number>;
}

type LayerKey = "weather" | "disaster" | "news" | "astronomy";

const LAYER_CONFIG: Record<
  LayerKey,
  {
    label: string;
    color: string;
    dotClass: string;
    glowClass: string;
    ringClass: string;
  }
> = {
  weather: {
    label: "Weather",
    color: "#3b82f6",
    dotClass: "bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)]",
    glowClass: "shadow-[0_0_8px_rgba(59,130,246,0.8)]",
    ringClass: "border-blue-500",
  },
  disaster: {
    label: "Disasters",
    color: "#ef4444",
    dotClass: "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)]",
    glowClass: "shadow-[0_0_8px_rgba(239,68,68,0.8)]",
    ringClass: "border-red-500 animate-[ping_2s_ease-in-out_infinite]",
  },
  news: {
    label: "News",
    color: "#10b981",
    dotClass: "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)]",
    glowClass: "shadow-[0_0_8px_rgba(16,185,129,0.8)]",
    ringClass: "border-emerald-500",
  },
  astronomy: {
    label: "Astronomy",
    color: "#a855f7",
    dotClass: "bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.8)]",
    glowClass: "shadow-[0_0_8px_rgba(168,85,247,0.8)]",
    ringClass: "border-purple-500",
  },
};

const emptySubscribe = () => () => {};

export default function GlobalMap({ points }: { points: MapPoint[] }) {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    weather: true,
    disaster: true,
    news: true,
    astronomy: true,
  });

  useEffect(() => {
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

  const toggleLayer = (key: LayerKey) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Cluster nearby points
  const clusterRadius = 0.8; // degrees
  const filteredPoints = points.filter((p) => layers[p.type as LayerKey]);

  interface ClusterGroup {
    points: MapPoint[];
    lat: number;
    lon: number;
  }

  const clusters: ClusterGroup[] = [];
  const used = new Set<number>();

  filteredPoints.forEach((p, i) => {
    if (used.has(i)) return;
    const group: MapPoint[] = [p];
    used.add(i);
    filteredPoints.forEach((q, j) => {
      if (used.has(j)) return;
      if (
        Math.abs(p.lat - q.lat) < clusterRadius &&
        Math.abs(p.lon - q.lon) < clusterRadius
      ) {
        group.push(q);
        used.add(j);
      }
    });
    const avgLat = group.reduce((s, g) => s + g.lat, 0) / group.length;
    const avgLon = group.reduce((s, g) => s + g.lon, 0) / group.length;
    clusters.push({ points: group, lat: avgLat, lon: avgLon });
  });

  const createIcon = (type: MapPoint["type"]) => {
    if (!L) return undefined;
    const config = LAYER_CONFIG[type as LayerKey] || LAYER_CONFIG.news;
    return L.divIcon({
      className: "custom-leaflet-icon",
      html: `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-4 h-4 rounded-full border ${config.ringClass} opacity-75"></div>
          <div class="w-2.5 h-2.5 rounded-full border border-slate-900 ${config.dotClass}"></div>
        </div>
      `,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
  };

  const createClusterIcon = (count: number) => {
    if (!L) return undefined;
    const size = count > 20 ? 48 : count > 10 ? 40 : 32;
    return L.divIcon({
      className: "custom-leaflet-icon",
      html: `
        <div class="flex items-center justify-center rounded-full bg-slate-700/90 border-2 border-blue-400/60 backdrop-blur-sm shadow-[0_0_20px_rgba(59,130,246,0.3)]" style="width:${size}px;height:${size}px;">
          <span class="text-xs font-black text-white">${count}</span>
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  };

  const renderPopupContent = (point: MapPoint) => {
    const config = LAYER_CONFIG[point.type as LayerKey] || LAYER_CONFIG.news;
    const severityColors = {
      low: "text-emerald-500",
      medium: "text-amber-500",
      high: "text-red-500",
    };

    if (point.type === "weather" && point.meta) {
      return `
        <div style="min-width:180px;font-family:Inter,system-ui,sans-serif;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
            <div style="width:8px;height:8px;border-radius:50%;background:${config.color};"></div>
            <strong style="font-size:13px;color:#1e293b;">Weather Station</strong>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;font-size:12px;">
            <span style="color:#64748b;">Temp</span>
            <span style="font-weight:700;color:#0f172a;">${point.meta.temperature}°C</span>
            <span style="color:#64748b;">Humidity</span>
            <span style="font-weight:700;color:#0f172a;">${point.meta.humidity}%</span>
            <span style="color:#64748b;">Wind</span>
            <span style="font-weight:700;color:#0f172a;">${point.meta.wind} km/h</span>
          </div>
          ${point.source ? `<div style="margin-top:8px;font-size:10px;color:#94a3b8;">Source: ${point.source}</div>` : ""}
        </div>
      `;
    }

    return `
      <div style="min-width:200px;max-width:260px;font-family:Inter,system-ui,sans-serif;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
          <div style="width:8px;height:8px;border-radius:50%;background:${config.color};"></div>
          <span style="font-size:10px;text-transform:uppercase;font-weight:800;color:${config.color};letter-spacing:0.05em;">${config.label}</span>
        </div>
        <strong style="display:block;font-size:13px;color:#1e293b;margin-bottom:4px;line-height:1.3;">${point.title}</strong>
        ${point.description ? `<p style="font-size:11px;color:#64748b;margin-bottom:6px;line-height:1.4;">${point.description}</p>` : ""}
        <div style="display:flex;justify-content:space-between;align-items:center;">
          ${point.severity ? `<span class="${severityColors[point.severity]}" style="font-size:10px;font-weight:700;text-transform:uppercase;">${point.severity} severity</span>` : ""}
          ${point.source ? `<span style="font-size:10px;color:#94a3b8;">Source: ${point.source}</span>` : ""}
        </div>
        ${point.link && point.link !== "#" ? `<a href="${point.link}" target="_blank" rel="noopener" style="display:inline-block;margin-top:6px;font-size:11px;color:#3b82f6;font-weight:600;">View details →</a>` : ""}
      </div>
    `;
  };

  return (
    <div className="w-full h-[500px] rounded-xl overflow-hidden border border-slate-800 relative z-0">
      {/* Layer Controls */}
      <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-md border border-slate-700/50 p-3 rounded-xl flex flex-col gap-2.5">
        <span className="text-[10px] uppercase font-extrabold text-slate-500 tracking-widest mb-0.5">
          Layers
        </span>
        {(Object.keys(LAYER_CONFIG) as LayerKey[]).map((key) => {
          const cfg = LAYER_CONFIG[key];
          return (
            <button
              key={key}
              onClick={() => toggleLayer(key)}
              className={`flex items-center gap-2 text-xs font-semibold transition-all rounded-md px-2 py-1 ${
                layers[key]
                  ? "text-white bg-slate-800/60"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <div
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  layers[key] ? cfg.glowClass : "bg-slate-700"
                }`}
                style={layers[key] ? { backgroundColor: cfg.color } : {}}
              />
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Legend Overlay */}
      <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-md border border-slate-700/50 p-3 rounded-lg flex flex-col gap-1.5">
        <span className="text-[10px] uppercase font-extrabold text-slate-500 tracking-widest mb-0.5">
          {filteredPoints.length} Events
        </span>
        {(Object.keys(LAYER_CONFIG) as LayerKey[]).map((key) => {
          if (!layers[key]) return null;
          const cfg = LAYER_CONFIG[key];
          const count = points.filter((p) => p.type === key).length;
          if (count === 0) return null;
          return (
            <div key={key} className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${cfg.glowClass}`}
                style={{ backgroundColor: cfg.color }}
              />
              <span className="text-xs font-medium text-slate-300">
                {cfg.label} <span className="text-slate-500">({count})</span>
              </span>
            </div>
          );
        })}
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
        {clusters.map((cluster, ci) => {
          if (cluster.points.length === 1) {
            const point = cluster.points[0];
            return (
              <Marker
                key={point.id}
                position={[point.lat, point.lon]}
                icon={createIcon(point.type)}
              >
                <Popup>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: renderPopupContent(point),
                    }}
                  />
                </Popup>
              </Marker>
            );
          }
          // Cluster marker
          return (
            <Marker
              key={`cluster-${ci}`}
              position={[cluster.lat, cluster.lon]}
              icon={createClusterIcon(cluster.points.length)}
            >
              <Popup>
                <div
                  style={{
                    fontFamily: "Inter,system-ui,sans-serif",
                    minWidth: 180,
                  }}
                >
                  <strong
                    style={{
                      display: "block",
                      fontSize: 13,
                      marginBottom: 6,
                      color: "#1e293b",
                    }}
                  >
                    {cluster.points.length} events in this area
                  </strong>
                  <div style={{ maxHeight: 150, overflowY: "auto" }}>
                    {cluster.points.slice(0, 8).map((p) => (
                      <div
                        key={p.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "3px 0",
                          borderBottom: "1px solid #f1f5f9",
                          fontSize: 11,
                        }}
                      >
                        <div
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            backgroundColor:
                              LAYER_CONFIG[p.type as LayerKey]?.color ||
                              "#10b981",
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            color: "#475569",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {p.title}
                        </span>
                      </div>
                    ))}
                    {cluster.points.length > 8 && (
                      <div
                        style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}
                      >
                        +{cluster.points.length - 8} more events
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
