# Auditoría de render — Fase 0 (reconocimiento)

Rama: `render-pbr` · Base: `24a7055` (main) · Fecha: 2026-10-15
Capturas «before»: `docs/render/before/` (generadas con `npm run capturas -- before`).

## 1. Stack detectado

| Aspecto | Resultado |
|---|---|
| Motor | Three.js **vanilla**, sin React Three Fiber |
| Versión | **r128** (`t.REVISION="128"`), *build* UMD minificada **incrustada** en `index.html:223-230` |
| Bundler | Ninguno. No había `package.json`; todo el juego es un único `index.html` de 880 KB |
| Cómo se sirve | Archivo estático en GitHub Pages (`.github/workflows/publicar.yml`). El README promete que también funciona **abriendo el HTML con doble clic, sin internet** |
| Verificación de CI | `tools/verificar.mjs`: comprueba la sintaxis de los `<script>`, exige que no haya scripts externos y busca la cadena «Three.js r128» |
| Post-proceso | **Ninguno** (sin EffectComposer ni pmndrs/postprocessing) |
| Script de juego | `<script>` clásico (no módulo), `index.html:232-2955`, con variables globales |

**Restricción importante para el plan:** desde r160 three ya no publica la *build* UMD (`three.min.js`); solo se distribuye como módulos ES. Chromium **bloquea los módulos ES por `file://`**, así que pasar a un import map rompería el «doble clic sin internet». Por eso propongo un *bundler* (esbuild) que vuelva a generar **un único HTML autocontenido** (ver §7).

## 2. Mapa de archivos y subsistemas

Todo está en `index.html`. Las líneas son las de la base `24a7055`.

| Subsistema | Líneas |
|---|---|
| Datos (ligas, estrellas, historial) | 258-1040 (`LEAGUES` 258, `STAR_DB` 926) |
| Parche de color global (`setHex` y `CanvasTexture`) | 541-543 |
| Renderer, sombras y tone mapping | 545-549 |
| Escena, niebla y cámara | 550-555 |
| Luces (hemisférica, ambiente, sol, relleno, contraluz) | 559, 570-575 |
| Entorno IBL procedural (PMREM `fromScene`) | 561-569 |
| Césped (textura de canvas) | `pitchTexture` 578, malla 603 |
| Grada (textura de ruido de píxeles) | `crowdTexture` 606, `stand()` 632 |
| LED y paneles | `paintLED` 623, `boards` 648 |
| Torres de focos, halos y *sprites* | 643 |
| Porterías y balón | 654, 667 |
| Jugador: texturas (camiseta, cara, pelo) | 697-802 |
| Jugador: geometría y vestido (`makeFigure`/`dressFigure`) | 803-860 |
| Plantillas y estrellas | 893-1040 |
| Etiquetas y cursor | `updateTags` 1068 |
| Animación procedural (golpeos, carrera) | `KICKS` 1091, `animFigures` 1174 |
| Motor de momentos (colocación, cámara, vuelo del balón) | `layoutScene` 1240, `runMoment` 1368, `updateMoment` 1741 |
| Vista previa (hub/creador) | `setPreview` 1785 |
| Ceremonias 3D (trofeos, confeti, fuegos, conos) | `CER` 1806, `ceremony` 1850, `cerStep` 1899 |
| Modo retrato 16:9 (conos volumétricos, polvo) | `CINE` 1935, `portrait` 1948, `cineStep` 1993 |
| Bucle de render | `frame` 2016 (un solo `renderer.render` y `requestAnimationFrame`) |
| Lógica de carrera y partidos (sin render) | `S` 2043, `playMatch` 2071, `clubSeason` 2330, `seasonEnd` 2656, `careerLoop` 2796 |

**Acoplamiento simulación/render:** la carrera (`playMatch`, ligas, fichajes, guardado) **no toca el render**. El motor de momentos sí: mueve directamente `FIGS[i].position` y las articulaciones del objeto que devuelve `makeFigure()`. Esas articulaciones son `userData.legL/legR/kneeL/kneeR/armL/armR/upper/hair/mats`. Por eso el punto de corte natural es una capa **`PlayerView`** que exponga esa misma API de articulaciones (pivotes y rotaciones), tanto para el muñeco actual como para un futuro modelo con huesos. Ni los momentos ni la carrera tienen que cambiar.

