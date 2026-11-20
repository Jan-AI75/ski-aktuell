/* Eigenes Skigebiet hinzufügen: Ort suchen (Open-Meteo-Ortssuche), Höhe der Bergstation angeben.
   Gespeichert wird nur auf diesem Gerät. */
import { useEffect, useState } from "react"
import { Loader2, MapPin, Plus, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Resort } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

interface Place { id: number; name: string; latitude: number; longitude: number; elevation?: number; admin1?: string; country?: string }

export function AddResortTile({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="group flex h-full min-h-56 w-full flex-col items-center justify-center gap-3 rounded-[22px] border-2 border-dashed border-border p-5 text-muted-foreground transition-colors duration-200 hover:border-primary/40 hover:bg-card/60 hover:text-primary">
      <span className="grid size-12 place-items-center rounded-full bg-accent text-primary transition-transform duration-200 group-active:scale-95">
        <Plus className="size-6" />
      </span>
      <span className="text-headline font-semibold">Skigebiet hinzufügen</span>
      <span className="max-w-56 text-center text-caption">Ort suchen, Höhe der Bergstation angeben. Wetter und Schnee wie bei den anderen.</span>
    </button>
  )
}

export function AddResortDialog({ open, onOpenChange, existing, onAdd }: {
  open: boolean; onOpenChange: (o: boolean) => void; existing: Resort[]; onAdd: (r: Resort) => void
}) {
  const [q, setQ] = useState("")
  const [places, setPlaces] = useState<Place[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [pick, setPick] = useState<Place | null>(null)
  const [name, setName] = useState("")
  const [top, setTop] = useState("")

  // Zurücksetzen beim Schließen
  const change = (o: boolean) => { if (!o) { setQ(""); setPlaces([]); setPick(null); setErr(null); setTop(""); setName("") } onOpenChange(o) }

  // Ortssuche, kurz verzögert während des Tippens
  useEffect(() => {
    if (pick || q.trim().length < 2) return
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      setBusy(true); setErr(null)
      try {
        const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q.trim())}&count=8&language=de&format=json`, { signal: ctrl.signal })
        const j = await r.json() as { results?: Place[] }
        setPlaces(j.results ?? [])
        if (!j.results?.length) setErr("Kein Ort gefunden. Versuche den Namen des Dorfs oder der Talstation.")
      } catch (e) {
        if ((e as Error).name !== "AbortError") setErr("Die Ortssuche ist gerade nicht erreichbar. Prüfe die Internetverbindung.")
      } finally { setBusy(false) }
    }, 300)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [q, pick])

  const tal = pick ? Math.round(pick.elevation ?? 0) : 0
  const topNum = Number(top)
  const topOk = pick != null && Number.isFinite(topNum) && topNum > tal + 100 && topNum < 4000
  const id = "eigen-" + (name || pick?.name || "").toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  const dup = existing.some((r) => r.id === id)

  const submit = (e: React.FormEvent) => {
    e.preventDefault(); if (!pick || !topOk || dup) return
    const label = name.trim() || pick.name
    onAdd({
      id, name: label, kurz: label.split(/[\s-]/)[0], region: [pick.admin1, pick.country].filter(Boolean).join(", "), custom: true,
      points: [
        { name: pick.name, lat: pick.latitude, lon: pick.longitude, elev: tal },
        { name: "Berg", lat: pick.latitude, lon: pick.longitude, elev: Math.round(topNum) },
      ],
    })
    change(false)
  }

  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogContent className="glass gap-5 rounded-[22px] p-6 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-title font-semibold tracking-[-0.02em]">Skigebiet hinzufügen</DialogTitle>
          <DialogDescription className="text-caption">
            Wetter, Neuschnee und Schneehöhe kommen aus dem Modell von Open-Meteo. Lifte, Lawinenlage und Webcams gibt es für eigene Gebiete nicht.
            Das Gebiet wird nur auf diesem Gerät gespeichert.
          </DialogDescription>
        </DialogHeader>

        {!pick ? (
          <div className="grid gap-3">
            <label className="grid gap-1.5 text-caption font-medium">
              Ort der Talstation
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="z. B. Lech, Ischgl, Oberstdorf"
                  className="h-11 rounded-xl bg-card pl-9 text-body" />
                {busy && <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
              </div>
            </label>
            {err && <p className="text-caption text-muted-foreground">{err}</p>}
            {places.length > 0 && (
              <ul className="surface max-h-64 overflow-y-auto p-1">
                {places.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => { setPick(p); setName(p.name); setTop(String(Math.round((p.elevation ?? 1000) + 800))) }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-accent focus-visible:bg-accent">
                      <MapPin className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{p.name}</span>
                        <span className="block truncate text-caption text-muted-foreground">{[p.admin1, p.country].filter(Boolean).join(", ")}</span>
                      </span>
                      {p.elevation != null && <span className="text-caption text-muted-foreground">{Math.round(p.elevation)} m</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <form onSubmit={submit} className="grid gap-4">
            <div className="flex items-center gap-3 rounded-xl bg-fill px-3 py-2.5">
              <MapPin className="size-4 text-primary" />
              <span className="min-w-0 flex-1 truncate">
                <b className="font-medium">{pick.name}</b>
                <span className="text-caption text-muted-foreground"> Talstation {tal} m</span>
              </span>
              <button type="button" onClick={() => setPick(null)} className="text-caption font-semibold text-primary">Ändern</button>
            </div>
            <label className="grid gap-1.5 text-caption font-medium">
              Name in der App
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-xl bg-card text-body" maxLength={32} />
            </label>
            <label className="grid gap-1.5 text-caption font-medium">
              Höhe der Bergstation in Metern
              <Input inputMode="numeric" value={top} onChange={(e) => setTop(e.target.value.replace(/\D/g, ""))}
                aria-invalid={top !== "" && !topOk} className={cn("h-11 rounded-xl bg-card text-body")} />
              <span className={cn("font-normal", top !== "" && !topOk ? "text-destructive" : "text-muted-foreground")}>
                {top !== "" && !topOk ? `Gib eine Höhe zwischen ${tal + 100} und 4000 m an.` : "Steht auf der Website oder dem Pistenplan des Skigebiets."}
              </span>
            </label>
            {dup && <p className="text-caption text-destructive">Ein Gebiet mit diesem Namen gibt es schon. Wähle einen anderen Namen.</p>}
            <Button type="submit" disabled={!topOk || dup} className="h-11 rounded-full text-body">Hinzufügen</Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
