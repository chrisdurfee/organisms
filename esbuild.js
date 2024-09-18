import { build } from 'esbuild';

build({
  entryPoints: ['src/organisms.js'],
  outdir: 'dist',
  bundle: true,
  sourcemap: true,
  minify: true,
  splitting: true,
  format: 'esm',  // Output format is ESM
  target: ['esnext'],
  external: ['@base-framework/base', '@base-framework/atoms']
})
.catch(() => process.exit(1));