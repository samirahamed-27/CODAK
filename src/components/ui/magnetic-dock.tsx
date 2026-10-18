"use client";

import * as React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/* Magnetic Dock — from Motiq (https://motiq.dev/components/magnetic-dock).
   MIT licensed. Zero runtime dependencies. */

const MOTIQ_TOKENS = "@layer motiq{:root{--motiq-accent:#ffffff;--motiq-accent-text:#ffffff;--motiq-bg:#000000;--motiq-border:#27272a;--motiq-border-strong:#3f3f46;--motiq-fg:#ffffff;--motiq-fg-secondary:#d4d4d8;--motiq-muted:#71717a;--motiq-secondary-accent:#e4e4e7;--motiq-success:#ffffff;--motiq-surface:#0c0c0e;--motiq-surface-2:#18181b;--motiq-warning:#ffffff}}@layer motiq{.dark,[data-theme=\"dark\"]{--motiq-accent:#ffffff;--motiq-accent-text:#ffffff;--motiq-bg:#000000;--motiq-border:#27272a;--motiq-border-strong:#3f3f46;--motiq-fg:#ffffff;--motiq-fg-secondary:#d4d4d8;--motiq-muted:#71717a;--motiq-secondary-accent:#e4e4e7;--motiq-success:#ffffff;--motiq-surface:#0c0c0e;--motiq-surface-2:#18181b;--motiq-warning:#ffffff}}";

/** Merge Tailwind class names; later/consumer classes win on conflict. */
function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/* ---- motion primitives (inlined from @motiq/primitives) ---- */

/**
 * SSR-safe `prefers-reduced-motion`. Reads synchronously on the client so a
 * reduced-motion user never sees a frame of motion; the value is never rendered
 * into markup, so there is no hydration-mismatch risk.
 */
function useReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/**
 * Returns whether the referenced element is currently worth animating — i.e.
 * on-screen AND the tab is visible. Use it to pause per-frame work, autoplay,
 * or streaming when the component scrolls away or the tab is backgrounded.
 */
function useVisibilityPause<T extends Element>(
  ref: React.RefObject<T | null>,
  { threshold = 0.1 }: { threshold?: number } = {},
): boolean {
  const [onScreen, setOnScreen] = React.useState(true);
  const [tabVisible, setTabVisible] = React.useState(true);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => setOnScreen(entries.some((e) => e.isIntersecting)),
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, threshold]);

  React.useEffect(() => {
    const onVis = () => setTabVisible(document.visibilityState !== "hidden");
    onVis();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return onScreen && tabVisible;
}

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface DockItem {
  /** Stable id passed back to `onSelect`. */
  id: string;
  /** Accessible name + tooltip text. */
  label: string;
  /** Optional glyph (an inline `<svg>` works best); falls back to the label initial. */
  icon?: React.ReactNode;
  /** Optional two-stop gradient override for the tile, e.g. `["#4f7cff", "#22c7d9"]`. */
  tint?: [string, string];
  /** Whether this dock item is currently active / selected. */
  active?: boolean;
}

export interface MagneticDockProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  /** The dock's apps/actions, left to right. */
  items: DockItem[];
  /** σ of the shared gaussian attraction field, in px. Larger = wider, softer cascade. */
  magnetRadius?: number;
  /** Scale of the icon directly under the pointer (1 = no growth). */
  maxScale?: number;
  /** Peak vertical lift, in px. */
  lift?: number;
  /** Scale-spring stiffness. */
  stiffness?: number;
  /** Scale-spring damping. */
  damping?: number;
  /** Sweep a virtual pointer across the bar when nothing is hovering it. */
  idleWave?: boolean;
  /** Show the spring-chased label chip above the dominant icon. */
  tooltip?: boolean;
  /** Fired when an icon is activated by click, Enter, or Space. */
  onSelect?: (id: string) => void;
  /** Deterministic seed for the idle-wave phase (SSR-stable). */
  seed?: number;
  /** Stop the rAF loop when scrolled offscreen or the tab is hidden. */
  pauseWhenHidden?: boolean;
  /** Force the static, motion-free variant regardless of system preference. */
  reducedMotion?: boolean;
  /** Extra class names for the outer dock bar wrapper. */
  barClassName?: string;
  /** Custom wrapper styling to adapt dock height. */
  wrapperClassName?: string;
}

