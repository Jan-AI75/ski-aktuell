/* Fachlogik von Ski aktuell – unverändert aus der bisherigen App übernommen, nur typisiert. */
import type { AvalancheRegion, Elevation, Forecast, Resort, ResortStatus, SkiData } from "./types"

export const LEVEL: Record<string, number> = { low: 1, moderate: 2, considerable: 3, high: 4, very_high: 5 }
export const LEVEL_TXT = ["keine Einstufung", "gering", "mäßig", "erheblich", "groß", "sehr groß"]
export const PROBLEM: Record<string, string> = {
  new_snow: "Neuschnee", wind_slab: "Triebschnee", persistent_weak_layers: "Altschnee", wet_snow: "Nassschnee",
  gliding_snow: "Gleitschnee", cornices: "Wechten", favourable_situation: "Günstige Situation",
  no_distinct_avalanche_problem: "Kein ausgeprägtes Problem",
}
export const TEND: Record<string, string> = { increasing: "steigend", steady: "gleichbleibend", decreasing: "abnehmend" }
const PERIOD: Record<string, string> = { earlier: "vormittags", later: "nachmittags" }
export const ASPECTS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
export const ASP_DE: Record<string, string> = { N: "N", NE: "NO", E: "O", SE: "SO", S: "S", SW: "SW", W: "W", NW: "NW" }
export const WD = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"]
export const REGION_DE: Record<string, string> = {
  "AT-08-01": "Bregenzerwaldgebirge", "AT-08-02": "Allgäuer Alpen West", "AT-08-03-01": "Lechtaler Alpen Vorarlberg",
  "AT-08-03-02": "Lechquellengebirge", "AT-08-04": "Verwall West", "AT-08-05-01": "Rätikon Ost", "AT-08-05-02": "Rätikon West",
  "AT-08-06": "Silvretta West", "AT-08-07": "Voralpen",
}
export const LWD_URL = "https://warnung.vorarlberg.at/vtgdb/dist/index.html#//lwd_lagebericht.html"

/* ---------- Formatierung ---------- */
const ok = (v: number | null | undefined): v is number => v != null && isFinite(v)
export const fmt0 = (v?: number | null) => (ok(v) ? Math.round(v).toString() : "–")
export const fmtT = (v?: number | null) => (ok(v) ? (Math.round(v) === 0 ? "0" : Math.round(v).toString().replace("-", "−")) + "°" : "–")
export const cm = (v?: number | null) => (ok(v) ? (v > 0 && v < 1 ? "<1" : Math.round(v).toString()) : "–")
export const dayDate = (iso: string) => { const d = new Date(iso + "T12:00:00"); return `${d.getDate()}.${d.getMonth() + 1}.` }

export function wxText(c?: number | null): string {
  if (c == null) return "–"
  if (c === 0) return "Klar"; if (c === 1) return "Überwiegend klar"; if (c === 2) return "Teils bewölkt"; if (c === 3) return "Bedeckt"
  if (c === 45 || c === 48) return "Nebel"; if (c >= 51 && c <= 57) return "Nieselregen"
  if (c === 61) return "Leichter Regen"; if (c === 63) return "Regen"; if (c === 65) return "Starker Regen"; if (c === 66 || c === 67) return "Gefrierender Regen"
  if (c === 71) return "Leichter Schneefall"; if (c === 73) return "Schneefall"; if (c === 75) return "Starker Schnee"; if (c === 77) return "Schneegriesel"
  if (c >= 80 && c <= 82) return "Regenschauer"; if (c === 85) return "Schneeschauer"; if (c === 86) return "Kräftige Schneeschauer"
  if (c >= 95) return "Gewitter"
  return "–"
}

/* ---------- Messpunkte ---------- */
export const activeResorts = (D: SkiData) => D.resorts.filter((r) => r.aktiv !== false)
export const allPoints = (D: SkiData) => activeResorts(D).flatMap((r) => r.points)

export function pointData(D: SkiData, r: Resort, i: number): Forecast | null {
  if (!D.wx) return null
  let k = 0
  for (const x of activeResorts(D)) { if (x.id === r.id) return D.wx[k + i] || null; k += x.points.length }
  return null
}
export const topData = (D: SkiData, r: Resort) => pointData(D, r, r.points.length - 1)

