import { build } from 'esbuild';
import { globSync, rmSync } from 'node:fs';

/**
 * Remove stale output so deleted/renamed modules and old chunks are not
 * republished. The type declarations are regenerated afterwards by `tsc`.
 */
rmSync('dist', { recursive: true, force: true });

/**
 * Build every module as its own entry point. Combined with `splitting`, this
 * lets esbuild hoist shared internals (helpers, trackers, scroll utils) into
 * shared chunks, so apps only download the organisms they actually import
 * instead of the whole library.
 */
const entryPoints = globSync('src/**/*.js');

build({
  entryPoints,
  outdir: 'dist',
  bundle: true,
  sourcemap: true,
  minify: true,
  splitting: true,
  treeShaking: true,
  format: 'esm',  // Output format is ESM
  target: ['esnext'],
  external: ['@base-framework/base', '@base-framework/atoms']
})
.catch(() => process.exit(1));