/* -------------------------------------------------------------------------- */
/* Physics                                                                    */
/* -------------------------------------------------------------------------- */

interface Spring {
  x: number;
  v: number;
}

const mkSpring = (x = 0): Spring => ({ x, v: 0 });

/** Semi-implicit Euler spring with substeps — stable at low/irregular frame rates. */
function spring(s: Spring, target: number, k: number, c: number, dt: number): number {
  const n = dt > 0.012 ? Math.ceil(dt / 0.008) : 1;
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    s.v += (-k * (s.x - target) - c * s.v) * h;
    s.x += s.v * h;
  }
  return s.x;
}

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

/** mulberry32 — no Math.random at render or module scope (SSR-stable). */
function makeRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* -------------------------------------------------------------------------- */
/* Palette                                                                    */
/* -------------------------------------------------------------------------- */

const ACCENT = "var(--motiq-accent, #38bdf8)";
const CYAN = "var(--motiq-secondary-accent, #22d3ee)";
const FG = "var(--motiq-fg, #f8fafc)";

/** Token-only tile ramp; cycles for docks longer than eight items. */
const TINTS: ReadonlyArray<[string, string]> = [
  [ACCENT, CYAN],
  [CYAN, `color-mix(in oklab, ${CYAN} 40%, ${ACCENT})`],
  [`color-mix(in oklab, ${ACCENT} 70%, ${FG})`, ACCENT],
  ["var(--motiq-success, #34d399)", CYAN],
  [ACCENT, `color-mix(in oklab, ${ACCENT} 45%, ${CYAN})`],
  ["var(--motiq-warning, #fbbf24)", `color-mix(in oklab, var(--motiq-warning, #fbbf24) 45%, ${ACCENT})`],
  [`color-mix(in oklab, ${CYAN} 70%, ${FG})`, CYAN],
  [`color-mix(in oklab, ${ACCENT} 80%, ${CYAN})`, ACCENT],
];

/* Field constants ported verbatim from the Motion Lab prototype. */
const LIFT_K = 360;
const LIFT_C = 22;
const DRIFT = 0.13;
const DRIFT_K = 300;
const DRIFT_C = 20;
const TIP_K = 340;
const TIP_C = 26;
/** Vertical reach of the field — it dies out this far above/below the bar. */
const VERTICAL_REACH = 220;

interface Base {
  x: number;
  y: number;
}

interface PointerState {
  x: number;
  y: number;
  inside: boolean;
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

function MagneticDockBase({
  items,
  magnetRadius = 78,
  maxScale = 1.5,
  lift = 24,
  stiffness = 420,
  damping = 26,
  idleWave = true,
  tooltip = true,
  onSelect,
  seed = 1,
  pauseWhenHidden = true,
  reducedMotion,
  className,
  barClassName,
  wrapperClassName,
  style,
  ...props
}: MagneticDockProps) {
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const barRef = React.useRef<HTMLDivElement | null>(null);
  const tipRef = React.useRef<HTMLDivElement | null>(null);
  const iconsRef = React.useRef<Array<HTMLButtonElement | null>>([]);
  const basesRef = React.useRef<Base[]>([]);
  const pointerRef = React.useRef<PointerState>({ x: -1e4, y: -1e4, inside: false });
  const focusRef = React.useRef(-1);

  const systemReduced = useReducedMotion();
  const [hydrated, setHydrated] = React.useState(false);
  React.useEffect(() => setHydrated(true), []);
  const staticMode = reducedMotion === true || (hydrated && systemReduced);
  const onScreen = useVisibilityPause(rootRef, { threshold: 0.06 });
  const paused = pauseWhenHidden && !onScreen;
  const animate = !staticMode && !paused;

  const count = items.length;
  const labels = items.map((i) => i.label).join("\u0000");

  const params = React.useRef({ magnetRadius, maxScale, lift, stiffness, damping, idleWave, tooltip });
  React.useEffect(() => {
    params.current = { magnetRadius, maxScale, lift, stiffness, damping, idleWave, tooltip };
  }, [magnetRadius, maxScale, lift, stiffness, damping, idleWave, tooltip]);

  React.useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const measure = () => {
      const bx = bar.offsetLeft;
      const by = bar.offsetTop;
      basesRef.current = iconsRef.current.slice(0, count).map((el) =>
        el ? { x: bx + el.offsetLeft + el.offsetWidth / 2, y: by + el.offsetTop + el.offsetHeight / 2 } : { x: 0, y: 0 },
      );
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(bar);
    if (rootRef.current) ro.observe(rootRef.current);
    return () => ro.disconnect();
  }, [count, labels]);

  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    if (!animate) {
      iconsRef.current.forEach((el) => {
        if (el) el.style.transform = "";
      });
      if (tipRef.current) tipRef.current.style.opacity = "0";
      return;
    }

