/* Webcams: Reihe zum Wischen, Antippen öffnet die große Ansicht.
   Große Ansicht: Wischen, Pfeile oder Pfeiltasten wechseln; ✕, Esc oder Zurück-Geste schließen. */
import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, ExternalLink as ExtIcon, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { camSrc } from "@/lib/model"
import type { Resort } from "@/lib/types"
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Note, Section } from "./bits"

export function Webcams({ r }: { r: Resort }) {
  const cams = r.webcams ?? []
  const strip = useRef<HTMLDivElement>(null)
  const [cur, setCur] = useState(0)
  const [open, setOpen] = useState<number | null>(null)
  const [err, setErr] = useState<Record<number, boolean>>({})
  if (!cams.length) return null

  const onScroll = () => {
    const el = strip.current; if (!el) return
    const items = el.children, step = items[1] ? (items[1] as HTMLElement).offsetLeft - (items[0] as HTMLElement).offsetLeft : 1
    setCur(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 ? cams.length - 1 : Math.round(el.scrollLeft / step))
  }
  const go = (k: number) => {
    const el = strip.current; if (!el) return
    const items = el.children as HTMLCollectionOf<HTMLElement>, t = Math.max(0, Math.min(cams.length - 1, k))
    el.scrollTo({ left: items[t].offsetLeft - items[0].offsetLeft, behavior: "smooth" })
  }

  return (
    <Section title="Webcams" aside={cams.length > 1 ? `${cams.length} Kameras` : undefined}>
      <div className="group/cams relative">
        <div ref={strip} onScroll={onScroll}
          className="flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto overscroll-x-contain px-5 pt-5 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {cams.map((c, i) => (
            <button key={c.name + i} type="button" onClick={() => setOpen(i)} aria-label={`Webcam ${c.name} groß anzeigen`}
              className="grid w-[82%] shrink-0 snap-start gap-2 text-left">
              <span className="block aspect-video overflow-hidden rounded-xl bg-fill transition-transform duration-200 active:scale-[0.98]">
                {!err[i] && <img src={camSrc(c)} alt="" loading="lazy" decoding="async" className="size-full object-cover"
                  onError={() => setErr((e) => ({ ...e, [i]: true }))} />}
              </span>
              <span className="text-caption text-muted-foreground">{c.name}{err[i] && ", gerade nicht erreichbar"}</span>
            </button>
          ))}
        </div>
        {cams.length > 1 && (
          <>
            <StepButton dir={-1} hidden={cur === 0} onClick={() => go(cur - 1)} className="left-2 top-[calc(50%-34px)] hidden pointer-fine:grid" />
            <StepButton dir={1} hidden={cur === cams.length - 1} onClick={() => go(cur + 1)} className="right-2 top-[calc(50%-34px)] hidden pointer-fine:grid" />
            <div className="flex justify-center gap-1.5 pb-4" aria-hidden>
              {cams.map((_, i) => <i key={i} className={cn("h-1.5 rounded-full transition-all duration-200", i === cur ? "w-4 bg-primary" : "w-1.5 bg-border")} />)}
            </div>
          </>
        )}
      </div>
      <Note className="border-t">Die Bilder werden alle 10 Minuten neu geladen. Nachts sind die meisten Webcams dunkel.</Note>
      <Viewer r={r} start={open} onClose={() => setOpen(null)} />
    </Section>
  )
}

function StepButton({ dir, hidden, onClick, className }: { dir: 1 | -1; hidden?: boolean; onClick: () => void; className?: string }) {
  const I = dir < 0 ? ChevronLeft : ChevronRight
  return (
    <button type="button" onClick={onClick} hidden={hidden} aria-label={dir < 0 ? "Vorherige Webcam" : "Nächste Webcam"}
      className={cn("glass absolute z-10 size-11 place-items-center rounded-full text-foreground transition-transform active:scale-95", hidden && "!hidden", className)}>
      <I className="size-5" />
    </button>
  )
}

