#!/usr/bin/env python3
"""Schreibt status.json: Lifte, Pisten und Schneebericht je Skigebiet, so wie die Skigebiete sie
selbst veröffentlichen. Jedes Gebiet hat in resorts.json unter "status" eine Quelle:

  skiarlberg   – Ski Arlberg (Warth-Schröcken): Tabellen der Live-Info-Seite (nur diese Region)
                 + Schneebericht-Seite; Pistenlängen aus der interaktiven Karte (Intermaps)
  micado       – Micado-Skigebiete-Manager (Damüls-Mellau): ListFacilities + ListProperties
  diedamskopf  – Diedamskopf: /webapi/livedata (Summen, Schnee) + Intermaps (einzelne Anlagen)

Schlägt ein Gebiet fehl, bleibt sein letzter Stand in status.json erhalten."""
import json, os, re, sys, urllib.request
from datetime import datetime, timezone
from html import unescape
from html.parser import HTMLParser

ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT = os.path.join(ROOT, "status.json")
UA = "Mozilla/5.0 (compatible; ski-aktuell/1.0; +https://jan-ai75.github.io/ski-aktuell/)"


def get(url, method="GET", headers=None, data=None, raw=False):
    h = {"User-Agent": UA, "Accept-Language": "de"}
    h.update(headers or {})
    req = urllib.request.Request(url, data=data, method=method, headers=h)
    body = urllib.request.urlopen(req, timeout=45).read().decode("utf-8", "replace")
    return body if raw else json.loads(body)


def num(v):
    m = re.search(r"-?\d+(?:[.,]\d+)?", str(v or ""))
    return float(m.group().replace(",", ".")) if m else None


def now_iso():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


# ---------- Ski Arlberg ----------
class LiveTable(HTMLParser):
    """Liest die Zeilen der Live-Info-Tabelle: Zellen mit headers="liveInfoTable-…"."""

    def __init__(self):
        super().__init__()
        self.rows, self.row, self.cell, self.depth = [], None, None, 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "tr":
            self.row = {"status_class": "", "focus": ""}
        if self.row is None:
            return
        cls = a.get("class") or ""
        if "live-info__status--" in cls:
            self.row["status_class"] = cls
        link = a.get("data-facilities-map-table-link") or ""
        m = re.search(r"focus=([LR]_\d+)", unescape(link))
        if m and not self.row["focus"]:
            self.row["focus"] = m.group(1)
        if tag == "td" and (a.get("headers") or "").startswith("liveInfoTable-"):
            self.cell = a["headers"].split("-", 1)[1]
            self.row.setdefault(self.cell, "")

    def handle_endtag(self, tag):
        if tag == "td":
            self.cell = None
        if tag == "tr" and self.row is not None:
            if self.row.get("name"):
                self.rows.append({k: (re.sub(r"\s+", " ", v).strip() if isinstance(v, str) else v) for k, v in self.row.items()})
            self.row = None

    def handle_data(self, data):
        if self.row is not None and self.cell:
            self.row[self.cell] += data


def parse_table(html):
    p = LiveTable()
    p.feed(html)
    out = []
    for r in p.rows:
        state = r.get("state", "")
        cls = r.get("status_class", "")
        is_open = "--open" in cls or state.lower().startswith(("geöffnet", "offen", "in betrieb"))
        out.append({"name": r["name"], "state": state, "open": is_open, "type": r.get("type", ""),
                    "difficulty": r.get("difficulty", ""), "id": r.get("focus", "")})
    return out


class SnowBox(HTMLParser):
    """Schneebericht: <div class="snow-report-box__item"><div>Tal</div>…<span>45 cm</span>…"""

    def __init__(self):
        super().__init__()
        self.items, self.cur, self.level, self.texts = {}, None, 0, []

    def handle_starttag(self, tag, attrs):
        cls = dict(attrs).get("class") or ""
        if "snow-report-box__item" in cls.split():
            self.cur, self.level, self.texts = True, 0, []
        elif self.cur:
            self.level += 1

    def handle_endtag(self, tag):
        if self.cur:
            if self.level == 0:
                t = [x for x in self.texts if x]
                if len(t) >= 2:
                    self.items.setdefault(t[0], t[-1])
                self.cur = None
            else:
                self.level -= 1

    def handle_data(self, data):
        if self.cur:
            self.texts.append(data.strip())