    const states = Array.from({ length: count }, () => ({ s: mkSpring(1), y: mkSpring(0), dx: mkSpring(0) }));
    const tipX = mkSpring(0);
    const tipO = mkSpring(0);
    const rng = makeRng(seed);
    let idleT = rng() * 20;
    let raf = 0;
    let last = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      let dt = (now - last) / 1000;
      last = now;
      if (!(dt > 0) || dt > 0.05) dt = 0.016;
      idleT += dt;

      const cfg = params.current;
      const bases = basesRef.current;
      const p = pointerRef.current;
      const w = root.clientWidth;
      const grow = Math.max(0, cfg.maxScale - 1);
      const sigma = Math.max(8, cfg.magnetRadius);

      let px: number;
      let py: number;
      let amp: number;
      const fi = focusRef.current;
      if (p.inside) {
        px = p.x;
        py = p.y;
        amp = 1;
      } else if (fi >= 0 && bases[fi]) {
        px = bases[fi].x;
        py = bases[fi].y;
        amp = 1;
      } else if (cfg.idleWave) {
        px = w / 2 + Math.sin(idleT * 0.55) * w * 0.34;
        py = bases[0]?.y ?? root.clientHeight - 40;
        amp = 0.35;
      } else {
        px = -1e4;
        py = -1e4;
        amp = 0;
      }

      let bestI = -1;
      let bestInf = 0;
      for (let i = 0; i < count; i++) {
        const b = bases[i];
        const el = iconsRef.current[i];
        const st = states[i];
        if (!b || !el || !st) continue;
        const d = px - b.x;
        const vert = Math.max(0, 1 - Math.abs(py - b.y) / VERTICAL_REACH);
        const inf = Math.exp(-(d * d) / (2 * sigma * sigma)) * amp * vert;
        if (inf > bestInf) {
          bestInf = inf;
          bestI = i;
        }
        spring(st.s, 1 + grow * inf, cfg.stiffness, cfg.damping, dt);
        spring(st.y, -cfg.lift * inf, LIFT_K, LIFT_C, dt);
        spring(st.dx, d * DRIFT * inf, DRIFT_K, DRIFT_C, dt);
        el.style.transform = `translate3d(${st.dx.x.toFixed(2)}px,${st.y.x.toFixed(2)}px,0) scale(${st.s.x.toFixed(3)})`;
      }

