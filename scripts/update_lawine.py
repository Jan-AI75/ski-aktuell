#!/usr/bin/env python3
"""Schreibt lawine.json: Lawinenlagebericht des LWD Vorarlberg (EAWS-Format CAAMLv6) für heute
und – sobald veröffentlicht, meist ab 17 Uhr – für morgen, reduziert auf das, was die App zeigt:
Gefahrenstufe(n) je Region, Lawinenprobleme, Tendenz."""
import json, os, sys, urllib.request, urllib.error
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT = os.path.join(ROOT, "lawine.json")
SRC = "https://static.avalanche.report/eaws_bulletins/{d}/{d}-AT-08.json"
UA = {"User-Agent": "ski-aktuell/1.0 (+https://jan-ai75.github.io/ski-aktuell/)"}


def fetch(d):
    try:
        req = urllib.request.Request(SRC.format(d=d), headers=UA)
        return json.loads(urllib.request.urlopen(req, timeout=60).read())
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None  # noch nicht veröffentlicht
        raise


def elev(o):
    e = o.get("elevation") or {}
    return {k: e[k] for k in ("lowerBound", "upperBound") if k in e} or None


def reduce(doc):
    regions = {}
    for b in doc.get("bulletins", []):
        entry = {
            "published": b.get("publicationTime"),
            "valid": b.get("validTime"),
            "ratings": [{"value": r.get("mainValue"), "elevation": elev(r),
                         "period": r.get("validTimePeriod", "all_day")} for r in b.get("dangerRatings", [])],
            "problems": [{"type": p.get("problemType"), "aspects": p.get("aspects", []),
                          "elevation": elev(p), "period": p.get("validTimePeriod", "all_day")}
                         for p in b.get("avalancheProblems", [])],
            "tendency": [t.get("tendencyType") for t in b.get("tendency", []) if t.get("tendencyType")],
        }
        for r in b.get("regions", []):
            regions[r["regionID"]] = dict(entry, name=r.get("name"))
    return regions


def main():
    today = datetime.now(ZoneInfo("Europe/Vienna")).date()
    days = {}
    for d in (today, today + timedelta(days=1)):
        ds = d.isoformat()
        try:
            doc = fetch(ds)
        except Exception as e:
            print(f"{ds}: Fehler {e}", file=sys.stderr)
            continue
        if doc:
            days[ds] = reduce(doc)
    if not days:
        sys.exit("Kein Lagebericht geladen (außerhalb der Saison normal)")
    out = {"updated": datetime.now(ZoneInfo("UTC")).isoformat(timespec="seconds"),
           "source": "LWD Vorarlberg / avalanche.report", "days": days}
    json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print("ok", ", ".join(f"{k}: {len(v)} Regionen" for k, v in days.items()))


if __name__ == "__main__":
    main()
