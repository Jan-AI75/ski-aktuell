/* Laden wie bisher: Wetter live von Open-Meteo, sonst weather.json; dazu Lawine, Lifte, Saisonverlauf.
   Quelle der JSON-Dateien: dieselbe GitHub-Pages-Seite, die die Action alle 30 Minuten aktualisiert.
   Fällt eine Quelle aus, wird der letzte gespeicherte Stand gezeigt. */
import { useCallback, useEffect, useRef, useState } from "react"
import type { Avalanche, Forecast, History, Resort, SkiData, Status } from "./types"

/* Gebaute App: JSON liegt neben index.html („./“). Beim Entwickeln: .env.development zeigt auf GitHub Pages. */
export const DATA_BASE: string = import.meta.env.VITE_DATA_BASE ?? "./"

const HOURLY = "temperature_2m,snowfall,snow_depth,freezing_level_height,weather_code,wind_gusts_10m,cloud_cover,sunshine_duration,visibility,precipitation"
const DAILY = "weather_code,temperature_2m_max,temperature_2m_min,snowfall_sum,precipitation_sum,sunshine_duration,wind_gusts_10m_max,daylight_duration"
const CURRENT = "temperature_2m,weather_code,wind_gusts_10m,snowfall"

const load = <T,>(k: string): T | null => { try { return JSON.parse(localStorage.getItem(k) ?? "null") } catch { return null } }
const save = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* voll oder gesperrt */ } }

async function getJSON<T>(url: string, ms = 15000): Promise<T> {
  const ctrl = new AbortController(), to = setTimeout(() => ctrl.abort(), ms)
  try {
    const r = await fetch(url, { signal: ctrl.signal, cache: "no-store" })
    if (!r.ok) throw new Error("HTTP " + r.status)
    return (await r.json()) as T
  } finally { clearTimeout(to) }
}
const file = (name: string) => `${DATA_BASE}${name}?t=${Date.now()}`

function apiUrl(resorts: Resort[]) {
  const p = resorts.flatMap((r) => r.points), j = (k: "lat" | "lon" | "elev") => p.map((x) => x[k]).join(",")
  return `https://api.open-meteo.com/v1/forecast?latitude=${j("lat")}&longitude=${j("lon")}&elevation=${j("elev")}` +
    `&current=${CURRENT}&hourly=${HOURLY}&daily=${DAILY}&past_days=7&forecast_days=7&timezone=Europe%2FBerlin&wind_speed_unit=kmh`
}
const valid = (w: unknown, n: number): w is Forecast[] =>
  Array.isArray(w) && w.length === n && w.every((x) => x && x.current && x.hourly && x.daily)

export type LoadState = "loading" | "ready" | "error"

/* Eigene Gebiete: nur auf diesem Gerät, Wetter live von Open-Meteo (zuletzt geladener Stand als Rückfall). */
const CUSTOM = "ski-custom"
export const loadCustom = () => (load<Resort[]>(CUSTOM) ?? []).map((r) => ({ ...r, custom: true }))
const saveCustom = (list: Resort[]) => save(CUSTOM, list)

