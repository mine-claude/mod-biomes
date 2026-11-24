// @ts-check
// The Ancient Statue's figure (biomes:ancient_statue), drawn by the browser over the block (ctx.render.blockEntity): the block
// itself is only the worn pedestal (a geometry box the mesher draws); this adds a weathered stone guardian standing on it — a
// hooded, robed figure holding a carved tablet to its chest, the tablet's rune glowing faintly. Original design, all boxes.
//   - the look of each statue is a pure function of its position: it faces one of four ways, and some have lost the head (it
//     lies at their feet) or the right forearm; nothing is sent by the server and no data is stored;
//   - ONE geometry per look, shared by every statue (vertex colours carry the stone, the moss, the cracks and a face shade like
//     the terrain's); per statue only a material, whose colour follows the light of its cell (worldLight: e.light and the
//     daylight, the terrain's own formula), so a statue darkens at night and warms by a torch;
//   - the glow of the rune is a second material that ignores the light (faint teal, readable in the dark).
// Registered in the `main` entry: the engine only runs it in the page (on the server and in the workers it is accepted and
// never runs).

type Part = { size: [number, number, number]; at: [number, number, number]; rot?: [number, number, number]; color: string; taper?: number; glow?: boolean };

const STONE = '#9a9484', STONE_LIGHT = '#aaa391', STONE_DARK = '#7b766a', CRACK = '#4f4b44', MOSS = '#5a7d34', MOSS_DARK = '#46652a', GLOW = '#5fc7b4';

/** The four looks: bit 0 = the head lies broken at the feet, bit 1 = the right forearm is gone. */
export function statueLook(x: number, y: number, z: number) {
  let h = Math.imul(x | 0, 73856093) ^ Math.imul(y | 0, 19349663) ^ Math.imul(z | 0, 83492791);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = (h ^ (h >>> 16)) >>> 0;
  const facing = h & 3, r = (h >>> 2) % 8;
  return { facing, look: r < 4 ? 0 : r < 6 ? 1 : r < 7 ? 2 : 3 };
}

