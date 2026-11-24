# MySoulSchool Sales Dashboard (MERN)

Four-page sales dashboard on the **Students Records → Dashboard** tab.
MongoDB + Express + React + Node. Replaces the Looker Studio / pivot-table plan with a website you host yourself.

```
Google Sheet (Dashboard tab)  ──daily 06:00 IST──▶  clean (DB_Clean rules)  ──▶  MongoDB  ──▶  Express API  ──▶  React pages
```

## Quick start (5 minutes, demo data)

```bash
npm run install:all          # installs root, server and client
cp .env.example .env         # then edit (see below)
# demo with FAKE data, no Google access needed:
echo "DATA_SOURCE=sample" >> .env
npm run dev                  # API on :5000, site on http://localhost:5173
```

Production: `npm run build && npm start` → everything is served from http://localhost:5000.

## Connect your real sheet

Pick one:

**A. Service account (recommended, sheet stays private)**
1. Google Cloud Console → create a project → enable *Google Sheets API*.
2. IAM → Service accounts → create one → Keys → add JSON key.
3. Put the JSON in `server/data/service-account.json` (or paste it, on one line, into `GOOGLE_SERVICE_ACCOUNT_JSON`).
4. Share the Students Records sheet with the service account's e-mail as **Viewer**.
5. `DATA_SOURCE=auto` (default) now uses the API.

**B. Link sharing (fastest)** – share the sheet as *Anyone with the link can view*. With no service account, `DATA_SOURCE=auto` falls back to the CSV export.

**C. Manual** – export the Dashboard tab to CSV, set `DATA_SOURCE=csv-file` and `CSV_FILE=path/to/file.csv`.

Test the connection without starting the site: `npm run sync --prefix server`.

`MONGODB_URI` can be a local MongoDB or an Atlas connection string. If left empty the app still works and keeps the cleaned rows in `server/data/cache.json`.

## What was built, against the brief

| Brief | Where |
|---|---|
| Golden rule: exact names | Headers are matched by their exact text (`server/src/lib/clean.js` → `HEADERS`), never by column position, never renamed. Program, `Pymt Status` ("Received" / "Due"), `Closed By`, `Paid Through` values come straight from the sheet. If a header is renamed, the sync stops with a clear error instead of showing wrong numbers. |
| Step 1: DB_Clean | `clean.js`: all 25 columns kept in order under `raw`, plus **Date, Week (Mon), Month, Quarter, Year, Day** [NEW]. Excludes Blocklist rows, test entries, and rows with no First Name. Duplicates counted once via `Duplicate Email` / `Duplicate Phone`. Blank `Closed By` → "Not Tagged" in the dashboard only; nothing is written to the sheet. |
| Step 2: numbers | Existing: Program Fee, Booking Amount, Amount Received, Amount Due, Pymt Status. New (tagged **NEW** in the UI): Enrollments, Collection %, Avg Program Fee, Growth %. |
| Page 1 | Today / This Week / This Month / This Year cards with Growth %, 60-day daily line, monthly bars. |
| Page 2 | Program table + month-wise stacked bars (Program Fee or Enrollments). |
| Page 3 | Month × Year heatmap, best Day / Week / Month / Quarter, Program Fee by day of week, same month year-over-year. |
| Page 4 | Daily/Weekly/Monthly/Quarterly/Yearly switch, Closed By leaderboard, Closed By × Program, trend per closer, **Not Tagged %** card (target 0%, turns red above it). |
| Step 4 | Date range picker + Program filter on every page, Closed By filter on page 4, ₹ in Lakh format, daily auto-refresh (`SYNC_CRON`, default 06:00 `Asia/Kolkata`). |

## Decisions worth a look (all easy to change)

- **Growth %** compares like-for-like: this week so far vs the same number of days of last week, and the same for month and year. Today is compared with yesterday. It shows "—" when the previous period has no data.
- **Which row survives a duplicate**: the first one in the sheet (`DEDUPE_KEEP=last` flips it). A row counts as a repeat if its `Duplicate Email` *or* `Duplicate Phone` key was already seen.
- **Blocklist**: any real value marks the row. Blank, `#N/A`, FALSE, No and 0 do not.
- **Test entries**: First Name starting with / containing the word test, testing, demo or dummy, or an e-mail like `test@…` (`isTestEntry` in `clean.js`).
- **Dates**: `Enrolled On Date` is parsed in several formats (`18 May 24 | 9:35pm`, `18/05/2024 21:35`, ISO, Sheets serial numbers) and falls back to `Enrolled Date`. Rows with no readable date are skipped and counted in the sync log.
- **Scope of the date picker**: it drives tables, the monthly bars, day-of-week and the team page. The Today/Week/Month/Year cards and the 60-day line always count up to today. The heatmap, "best of all time" callouts and year-over-year view always use all time. Each page says so.
- **Values are trimmed** of leading/trailing spaces (so "Chandrika " and "Chandrika" don't split into two closers). Otherwise they are untouched.
- Lakh format: `₹12.34 L`. Amounts under 1 Lakh show a third decimal (`₹0.117 L`).

## Operations

- Daily refresh runs inside the server. Manual refresh: `curl -X POST -H "x-sync-token: $SYNC_TOKEN" http://HOST/api/sync` (needs `SYNC_TOKEN` set).
- Health / last sync result: `GET /api/health`.
- Cleaned rows (the DB_Clean equivalent): `GET /api/clean-rows?limit=100`.
- Set `DASHBOARD_USER` and `DASHBOARD_PASSWORD` to put a login in front of the whole site. This dashboard shows revenue, so do this before exposing it publicly.
- Tests: `npm test` (cleaning rules, date parsing, KPI maths).

## Deploying

Any host that runs Node works (Render, Railway, a VPS). Build command `npm run install:all && npm run build`, start command `npm start`, and set the env vars from `.env.example`. Use MongoDB Atlas for `MONGODB_URI`.

## Layout

```
server/src/lib/clean.js       DB_Clean rules          server/src/lib/analytics.js  every KPI and chart
server/src/lib/sources.js     Sheets API / CSV        server/src/sync.js           daily cron + sync
server/src/store.js           MongoDB + cache         server/src/index.js          API + static site
client/src/pages/             the four pages          client/src/components/       filters, heatmap, UI bits
server/data/sample-dashboard.csv   FAKE demo data (DATA_SOURCE=sample)
```
