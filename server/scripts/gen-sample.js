// Generates FAKE demo data in the exact shape of the Dashboard tab (25 columns, same headers),
// including the messy bits: two date formats, blank Closed By, duplicates, test entries, blocklist.
// Use with DATA_SOURCE=sample. Nothing here is real student data.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HEADERS } from '../src/lib/clean.js';

const here = path.dirname(fileURLToPath(import.meta.url));
let seed = 20260101;
const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const pick = (a) => a[Math.floor(rnd() * a.length)];

const PROGRAMS = [
  { name: 'Reiki - L1/L2', fee: [11000, 21000], w: 3 },
  { name: 'Reiki - L3', fee: [15000], w: 1 },
  { name: 'Tarot - Mastery', fee: [9999], w: 4 },
  { name: 'Tarot - Diploma', fee: [6999], w: 2 },
];
const CLOSERS = ['Chandrika', 'Bhumika', 'Rahul', 'Chandrika', 'Bhumika', '', '', ''];
const PAID = ['Gpay', 'RazPay', 'Tagmango', 'Paytm'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FIRST = ['Asha', 'Meera', 'Kiran', 'Nisha', 'Rohit', 'Anita', 'Sunil', 'Pooja', 'Ritu', 'Vikram', 'Divya', 'Karan'];

const start = Date.UTC(2023, 0, 1);
const end = Date.now();
const rows = [];
let n = 0;

function makeRow(ts, base) {
  const d = new Date(ts);
  const dd = d.getUTCDate(); const mm = d.getUTCMonth(); const yy = d.getUTCFullYear();
  const h = Math.floor(rnd() * 14) + 8; const mi = Math.floor(rnd() * 60);
  const ap = h >= 12 ? 'pm' : 'am'; const h12 = ((h + 11) % 12) + 1;
  const dateText = `${dd} ${MON[mm]} ${String(yy).slice(2)}`;
  const enrolled = rnd() < 0.8
    ? `${dateText} | ${h12}:${mi}${ap}` // format 1
    : `${String(dd).padStart(2, '0')}/${String(mm + 1).padStart(2, '0')}/${yy} ${h}:${String(mi).padStart(2, '0')}`; // format 2
  const prog = base?.prog || (() => {
    const bag = PROGRAMS.flatMap((p) => Array(p.w).fill(p));
    return pick(bag);
  })();
  const fee = base?.fee || pick(prog.fee);
  const email = base?.email || `${pick(FIRST).toLowerCase()}${Math.floor(rnd() * 90000)}@example.com`;
  const phone = base?.phone || String(6000000000 + Math.floor(rnd() * 3999999999));
  const booking = rnd() < 0.55 ? fee : Math.round(fee * 0.5 / 100) * 100;
  const paidFull = booking >= fee || rnd() < 0.5;
  const received = paidFull ? fee : booking;
  const due = fee - received;
  n += 1;
  return {
    meta: { prog, fee, email, phone },
    cells: {
      'S No': String(n), 'Enrolled On Date': enrolled, 'First Name': `${pick(FIRST)} ${pick(['K', 'S', 'M', 'R'])}`,
      Email: email, Phone: phone, Program: prog.name, 'Booking Amount': String(booking), 'Paid Through': pick(PAID),
      'Program Fee': String(fee), 'Pymt Status': due > 0 ? 'Due' : 'Received', 'Amount Received': String(received),
      'Amount Due': String(due), 'Closed By': pick(CLOSERS), 'Balance Received': '0', 'Old Balance': '0', Difference: '0',
      'Duplicate Email': `${email}${prog.name}`, 'Duplicate Phone': `${phone}${prog.name}`, 'Enrolled Date': dateText,
      'Payment Status': due > 0 ? 'Due' : 'Received', 'LEAD SOURCE': '#N/A', Campaign: '#N/A', Adset: '#N/A', Ads: '#N/A', Blocklist: '',
    },
  };
}

for (let ts = start; ts <= end; ts += 86400000) {
  const dow = new Date(ts).getUTCDay();
  const yearFactor = 1 + (new Date(ts).getUTCFullYear() - 2023) * 0.25;
  const seasonal = [0.9, 0.8, 1, 1.1, 1.3, 1, 0.8, 0.9, 1.1, 1.4, 1.2, 1.5][new Date(ts).getUTCMonth()];
  const count = Math.floor(rnd() * 5 * yearFactor * seasonal * (dow === 0 || dow === 6 ? 1.3 : 0.9));
  for (let i = 0; i < count; i += 1) rows.push(makeRow(ts + i * 60000));
}

// messy bits
const dupes = rows.slice(50, 150).filter((_, i) => i % 5 === 0).map((r) => {
  const copy = { ...r.cells }; n += 1; copy['S No'] = String(n); return { cells: copy };
});
rows.push(...dupes);
rows[10].cells['First Name'] = 'Test User';
rows[20].cells['First Name'] = '';
rows[30].cells.Blocklist = 'Yes';
rows[40].cells['Enrolled On Date'] = 'not a date';
rows[40].cells['Enrolled Date'] = '';

const esc = (v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const lines = [HEADERS.map(esc).join(',')];
for (const r of rows) lines.push(HEADERS.map((h) => esc(r.cells[h] ?? '')).join(','));
for (let i = 0; i < 25; i += 1) lines.push(HEADERS.map((h) => (h === 'Amount Due' || h === 'Balance Received' || h === 'Old Balance' || h === 'Difference' ? '0' : /LEAD|Campaign|Adset|Ads/.test(h) ? '#N/A' : '')).join(','));

fs.mkdirSync(path.join(here, '..', 'data'), { recursive: true });
fs.writeFileSync(path.join(here, '..', 'data', 'sample-dashboard.csv'), lines.join('\n'));
console.log(`wrote ${rows.length} fake rows`);
