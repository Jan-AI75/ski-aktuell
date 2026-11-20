/* Kleine, wiederverwendete Bausteine: Wetter-Icon, Lawinenstufe, Abschnitt, Kennzahl. */
import type { ReactNode } from "react"
import { Cloud, CloudFog, CloudRain, CloudSnow, CloudSun, Sun } from "lucide-react"
import { cn } from "@/lib/utils"
import { KIND_TXT, LEVEL_TXT, type Kind } from "@/lib/model"

const ICONS = { sun: Sun, partly: CloudSun, cloud: Cloud, snow: CloudSnow, rain: CloudRain, fog: CloudFog }
const TONE: Record<Kind, string> = {
  sun: "text-warm", partly: "text-warm", cloud: "text-muted-foreground",
  snow: "text-snow", rain: "text-primary", fog: "text-muted-foreground",
}
export function WeatherIcon({ kind, className, label }: { kind: Kind; className?: string; label?: boolean }) {
  const I = ICONS[kind]
  return <I className={cn("size-6 shrink-0", TONE[kind], className)} strokeWidth={1.75}
    aria-hidden={!label} aria-label={label ? KIND_TXT[kind] : undefined} />
}

/* Offizielle EAWS-Farben der Lawinenwarnstufen */
const LV_STYLE = [
  "bg-fill text-muted-foreground",
  "bg-[#ccff66] text-[#111]",
  "bg-[#ffff00] text-[#111]",
  "bg-[#ff9900] text-[#111]",
  "bg-[#ff3b30] text-white",
  "bg-[repeating-linear-gradient(45deg,#ff3b30_0_6px,#111_6px_12px)] text-white",
]
export function AvalancheBadge({ level, size = "md" }: { level: number | null; size?: "md" | "lg" }) {
  const lv = level ?? 0
  return (
    <span role="img"
      aria-label={level == null ? "Lawinenstufe: noch kein Bericht" : `Lawinenstufe ${lv}, ${LEVEL_TXT[lv]}`}
      className={cn("inline-grid shrink-0 place-items-center rounded-lg font-semibold tabular-nums",
        size === "lg" ? "size-11 text-title" : "size-7 text-caption", LV_STYLE[lv])}>
      {level ? lv : "–"}
    </span>
  )
}

/** Abschnitt im iOS-Stil: Überschrift über der Fläche, Inhalt auf der Fläche. */
export function Section({ title, aside, children, className, id, area }: {
  title: string; aside?: ReactNode; children: ReactNode; className?: string; id?: string
  /** Platz im Raster der Detailseite (ab 1024 px), siehe .resort-grid in index.css */
  area?: string
}) {
  return (
    <section aria-labelledby={id} data-area={area} className={cn("flex min-w-0 flex-col", className)}>
      <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
        <h2 id={id} className="font-heading text-headline font-semibold tracking-[-0.015em]">{title}</h2>
        {aside && <span className="text-caption text-muted-foreground">{aside}</span>}
      </div>
      <div className="surface flex flex-1 flex-col overflow-hidden [&>*:last-child:not(:first-child)]:mt-auto">{children}</div>
    </section>
  )
}

/** Kennzahl: kleines Label, Wert, Zusatz. */
export function Metric({ label, value, unit, note, tone, size = "md" }: {
  label: string; value: ReactNode; unit?: string; note?: ReactNode; tone?: "snow"; size?: "md" | "lg"
}) {
  return (
    <div className="min-w-0">
      <div className="text-caption text-muted-foreground">{label}</div>
      <div className={cn("font-heading font-semibold tracking-[-0.02em] tabular-nums",
        size === "lg" ? "text-large" : "text-title", tone === "snow" && "text-snow")}>
        {value}{unit && <span className="ml-0.5 text-[0.55em] font-medium tracking-normal text-muted-foreground">{unit}</span>}
      </div>
      {note && <div className="truncate text-caption text-muted-foreground">{note}</div>}
    </div>
  )
}

export function Note({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("px-5 py-3.5 text-caption text-muted-foreground", className)}>{children}</p>
}

export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener"
      className="inline-flex min-h-11 items-center rounded-full bg-accent px-4 text-caption font-semibold text-accent-foreground transition-transform duration-150 hover:brightness-[1.03] active:scale-[0.97]">
      {children}
    </a>
  )
}
