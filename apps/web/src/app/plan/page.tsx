"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { StyleSpecification } from "maplibre-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import Image from "next/image";
import homeIcon from "../../../assets/logo/home.png";
import infoIcon from "../../../assets/logo/info.png";
import accountIcon from "../../../assets/logo/account.png";
import searchIcon from "../../../assets/logo/search.svg";

const iconFilterStyle = {
  // Slightly lighter orange tint for asset icons
  filter:
    "brightness(0) saturate(100%) invert(78%) sepia(68%) saturate(2100%) hue-rotate(338deg) brightness(104%) contrast(107%)",
};

// Neutral filter for the account icon (dark gray, like the reference avatar)
const accountFilterStyle = {
  filter: "brightness(0) saturate(0%) invert(12%) sepia(5%) saturate(400%) hue-rotate(200deg) brightness(96%) contrast(92%)",
};

type Mode = "run" | "jog" | "walk" | "hike";
type MapType = "map" | "sat";

type RouteOption = {
  id: string;
  title: string;
  distanceKm: number;
  safety: string;
  elevation: string;
  estMinutes: number;
  surface: string;
  points: { x: number; y: number; label?: string }[];
};

type RoutineItem = { step: string; detail: string };
type CoachNote = { title: string; desc: string };

const modeMeta: Record<Mode, { label: string; badge: string }> = {
  run: { label: "Correr", badge: "Rápido" },
  jog: { label: "Trotar", badge: "Suave" },
  walk: { label: "Caminar", badge: "Recuperación" },
  hike: { label: "Trail", badge: "Desnivel" },
};

const baseRoutes: Record<Mode, RouteOption[]> = {
  run: [
    {
      id: "run-quick",
      title: "Ritmo estable",
      distanceKm: 8.4,
      safety: "Zonas iluminadas · Bajo tráfico",
      elevation: "+64 m",
      estMinutes: 44,
      surface: "Asfalto + parque",
      points: [
        { x: 12, y: 84, label: "Inicio" },
        { x: 36, y: 60, label: "x km" },
        { x: 66, y: 44 },
        { x: 88, y: 18, label: "Fin" },
      ],
    },
    {
      id: "run-scenic",
      title: "Escénica",
      distanceKm: 9.2,
      safety: "Parques y ciclorruta",
      elevation: "+92 m",
      estMinutes: 49,
      surface: "Verde + mixto",
      points: [
        { x: 10, y: 86, label: "Inicio" },
        { x: 32, y: 64 },
        { x: 56, y: 54, label: "Mirador" },
        { x: 80, y: 24, label: "Fin" },
      ],
    },
  ],
  jog: [
    {
      id: "jog-soft",
      title: "Suave y seguro",
      distanceKm: 6.0,
      safety: "Parques y aceras amplias",
      elevation: "+40 m",
      estMinutes: 40,
      surface: "Parque",
      points: [
        { x: 14, y: 84, label: "Inicio" },
        { x: 40, y: 62 },
        { x: 64, y: 56, label: "Pausa agua" },
        { x: 86, y: 30, label: "Fin" },
      ],
    },
  ],
  walk: [
    {
      id: "walk-daily",
      title: "Caminata diaria",
      distanceKm: 4.0,
      safety: "Alta iluminación",
      elevation: "+18 m",
      estMinutes: 48,
      surface: "Ciudad",
      points: [
        { x: 16, y: 84, label: "Inicio" },
        { x: 38, y: 70 },
        { x: 60, y: 60 },
        { x: 82, y: 34, label: "Fin" },
      ],
    },
  ],
  hike: [
    {
      id: "hike-green",
      title: "Sendero verde",
      distanceKm: 11.3,
      safety: "Terreno mixto",
      elevation: "+240 m",
      estMinutes: 92,
      surface: "Trail",
      points: [
        { x: 18, y: 86, label: "Inicio" },
        { x: 42, y: 70, label: "Bosque" },
        { x: 64, y: 54 },
        { x: 78, y: 36, label: "Cima" },
        { x: 90, y: 20, label: "Fin" },
      ],
    },
  ],
};

const defaultRoutine: RoutineItem[] = [
  { step: "Calentamiento", detail: "8 min movilidad + 5 min trote suave" },
  { step: "Bloque", detail: "4 x 1 km a ritmo 5:10/km (rec 2 min)" },
  { step: "Enfriar", detail: "8 min trote suave + estiramientos" },
];

