# Ski aktuell

Handy-Web-App (GitHub Pages) für ausgewählte Skigebiete: Wetter je Höhe, Neuschnee, Schneehöhe,
7-Tage-Vorhersage mit „bestem Skitag“, Lawinenlage, Lifte & Pisten live, Saisonverlauf der Schneehöhe.

## Dateien
- `app/` – Quellcode der App (React, TypeScript, Tailwind, shadcn/ui); Anleitung in `app/README.md`
- `index.html`, `assets/` – die gebaute App (erzeugt die Action „App bauen“, nicht von Hand ändern)
- `resorts.json` – Skigebiete, Messpunkte, Lawinenregionen, Datenquelle für Lifte/Pisten, Pistenplan
- `scripts/update_weather.py` → `weather.json` (Rückfall, wenn Open-Meteo nicht erreichbar)
- `scripts/update_lawine.py` → `lawine.json` (LWD Vorarlberg, heute + morgen)
- `scripts/update_status.py` → `status.json` (Lifte, Pisten, Schneebericht der Skigebiete)
  - Warth-Schröcken: skiarlberg.at (Live-Info-Tabellen, Region 327) + Pistenlängen aus Intermaps
  - Damüls-Mellau: Micado-Schnittstelle von damuels-mellau.at
  - Diedamskopf: diedamskopf.at/webapi/livedata + Intermaps
- `scripts/update_history.py` → `history.json` (ein Wert pro Tag für den Saisonverlauf)
- `sw.js`, `manifest.webmanifest`, `icon-*.png` – installierbare Web-App
- `.github/workflows/update-data.yml` – Daten, alle 30 Minuten
- `.github/workflows/build-app.yml` – baut die App bei Änderungen in `app/`

## Einrichten
1. Repository `ski-aktuell` anlegen, Dateien hochladen.
2. Settings → Pages → „Deploy from a branch“, Branch `main`, Ordner `/`.
3. Settings → Actions → General → Workflow permissions: „Read and write“.
4. Actions → „Skidaten aktualisieren“ → „Run workflow“ einmal von Hand starten.

## Neues Skigebiet
Block in `resorts.json` kopieren, Name, Koordinaten und Höhen anpassen. Ohne passende `status`-Quelle
zeigt die App Wetter, Schnee und Lawinenlage und verlinkt für Lifte/Pisten auf die Website des Gebiets.