/** The boxes of a look, in cell units with the origin at the centre of the pedestal's top (y 0.25), facing +z. */
export function statueParts(look: number): Part[] {
  const headless = (look & 1) === 1, armless = (look & 2) === 2;
  const p: Part[] = [
    // the robe, wider at the hem, and the hem's worn edge
    { size: [0.56, 0.7, 0.42], at: [0, 0.35, 0], color: STONE, taper: 0.82 },
    { size: [0.6, 0.06, 0.46], at: [0, 0.03, 0], color: STONE_DARK },
    // the torso, the mantle over the shoulders, a belt
    { size: [0.46, 0.42, 0.3], at: [0, 0.91, 0], color: STONE, taper: 1.06 },
    { size: [0.62, 0.1, 0.36], at: [0, 1.1, -0.01], color: STONE_LIGHT },
    { size: [0.5, 0.05, 0.34], at: [0, 0.72, 0], color: STONE_DARK },
    // the left arm down the side, the forearm bent up to hold the tablet
    { size: [0.12, 0.34, 0.13], at: [-0.3, 0.92, 0], color: STONE, rot: [0, 0, -0.08] },
    { size: [0.11, 0.11, 0.26], at: [-0.2, 0.8, 0.13], color: STONE_LIGHT },
    // the tablet against the chest, its frame, the glyph's channel and its glow
    { size: [0.3, 0.38, 0.05], at: [0, 0.93, 0.19], color: STONE_LIGHT, rot: [-0.12, 0, 0] },
    { size: [0.22, 0.28, 0.02], at: [0, 0.94, 0.215], color: STONE_DARK, rot: [-0.12, 0, 0] },
    { size: [0.03, 0.2, 0.012], at: [0, 0.95, 0.232], color: GLOW, rot: [-0.12, 0, 0], glow: true },
    { size: [0.12, 0.03, 0.012], at: [0, 1.0, 0.236], color: GLOW, rot: [-0.12, 0, 0], glow: true },
    { size: [0.08, 0.03, 0.012], at: [0, 0.88, 0.226], color: GLOW, rot: [-0.12, 0, 0], glow: true },
    // the cracks running down the robe and the moss on the shoulders and at the hem
    { size: [0.015, 0.4, 0.01], at: [0.1, 0.32, 0.2], color: CRACK, rot: [0, 0, 0.2] },
    { size: [0.01, 0.28, 0.015], at: [-0.27, 0.45, 0.06], color: CRACK },
    { size: [0.22, 0.035, 0.2], at: [-0.2, 1.165, -0.03], color: MOSS },
    { size: [0.14, 0.03, 0.12], at: [0.22, 1.162, 0.04], color: MOSS_DARK },
    { size: [0.3, 0.05, 0.16], at: [0.06, 0.07, -0.18], color: MOSS },
    { size: [0.14, 0.04, 0.1], at: [-0.22, 0.07, 0.17], color: MOSS_DARK },
  ];
  // the right arm: the upper arm always; the forearm holding a tall staff with a rune-lit finial — or the arm broken off at
  // the elbow and the staff's pieces lying at the feet
  p.push({ size: [0.12, 0.34, 0.13], at: [0.3, 0.92, 0], color: STONE, rot: [0, 0, 0.08] });
  if (armless) {
    p.push({ size: [0.11, 0.06, 0.11], at: [0.3, 0.73, 0.02], color: CRACK });
    p.push({ size: [0.06, 0.06, 0.5], at: [-0.32, 0.03, 0.05], color: STONE_DARK, rot: [0, 0.3, 0] });
  } else {
    p.push({ size: [0.11, 0.11, 0.2], at: [0.31, 0.8, 0.1], color: STONE_LIGHT });
    p.push({ size: [0.13, 0.12, 0.13], at: [0.36, 0.8, 0.17], color: STONE }); // the fist
    p.push({ size: [0.055, 1.5, 0.055], at: [0.36, 0.75, 0.17], color: STONE_DARK }); // the staff
    p.push({ size: [0.11, 0.11, 0.11], at: [0.36, 1.53, 0.17], color: STONE_LIGHT, rot: [0, 0.78, 0.6] }); // the finial
    p.push({ size: [0.04, 0.04, 0.04], at: [0.36, 1.53, 0.17], color: GLOW, glow: true, rot: [0, 0.78, 0.6] });
  }
  if (!headless) {
    // the hood, its peak, the shadowed face and two faint eyes
    p.push({ size: [0.27, 0.27, 0.27], at: [0, 1.29, 0], color: STONE });
    p.push({ size: [0.17, 0.12, 0.17], at: [0, 1.46, -0.03], color: STONE_LIGHT, rot: [0.35, 0, 0] });
    p.push({ size: [0.17, 0.15, 0.03], at: [0, 1.27, 0.128], color: CRACK });
    p.push({ size: [0.03, 0.02, 0.01], at: [-0.04, 1.29, 0.145], color: GLOW, glow: true });
    p.push({ size: [0.03, 0.02, 0.01], at: [0.04, 1.29, 0.145], color: GLOW, glow: true });
  } else {
    // the broken neck, and the head lying at the feet, tipped over
    p.push({ size: [0.14, 0.05, 0.14], at: [0, 1.18, 0], color: CRACK });
    p.push({ size: [0.25, 0.25, 0.25], at: [0.33, 0.12, 0.27], color: STONE, rot: [0.3, 0.6, 1.2] });
    p.push({ size: [0.14, 0.04, 0.12], at: [0.3, 0.25, 0.26], color: MOSS, rot: [0.3, 0.6, 1.2] });
  }
  return p;
}

const hexRgb = (c: string) => [parseInt(c.slice(1, 3), 16) / 255, parseInt(c.slice(3, 5), 16) / 255, parseInt(c.slice(5, 7), 16) / 255];
const toLinear = (c: number) => Math.pow(Math.min(1, c), 2.2);
// the terrain's shade by the face's normal (up 1, x 0.8, z 0.65, down 0.5), blended for tilted faces
const faceShade = (n: number[]) => {
  const ax = Math.abs(n[0]), ay = Math.abs(n[1]), az = Math.abs(n[2]), s = ax + ay + az || 1;
  return (ax * 0.8 + ay * (n[1] > 0 ? 1 : 0.5) + az * 0.65) / s;
};

