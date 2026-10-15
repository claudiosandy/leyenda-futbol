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

---

# Fase 1 — Pipeline de color (hecha)

**Decisión D1 = A.** `three@0.186.1` desde npm + esbuild. La fuente está en `src/index.html` y `npm run build` genera `index.html`, autocontenido (1 MB). El script del juego sigue siendo clásico, con las mismas variables globales, y three se expone como `window.THREE` (`src/three-entry.js`). La lógica de simulación no se ha tocado.

## Cambios
| Archivo | Cambio |
|---|---|
| `src/index.html` | Se eliminan los parches globales de `setHex` y `CanvasTexture`. `ColorManagement.enabled`, `outputColorSpace = SRGBColorSpace` y **NeutralToneMapping** por defecto; AgX, ACES y sin tone mapping quedan como opción (`?tonemap=`, `?exposure=`, `setRender()`, guardado en `localStorage`). `colorSpace` explícito: texturas de color en sRGB (campo, grada, LED, halos, balón, camisetas, caras) y de datos en `NoColorSpace` (trama, poros, sudor). Luces en **unidades físicas**: direccionales, hemisférica y ambiente ×π; focos y puntuales convertidos a candelas con `decay = 2` (`legacyCd`). Menos relleno plano. `toneMapped: false` en la retícula, los aros y el cursor. PCFShadowMap con `radius` y `normalBias` (PCFSoft ya no existe en r186). Señal `window.__escenaLista`, `?stats=1`, `?debug=color` |
| `src/three-entry.js` | Entrada de esbuild: `window.THREE = {...three, addons: {}}` |
| `tools/build.mjs` | Genera `index.html`; con `--check`, CI falla si no está al día |
| `tools/verificar.mjs` | Acepta cualquier `Three.js rNNN` incrustado |
| `.github/workflows/publicar.yml` | `npm ci` + `npm run check` antes de publicar |

## Verificación de color (`?debug=color`, `__debugColor`)
| Tone mapping | Δ medio / máx, muestras sin luz | Granate `#a50044` con luz | Amarillo `#fde100` con luz | Blanco con luz |
|---|---|---|---|---|
| none | **0 / 0** (no hay doble conversión) | `#a41b49` | `#fade1b` | `#fcfcfc` |
| **neutral (por defecto)** | ≈12 / 31 · **tono ≤ 2°** | `#a20243` | `#efd51b` | `#efefef` |
| agx | 42 / 112 | `#a93c57` (rosado) | `#cbbb71` | `#c9c9c9` |
| aces | 22 / 86 | `#b10041` | `#e4d85a` | `#e1e1e1` |

Neutral conserva el tono de todos los kits: desplazamiento máximo de 2°. Lo único que hace es comprimir ligeramente los extremos (blancos a `#f0f0f0` y casi negros a `#010101`), por diseño.

En las capturas (mismos planos):
- Granate del retrato: `#f03860` → **`#a80840`**.
- Césped de primer término: `#5ec160` (pastel) → `#1da437`. Ahora está **demasiado saturado**: lo calibro en las fases 2 y 3.
- El pecho del jugador queda en sombra en el plano frontal, porque el sol está detrás: se corrige con la iluminación de la fase 2.

## renderer.info (SwiftShader, incluye la pasada de sombras)
| Plano | before calls / tris | fase 1 calls / tris |
|---|---|---|
| Retrato | 120 / 7 812 | 123 / 7 812 |
| Frontal | 130 / 8 032 | 129 / 7 952 |
| Plano general | 868 / 68 572 | 934 / 72 882 |

El plano general sube por la cámara de sombras de r186, que procesa más objetos en el frustum. El problema de draw calls se ataca en la fase 6.

---

# Fase 2 — Iluminación de estadio e IBL (hecha)

- **Torres de focos:** cuatro torres en las esquinas (`TOWERS`). La delantera derecha es la **luz dominante** con sombras: PCF con `radius = 3`, mapa de 2048 y frustum ajustado al campo (96×80 m vistos desde la torre), `bias = -0.0003` y `normalBias = 0.035`. En las capturas de cerca no hay acné ni peter-panning. Las otras tres iluminan sin sombras, así que el jugador nunca queda totalmente a contraluz. Intensidades físicas: dominante 1.05π; las demás 0.30-0.36π; hemisférica 0.16π; ambiente 0.
- **IBL procedural permanente:** cielo con gradiente y resplandor en el horizonte, grada oscura, césped y **cuatro paneles HDR** (×24) en la posición real de los focos, pasados por `PMREMGenerator.fromScene`. `scene.environmentIntensity = 0.9`. HDRI de Poly Haven: **dominio bloqueado**; queda como opción de calidad alta en el manifest (fase 4).
- **Sombras de contacto:** cada figura lleva una textura radial suave bajo los pies, que se queda pegada al suelo al saltar y encoge con la altura. El balón usa la misma.
- **Conos volumétricos:** `volumeMaterial()`, un ShaderMaterial con fresnel (los bordes se desvanecen), degradado a lo largo del haz y fundido al acercarse al suelo. Usa valores HDR y pasa por tone mapping. Lo usan el retrato y las ceremonias. *Depth fade* exacto contra la escena: pendiente de la textura de profundidad de la fase 5.
- **Polvo:** de 500 a 220 *sprites* redondos con atenuación por tamaño, niebla y opacidad 0.35.