      const tip = tipRef.current;
      if (!tip) return;
      const showTip = cfg.tooltip && (p.inside || fi >= 0) && bestInf > 0.5 && bestI >= 0;
      if (showTip) {
        const next = items[bestI]?.label ?? "";
        if (tip.textContent !== next) tip.textContent = next;
        spring(tipX, bases[bestI].x, TIP_K, TIP_C, dt);
      }
      spring(tipO, showTip ? 1 : 0, 220, 24, dt);
      const o = clamp(tipO.x, 0, 1);
      if (o > 0.01 && bestI >= 0 && bases[bestI]) {
        const ty = bases[bestI].y - 66 - states[bestI].y.x * -0.4 - 14 * o;
        tip.style.opacity = o.toFixed(3);
        tip.style.transform = `translate3d(${(tipX.x - tip.offsetWidth / 2).toFixed(1)}px,${ty.toFixed(1)}px,0)`;
      } else {
        tip.style.opacity = "0";
      }
    };

    last = typeof performance !== "undefined" ? performance.now() : 0;
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [animate, count, items, seed]);

  const track = React.useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const root = rootRef.current;
    if (!root) return;
    const r = root.getBoundingClientRect();
    pointerRef.current = { x: e.clientX - r.left, y: e.clientY - r.top, inside: true };
  }, []);

  const release = React.useCallback(() => {
    pointerRef.current = { x: -1e4, y: -1e4, inside: false };
  }, []);

  return (
    <div
      ref={rootRef}
      data-motion={staticMode ? "static" : "animated"}
      data-paused={paused ? "true" : "false"}
      className={cn("relative w-full select-none", className)}
      style={{ touchAction: "pan-y", ...style }}
      onPointerMove={track}
      onPointerDown={track}
      onPointerLeave={release}
      onPointerCancel={release}
      {...props}
    >
      <div className={cn("flex w-full justify-center px-3 pb-2 pt-6", wrapperClassName)}>
        <div
          ref={barRef}
          className={cn(
            "relative flex max-w-full items-end justify-between sm:justify-center gap-3 sm:gap-6 rounded-[28px] px-6 sm:px-9 py-3",
            "border border-[#1D2233] backdrop-blur-[16px]",
            barClassName
          )}
          style={{
            background: "rgba(10, 13, 24, 0.9)",
            boxShadow: "0 20px 50px -18px rgba(56, 189, 248, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)",
          }}
        >
          {items.map((item, i) => {
            const defaultTint = TINTS[i % TINTS.length];
            const [a, b] = item.tint ?? (item.active ? ["#38BDF8", "#0284C7"] : ["#161B26", "#0D111A"]);
            const isActive = item.active;

            return (
              <button
                key={item.id}
                type="button"
                ref={(el) => {
                  iconsRef.current[i] = el;
                }}
                data-dock-item={item.id}
                aria-label={item.label}
                onClick={() => onSelect?.(item.id)}
                onFocus={() => {
                  focusRef.current = i;
                }}
                onBlur={() => {
                  if (focusRef.current === i) focusRef.current = -1;
                }}
                className={cn(
                  "relative grid h-[54px] w-[54px] shrink-0 origin-bottom place-items-center rounded-[16px]",
                  "cursor-pointer border p-0 text-[14px] font-bold transition-colors duration-200",
                  "[&_svg]:h-6 [&_svg]:w-6 [&_svg]:stroke-current [&_svg]:stroke-2",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-sky-400",
                  isActive
                    ? "border-sky-400/80 text-sky-950 shadow-[0_0_16px_rgba(56,189,248,0.5)]"
                    : "border-white/10 text-slate-300 hover:text-white hover:border-sky-400/40",
                  staticMode &&
                    "transition-transform duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:-translate-y-2 hover:scale-[1.14] focus-visible:-translate-y-2 focus-visible:scale-[1.14]",
                )}
                style={{
                  backgroundImage: `linear-gradient(140deg, ${a}, ${b})`,
                  boxShadow: isActive
                    ? `inset 0 1px 0 rgba(255,255,255,0.4), 0 8px 24px -4px rgba(56,189,248,0.6)`
                    : `inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 12px -4px rgba(0,0,0,0.5)`,
                  willChange: "transform",
                }}
              >
                {item.icon ?? <span aria-hidden="true">{item.label.slice(0, 1).toUpperCase()}</span>}

                {/* Subtle active indicator dot under active tab */}
                {isActive && (
                  <span 
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_6px_#38BDF8]"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {tooltip && !staticMode ? (
        <div
          ref={tipRef}
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 z-20 whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-semibold opacity-0 shadow-lg border border-[#1D2233]"
          style={{
            background: "#000000",
            color: "#ffffff",
            boxShadow: "0 4px 16px rgba(0,0,0,0.8)",
            transform: "translate3d(-999px,-999px,0)",
            willChange: "transform, opacity",
          }}
        />
      ) : null}
    </div>
  );
}

MagneticDockBase.displayName = "MagneticDock";

export function MagneticDock(props: MagneticDockProps) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: MOTIQ_TOKENS }} />
      <MagneticDockBase {...props} />
    </>
  );
}

export default MagneticDock;
