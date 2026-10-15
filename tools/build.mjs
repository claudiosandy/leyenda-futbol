// Genera index.html autocontenido (funciona en GitHub Pages y con doble clic sin internet):
// src/index.html + three (npm) empaquetado con esbuild en un <script> clásico incrustado.
// Uso: node tools/build.mjs            → escribe index.html
//      node tools/build.mjs --check    → falla si index.html no está al día con src/
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const root = execSync('git rev-parse --show-toplevel').toString().trim();
const pkg = JSON.parse(readFileSync(join(root, 'node_modules/three/package.json'), 'utf8'));
const res = await build({ entryPoints: [join(root, 'src/three-entry.js')], bundle: true, format: 'iife', minify: true, write: false, target: 'es2020', legalComments: 'inline', logLevel: 'warning' });
const js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const tpl = readFileSync(join(root, 'src/index.html'), 'utf8');
if (!tpl.includes('<!--@THREE@-->')) throw new Error('Falta el marcador <!--@THREE@--> en src/index.html');
const rev = pkg.version.split('.')[1];
const html = tpl
  .replace('<!doctype html>', `<!doctype html>\n<!-- GENERADO por tools/build.mjs desde src/index.html — no editar a mano -->`)
  .replace('<!--@THREE@-->', () => `<script>/* Three.js r${rev} (${pkg.version}, MIT) empaquetado con esbuild para funcionar sin conexión */\n${js}</script>`);
const out = join(root, 'index.html');
if (process.argv.includes('--check')) {
  if (readFileSync(out, 'utf8') !== html) { console.error('❌ index.html no está al día: ejecuta npm run build'); process.exit(1); }
  console.log('✅ index.html al día con src/');
} else { writeFileSync(out, html); console.log(`✅ index.html generado (three r${rev}, ${(html.length / 1024).toFixed(0)} KB)`); }