Pendiente de la fase 3: el césped y la grada siguen siendo texturas de canvas saturadas o ruidosas (césped `#1b9c30`).

---

# Fase 3 — Césped y estadio (hecha)

- **Césped PBR procedural:** albedo de briznas (512 px), mapa de normales generado a partir del de alturas y mapa de rugosidad. Repetición en losetas de 2,6 m, con **segunda escala** del albedo a unos 11 m y **variación macro** a unos 60 m para romper la repetición. El shader (`onBeforeCompile`) añade las **franjas de corte** cada 5,25 m (variando albedo y rugosidad), con anisotropía máxima. Las **líneas y el desgaste** van en una capa con transparencia (16 px/m) que el mismo shader mezcla: no hay mallas superpuestas, así que no hay z-fighting.
- **Grada:** el ruido de píxeles pasa a ser **público instanciado** (`InstancedMesh`, 1 draw call). Impostores con un atlas procedural de 8 siluetas (camiseta, cabeza, sombreado y recorte), con color de camiseta y de piel por instancia, `alphaToCoverage` y mipmaps. Animación sutil por vértice que se convierte en saltos tras un gol o en las ceremonias. La densidad depende del preset (`QUALITY.crowd`: low 0.25 · medium 0.5 · high 0.8 · ultra 1; unas 13 000 personas en High).
- **Estructura:** gradas de hormigón PBR con textura procedural, muros, techos de metal y tiras de luz en HDR para el bloom.
- **Cielo:** cúpula con gradiente nocturno y resplandor del estadio en el horizonte.
- **Assets opcionales:** `assets/manifest.json` (texturas de césped y hormigón, HDRI). El build marca `disponible` según si el archivo existe, y el juego solo pide los disponibles: no hay 404 en consola. Si un asset falla, se avisa y se usa el procedural. Con `file://` siempre se usa lo procedural, porque Chrome no deja usar archivos locales como texturas WebGL. El deploy publica también `assets/`.

**renderer.info en High** (plano general): 948 draw calls y 125 000 triángulos. El público suma unos 26 000 triángulos en 1 draw call.

---

# Fase 4 — Futbolistas: materiales, pelo, LOD y pipeline de modelos (hecha)

- **Kits:** `kitMaterial()` es un `MeshPhysicalMaterial` con *sheen* de tela (0.6, rugosidad de sheen 0.72), mapa de normales de tejido de 64 px con mipmaps (repetición 26×14) y patrón en el shader según el espacio del objeto: liso, rayas, bastones, banda, V, mitades, aros, etc. (`PATTERN_ID`). Dorsal, nombre, escudo genérico y marca genérica van en una `CanvasTexture` sRGB proyectada como calca en la caja del torso (`uBox`). El cuello en V y el bajo solo están en el torso, no en las mangas.
- **Piel:** `skinMaterial()` es un `MeshPhysicalMaterial` con rugosidad 0.52, poros (bumpMap), rugosidad de sudor y `specularIntensity` 0.6. Sustituye el chunk de difusa directa por *wrap lighting* (0.4) más un tinte rojizo de dispersión subsuperficial barata. El tono sale de los datos del jugador.
- **Pelo:** tiras de malla (*cards*) sobre el elipsoide de la cabeza, con `alphaMap`, `alphaTest` 0.35 y `alphaToCoverage`. Hay 8 estilos más «calvo», con geometría en caché. Ya **no se usan esferas**.
- **Cuerpo:** torso con `LatheGeometry` (hombros, pecho y cintura), deltoides, brazos unidos al hombro, nariz y cuencas de ojos 3D en lugar de ojos pintados.
- **LOD:** a más de 26 m de la cámara se ocultan los detalles (`updateLOD`).
- **Pipeline de modelos** (`AM` y `PlayerView`): GLTFLoader con Draco, KTX2 (transcodificador Basis) y Meshopt, con decodificadores servidos en local (`assets/decoders/`, los copia el build). `SkeletonUtils.clone` por figura y *bounding sphere* del SkinnedMesh ampliada para que no se recorte. Los materiales se asignan por nombre según el manifest. Los clips idle/run/sprint/kick/celebrate se mezclan con *crossfade* de 0.2 s según la velocidad y el estado que ya calcula la simulación: solo se lee, no se modifica. El golpeo se alinea con el instante de contacto. Si falta un clip, un adaptador copia la pose procedural a los huesos.
- **HDRI opcional:** si el manifest lo marca como disponible y el preset es High o Ultra, se carga con `HDRLoader` y PMREM. Probado con un `.hdr` sintético interceptado en Playwright (sin commitear): se carga y, con un 404, se avisa y se sigue con el entorno procedural.
- **Autoprueba `?selftest=glb`:** genera en memoria un humanoide con skin y 3 clips (sin «kick», para forzar el adaptador), lo exporta a GLB con GLTFExporter y lo carga por el camino real. Resultado: 9/9 huesos mapeados y los clips idle, run y celebrate. Capturas en `*_glb_sintetico.png`. Ese GLB (73 KB) pasa por `npm run assets:comprimir`: meshopt reduce el archivo a 19 KB.
- **Assets:** no se incluye ningún binario. `ASSETS.md` lista los archivos exactos (origen, licencia, destino y tamaño máximo).