export function useSkiData() {
  const [data, setData] = useState<SkiData>(() => ({
    resorts: [...(load<Resort[]>("ski-resorts") ?? []), ...loadCustom()],
    wx: (() => {
      // Sofort mit dem zuletzt geladenen Stand starten, bis frische Daten da sind
      const b = load<Forecast[]>("ski-wx"); if (!b) return null
      const nc = loadCustom().flatMap((r) => r.points).length, c = load<Forecast[]>("ski-wx-custom") ?? []
      return [...b, ...(c.length === nc ? c : Array(nc).fill(null))]
    })(),
    wxLive: false,
    law: load<Avalanche>("ski-law"),
    stat: load<Status>("ski-stat"),
    hist: load<History>("ski-hist"),
  }))
  const [state, setState] = useState<LoadState>("loading")
  const busy = useRef(false)

  const refresh = useCallback(async () => {
    if (busy.current) return
    busy.current = true; setState("loading")
    let resorts: Resort[] = load<Resort[]>("ski-resorts") ?? []
    try { const cfg = await getJSON<{ resorts: Resort[] }>(file("resorts.json")); resorts = cfg.resorts ?? []; save("ski-resorts", resorts) } catch { /* gespeicherte Liste */ }
    const active = resorts.filter((r) => r.aktiv !== false), n = active.flatMap((r) => r.points).length
    const custom = loadCustom(), nc = custom.flatMap((r) => r.points).length
    const [w, l, st, hi, cw] = await Promise.allSettled([
      (async () => {
        try { let x = await getJSON<Forecast | Forecast[]>(apiUrl(active)); if (!Array.isArray(x)) x = [x]; if (valid(x, n)) return { x, live: true } } catch { /* weiter mit Rückfall */ }
        const f = await getJSON<Forecast[]>(file("weather.json")); if (valid(f, n)) return { x: f, live: false }
        throw new Error("kein Wetter")
      })(),
      getJSON<Avalanche>(file("lawine.json")),
      getJSON<Status>(file("status.json")),
      getJSON<History>(file("history.json")),
      nc ? getJSON<Forecast | Forecast[]>(apiUrl(custom)).then((x) => (Array.isArray(x) ? x : [x])) : Promise.resolve([] as Forecast[]),
    ])
    const next: SkiData = { resorts: [...resorts, ...custom], wx: null, wxLive: false, law: null, stat: null, hist: null }
    let base: Forecast[] | null = null
    if (w.status === "fulfilled") { base = w.value.x; next.wxLive = w.value.live; save("ski-wx", base) }
    else { const c = load<Forecast[]>("ski-wx"); base = valid(c, n) ? c : null }
    let mine: (Forecast | null)[] = []
    if (cw.status === "fulfilled" && valid(cw.value, nc)) { mine = cw.value; save("ski-wx-custom", mine) }
    else { const c = load<Forecast[]>("ski-wx-custom"); mine = valid(c, nc) ? c : Array(nc).fill(null) }
    next.wx = base ? [...base, ...mine] : null
    if (l.status === "fulfilled") { next.law = l.value; save("ski-law", l.value) } else next.law = load("ski-law")
    if (st.status === "fulfilled") { next.stat = st.value; save("ski-stat", st.value) } else next.stat = load("ski-stat")
    if (hi.status === "fulfilled") { next.hist = hi.value; save("ski-hist", hi.value) } else next.hist = load("ski-hist")
    setData(next)
    setState(next.wx ? "ready" : "error")
    busy.current = false
  }, [])

  useEffect(() => {
    void refresh()
    const id = setInterval(() => { if (document.visibilityState === "visible") void refresh() }, 15 * 60 * 1000)
    const vis = () => { if (document.visibilityState === "visible") void refresh() }
    document.addEventListener("visibilitychange", vis)
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", vis) }
  }, [refresh])

  const addResort = useCallback((r: Resort) => { saveCustom([...loadCustom(), { ...r, custom: true }]); void refresh() }, [refresh])
  const removeResort = useCallback((id: string) => {
    saveCustom(loadCustom().filter((r) => r.id !== id)); try { localStorage.removeItem("ski-wx-custom") } catch { /* egal */ }
    void refresh()
  }, [refresh])

  return { data, state, refresh, addResort, removeResort }
}

/** Kurze Statuszeile: Live oder gespeichert, Zeit der Wetterdaten. */
export function statusText(D: SkiData) {
  if (!D.wx) return "Keine Daten erreichbar"
  const wt = D.wx[0]?.current?.time
  if (!wt) return D.wxLive ? "Live" : "Gespeicherte Daten"
  const today = wt.slice(0, 10) === new Date().toLocaleDateString("sv-SE")
  const when = (today ? "" : `${Number(wt.slice(8, 10))}.${Number(wt.slice(5, 7))}., `) + wt.slice(11, 16) + " Uhr"
  return D.wxLive ? `Live, Wetter von ${when}` : `Gespeichert, Wetter von ${when}`
}