const MAP_CENTER: [number, number] = [-74.042, 4.6946];
const cleanEnvValue = (value?: string) => (value ?? "").replace(/['"]/g, "").trim();

export default function PlanPage() {
  const [mode, setMode] = useState<Mode>("run");
  const [mapType, setMapType] = useState<MapType>("map");
  const [customRoutes, setCustomRoutes] = useState<Record<Mode, RouteOption[]>>({
    run: [],
    jog: [],
    walk: [],
    hike: [],
  });
  const [activeRouteId, setActiveRouteId] = useState(baseRoutes.run[0].id);
  const [coachPrompt, setCoachPrompt] = useState("");
  const [routine, setRoutine] = useState<RoutineItem[]>(defaultRoutine);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [coachNote, setCoachNote] = useState<CoachNote>({
    title: "Listo para salir",
    desc: "Selecciona una ruta o pide al coach que la adapte.",
  });
  const [showCoachPanel, setShowCoachPanel] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = typeof window !== "undefined" ? window.matchMedia("(max-width: 1024px)") : null;
    const update = () => setIsMobile(Boolean(mq?.matches));
    update();
    mq?.addEventListener("change", update);
    return () => mq?.removeEventListener("change", update);
  }, []);

  const routes = useMemo(
    () => [...baseRoutes[mode], ...(customRoutes[mode] ?? [])],
    [mode, customRoutes],
  );

  const activeRoute = useMemo(
    () => routes.find((r) => r.id === activeRouteId) ?? routes[0],
    [routes, activeRouteId],
  );

  const handleCoachPlan = () => {
    const prompt = coachPrompt.trim();
    if (!prompt) return;

    const parsed = parsePrompt(prompt, mode);
    setMode(parsed.mode);

    const distanceKm = parsed.distanceKm ?? suggestDistance(parsed.mode);
    const newRoute = buildRouteFromPrompt(distanceKm, parsed.mode, parsed.focus);

    setCustomRoutes((prev) => {
      const list = prev[parsed.mode] ?? [];
      return { ...prev, [parsed.mode]: [...list.filter((r) => r.id !== newRoute.id), newRoute] };
    });
    setActiveRouteId(newRoute.id);

    const routinePlan = buildRoutine(parsed.intent);
    setRoutine(routinePlan);
    setCurrentStepIndex(0);

    setCoachNote({
      title: "Coach generó ruta",
      desc: `${capitalize(modeMeta[parsed.mode].label)} · ${formatDistance(
        distanceKm,
      )} · ${parsed.focus}`,
    });
  };

  const toggleRoutes = () => setSheetOpen((prev) => !prev);
  const closeRoutes = () => setSheetOpen(false);
  const toggleCoachPanel = () => {
    setShowCoachPanel((prev) => {
      const next = !prev;
      if (next) {
        closeRoutes();
      }
      return next;
    });
  };
  const closeCoachPanel = () => setShowCoachPanel(false);

  return (
    <div className="fixed inset-0 flex bg-[#050915] text-slate-100 overflow-hidden">
      <SideRail
        onToggleRoutes={toggleRoutes}
        onToggleCoach={toggleCoachPanel}
        onClosePanels={() => {
          closeRoutes();
          closeCoachPanel();
        }}
        routesOpen={sheetOpen}
        coachOpen={showCoachPanel}
        infoOpen={infoOpen}
      />

      <div
        className={`flex h-full flex-1 flex-col md:pl-[64px] ${
          showCoachPanel && !isMobile ? "md:ml-[360px]" : ""
        }`}
      >
        <TopControls
          mapType={mapType}
          setMapType={setMapType}
          route={activeRoute}
          mode={mode}
          coachNote={coachNote}
          infoOpen={infoOpen}
          onToggleInfo={() => setInfoOpen((p) => !p)}
          isMobile={isMobile}
        />

        <div className="relative flex-1 overflow-hidden">
          <MapView
            mapType={mapType}
            route={activeRoute}
            routine={routine}
            currentStepIndex={currentStepIndex}
            onStepChange={setCurrentStepIndex}
            isMobile={isMobile}
            showCoachPanel={showCoachPanel}
          />

          <BottomSheet
            mode={mode}
            setMode={(m) => {
              setMode(m);
              const first = [...baseRoutes[m], ...(customRoutes[m] ?? [])][0]?.id;
              if (first) setActiveRouteId(first);
            }}
            routes={routes}
            activeRouteId={activeRouteId}
            setActiveRouteId={(id) => {
              setActiveRouteId(id);
              setCurrentStepIndex(0);
            }}
            open={sheetOpen}
            onToggle={() => {
              const next = !sheetOpen;
              if (next) closeCoachPanel();
              toggleRoutes();
            }}
            isMobile={isMobile}
          />

          <BottomNav
            routesOpen={sheetOpen}
            coachOpen={showCoachPanel}
            onToggleRoutes={toggleRoutes}
            onToggleCoach={toggleCoachPanel}
            onShowMap={() => {
              closeRoutes();
              closeCoachPanel();
            }}
          />

          <CoachPanel
            open={showCoachPanel}
            prompt={coachPrompt}
            onPromptChange={setCoachPrompt}
            onGenerate={handleCoachPlan}
            routine={routine}
            currentStepIndex={currentStepIndex}
            onStepChange={setCurrentStepIndex}
            onClose={closeCoachPanel}
            isMobile={isMobile}
          />
        </div>
      </div>
    </div>
  );
}

function StatPill({ label, value, mutedDesc }: { label: string; value: string; mutedDesc?: string }) {
  return (
    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2">
      <span className="text-[11px] uppercase tracking-[0.18em] text-orange-100/80">{label}</span>
      <span className="ml-2 text-sm font-semibold text-slate-50">{value}</span>
      {mutedDesc ? <span className="ml-2 text-xs text-slate-300">{mutedDesc}</span> : null}
    </div>
  );
}

