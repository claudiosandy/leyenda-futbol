// Genera index.html autocontenido (funciona en GitHub Pages y con doble clic sin internet):
// src/index.html + three (npm) empaquetado con esbuild en un <script> clásico incrustado.
// Uso: node tools/build.mjs            → escribe index.html
//      node tools/build.mjs --check    → falla si index.html no está al día con src/
import { build } from 'esbuild';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const root = execSync('git rev-parse --show-toplevel').toString().trim();
// Marca en assets/manifest.json qué assets existen de verdad, para que el juego no pida archivos ausentes (sin 404 en consola)
{
  const mp = join(root, 'assets/manifest.json'), man = JSON.parse(readFileSync(mp, 'utf8')); let n = 0;
  for (const sec of ['textures', 'hdri', 'models']) for (const e of Object.values(man[sec] || {})) { e.disponible = existsSync(join(root, e.url)); if (e.disponible) n++; }
  const txt = JSON.stringify(man, null, 2) + '\n';
  if (process.argv.includes('--check')) { if (readFileSync(mp, 'utf8') !== txt) { console.error('❌ assets/manifest.json no está al día: ejecuta npm run build'); process.exit(1); } }
  else writeFileSync(mp, txt);
  console.log(`assets disponibles: ${n}`);
}
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