def parse_snow(html):
    p = SnowBox()
    p.feed(html)
    it = p.items
    return {"valley": num(it.get("Tal")), "mountain": num(it.get("Berg")), "new": num(it.get("Neuschnee")),
            "last_snowfall": it.get("Letzter Schneefall"), "condition": it.get("Beschaffenheit")}


def intermaps_lengths(url):
    try:
        d = get(url)
    except Exception as e:
        print(f"  Intermaps nicht geladen: {e}", file=sys.stderr)
        return {}
    out = {}
    for s in d.get("slopes", []):
        ln = ((s.get("popup") or {}).get("additional-info") or {}).get("length")
        if ln:
            out[re.sub(r"_group$", "", s.get("id", ""))] = ln
    return out


def skiarlberg(cfg):
    base = "https://www.skiarlberg.at"
    post = {"X-Requested-With": "XMLHttpRequest", "Accept": "application/json"}
    tables = {}
    for kind in ("lifts", "slopes"):
        u = f"{base}/de/live-info/table/{kind}?regionId={cfg['regionId']}&loadMore=1&orderState=ASC"
        tables[kind] = parse_table(get(u, method="POST", headers=post, data=b"")["html"])
    snow = parse_snow(get(f"{base}/de/{cfg['seite']}/live-infos/schnee-lawinenwarnbericht", raw=True))
    lengths = intermaps_lengths(cfg["intermaps"]) if cfg.get("intermaps") else {}
    lifts, slopes = tables["lifts"], tables["slopes"]
    if not lifts:
        raise ValueError("keine Lifte gefunden – Seitenaufbau geändert?")
    pistes = [s for s in slopes if "route" not in s["type"].lower()]
    km = lambda rows: round(sum(lengths.get(r["id"], 0) for r in rows) / 1000, 1)
    have_len = bool(lengths) and any(r["id"] in lengths for r in pistes)
    items = [{"name": r["name"], "kind": "lift", "type": r["type"], "open": r["open"], "state": r["state"]} for r in lifts]
    items += [{"name": r["name"], "kind": "piste" if r in pistes else "route", "type": r["difficulty"], "open": r["open"], "state": r["state"]} for r in slopes]
    return {
        "lifts": {"open": sum(r["open"] for r in lifts), "total": len(lifts)},
        "slopes": ({"open": km([r for r in pistes if r["open"]]), "total": km(pistes), "unit": "km"} if have_len
                   else {"open": sum(r["open"] for r in pistes), "total": len(pistes), "unit": "Pisten"}),
        "snow": {"valley": snow["valley"], "mountain": snow["mountain"], "new": snow["new"]},
        "condition": snow["condition"] if snow["condition"] and snow["condition"] != "Keine Meldung" else None,
        "last_snowfall": snow["last_snowfall"],
        "items": items,
        "source": "skiarlberg.at",
    }


# ---------- Micado (Damüls-Mellau) ----------
LIFT_TYPES = ("chairlift", "ropeway", "draglift", "gondola", "cablecar", "lift", "conveyor", "funicular")
MICADO_OPEN = {1}  # Statuscode "geöffnet"; wird unten gegen die Summe der Website geprüft


