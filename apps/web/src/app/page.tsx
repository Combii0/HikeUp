"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Lang = "es" | "en";

type Content = {
  tagline: string;
  subTagline: string;
  ctaPrimary: string;
  ctaSecondary: string;
  chips: string[];
  map: {
    title: string;
    subtitle: string;
    stats: { label: string; value: string }[];
  };
  features: { title: string; desc: string }[];
  training: { title: string; desc: string; steps: string[] };
  community: { title: string; desc: string; bullets: string[] };
  region: { title: string; desc: string; pills: string[] };
};

const copy: Record<Lang, Content> = {
  es: {
    tagline: "Rutas inteligentes para trotar, correr o caminar.",
    subTagline: "Optimiza tus recorridos y entrena con seguridad en América.",
    ctaPrimary: "Comenzar en web",
    ctaSecondary: "Ver cómo funciona",
    chips: [
      "Rutas por ritmo, elevación y clima",
      "Instrucciones tipo Waze con geolocalización",
      "Modo offline (próximo)",
      "Disponible en América",
    ],
    map: {
      title: "Planifica y sigue sin perderte",
      subtitle:
        "Elige distancia, ritmo y terreno; HikeUp traza la mejor ruta y te guía con voz y vibración.",
      stats: [
        { label: "Clima", value: "12°C Bogotá" },
        { label: "Ritmo objetivo", value: "5:15 /km" },
        { label: "Distancia", value: "8.4 km" },
      ],
    },
    features: [
      {
        title: "Rutas inteligentes",
        desc: "Selecciona senderos urbanos o trail; optimizamos pendientes y cruces para que mantengas tu ritmo.",
      },
      {
        title: "Entrenamiento personal",
        desc: "Rutinas semanales con progresión, descansos activos y ajustes según tu feedback.",
      },
      {
        title: "Comunidad y foros",
        desc: "Únete a grupos por ciudad o nivel, comparte rutas y coordina salidas seguras.",
      },
      {
        title: "Modo seguro",
        desc: "Alertas de altimetría, zonas poco iluminadas y notificaciones a tu contacto de confianza.",
      },
    ],
    training: {
      title: "Coach IA a tu lado",
      desc: "Haz preguntas al coach: cómo calentar, ajustar ritmo o configurar alertas. Responde en español o inglés.",
      steps: ["Define objetivos (5K, 10K, trail)", "Recibe plan semanal adaptable", "Sincroniza con tu ruta y sigue indicaciones"],
    },
    community: {
      title: "Social y privado",
      desc: "Foros por ciudad, mensajes directos y chats con tu coach. Comparte logros y rutas verificadas.",
      bullets: ["Foros: Bogotá, Medellín, CDMX, Lima", "Mensajes directos cifrados", "Invita a tu grupo a una ruta"],
    },
    region: {
      title: "Hecho para América",
      desc: "Mapas y datos calibrados para Colombia y la región. Pronto Apple y Android nativos.",
      pills: ["LatAm-ready", "ES / EN", "Web + móvil"],
    },
  },
  en: {
    tagline: "Smart routes to jog, run, or walk.",
    subTagline: "Optimize every outing and train safely across the Americas.",
    ctaPrimary: "Start on web",
    ctaSecondary: "See how it works",
    chips: [
      "Pace, elevation, and weather aware",
      "Turn-by-turn guidance with GPS",
      "Offline mode (coming soon)",
      "Available in the Americas",
    ],
    map: {
      title: "Plan and follow without getting lost",
      subtitle:
        "Pick distance, pace, and terrain; HikeUp draws the best path and guides you with voice and haptics.",
      stats: [
        { label: "Weather", value: "55°F Bogotá" },
        { label: "Target pace", value: "8:25 /mi" },
        { label: "Distance", value: "5.2 mi" },
      ],
    },
    features: [
      {
        title: "Route intelligence",
        desc: "Choose urban or trail; we optimize slopes and crossings so you can hold your pace.",
      },
      {
        title: "Personal training",
        desc: "Weekly plans with progression, active rest, and adjustments from your feedback.",
      },
      {
        title: "Community and forums",
        desc: "Join local groups, share routes, and organize safe meetups.",
      },
      {
        title: "Safety mode",
        desc: "Elevation alerts, low-light segments, and check-ins to your trusted contact.",
      },
    ],
    training: {
      title: "AI coach on your run",
      desc: "Ask the coach how to warm up, tweak pacing, or configure alerts. Answers in English or Spanish.",
      steps: ["Set goals (5K, 10K, trail)", "Receive adaptive weekly plans", "Sync with your route and follow prompts"],
    },
    community: {
      title: "Social and private",
      desc: "City forums, direct messages, and chats with your coach. Share wins and verified routes.",
      bullets: ["Forums: Bogotá, Medellín, CDMX, Lima", "Encrypted DMs", "Invite your crew to a route"],
    },
    region: {
      title: "Built for the Americas",
      desc: "Maps tuned for Colombia and the region. Native Apple and Android coming soon.",
      pills: ["LatAm-ready", "ES / EN", "Web + mobile"],
    },
  },
};

