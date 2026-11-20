/* Detailseite eines Skigebiets – alle Abschnitte der bisherigen App, in derselben Reihenfolge. */
import { useState } from "react"
import { ChevronRight, Hand, Maximize2, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Resort, SkiData } from "@/lib/types"
import {
  ASP_DE, ASPECTS, LEVEL_TXT, LWD_URL, PROBLEM, REGION_DE, TEND, WD,
  allClosed, bestDay, cm, codeKind, dayDate, daylightHours, depths, elevTxt, fmt0, fmtT, hourKind, inversion,
  lawFor, opState, pointData, pointStats, ratingDetail, reportAge, seasonStart, snowline, sumSnow, sunHours, todayStr,
  tomorrowStr, topData, wxText, KIND_TXT,
} from "@/lib/model"
import { AltitudeProfile } from "./AltitudeProfile"
import { AvalancheBadge, ExternalLink, Metric, Note, Section, WeatherIcon } from "./bits"
import { Webcams } from "./Webcams"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export function ResortView({ D, r, onRemove }: { D: SkiData; r: Resort; onRemove: () => void }) {
  const d = topData(D, r), s = pointStats(d)
  if (!d || !s) return (
    <div className="grid gap-6">
      <div className="surface grid justify-items-center gap-2 px-6 py-12 text-center">
        <div className="text-headline font-semibold">Für {r.name} sind gerade keine Wetterdaten erreichbar</div>
        <p className="max-w-sm text-caption text-muted-foreground">Eigene Gebiete laden ihr Wetter direkt von Open-Meteo. Prüfe die Internetverbindung und lade neu.</p>
      </div>
      {r.custom && <RemoveResort r={r} onRemove={onRemove} />}
    </div>
  )
  return (
    <div className="grid gap-7 lg:block lg:columns-2 lg:gap-7 [&>*]:lg:mb-7">
      <Hero D={D} r={r} />
      <DayCourse D={D} r={r} />
      <AvalancheSection D={D} r={r} />
      <NowByAltitude D={D} r={r} />
      <Webcams r={r} />
      <SevenDays D={D} r={r} />
      <SnowChart D={D} r={r} />
      <Lifts D={D} r={r} />
      <PisteMap r={r} />
      {!r.custom && <Season D={D} r={r} />}
      {r.custom && <RemoveResort r={r} onRemove={onRemove} />}
    </div>
  )
}

