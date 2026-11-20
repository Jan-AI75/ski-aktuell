/* Datenformate – identisch zu den JSON-Dateien von Ski aktuell (GitHub Pages) und Open-Meteo. */

export interface Point { name: string; lat: number; lon: number; elev: number }
export interface Webcam { name: string; bild: string; gross?: string; link?: string }
export interface Resort {
  id: string
  name: string
  kurz?: string
  region?: string
  aktiv?: boolean
  points: Point[]
  lawine?: string[]
  live?: string
  web?: string
  karte?: string
  saisonstart?: string
  webcams?: Webcam[]
  /** Quadratisches App-Symbol des Skigebiets (z. B. /pwa/apple-icon-180.png) */
  logo?: string
  /** Selbst hinzugefügt, nur auf diesem Gerät gespeichert */
  custom?: boolean
}

export interface Forecast {
  current: { time: string; temperature_2m: number; weather_code: number; wind_gusts_10m: number; snowfall?: number }
  hourly: {
    time: string[]
    temperature_2m: number[]
    snowfall: number[]
    snow_depth: (number | null)[]
    freezing_level_height: (number | null)[]
    weather_code: number[]
    wind_gusts_10m: number[]
    cloud_cover?: number[]
    sunshine_duration?: number[]
    visibility?: (number | null)[]
    precipitation?: number[]
  }
  daily: {
    time: string[]
    weather_code: number[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    snowfall_sum: number[]
    precipitation_sum?: number[]
    sunshine_duration: number[]
    wind_gusts_10m_max: number[]
    daylight_duration?: number[]
  }
}

export interface Rating { value: string; period?: string; elevation?: Elevation }
export interface Elevation { lowerBound?: string; upperBound?: string }
export interface Problem { type: string; aspects?: string[]; elevation?: Elevation }
export interface AvalancheRegion { name?: string; ratings: Rating[]; problems: Problem[]; tendency?: string[] }
export interface Avalanche { days?: Record<string, Record<string, AvalancheRegion>> }

export interface StatusItem { name: string; kind: "lift" | "piste" | "route"; type?: string; open: boolean | null; state?: string }
export interface ResortStatus {
  lifts?: { open: number; total: number }
  slopes?: { open: number; total: number; unit?: string }
  snow?: { valley?: number | null; mountain?: number | null; new?: number | null }
  condition?: string | null
  last_snowfall?: string | null
  valley_run?: string | null
  items?: StatusItem[]
  updated?: string
  reported?: string
}
export type Status = Record<string, ResortStatus>

export interface HistoryEntry { d: string; m?: number | null; mt?: number | null; b?: number | null; t?: number | null; n?: number | null }
export interface History { resorts?: Record<string, HistoryEntry[]>; updated?: string }

export interface SkiData {
  resorts: Resort[]
  /** Je Messpunkt in der Reihenfolge der aktiven Gebiete; eigene Gebiete können fehlen (null) */
  wx: (Forecast | null)[] | null
  wxLive: boolean
  law: Avalanche | null
  stat: Status | null
  hist: History | null
}
