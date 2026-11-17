#!/usr/bin/env python3
"""Schreibt weather.json: Open-Meteo-Vorhersage für alle Messpunkte aller aktiven Skigebiete
(Reihenfolge wie in resorts.json). Die App fragt dieselbe Adresse live ab und nutzt diese Datei
nur, wenn Open-Meteo gerade nicht erreichbar ist."""
import json, os, sys, urllib.request

ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT = os.path.join(ROOT, "weather.json")

HOURLY = "temperature_2m,snowfall,snow_depth,freezing_level_height,weather_code,wind_gusts_10m,cloud_cover,sunshine_duration,visibility,precipitation"
DAILY = "weather_code,temperature_2m_max,temperature_2m_min,snowfall_sum,precipitation_sum,sunshine_duration,wind_gusts_10m_max,daylight_duration"
CURRENT = "temperature_2m,weather_code,wind_gusts_10m,snowfall"


def points():
    cfg = json.load(open(os.path.join(ROOT, "resorts.json"), encoding="utf-8"))
    return [p for r in cfg["resorts"] if r.get("aktiv", True) for p in r["points"]]


def url(pts):
    j = lambda k: ",".join(str(p[k]) for p in pts)
    return ("https://api.open-meteo.com/v1/forecast"
            f"?latitude={j('lat')}&longitude={j('lon')}&elevation={j('elev')}"
            f"&current={CURRENT}&hourly={HOURLY}&daily={DAILY}"
            "&past_days=7&forecast_days=7&timezone=Europe%2FBerlin&wind_speed_unit=kmh")


def main():
    pts = points()
    req = urllib.request.Request(url(pts), headers={"User-Agent": "ski-aktuell/1.0 (+https://jan-ai75.github.io/ski-aktuell/)"})
    try:
        d = json.loads(urllib.request.urlopen(req, timeout=60).read())
        if isinstance(d, dict):
            d = [d]
        assert len(d) == len(pts)
    except Exception as e:
        sys.exit(f"Wetter nicht geladen: {e}")
    json.dump(d, open(OUT, "w"), separators=(",", ":"))
    print("ok", d[0]["current"]["time"], len(d), "Punkte")


if __name__ == "__main__":
    main()