**renderer.info en High:**

| Plano | Fase 3 | Muñeco fase 4 | GLB sintético |
|---|---|---|---|
| Retrato | — | 99 / 60 012 | — |
| Frontal | — | 113 / 60 508 | 53 / 56 606 |
| Plano general | 883 / 118 984 | 720 / 128 400 | 187 / 97 380 |

Con el LOD bajan los draw calls; los triángulos suben por el pelo y el torso torneado. Un GLB con una sola malla por jugador reduce los draw calls unas 4 veces.

**Riesgos:**
- Los rigs reales pueden tener ejes de hueso distintos, y el adaptador puede girar al revés: se corrige con `ejeX` y `huesos` en el manifest.
- Con `file://` no se cargan texturas ni GLB externos: solo se usa lo procedural.
- Las texturas KTX2 sueltas (fuera del GLB) aún no se leen.

---

# Fase 5 — Posproceso (hecha)

**Cadena** (`POST` y `renderFrame()` en `src/index.html`):

`RenderPass` (HalfFloat, MSAA ×4 en WebGL2) → `GTAOPass` → `BokehPass` (solo retrato) → `UnrealBloomPass` → viñeta (solo retrato) → `SMAAPass` (solo sin MSAA) → `OutputPass`

- **Un solo punto de tone mapping.** Al dibujar en un render target, three no aplica tone mapping: la escena llega lineal y en HDR, y solo el `OutputPass` aplica `renderer.toneMapping`, la exposición y la conversión a sRGB. Comprobado por píxel: el kit sale igual con posproceso (High) que en render directo (Low). Camiseta `#911438` frente a `#901338`; césped `#2f5d1f` frente a `#305d1d`.
- **Interfaz 3D sin tone mapping:** la retícula y el cursor del jugador están en `UI_LAYER` y se dibujan después del `OutputPass` con `toneMapped:false`. Salen nítidos y con su color exacto, sin bloom ni AO. Los anillos del suelo siguen en la escena, porque necesitan la profundidad para quedar detrás de los pies.
- **GTAO:** usa la profundidad del propio RenderPass y reconstruye las normales a partir de ella, sin segunda pasada de geometría. En High trabaja a media resolución (`aoScale` 0.5) y en Ultra a resolución completa. *Bug de r186:* pasar `depthTexture` en el constructor falla porque `setGBuffer` lee `normalRenderTarget` antes de crearlo; por eso se crea el pass por defecto y luego se llama a `setGBuffer(depth)`.
- **Bloom:** umbral HDR 2.0, radio 0 y pesos de los mips bajos recortados (`[1, .7, .3, .1, .03]`): brillan los focos, las tiras de luz y los destellos, sin velo sobre la grada. Intensidad por preset: Medium 0.15, High 0.18, Ultra 0.2.
- **Retrato:** Bokeh con el foco a la distancia de la cara y viñeta propia multiplicativa. La `VignetteShader` de three mezcla hacia `1 - darkness`, lo que da valores negativos que el tone mapping Neutral convierte en un velo gris; con ese velo, los halos del desenfoque parecían puntos oscuros. El polvo y los haces se ocultan en la pasada de profundidad del Bokeh.
- **Sombras una vez por fotograma** aunque el Bokeh vuelva a dibujar la escena (`shadowMap.autoUpdate` se controla en `renderFrame`).
- `renderer.info.autoReset = false` y un reinicio por fotograma: `?stats=1` y las capturas suman todas las pasadas.
- **Presets:** Low dibuja sin posproceso, con el antialias del canvas. Medium usa SMAA y bloom, sin AO. High y Ultra usan MSAA ×4, GTAO y bloom. Si el posproceso falla al crearse, se avisa en consola y se dibuja en directo.

