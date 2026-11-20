/* App-Gerüst: Desktop mit Glas-Sidebar, Handy/Tablet mit schwebender Tab-Leiste unten.
   Ansicht steht im Hash (#warth-schroecken), damit Links und Zurück funktionieren. */
import { useCallback, useEffect, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { Contrast, LayoutGrid, Mountain, RotateCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { statusText, useSkiData } from "@/lib/data"
import { PALETTES, usePalette, type Palette } from "@/lib/theme"
import { activeResorts, cm, depths, lawFor, todayStr } from "@/lib/model"
import type { SkiData } from "@/lib/types"
import { Overview, OverviewSkeleton, ErrorState } from "@/components/ski/Overview"
import { ResortView } from "@/components/ski/ResortView"
import { AvalancheBadge } from "@/components/ski/bits"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarProvider,
} from "@/components/ui/sidebar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const readHash = () => decodeURIComponent(location.hash.slice(1)) || "overview"

function useView() {
  const [view, setViewState] = useState(readHash)
  useEffect(() => {
    const on = () => setViewState(readHash())
    window.addEventListener("hashchange", on)
    window.addEventListener("popstate", on)
    return () => { window.removeEventListener("hashchange", on); window.removeEventListener("popstate", on) }
  }, [])
  const setView = useCallback((v: string) => {
    if (v === readHash()) return
    history.pushState(null, "", v === "overview" ? location.pathname + location.search : "#" + v)
    setViewState(v)
    window.scrollTo({ top: 0 })
  }, [])
  return [view, setView] as const
}

export default function App() {
  const { data: D, state, refresh, addResort, removeResort } = useSkiData()
  const [palette, setPalette] = usePalette()
  const [view, setView] = useView()
  const reduce = useReducedMotion()
  const resorts = activeResorts(D)
  const resort = resorts.find((r) => r.id === view)
  const current = resort ? resort.id : "overview"
  const title = resort ? resort.name : "Ski aktuell"
  useEffect(() => { document.title = resort ? `${resort.name} – Ski aktuell` : "Ski aktuell" }, [resort])

  const loading = state === "loading"
  const actions = <Actions loading={loading} onRefresh={refresh} palette={palette} setPalette={setPalette} />

  let body
  if (!D.wx) body = loading ? <OverviewSkeleton /> : <ErrorState onRetry={refresh} />
  else if (resort) body = <ResortView D={D} r={resort} onRemove={() => { removeResort(resort.id); setView("overview") }} />
  else body = <Overview D={D} onOpen={setView} onAdd={(r) => { addResort(r); setView(r.id) }} />

  return (
    <SidebarProvider className="min-h-dvh">
      {/* Desktop: Glas-Sidebar */}
      <aside className="sticky top-0 hidden h-dvh shrink-0 p-3 lg:block">
        <Sidebar collapsible="none" className="glass h-full rounded-[22px] bg-transparent">
          <SidebarHeader className="px-4 pt-5 pb-2">
            <div className="flex items-center gap-2.5">
              <img src="./icon.svg" alt="" className="size-8 rounded-[9px] shadow-sm" />
              <span className="font-heading text-headline font-semibold tracking-[-0.015em]">Ski aktuell</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={current === "overview"} onClick={() => setView("overview")} className="h-10 rounded-xl text-body">
                    <LayoutGrid />Übersicht
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel className="text-caption">Skigebiete</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {resorts.map((r) => <ResortNavItem key={r.id} D={D} id={r.id} active={current === r.id} onSelect={setView} />)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="gap-3 p-4">
            <StatusLine D={D} loading={loading} />
            {actions}
          </SidebarFooter>
        </Sidebar>
      </aside>

      <main className="min-w-0 flex-1 px-[max(1rem,env(safe-area-inset-left))] pt-[max(1.25rem,env(safe-area-inset-top))] pb-32 sm:px-6 lg:px-10 lg:pt-10 lg:pb-12">
        <div className="mx-auto max-w-6xl">
          <header className="mb-6 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-heading text-[1.875rem] leading-[1.1] font-bold tracking-[-0.03em] text-balance [hyphens:auto] sm:text-large lg:text-[2.5rem]">{title}</h1>
              <div className="mt-1 lg:hidden"><StatusLine D={D} loading={loading} /></div>
              {resort?.region && <div className="mt-1 hidden text-body text-muted-foreground lg:block">{resort.region}</div>}
            </div>
            <div className="lg:hidden">{actions}</div>
          </header>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={current + (D.wx ? "" : state)}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}>
              {body}
            </motion.div>
          </AnimatePresence>

          <footer className="mt-10 max-w-3xl px-1 text-[0.75rem] leading-relaxed text-muted-foreground">
            Wetter, Neuschnee und Schneehöhe: <a className="underline underline-offset-2" href="https://open-meteo.com" rel="noopener">Open-Meteo</a> (Modellwerte je Höhe).
            Lawinenlage: <a className="underline underline-offset-2" href="https://warnung.vorarlberg.at/vtgdb/dist/index.html#//lwd_lagebericht.html" rel="noopener">LWD Vorarlberg</a>.
            Lifte und Pisten: Angaben der Skigebiete. Alle Angaben ohne Gewähr. Vor Touren abseits der Piste immer den vollständigen Lagebericht lesen.
          </footer>
        </div>
      </main>

      {/* Handy und Tablet: schwebende Tab-Leiste */}
      <nav aria-label="Skigebiete"
        className="glass fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md rounded-full p-1.5 lg:hidden">
        {[{ id: "overview", label: "Übersicht" }, ...resorts.map((r) => ({ id: r.id, label: r.kurz || r.name }))].map((t) => {
          const on = current === t.id
          return (
            <button key={t.id} type="button" onClick={() => setView(t.id)} aria-current={on ? "page" : undefined}
              className={cn("relative flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-1 text-[0.6875rem] font-semibold transition-colors",
                on ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
              {on && <motion.span layoutId="tab-pill" className="absolute inset-0 rounded-full bg-accent" transition={{ type: "spring", bounce: 0.18, duration: reduce ? 0 : 0.4 }} />}
              <span className="relative">{t.id === "overview" ? <LayoutGrid className="size-5" /> : <Mountain className="size-5" />}</span>
              <span className="relative max-w-full truncate">{t.label}</span>
            </button>
          )
        })}
      </nav>
    </SidebarProvider>
  )
}

function ResortNavItem({ D, id, active, onSelect }: { D: SkiData; id: string; active: boolean; onSelect: (id: string) => void }) {
  const r = D.resorts.find((x) => x.id === id)!
  const dp = D.wx ? depths(D, r) : null, L = lawFor(D, r, todayStr())
  return (
    <SidebarMenuItem>
      <SidebarMenuButton isActive={active} onClick={() => onSelect(id)} size="lg" className="h-auto rounded-xl py-2.5">
        <div className="min-w-0 flex-1">
          <div className="truncate text-body font-medium">{r.name}</div>
          <div className="text-caption text-muted-foreground">{dp ? `${cm(dp.berg)} cm Schnee am Berg` : r.region}</div>
        </div>
        {!r.custom && <AvalancheBadge level={L ? L.lv : null} />}
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function StatusLine({ D, loading }: { D: SkiData; loading: boolean }) {
  const live = !!D.wx && D.wxLive
  return (
    <p className="flex items-center gap-2 text-caption text-muted-foreground" aria-live="polite">
      <span className={cn("size-2 shrink-0 rounded-full", loading ? "animate-pulse bg-muted-foreground" : live ? "bg-up" : "bg-warm")} />
      {loading && !D.wx ? "Lädt …" : statusText(D)}
    </p>
  )
}

function Actions({ loading, onRefresh, palette, setPalette }: {
  loading: boolean; onRefresh: () => void; palette: Palette; setPalette: (p: Palette) => void
}) {
  const btn = "glass grid size-11 place-items-center rounded-full text-primary transition-transform duration-150 active:scale-92 disabled:cursor-default"
  return (
    <div className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger render={<button type="button" className={btn} onClick={onRefresh} disabled={loading} aria-label="Aktualisieren" />}>
          <RotateCw className={cn("size-5", loading && "animate-spin")} />
        </TooltipTrigger>
        <TooltipContent>Aktualisieren</TooltipContent>
      </Tooltip>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger render={<DropdownMenuTrigger render={<button type="button" className={btn} aria-label="Darstellung" />} />}>
            <Contrast className="size-5" />
          </TooltipTrigger>
          <TooltipContent>Darstellung</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="glass w-56 rounded-2xl p-1.5">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-caption">Darstellung</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={palette} onValueChange={(v) => setPalette(v as Palette)}>
              {PALETTES.map((p) => (
                <DropdownMenuRadioItem key={p.id} value={p.id} closeOnClick className="min-h-10 gap-3 rounded-xl text-body">
                  <span className="flex overflow-hidden rounded-md ring-1 ring-border">
                    {p.swatch.map((c) => <i key={c} className="h-5 w-2.5" style={{ background: c }} />)}
                  </span>
                  {p.name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
