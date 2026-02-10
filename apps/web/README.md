# apps/web (Next.js)

Next.js web app for VistA Evolved.

## Purpose
This is the browser UI. In the MVP it will deliver:
- Patient Search (read-only)
- Patient demographics
- Allergies (view + add)
- Vitals (view + add)

## Run (development)
From repo root:
pnpm -r install

Then:
pnpm -C apps/web dev

Open:
http://localhost:3000

## Notes
- This project was created using create-next-app.
- Keep UI changes small and incremental during MVP.
