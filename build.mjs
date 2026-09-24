import { build, context } from 'esbuild';
import { cpSync, mkdirSync } from 'node:fs';
// --site: build into the main website (served at https://paper2test.app/admin/, also inside the Android app).
const outDir = process.argv.includes('--site') ? '../Paper2Test/server/public/admin' : 'dist';
mkdirSync(outDir, { recursive: true });
cpSync('public', outDir, { recursive: true });
const opts = { entryPoints: ['src/main.tsx'], bundle: true, format: 'esm', target: 'es2022', jsx: 'automatic', jsxImportSource: 'preact', outfile: `${outDir}/app.js`, minify: !process.argv.includes('--watch'), logLevel: 'info' };
if (process.argv.includes('--watch')) { const ctx = await context(opts); await ctx.watch(); console.log('watching…'); } else await build(opts);