/* Eigenes Gebiet entfernen – mit Rückfrage */
function RemoveResort({ r, onRemove }: { r: Resort; onRemove: () => void }) {
  const [ask, setAsk] = useState(false)
  return (
    <div className="break-inside-avoid px-1 lg:[column-span:all]">
      <button type="button" onClick={() => setAsk(true)}
        className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-caption font-semibold text-destructive hover:bg-destructive/10">
        <Trash2 className="size-4" />{r.name} entfernen
      </button>
      <Dialog open={ask} onOpenChange={setAsk}>
        <DialogContent className="glass rounded-[22px] p-6 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading text-title font-semibold">{r.name} entfernen?</DialogTitle>
            <DialogDescription className="text-caption">Das Gebiet verschwindet von diesem Gerät. Du kannst es jederzeit neu hinzufügen.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <DialogClose render={<Button variant="secondary" className="h-11 rounded-full px-5" />}>Behalten</DialogClose>
            <Button variant="destructive" className="h-11 rounded-full px-5" onClick={() => { setAsk(false); onRemove() }}>Entfernen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ---------- Kopf: Schneehöhe groß, Höhenprofil, Neuschnee und Prognose ---------- */
function Hero({ D, r }: { D: SkiData; r: Resort }) {
  const d = topData(D, r)!, s = pointStats(d)!, P = r.points[r.points.length - 1]
  const dp = depths(D, r), op = opState(D, r), sl = snowline(s), sun = sunHours(d, s.di)
  const T = r.points.length > 1 ? r.points[0] : null
  const stats = r.points.map((_, i) => pointStats(pointData(D, r, i)))
  return (
    <section className="surface break-inside-avoid p-5 sm:p-7 lg:[column-span:all]" aria-label={`${r.name}: Schneelage`}>
      {op && (
        <p className="mb-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-body font-medium">
          <span className={cn("size-2 rounded-full", op.on ? "bg-up shadow-[0_0_0_3px_color-mix(in_srgb,var(--up)_22%,transparent)]" : "bg-muted-foreground")} />
          {op.txt}
          {op.age && <span className="text-caption font-normal text-warm">{op.age}</span>}
        </p>
      )}
      <div className="grid items-end gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-10">
        <div className="grid gap-5">
          <div className="flex items-end gap-6 sm:gap-8">
            <div>
              <div className="text-caption text-muted-foreground">Schneehöhe am Berg</div>
              <div className="font-heading text-display font-bold tracking-[-0.05em] text-snow tabular-nums sm:text-[5rem]">
                {cm(dp.berg)}<span className="ml-1.5 text-title font-semibold tracking-normal text-muted-foreground">cm</span>
              </div>
            </div>
            {T && (
              <div className="pb-1.5">
                <div className="text-caption text-muted-foreground">Im Tal</div>
                <div className="font-heading text-large font-semibold tracking-[-0.03em] tabular-nums">
                  {cm(dp.tal)}<span className="ml-1 text-body font-medium tracking-normal text-muted-foreground">cm</span>
                </div>
              </div>
            )}
          </div>
          <p className="text-caption text-muted-foreground">
            {dp.reported ? "Gemeldet vom Skigebiet." : "Modellwert, das Skigebiet meldet noch nicht."}{" "}
            {P.elev} m{T ? ` und ${T.elev} m (${T.name})` : ""}.
          </p>
          <div className="grid grid-cols-2 gap-4 border-t pt-5">
            <Metric label="Neuschnee 24 h" value={cm(s.past24)} unit="cm" note={`72 h: ${cm(s.past72)} cm`} />
            <Metric label="Nächste 3 Tage" value={`+${cm(s.next72)}`} unit="cm" note={`morgen +${cm(s.next24)} cm`} />
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-caption font-semibold text-accent-foreground">
              <WeatherIcon kind={codeKind(s.code)} className="size-4" />
              {fmtT(s.temp)} {wxText(s.code)}{sun != null && `, heute ${Math.round(sun)} h Sonne`}
            </span>
          </div>
        </div>
        <div className="-mx-2 sm:mx-0">
          <AltitudeProfile points={r.points} stats={stats} snowline={sl} />
        </div>
      </div>
    </section>
  )
}

/* ---------- Heute / morgen am Berg ---------- */
function DayCourse({ D, r }: { D: SkiData; r: Resort }) {
  const d = topData(D, r)!, s = pointStats(d)!
  if (!d.hourly.sunshine_duration && !d.hourly.cloud_cover) return null
  const tomorrow = Number(d.current.time.slice(11, 13)) >= 15
  const k = s.di + (tomorrow ? 1 : 0); if (k < 0 || k >= d.daily.time.length) return null
  const date = d.daily.time[k], P = r.points[r.points.length - 1]
  const idx = (hh: number) => d.hourly.time.indexOf(`${date}T${String(hh).padStart(2, "0")}:00`)
  const sun = sunHours(d, k), day = daylightHours(d, k)
  let fog = false
  if (d.hourly.visibility) for (const hh of [9, 10, 11, 12, 13, 14, 15]) { const v = d.hourly.visibility[idx(hh)]; if (v != null && v < 1000) fog = true }
  return (
    <Section title={tomorrow ? "Morgen am Berg" : "Heute am Berg"} aside={`${P.name}, ${P.elev} m`}>
      <ol className="grid grid-cols-5 px-2 pt-4 pb-3">
        {[8, 10, 12, 14, 16].map((hh) => {
          const i = idx(hh); if (i < 0) return <li key={hh} />
          const kind = hourKind(d, i), sn = sumSnow(d, i - 1, i)
          return (
            <li key={hh} className="grid justify-items-center gap-1.5 text-center" title={KIND_TXT[kind]}>
              <span className="text-caption text-muted-foreground">{hh} Uhr</span>
              <WeatherIcon kind={kind} label />
              <span className="text-headline font-semibold">{fmtT(d.hourly.temperature_2m[i])}</span>
              <span className="text-[0.75rem] leading-tight text-muted-foreground">{sn >= 0.5 ? `+${Math.max(1, Math.round(sn))} cm` : KIND_TXT[kind]}</span>
            </li>
          )
        })}
      </ol>
      <Note className="border-t">
        {sun != null && <><b className="font-semibold text-warm">{Math.round(sun)} h Sonne</b>{day ? ` von ${Math.round(day)} h Tageslicht.` : "."}</>}
        {fog && " Zeitweise Nebel, Sicht unter 1 km."}
        {inversion(D, r, k) && " Im Tal trüb, am Berg sonnig (Hochnebel)."}
      </Note>
    </Section>
  )
}

/* ---------- Lawinenlage ---------- */
function AvalancheSection({ D, r }: { D: SkiData; r: Resort }) {
  const L = lawFor(D, r, todayStr())
  if (r.custom) return null
  const empty = !r.lawine?.length ? "Für dieses Gebiet ist keine Lawinenwarnregion hinterlegt."
    : !L ? "Noch kein Lagebericht für heute. Der Lawinenwarndienst veröffentlicht ihn in der Wintersaison täglich." : null
  return (
    <Section title="Lawinenlage" aside="LWD Vorarlberg">
      {empty || !L ? <Note>{empty}</Note> : (() => {
        const det = ratingDetail(L.e), T = lawFor(D, r, tomorrowStr())
        const probs = L.e.problems.filter((p) => PROBLEM[p.type])
        const tend = L.e.tendency?.[0] ? `Tendenz ${TEND[L.e.tendency[0]]}.` : ""
        return (
          <>
            <div className="flex items-center gap-4 px-5 pt-5 pb-4">
              <AvalancheBadge level={L.lv} size="lg" />
              <div className="min-w-0">
                <div className="text-headline font-semibold">Stufe {L.lv}, {LEVEL_TXT[L.lv]}</div>
                <div className="text-caption text-muted-foreground">{det.length ? det.join("; ") : REGION_DE[L.id] || L.e.name || L.id}</div>
              </div>
            </div>
            {probs.length > 0 && (
              <ul className="flex flex-wrap gap-2 px-5 pb-4">
                {probs.map((p) => {
                  const asp = (p.aspects ?? []).slice().sort((a, b) => ASPECTS.indexOf(a) - ASPECTS.indexOf(b)).map((a) => ASP_DE[a] || a).join(" ")
                  const extra = [elevTxt(p.elevation), asp].filter(Boolean).join(", ")
                  return (
                    <li key={p.type} className="rounded-full bg-fill px-3 py-1 text-caption">
                      {PROBLEM[p.type]}{extra && <span className="ml-1.5 text-muted-foreground">{extra}</span>}
                    </li>
                  )
                })}
              </ul>
            )}
            <Note className="border-t">
              {T ? `Morgen Stufe ${T.lv}, ${LEVEL_TXT[T.lv]}. ` : tend && tend + " "}
              <a className="font-semibold text-primary underline-offset-2 hover:underline" href={LWD_URL} target="_blank" rel="noopener">Ganzen Lagebericht lesen</a>
            </Note>
          </>
        )
      })()}
    </Section>
  )
}

/* ---------- Jetzt nach Höhe ---------- */
function NowByAltitude({ D, r }: { D: SkiData; r: Resort }) {
  return (
    <Section title="Jetzt nach Höhe">
      <ul className="hairline">
        {r.points.map((p, i) => {
          const q = pointStats(pointData(D, r, i)); if (!q) return null
          return (
            <li key={p.name} className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-x-4 px-5 py-3">
              <WeatherIcon kind={codeKind(q.code)} className="size-5" />
              <div className="min-w-0">
                <div className="font-medium">{p.name}</div>
                <div className="truncate text-caption text-muted-foreground">{p.elev} m, {wxText(q.code)}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{fmtT(q.temp)}</div>
                <div className="text-[0.75rem] text-muted-foreground">Böen {fmt0(q.gust)} km/h</div>
              </div>
              <div className="w-14 text-right">
                <div className="font-semibold">{cm(q.depth)} cm</div>
                <div className="text-[0.75rem] text-muted-foreground">Schnee</div>
              </div>
            </li>
          )
        })}
      </ul>
    </Section>
  )
}

/* ---------- 7 Tage ---------- */
function SevenDays({ D, r }: { D: SkiData; r: Resort }) {
  const d = topData(D, r)!, s = pointStats(d)!, Dy = d.daily, tal = r.points.length > 1 ? pointData(D, r, 0) : null, B = bestDay(D, r)
  const rows = []
  for (let k = Math.max(0, s.di); k < Dy.time.length && k < s.di + 7; k++) rows.push(k)
  return (
    <Section title="7 Tage" aside="am Berg, darunter im Tal">
      <ul className="hairline">
        {rows.map((k) => {
          const dt = new Date(Dy.time[k] + "T12:00:00")
          const name = k === s.di ? "Heute" : k === s.di + 1 ? "Morgen" : WD[dt.getDay()]
          const sn = Dy.snowfall_sum[k], sunH = sunHours(d, k), day = daylightHours(d, k)
          const pct = sunH != null && day ? Math.min(100, Math.round((sunH / day) * 100)) : null
          let talTxt = ""
          if (tal) {
            const tsn = tal.daily.snowfall_sum[k] || 0, tpr = tal.daily.precipitation_sum?.[k] || 0
            talTxt = tsn >= 0.5 ? `+${Math.max(1, Math.round(tsn))}` : tpr >= 1 ? "Regen" : "–"
          }
          const best = B?.k === k
          return (
            <li key={k} className={cn("grid grid-cols-[3.6rem_auto_minmax(0,1fr)_auto_auto] items-center gap-x-3 px-5 py-3",
              k === s.di && "bg-accent/40", best && "shadow-[inset_3px_0_0_var(--primary)]")}>
              <div>
                <div className="font-semibold">{name}</div>
                <div className="text-[0.75rem] text-muted-foreground">{dayDate(Dy.time[k])}</div>
                {best && <div className="text-[0.6875rem] font-semibold leading-tight text-primary">Bester Tag</div>}
              </div>
              <WeatherIcon kind={codeKind(Dy.weather_code[k])} className="size-5" />
              <div className="min-w-0">
                <div className="text-caption leading-tight [hyphens:auto]">{wxText(Dy.weather_code[k])}</div>
                {pct != null && (
                  <div className="mt-1 flex items-center gap-2 text-[0.75rem] text-muted-foreground" title={`${pct} % der hellen Zeit sonnig`}>
                    <span className="h-1.5 w-10 overflow-hidden rounded-full bg-fill"><span className="block h-full rounded-full bg-warm" style={{ width: `${pct}%` }} /></span>
                    <span className="whitespace-nowrap">{Math.round(sunH!)} h</span>
                  </div>
                )}
              </div>
              <div className="min-w-10 text-right">
                <div className={cn("font-semibold", sn >= 0.5 ? "text-snow" : "text-muted-foreground/60")}>{sn >= 0.5 ? `+${Math.max(1, Math.round(sn))}` : "0"}</div>
                {talTxt && <div className="text-[0.75rem] text-muted-foreground">{talTxt}</div>}
              </div>
              <div className="text-right text-caption whitespace-nowrap">
                <div>{fmtT(Dy.temperature_2m_min[k])} / {fmtT(Dy.temperature_2m_max[k])}</div>
                {tal && <div className="text-[0.75rem] text-muted-foreground">Tal {fmtT(tal.daily.temperature_2m_max[k])}</div>}
              </div>
            </li>
          )
        })}
      </ul>
      <Note className="border-t">
        Neuschnee in cm, Temperatur min / max am Berg, darunter Neuschnee und Höchstwert im Tal. Der orange Balken zeigt die Sonnenstunden.
        {B && " Bester Tag: frischer Schnee, viel Sonne, wenig Wind."}
      </Note>
    </Section>
  )
}

/* ---------- Schneefall-Diagramm ---------- */
function SnowChart({ D, r }: { D: SkiData; r: Resort }) {
  const d = topData(D, r)!, s = pointStats(d)!, Dy = d.daily
  const from = Math.max(0, s.di - 7), vals = Dy.snowfall_sum.slice(from), n = vals.length
  const W = 340, H = 150, padB = 26, padT = 18, max = Math.max(10, ...vals.map((v) => v || 0)), bw = W / n
  const Y = (v: number) => H - padB - (v / max) * (H - padB - padT)
  return (
    <Section title="Schneefall" aside="cm pro Tag am Berg">
      <div className="px-4 pt-4 pb-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Neuschnee pro Tag, letzte und nächste Woche">
          <line x1="0" x2={W} y1={H - padB} y2={H - padB} stroke="var(--border)" />
          {vals.map((v, j) => {
            const k = from + j, x = j * bw + bw * 0.2, w = bw * 0.6, past = k < s.di, today = k === s.di
            const y = Y(v || 0), hh = H - padB - y, dt = new Date(Dy.time[k] + "T12:00:00")
            return (
              <g key={k}>
                {hh > 0 && <rect x={x} y={y} width={w} height={hh} rx="3" fill={past ? "var(--muted-foreground)" : "var(--snow)"} opacity={past ? 0.35 : today ? 1 : 0.75} />}
                {v >= 1 && <text x={x + w / 2} y={y - 5} textAnchor="middle" className="fill-foreground text-[10px] font-medium">{Math.round(v)}</text>}
                <text x={x + w / 2} y={H - 9} textAnchor="middle" className={cn("text-[10px]", today ? "fill-primary font-semibold" : "fill-muted-foreground")}>{WD[dt.getDay()]}</text>
                {today && <circle cx={x + w / 2} cy={H - 2} r="2" fill="var(--primary)" />}
              </g>
            )
          })}
        </svg>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 px-5 pb-4 text-caption text-muted-foreground">
        <span className="inline-flex items-center gap-2"><i className="size-2.5 rounded-sm bg-muted-foreground/35" />letzte 7 Tage</span>
        <span className="inline-flex items-center gap-2"><i className="size-2.5 rounded-sm bg-snow/75" />Vorhersage</span>
        <span className="inline-flex items-center gap-2"><i className="size-1.5 rounded-full bg-primary" />heute</span>
      </div>
    </Section>
  )
}

/* ---------- Lifte & Pisten ---------- */
function Lifts({ D, r }: { D: SkiData; r: Resort }) {
  if (r.custom) return null
  const st = D.stat?.[r.id], link = r.live || r.web
  const when = st?.updated ? new Date(st.updated).toLocaleString("de-DE", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" }) : ""
  const age = reportAge(st)
  const linkRow = link && <div className="px-5 pb-5"><ExternalLink href={link}>Live-Info des Skigebiets</ExternalLink></div>
  if (!st) return <Section title="Lifte und Pisten"><Note>Das Skigebiet hat noch keine Daten geliefert.</Note>{linkRow}</Section>
  if (allClosed(st)) {
    const start = seasonStart(r)
    return (
      <Section title="Lifte und Pisten" aside={age || when}>
        <div className="px-5 pt-5 pb-4">
          <div className="text-headline font-semibold">{start ? `Saisonstart am ${start}` : "Zurzeit sind alle Lifte geschlossen."}</div>
          <p className="mt-1 text-caption text-muted-foreground">
            {fmt0(st.lifts!.total)} Lifte{st.slopes?.total ? ` und ${fmt0(st.slopes.total)} ${st.slopes.unit ?? ""} Pisten` : ""}.
            Sobald die ersten Anlagen laufen, stehen hier ihr Status und die gemeldete Schneehöhe.
          </p>
        </div>
        {linkRow}
      </Section>
    )
  }
  const sn = st.snow ?? {}
  return (
    <Section title="Lifte und Pisten" aside={<span className={cn(age && "text-warm")}>{age || when}</span>}>
      <div className="grid grid-cols-2 gap-4 px-5 pt-5 pb-4">
        {st.lifts && <Metric label="Lifte offen" value={`${fmt0(st.lifts.open)}`} unit={`/ ${fmt0(st.lifts.total)}`} />}
        {st.slopes && <Metric label="Pisten offen" value={fmt0(st.slopes.open)} unit={`/ ${fmt0(st.slopes.total)} ${st.slopes.unit ?? ""}`} />}
      </div>
      {(sn.mountain != null || sn.valley != null || st.valley_run) && (
        <Note className="border-t">
          {sn.mountain != null && `Gemeldet: Berg ${cm(sn.mountain)} cm, Tal ${cm(sn.valley)} cm. `}
          {st.condition && `${st.condition}. `}
          {st.last_snowfall && `Letzter Schneefall: ${st.last_snowfall}. `}
          {st.valley_run && `Talabfahrt: ${st.valley_run}.`}
        </Note>
      )}
      {([["lift", "Lifte"], ["piste", "Pisten"], ["route", "Skirouten"]] as const).map(([kind, title]) => {
        const its = (st.items ?? []).filter((i) => i.kind === kind); if (!its.length) return null
        const open = its.filter((i) => i.open === true).length, known = its.some((i) => i.open != null)
        return (
          <details key={kind} className="group border-t">
            <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-5 font-medium [&::-webkit-details-marker]:hidden">
              <ChevronRight className="size-4 text-muted-foreground transition-transform duration-200 group-open:rotate-90" />
              {title}
              <span className="ml-auto text-caption font-normal text-muted-foreground">{known ? `${open} von ${its.length} offen` : its.length}</span>
            </summary>
            <Table>
              <TableBody>
                {its.slice().sort((a, b) => Number(b.open === true) - Number(a.open === true)).map((it) => (
                  <TableRow key={it.name} className="hover:bg-transparent">
                    <TableCell className="py-2 pl-5 whitespace-normal">{it.name}{it.type && <span className="ml-2 text-[0.75rem] text-muted-foreground">{it.type}</span>}</TableCell>
                    <TableCell className={cn("py-2 pr-5 text-right text-caption font-semibold", it.open ? "text-up" : "text-muted-foreground")}>
                      {it.open === true ? "offen" : it.open === false ? (it.state && !/^geschlossen$/i.test(it.state) ? it.state : "zu") : "–"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </details>
        )
      })}
      <div className="border-t pt-4">{linkRow}</div>
    </Section>
  )
}

/* ---------- Pistenplan ---------- */
function PisteMap({ r }: { r: Resort }) {
  const [active, setActive] = useState(false)
  if (!r.karte) return null
  return (
    <Section title="Pistenplan" aside="interaktiv, Intermaps">
      <div className="relative h-[clamp(280px,78vw,440px)] bg-fill">
        <iframe src={r.karte} title={`Pistenplan ${r.name}`} loading="lazy" referrerPolicy="no-referrer"
          className={cn("absolute inset-0 size-full border-0", !active && "pointer-events-none")} />
        {!active && (
          <button type="button" onClick={() => setActive(true)}
            className="glass absolute inset-x-0 bottom-12 mx-auto flex w-max items-center gap-2 rounded-full px-4 py-2.5 text-caption font-semibold transition-transform active:scale-95">
            <Hand className="size-4" /> Karte bewegen
          </button>
        )}
      </div>
      <div className="p-4"><ExternalLink href={r.karte}><Maximize2 className="mr-2 size-4" />Im Vollbild öffnen</ExternalLink></div>
    </Section>
  )
}

/* ---------- Saisonverlauf ---------- */
function Season({ D, r }: { D: SkiData; r: Resort }) {
  const all = D.hist?.resorts?.[r.id] ?? []
  // Saison ab 1. Oktober, bezogen auf den jüngsten Eintrag
  const lastD = all.length ? all[all.length - 1].d : "", y = Number(lastD.slice(0, 4)), yr = Number(lastD.slice(5, 7)) >= 9 ? y : y - 1
  const pts = all.filter((e) => e.d >= `${yr}-10-01`)
  if (pts.length < 2) return <Section title="Saisonverlauf"><Note>Der Verlauf füllt sich ab jetzt täglich.</Note></Section>
  const repB = pts.some((e) => (e.b ?? 0) > 0), repT = pts.some((e) => (e.t ?? 0) > 0), hasT = pts.some((e) => e.mt != null || (e.t ?? 0) > 0)
  type Key = "b" | "m" | "t" | "mt"
  const series: { name: string; key: Key; rep: boolean; col: string }[] = [{ name: "Berg", key: repB ? "b" : "m", rep: repB, col: "var(--snow)" }]
  if (hasT) series.push({ name: "Tal", key: repT ? "t" : "mt", rep: repT, col: "var(--muted-foreground)" })
  const W = 340, H = 150, pl = 30, pr = 8, pt = 10, pb = 22
  const t0 = Date.parse(pts[0].d), t1 = Date.parse(pts[pts.length - 1].d), span = Math.max(t1 - t0, 864e5 * 6)
  const vals = pts.flatMap((e) => series.map((sr) => e[sr.key]).filter((v): v is number => v != null))
  const max = Math.max(50, Math.ceil(Math.max(0, ...vals) / 50) * 50)
  const X = (d: string) => pl + ((Date.parse(d) - t0) / span) * (W - pl - pr), Y = (v: number) => H - pb - (v / max) * (H - pt - pb)
  const line = (key: Key) => { let p = "", pen = false; for (const e of pts) { const v = e[key]; if (v == null) { pen = false; continue } p += (pen ? "L" : "M") + X(e.d).toFixed(1) + " " + Y(v).toFixed(1); pen = true } return p }
  const months = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"]
  const ticks: Date[] = []
  for (let m = new Date(t0); m <= new Date(t0 + span); m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) {
    const first = new Date(m.getFullYear(), m.getMonth(), 1); ticks.push(first.getTime() < t0 ? new Date(t0) : first)
  }
  const last = pts[pts.length - 1]
  return (
    <Section title="Saisonverlauf" aside="Schneehöhe Berg und Tal">
      <div className="px-4 pt-4 pb-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Schneehöhe am Berg und im Tal in dieser Saison">
          {[0, max / 2, max].map((v) => (
            <g key={v}><line x1={pl} x2={W - pr} y1={Y(v)} y2={Y(v)} stroke="var(--border)" />
              <text x={pl - 6} y={Y(v) + 3} textAnchor="end" className="fill-muted-foreground text-[10px]">{v}</text></g>
          ))}
          {series.map((sr) => <path key={sr.key} d={line(sr.key)} fill="none" stroke={sr.col} strokeWidth={sr.rep ? 2 : 1.6} strokeDasharray={sr.rep ? undefined : "4 3"} />)}
          {ticks.map((d) => <text key={+d} x={Math.min(X(d.toLocaleDateString("sv-SE")), W - pr - 12)} y={H - 6} className="fill-muted-foreground text-[10px]">{months[d.getMonth()]}</text>)}
        </svg>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 px-5 pb-4 text-caption text-muted-foreground">
        {series.map((sr) => (
          <span key={sr.key} className="inline-flex items-center gap-2">
            <i className="w-4 border-t-2" style={{ borderColor: sr.col, borderTopStyle: sr.rep ? "solid" : "dashed" }} />{sr.name} {cm(last[sr.key])} cm
          </span>
        ))}
        <span>{series.every((x) => x.rep) ? "laut Skigebiet" : series.every((x) => !x.rep) ? "Modell (gestrichelt)" : "durchgezogen: Skigebiet, gestrichelt: Modell"}</span>
      </div>
    </Section>
  )
}
