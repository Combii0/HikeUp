"use client";

import type {
  GeoJSONSource,
  Map as MapLibreMap,
  StyleSpecification,
} from "maplibre-gl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import Image from "next/image";
import accountIcon from "../../../assets/account.png";
import botIcon from "../../../assets/bot.png";
import chatIcon from "../../../assets/chat.png";
import homeIcon from "../../../assets/home.png";
import infoIcon from "../../../assets/info.png";
import mapIcon from "../../../assets/map.png";
import routeIcon from "../../../assets/route.png";
import searchIcon from "../../../assets/search.svg";
import {
  logoutUser,
  resolveAuthUser,
  subscribeFriendsSnapshot,
  type User,
} from "../../lib/fakeAuth";
import AccountModal from "../components/AccountModal";
import LoginModal from "../components/LoginModal";

const iconFilterStyle = {
  // Accent-aware icon tint driven by globals.css theme variables
  filter: "var(--icon-accent-filter)",
};

// Neutral filter for the account icon (dark gray, like the reference avatar)
const accountFilterStyle = {
  filter:
    "brightness(0) saturate(0%) invert(12%) sepia(5%) saturate(400%) hue-rotate(200deg) brightness(96%) contrast(92%)",
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
const _cleanEnvValue = (value?: string) =>
  (value ?? "").replace(/['"]/g, "").trim();

export default function PlanPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("run");
  const [mapType] = useState<MapType>("map");
  const [customRoutes, _setCustomRoutes] = useState<
    Record<Mode, RouteOption[]>
  >({
    run: [],
    jog: [],
    walk: [],
    hike: [],
  });

  const [loginOpen, setLoginOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [authLoading, setAuthLoading] = useState(true);

  const [activeRouteId, setActiveRouteId] = useState(baseRoutes.run[0].id);
  const [coachPrompt, setCoachPrompt] = useState("");
  const [routine, _setRoutine] = useState<RoutineItem[]>(defaultRoutine);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [coachNote, _setCoachNote] = useState<CoachNote>({
    title: "Listo para salir",
    desc: "Selecciona una ruta o pide al coach que la adapte.",
  });
  const [showCoachPanel, setShowCoachPanel] = useState(false);
  const [showAchievementsPanel, setShowAchievementsPanel] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq =
      typeof window !== "undefined"
        ? window.matchMedia("(max-width: 1024px)")
        : null;
    const update = () => setIsMobile(Boolean(mq?.matches));
    update();
    mq?.addEventListener("change", update);
    return () => mq?.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const syncAuth = async () => {
      try {
        const user = await resolveAuthUser();
        setCurrentUser(user);
      } finally {
        setAuthLoading(false);
      }
    };
    void syncAuth();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setPendingRequests(0);
      return;
    }

    const unsubscribe = subscribeFriendsSnapshot(
      (snapshot) => setPendingRequests(snapshot.incoming.length),
      () => setPendingRequests(0),
    );
    return () => unsubscribe();
  }, [currentUser]);

  const routes = useMemo(
    () => [...baseRoutes[mode], ...(customRoutes[mode] ?? [])],
    [mode, customRoutes],
  );

  const activeRoute = useMemo(
    () => routes.find((r) => r.id === activeRouteId) ?? routes[0],
    [routes, activeRouteId],
  );

  if (authLoading) {
    return (
      <div className="fixed inset-0 grid place-items-center bg-[#050915] text-slate-200">
        <div className="rounded-2xl border border-white/10 bg-[#0b1222]/90 px-6 py-4 text-sm">
          Cargando sesion...
        </div>
      </div>
    );
  }
  const toggleRoutes = () => setSheetOpen((prev) => !prev);
  const closeRoutes = () => setSheetOpen(false);
  const toggleCoachPanel = () => {
    setShowCoachPanel((prev) => {
      const next = !prev;
      if (next) {
        closeRoutes();
        setShowAchievementsPanel(false);
      }
      return next;
    });
  };
  const closeCoachPanel = () => setShowCoachPanel(false);
  const toggleAchievementsPanel = () => {
    if (!currentUser) {
      setLoginOpen(true);
      return;
    }
    setShowAchievementsPanel((prev) => {
      const next = !prev;
      if (next) {
        closeRoutes();
        closeCoachPanel();
      }
      return next;
    });
  };
  const closeAchievementsPanel = () => setShowAchievementsPanel(false);

  return (
    <div className="fixed inset-0 flex bg-[#050915] text-slate-100 overflow-hidden">
      <SideRail
        onToggleRoutes={toggleRoutes}
        onToggleCoach={toggleCoachPanel}
        onToggleAchievements={toggleAchievementsPanel}
        onClosePanels={() => {
          closeRoutes();
          closeCoachPanel();
          closeAchievementsPanel();
        }}
        routesOpen={sheetOpen}
        coachOpen={showCoachPanel}
        achievementsOpen={showAchievementsPanel}
        infoOpen={infoOpen}
      />

      <div className="flex h-full flex-1 flex-col md:pl-[64px]">
        <TopControls
          route={activeRoute}
          coachNote={coachNote}
          coachOpen={showCoachPanel}
          achievementsOpen={showAchievementsPanel}
          infoOpen={infoOpen}
          currentUsername={currentUser?.username ?? null}
          currentUserPhoto={currentUser?.profilePhoto ?? null}
          pendingRequests={pendingRequests}
          onToggleInfo={() => setInfoOpen((p) => !p)}
          onProfileClick={() => {
            if (currentUser) {
              setAccountOpen(true);
              return;
            }
            setLoginOpen(true);
          }}
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
            showAchievementsPanel={showAchievementsPanel}
          />

          <BottomSheet
            mode={mode}
            setMode={(m) => {
              setMode(m);
              const first = [...baseRoutes[m], ...(customRoutes[m] ?? [])][0]
                ?.id;
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
              if (next) closeAchievementsPanel();
              toggleRoutes();
            }}
            isMobile={isMobile}
          />

          <BottomNav
            routesOpen={sheetOpen}
            coachOpen={showCoachPanel}
            achievementsOpen={showAchievementsPanel}
            onToggleRoutes={toggleRoutes}
            onToggleCoach={toggleCoachPanel}
            onToggleAchievements={toggleAchievementsPanel}
            onShowMap={() => {
              closeRoutes();
              closeCoachPanel();
              closeAchievementsPanel();
            }}
          />

          <CoachPanel
            open={showCoachPanel}
            prompt={coachPrompt}
            onPromptChange={setCoachPrompt}
            onClose={closeCoachPanel}
            isMobile={isMobile}
          />
          <AchievementsPanel
            open={showAchievementsPanel}
            user={currentUser}
            onClose={closeAchievementsPanel}
            isMobile={isMobile}
          />
        </div>
        {loginOpen && (
          <LoginModal
            onClose={() => setLoginOpen(false)}
            onLoginSuccess={(user) => {
              setCurrentUser(user);
            }}
          />
        )}
        {accountOpen && currentUser && (
          <AccountModal
            user={currentUser}
            onClose={() => setAccountOpen(false)}
            onOpenSettings={() => {
              setAccountOpen(false);
              router.push("/settings");
            }}
            onLogout={() => {
              void (async () => {
                await logoutUser();
                setCurrentUser(null);
                setAccountOpen(false);
              })();
            }}
          />
        )}
      </div>
    </div>
  );
}