function MapView({
  mapType,
  route,
  routine,
  currentStepIndex,
  onStepChange,
  isMobile,
  showCoachPanel,
}: {
  mapType: MapType;
  route: RouteOption;
  routine: RoutineItem[];
  currentStepIndex: number;
  onStepChange: (idx: number) => void;
  isMobile: boolean;
  showCoachPanel: boolean;
}) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!mapRef.current) return;

    let cancelled = false;

    const boot = async () => {
      if (mapInstance.current && typeof mapInstance.current.remove === "function") {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
      setMapReady(false);

      try {
        const maplibregl = (await import("maplibre-gl")).default;
        const satStyle = {
          version: 8 as const,
          sources: {
            esri: {
              type: "raster",
              tiles: [
                "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
              ],
              tileSize: 256,
              attribution: "© Esri & contributors",
            },
          },
          layers: [
            {
              id: "esri-sat",
              type: "raster",
              source: "esri",
              paint: {
                "raster-opacity": 0.95,
                "raster-saturation": 0,
                "raster-brightness-max": 0.92,
              },
            },
          ],
        } satisfies StyleSpecification;
        const style: string | StyleSpecification =
          mapType === "sat"
            ? satStyle
            : "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

        const map = new maplibregl.Map({
          container: mapRef.current!,
          style,
          center: MAP_CENTER,
          zoom: 13,
          pitch: mapType === "sat" ? 52 : 42,
          bearing: -12,
          attributionControl: false,
          antialias: true,
        });
        map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "bottom-right");
        map.on("load", () => {
          if (cancelled) return;
          if (mapType === "map") {
            applyPastelTheme(map);
          }
          syncRouteLayers(map, route);
          setMapReady(true);
        });
        map.on("error", (evt: any) => {
          console.error("Maplibre error", evt?.error || evt);
        });
        mapInstance.current = map;
      } catch (error) {
        console.error("Map init failed", error);
      }
    };

    boot();

    return () => {
      cancelled = true;
      setMapReady(false);
      if (mapInstance.current && typeof mapInstance.current.remove === "function") {
        mapInstance.current.remove();
      }
      mapInstance.current = null;
    };
  }, [mapType]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    if (mapReady && map.isStyleLoaded?.()) {
      syncRouteLayers(map, route);
      return;
    }
    map.once("load", () => {
      syncRouteLayers(map, route);
      setMapReady(true);
    });
  }, [route, mapReady]);

