// @ts-check
// The showpiece of the Ipezal: petals drifting down from a flowering crown. A blooming core (biomes:blooming_ipe_core) is
// hidden inside most crowns; in the browser this block entity renderer lets a handful of petals of the tree's colour fall
// slowly from under the crown to the carpet below, swaying and turning, over and over. Pure decoration:
//   - the colour is the grove colour of the core's own column (grove.ts, the same pure function the decoration step used),
//     so the block needs no data;
//   - every petal's path comes from a hash of the core's position (the same on every page) and the frame's clock;
//   - one shared plane and three shared materials for every instance (nothing per petal but a Mesh); the petals dim with the
//     daylight like the terrain (frame.daylight), and shrink away just before they touch the ground.
// Registered from the content entry (src/main.ts): the server and the workers accept it and never run it.
import { blossomColour, hash2, trunkHeight } from './grove.ts';

export const PETALS = 10; // petals per core
// The core is the crown's heart, one over the trunk's top; the crown's lowest layer is two under it. A petal appears just
// under that layer (START) and falls to the ground, trunkHeight(x, z) under the core's cell (the carpet's 1/16 on top).
export const START = -2.1;
export const landing = (x: number, z: number) => -trunkHeight(x, z) + 1 / 16;
const SPREAD = 2.2; // how far from the trunk a petal may start (the crown reaches 3; sway and drift add up to ~1)
const COLOURS = [0xc061b2, 0xeec63c, 0xf2eef3]; // purple, yellow, white

const shared = new WeakMap<object, { geo: any, mats: any[] }>();
function kit(T: any) {
  let k = shared.get(T);
  if (!k) {
    const geo = new T.PlaneGeometry(0.16, 0.11);
    const mats = COLOURS.map((c) => new T.MeshBasicMaterial({ color: c, side: T.DoubleSide }));
    k = { geo, mats };
    shared.set(T, k);
  }
  return k;
}

export const petalRenderer = {
  maxDistance: 40,
  /** @param {any} e */
  create(e: any) {
    const T = e.THREE, k = kit(T), { x, y, z } = e.pos;
    const colour = blossomColour(x, z), mat = k.mats[colour];
    const petals = [];
    for (let i = 0; i < PETALS; i++) {
      const r = (s: number) => hash2(x * 31 + i, z * 17 + y, 950 + s);
      const mesh = new T.Mesh(k.geo, mat);
      const a = r(0) * Math.PI * 2, d = 0.6 + r(1) * SPREAD;
      petals.push({ mesh, x: 0.5 + Math.cos(a) * d, z: 0.5 + Math.sin(a) * d, phase: r(2), speed: 1 / (9 + r(3) * 6), sway: 0.25 + r(4) * 0.35, spin: 1 + r(5) * 2 });
      e.group.add(mesh);
    }
    e.store.petals = petals;
    e.store.fall = START - landing(x, z);
    e.store.mat = mat;
    e.store.base = new T.Color(COLOURS[colour]);
  },
  /** @param {any} e @param {any} frame */
  render(e: any, frame: any) {
    const petals = e.store.petals;
    if (!petals) return;
    const t = frame.time, fall = e.store.fall;
    // the terrain's daylight curve, roughly: never fully black
    const lit = Math.max(0.18, Math.min(1, frame.daylight ?? 1));
    e.store.mat.color.copy(e.store.base).multiplyScalar(lit);
    for (const p of petals) {
      const life = (t * p.speed + p.phase) % 1, w = t * 0.9 + p.phase * 6.283;
      const m = p.mesh;
      m.position.set(p.x + Math.sin(w) * p.sway + life * 0.6, START - life * fall, p.z + Math.cos(w * 0.8) * p.sway);
      m.rotation.set(Math.sin(w * p.spin) * 1.2, w * 0.7, Math.cos(w * p.spin * 0.6) * 0.9);
      const s = life < 0.06 ? life / 0.06 : life > 0.94 ? (1 - life) / 0.06 : 1;
      m.scale.setScalar(Math.max(0.001, s));
    }
  },
  /** @param {any} e */
  dispose(e: any) {
    // the meshes leave with e.group; the plane and the materials are shared by every instance (never disposed here)
    for (const p of e.store.petals ?? []) p.mesh.removeFromParent?.();
    e.store.petals = null;
  },
};
