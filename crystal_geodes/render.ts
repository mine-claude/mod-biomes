// @ts-check
// The great crystal's living look (ctx.render.blockEntity): a tall, faceted crystal standing on its block, with two smaller
// ones leaning at its foot, that glows softly and now and then catches a slow glint running up it. Only the page draws it
// (the server and the Workers accept the registration and never run it). The block itself keeps a small crystal of boxes
// (its `geometry`), which is what is seen beyond the renderer's distance and what the hand collides with.
//
// Cheap on purpose (the renderers share a 2 ms per-frame budget): ONE shared geometry for every instance (built once,
// not tracked), two small materials per instance (tracked), and render() only moves two numbers. The look ignores the
// world's light on purpose: it is a light source (the block's `light`), so it shines in the dark of its geode.

/** Deterministic 0..1 from a cell (the tilt and the rhythm of each crystal). */
const cellHash = (x: number, y: number, z: number, salt: number) => {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1440662683) ^ Math.imul(salt, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

// a six-sided crystal: a prism body and a pointed tip, as triangles with a colour per FACE (fake light from one side, so
// the facets read as facets with an unlit material)
function crystalTriangles(radius: number, body: number, tip: number, foot: number) {
  const pos: number[] = [], col: number[] = [];
  const ring = (y: number, r: number) => Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * Math.PI * 2; return [Math.cos(a) * r, y, Math.sin(a) * r]; });
  const bottom = ring(0, radius * foot), top = ring(body, radius), apex = [0, body + tip, 0];
  const L = [0.45, 0.6, 0.66]; // the fake light's direction (normalised enough)
  const tri = (a: number[], b: number[], c: number[]) => {
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const len = Math.hypot(n[0], n[1], n[2]) || 1;
    const lit = 0.62 + 0.38 * Math.max(0, (n[0] * L[0] + n[1] * L[1] + n[2] * L[2]) / len);
    for (const p of [a, b, c]) { pos.push(p[0], p[1], p[2]); col.push(0.78 * lit, 0.66 * lit, 1.0 * lit); }
  };
  for (let i = 0; i < 6; i++) {
    const j = (i + 1) % 6;
    tri(bottom[i], top[j], top[i]); tri(bottom[i], bottom[j], top[j]); // the side
    tri(top[i], top[j], apex); // the tip
  }
  return { pos, col };
}

let shared: { body: any, core: any } | null = null;
function geometries(THREE: any) {
  if (shared) return shared;
  const parts = [
    { r: 0.27, body: 1.35, tip: 0.5, foot: 0.8, at: [0, 0, 0], lean: [0, 0] },
    { r: 0.13, body: 0.45, tip: 0.22, foot: 0.85, at: [0.24, 0, 0.12], lean: [0, 0.5] },
    { r: 0.11, body: 0.32, tip: 0.18, foot: 0.85, at: [-0.2, 0, 0.2], lean: [-0.55, 0] },
  ];
  const pos: number[] = [], col: number[] = [];
  for (const p of parts) {
    const t = crystalTriangles(p.r, p.body, p.tip, p.foot);
    const rot = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(p.lean[0], 0, p.lean[1]));
    const v = new THREE.Vector3();
    for (let i = 0; i < t.pos.length; i += 3) {
      v.set(t.pos[i], t.pos[i + 1], t.pos[i + 2]).applyMatrix4(rot);
      pos.push(v.x + p.at[0], v.y + p.at[1], v.z + p.at[2]);
    }
    col.push(...t.col);
  }
  const body = new THREE.BufferGeometry();
  body.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  body.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  // the inner light: a thinner copy of the main crystal, drawn additively inside it
  const c = crystalTriangles(0.15, 1.3, 0.42, 0.7);
  const core = new THREE.BufferGeometry();
  core.setAttribute('position', new THREE.Float32BufferAttribute(c.pos, 3));
  shared = { body, core };
  return shared;
}

/** The renderer: one instance per great crystal in view. */
export const greatCrystalRenderer = {
  maxDistance: 56,
  create(e: any) {
    const THREE = e.THREE;
    const { body, core } = geometries(THREE);
    const shell = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.86, side: THREE.DoubleSide, depthWrite: true });
    const glow = new THREE.MeshBasicMaterial({ color: 0xd8c4ff, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false });
    e.track(shell); e.track(glow);
    const group = new THREE.Group();
    const m = new THREE.Mesh(body, shell), g = new THREE.Mesh(core, glow);
    group.add(m); group.add(g);
    // each crystal leans a little and turns its own way (from its cell: the same on every page)
    const { x, y, z } = e.pos;
    group.position.set(0.5, 0.02, 0.5);
    group.rotation.set((cellHash(x, y, z, 1) - 0.5) * 0.18, cellHash(x, y, z, 2) * Math.PI * 2, (cellHash(x, y, z, 3) - 0.5) * 0.18);
    e.group.add(group);
    e.store.shell = shell; e.store.glow = glow; e.store.phase = cellHash(x, y, z, 4) * 40;
  },
  render(e: any, frame: any) {
    const s = e.store;
    if (!s.shell) return;
    const t = frame.time + s.phase;
    const breathe = 0.9 + 0.1 * Math.sin(t * 0.7); // a slow, gentle breathing of its light
    const glint = Math.pow(Math.max(0, Math.sin(t * 0.37)), 28); // a short glint every ~17 s
    s.shell.color.setScalar(Math.min(1.25, breathe + glint * 0.35));
    s.glow.opacity = 0.22 + 0.12 * Math.sin(t * 0.7 + 1) + glint * 0.55;
  },
};
