"""Gemeinsame Helfer: Skigebiete aus resorts.json und die Open-Meteo-Daten ihrer Bergstation."""
import json, os
from datetime import datetime
from zoneinfo import ZoneInfo

ROOT = os.path.join(os.path.dirname(__file__), "..")
TZ = ZoneInfo("Europe/Berlin")


def load(name, default=None):
    try:
        return json.load(open(os.path.join(ROOT, name), encoding="utf-8"))
    except Exception:
        return default


def save(name, data):
    json.dump(data, open(os.path.join(ROOT, name), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))


def resorts_with_weather():
    """Liefert (resort, wetterdaten_berg, wetterdaten_tal) für jedes aktive Gebiet."""
    cfg = load("resorts.json")
    wx = load("weather.json", [])
    active = [r for r in cfg["resorts"] if r.get("aktiv", True)]
    if len(wx) != sum(len(r["points"]) for r in active):
        raise SystemExit("weather.json passt nicht zu resorts.json")
    k, out = 0, []
    for r in active:
        n = len(r["points"])
        out.append((r, wx[k + n - 1], wx[k]))
        k += n
    return cfg, out


def now_index(d):
    t = d["hourly"]["time"]
    key = d["current"]["time"][:13] + ":00"
    if key in t:
        return t.index(key)
    i = 0
    while i + 1 < len(t) and t[i + 1] <= d["current"]["time"]:
        i += 1
    return i


def snow_sum(d, a, b):
    s = d["hourly"]["snowfall"]
    return sum(x or 0 for x in s[max(0, a):min(len(s) - 1, b) + 1])


def today():
    return datetime.now(TZ).date().isoformat()
