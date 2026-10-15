// Comprime los modelos glTF/GLB de assets/models con gltf-transform:
//  - geometría: meshopt (el juego trae MeshoptDecoder; Draco también está soportado)
//  - texturas: KTX2 si está instalado `toktx` (KTX-Software); si no, WebP como respaldo
// Uso: npm run assets:comprimir            → genera <nombre>.min.glb junto a cada original
// Después, apunta "url" en assets/manifest.json al .min.glb y ejecuta npm run build.
import { execFileSync, execSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = execSync('git rev-parse --show-toplevel').toString().trim();
const dir = join(root, 'assets/models');
const tieneToktx = (() => { try { execSync('toktx --version', { stdio: 'ignore' }); return true; } catch { return false; } })();
const cli = join(root, 'node_modules/.bin/gltf-transform');
const archivos = [];
(function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(glb|gltf)$/i.test(f) && !/\.min\.glb$/i.test(f)) archivos.push(p); } })(dir);
if (!archivos.length) { console.log('No hay modelos en assets/models (ver ASSETS.md).'); process.exit(0); }
console.log(`Texturas: ${tieneToktx ? 'KTX2 (toktx)' : 'WebP (toktx no instalado)'}`);
for (const f of archivos) {
  const out = f.replace(/\.(glb|gltf)$/i, '.min.glb');
  execFileSync(cli, ['optimize', f, out, '--compress', 'meshopt', '--texture-compress', tieneToktx ? 'ktx2' : 'webp', '--texture-size', '2048'], { stdio: 'inherit' });
  const mb = statSync(out).size / 1048576;
  console.log(`${mb < 25 ? '✅' : '❌ supera 25 MB:'} ${out} (${mb.toFixed(2)} MB)`);
}
