# Assets externos (opcionales)

El juego **no necesita** ninguno de estos archivos: sin ellos usa césped, grada, entorno de luz y
futbolistas procedurales. Cuando un archivo existe, `npm run build` lo marca como `disponible` en
`assets/manifest.json` y el juego lo carga; si falla, lo avisa en consola (`[assets] …`) y vuelve al procedural.

Desde el entorno en la nube donde se preparó esta rama **no se pudieron descargar** (proxy 403):
`dl.polyhaven.org`, `api.polyhaven.com`, `ambientcg.com`, `cdn.jsdelivr.net`, `unpkg.com`.
Mixamo exige iniciar sesión con una cuenta de Adobe. Por eso **no hay ningún binario incluido**: hay que
descargarlos a mano siguiendo esta lista.

> Reglas: cada archivo **< 25 MB**; HDRI de **1k a 2k**; texturas de **1k a 2k** (mejor KTX2).
> Solo assets genéricos: **sin rostros reales, escudos ni logotipos**.

## 1. Lista exacta

| # | Archivo destino | Origen | Licencia | Tamaño máx. |
|---|---|---|---|---|
| 1 | `assets/hdri/stadium_night_1k.hdr` | Poly Haven → HDRI de estadio o exterior nocturno con focos (p. ej. buscar «stadium» o «night» en <https://polyhaven.com/hdris>), descarga **1K HDR**. Renombrar a `stadium_night_1k.hdr` | CC0 | 4 MB (1k ≈ 1,5 MB; 2k ≈ 6 MB, también vale si se cambia `url`) |
| 2 | `assets/textures/grass/grass_albedo.jpg` | ambientCG → `Grass004` (u otro césped corto), paquete **1K-JPG** o **2K-JPG**: archivo `*_Color.jpg` | CC0 | 2 MB |
| 3 | `assets/textures/grass/grass_normal.jpg` | mismo paquete: `*_NormalGL.jpg` (formato **OpenGL**, no DX) | CC0 | 2 MB |
| 4 | `assets/textures/grass/grass_roughness.jpg` | mismo paquete: `*_Roughness.jpg` | CC0 | 1 MB |
| 5 | `assets/textures/concrete/concrete_albedo.jpg` | ambientCG → `Concrete034` (u otro hormigón liso), **1K-JPG**: `*_Color.jpg` | CC0 | 1 MB |
| 6 | `assets/models/player/player_base.glb` → genera `player_base.min.glb` | Ver §2 (modelo + animaciones) | CC0 (Quaternius) o licencia Mixamo | 25 MB (objetivo < 8 MB tras comprimir) |

Las rutas y nombres de los puntos 1-5 ya están en `assets/manifest.json`. Si usas otros nombres, cambia
allí el campo `url`.

**Texturas en KTX2 (recomendado):** con [KTX-Software](https://github.com/KhronosGroup/KTX-Software)
instalado (`toktx`):

```bash
toktx --t2 --encode uastc --genmipmap --assign_oetf srgb   assets/textures/grass/grass_albedo.ktx2 grass_albedo.jpg
toktx --t2 --encode uastc --genmipmap --assign_oetf linear assets/textures/grass/grass_normal.ktx2 grass_normal.jpg
```

y cambia la extensión en `url`. Para que el juego lea `.ktx2` sueltos (fuera de un GLB) hay que añadir
`KTX2Loader` al cargador de texturas: es deuda técnica anotada en `RENDER_AUDIT.md`. Mientras tanto, usa JPG.
Dentro del GLB, `npm run assets:comprimir` ya convierte a KTX2 si encuentra `toktx`.

## 2. Futbolista base (GLB con esqueleto y animaciones)

El juego lo carga en `PlayerView`, sin tocar la simulación. Necesita **un solo GLB** con:

- Malla humanoide genérica con **skin**, de unos **1,8 m** de alto y los pies en `y = 0`.
- Materiales con nombres reconocibles para teñir el kit: `Shirt`, `Shorts`, `Socks`, `Skin`, `Head`, `Boots`
  (los alias aceptados están en `manifest.models.player_base.materiales`).
- Clips: **`Idle`**, **`Run`**, **`Sprint`**, **`Kick`** y **`Celebrate`**. Los que falten se suplen con la
  animación procedural (un adaptador copia la pose a los huesos).

### Opción A (recomendada, sin cuenta): Quaternius, CC0

1. <https://quaternius.com> → *Universal Animation Library* o *Ultimate Modular Men* (CC0). Descarga la versión **glTF/GLB**.
2. En Blender (4.x): importa el GLB, quita cascos, armas y accesorios, renombra los materiales como arriba y
   renombra o reúne en el mismo armature las acciones `Idle`, `Run`, `Sprint` (puede ser `Run` más rápido), `Kick` y
   `Celebrate` (cualquier clip de victoria o salto).
3. Exporta como **glTF Binary** (`.glb`) con *Apply Modifiers*, *+Y Up*, *Animation → NLA/Actions*, a
   `assets/models/player/player_base.glb`.
4. En `assets/manifest.json`, `models.player_base`: `"rig": "generic"` y, en `"huesos"`, el nombre real de los huesos
   (`hips`, `spine`, `head`, `armL`, `armR`, `legL`, `legR`, `kneeL`, `kneeR`).

### Opción B: Mixamo (requiere cuenta de Adobe)

1. <https://www.mixamo.com> → personaje genérico (p. ej. *Y Bot* o *X Bot*, **sin rostro realista**).
2. Descarga **FBX Binary**, *With Skin*, 30 fps, de: *Idle*, *Running*, *Fast Run* o *Sprint*, *Soccer Pass* o
   *Strike Forward Jog*, y *Victory* o *Goal Celebration*. Marca *In Place* en las de carrera.
3. Blender: importa el personaje y las animaciones, junta las acciones en un solo armature y renómbralas
   `Idle`, `Run`, `Sprint`, `Kick`, `Celebrate`. Exporta a `assets/models/player/player_base.glb` como en la opción A.
4. Manifest: `"rig": "mixamo"` (los huesos `mixamorig*` ya están mapeados).
5. **Licencia:** Adobe permite usar personajes y animaciones de Mixamo en proyectos, incluidos los comerciales, pero
   **no redistribuirlos sueltos** como assets. Si el repositorio es público, valora la opción A.

### Comprimir y activar

```bash
npm run assets:comprimir   # gltf-transform: meshopt + texturas KTX2 (o WebP si no hay toktx), máx. 2048 px
# → assets/models/player/player_base.min.glb  (debe salir ✅ < 25 MB)
npm run build              # marca "disponible": true en el manifest y regenera index.html
python3 -m http.server 8000   # los GLB y texturas solo se cargan por http(s), no con doble clic
```

Abre `http://localhost:8000/?stats=1`. En consola debe aparecer `[assets] …: cargado` y, para el modelo,
`[assets] modelo de jugador GLB activo`. Si el modelo sale girado o con otra escala, ajusta `rotY`, `escala`,
`alturaCabeza` y `contactoGolpeo` en el manifest, sin tocar código. Si los brazos del adaptador giran al revés,
cambia `ejeX` a `-1`.

Puedes probar todo el cableado sin descargar nada con `?selftest=glb`: genera en memoria un humanoide con
esqueleto, lo exporta a GLB y lo carga por el mismo camino.

## 3. Habilitar los dominios bloqueados (opcional)

Si prefieres que lo descargue el agente en la nube: en los ajustes del entorno → *Network access* → añade
`dl.polyhaven.org`, `api.polyhaven.com` y `ambientcg.com` a los dominios permitidos
(<https://code.claude.com/docs/en/cloud-environments#network-access>). Mixamo seguirá necesitando tu sesión.