**renderer.info en High** (todas las pasadas del fotograma):

| Plano | Fase 4 | Fase 5 |
|---|---|---|
| Retrato | 99 / 60 012 | 169 / 114 456 (el Bokeh dibuja la profundidad de la escena otra vez) |
| Frontal | 113 / 60 508 | 131 / 60 764 |
| Plano general | 720 / 128 400 | 736 / 129 678 |

El posproceso añade unas 18 llamadas de pantalla completa. El coste real está en el *fill rate* (MSAA en HalfFloat, GTAO y mips del bloom): se mide con GPU y `?stats=1`, no aquí.

**Pendiente:** el *depth fade* exacto de los conos volumétricos contra la escena necesitaría una prepasada de profundidad. Por ahora mantienen el fundido por altura, sin artefactos visibles.

---

# Fase 6 — Presets de calidad y rendimiento (hecha)

| Preset | Pixel ratio máx. | Sombras | LOD | Público | Posproceso |
|---|---|---|---|---|---|
| Bajo | 1 | 1024 | 18 m | 25 % | ninguno (antialias del canvas) |
| Medio | 1,25 | 2048 | 22 m | 50 % | SMAA + bloom |
| Alto | 1,5 | 2048 | 26 m | 80 % | MSAA ×4 + GTAO (½ res.) + bloom |
| Ultra | 2 | 4096 | 34 m | 100 % | MSAA ×4 + GTAO + bloom |

El pixel ratio nunca supera el del dispositivo (`min(dpr, pr)`) y el radio de la sombra PCF escala con el mapa.

- **Selector:** menú principal → ⚙️ Gráficos. Cambiar el preset recarga el juego, porque el antialias del canvas y la cadena de render se crean al arrancar; la partida guardada no se toca. El tono de color (Neutral, AgX, ACES) cambia en vivo. Se guarda en `localStorage` (`ley_preset`, `ley_render`).
- **Autodetección** (`detectPreset()`, solo si no hay preferencia guardada): usa la GPU (`WEBGL_debug_renderer_info`), la memoria, los núcleos y el tipo de puntero.
  - Software (SwiftShader, llvmpipe): Bajo.
  - Móvil: Bajo, o Medio en GPUs de gama alta.
  - Intel integrada: Medio; Iris Xe o Arc: Alto.
  - NVIDIA, AMD o Apple M: Alto; RTX 30/40/50, RX 6000/7000 o M Pro/Max: Ultra.
  - Con menos de 4 GB o 2 núcleos baja un nivel.
  - En este entorno detecta SwiftShader y elige Bajo, como debe ser.
- **Reducción de draw calls:** el LOD de los muñecos también recorta la pasada de sombras. De lejos solo proyectan sombra el torso, la cabeza, el pantalón y las medias, y se ocultan los deltoides. En una jugada real del plano general (High), **605 → 384 draw calls** (−37 %): las piezas con sombra pasan de 246 a 78.
- Las capturas usan `?preset=high` explícito (la autodetección daría Bajo en SwiftShader). Con otro preset se añade además el retrato en High.

## renderer.info: antes (fase 0) y después (fase 6)

High, 1280×720, todas las pasadas del fotograma (sombras y posproceso incluidos). **Medido con SwiftShader: los fps de este entorno no son representativos. Hay que medirlos con GPU y `?stats=1`.**

| Plano | Antes: calls / triángulos | Después: calls / triángulos |
|---|---|---|
| Retrato | 120 / 7 812 | 169 / 114 456 |
| Cuerpo frontal | 130 / 8 032 | 131 / 60 862 |
| Espalda (dorsal) | 131 / 8 434 | 131 / 60 876 |
| Plano general | 868 / 68 572 | **404** / 98 964 |

- **Retrato:** el Bokeh dibuja la profundidad de la escena otra vez, solo en este modo.
- **Triángulos:** suben por el público instanciado (unos 26 000 en una llamada), el pelo en tarjetas y el torso torneado.
- **Plano general:** la mitad de llamadas que antes, con estadio, público y posproceso completos.

**Siguiente paso de rendimiento**, si con GPU High no llega a 60 fps:
- Usar un GLB con una sola malla por jugador (`ASSETS.md`). La autoprueba lo deja en 214 llamadas.
- Fusionar la estructura estática del estadio (`BufferGeometryUtils.mergeGeometries`).
- Bajar el `aoScale`.