function nowIdx(d: Forecast) {
  const key = d.current.time.slice(0, 13) + ":00", t = d.hourly.time
  let i = t.indexOf(key)
  if (i < 0) { i = 0; while (i + 1 < t.length && t[i + 1] <= d.current.time) i++ }
  return i
}
export function sumSnow(d: Forecast, from: number, to: number) {
  let s = 0; const a = d.hourly.snowfall
  for (let i = Math.max(0, from); i <= Math.min(a.length - 1, to); i++) s += a[i] || 0
  return s
}
export interface PointStats {
  i: number; di: number; temp: number; code: number; gust: number
  past24: number; past72: number; next24: number; next72: number
  depth: number | null; freezing: number | null
}
export function pointStats(d: Forecast | null): PointStats | null {
  if (!d || !d.current || !d.hourly) return null
  const i = nowIdx(d), h = d.hourly
  const di = d.daily.time.indexOf(d.current.time.slice(0, 10))
  const sd = h.snow_depth[i]
  return {
    i, di,
    temp: d.current.temperature_2m, code: d.current.weather_code, gust: d.current.wind_gusts_10m,
    past24: sumSnow(d, i - 23, i), past72: sumSnow(d, i - 71, i),
    next24: sumSnow(d, i + 1, i + 24), next72: sumSnow(d, i + 1, i + 72),
    depth: sd != null ? sd * 100 : null,
    freezing: h.freezing_level_height[i] ?? null,
  }
}
/** Schneefallgrenze ≈ Nullgradgrenze − 300 m, auf 50 m gerundet. */
export const snowline = (s: PointStats) => (s.freezing != null ? Math.round(Math.max(0, s.freezing - 300) / 50) * 50 : null)

/* ---------- Sonne, Tal, Wetterart ---------- */
export const sunHours = (d: Forecast | null, k: number) => { const v = d?.daily?.sunshine_duration?.[k]; return v == null ? null : v / 3600 }
export const daylightHours = (d: Forecast | null, k: number) => { const v = d?.daily?.daylight_duration?.[k]; return v == null ? null : v / 3600 }
export function inversion(D: SkiData, r: Resort, k: number) {
  const b = sunHours(topData(D, r), k), t = r.points.length > 1 ? sunHours(pointData(D, r, 0), k) : null
  return b != null && t != null && t < 1.5 && b >= 3 && b - t >= 2
}
export type Kind = "sun" | "partly" | "cloud" | "snow" | "rain" | "fog"
export const KIND_TXT: Record<Kind, string> = { sun: "sonnig", partly: "teils sonnig", cloud: "bewölkt", snow: "Schneefall", rain: "Regen", fog: "Nebel" }
export function hourKind(d: Forecast, i: number): Kind {
  const H = d.hourly, c = H.weather_code[i]
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return "snow"
  if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) return "rain"
  const vis = H.visibility?.[i]
  if (c === 45 || c === 48 || (vis != null && vis < 1000)) return "fog"
  const sun = H.sunshine_duration?.[i]
  if (sun != null) return sun >= 2160 ? "sun" : sun >= 720 ? "partly" : "cloud"
  const cc = H.cloud_cover?.[i] ?? 50
  return cc < 30 ? "sun" : cc < 70 ? "partly" : "cloud"
}
export function codeKind(c: number): Kind {
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return "snow"
  if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82) || c >= 95) return "rain"
  if (c === 45 || c === 48) return "fog"
  return c <= 1 ? "sun" : c === 2 ? "partly" : "cloud"
}

/* ---------- Lawine ---------- */
export const todayStr = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Vienna" })
export const tomorrowStr = () => new Date(Date.now() + 864e5).toLocaleDateString("sv-SE", { timeZone: "Europe/Vienna" })
export const maxLevel = (e: AvalancheRegion) => Math.max(0, ...e.ratings.map((x) => LEVEL[x.value] || 0))
export interface LawResult { lv: number; e: AvalancheRegion; id: string }
export function lawFor(D: SkiData, r: Resort, day: string): LawResult | null {
  if (!D.law?.days || !r.lawine?.length) return null
  const regions = D.law.days[day]; if (!regions) return null
  let best: LawResult | null = null
  for (const want of r.lawine) {
    for (const [id, e] of Object.entries(regions)) {
      if (id !== want && !id.startsWith(want + "-")) continue
      const lv = maxLevel(e)
      if (!best || lv > best.lv) best = { lv, e, id }
    }
  }
  return best
}
export function elevTxt(el?: Elevation) {
  if (!el) return ""
  if (el.lowerBound) return "über " + (el.lowerBound === "treeline" ? "der Waldgrenze" : el.lowerBound + " m")
  if (el.upperBound) return "unter " + (el.upperBound === "treeline" ? "der Waldgrenze" : el.upperBound + " m")
  return ""
}
export function ratingDetail(e: AvalancheRegion) {
  const rs = e.ratings.filter((x) => LEVEL[x.value])
  if (rs.length <= 1) return [] as string[]
  return rs.map((x) => [PERIOD[x.period ?? ""], elevTxt(x.elevation)].filter(Boolean).join(", ") + ": " + LEVEL[x.value] + " " + LEVEL_TXT[LEVEL[x.value]])
}

