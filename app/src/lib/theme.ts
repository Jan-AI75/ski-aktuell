/* Darstellung: Automatisch (folgt dem System), Hell, Dunkel, Gletscher, Nachtsicht. */
import { useEffect, useState } from "react"

export type Palette = "auto" | "hell" | "dunkel" | "gletscher" | "nacht"
export const PALETTES: { id: Palette; name: string; swatch: string[] }[] = [
  { id: "auto", name: "Automatisch", swatch: ["#f3f5f8", "#0a66c2", "#181d24"] },
  { id: "hell", name: "Hell", swatch: ["#f3f5f8", "#ffffff", "#0a66c2"] },
  { id: "dunkel", name: "Dunkel", swatch: ["#0f1318", "#181d24", "#7cc0f5"] },
  { id: "gletscher", name: "Gletscher", swatch: ["#0c1620", "#7cc4ea", "#cfe9f8"] },
  { id: "nacht", name: "Nachtsicht (rot)", swatch: ["#070303", "#e8604f", "#ff8a7c"] },
]
const KEY = "ski-palette"
const migrate = (p: string | null): Palette => {
  const m: Record<string, Palette> = { graphit: "dunkel", schwarz: "dunkel" }
  const v = (p && (m[p] ?? p)) as Palette
  return PALETTES.some((x) => x.id === v) ? v : "auto"
}
const mq = () => window.matchMedia("(prefers-color-scheme: dark)")

function apply(p: Palette) {
  const html = document.documentElement
  const dark = p === "auto" ? mq().matches : p !== "hell"
  html.classList.toggle("dark", dark)
  if (p === "gletscher" || p === "nacht") html.dataset.palette = p
  else delete html.dataset.palette
  const meta = document.querySelector('meta[name="theme-color"]')
  meta?.setAttribute("content", getComputedStyle(html).getPropertyValue("--background").trim())
}

export function usePalette() {
  const [palette, setPalette] = useState<Palette>(() => {
    try { return migrate(localStorage.getItem(KEY)) } catch { return "auto" }
  })
  useEffect(() => {
    apply(palette)
    try { localStorage.setItem(KEY, palette) } catch { /* egal */ }
    if (palette !== "auto") return
    const m = mq(), on = () => apply("auto")
    m.addEventListener("change", on)
    return () => m.removeEventListener("change", on)
  }, [palette])
  return [palette, setPalette] as const
}
