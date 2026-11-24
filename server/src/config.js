import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const SERVER_ROOT = path.resolve(here, '..');

const bool = (v, d = false) => (v === undefined || v === '' ? d : /^(1|true|yes|on)$/i.test(v));

export const config = {
  port: Number(process.env.PORT || 5000),
  tz: process.env.TZ_NAME || 'Asia/Kolkata',
  mongoUri: (process.env.MONGODB_URI || '').trim(),

  dataSource: (process.env.DATA_SOURCE || 'auto').trim(),
  sheetId: (process.env.SHEET_ID || '1t_2yP18ErFwfqMWhW2C3yZb1POIxObBK8dhqyQTBOnE').trim(),
  sheetTab: (process.env.SHEET_TAB || 'Dashboard').trim(),
  serviceAccountJson: (process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '').trim(),
  serviceAccountFile: path.resolve(SERVER_ROOT, process.env.GOOGLE_SERVICE_ACCOUNT_FILE || './data/service-account.json'),
  csvFile: process.env.CSV_FILE ? path.resolve(SERVER_ROOT, process.env.CSV_FILE) : '',

  dedupeKeep: (process.env.DEDUPE_KEEP || 'first').toLowerCase() === 'last' ? 'last' : 'first',

  syncCron: process.env.SYNC_CRON || '0 6 * * *',
  syncOnBoot: bool(process.env.SYNC_ON_BOOT, true),
  syncToken: (process.env.SYNC_TOKEN || '').trim(),

  authUser: process.env.DASHBOARD_USER || '',
  authPassword: process.env.DASHBOARD_PASSWORD || '',

  cacheFile: path.join(SERVER_ROOT, 'data', 'cache.json'),
  sampleFile: path.join(SERVER_ROOT, 'data', 'sample-dashboard.csv'),
  clientDist: path.resolve(SERVER_ROOT, '..', 'client', 'dist'),
};
