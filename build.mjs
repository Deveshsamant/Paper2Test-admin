import { build, context } from 'esbuild';
import { cpSync, mkdirSync } from 'node:fs';
mkdirSync('dist', { recursive: true });
cpSync('public', 'dist', { recursive: true });
const opts = { entryPoints: ['src/main.tsx'], bundle: true, format: 'esm', target: 'es2022', jsx: 'automatic', jsxImportSource: 'preact', outfile: 'dist/app.js', minify: !process.argv.includes('--watch'), logLevel: 'info' };
if (process.argv.includes('--watch')) { const ctx = await context(opts); await ctx.watch(); console.log('watching…'); } else await build(opts);
