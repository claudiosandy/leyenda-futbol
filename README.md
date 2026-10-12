# ⚽ LEYENDA: Modo Carrera

Videojuego de fútbol en 3D para el navegador, con personajes de estilo bloques.
Crea tu jugador (o juega con Modrić o Cristiano Ronaldo) y vive su carrera: tus decisiones
y tus disparos interactivos cambian tus goles, asistencias, títulos y Balones de Oro.

## Cómo jugar
- **En la web:** abre el enlace de GitHub Pages de este repositorio.
- **En tu ordenador:** descarga `index.html` y ábrelo con doble clic (funciona sin internet).

## Controles
- Apunta con el ratón (en móvil, arrastra el dedo).
- Mantén pulsado (o ESPACIO) para cargar el disparo y suelta en la zona verde.
- **A / D** o ◀ ▶: efecto al balón.
- **C**: cambia la cámara (3ª persona, 1ª persona, TV).
- **⏩ Simular**: la IA juega el momento por ti.

## Modos
- **Crea tu jugador:** nombre, dorsal, país, posición, club, año de debut, peinado, cara y botas.
- **Leyenda Mundialista:** juega los Mundiales 2006–2026 partido a partido.
- **Leyendas:** Luka Modrić (desde 2003) y Cristiano Ronaldo (desde 2002).

## Desarrollo
Todo el juego está en `index.html` (incluye Three.js r128, licencia MIT).
Cada vez que se sube un cambio a `main`, GitHub Actions ejecuta `node tools/verificar.mjs`
para comprobar que el código no tiene errores y, si todo está bien, publica el juego en GitHub Pages.

> Juego de fans sin fines comerciales. Los nombres de jugadores, clubes y competiciones pertenecen a sus respectivos dueños.
