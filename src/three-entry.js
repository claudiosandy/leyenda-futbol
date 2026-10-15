// Punto de entrada de three para el empaquetado: se expone como window.THREE para que el script del juego
// (clásico, con variables globales) no cambie. Los addons se añaden bajo THREE.addons según se necesiten.
import * as CORE from 'three';
window.THREE = Object.assign({}, CORE, { addons: {} });
