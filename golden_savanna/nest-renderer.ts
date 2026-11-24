// @ts-check
// The showpiece of the Savana Dourada: the weaver-bird nest (biomes:weaver_nest) hanging under a flat-top tree. The mesher
// only draws the knot where it is tied to the leaves (the block's `geometry`); this renderer (ctx.render.blockEntity, run
// only in the browser) hangs the woven pouch from that knot and lets it sway gently in the wind, each nest on its own
// beat, and now and then a little yellow weaver bird peeks out of the entrance tube at the bottom.
// Hand-built Three objects: one geometry and one material per kind, shared by every nest (never put in e.track); the
// material's colour follows the daylight (frame.daylight), so the nest darkens at night like the terrain around it.

let kit: any = null; // the shared geometries and materials, built once for the game's THREE
function kitFor(THREE: any) {
  if (kit && kit.THREE === THREE) return kit;
  const woven = (w: number, h: number, seed: number) => {
    // a woven look without a texture: every vertex a slightly different straw colour
    const g = new THREE.SphereGeometry(w, 9, 7);
    g.scale(1, h / w, 1);
    const pos = g.attributes.position, col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      // rings of woven grass, darker where the strands cross, every vertex a slightly different straw
      const v = Math.abs(Math.sin(i * 12.9898 + seed) * 43758.5453) % 1;
      const ring = Math.floor((pos.getY(i) + h) * 22) % 2 === 0 ? 0.72 : 1;
      col[i * 3] = (0.3 + v * 0.1) * ring; col[i * 3 + 1] = (0.24 + v * 0.08) * ring; col[i * 3 + 2] = (0.09 + v * 0.04) * ring;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  };
  kit = {
    THREE,
    strand: new THREE.BoxGeometry(0.05, 0.2, 0.05),
    pouch: woven(0.2, 0.27, 1),
    tube: new THREE.CylinderGeometry(0.055, 0.075, 0.2, 7),
    birdBody: new THREE.BoxGeometry(0.1, 0.08, 0.13),
    birdHead: new THREE.BoxGeometry(0.075, 0.07, 0.07),
    straw: new THREE.MeshBasicMaterial({ vertexColors: true }),
    tubeMat: new THREE.MeshBasicMaterial({ color: 0x7d6a35 }),
    yellow: new THREE.MeshBasicMaterial({ color: 0xf0c419 }),
    mask: new THREE.MeshBasicMaterial({ color: 0x2a2116 }),
    lit: -1,
  };
  return kit;
}

export const weaverNestRenderer = {
  maxDistance: 48,
  /** @param {any} e */
  create(e: any) {
    const k = kitFor(e.THREE), THREE = e.THREE;
    const pivot = new THREE.Group();
    pivot.position.set(0.5, 0.86, 0.5); // the knot (the block's geometry: 0.8..1)
    const strand = new THREE.Mesh(k.strand, k.tubeMat);
    strand.position.y = -0.08;
    const pouch = new THREE.Mesh(k.pouch, k.straw);
    pouch.position.y = -0.42;
    const tube = new THREE.Mesh(k.tube, k.tubeMat);
    tube.position.set(0.04, -0.74, 0);
    tube.rotation.z = 0.35;
    const bird = new THREE.Group();
    const body = new THREE.Mesh(k.birdBody, k.yellow), head = new THREE.Mesh(k.birdHead, k.mask);
    head.position.set(0, 0.02, 0.09);
    bird.add(body, head);
    bird.position.set(0.08, -0.86, 0);
    bird.visible = false;
    pivot.add(strand, pouch, tube, bird);
    e.group.add(pivot);
    const { x, y, z } = e.pos;
    e.store.pivot = pivot; e.store.bird = bird;
    e.store.phase = (Math.abs(Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453) % 1) * Math.PI * 2;
  },
  /** @param {any} e @param {any} frame */
  render(e: any, frame: any) {
    const s = e.store;
    if (!s.pivot) return;
    const t = frame.time, p = s.phase;
    // a slow pendulum with a little flutter on top (the wind), a few degrees each way
    s.pivot.rotation.z = Math.sin(t * 1.15 + p) * 0.13 + Math.sin(t * 3.1 + p * 2) * 0.02;
    s.pivot.rotation.x = Math.sin(t * 0.83 + p * 1.7) * 0.09;
    s.pivot.rotation.y = Math.sin(t * 0.21 + p) * 0.3;
    // the bird peeks out for a moment every ~20 s
    const beat = (t * 0.05 + p / 6.283) % 1;
    s.bird.visible = beat > 0.9;
    if (s.bird.visible) s.bird.position.y = -0.86 - Math.sin((beat - 0.9) * 31.4) * 0.05;
    // the daylight on the shared materials, once per frame for all the nests
    const k = kitFor(e.THREE), lit = Math.round(Math.max(0.16, Math.min(1, frame.daylight ?? 1)) * 100) / 100;
    if (k.lit !== lit) {
      k.lit = lit;
      k.straw.color.setScalar(lit); k.tubeMat.color.setHex(0x7d6a35).multiplyScalar(lit);
      k.yellow.color.setHex(0xf0c419).multiplyScalar(lit); k.mask.color.setHex(0x2a2116).multiplyScalar(lit);
    }
  },
};