function StatPill({
  label,
  value,
  mutedDesc,
}: {
  label: string;
  value: string;
  mutedDesc?: string;
}) {
  return (
    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2">
      <span className="accent-label text-[11px] uppercase tracking-[0.18em]">
        {label}
      </span>
      <span className="ml-2 text-sm font-semibold text-slate-50">{value}</span>
      {mutedDesc ? (
        <span className="ml-2 text-xs text-slate-300">{mutedDesc}</span>
      ) : null}
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
  showAchievementsPanel,
}: {
  mapType: MapType;
  route: RouteOption;
  routine: RoutineItem[];
  currentStepIndex: number;
  onStepChange: (idx: number) => void;
  isMobile: boolean;
  showCoachPanel: boolean;
  showAchievementsPanel: boolean;
}) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<MapLibreMap | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [showRoutineMobile, setShowRoutineMobile] = useState(false);

  useEffect(() => {
    const container = mapRef.current;
    if (!container) return;

    let cancelled = false;

    const boot = async () => {
      if (
        mapInstance.current &&
        typeof mapInstance.current.remove === "function"
      ) {
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
          container,
          style,
          center: MAP_CENTER,
          zoom: 13,
          pitch: mapType === "sat" ? 52 : 42,
          bearing: -12,
          attributionControl: false,
          antialias: true,
        });
        map.addControl(
          new maplibregl.NavigationControl({ showCompass: true }),
          "bottom-right",
        );
        map.on("load", () => {
          if (cancelled) return;
          if (mapType === "map") {
            applyPastelTheme(map);
          }
          syncRouteLayers(map, route);
          setMapReady(true);
        });
        map.on("error", (evt: unknown) => {
          console.error("Maplibre error", evt);
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
      if (
        mapInstance.current &&
        typeof mapInstance.current.remove === "function"
      ) {
        mapInstance.current.remove();
      }
      mapInstance.current = null;
    };
  }, [mapType, route]);

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
    <div
      className={`relative min-h-[calc(100vh-140px)] md:min-h-[calc(100vh-64px)] overflow-hidden ${mapBg}`}
    >
      <div ref={mapRef} className="absolute inset-0 h-full w-full" />

      {!mapReady ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#0b1222]">
          <svg
            viewBox="0 0 100 130"
            className="h-full w-full max-w-4xl opacity-70"
          >
            <title>Cargando ruta en mapa</title>
            <defs>
              <linearGradient
                id="routeLinePlan"
                x1="0%"
                x2="100%"
                y1="0%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#2dd4bf" />
                <stop offset="100%" stopColor="#22c55e" />
              </linearGradient>
            </defs>
            <rect x="0" y="0" width="100" height="130" fill="none" />
            <path
              d={route.points
                .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
                .join(" ")}
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

      <div
        className={`absolute left-3 right-3 top-3 flex flex-wrap items-center gap-2 text-xs ${
          (showCoachPanel || showAchievementsPanel) && !isMobile
            ? "md:left-[372px] md:right-3"
            : ""
        }`}
      >
        <div className="flex items-center gap-2 rounded-full bg-[#0a0f1f]/85 px-3 py-2 text-slate-100 ring-1 ring-white/10 backdrop-blur">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Ruta óptima
        </div>
        <div className="flex items-center gap-2 rounded-full bg-[#0a0f1f]/85 px-3 py-2 text-slate-100 ring-1 ring-white/10 backdrop-blur">
          <span className="h-2 w-2 rounded-full bg-sky-400" />
          Inicio
        </div>
        <div className="flex items-center gap-2 rounded-full bg-[#0a0f1f]/85 px-3 py-2 text-slate-100 ring-1 ring-white/10 backdrop-blur">
          <span className="accent-dot h-2 w-2 rounded-full" />
          Waypoints
        </div>
        {isMobile ? (
          <button
            type="button"
            onClick={() => setShowRoutineMobile(true)}
            className={`accent-cta ml-auto rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] shadow-lg shadow-black/40 backdrop-blur transition hover:brightness-110 active:scale-95 ${
              showRoutineMobile ? "opacity-40" : "opacity-100"
            }`}
          >
            Rutina
          </button>
        ) : null}
      </div>

      {(!isMobile || showRoutineMobile) && (
        <div
          className={`absolute right-3 top-16 md:top-4 transition-all duration-250 ${
            isMobile
              ? showRoutineMobile
                ? "translate-y-0 opacity-100"
                : "pointer-events-none -translate-y-2 opacity-0"
              : ""
          }`}
        >
          <div className="relative">
            {isMobile ? (
              <button
                type="button"
                onClick={() => setShowRoutineMobile(false)}
                className="accent-label absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-[#0b0f1a]/90 text-sm font-semibold shadow-lg shadow-black/30 transition hover:brightness-110 active:scale-95"
              >
                ×
              </button>
            ) : null}
            <RoutinePeek
              routine={routine}
              currentIndex={currentStepIndex}
              onStepChange={onStepChange}
              alignBadgeLeft={isMobile}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function syncRouteLayers(map: MapLibreMap, route: RouteOption) {
  if (!route?.points?.length) return;

  const { line, points, bounds } = buildRouteGeo(route);

  const lineSource = map.getSource("route-line") as GeoJSONSource | undefined;
  if (lineSource?.setData) {
    lineSource.setData(line as Parameters<GeoJSONSource["setData"]>[0]);
  } else {
    map.addSource("route-line", {
      type: "geojson",
      data: line,
      lineMetrics: true,
    });
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

  const pointSource = map.getSource("route-points") as
    | GeoJSONSource
    | undefined;
  if (pointSource?.setData) {
    pointSource.setData(points as Parameters<GeoJSONSource["setData"]>[0]);
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

  const isNarrow = map.getContainer
    ? map.getContainer().clientWidth < 768
    : false;
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
    return [MAP_CENTER[0] + lngOffset, MAP_CENTER[1] + latOffset] as [
      number,
      number,
    ];
  });

  const bounds = coords.reduce(
    (acc, [lng, lat]) => ({
      sw: [Math.min(acc.sw[0], lng), Math.min(acc.sw[1], lat)] as [
        number,
        number,
      ],
      ne: [Math.max(acc.ne[0], lng), Math.max(acc.ne[1], lat)] as [
        number,
        number,
      ],
    }),
    {
      sw: [...coords[0]] as [number, number],
      ne: [...coords[0]] as [number, number],
    },
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
          (idx === 0
            ? "Inicio"
            : idx === coords.length - 1
              ? "Fin"
              : `P${idx + 1}`),
        kind: idx === 0 ? "start" : idx === coords.length - 1 ? "end" : "mid",
      },
    })),
  };

  return { line, points, bounds };
}

