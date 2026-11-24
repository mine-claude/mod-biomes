// @ts-check
// Bosque de Cogumelos Gigantes: the pixel art of its blocks, painted by code (16 x 16, original). tools/gen-textures.ts writes
// each one to textures/mushroom_grove/<name>.png; `--check` compares with the committed files.
import { blob, hash, hex, pick, type Painter, type Rgba } from '../src/pixel.ts';

const SOIL = ['#4a3a30', '#54423a', '#5d4a3f', '#433429'];
const SOIL_SOFT = ['#6a5a5c', '#75656a', '#5f5052', '#80727a']; // the soil seen through the felt: greyed, so the top is calmer
const THREADS = ['#9c8fa0', '#b1a4b4', '#c4b8c6', '#8a7d8e'];
const STEM = ['#e6dcc6', '#ddd1b8', '#d2c5aa', '#ece3cf'];
const STEM_DARK = ['#b9aa8c', '#c6b89a'];
const GILL = ['#d9c7a6', '#cbb894', '#bfa985'];
const GILL_DARK = ['#8f7b5e', '#7d6a50'];

// mycelium seen from above: dark damp soil under a felt of pale threads, with a few bluish spore stains
const myceliumTop: Painter = (x, y) => {
  const felt = blob(x, y, 301, 4) * 0.55 + hash(x, y, 302) * 0.45;
  if (hash(x, y, 303) > 0.965) return hex('#7a86a8'); // a spore stain
  if (felt > 0.42) return pick(THREADS, hash(x, y, 304));
  return pick(SOIL_SOFT, felt * 2.3);
};

// the side: the felt of threads on top, hanging in wisps into the soil
const myceliumSide: Painter = (x, y) => {
  const wisp = 2 + Math.floor(hash(x, 0, 311) * 3);
  if (y < wisp || (y < wisp + 2 && hash(x, y, 312) > 0.6)) return pick(THREADS, hash(x, y, 313));
  if (hash(x, y, 314) > 0.94) return hex('#6c5c4f'); // a pebble
  return pick(SOIL, Math.min(0.99, hash(x, y, 315) * 0.7 + y / 70));
};

// a stem from the side: pale, soft, with long fibres running up and a few scales
const stemSide: Painter = (x, y) => {
  const fibre = (x + Math.floor(hash(0, y >> 2, 321) * 2)) % 4 === 0;
  if (hash(x >> 1, y >> 1, 322) > 0.93) return pick(STEM_DARK, hash(x, y, 323)); // a scale
  if (fibre) return pick(STEM_DARK, hash(x, y, 324) * 0.6);
  return pick(STEM, blob(x, y, 325, 4) * 0.5 + hash(x, y, 326) * 0.5);
};

// a stem cut across: rings of soft flesh, a darker core
const stemTop: Painter = (x, y) => {
  const d = Math.hypot(x - 7.5, y - 7.5);
  if (d < 2.2) return pick(STEM_DARK, hash(x, y, 331));
  if (Math.floor(d) % 3 === 0) return pick(['#d6c9ad', '#cdbf9f'], hash(x, y, 332));
  return pick(STEM, hash(x, y, 333));
};

// the gills: fine radial plates, seen from below
const gills: Painter = (x, y) => {
  const a = Math.atan2(y - 7.5, x - 7.5), d = Math.hypot(x - 7.5, y - 7.5);
  const plate = Math.floor((a + Math.PI) / (Math.PI * 2) * 22 + d * 0.15) % 2 === 0;
  if (plate) return pick(GILL_DARK, hash(x, y, 341));
  return pick(GILL, hash(x, y, 342) * 0.7 + d / 40);
};

// the shelf fungus on the stems: concentric brown bands growing out from the stem
const shelf: Painter = (x, y) => {
  const band = Math.floor((y + hash(x >> 2, 0, 351) * 2) / 2) % 3;
  const pal = band === 0 ? ['#8a5a32', '#94623a'] : band === 1 ? ['#b07a44', '#bb854d'] : ['#d6a868', '#cf9e5d'];
  return pick(pal, hash(x, y, 352));
};

// spots on a cap, on a jittered grid of 5 x 5 (wraps, so the tile repeats)
function spot(x: number, y: number, salt: number, size: number): number {
  let best = 9;
  for (let gy = -1; gy <= 1; gy++) for (let gx = -1; gx <= 1; gx++) {
    const cx = Math.floor(x / 5) + gx, cy = Math.floor(y / 5) + gy;
    const wx = ((cx % 4) + 4) % 4, wy = ((cy % 4) + 4) % 4;
    if (hash(wx, wy, salt + 1) > 0.7) continue; // not every cell has a spot
    const px = cx * 5 + 1 + hash(wx, wy, salt) * 3, py = cy * 5 + 1 + hash(wx, wy, salt + 2) * 3;
    best = Math.min(best, Math.hypot(x - px, y - py) / size);
  }
  return best;
}

const cap = (base: string[], spotCol: string[], salt: number, size: number, shade = 0.35): Painter => (x, y) => {
  const s = spot(x, y, salt, size);
  if (s < 1) return pick(spotCol, hash(x, y, salt + 5));
  const ring = s < 1.35; // a darker halo around a spot gives it some relief
  const v = blob(x, y, salt + 7, 4) * (1 - shade) + hash(x, y, salt + 8) * shade;
  const c: Rgba = pick(base, v);
  return ring ? [Math.round(c[0] * 0.86), Math.round(c[1] * 0.86), Math.round(c[2] * 0.86), 255] : c;
};

// red-spotted: a deep warm red with cream warts
const capRed = cap(['#a4231c', '#b52c21', '#c2382a', '#9a1f19', '#b8301f'], ['#f2e8d2', '#e8dcc0', '#fbf3e2'], 361, 1.5);
// ochre: a dull golden brown with darker scales
const capOchre = cap(['#c08a3a', '#b57f33', '#cb9645', '#a87430'], ['#7a5326', '#6b4820', '#875d2c'], 371, 1.2, 0.5);
// violet (glows at night): dusky violet with luminous lilac-cyan freckles; kept mid-dark, the glow comes from the emission
const capViolet = cap(['#4b2d6e', '#553479', '#5e3b84', '#432862'], ['#9fe6e8', '#b9a6f2', '#8bd8e6'], 381, 1.1, 0.4);

// the puffball: a cream ball with fine warts and a dusty top
const puffball: Painter = (x, y) => {
  if (hash(x, y, 391) > 0.88) return pick(['#b9a988', '#a89878'], hash(x, y, 392)); // a wart
  return pick(['#efe6cf', '#e5dbc1', '#f6efdc', '#ddd2b5'], blob(x, y, 393, 4) * 0.6 + hash(x, y, 394) * 0.4);
};

export const MUSHROOM_GROVE_ART: Record<string, Painter> = {
  mycelium_top: myceliumTop,
  mycelium_side: myceliumSide,
  mushroom_stem_side: stemSide,
  mushroom_stem_top: stemTop,
  mushroom_gills: gills,
  shelf_fungus: shelf,
  cap_red: capRed,
  cap_ochre: capOchre,
  cap_violet: capViolet,
  puffball,
};
