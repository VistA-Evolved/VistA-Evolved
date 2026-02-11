# apps/web (Next.js)

Next.js web app for VistA Evolved.

## Purpose
This is the browser UI. In the MVP it will deliver:
- Patient Search (read-only) — **implemented** at `/patient-search`
- Patient demographics
- Allergies (view + add)
- Vitals (view + add)

## Pages

| Route | Description |
|-------|-------------|
| `/` | Homepage with "VistA Evolved" heading and link to Patient Search |
| `/patient-search` | Debounced patient search against the VistA RPC API |

## Prerequisites
The API server must be running on port 3001:
```
pnpm -C apps/api dev
```
The API requires the WorldVistA Docker container on port 9430.

## Run (development)
From repo root:
```
pnpm -r install
pnpm -C apps/web dev
```

Open: http://localhost:3000

## Notes
- This project was created using create-next-app.
- Keep UI changes small and incremental during MVP.
- The Patient Search page fetches from `http://127.0.0.1:3001/vista/patient-search`.
