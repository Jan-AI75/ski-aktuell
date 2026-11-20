/* Höhenprofil: Bergschnitt vom Tal zum Berg mit den Messpunkten des Gebiets.
   Die Schneedecke liegt als Band auf dem Grat (dicker = mehr Schnee), die Schneefallgrenze ist gestrichelt. */
import { useEffect, useRef, useState } from "react"
import { cm, fmtT, type PointStats } from "@/lib/model"
import type { Point } from "@/lib/types"

const TOP = 46, BOTTOM = 18

/** Breite des Behälters in CSS-Pixeln – das Profil zeichnet in echter Größe, damit die Schrift lesbar bleibt. */
function useWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

export function AltitudeProfile(props: { points: Point[]; stats: (PointStats | null)[]; snowline: number | null }) {
  const [ref, w] = useWidth()
  return <div ref={ref} className="w-full">{w > 0 && <Profile {...props} W={Math.max(280, w)} />}</div>
}

function Profile({ points, stats, snowline, W }: {
  points: Point[]; stats: (PointStats | null)[]; snowline: number | null; W: number
}) {
  const H = W < 480 ? 210 : 240, PAD_X = W < 480 ? 44 : 60
  const n = points.length
  const elevs = points.map((p) => p.elev)
  const lo = Math.min(...elevs) - 250
  const hi = Math.max(...elevs, snowline ?? 0) + 180
  const y = (e: number) => TOP + (1 - (e - lo) / (hi - lo)) * (H - TOP - BOTTOM)
  // Messpunkte von links unten nach rechts oben, der Gipfel steht bei ~72 % der Breite
  const xs = points.map((_, i) => (n === 1 ? W * 0.6 : PAD_X + (i / (n - 1)) * (W * 0.72 - PAD_X)))
  const ys = points.map((p) => y(p.elev))

  // Grat: vom linken Rand über alle Punkte zum Gipfel, dann zum rechten Rand abfallend
  const ridge: [number, number][] = [[0, y(points[0].elev - 120)], ...xs.map((x, i): [number, number] => [x, ys[i]]),
    [W * 0.86, y(points[n - 1].elev - 260)], [W, y(points[n - 1].elev - 420)]]
  const path = smooth(ridge)
  const area = `${path} L ${W} ${H} L 0 ${H} Z`
  const depth = stats.map((s) => s?.depth ?? 0)
  const band = (d: number) => (d <= 0 ? 0 : Math.min(11, 2.5 + d / 12))
  // Abschnitte: linker Rand bis 1. Punkt (Tal), zwischen den Punkten, Gipfel bis rechter Rand
  const cuts = [0, ...xs.slice(1).map((x, i) => (xs[i] + x) / 2), W]
  const segs = xs.map((_, i) => ({ x0: cuts[i], x1: cuts[i + 1], w: band(depth[i]) }))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img"
      aria-label={`Höhenprofil: ${points.map((p, i) => `${p.name} ${p.elev} m, ${cm(stats[i]?.depth)} cm Schnee`).join("; ")}` +
        (snowline != null ? `; Schneefallgrenze etwa ${snowline} m` : "")}>
      <defs>
        <linearGradient id="rock" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--muted-foreground)" stopOpacity="0.22" />
          <stop offset="1" stopColor="var(--muted-foreground)" stopOpacity="0.04" />
        </linearGradient>
        <clipPath id="ridge-clip"><path d={area} /></clipPath>
        {segs.map((s, i) => (
          <clipPath key={i} id={`seg-${i}`}><rect x={s.x0} y="0" width={s.x1 - s.x0} height={H} /></clipPath>
        ))}
      </defs>

      <path d={area} fill="url(#rock)" />
      {/* Schneedecke: der Grat selbst, je Abschnitt zwischen zwei Messpunkten so dick wie die Schneehöhe dort */}
      <g clipPath="url(#ridge-clip)">
        {segs.map((s, i) => s.w > 0 && (
          <g key={i} clipPath={`url(#seg-${i})`}>
            <path d={path} fill="none" stroke="var(--snow)" strokeWidth={s.w * 2} opacity={0.85} />
          </g>
        ))}
      </g>
      <path d={path} fill="none" stroke="var(--muted-foreground)" strokeOpacity="0.55" strokeWidth="1.5" />

      {snowline != null && snowline > lo && snowline < hi && (
        <g>
          <line x1="0" x2={W} y1={y(snowline)} y2={y(snowline)} stroke="var(--primary)" strokeOpacity="0.6" strokeDasharray="5 5" />
          <text x={W - 6} y={y(snowline) - 7} textAnchor="end" className="fill-primary text-[12px] font-medium [paint-order:stroke] [stroke:var(--card)] [stroke-width:4px] [stroke-linejoin:round]">
            Schneefallgrenze {snowline} m
          </text>
        </g>
      )}

      {points.map((p, i) => {
        const s = stats[i], above = i % 2 === 0 || n < 3
        return (
          <g key={p.name}>
            <circle cx={xs[i]} cy={ys[i]} r="4.5" fill="var(--card)" stroke="var(--foreground)" strokeWidth="1.8" />
            <text x={Math.max(70, xs[i])} y={above ? ys[i] - 26 : ys[i] + 24} textAnchor="middle" className="fill-foreground text-[13px] font-semibold [paint-order:stroke] [stroke:var(--card)] [stroke-width:4px] [stroke-linejoin:round]">
              {p.name}
            </text>
            <text x={Math.max(70, xs[i])} y={above ? ys[i] - 11 : ys[i] + 39} textAnchor="middle" className="fill-muted-foreground text-[12px] [paint-order:stroke] [stroke:var(--card)] [stroke-width:4px] [stroke-linejoin:round]">
              {W < 480 ? `${cm(s?.depth)} cm, ${fmtT(s?.temp)}` : `${p.elev} m, ${cm(s?.depth)} cm, ${fmtT(s?.temp)}`}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/** Weiche Kurve durch alle Punkte (Catmull-Rom als kubische Bézierkurve). */
function smooth(p: [number, number][]) {
  if (p.length < 2) return ""
  let d = `M ${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] ?? p2
    const t = 0.18
    const c1 = [p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t]
    const c2 = [p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t]
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
  }
  return d
}
