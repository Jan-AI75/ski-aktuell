/* Übersicht: alle Gebiete auf einen Blick – Schneehöhe zuerst, dann Neuschnee und Prognose. */
import { useState } from "react"
import { ChevronRight, RotateCw } from "lucide-react"
import type { Resort, SkiData } from "@/lib/types"
import { AddResortDialog, AddResortTile } from "./AddResort"
import {
  activeResorts, bestDay, cm, codeKind, depths, fmtT, inversion, lawFor, liftLine, pointStats, sunHours, todayStr, topData, wxText,
} from "@/lib/model"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AvalancheBadge, Metric, WeatherIcon } from "./bits"

export function Overview({ D, onOpen, onAdd }: { D: SkiData; onOpen: (id: string) => void; onAdd: (r: Resort) => void }) {
  const [adding, setAdding] = useState(false)
  return (
    <div className="grid gap-4">
      <ul className="grid auto-rows-fr gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {activeResorts(D).map((r) => {
          const d = topData(D, r), s = pointStats(d), dp = depths(D, r), L = lawFor(D, r, todayStr())
          const sun = s ? sunHours(d, s.di) : null, best = bestDay(D, r)
          return (
            <li key={r.id}>
              <button type="button" onClick={() => onOpen(r.id)} aria-label={`${r.name}: Details öffnen`}
                className="surface group flex h-full w-full flex-col p-5 text-left transition-[transform,box-shadow] duration-200 ease-(--ease-out-soft) hover:-translate-y-0.5 hover:shadow-glass active:scale-[0.985]">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-heading text-title font-semibold tracking-[-0.02em]">{r.name}</div>
                    <div className="mt-0.5 text-caption text-muted-foreground">{r.custom ? "Eigenes Gebiet" : liftLine(D, r)}</div>
                  </div>
                  {!r.custom && <AvalancheBadge level={L ? L.lv : null} />}
                  <ChevronRight className="mt-1 size-5 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>

                {s && (
                  <div className="mt-3 flex items-center gap-2 text-caption text-muted-foreground">
                    <WeatherIcon kind={codeKind(s.code)} className="size-4" />
                    <span className="truncate">{fmtT(s.temp)} {wxText(s.code)}{sun != null && `, ${Math.round(sun)} h Sonne`}</span>
                  </div>
                )}
                {s && inversion(D, r, s.di) && <div className="mt-1 text-caption text-warm">Im Tal trüb, oben Sonne</div>}

                <div className="min-h-5 flex-1" />
                <div className="grid grid-cols-[1.25fr_1fr_1fr] gap-3 border-t pt-4 [&>*+*]:border-l [&>*+*]:pl-3">
                  <Metric label="Schneehöhe" value={cm(dp.berg)} unit="cm" note={dp.tal != null ? `Tal ${cm(dp.tal)} cm` : "Berg"} size="lg" />
                  <Metric label="Neuschnee" value={s ? cm(s.past24) : "–"} unit="cm" tone="snow" note={s ? `72 h: ${cm(s.past72)}` : undefined} />
                  <Metric label="Prognose" value={s ? `+${cm(s.next72)}` : "–"} unit="cm" note="3 Tage" />
                </div>
                {best && (
                  <div className="mt-4 rounded-xl bg-accent px-3 py-2.5 text-caption text-accent-foreground">
                    Bester Skitag: <b className="font-semibold">{best.label}</b>
                  </div>
                )}
              </button>
            </li>
          )
        })}
        <li><AddResortTile onClick={() => setAdding(true)} /></li>
      </ul>
      <AddResortDialog open={adding} onOpenChange={setAdding} existing={D.resorts} onAdd={onAdd} />
      <p className="px-1 text-caption text-muted-foreground">
        Schneehöhe: Meldung des Skigebiets, sonst Modell. Neuschnee und Prognose sind Modellwerte für die Bergstation.
      </p>
    </div>
  )
}

export function OverviewSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3" aria-busy="true" aria-label="Daten werden geladen">
      {[0, 1, 2].map((i) => (
        <div key={i} className="surface grid gap-4 p-5">
          <Skeleton className="h-6 w-2/3" /><Skeleton className="h-4 w-1/2" />
          <div className="grid grid-cols-3 gap-3 border-t pt-4"><Skeleton className="h-12" /><Skeleton className="h-12" /><Skeleton className="h-12" /></div>
        </div>
      ))}
    </div>
  )
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="surface grid justify-items-center gap-3 px-6 py-12 text-center">
      <div className="text-headline font-semibold">Keine Wetterdaten erreichbar</div>
      <p className="max-w-sm text-caption text-muted-foreground">
        Weder Open-Meteo noch die gespeicherte Vorhersage ließen sich laden. Prüfe die Internetverbindung und lade neu.
      </p>
      <Button onClick={onRetry} className="mt-2 h-11 rounded-full px-5"><RotateCw className="size-4" />Erneut laden</Button>
    </div>
  )
}