const mapBg =
  mapType === "map"
    ? "bg-[radial-gradient(circle_at_20%_20%,rgba(255,138,26,0.08),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.08),transparent_38%),#0b1222]"
    : "bg-[radial-gradient(circle_at_20%_20%,rgba(0,150,255,0.16),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(0,120,220,0.14),transparent_38%),#0b1020]";

  return (
    <div className={`relative min-h-[calc(100vh-140px)] md:min-h-[calc(100vh-64px)] overflow-hidden ${mapBg}`}>
      <div ref={mapRef} className="absolute inset-0 h-full w-full" />

      {!mapReady ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#0b1222]">
          <svg viewBox="0 0 100 130" className="h-full w-full max-w-4xl opacity-70">
            <defs>
              <linearGradient id="routeLinePlan" x1="0%" x2="100%" y1="0%" y2="100%">
                <stop offset="0%" stopColor="#2dd4bf" />
                <stop offset="100%" stopColor="#22c55e" />
              </linearGradient>
            </defs>
            <rect x="0" y="0" width="100" height="130" fill="none" />
            <path
              d={route.points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")}
              fill="none"
              stroke="url(#routeLinePlan)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {route.points.map((p, idx) => (
              <g key={`${p.x}-${p.y}-${idx}`}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="3.8"
                  fill={idx === route.points.length - 1 ? "#22c55e" : "#38bdf8"}
                  stroke="#0b0f1c"
                  strokeWidth="1.2"
                />
                {p.label ? (
                  <g transform={`translate(${p.x + 2} ${p.y - 5})`}>
                    <rect
                      x="0"
                      y="-6"
                      rx="3"
                      ry="3"
                      width="26"
                      height="14"
                      fill="rgba(6,16,36,0.92)"
                      stroke="rgba(255,255,255,0.28)"
                      strokeWidth="0.5"
                    />
                    <text
                      x="13"
                      y="3"
                      fill="#e2e8f0"
                      fontSize="3.6"
                      fontFamily="sans-serif"
                      textAnchor="middle"
                    >
                      {p.label}
                    </text>
                  </g>
                ) : null}
              </g>
            ))}
          </svg>
        </div>
      ) : null}

      <div className="absolute left-3 right-3 top-3 flex flex-wrap items-center gap-2 text-xs">
        <div className="flex items-center gap-2 rounded-full bg-[#0a0f1f]/85 px-3 py-2 text-slate-100 ring-1 ring-white/10 backdrop-blur">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Ruta óptima
        </div>
        <div className="flex items-center gap-2 rounded-full bg-[#0a0f1f]/85 px-3 py-2 text-slate-100 ring-1 ring-white/10 backdrop-blur">
          <span className="h-2 w-2 rounded-full bg-sky-400" />
          Inicio
        </div>
        <div className="flex items-center gap-2 rounded-full bg-[#0a0f1f]/85 px-3 py-2 text-slate-100 ring-1 ring-white/10 backdrop-blur">
          <span className="h-2 w-2 rounded-full bg-orange-400" />
          Waypoints
        </div>
      </div>

      {!isMobile || showCoachPanel ? (
        <div className="absolute right-3 top-16 md:top-4">
          <RoutinePeek
            routine={routine}
            currentIndex={currentStepIndex}
            onStepChange={onStepChange}
          />
        </div>
      ) : null}

      {isMobile && !showCoachPanel ? (
        <div className="absolute right-3 top-24 z-30 w-[46%] max-w-[220px] rounded-2xl border border-white/10 bg-black/60 p-3 text-xs text-slate-100 shadow-lg shadow-black/40 backdrop-blur transition-all duration-300 ease-out">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] uppercase tracking-[0.18em] text-orange-100/80">Rutina</p>
            <span className="rounded-full bg-orange-400/15 px-2 py-1 text-[10px] font-semibold text-orange-50">
              Paso {currentStepIndex + 1}/{routine.length}
            </span>
          </div>
          <div className="mt-2 rounded-xl bg-white/5 px-3 py-2">
            <p className="text-[11px] text-orange-100/90">{routine[currentStepIndex]?.step}</p>
            <p className="text-[12px] text-slate-100 line-clamp-2">{routine[currentStepIndex]?.detail}</p>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {routine.map((item, idx) => (
              <button
                key={item.step}
                type="button"
                onClick={() => onStepChange(idx)}
                className={`rounded-full px-2 py-1 text-[10px] font-semibold transition ${
                  idx === currentStepIndex
                    ? "bg-orange-400/20 text-orange-50 ring-1 ring-orange-400/30"
                    : "bg-white/5 text-slate-200 hover:bg-white/10"
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function syncRouteLayers(map: any, route: RouteOption) {
  if (!route?.points?.length) return;

  const { line, points, bounds } = buildRouteGeo(route);

  const lineSource = map.getSource("route-line");
  if (lineSource?.setData) {
    lineSource.setData(line);
  } else {
    map.addSource("route-line", { type: "geojson", data: line, lineMetrics: true });
    map.addLayer({
      id: "route-line",
      type: "line",
      source: "route-line",
      paint: {
        "line-width": ["interpolate", ["linear"], ["zoom"], 11, 4, 15, 7],
        "line-opacity": 0.9,
        "line-gradient": [
          "interpolate",
          ["linear"],
          ["line-progress"],
          0,
          "#38bdf8",
          1,
          "#22c55e",
        ],
      },
    });
  }

  const pointSource = map.getSource("route-points");
  if (pointSource?.setData) {
    pointSource.setData(points);
  } else {
    map.addSource("route-points", { type: "geojson", data: points });
    map.addLayer({
      id: "route-points",
      type: "circle",
      source: "route-points",
      paint: {
        "circle-radius": 6,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#050915",
        "circle-color": [
          "case",
          ["==", ["get", "kind"], "end"],
          "#22c55e",
          ["==", ["get", "kind"], "start"],
          "#38bdf8",
          "#fb923c",
        ],
      },
    });
    const style = map.getStyle?.();
    if (style && "glyphs" in style && style.glyphs) {
      map.addLayer({
        id: "route-point-labels",
        type: "symbol",
        source: "route-points",
        layout: {
          "text-field": ["get", "label"],
          "text-size": 11,
          "text-offset": [0, 1.4],
          "text-anchor": "top",
        },
        paint: {
          "text-color": "#e2e8f0",
          "text-halo-color": "#0b0f1c",
          "text-halo-width": 1.2,
        },
      });
    }
  }

  const isNarrow = map.getContainer ? map.getContainer().clientWidth < 768 : false;
  if (map.fitBounds && bounds) {
    map.fitBounds([bounds.sw, bounds.ne], {
      padding: isNarrow ? 32 : 80,
      duration: 750,
      maxZoom: 15.5,
    });
  }
}

function buildRouteGeo(route: RouteOption) {
  const coords = route.points.map((p) => {
    const lngOffset = (p.x - 50) * 0.00075;
    const latOffset = (50 - p.y) * 0.00075;
    return [MAP_CENTER[0] + lngOffset, MAP_CENTER[1] + latOffset] as [number, number];
  });

  const bounds = coords.reduce(
    (acc, [lng, lat]) => ({
      sw: [Math.min(acc.sw[0], lng), Math.min(acc.sw[1], lat)] as [number, number],
      ne: [Math.max(acc.ne[0], lng), Math.max(acc.ne[1], lat)] as [number, number],
    }),
    { sw: [...coords[0]] as [number, number], ne: [...coords[0]] as [number, number] },
  );

  const line = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: { type: "LineString", coordinates: coords },
        properties: { title: route.title },
      },
    ],
  };

  const points = {
    type: "FeatureCollection",
    features: coords.map((coord, idx) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: coord },
      properties: {
        label:
          route.points[idx].label ??
          (idx === 0 ? "Inicio" : idx === coords.length - 1 ? "Fin" : `P${idx + 1}`),
        kind: idx === 0 ? "start" : idx === coords.length - 1 ? "end" : "mid",
      },
    })),
  };

  return { line, points, bounds };
}

function applyPastelTheme(map: any) {
  const tweaks: Array<{ layers: string[]; paint: Record<string, any> }> = [
    {
      layers: ["landuse", "land", "background"],
      paint: {
        "background-color": "#0b0f1d",
      },
    },
    {
      layers: ["water", "waterway", "river", "canal"],
      paint: {
        "fill-color": "#1b2c48",
        "line-color": "#2d4f79",
      },
    },
    {
      layers: ["road", "road-street", "road-primary", "road-secondary", "bridge-primary", "bridge-secondary"],
      paint: {
        "line-color": "#4fb4ff",
        "line-width": 1.2,
        "line-opacity": 0.9,
      },
    },
    {
      layers: ["tunnel-secondary", "tunnel-primary"],
      paint: {
        "line-color": "#6ed0ff",
        "line-dasharray": [2, 2],
      },
    },
    {
      layers: ["road-major", "road-trunk"],
      paint: {
        "line-color": "#84ffe0",
        "line-width": 2.2,
      },
    },
    {
      layers: ["park", "landuse-park", "landuse-park-outline", "landuse-park"],
      paint: {
        "fill-color": "#164d3a",
        "fill-opacity": 0.8,
      },
    },
    {
      layers: ["building"],
      paint: {
        "fill-color": "#1a2336",
        "fill-outline-color": "#22314a",
        "fill-opacity": 0.85,
      },
    },
    {
      layers: ["aeroway", "airport-label"],
      paint: {
        "line-color": "#7dd3fc",
      },
    },
  ];

  const style = map.getStyle?.();
  if (!style?.layers) return;

  tweaks.forEach(({ layers, paint }) => {
    layers.forEach((id) => {
      if (style.layers.find((l: any) => l.id === id)) {
        Object.entries(paint).forEach(([key, val]) => {
          try {
            map.setPaintProperty(id, key, val);
          } catch {
            // ignore if layer/paint not supported
          }
        });
      }
    });
  });

  const textTweaks: Array<{ layers: string[]; paint: Record<string, any>; layout?: Record<string, any> }> = [
    {
      layers: ["place-city", "place-town", "place-village", "road-label", "water-label", "poi-label"],
      paint: {
        "text-color": "#dce7ff",
        "text-halo-color": "#0b0f1d",
        "text-halo-width": 1.2,
      },
      layout: {
        "text-size": 12,
      },
    },
  ];

  textTweaks.forEach(({ layers, paint, layout }) => {
    layers.forEach((id) => {
      if (style.layers.find((l: any) => l.id === id)) {
        Object.entries(paint).forEach(([key, val]) => {
          try {
            map.setPaintProperty(id, key, val);
          } catch {
            //
          }
        });
        if (layout) {
          Object.entries(layout).forEach(([key, val]) => {
            try {
              map.setLayoutProperty(id, key, val);
            } catch {
              //
            }
          });
        }
      }
    });
  });
}

function TopControls({
  mapType,
  setMapType,
  route,
  mode,
  coachNote,
  infoOpen,
  onToggleInfo,
  isMobile,
}: {
  mapType: MapType;
  setMapType: (m: MapType) => void;
  route: RouteOption;
  mode: Mode;
  coachNote: CoachNote;
  infoOpen: boolean;
  onToggleInfo: () => void;
  isMobile: boolean;
}) {
  const showInfo = infoOpen || !isMobile;
  return (
    <div
      className={`sticky top-0 z-40 flex flex-col gap-3 bg-[#050915]/95 px-4 py-3 backdrop-blur ${
        isMobile ? "pb-3 pt-3" : ""
      }`}
    >
      <div className="flex flex-col gap-2">
        <div className="flex w-full items-center gap-2">
          <Link
            href="/"
            aria-label="Home"
            className="flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2 text-xs font-semibold text-slate-100 transition hover:border-white/25 hover:bg-white/10"
          >
            <Image src={homeIcon} alt="Home" width={16} height={16} className="opacity-90" style={iconFilterStyle} />
          </Link>
          {isMobile ? (
            <button
              type="button"
              aria-label="Info"
              onClick={onToggleInfo}
              className={`flex items-center justify-center rounded-full border p-2 text-[11px] font-semibold transition ${
                infoOpen
                  ? "border-orange-400/60 bg-orange-500/15 text-orange-50 ring-1 ring-orange-400/40 shadow-[0_0_0_1px_rgba(255,138,26,0.25)]"
                  : "border-white/10 bg-[#0b1222]/90 text-slate-100 ring-1 ring-white/10 hover:bg-[#111a2e]"
              }`}
            >
              <Image src={infoIcon} alt="Info" width={16} height={16} className="opacity-90" style={iconFilterStyle} />
            </button>
          ) : null}
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-white/10 bg-[#0a0f1f]/85 px-3 py-2 shadow-inner shadow-black/40">
            <Image
              src={searchIcon}
              alt="Buscar"
              width={16}
              height={16}
              className="mr-2 opacity-90 shrink-0"
              style={iconFilterStyle}
            />
            <input
              className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
              placeholder="Buscar destino o punto de encuentro"
            />
            <span className="ml-2 rounded-full bg-white/10 px-3 py-1 text-[11px] text-slate-200 shrink-0">GPS</span>
          </div>
          <button
            type="button"
            aria-label="Perfil"
            className="relative ml-auto flex h-[44px] w-[44px] shrink-0 items-center justify-center overflow-visible rounded-full bg-transparent text-xs font-semibold text-slate-100 transition hover:opacity-90"
          >
            <Image
              src={accountIcon}
              alt="Perfil"
              width={36}
              height={36}
              className="opacity-90"
              style={accountFilterStyle}
            />
            <span
              className="pointer-events-none absolute bottom-0 right-0 z-20 h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.85)]"
              aria-label="Activo"
            />
          </button>
        </div>

        <div
          className={`flex w-full flex-wrap items-center gap-2 text-xs transition-all duration-300 ${
            showInfo ? "max-h-[200px] opacity-100" : "max-h-0 opacity-0 -translate-y-2 pointer-events-none"
          }`}
        >
          {showInfo ? (
            <>
              <StatPill label="ETA" value={formatEta(route.estMinutes)} />
              <StatPill label="Distancia" value={formatDistance(route.distanceKm)} />
              <StatPill label="Seguridad" value={route.safety} />
              <StatPill label="Superficie" value={route.surface} />
              <StatPill label="Coach" value={coachNote.title} mutedDesc={coachNote.desc} />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function BottomSheet({
  mode,
  setMode,
  routes,
  activeRouteId,
  setActiveRouteId,
  open,
  onToggle,
  isMobile,
}: {
  mode: Mode;
  setMode: (m: Mode) => void;
  routes: RouteOption[];
  activeRouteId: string;
  setActiveRouteId: (id: string) => void;
  open: boolean;
  onToggle: () => void;
  isMobile: boolean;
}) {
  const isHiddenMobile = isMobile && !open;
  const wrapperClass = isHiddenMobile
    ? "hidden"
    : !isMobile
      ? "pointer-events-none fixed inset-x-0 bottom-8 z-20 flex justify-center"
      : "fixed inset-x-0 bottom-0 z-50";

  const containerClass =
    isMobile && open
      ? "pointer-events-auto w-full rounded-t-3xl border-t border-white/10 bg-[#050915]/95 p-4 pb-6 shadow-2xl shadow-black/50"
      : "pointer-events-auto w-[92%] max-w-4xl rounded-3xl border border-white/10 bg-[#0a0f1f]/95 p-4 shadow-2xl shadow-orange-900/30 backdrop-blur transition-all duration-300 ease-in-out";

  const collapsedDesktop = !isMobile && !open;

  return (
    <div
      className={`${wrapperClass} transition-transform duration-300 ease-in-out ${
        open ? "translate-y-0 opacity-100" : "translate-y-[70%] opacity-80"
      }`}
    >
      <div
        className={`${containerClass} ${collapsedDesktop ? "cursor-pointer" : ""}`}
        onClick={() => {
          if (collapsedDesktop) onToggle();
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-12 rounded-full bg-white/20" />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-orange-100/80">Rutas</p>
              <p className="text-sm text-slate-200">Elige modo y variante</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggle}
            className="rounded-full bg-[#111a2e] px-3 py-2 text-xs font-semibold text-slate-100 ring-1 ring-white/10 transition hover:bg-[#16223a]"
            aria-expanded={open}
            aria-label="Mostrar/ocultar rutas"
          >
            ×
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(modeMeta).map(([key, value]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key as Mode)}
              className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                mode === key
                  ? "border-orange-400/70 bg-orange-400/15 text-orange-50"
                  : "border-white/10 bg-white/5 text-slate-200 hover:border-white/25"
              }`}
            >
              {value.label}
            </button>
          ))}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {routes.map((route) => (
            <button
              key={route.id}
              type="button"
              onClick={() => setActiveRouteId(route.id)}
              className={`flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition hover:border-white/30 ${
                route.id === activeRouteId
                  ? "border-orange-400/70 bg-orange-400/10 text-orange-50"
                  : "border-white/10 bg-white/5 text-slate-100"
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <p className="text-sm font-semibold">{route.title}</p>
                <span className="text-xs rounded-full bg-black/30 px-2 py-1">{route.surface}</span>
              </div>
              <p className="text-lg font-semibold">{formatDistance(route.distanceKm)}</p>
              <p className="text-xs text-slate-200">{route.safety}</p>
              <p className="text-xs text-slate-300">
                ETA {formatEta(route.estMinutes)} · Desnivel {route.elevation}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function BottomNav({
  routesOpen,
  coachOpen,
  onToggleRoutes,
  onToggleCoach,
  onShowMap,
}: {
  routesOpen: boolean;
  coachOpen: boolean;
  onToggleRoutes: () => void;
  onToggleCoach: () => void;
  onShowMap: () => void;
}) {
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-3 z-40 flex justify-center md:hidden">
      <div className="pointer-events-auto grid w-[92%] max-w-xl grid-cols-4 items-center justify-items-center gap-2 rounded-full border border-white/10 bg-[#0a0f1f]/95 px-4 py-2 text-slate-100 shadow-2xl shadow-orange-900/30 backdrop-blur">
        <button
          type="button"
          onClick={onShowMap}
          className="flex w-full flex-col items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-slate-200 transition hover:text-white duration-200 active:scale-95"
        >
          <span className="h-10 w-10 rounded-full bg-white/5 ring-1 ring-white/10" aria-hidden />
          Mapa
        </button>
        <button
          type="button"
          onClick={() => {
            onShowMap();
            onToggleRoutes();
          }}
          className={`flex w-full flex-col items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold transition duration-200 active:scale-95 ${
            routesOpen ? "text-orange-50" : "text-slate-200 hover:text-white"
          }`}
        >
          <span
            className={`h-10 w-10 rounded-full ring-1 transition ${
              routesOpen
                ? "bg-orange-500/20 ring-orange-400/50 shadow-[0_0_0_1px_rgba(255,138,26,0.25)]"
                : "bg-white/5 ring-white/10"
            }`}
            aria-hidden
          />
          Ruta
        </button>
        <button
          type="button"
          onClick={() => {
            onShowMap();
            onToggleCoach();
          }}
          className={`flex w-full flex-col items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold transition duration-200 active:scale-95 ${
            coachOpen ? "text-orange-50" : "text-slate-200 hover:text-white"
          }`}
        >
          <span
            className={`h-10 w-10 rounded-full ring-1 transition ${
              coachOpen
                ? "bg-orange-500/20 ring-orange-400/50 shadow-[0_0_0_1px_rgba(255,138,26,0.25)]"
                : "bg-white/5 ring-white/10"
            }`}
            aria-hidden
          />
          Coach
        </button>
        <button
          type="button"
          className="flex w-full flex-col items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-slate-200 transition hover:text-white duration-200 active:scale-95"
        >
          <span className="h-10 w-10 rounded-full bg-white/5 ring-1 ring-white/10" aria-hidden />
          Mensajes
        </button>
      </div>
    </nav>
  );
}

function RoutinePeek({
  routine,
  currentIndex,
  onStepChange,
}: {
  routine: RoutineItem[];
  currentIndex: number;
  onStepChange: (idx: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/55 px-3 py-3 text-xs text-slate-100 ring-1 ring-white/10 backdrop-blur">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold uppercase tracking-[0.2em] text-orange-100/80">Rutina</p>
        <span className="text-[11px] text-slate-300">
          Paso {currentIndex + 1} / {routine.length}
        </span>
      </div>
      <div className="rounded-xl bg-white/5 px-3 py-2">
        <p className="text-[11px] text-orange-100/90">{routine[currentIndex]?.step}</p>
        <p className="text-[12px] text-slate-100">{routine[currentIndex]?.detail}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {routine.map((item, idx) => (
          <button
            key={item.step}
            type="button"
            onClick={() => onStepChange(idx)}
            className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
              idx === currentIndex
                ? "bg-orange-400/20 text-orange-50"
                : "bg-white/5 text-slate-200 hover:bg-white/10"
            }`}
          >
            {item.step}
          </button>
        ))}
      </div>
    </div>
  );
}

