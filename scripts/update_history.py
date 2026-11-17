#!/usr/bin/env python3
"""Schreibt history.json: ein Eintrag pro Tag und Skigebiet für den Saisonverlauf der Schneehöhe.
  m = Schneehöhe Berg laut Modell (Open-Meteo), cm
  b = Schneehöhe Berg laut Skigebiet, cm (nur wenn status.json von heute ist)
  t = Schneehöhe Tal laut Skigebiet, cm
  n = Neuschnee der letzten 24 h am Berg laut Modell, cm
  mt = Schneehöhe Tal laut Modell (unterster Messpunkt), cm
Jeder Lauf überschreibt den Eintrag des aktuellen Tages; beim ersten Lauf werden die letzten
sieben Tage aus den Modelldaten nachgetragen. Einträge älter als 400 Tage fallen weg."""
from datetime import date, timedelta
from common import load, save, resorts_with_weather, now_index, snow_sum, today

OUT = "history.json"


def r0(v):
    return None if v is None else round(v)


def main():
    _, rows = resorts_with_weather()
    status = load("status.json", {})
    hist = load(OUT, {}) or {}
    res = hist.setdefault("resorts", {})
    day = today()
    for r, berg, tal in rows:
        lst = res.setdefault(r["id"], [])
        h = berg["hourly"]
        i = now_index(berg)
        if not lst:  # Nachtrag: Mittagswerte der vergangenen Tage
            for k, t in enumerate(h["time"]):
                if t.endswith("T12:00") and t[:10] < day:
                    e = {"d": t[:10], "m": r0((h["snow_depth"][k] or 0) * 100), "n": r0(snow_sum(berg, k - 23, k))}
                    if tal is not berg and k < len(tal["hourly"]["snow_depth"]):
                        e["mt"] = r0((tal["hourly"]["snow_depth"][k] or 0) * 100)
                    lst.append(e)
        st = status.get(r["id"]) or {}
        fresh = (st.get("updated") or "")[:10] == day
        snow = (st.get("snow") or {}) if fresh else {}
        entry = {"d": day, "m": r0((h["snow_depth"][i] or 0) * 100), "n": r0(snow_sum(berg, i - 23, i))}
        if tal is not berg:
            ti = now_index(tal)
            entry["mt"] = r0((tal["hourly"]["snow_depth"][ti] or 0) * 100)
        # Angaben des Skigebiets nur übernehmen, wenn es tatsächlich Schnee meldet (außerhalb der Saison stehen dort Nullen)
        if (snow.get("mountain") or 0) > 0:
            entry["b"] = r0(snow["mountain"])
            if snow.get("valley") is not None:
                entry["t"] = r0(snow["valley"])
        lst[:] = [e for e in lst if e["d"] != day] + [entry]
        cutoff = (date.fromisoformat(day) - timedelta(days=400)).isoformat()
        lst[:] = sorted((e for e in lst if e["d"] >= cutoff), key=lambda e: e["d"])
    hist["updated"] = day
    save(OUT, hist)
    print("ok", {k: len(v) for k, v in res.items()})


if __name__ == "__main__":
    main()
