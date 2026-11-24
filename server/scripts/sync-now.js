// npm run sync --prefix server   -> pull the sheet once and exit (handy for testing credentials)
import { init } from '../src/store.js';
import { runSync } from '../src/sync.js';

await init();
const result = await runSync();
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
