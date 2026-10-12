// Verifica el juego antes de publicarlo: sintaxis del JavaScript y que no dependa de librerías externas.
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const errores = [];

const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
if (scripts.length === 0) errores.push('No se encontró ningún <script> en index.html');
if (/<script[^>]+src=/.test(html)) errores.push('index.html carga scripts externos; el juego debe funcionar sin conexión');
if (!html.includes('Three.js r128')) errores.push('Falta Three.js incluido en el archivo');

const dir = mkdtempSync(join(tmpdir(), 'leyenda-'));
scripts.forEach((m, i) => {
  const f = join(dir, `script-${i}.js`);
  writeFileSync(f, m[1]);
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); }
  catch (e) { errores.push(`Error de sintaxis en el <script> nº ${i + 1}:\n${e.stderr}`); }
});

if (errores.length) { console.error('❌ Verificación fallida:\n' + errores.join('\n')); process.exit(1); }
console.log(`✅ Juego verificado: ${scripts.length} scripts sin errores de sintaxis, ${(html.length / 1024).toFixed(0)} KB.`);