/** Builds the arrays of a look: [positions, colours] for the stone, and the same for the glow. Pure (no THREE). */
export function statueMesh(look: number) {
  const out = { stone: { pos: [] as number[], col: [] as number[] }, glow: { pos: [] as number[], col: [] as number[] } };
  let salt = 0;
  for (const part of statueParts(look)) {
    const [w, h, d] = part.size, [cx, cy, cz] = part.at, [rx, ry, rz] = part.rot ?? [0, 0, 0], t = part.taper ?? 1;
    const cos = [Math.cos(rx), Math.cos(ry), Math.cos(rz)], sin = [Math.sin(rx), Math.sin(ry), Math.sin(rz)];
    const rotate = (v: number[]) => {
      let [x, y, z] = v;
      [y, z] = [y * cos[0] - z * sin[0], y * sin[0] + z * cos[0]];
      [x, z] = [x * cos[1] + z * sin[1], -x * sin[1] + z * cos[1]];
      [x, y] = [x * cos[2] - y * sin[2], x * sin[2] + y * cos[2]];
      return [x, y, z];
    };
    const corner = (sx: number, sy: number, sz: number) => {
      const k = sy > 0 ? t : 1;
      const v = rotate([sx * w / 2 * k, sy * h / 2, sz * d / 2 * k]);
      return [v[0] + cx, v[1] + cy + 0.25, v[2] + cz];
    };
    // the six faces, each as two triangles wound counter-clockwise from outside
    const faces: Array<[number[], number[], number[], number[]]> = [
      [[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]].map((c) => corner(c[0], c[1], c[2])) as any,
      [[-1, -1, 1], [-1, 1, 1], [-1, 1, -1], [-1, -1, -1]].map((c) => corner(c[0], c[1], c[2])) as any,
      [[-1, 1, -1], [-1, 1, 1], [1, 1, 1], [1, 1, -1]].map((c) => corner(c[0], c[1], c[2])) as any,
      [[-1, -1, 1], [-1, -1, -1], [1, -1, -1], [1, -1, 1]].map((c) => corner(c[0], c[1], c[2])) as any,
      [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]].map((c) => corner(c[0], c[1], c[2])) as any,
      [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]].map((c) => corner(c[0], c[1], c[2])) as any,
    ];
    const base = hexRgb(part.color), target = part.glow ? out.glow : out.stone;
    for (const [a, b, c, e] of faces) {
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      const len = Math.hypot(n[0], n[1], n[2]) || 1;
      // weathering: each face a touch lighter or darker than the next (a fixed sequence, the same on every page)
      salt++;
      const jitter = part.glow ? 1 : 0.92 + ((salt * 37) % 17) / 100;
      const k = (part.glow ? 1 : faceShade([n[0] / len, n[1] / len, n[2] / len])) * jitter;
      for (const p of [a, b, c, a, c, e]) {
        target.pos.push(p[0], p[1], p[2]);
        // vertex colours are linear (the page renders in sRGB): shade in sRGB like the terrain, then linearize
        target.col.push(toLinear(base[0] * k), toLinear(base[1] * k), toLinear(base[2] * k));
      }
    }
  }
  return out;
}

// the terrain's light per channel: max(sky^2.2 x daylight, block^2.2 x [1, 0.82, 0.58], 0.012)
export function lightRgb(light: { sky: number, block: number } | null, daylight: number) {
  const sky = Math.pow(light ? light.sky : 1, 2.2) * daylight, block = Math.pow(light ? light.block : 0, 2.2);
  return [Math.max(sky, block, 0.012), Math.max(sky, block * 0.82, 0.012), Math.max(sky, block * 0.58, 0.012)];
}

const geometries = new Map<string, any>(); // one per look (and per THREE: the page has one), shared by every statue

function geometryOf(THREE: any, look: number) {
  const key = String(look);
  let g = geometries.get(key);
  if (g) return g;
  const m = statueMesh(look);
  const build = (arr: { pos: number[], col: number[] }) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(arr.pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(arr.col, 3));
    geo.computeBoundingSphere();
    return geo;
  };
  g = { stone: build(m.stone), glow: build(m.glow) };
  geometries.set(key, g);
  return g;
}

/** The renderer (a plain object with the engine's hooks: no SDK import needed). */
export const statueRenderer = {
  maxDistance: 72,
  worldLight: true,
  create(e: any) {
    const THREE = e.THREE, { x, y, z } = e.pos, { facing, look } = statueLook(x, y, z);
    const geo = geometryOf(THREE, look);
    const stoneMat = new THREE.MeshBasicMaterial({ vertexColors: true });
    const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true });
    e.track(stoneMat); e.track(glowMat);
    const holder = new THREE.Group();
    holder.name = 'biomes:ancient_statue'; // what a test (or a debugging session) finds in the scene
    holder.position.set(0.5, 0, 0.5);
    holder.rotation.y = facing * Math.PI / 2;
    holder.add(new THREE.Mesh(geo.stone, stoneMat), new THREE.Mesh(geo.glow, glowMat));
    e.group.add(holder);
    e.store.mat = stoneMat;
    e.store.key = '';
  },
  render(e: any, frame: any) {
    const mat = e.store.mat;
    if (!mat) return;
    const l = lightRgb(e.light, frame.daylight ?? 1);
    const key = l.map((v) => v.toFixed(3)).join();
    if (key === e.store.key) return;
    e.store.key = key;
    mat.color.setRGB(l[0], l[1], l[2]);
  },
};