function applyPastelTheme(map: MapLibreMap) {
  const tweaks: Array<{ layers: string[]; paint: Record<string, unknown> }> = [
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
      layers: [
        "road",
        "road-street",
        "road-primary",
        "road-secondary",
        "bridge-primary",
        "bridge-secondary",
      ],
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

  const hasLayer = (layerId: string) =>
    style.layers.some((layer) => layer.id === layerId);

  tweaks.forEach(({ layers, paint }) => {
    layers.forEach((id) => {
      if (hasLayer(id)) {
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

  const textTweaks: Array<{
    layers: string[];
    paint: Record<string, unknown>;
    layout?: Record<string, unknown>;
  }> = [
    {
      layers: [
        "place-city",
        "place-town",
        "place-village",
        "road-label",
        "water-label",
        "poi-label",
      ],
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
      if (hasLayer(id)) {
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
  route,
  coachNote,
  coachOpen,
  achievementsOpen,
  infoOpen,
  currentUsername,
  currentUserPhoto,
  pendingRequests,
  onToggleInfo,
  onProfileClick,
  isMobile,
}: {
  route: RouteOption;
  coachNote: CoachNote;
  coachOpen: boolean;
  achievementsOpen: boolean;
  infoOpen: boolean;
  currentUsername: string | null;
  currentUserPhoto: string | null;
  pendingRequests: number;
  onToggleInfo: () => void;
  onProfileClick: () => void;
  isMobile: boolean;
}) {
  const showInfo = infoOpen || !isMobile;
  return (
    <div
      className={`sticky top-0 z-40 flex flex-col gap-3 bg-[#050915]/95 px-4 py-3 backdrop-blur ${
        isMobile ? "pb-3 pt-3" : ""
      } ${
        (coachOpen || achievementsOpen) && !isMobile
          ? "md:ml-[360px] md:w-[calc(100%-360px)]"
          : ""
      }`}
    >
      <div className="flex flex-col gap-2">
        <div className="group flex w-full items-center gap-2">
          <Link
            href="/"
            aria-label="Home"
            className="flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2 text-xs font-semibold text-slate-100 transition hover:border-white/25 hover:bg-white/10"
          >
            <Image
              src={homeIcon}
              alt="Home"
              width={16}
              height={16}
              className="opacity-90"
              style={iconFilterStyle}
            />
          </Link>
          {isMobile ? (
            <button
              type="button"
              aria-label="Info"
              onClick={onToggleInfo}
              className={`flex items-center justify-center rounded-full border p-2 text-[11px] font-semibold transition ${
                infoOpen
                  ? "accent-soft-surface ring-1 ring-white/15"
                  : "border-white/10 bg-[#0b1222]/90 text-slate-100 ring-1 ring-white/10 hover:bg-[#111a2e]"
              }`}
            >
              <Image
                src={infoIcon}
                alt="Info"
                width={16}
                height={16}
                className="opacity-90"
                style={iconFilterStyle}
              />
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
            <span className="ml-2 rounded-full bg-white/10 px-3 py-1 text-[11px] text-slate-200 shrink-0">
              GPS
            </span>
          </div>
          <span className="ml-auto rounded-full border border-white/10 bg-[#0a0f1f]/90 px-3 py-1 text-xs text-slate-200">
            {currentUsername ? `@${currentUsername}` : "Invitado"}
          </span>
          <button
            type="button"
            aria-label="Perfil"
            onClick={onProfileClick}
            className="relative flex h-[44px] w-[44px] shrink-0 items-center justify-center overflow-visible rounded-full bg-transparent text-xs font-semibold text-slate-100 transition hover:opacity-90"
          >
            {currentUserPhoto ? (
              <Image
                src={currentUserPhoto}
                alt="Perfil"
                width={36}
                height={36}
                unoptimized
                className="h-9 w-9 rounded-full object-cover ring-1 ring-white/30"
              />
            ) : (
              <Image
                src={accountIcon}
                alt="Perfil"
                width={36}
                height={36}
                className="opacity-90"
                style={accountFilterStyle}
              />
            )}

            <span className="pointer-events-none absolute bottom-0 right-0 z-20 h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.85)]" />
            {pendingRequests > 0 ? (
              <span className="absolute -right-1 -top-1 z-30 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-lg shadow-rose-800/40">
                {pendingRequests > 9 ? "9+" : pendingRequests}
              </span>
            ) : null}
          </button>
        </div>

        <div
          className={`group flex w-full flex-wrap items-center gap-2 text-xs transition-all duration-300 ${
            showInfo
              ? "max-h-[200px] opacity-100"
              : "max-h-0 opacity-0 -translate-y-2 pointer-events-none"
          }`}
        >
          {showInfo ? (
            <>
              <StatPill label="ETA" value={formatEta(route.estMinutes)} />
              <StatPill
                label="Distancia"
                value={formatDistance(route.distanceKm)}
              />
              <StatPill label="Seguridad" value={route.safety} />
              <StatPill label="Superficie" value={route.surface} />
              <StatPill
                label="Coach"
                value={coachNote.title}
                mutedDesc={coachNote.desc}
              />
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
        className={`relative ${containerClass} ${
          collapsedDesktop ? "cursor-pointer" : ""
        }`}
      >
        {collapsedDesktop ? (
          <button
            type="button"
            onClick={onToggle}
            className="absolute inset-0 z-10"
            aria-label="Expandir panel de rutas"
          />
        ) : null}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-12 rounded-full bg-white/20" />
            <div>
              <p className="accent-label text-xs uppercase tracking-[0.2em]">
                Rutas
              </p>
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
              <div className="group flex w-full items-center justify-between">
                <p className="text-sm font-semibold">{route.title}</p>
                <span className="text-xs rounded-full bg-black/30 px-2 py-1">
                  {route.surface}
                </span>
              </div>
              <p className="text-lg font-semibold">
                {formatDistance(route.distanceKm)}
              </p>
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
  achievementsOpen,
  onToggleRoutes,
  onToggleCoach,
  onToggleAchievements,
  onShowMap,
}: {
  routesOpen: boolean;
  coachOpen: boolean;
  achievementsOpen: boolean;
  onToggleRoutes: () => void;
  onToggleCoach: () => void;
  onToggleAchievements: () => void;
  onShowMap: () => void;
}) {
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-3 z-40 flex justify-center md:hidden">
      <div className="pointer-events-auto grid w-[94%] max-w-xl grid-cols-5 items-center justify-items-center gap-1 rounded-full border border-white/10 bg-[#0a0f1f]/95 px-3 py-2 text-slate-100 shadow-2xl shadow-orange-900/30 backdrop-blur">
        <button
          type="button"
          onClick={onShowMap}
          className="group flex w-full flex-col items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-slate-200 transition hover:text-white duration-200 active:scale-95"
        >
          <Image
            src={mapIcon}
            alt="Mapa"
            width={22}
            height={22}
            className="opacity-90 brightness-0 invert transition-transform duration-200 group-hover:scale-110"
          />
          Mapa
        </button>
        <button
          type="button"
          onClick={() => {
            onShowMap();
            onToggleRoutes();
          }}
          className={`group flex w-full flex-col items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold transition duration-200 active:scale-95 ${
            routesOpen ? "text-orange-50" : "text-slate-200 hover:text-white"
          }`}
        >
          <Image
            src={routeIcon}
            alt="Ruta"
            width={22}
            height={22}
            className="opacity-90 brightness-0 invert transition-transform duration-200 group-hover:scale-110"
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
          className={`group flex w-full flex-col items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold transition duration-200 active:scale-95 ${
            coachOpen ? "text-orange-50" : "text-slate-200 hover:text-white"
          }`}
        >
          <Image
            src={botIcon}
            alt="Coach"
            width={22}
            height={22}
            className="opacity-90 brightness-0 invert transition-transform duration-200 group-hover:scale-110"
            aria-hidden
          />
          Coach
        </button>
        <button
          type="button"
          className="group flex w-full flex-col items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-slate-200 transition hover:text-white duration-200 active:scale-95"
        >
          <Image
            src={chatIcon}
            alt="Chat"
            width={22}
            height={22}
            className="opacity-90 brightness-0 invert transition-transform duration-200 group-hover:scale-110"
            aria-hidden
          />
          Mensajes
        </button>
        <button
          type="button"
          onClick={() => {
            onShowMap();
            onToggleAchievements();
          }}
          className={`group flex w-full flex-col items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold transition duration-200 active:scale-95 ${
            achievementsOpen
              ? "text-orange-50"
              : "text-slate-200 hover:text-white"
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            className="opacity-90 brightness-0 invert transition-transform duration-200 group-hover:scale-110"
            aria-hidden
          >
            <title>Logros</title>
            <path
              d="M8 4h8v2h2a1 1 0 0 1 1 1v1a5 5 0 0 1-4 4.9A4 4 0 0 1 13 14v2h3v2H8v-2h3v-2a4 4 0 0 1-2-1.1A5 5 0 0 1 5 8V7a1 1 0 0 1 1-1h2V4Zm-1 4a3 3 0 0 0 2 2.83V8H7Zm10 0h-2v2.83A3 3 0 0 0 17 8Z"
              fill="currentColor"
            />
          </svg>
          Logros
        </button>
      </div>
    </nav>
  );
}

function RoutinePeek({
  routine,
  currentIndex,
  onStepChange,
  alignBadgeLeft = false,
}: {
  routine: RoutineItem[];
  currentIndex: number;
  onStepChange: (idx: number) => void;
  alignBadgeLeft?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/55 px-3 py-3 text-xs text-slate-100 ring-1 ring-white/10 backdrop-blur">
      <div
        className={`flex items-center gap-2 ${alignBadgeLeft ? "justify-start" : "justify-between"}`}
      >
        <p className="accent-label font-semibold uppercase tracking-[0.2em]">
          Rutina
        </p>
        <span className="text-[11px] text-slate-300">{`Paso ${currentIndex + 1} / ${routine.length}`}</span>
      </div>
      <div className="rounded-xl bg-white/5 px-3 py-2">
        <p className="accent-label text-[11px]">
          {routine[currentIndex]?.step}
        </p>
        <p className="text-[12px] text-slate-100">
          {routine[currentIndex]?.detail}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {routine.map((item, idx) => (
          <button
            key={item.step}
            type="button"
            onClick={() => onStepChange(idx)}
            className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
              idx === currentIndex
                ? "accent-soft-surface border"
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
  className,
  onClose,
  isMobile,
}: {
  open: boolean;
  prompt: string;
  onPromptChange: (v: string) => void;
  className?: string;
  onClose?: () => void;
  isMobile?: boolean;
}) {
  const mockChat = [
    {
      from: "coach",
      text: "¡Hola! Soy tu coach. Comparte tu objetivo y te sugiero ruta y rutina.",
    },
    { from: "user", text: "Quiero 8 km suaves con algo de parque." },
    {
      from: "coach",
      text: "Perfecto. Ruta segura · 8 km · parque y ciclorruta, ritmo conversacional.",
    },
  ];
  if (isMobile && !open) return null;

  const baseMobile =
    "fixed inset-0 z-50 m-0 h-full w-full rounded-none bg-[#0c1527]/75 overflow-y-auto p-4 transition-all duration-300 ease-in-out";
  const baseDesktop =
    "fixed left-[64px] top-0 z-40 h-full w-[360px] max-w-[40vw] overflow-y-auto rounded-none bg-[#0c1527]/75 p-5 transition-all duration-300 ease-in-out";

  const stateDesktop = open
    ? "translate-x-0 opacity-100 pointer-events-auto"
    : "-translate-x-[110%] opacity-0 pointer-events-none";

  const containerClass = isMobile
    ? baseMobile
    : `${baseDesktop} ${stateDesktop}`;

  return (
    <aside
      className={`flex min-h-0 flex-col bg-[#0c1527]/25 p-4 ${className ?? ""} ${containerClass}`}
    >
      <div className="flex items-center justify-between gap-2 pb-2 rounded-xl bg-[#0c1527]/20 px-3 py-2">
        <div className="flex items-center gap-2">
          <p className="accent-label text-sm uppercase tracking-[0.2em]">
            Coach
          </p>
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

      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto scrollbar-thin scrollbar-track-[#0a1220]/40 scrollbar-thumb-white/10">
          {mockChat.map((msg, idx) => {
            const isCoach = msg.from === "coach";
            return (
              <div
                key={`${msg.from}-${idx}`}
                className={`flex ${isCoach ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow ${
                    isCoach
                      ? "bg-[#0a3b6f]/30 text-orange-50 shadow-sky-900/20"
                      : "bg-white/8 text-slate-100 shadow-black/15"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-white/4 px-3 py-2">
          <input
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
            placeholder="Pronto podrás chatear con el coach..."
            disabled
          />
          <button
            type="button"
            disabled
            className="rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-slate-200 opacity-50"
          >
            Enviar
          </button>
        </div>
      </div>
    </aside>
  );
}

function AchievementsPanel({
  open,
  user,
  onClose,
  isMobile,
}: {
  open: boolean;
  user: User | null;
  onClose?: () => void;
  isMobile?: boolean;
}) {
  if (isMobile && !open) return null;

  const stats = user?.achievements ?? {
    routesCompleted: 0,
    kilometersTotal: 0,
    daysInApp: 0,
    bogotaLandmarksVisited: [],
  };

  const routeMilestones = [1, 10, 25, 100];
  const kmMilestones = [10, 50, 100];
  const daysMilestones = [7, 30, 100];
  const bogotaLandmarks = [
    "Parque Simon Bolivar",
    "Parque de los Novios",
    "Ciclovia de la 116",
    "Monserrate",
  ];

  const categories = [
    {
      title: "Recorridos",
      items: routeMilestones.map((goal) => ({
        label: goal === 1 ? "Primer recorrido" : `${goal} recorridos`,
        progress: `${Math.min(stats.routesCompleted, goal)}/${goal}`,
        done: stats.routesCompleted >= goal,
      })),
    },
    {
      title: "Kilometros acumulados",
      items: kmMilestones.map((goal) => ({
        label: `${goal} km`,
        progress: `${Math.min(stats.kilometersTotal, goal).toFixed(1)}/${goal} km`,
        done: stats.kilometersTotal >= goal,
      })),
    },
    {
      title: "Tiempo en la aplicacion",
      items: daysMilestones.map((goal) => ({
        label: `${goal} dias en HikeUp`,
        progress: `${Math.min(stats.daysInApp, goal)}/${goal} dias`,
        done: stats.daysInApp >= goal,
      })),
    },
    {
      title: "Lugares representativos de Bogota",
      items: bogotaLandmarks.map((place) => {
        const done = stats.bogotaLandmarksVisited.includes(place);
        return {
          label: place,
          progress: done ? "Visitado" : "Pendiente",
          done,
        };
      }),
    },
  ];

  const baseMobile =
    "fixed inset-0 z-50 m-0 h-full w-full rounded-none bg-[#0c1527]/75 overflow-y-auto p-4 transition-all duration-300 ease-in-out";
  const baseDesktop =
    "fixed left-[64px] top-0 z-40 h-full w-[360px] max-w-[40vw] overflow-y-auto rounded-none bg-[#0c1527]/75 p-5 transition-all duration-300 ease-in-out";

  const stateDesktop = open
    ? "translate-x-0 opacity-100 pointer-events-auto"
    : "-translate-x-[110%] opacity-0 pointer-events-none";

  const containerClass = isMobile
    ? baseMobile
    : `${baseDesktop} ${stateDesktop}`;

  return (
    <aside
      className={`flex min-h-0 flex-col bg-[#0c1527]/25 p-4 ${containerClass}`}
    >
      <div className="flex items-center justify-between gap-2 rounded-xl bg-[#0c1527]/20 px-3 py-2">
        <div className="flex items-center gap-2">
          <p className="accent-label text-sm uppercase tracking-[0.2em]">
            Logros
          </p>
          <span className="rounded-full bg-white/10 px-3 py-2 text-[11px] font-semibold text-slate-100 ring-1 ring-white/15">
            Progreso
          </span>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[#111a2e] px-3 py-2 text-xs font-semibold text-slate-100 ring-1 ring-white/10 transition hover:bg-[#16223a]"
            aria-label="Cerrar panel Logros"
          >
            ×
          </button>
        ) : null}
      </div>

      <div className="mt-3 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto scrollbar-thin scrollbar-track-[#0a1220]/40 scrollbar-thumb-white/10">
        {categories.map((category) => (
          <section
            key={category.title}
            className="rounded-2xl border border-white/10 bg-white/5 p-3"
          >
            <p className="accent-label text-[11px] font-semibold uppercase tracking-[0.18em]">
              {category.title}
            </p>
            <div className="mt-2 space-y-2">
              {category.items.map((item) => (
                <div
                  key={item.label}
                  className={`rounded-xl border px-3 py-2 ${
                    item.done
                      ? "accent-soft-surface"
                      : "border-white/10 bg-[#0b1222]/70"
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-100">
                    {item.label}
                  </p>
                  <p className="text-xs text-slate-300">{item.progress}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </aside>
  );
}

// Mapbox styles fallback handled via style URLs; no Google Maps styles needed.

function SideRail({
  onToggleRoutes,
  onToggleCoach,
  onToggleAchievements,
  onClosePanels,
  routesOpen,
  coachOpen,
  achievementsOpen,
  infoOpen,
}: {
  onToggleRoutes: () => void;
  onToggleCoach: () => void;
  onToggleAchievements: () => void;
  onClosePanels: () => void;
  routesOpen: boolean;
  coachOpen: boolean;
  achievementsOpen: boolean;
  infoOpen: boolean;
}) {
  const TrophyIcon = () => (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      className="opacity-90 brightness-0 invert transition-transform duration-200 hover:scale-110"
      aria-hidden
    >
      <title>Logros</title>
      <path
        d="M8 4h8v2h2a1 1 0 0 1 1 1v1a5 5 0 0 1-4 4.9A4 4 0 0 1 13 14v2h3v2H8v-2h3v-2a4 4 0 0 1-2-1.1A5 5 0 0 1 5 8V7a1 1 0 0 1 1-1h2V4Zm-1 4a3 3 0 0 0 2 2.83V8H7Zm10 0h-2v2.83A3 3 0 0 0 17 8Z"
        fill="currentColor"
      />
    </svg>
  );

  const items: Array<{
    label: string;
    icon?: typeof mapIcon;
    customIcon?: ReactNode;
    onClick: () => void;
    active: boolean;
  }> = [
    {
      label: "Mapa",
      icon: mapIcon,
      onClick: onClosePanels,
      active: !routesOpen && !coachOpen && !achievementsOpen && !infoOpen,
    },
    {
      label: "Ruta",
      icon: routeIcon,
      onClick: onToggleRoutes,
      active: routesOpen,
    },
    {
      label: "Coach",
      icon: botIcon,
      onClick: onToggleCoach,
      active: coachOpen,
    },
    {
      label: "Chat",
      icon: chatIcon,
      onClick: onClosePanels,
      active: infoOpen,
    },
    {
      label: "Logros",
      icon: undefined,
      onClick: onToggleAchievements,
      active: achievementsOpen,
      customIcon: <TrophyIcon />,
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
            item.active
              ? "bg-orange-500/15 text-orange-50 ring-1 ring-orange-400/30"
              : "hover:bg-white/10"
          }`}
        >
          {item.customIcon ? (
            item.customIcon
          ) : item.icon ? (
            <Image
              src={item.icon}
              alt={item.label}
              width={22}
              height={22}
              className="opacity-90 brightness-0 invert transition-transform duration-200 hover:scale-110"
            />
          ) : null}
          <span className="text-[10px]">{item.label}</span>
        </button>
      ))}
    </div>
  );
}

function _parsePrompt(
  prompt: string,
  currentMode: Mode,
): {
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
  if (
    lower.includes("correr") ||
    lower.includes("rápido") ||
    lower.includes("interval")
  )
    mode = "run";

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

function _buildRouteFromPrompt(
  distanceKm: number,
  mode: Mode,
  focus: string,
): RouteOption {
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

function generateShape(
  distanceKm: number,
): { x: number; y: number; label?: string }[] {
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

function _buildRoutine(
  intent: "easy" | "tempo" | "intervals" | "trail",
): RoutineItem[] {
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

function _suggestDistance(mode: Mode): number {
  if (mode === "walk") return 4.5;
  if (mode === "jog") return 6.5;
  if (mode === "hike") return 10.5;
  return 8.0;
}

function estimateTime(distanceKm: number, mode: Mode): number {
  const pace =
    mode === "walk"
      ? 11.5
      : mode === "jog"
        ? 6.5
        : mode === "hike"
          ? 10.5
          : 5.2;
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

function _capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