## 3. Prueba de red (`curl -sI`, timeout 8 s)

| Dominio | Resultado |
|---|---|
| registry.npmjs.org | ✅ 200 (three más reciente: **0.186.1**) |
| raw.githubusercontent.com | ✅ responde (túnel 200) |
| cdn.jsdelivr.net | ❌ **bloqueado** (proxy 403) |
| unpkg.com | ❌ **bloqueado** (proxy 403) |
| api.polyhaven.com | ❌ **bloqueado** (proxy 403) |
| dl.polyhaven.org | ❌ **bloqueado** (proxy 403) |
| ambientcg.com | ❌ **bloqueado** (proxy 403) |

Consecuencias:
- No se puede descargar ningún HDRI, textura PBR CC0 ni personaje desde Poly Haven o ambientCG. No voy a buscar espejos para rodear el bloqueo.
- Todo lo de npm sí está disponible: three con *addons*, decoders de Draco/Meshopt/Basis, `@gltf-transform/cli`, esbuild y Playwright.
- Para habilitar los dominios bloqueados: ajustes del entorno en la nube → *Network access* → añadirlos en *Allowed domains* (<https://code.claude.com/docs/en/cloud-environments#network-access>). Si no, los assets se descargan a mano siguiendo `ASSETS.md` (fase 4).

## 4. Causas del «lavado» de color

Medición directa: material sin luz (`MeshBasicMaterial`) con el color de cada kit, leído con `readPixels`.

| Color autorizado | Pipeline actual (ACES, exp. 1.1) | Sin tone mapping |
|---|---|---|
| Barça granate `#a50044` | `#ba003f` | `#a50044` ✅ |
| Liverpool `#c8102e` | `#dd002a` | `#c8102e` ✅ |
| Blanco `#ffffff` | **`#e5e5e5`** (blanco gris) | `#ffffff` ✅ |
| Dortmund `#fde100` | **`#e8dc5e`** (desaturado) | `#fde100` ✅ |
| Césped `#33943f` | `#39a945` | `#33943f` ✅ |

Medición en las capturas iluminadas:
- **Retrato:** las rayas granate (`#a50044`) salen **`#f03860`, es decir, rosa**.
- **Cuerpo frontal con la luz normal:** el granate sale **`#501018`** (oscuro).
- **Césped de primer término:** sale **`#5ec160`** (pastel) frente a `#2a8238`/`#33943f`.

| Hipótesis | Veredicto | Evidencia |
|---|---|---|
| (a) ACES desatura y desplaza tonos | ✅ **CONFIRMADA** | `index.html:549` (`ACESFilmicToneMapping`, exp. 1.1). Con luz sobreexpuesta lleva el granate hacia el rosa y grisea los blancos y amarillos, como muestran las tablas. En el retrato se suma `toneMappingExposure = 1.2` (`index.html:1967`) y un foco de intensidad 3.2 en unidades heredadas (`index.html:1954`) |
| (b) CanvasTexture sin sRGB, codificada dos veces | ❌ **DESCARTADA en el estado actual** | `index.html:543` fuerza `encoding = sRGBEncoding` en todas las CanvasTexture y `index.html:549` usa `outputEncoding = sRGBEncoding`. **Sí era cierta antes del commit `24a7055`**. Riesgo: es un parche global (monkey-patch) frágil |
| (c) Colores definidos «a ojo» en sRGB e interpretados como lineales | ❌ **DESCARTADA** | No hay ningún `setRGB` ni `fromArray`. Todos los colores son hex y pasan por `setHex`, que el parche de `index.html:542` convierte de sRGB a lineal. Riesgo: el parche altera todo `THREE.Color` de forma global, incluidos los colores de vértice (correcto) y `new THREE.Color(hex)` |
| (d) Gamma o tone mapping duplicados en el post-proceso | ❌ **DESCARTADA** | No hay post-proceso (0 coincidencias de EffectComposer, OutputPass o GammaCorrection) |
| (e) **Nueva:** relleno plano excesivo | ✅ **CONFIRMADA** | Hemisférica 0.5 + ambiente 0.2 (`index.html:559`), más IBL con suelo verde (`index.html:563`) y `envMapIntensity` 0.7-1.6 en los jugadores (`index.html:806-808`). Levanta las sombras, quita contraste y tiñe la piel de verde |
| (f) **Nueva:** unidades de luz heredadas | ✅ **CONFIRMADA** | r128 sin `physicallyCorrectLights`: las intensidades (0.8, 3.2, 2.4…) son arbitrarias y no se pueden calibrar físicamente |
| (g) **Nueva:** mezcla de modelos de iluminación | ✅ **CONFIRMADA** | Césped y grada usan Lambert (`index.html:603, 634`) y no reciben IBL; los jugadores usan Standard (`index.html:806-808`) y las ceremonias Phong (`index.html:1808-1868`). Responden distinto a la misma luz |
| (h) **Nueva:** ruido en las texturas de canvas | ✅ **CONFIRMADA** | El grano del césped (`index.html:585-588`) y la grada de píxeles aleatorios (`index.html:606-613`, 1024×256 repetida) dan *aliasing* y parpadeo. La trama de 1-2 px de la camiseta (`WEAVE`, `index.html:781`) da *moiré* porque se usa como *bump* sin mipmaps adecuados |

## 5. Inventario de geometría primitiva (`index.html`, sin contar three)

| Elemento | Primitivas actuales |
|---|---|
| Cabeza | `SphereGeometry` escalada; cara pintada en canvas; nariz = `BoxGeometry`; ojos = 2 esferas (803-845) |
| Pelo | Casquetes de `SphereGeometry`, `IcosahedronGeometry`, `BoxGeometry` (787-802) |
| Torso, cuello, brazos, piernas | `CylinderGeometry` rígidos; hombros y rodillas = esferas; **sin skinning**. Las tapas del torso se ven como una lata y los brazos atraviesan el torso |
| Manos, guantes | Esferas escaladas |
| Botas | `BoxGeometry` + media esfera |
| Estadio | Gradas = `PlaneGeometry` con textura de ruido; techos, LED y paneles = `BoxGeometry` |
| Focos | `CylinderGeometry` + `BoxGeometry` emisiva + `Sprite` aditivo |
| Porterías | `CylinderGeometry` + `LineSegments` |
| Balón | `SphereGeometry` con canvas |
| Trofeos | `LatheGeometry` y `TorusGeometry` con Phong |
| Conos volumétricos | `ConeGeometry` aditivo de bordes duros (retrato 1960, ceremonias 1873, cursor 1063) |
| Partículas | `PointsMaterial` (confeti 1839 sin textura; el polvo del retrato 1965 ya usa `glowTex`) |

**Recuento por figura:** unas 29 mallas (ojos y guantes incluidos). Un momento de partido tiene 20 figuras.

## 6. `renderer.info` — before (SwiftShader, 1280×720, incluye la pasada de sombras)

| Plano | Draw calls | Triángulos | Texturas | Geometrías | Programas |
|---|---|---|---|---|---|
| Retrato primer plano | 120 | 7 812 | 30 | 110 | 24 |
| Cuerpo frontal | 130 | 8 032 | 30 | 105 | 14 |
| Espalda con dorsal | 131 | 8 434 | 30 | 106 | 14 |
| Plano general (jugada) | **868** | 68 572 | 56 | 421 | 15 |

Las 868 draw calls del plano general vienen de 20 figuras × ~29 mallas, dibujadas dos veces (color y sombra). Es el primer cuello de botella previsible en un portátil medio, antes que los triángulos. **Aquí no se miden fps:** el render por software no es representativo.

## 7. Plan por fases y riesgos

**Decisión previa necesaria (D1): cómo cargar three moderno.** Hay dos opciones:
- **(A, recomendada)** Pasar el juego a módulos con `three@0.186.1` desde npm y **esbuild** para generar `dist/index.html` en un único archivo autocontenido. Se mantienen GitHub Pages y el doble clic sin internet. CI pasa a ejecutar `npm ci && npm run build && npm run verificar`.
- **(B)** Import map con `node_modules/three` servido localmente. Es más sencillo, pero **rompe el doble clic** (`file://` bloquea los módulos ES) y obliga a usar un servidor.

| Fase | Contenido | Riesgos |
|---|---|---|
| 1. Color | Actualizar r128 → r186 (opción A). `ColorManagement` nativo: se eliminan los parches de `setHex` y `CanvasTexture`. `outputColorSpace = SRGBColorSpace`, `NeutralToneMapping` (AgX y ACES quedan en ajustes), exposición 1.0 calibrable. `colorSpace` explícito: las texturas de color en sRGB y las de datos en NoColorSpace. Señal `window.__escenaLista`, `?debug=color` con muestras de kit y `?stats=1` | **Cambios incompatibles de r128 → r186:** `outputEncoding`/`encoding` pasan a `colorSpace`; luces físicas obligatorias (desaparece `useLegacyLights` en r165), así que hay que recalibrar **todas** las intensidades (las puntuales y focos ×π aprox., con `decay = 2`); se elimina la build UMD; cambios en los *shader chunks* para `onBeforeCompile`. El juego entero tiene que pasar a módulo, con las globales intactas para no tocar la lógica |
| 2. Luz e IBL | Entorno procedural permanente con paneles emisivos en los focos reales. Sol y focos con PCFSoft 2048-4096, frustum ajustado o CSM, `bias`/`normalBias` calibrados. Sombras de contacto. Conos con *fresnel* y *depth fade*. Polvo con *sprites* suaves | Coste de CSM en móvil (va por preset). **HDRI de Poly Haven bloqueado**: solo procedural mientras no se habilite el dominio |
| 3. Césped y estadio | Césped PBR procedural (albedo, normal y rugosidad en dos escalas, franjas en el shader, anisotropía máxima). Público con `InstancedMesh` de impostores. Estructura de hormigón y metal PBR. Cielo con gradiente | **ambientCG y Poly Haven bloqueados**: texturas procedurales cableadas a `assets/manifest.json` para cambiarlas después. La densidad de público depende del preset |
| 4. Jugadores GLB | `AssetManager` + manifest, GLTFLoader con Draco, Meshopt y KTX2 (decoders locales desde npm). `PlayerView` con la misma API de articulaciones. Kits con MeshPhysical (sheen) y patrones por máscara. Piel con *wrap lighting*. Pelo con *cards* | **No hay ningún modelo con licencia válida accesible** (Quaternius, MakeHuman y Mixamo fuera de npm, o con login). Queda todo cableado con *fallback* al muñeco actual y la lista exacta en `ASSETS.md`. Las animaciones actuales son procedurales: con un rig hará falta retargeting o un adaptador de poses a huesos |
| 5. Post-proceso | RenderPass con MSAA 4 y HalfFloat → GTAO → Bloom sutil → SMAA si no hay MSAA → OutputPass. En el retrato, además, Bokeh y viñeta | Coste en móviles y en SwiftShader (las capturas se harán con el preset Medium; el retrato también en High) |
| 6. Rendimiento | Presets Low/Medium/High/Ultra con autodetección. Reducir draw calls: fusionar las mallas estáticas del jugador por material o usar `InstancedMesh`, y LOD | La fusión de mallas obliga a mantener los pivotes animables. Los fps reales los tienes que medir tú con GPU (`?stats=1`) |

**Reglas que respeto en todas las fases:** no se toca la lógica de simulación, carrera ni guardado (`leyenda_carrera_v1`); todo asset tiene *fallback* con aviso en consola; un commit y un push por fase en `render-pbr`; las capturas «after» usan los mismos planos (`tools/render/capturas.mjs`).

## 8. Otros hallazgos

- El commit `24a7055` metió por error 4 capturas en `shots/` en la raíz del repo, por un directorio de trabajo equivocado. **Se eliminan en esta fase.** Las capturas van ahora a `<raíz>/docs/render/{before,after}`, calculando la raíz con `git rev-parse --show-toplevel`.
- Los tests de capturas anteriores vivían fuera del repo. Ahora están en `tools/render/capturas.mjs`, con Playwright fijado por npm (`playwright@1.56.1`, que coincide con el Chromium preinstalado).
