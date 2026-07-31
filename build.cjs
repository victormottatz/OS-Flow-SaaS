require('esbuild').build({
  entryPoints: ['server.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: 'dist/server.cjs',
  external: ['@prisma/client', 'sharp', 'vite', 'pdfjs-dist', 'pdfjs-dist/*'],
  banner: {}
}).then(r => console.log('Build OK:', r)).catch(e => { console.error('Build failed:', e); process.exit(1); });