function CoachPanel({
  open,
  prompt,
  onPromptChange,
  onGenerate,
  routine,
  currentStepIndex,
  onStepChange,
  className,
  onClose,
  isMobile,
}: {
  open: boolean;
  prompt: string;
  onPromptChange: (v: string) => void;
  onGenerate: () => void;
  routine: RoutineItem[];
  currentStepIndex: number;
  onStepChange: (idx: number) => void;
  className?: string;
  onClose?: () => void;
  isMobile?: boolean;
}) {
  if (isMobile && !open) return null;

  const baseMobile =
    "fixed inset-0 z-50 m-0 h-full w-full rounded-none bg-[#050915]/90 overflow-y-auto p-4 transition-all duration-300 ease-in-out";
  const baseDesktop =
    "fixed left-[64px] top-0 z-40 h-full w-[360px] max-w-[40vw] overflow-y-auto rounded-none border-r border-white/10 bg-[#050915]/92 p-5 shadow-2xl shadow-black/40 transition-all duration-300 ease-in-out";

  const stateDesktop = open
    ? "translate-x-0 opacity-100 pointer-events-auto"
    : "-translate-x-[110%] opacity-0 pointer-events-none";

  const containerClass = isMobile ? baseMobile : `${baseDesktop} ${stateDesktop}`;

  return (
    <aside className={`flex flex-col gap-4 border border-white/10 bg-slate-900/90 p-5 shadow-xl shadow-orange-900/20 ${className ?? ""} ${containerClass}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm uppercase tracking-[0.2em] text-orange-100/80">Coach</p>
          <span className="rounded-full bg-emerald-500/15 px-3 py-2 text-[11px] font-semibold text-emerald-200 ring-1 ring-emerald-500/30">
            IA simulada
          </span>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[#111a2e] px-3 py-2 text-xs font-semibold text-slate-100 ring-1 ring-white/10 transition hover:bg-[#16223a]"
            aria-label="Cerrar panel Coach"
          >
            ×
          </button>
        ) : null}
      </div>
      <p className="text-sm text-slate-300">
        Pide una rutina o ruta (ej: “Quiero 7 km suaves en parque”, “Dame intervalos rápidos”, “Un
        trail con desnivel”). Se adapta la ruta, el modo y la tabla de pasos.
      </p>
      <textarea
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        className="h-28 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 outline-none ring-0 transition focus:border-white/30 focus:bg-white/10"
        placeholder="Ej: Prepara 6 km tranquilos con 2 sprints"
      />
      <button
        type="button"
        onClick={onGenerate}
        className="w-full rounded-full bg-gradient-to-r from-[#ff8a1a] via-[#ff6a1a] to-[#ff4324] px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-orange-900/30 transition hover:brightness-110"
      >
        Generar con Coach
      </button>

        <div className="rounded-2xl border border-white/10 bg-[#0f1628] p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-100">Rutina sugerida</p>
            <span className="text-xs text-slate-300">
              Paso {currentStepIndex + 1} / {routine.length}
            </span>
        </div>
        <div className="mt-3 space-y-2 text-sm text-slate-200">
          {routine.map((item, idx) => (
            <div
              key={item.step}
              className={`rounded-xl border px-3 py-2 transition ${
                idx === currentStepIndex
                  ? "border-orange-400/60 bg-orange-400/10 text-orange-50"
                  : "border-white/10 bg-slate-900/40"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-orange-100/90">
                {item.step}
              </p>
              <p className="text-sm">{item.detail}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-slate-100">
            Clima: 12°C · Nublado
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-slate-100">
            Seguridad: alta · Iluminación buena
          </span>
        </div>
      </div>
    </aside>
  );
}

// Mapbox styles fallback handled via style URLs; no Google Maps styles needed.

function SideRail({
  onToggleRoutes,
  onToggleCoach,
  onClosePanels,
  routesOpen,
  coachOpen,
  infoOpen,
}: {
  onToggleRoutes: () => void;
  onToggleCoach: () => void;
  onClosePanels: () => void;
  routesOpen: boolean;
  coachOpen: boolean;
  infoOpen: boolean;
}) {
  const items = [
    { label: "Mapa", icon: "🧭", onClick: onClosePanels, active: !routesOpen && !coachOpen && !infoOpen },
    { label: "Ruta", icon: "🛣️", onClick: onToggleRoutes, active: routesOpen },
    {
      label: "Coach",
      icon: "🤖",
      onClick: onToggleCoach,
      active: coachOpen,
    },
    {
      label: "Chat",
      icon: "💬",
      onClick: onClosePanels,
      active: infoOpen,
    },
  ];
  return (
    <div className="fixed left-0 top-0 z-40 hidden h-full w-[64px] flex-col items-center gap-4 border-r border-white/10 bg-[#0a0f1f]/95 py-4 text-[11px] font-semibold text-slate-200 shadow-2xl shadow-black/30 backdrop-blur md:flex">
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={item.onClick}
          className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-center transition ${
            item.active ? "bg-orange-500/15 text-orange-50 ring-1 ring-orange-400/30" : "hover:bg-white/10"
          }`}
        >
          <span className="text-lg">{item.icon}</span>
          <span className="text-[10px]">{item.label}</span>
        </button>
      ))}
    </div>
  );
}

function parsePrompt(prompt: string, currentMode: Mode): {
  mode: Mode;
  distanceKm?: number;
  focus: string;
  intent: "easy" | "tempo" | "intervals" | "trail";
} {
  const lower = prompt.toLowerCase();

  const kmMatch = lower.match(/(\d+(?:[.,]\d+)?)(?:\s*(km|k|kil[oó]metros))/);
  const miMatch = lower.match(/(\d+(?:[.,]\d+)?)(?:\s*(mi|millas))/);
  const distanceKm = kmMatch
    ? parseFloat(kmMatch[1].replace(",", "."))
    : miMatch
      ? parseFloat(miMatch[1].replace(",", ".")) * 1.609
      : undefined;

  let mode: Mode = currentMode;
  if (lower.includes("caminar")) mode = "walk";
  if (lower.includes("trot")) mode = "jog";
  if (lower.includes("trail") || lower.includes("sendero")) mode = "hike";
  if (lower.includes("correr") || lower.includes("rápido") || lower.includes("interval")) mode = "run";

  const intent: "easy" | "tempo" | "intervals" | "trail" =
    lower.includes("interval") || lower.includes("series")
      ? "intervals"
      : lower.includes("tempo") || lower.includes("ritmo")
        ? "tempo"
        : lower.includes("trail") || lower.includes("desnivel")
          ? "trail"
          : "easy";

  const focus = lower.includes("parque")
    ? "Parques"
    : lower.includes("ilumin")
      ? "Iluminación alta"
      : lower.includes("tráfico")
        ? "Tráfico bajo"
        : intent === "trail"
          ? "Terreno mixto"
          : "Ruta equilibrada";

  return { mode, distanceKm, focus, intent };
}

function buildRouteFromPrompt(distanceKm: number, mode: Mode, focus: string): RouteOption {
  const estMinutes = estimateTime(distanceKm, mode);
  return {
    id: `coach-${mode}-${Math.round(distanceKm * 10)}`,
    title: `Coach: ${focus}`,
    distanceKm,
    safety: focus,
    elevation: mode === "hike" ? "+200 m" : mode === "run" ? "+80 m" : "+40 m",
    estMinutes,
    surface: mode === "hike" ? "Trail" : focus,
    points: generateShape(distanceKm),
  };
}

function generateShape(distanceKm: number): { x: number; y: number; label?: string }[] {
  const base = [
    { x: 12, y: 86, label: "Inicio" },
    { x: 36, y: 64 },
    { x: 58, y: 50 },
    { x: 82, y: 26, label: "Fin" },
  ];

  if (distanceKm > 9) {
    base.splice(2, 0, { x: 48, y: 56, label: "Punto" });
    base[base.length - 1] = { x: 86, y: 18, label: "Fin" };
  }
  if (distanceKm > 12) {
    base.splice(1, 0, { x: 26, y: 74, label: "Extra" });
  }
  return base;
}

function buildRoutine(intent: "easy" | "tempo" | "intervals" | "trail"): RoutineItem[] {
  if (intent === "intervals") {
    return [
      { step: "Calentamiento", detail: "12 min movilidad + 8 min trote" },
      { step: "Series", detail: "6 x 600 m rápido (rec 90s trote)" },
      { step: "Progresivo", detail: "2 km subiendo ritmo" },
      { step: "Enfriar", detail: "10 min trote + estiramientos" },
    ];
  }
  if (intent === "tempo") {
    return [
      { step: "Calentamiento", detail: "10 min trote + técnica de carrera" },
      { step: "Tempo", detail: "20 min a ritmo controlado" },
      { step: "Bloque", detail: "2 x 1 km a ritmo de 10K" },
      { step: "Enfriar", detail: "8 min trote + movilidad" },
    ];
  }
  if (intent === "trail") {
    return [
      { step: "Calentamiento", detail: "12 min movilidad + subidas suaves" },
      { step: "Bloque", detail: "4 km subida controlada" },
      { step: "Técnico", detail: "3 km bajada con pasos cortos" },
      { step: "Enfriar", detail: "10 min caminata plana" },
    ];
  }
  return [
    { step: "Calentamiento", detail: "8 min movilidad + 5 min trote suave" },
    { step: "Bloque", detail: "20-30 min ritmo conversacional" },
    { step: "Strides", detail: "4 x 20s aceleración suave" },
    { step: "Enfriar", detail: "8 min trote suave + estiramientos" },
  ];
}

function suggestDistance(mode: Mode): number {
  if (mode === "walk") return 4.5;
  if (mode === "jog") return 6.5;
  if (mode === "hike") return 10.5;
  return 8.0;
}

function estimateTime(distanceKm: number, mode: Mode): number {
  const pace =
    mode === "walk" ? 11.5 : mode === "jog" ? 6.5 : mode === "hike" ? 10.5 : 5.2;
  return Math.round((distanceKm * pace) / 1.0);
}

function formatDistance(km: number): string {
  return `${km.toFixed(1)} km`;
}

function formatEta(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