/* ---------- Betrieb ---------- */
export function seasonStart(r: Resort) {
  if (!r.saisonstart || todayStr() >= r.saisonstart) return null
  return dayDate(r.saisonstart)
}
export function reportAge(st?: ResortStatus | null) {
  const t = st?.reported; if (!t) return null
  const d = new Date(t); if (isNaN(+d)) return null
  return (Date.now() - d.getTime()) / 36e5 > 24 ? `Meldung vom ${d.getDate()}.${d.getMonth() + 1}.` : null
}
export const allClosed = (st?: ResortStatus | null) => !!(st?.lifts?.total && !st.lifts.open)
export interface OpState { on: boolean; txt: string; age?: string | null }
export function opState(D: SkiData, r: Resort): OpState | null {
  const st = D.stat?.[r.id], start = seasonStart(r)
  if (start && (!st || allClosed(st))) return { on: false, txt: "Saisonstart am " + start }
  if (!st?.lifts?.total) return null
  const age = reportAge(st)
  if (!st.lifts.open) return { on: false, txt: "Alle Lifte geschlossen", age }
  const sl = st.slopes?.total ? `, ${fmt0(st.slopes.open)} ${st.slopes.unit === "km" ? "km Pisten" : "Pisten"}` : ""
  return { on: true, txt: `${fmt0(st.lifts.open)} von ${fmt0(st.lifts.total)} Liften offen${sl}`, age }
}
export function liftLine(D: SkiData, r: Resort) {
  const st = D.stat?.[r.id], start = seasonStart(r)
  if (start && (!st || allClosed(st))) return "Saisonstart " + start
  return st?.lifts?.total ? `${fmt0(st.lifts.open)} von ${fmt0(st.lifts.total)} Liften offen` : r.region ?? ""
}
/** Schneehöhe Berg und Tal: Meldung des Skigebiets, wenn vorhanden, sonst Modell. */
export function depths(D: SkiData, r: Resort) {
  const st = D.stat?.[r.id]
  const rep = st?.snow && (st.snow.mountain ?? 0) > 0 ? st.snow : null
  const b = pointStats(topData(D, r)), t = r.points.length > 1 ? pointStats(pointData(D, r, 0)) : null
  if (rep) return { berg: rep.mountain ?? null, tal: rep.valley != null ? rep.valley : t ? t.depth : null, reported: true }
  return { berg: b ? b.depth : null, tal: t ? t.depth : null, reported: false }
}

/* ---------- Bester Skitag ----------
   Punkte je Tag (heute bis +6): frischer Schnee vom Vortag und der Nacht (bis 45), Sonnenstunden (bis 35),
   wenig Wind (bis 20, starke Böen kosten Punkte), Abzug für Dauerschneefall, große Kälte und Lawinenstufe ≥ 4.
   Nur Tage mit genug Schnee am Berg (Modell ≥ 30 cm oder offene Lifte) zählen. Markiert ab 50 Punkten. */
export function bestDay(D: SkiData, r: Resort) {
  const d = topData(D, r), s = pointStats(d)
  if (!d || !s || s.di < 1) return null
  const Dy = d.daily, H = d.hourly, liftsOpen = (D.stat?.[r.id]?.lifts?.open ?? 0) > 0
  let best: { k: number; p: number } | null = null
  for (let k = s.di; k < Math.min(Dy.time.length, s.di + 7); k++) {
    const hi = H.time.indexOf(Dy.time[k] + "T12:00"), depth = hi >= 0 ? (H.snow_depth[hi] || 0) * 100 : 0
    if (depth < 30 && !(k === s.di && liftsOpen)) continue
    const fresh = (Dy.snowfall_sum[k - 1] || 0) + 0.5 * (Dy.snowfall_sum[k] || 0)
    const sun = (Dy.sunshine_duration[k] || 0) / 3600, gust = Dy.wind_gusts_10m_max[k] || 0
    let p = (Math.min(fresh, 30) / 30) * 45 + (Math.min(sun, 8) / 8) * 35 + (gust < 40 ? 20 : gust < 60 ? 10 : gust < 80 ? -10 : -30)
    if ((Dy.snowfall_sum[k] || 0) > 15) p -= 10
    if ((Dy.temperature_2m_max[k] ?? 0) < -15) p -= 5
    const L = lawFor(D, r, Dy.time[k]); if (L && L.lv >= 4) p -= 15
    if (!best || p > best.p) best = { k, p }
  }
  if (!best || best.p < 50) return null
  const dt = new Date(Dy.time[best.k] + "T12:00:00")
  const label = best.k === s.di ? "heute" : best.k === s.di + 1 ? "morgen" : `${WD[dt.getDay()]} ${dt.getDate()}.${dt.getMonth() + 1}.`
  return { ...best, label }
}

/* ---------- Webcams ---------- */
export const camSrc = (c: { bild: string; gross?: string }, big = false) => {
  const u = (big && c.gross) || c.bild
  return u + (u.includes("?") ? "&" : "?") + "t=" + Math.floor(Date.now() / 6e5)
}