function Viewer({ r, start, onClose }: { r: Resort; start: number | null; onClose: () => void }) {
  const cams = r.webcams ?? []
  const strip = useRef<HTMLDivElement>(null)
  const [cur, setCur] = useState(0)
  const [bad, setBad] = useState<Record<number, boolean>>({})
  const open = start != null

  // Zurück-Geste schließt nur die große Ansicht
  useEffect(() => {
    if (!open) return
    history.pushState({ viewer: true }, "")
    const pop = () => onClose()
    window.addEventListener("popstate", pop)
    return () => {
      window.removeEventListener("popstate", pop)
      if (history.state?.viewer) history.back()
    }
  }, [open, onClose])

  const go = useCallback((k: number) => {
    const el = strip.current; if (!el) return
    el.scrollTo({ left: Math.max(0, Math.min(cams.length - 1, k)) * el.clientWidth, behavior: "smooth" })
  }, [cams.length])

  const ref = useCallback((el: HTMLDivElement | null) => {
    strip.current = el
    if (el && start != null) requestAnimationFrame(() => { el.scrollLeft = start * el.clientWidth; setCur(start) })
  }, [start])

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent showCloseButton={false}
        className="flex h-dvh flex-col gap-0 max-h-dvh w-screen max-w-none rounded-none border-0 bg-[#0b0d10] p-0 text-[#f2f4f7] ring-0 sm:max-w-none data-open:animate-in data-open:fade-in-0"
        onKeyDown={(e) => { if (e.key === "ArrowRight") go(cur + 1); if (e.key === "ArrowLeft") go(cur - 1) }}>
        <div className="flex items-center gap-3 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3 ">
          <DialogTitle className="font-heading text-headline font-semibold">{r.name}</DialogTitle>
          {cams.length > 1 && <span className="text-caption text-[#a7aeb8]" aria-live="polite">{cur + 1} von {cams.length}</span>}
          <DialogClose aria-label="Schließen"
            className="ml-auto grid size-11 place-items-center rounded-full bg-white/12 text-white transition-transform active:scale-95">
            <X className="size-5" />
          </DialogClose>
        </div>
        <div ref={ref} onScroll={(e) => setCur(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
          className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {cams.map((c, i) => (
            <figure key={c.name + i} inert={i !== cur} className="m-0 flex w-full shrink-0 snap-center flex-col items-center justify-center">
              {bad[i]
                ? <p className="px-6 text-center text-body text-[#a7aeb8]">Das Bild dieser Webcam ist gerade nicht erreichbar.</p>
                : <img src={camSrc(c, true)} alt={`Webcam ${c.name}`} decoding="async" className="max-h-[calc(100dvh-150px)] max-w-full object-contain"
                    onError={() => setBad((b) => ({ ...b, [i]: true }))} />}
              <figcaption className="flex items-center gap-3 px-4 pt-3 pb-5 text-caption text-[#c9d0d8]">
                {c.name}
                {c.link && <a href={c.link} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-[#7cc0f5]">Webcam-Seite <ExtIcon className="size-3.5" /></a>}
              </figcaption>
            </figure>
          ))}
        </div>
        {cams.length > 1 && (
          <>
            <StepButton dir={-1} hidden={cur === 0} onClick={() => go(cur - 1)} className="left-3 top-1/2 grid -translate-y-1/2 [--glass:rgb(28_30_34/0.6)] [--glass-solid:#1c1e22] [--glass-line:rgb(255_255_255/0.12)] text-white" />
            <StepButton dir={1} hidden={cur === cams.length - 1} onClick={() => go(cur + 1)} className="right-3 top-1/2 grid -translate-y-1/2 [--glass:rgb(28_30_34/0.6)] [--glass-solid:#1c1e22] [--glass-line:rgb(255_255_255/0.12)] text-white" />
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
