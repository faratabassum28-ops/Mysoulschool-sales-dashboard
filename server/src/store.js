// Holds the cleaned rows. MongoDB is the system of record; an in-memory copy serves the charts
// (the data set is a few thousand rows). Without MONGODB_URI it falls back to a JSON cache file.

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { config } from './config.js';
import { Enrollment, SyncLog } from './models/Enrollment.js';
import { buildMeta } from './lib/analytics.js';

const state = { rows: [], meta: buildMeta([]), lastSync: null, backend: 'memory' };
export const getState = () => state;

const strip = ({ _id, __v, syncId, ...rest }) => rest;

function setRows(rows, lastSync) {
  state.rows = rows;
  state.meta = buildMeta(rows);
  state.lastSync = lastSync;
}

export async function init() {
  if (config.mongoUri) {
    await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 8000 });
    state.backend = 'mongodb';
  }
  await reload();
}

export async function reload() {
  if (state.backend === 'mongodb') {
    const docs = await Enrollment.find({}).sort({ date: 1 }).lean();
    const log = await SyncLog.findOne({ ok: true }).sort({ at: -1 }).lean();
    setRows(docs.map(strip), log ? { at: log.at, source: log.source, stats: log.stats } : null);
    return;
  }
  try {
    const cache = JSON.parse(await fs.readFile(config.cacheFile, 'utf8'));
    setRows(cache.rows, cache.lastSync);
  } catch {
    setRows([], null);
  }
}

export async function replaceAll(rows, { source, stats }) {
  const syncId = crypto.randomUUID();
  const lastSync = { at: new Date().toISOString(), source, stats };

  if (state.backend === 'mongodb') {
    // insert the new snapshot first, then drop the old one, so a failed sync never leaves the dashboard empty
    const BATCH = 1000;
    for (let i = 0; i < rows.length; i += BATCH) {
      await Enrollment.insertMany(rows.slice(i, i + BATCH).map((r) => ({ ...r, syncId })), { ordered: false });
    }
    await Enrollment.deleteMany({ syncId: { $ne: syncId } });
    await SyncLog.create({ syncId, source, ok: true, stats });
  } else {
    await fs.mkdir(path.dirname(config.cacheFile), { recursive: true });
    await fs.writeFile(config.cacheFile, JSON.stringify({ rows, lastSync }));
  }
  setRows(rows, lastSync);
}

export async function logFailure(source, error) {
  if (state.backend === 'mongodb') {
    await SyncLog.create({ syncId: crypto.randomUUID(), source, ok: false, error: String(error?.message || error) }).catch(() => {});
  }
}
