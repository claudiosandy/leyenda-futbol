// Punto de entrada de three para el empaquetado: se expone como window.THREE para que el script del juego
// (clásico, con variables globales) no cambie. Los addons van en THREE.addons.
import * as CORE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
window.THREE = Object.assign({}, CORE, { addons: { GLTFLoader, DRACOLoader, KTX2Loader, HDRLoader, MeshoptDecoder, SkeletonUtils, GLTFExporter } });