def micado(cfg):
    q = f"client={cfg['client']}&region={cfg['region']}&lang=de"
    fac = get(f"{cfg['basis']}/SkigebieteManager/Micado.SkigebieteManager.Plugin.FacilityApi/ListFacilities.api?{q}")
    prop = get(f"{cfg['basis']}/SkigebieteManager/Micado.SkigebieteManager.Plugin.PropertyApi/ListProperties.api?{q}")
    comp = {c["identifier"]: c for c in prop.get("computedProperties", [])}
    props = {p["identifier"]: p.get("value") for p in prop.get("properties", [])}
    fl = fac.get("facilities", [])
    lifts = [f for f in fl if f.get("type", "").startswith(LIFT_TYPES)]
    pistes = [f for f in fl if "piste" in f.get("type", "")]
    routes = [f for f in fl if f.get("type") == "skiroute"]
    lift_c, piste_c = comp.get("lift", {}), comp.get("piste", {})
    lifts_open = lift_c.get("countStateOpen")
    # Einzelstatus nur übernehmen, wenn die Zuordnung zur Summe der Website passt
    trust = lifts_open is not None and sum(f.get("status") in MICADO_OPEN for f in lifts) == lifts_open \
        and sum(f.get("status") in MICADO_OPEN for f in pistes) == piste_c.get("countStateOpen")
    is_open = (lambda f: f.get("status") in MICADO_OPEN) if trust else (lambda f: None)
    km_open = sum(f.get("length") or 0 for f in pistes if is_open(f)) / 1000 if trust else None
    km_total = sum(f.get("length") or 0 for f in pistes) / 1000
    items = [{"name": f["title"], "kind": "lift", "type": f.get("typename", ""), "open": is_open(f)} for f in lifts]
    items += [{"name": f["title"], "kind": "piste", "type": f.get("typename", ""), "open": is_open(f)} for f in pistes]
    items += [{"name": f["title"], "kind": "route", "type": f.get("typename", ""), "open": is_open(f)} for f in routes]
    slopes = ({"open": round(km_open, 1), "total": round(km_total, 1), "unit": "km"} if km_open is not None
              else {"open": piste_c.get("countStateOpen"), "total": piste_c.get("count", len(pistes)), "unit": "Pisten"})
    return {
        "lifts": {"open": lifts_open, "total": lift_c.get("count", len(lifts))},
        "slopes": slopes,
        "snow": {"valley": num(props.get("snow-height-valley")), "mountain": num(props.get("snow-height-mountain")),
                 "new": num(props.get("snow-height-new"))},
        "condition": (props.get("snowreport-text") or "").strip() or None,
        "last_snowfall": props.get("date-last-snowfall"),
        "valley_run": props.get("skirun-status"),
        "items": items if trust else [dict(i, open=None) for i in items],
        "source": cfg["basis"].split("//")[1],
        "reported": (fac.get("meta") or {}).get("lastUpdate") or None,
    }


# ---------- Diedamskopf ----------
def diedamskopf(cfg):
    live = get(cfg["livedata"])
    items, reported = [], None
    try:
        im = get(cfg["intermaps"])
        reported = (im.get("lastUpdate") or "").strip() or None
        for l in im.get("lifts", []):
            items.append({"name": l["popup"]["title"], "kind": "lift", "type": l["popup"].get("subtitle", ""),
                          "open": l.get("status") == "open"})
        for s in im.get("slopes", []):
            items.append({"name": s["popup"]["title"], "kind": "piste", "type": (s["popup"].get("additional-info") or {}).get("difficulty", ""),
                          "open": s.get("status") == "open"})
    except Exception as e:
        print(f"  Intermaps nicht geladen: {e}", file=sys.stderr)
    return {
        "lifts": {"open": live.get("countLiftsOpen"), "total": live.get("countLifts")},
        "slopes": {"open": live.get("lengthPistesOpen"), "total": live.get("lengthPiste"), "unit": "km"},
        "snow": {"valley": None, "mountain": num(live.get("snowHeight")), "new": None},
        "condition": None,
        "items": items,
        "source": "diedamskopf.at",
        "reported": reported,
    }


ADAPTERS = {"skiarlberg": skiarlberg, "micado": micado, "diedamskopf": diedamskopf}


def main():
    cfg = json.load(open(os.path.join(ROOT, "resorts.json"), encoding="utf-8"))
    try:
        out = json.load(open(OUT, encoding="utf-8"))
    except Exception:
        out = {}
    ok = 0
    for r in cfg["resorts"]:
        sc = r.get("status")
        if not r.get("aktiv", True) or not sc or sc.get("typ") not in ADAPTERS:
            continue
        try:
            st = ADAPTERS[sc["typ"]](sc)
            st["updated"] = now_iso()
            out[r["id"]] = st
            ok += 1
            print(f"{r['name']}: Lifte {st['lifts']['open']}/{st['lifts']['total']}, "
                  f"Pisten {st['slopes']['open']}/{st['slopes']['total']} {st['slopes']['unit']}, Schnee Berg {st['snow']['mountain']}")
        except Exception as e:
            print(f"{r['name']}: Fehler {e!r} – alter Stand bleibt", file=sys.stderr)
    json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    if not ok:
        sys.exit("Kein Skigebiet geladen")


if __name__ == "__main__":
    main()
