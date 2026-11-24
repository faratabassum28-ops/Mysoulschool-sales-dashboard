import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { config } from './config.js';
import { init, getState } from './store.js';
import { runSync, scheduleDailySync, lastError } from './sync.js';
import {
  applyFilters, overview, programPerformance, bestPeriods, teamPerformance, GRANULARITIES,
} from './lib/analytics.js';
import { fromDays } from './lib/dates.js';

const app = express();
app.disable('x-powered-by');
app.use(compression());
app.use(cors());
app.use(express.json());

// ---------- optional HTTP Basic login for the whole site ----------
if (config.authUser && config.authPassword) {
  const safeEq = (a, b) => {
    const A = Buffer.from(a); const B = Buffer.from(b);
    return A.length === B.length && crypto.timingSafeEqual(A, B);
  };
  app.use((req, res, next) => {
    if (req.path === '/api/health') return next();
    const [scheme, token] = (req.headers.authorization || '').split(' ');
    if (scheme === 'Basic' && token) {
      const [u, ...p] = Buffer.from(token, 'base64').toString().split(':');
      if (safeEq(u, config.authUser) && safeEq(p.join(':'), config.authPassword)) return next();
    }
    res.set('WWW-Authenticate', 'Basic realm="MySoulSchool Sales Dashboard"');
    return res.status(401).send('Login required');
  });
}

// ---------- helpers ----------
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const list = (v) => (typeof v === 'string' && v ? v.split('|').map((s) => s.trim()).filter(Boolean) : []);
const filtersFrom = (q) => ({
  from: ISO.test(q.from || '') ? q.from : undefined,
  to: ISO.test(q.to || '') ? q.to : undefined,
  programs: list(q.programs),
  closers: list(q.closers),
});
const todayInTz = () => new Intl.DateTimeFormat('en-CA', { timeZone: config.tz }).format(new Date());
const wrap = (fn) => (req, res) => {
  try { res.json(fn(req)); } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
};

// ---------- API ----------
app.get('/api/health', (_req, res) => {
  const { rows, backend, lastSync } = getState();
  res.json({ ok: true, backend, rows: rows.length, lastSync, lastError });
});

app.get('/api/meta', wrap(() => {
  const { meta, lastSync, backend } = getState();
  return {
    ...meta, asOf: todayInTz(), tz: config.tz, backend, lastSync, lastError, granularities: GRANULARITIES,
  };
}));

app.get('/api/overview', wrap((req) => {
  const f = filtersFrom(req.query);
  const asOf = ISO.test(req.query.asOf || '') ? req.query.asOf : todayInTz();
  return overview(getState().rows, f, asOf);
}));

app.get('/api/programs', wrap((req) => programPerformance(getState().rows, filtersFrom(req.query))));

app.get('/api/best-periods', wrap((req) => bestPeriods(getState().rows, filtersFrom(req.query))));

app.get('/api/team', wrap((req) => teamPerformance(getState().rows, filtersFrom(req.query), req.query.granularity)));

// Debug / export of the cleaned rows (DB_Clean equivalent)
app.get('/api/clean-rows', wrap((req) => {
  const rows = applyFilters(getState().rows, filtersFrom(req.query));
  const limit = Math.min(Number(req.query.limit) || 100, 2000);
  return { total: rows.length, rows: rows.slice(0, limit) };
}));

// Manual refresh:  curl -X POST -H "x-sync-token: $SYNC_TOKEN" http://localhost:5000/api/sync
app.post('/api/sync', async (req, res) => {
  if (!config.syncToken) return res.status(403).json({ error: 'Manual sync is disabled. Set SYNC_TOKEN to enable it.' });
  if (req.headers['x-sync-token'] !== config.syncToken) return res.status(401).json({ error: 'Bad sync token.' });
  const result = await runSync();
  return res.status(result.ok ? 200 : 502).json(result);
});

// ---------- front-end (production build) ----------
if (fs.existsSync(config.clientDist)) {
  app.use(express.static(config.clientDist, { maxAge: '1h', index: false }));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(config.clientDist, 'index.html')));
}

// ---------- boot ----------
async function main() {
  await init();
  const { rows, backend } = getState();
  console.log(`[boot] storage: ${backend}, ${rows.length} cleaned rows loaded`);

  app.listen(config.port, () => {
    console.log(`[boot] http://localhost:${config.port}  (today in ${config.tz}: ${todayInTz()}, epoch-day check ${fromDays(0)})`);
  });

  scheduleDailySync();
  if (config.syncOnBoot || rows.length === 0) runSync();
}

main().catch((e) => { console.error(e); process.exit(1); });
