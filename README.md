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
- En los contraataques puedes **picarla** (vaselina) por encima del portero.

## Modos
- **Crea tu jugador:** empiezas en la temporada actual (2026/27) con la edad que elijas; nombre, dorsal, país, posición, club, peinado, cara y botas.
- **Leyenda Mundialista:** juega todos los Mundiales partido a partido (2006… 2026, 2030, 2034 y siguientes).
- **Leyendas:** Luka Modrić (desde 2003) y Cristiano Ronaldo (desde 2002).

## Qué incluye
- **Liga por jornadas** con 18-20 equipos y clasificación completa; juegas 7-10 partidos decisivos por temporada.
- **Previa estilo TV**: marcador, medias de los equipos, alineaciones 4-3-3 y tu ficha con radar de atributos.
- **Champions League** con fase de liga de 36 equipos (desde 2024/25) o fase de grupos, y los campeones reales de cada año.
- **Mundial jugable en todos los modos**, con tabla de grupo en vivo y el formato de 48 selecciones desde 2026.
- **Balón de Oro** con lista de 30 nominados y gala con la clasificación final.
- **Ceremonias 3D** de campeón (Champions, Mundial, liga, copa y Balón de Oro).
- Animación de golpeo completa: carrera, pie de apoyo, armado, golpeo, seguimiento y brazos de equilibrio.
- Fichajes realistas según la edad, la nacionalidad, la liga y el prestigio (los gigantes apuestan por jóvenes con potencial).
- **Todas las competiciones:** Champions, Europa League, Conference League, Copa Libertadores, Copa Sudamericana, Concacaf Champions Cup, Leagues Cup, Apertura y Clausura con liguilla (México, Argentina, Colombia, Uruguay, Perú, Ecuador, Paraguay) y MLS con playoffs.
- **Historial real desde el año 2000** de ligas y copas: el campeón real de cada temporada juega con un plus de forma (la historia puede cambiar).
- **Estrellas reales como rivales y compañeros** (Messi, Ronaldinho, Mbappé, Haaland, Yamal…) y generaciones futuras proyectadas hasta 2060; 🟡 marca a los ganadores del Balón de Oro y se avisa cuando te marcan.
- Futbolistas con proporciones humanas estilo FIFA: rostro, camiseta con nombre y dorsal, medias, botas y peinados.

## Desarrollo
Todo el juego está en `index.html` (incluye Three.js r128, licencia MIT).
Cada vez que se sube un cambio a `main`, GitHub Actions ejecuta `node tools/verificar.mjs`
para comprobar que el código no tiene errores y, si todo está bien, publica el juego en GitHub Pages.

> Juego de fans sin fines comerciales. Los nombres de jugadores, clubes y competiciones pertenecen a sus respectivos dueños.
