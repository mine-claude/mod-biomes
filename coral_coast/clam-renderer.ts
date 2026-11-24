// @ts-check
// The giant clam's living part (ctx.render.blockEntity, docs/sdk-block-entity-render.md): the block itself is the lower
// valve (a fluted bowl, models.ts CLAM_BASE, drawn by the mesher); this renderer adds the UPPER valve, hinged on the back
// edge, which slowly opens and closes — a breath of about ten seconds — showing the turquoise mantle and a pearl that
// glints when the shell is open. Gentle on purpose: small angles, smooth easing, every clam on its own phase (from its
// position, so the same clam always breathes the same way).
//
// Browser only (the engine never runs it on the server or in the workers). No textures: a few boxes with flat colours,
// geometry shared by every clam, materials shared too and dimmed with the daylight (objects a mod builds by hand are not
// lit by the world, see "Luz do mundo" in the doc).
import { CLAM_HINGE } from './models.ts';

export const CLAM_BREATH_S = 10; // one open-close cycle
export const CLAM_OPEN_MAX = 0.62; // radians at the widest
export const CLAM_OPEN_MIN = 0.05; // never quite shut: a dark line of mantle shows

/** How open (radians) a clam at `pos` is at time `t` (seconds). Pure: the tests check it stays gentle. */
export function clamOpening(t: number, pos: { x: number, y: number, z: number }) {
  const phase = (((pos.x * 73856093) ^ (pos.z * 19349663) ^ (pos.y * 83492791)) >>> 0) / 4294967296;
  const s = 0.5 - 0.5 * Math.cos(((t / CLAM_BREATH_S) + phase) * 2 * Math.PI); // 0..1
  const eased = s * s * (3 - 2 * s); // lingers when shut and when open
  return CLAM_OPEN_MIN + (CLAM_OPEN_MAX - CLAM_OPEN_MIN) * eased;
}

// the upper valve, in the lid's own frame: hinge at the origin, the valve reaching out to -z (the front of the block)
const FLUTES = [ // [x0, x1, height, reach] in sixteenths
  [-7, -4, 2, 12], [-4, -1, 3, 13], [-1, 1, 3.5, 13], [1, 4, 3, 13], [4, 7, 2, 12],
];
const SHELL = [0xf1ebdd, 0xe0d9c8, 0xf7f2e6, 0xe0d9c8, 0xf1ebdd];
const RIM = 0x8f8a80, MANTLE = 0x1fa9aa, PEARL = 0xfff4f8;

let shared: any = null; // the geometries and materials of every clam (one THREE per page)
function kit(T: any) {
  if (shared && shared.T === T) return shared;
  const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => {
    const g = new T.BoxGeometry((x1 - x0) / 16, (y1 - y0) / 16, (z1 - z0) / 16);
    g.translate((x0 + x1) / 32, (y0 + y1) / 32, (z0 + z1) / 32);
    return g;
  };
  const mat = (c: number, extra: Record<string, unknown> = {}) => new T.MeshBasicMaterial({ color: c, ...extra });
  shared = {
    T,
    flutes: FLUTES.map(([x0, x1, hgt, reach]) => box(x0, 0, -reach, x1, hgt, 0)),
    rims: FLUTES.map(([x0, x1, , reach]) => box(x0, -0.6, -reach - 0.6, x1, 1, -reach + 0.4)),
    mantle: box(-6.5, -0.8, -12, 6.5, 0, -0.5),
    pearl: new T.SphereGeometry(1.4 / 16, 10, 8),
    glint: new T.PlaneGeometry(0.16, 0.16),
    shellMats: SHELL.map((c) => mat(c)),
    rimMat: mat(RIM),
    mantleMat: mat(MANTLE),
    pearlMat: mat(PEARL),
    glintMat: mat(0xffffff, { transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide }),
    base: { shell: SHELL.map((c) => new T.Color(c)), rim: new T.Color(RIM), mantle: new T.Color(MANTLE), pearl: new T.Color(PEARL) },
    light: -1,
  };
  return shared;
}

/** Dims the shared materials to the daylight (a little floor so a clam never turns black). Cheap: only when it changes. */
function relight(k: any, daylight: number) {
  const l = Math.max(0.28, Math.min(1, daylight));
  if (Math.abs(l - k.light) < 0.02) return;
  k.light = l;
  k.shellMats.forEach((m: any, i: number) => m.color.copy(k.base.shell[i]).multiplyScalar(l));
  k.rimMat.color.copy(k.base.rim).multiplyScalar(l);
  k.mantleMat.color.copy(k.base.mantle).multiplyScalar(l);
  k.pearlMat.color.copy(k.base.pearl).multiplyScalar(Math.max(0.5, l));
}

/** The renderer object (the same hooks as a BlockEntityRenderer class; one object serves every clam). */
export const giantClamRenderer = {
  maxDistance: 40,
  create(e: any) {
    const T = e.THREE, k = kit(T);
    const lid = new T.Group();
    lid.position.set(0.5, CLAM_HINGE.y, CLAM_HINGE.z);
    FLUTES.forEach((_, i) => {
      lid.add(new T.Mesh(k.flutes[i], k.shellMats[i]));
      lid.add(new T.Mesh(k.rims[i], k.rimMat));
    });
    lid.add(new T.Mesh(k.mantle, k.mantleMat)); // the mantle lines the inside of the lid
    const pearl = new T.Mesh(k.pearl, k.pearlMat);
    pearl.position.set(0.5, CLAM_HINGE.y + 0.02, 0.45);
    const glint = new T.Mesh(k.glint, k.glintMat.clone());
    glint.position.set(0.5, CLAM_HINGE.y + 0.12, 0.52);
    e.track(glint.material);
    e.group.add(lid, pearl, glint);
    e.store.lid = lid; e.store.glint = glint; e.store.pearl = pearl;
  },
  render(e: any, frame: any) {
    const k = kit(e.THREE), s = e.store;
    if (!s.lid) return;
    relight(k, frame.daylight ?? 1);
    const open = clamOpening(frame.time, e.pos);
    s.lid.rotation.x = open; // the valve reaches out to -z: a positive turn about x lifts its front edge
    // the pearl sits in the mantle and swells into view as the shell opens (shut, it would poke through the lid)
    const show = Math.max(0, Math.min(1, (open - 0.12) / 0.2));
    s.pearl.visible = show > 0.01;
    s.pearl.scale.setScalar(Math.max(0.01, show));
    // the pearl's glint: only when the shell is well open, a slow twinkle, the plane turned to the camera
    const wide = Math.max(0, (open - 0.35) / (CLAM_OPEN_MAX - 0.35));
    s.glint.material.opacity = wide * (0.35 + 0.35 * Math.sin(frame.time * 3.1 + e.pos.x));
    s.glint.visible = s.glint.material.opacity > 0.01;
    if (s.glint.visible && frame.camera) s.glint.quaternion.copy(frame.camera.quaternion);
  },
  dispose() {
    // the geometries and materials are shared by every clam (kept for the page); the glint's own material is tracked
  },
};
