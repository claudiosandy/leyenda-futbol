// Capturas de verificación del render (mismos planos antes y después).
// Uso: node tools/render/capturas.mjs before|after [preset]   (preset por defecto: high; la autodetección daría low en SwiftShader)
// Con un preset distinto de high se añade además el retrato en high (retrato_primer_plano_high.png).
// Sin GPU: Chromium usa SwiftShader. Las imágenes sirven para juzgar el aspecto, no el rendimiento.
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const fase = process.argv[2] || 'after';
const preset = process.argv[3] || 'high';
const root = execSync('git rev-parse --show-toplevel').toString().trim();
const out = join(root, 'docs', 'render', fase);
mkdirSync(out, { recursive: true });
const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--use-gl=angle'] });

const PLANOS = {
  // Primer plano del modo retrato cinematográfico (equipación a rayas para juzgar el granate)
  retrato_primer_plano: () => { newCareer(LEGENDS.cr7, 'carrera'); S.club = 'Barcelona'; S.ovr = 92; S.look.beard = true; portrait(); CINE.shot = 0; CINE.t = 0; for (let k = 0; k < 220; k++) cineStep(1 / 60); },
  // Cuerpo entero de frente y de espaldas con la iluminación normal del estadio
  cuerpo_frontal: () => { newCareer(LEGENDS.cr7, 'carrera'); setPreview(S.look, kitFor('Barcelona'), 7); ui.classList.add('hidden'); player.rotation.set(0, 0, 0); camera.position.set(0, 1.05, 26 - 3.4); camera.lookAt(0, 0.95, 26); },
  espalda_dorsal: () => { newCareer(LEGENDS.cr7, 'carrera'); setPreview(S.look, kitFor('Barcelona'), 7); ui.classList.add('hidden'); player.rotation.set(0, Math.PI, 0); camera.position.set(0, 1.05, 26 - 3.4); camera.lookAt(0, 0.95, 26); },
  // Plano general con una jugada colocada (sin HUD)
  plano_general: () => {
    newCareer(LEGENDS.cr7, 'carrera'); S.cur = { apps: 0, g: 0, a: 0, ncaps: 0, ng: 0, na: 0, titles: [], log: [], finalG: 0, lg: 0, bonus: 0, inj: 0, extra: 0 };
    const sp = buildSpec({ us: { name: 'Barcelona', s: 88 }, them: { name: 'Real Madrid', s: 88 }, comp: 'LaLiga', stage: 'Jornada 10' }, 0, 0, 70);
    sp.type = 'jugada'; sp.timer = 8; runMoment(sp); endIntro();
    document.querySelector('#hud').classList.add('hidden'); document.querySelectorAll('.ptag,.mlabel').forEach(e => e.classList.add('hidden'));
    camera.position.set(-24, 15, 50); camera.lookAt(0, 0, 14);
    // como en el juego: un par de fotogramas de animación aplican el LOD de los muñecos
    if (typeof animFigures === 'function') { for (let i = 0; i < 3; i++) animFigures(1 / 60); camera.position.set(-24, 15, 50); camera.lookAt(0, 0, 14); }
  },
};
const info = { preset };
const TRABAJOS = Object.entries(PLANOS).map(([n, fn]) => [n, fn, preset]);
if (preset !== 'high') TRABAJOS.push(['retrato_primer_plano_high', PLANOS.retrato_primer_plano, 'high']);
for (const [nombre, fn, pre] of TRABAJOS) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  // Controlamos el bucle de render para que las capturas sean deterministas
  await page.addInitScript(() => { const raf = window.requestAnimationFrame; window.__manual = false; window.requestAnimationFrame = cb => window.__manual ? 0 : raf(cb); });
  await page.goto('file://' + join(root, 'index.html') + '?preset=' + pre, { timeout: 60000 });
  // Señal de «escena lista» si existe; si no (versión antigua), esperar a las fuentes y a dos fotogramas
  await page.waitForFunction(() => window.__escenaLista === true || (typeof renderer !== 'undefined' && document.fonts.status === 'loaded'), null, { timeout: 60000 });
  await page.waitForTimeout(800);
  await page.evaluate(`window.__manual = true; (${fn.toString()})();`);
  const datos = await page.evaluate(() => { renderer.info.autoReset = false; renderer.info.reset(); if (typeof renderFrame === 'function') renderFrame(); else renderer.render(scene, camera); const i = renderer.info; return { drawCalls: i.render.calls, triangulos: i.render.triangles, texturas: i.memory.textures, geometrias: i.memory.geometries, programas: (i.programs || []).length }; });
  await page.screenshot({ path: join(out, nombre + '.png'), timeout: 60000 });
  info[nombre] = { ...datos, errores: errs };
  console.log(nombre, JSON.stringify(info[nombre]));
  await page.close();
}
// Panel ?debug=color (solo existe desde la fase 1)
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('file://' + join(root, 'index.html') + '?debug=color', { timeout: 60000 });
  const ok = await page.waitForFunction(() => Array.isArray(window.__debugColor), null, { timeout: 30000 }).then(() => true, () => false);
  if (ok) { await page.screenshot({ path: join(out, 'debug_color.png') }); info.debug_color = await page.evaluate(() => window.__debugColor); console.log('debug_color OK'); }
  await page.close();
}
// Autoprueba del pipeline GLB (humanoide sintético generado en memoria; solo desde la fase 4)
for (const nombre of ['cuerpo_frontal', 'plano_general']) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.addInitScript(() => { const raf = window.requestAnimationFrame; window.__manual = false; window.requestAnimationFrame = cb => window.__manual ? 0 : raf(cb); });
  await page.goto('file://' + join(root, 'index.html') + '?selftest=glb&preset=' + preset, { timeout: 60000 });
  const ok = await page.waitForFunction(() => window.__glbListo && window.__escenaLista, null, { timeout: 60000 }).then(() => true, () => false);
  if (!ok) { await page.close(); continue; }
  await page.evaluate(`window.__manual = true; (${PLANOS[nombre].toString()})(); if (typeof animFigures === 'function') for (let i = 0; i < 20; i++) animFigures(1 / 60);`);
  const datos = await page.evaluate(() => { renderer.info.autoReset = false; renderer.info.reset(); if (typeof renderFrame === 'function') renderFrame(); else renderer.render(scene, camera); const i = renderer.info; return { drawCalls: i.render.calls, triangulos: i.render.triangles, glb: window.__glbListo }; });
  await page.screenshot({ path: join(out, nombre + '_glb_sintetico.png') });
  info[nombre + '_glb_sintetico'] = datos; console.log(nombre + '_glb_sintetico', JSON.stringify(datos));
  await page.close();
}
writeFileSync(join(out, 'renderer-info.json'), JSON.stringify(info, null, 2));
await browser.close();