const accentGradient = "from-[#ff8a1a] via-[#ff6a1a] to-[#ff4324]";
const surfaceGradient =
  "bg-[radial-gradient(circle_at_20%_20%,rgba(255,138,26,0.14),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(255,78,36,0.12),transparent_36%),radial-gradient(circle_at_20%_80%,rgba(255,138,26,0.08),transparent_46%)]";

export default function Home() {
  const [lang, setLang] = useState<Lang>("es");
  const t = useMemo(() => copy[lang], [lang]);

  return (
    <div className="min-h-screen bg-[#050915] text-slate-100">
      <div className={`relative overflow-hidden ${surfaceGradient}`}>
        <div className="pointer-events-none absolute inset-0 opacity-40 mix-blend-screen">
          <div className="absolute -left-48 top-[-20%] h-96 w-96 rounded-full bg-gradient-to-br from-[#ff8a1a] via-[#ff6a1a] to-transparent blur-3xl" />
          <div className="absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-gradient-to-tr from-[#ff4e24] via-transparent to-transparent blur-3xl" />
        </div>

        <main className="relative z-10 mx-auto flex max-w-6xl flex-col gap-12 px-6 py-12 md:py-16 lg:py-20">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900/60 ring-1 ring-white/10 shadow-lg shadow-orange-900/30">
                <svg viewBox="0 0 120 80" className="h-8 w-8">
                  <defs>
                    <linearGradient id="logoGradient" x1="0%" x2="100%" y1="0%" y2="100%">
                      <stop offset="0%" stopColor="#ff8a1a" />
                      <stop offset="100%" stopColor="#ff4e24" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M8 70 L46 20 L70 50 L94 20 L112 50"
                    fill="none"
                    stroke="url(#logoGradient)"
                    strokeWidth="10"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-orange-200/80">
                  HikeUp
                </p>
                <p className="text-base text-slate-200">{t.tagline}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setLang((prev) => (prev === "es" ? "en" : "es"))}
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/30 hover:bg-white/10"
              >
                {lang === "es" ? "ES / EN" : "EN / ES"}
              </button>
              <span className="rounded-full bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-500/30">
                {lang === "es" ? "Web listo · Móvil pronto" : "Web ready · Mobile soon"}
              </span>
            </div>
          </header>

          <section className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-orange-100 ring-1 ring-white/10">
                  {lang === "es" ? "Mapa + entrenamiento" : "Maps + training"}
                </span>
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-orange-100 ring-1 ring-white/10">
                  {lang === "es" ? "Bilingüe" : "Bilingual"}
                </span>
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-orange-100 ring-1 ring-white/10">
                  {lang === "es" ? "Seguro en ruta" : "Safe on route"}
                </span>
              </div>
              <h1 className="text-4xl font-semibold leading-tight text-slate-50 md:text-5xl">
                {t.tagline}
              </h1>
              <p className="max-w-xl text-lg text-slate-300">{t.subTagline}</p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/plan"
                  className={`rounded-full bg-gradient-to-r ${accentGradient} px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-orange-900/30 transition hover:brightness-110`}
                >
                  {t.ctaPrimary}
                </Link>
                <a
                  href="#funciones"
                  className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-white/30 hover:bg-white/10"
                >
                  {t.ctaSecondary}
                </a>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {t.chips.map((chip) => (
                  <div
                    key={chip as string}
                    className="flex items-start gap-2 rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-3 text-sm text-slate-200 shadow-sm"
                  >
                    <span className="mt-1 h-2 w-2 rounded-full bg-gradient-to-r from-orange-400 to-orange-500" />
                    <p>{chip as string}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                <span className="rounded-full bg-white/5 px-3 py-2 ring-1 ring-white/10">
                  iOS · Android (próximamente)
                </span>
                <span className="rounded-full bg-white/5 px-3 py-2 ring-1 ring-white/10">
                  {lang === "es" ? "Compatible con smartwatch" : "Smartwatch friendly"}
                </span>
                <span className="rounded-full bg-white/5 px-3 py-2 ring-1 ring-white/10">
                  {lang === "es" ? "Datos locales de América" : "Regional data for the Americas"}
                </span>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-orange-900/20 backdrop-blur">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-orange-100/80">
                    {lang === "es" ? "Vista previa" : "Preview"}
                  </p>
                  <p className="text-lg font-semibold text-slate-50">{t.map.title}</p>
                  <p className="text-sm text-slate-300">{t.map.subtitle}</p>
                </div>
                <span className="rounded-full bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-500/30">
                  GPS Live
                </span>
              </div>

              <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950 shadow-inner">
                <div className="relative aspect-[4/3]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,138,26,0.14),transparent_45%),radial-gradient(circle_at_80%_60%,rgba(255,78,36,0.12),transparent_45%)]" />
                  <svg
                    viewBox="0 0 400 300"
                    className="absolute inset-0 h-full w-full"
                    aria-hidden
                  >
                    <defs>
                      <linearGradient id="routeLine" x1="0%" x2="100%" y1="0%" y2="100%">
                        <stop offset="0%" stopColor="#ff8a1a" />
                        <stop offset="100%" stopColor="#ff4e24" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M40 240 C120 210, 130 120, 200 140 C260 160, 260 90, 340 80"
                      fill="none"
                      stroke="url(#routeLine)"
                      strokeWidth="10"
                      strokeLinecap="round"
                    />
                    <circle cx="40" cy="240" r="10" fill="#0ea5e9" />
                    <circle cx="340" cy="80" r="12" fill="#22c55e" />
                  </svg>
                  <div className="absolute left-4 top-4 rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-slate-100 ring-1 ring-white/20">
                    {lang === "es" ? "Ruta preferida • 8.4 km" : "Preferred route • 5.2 mi"}
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 rounded-2xl bg-black/40 px-4 py-3 text-xs text-slate-100 backdrop-blur">
                    <span>{lang === "es" ? "Elevación estable" : "Steady elevation"}</span>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-orange-100 ring-1 ring-white/20">
                      {lang === "es" ? "Instrucciones paso a paso" : "Turn-by-turn"}
                    </span>
                    <span>{lang === "es" ? "Zonas iluminadas" : "Well-lit zones"}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {t.map.stats.map((stat) => (
                  <div
                    key={stat.label as string}
                    className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-200 shadow-sm"
                  >
                    <p className="text-xs uppercase tracking-wide text-orange-100/80">
                      {stat.label as string}
                    </p>
                    <p className="text-base font-semibold text-slate-50">
                      {stat.value as string}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="funciones" className="space-y-4">
            <div className="flex items-center gap-3">
              <span className={`inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${accentGradient} text-sm font-black text-slate-950`}>
                01
              </span>
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-orange-100/80">
                  {lang === "es" ? "Funciones clave" : "Key features"}
                </p>
                <p className="text-lg font-semibold text-slate-50">
                  {lang === "es"
                    ? "Mapas, entrenamiento y comunidad en un solo lugar."
                    : "Maps, training, and community in one place."}
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {t.features.map((feature) => (
                <article
                  key={feature.title as string}
                  className="group relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/60 p-5 shadow-lg shadow-orange-900/10 transition hover:-translate-y-0.5 hover:border-white/20"
                >
                  <div className="absolute inset-0 opacity-0 transition group-hover:opacity-100">
                    <div className="h-full w-full bg-gradient-to-br from-white/5 to-transparent" />
                  </div>
                  <div className="relative flex items-start gap-3">
                    <span
                      className={`mt-1 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${accentGradient} text-sm font-extrabold text-slate-950`}
                    >
                      +
                    </span>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-slate-50">
                        {feature.title as string}
                      </h3>
                      <p className="text-sm text-slate-300">{feature.desc as string}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <article className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-lg shadow-orange-900/10">
              <div className="flex items-center gap-3">
                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${accentGradient} text-sm font-black text-slate-950`}>
                  02
                </span>
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-orange-100/80">
                    {lang === "es" ? "Entrenamiento" : "Training"}
                  </p>
                  <p className="text-lg font-semibold text-slate-50">{t.training.title}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-300">{t.training.desc}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {t.training.steps.map((step, index) => (
                  <div
                    key={step as string}
                    className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-200"
                  >
                    <p className="text-xs font-semibold text-orange-100/80">
                      {lang === "es" ? "Paso" : "Step"} {index + 1}
                    </p>
                    <p>{step as string}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-lg shadow-orange-900/10">
              <div className="flex items-center gap-3">
                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${accentGradient} text-sm font-black text-slate-950`}>
                  03
                </span>
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-orange-100/80">
                    {lang === "es" ? "Comunidad" : "Community"}
                  </p>
                  <p className="text-lg font-semibold text-slate-50">{t.community.title}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-300">{t.community.desc}</p>
              <div className="mt-4 space-y-2 text-sm text-slate-200">
                {t.community.bullets.map((bullet) => (
                  <div
                    key={bullet as string}
                    className="flex items-start gap-2 rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3"
                  >
                    <span className="mt-1 h-2 w-2 rounded-full bg-gradient-to-r from-orange-400 to-orange-500" />
                    <p>{bullet as string}</p>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-lg shadow-orange-900/10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-orange-100/80">
                  {lang === "es" ? "Disponibilidad" : "Availability"}
                </p>
                <p className="text-lg font-semibold text-slate-50">{t.region.title}</p>
                <p className="text-sm text-slate-300">{t.region.desc}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {t.region.pills.map((pill) => (
                  <span
                    key={pill as string}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100"
                  >
                    {pill as string}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-6 text-xs text-slate-400">
            <p>HikeUp · {lang === "es" ? "Listo para web, móvil próximamente." : "Web ready, mobile coming soon."}</p>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-white/5 px-3 py-2">ES / EN</span>
              <span className="rounded-full bg-white/5 px-3 py-2">
                {lang === "es" ? "Colombia y América" : "Colombia and the Americas"}
              </span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
