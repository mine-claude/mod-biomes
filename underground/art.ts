// @ts-check
// Subsolo: the pixel art of its blocks, painted by code (16 x 16, original). tools/gen-textures.ts writes each one to
// textures/underground/<name>.png; `--check` compares with the committed files.
import { blob, hash, hex, pick, type Painter } from '../src/pixel.ts';

const LIMESTONE = ['#c9c0a8', '#d3cbb4', '#bfb69d', '#dbd4bf', '#b8ae94'];
const SLATE = ['#3c4250', '#434a59', '#363b48', '#4b5263', '#30353f'];
const COPPER = ['#c06a3a', '#d57d45', '#a85a31', '#e39a62'];
const VERDIGRIS = ['#5fa58c', '#4f8f78'];
const DRIP = ['#9a8d78', '#a99c86', '#8b7f6b', '#b6aa93', '#7d725f'];

// limestone: a pale, warm sedimentary rock in soft horizontal bands, with tiny fossil specks
const limestone: Painter = (x, y) => {
  const band = blob(x >> 2, y, 501, 4);
  if (hash(x, y, 502) > 0.97) return hex('#a69c82'); // a pore
  if (hash(x, y, 503) > 0.985) return hex('#ece6d6'); // a shell fleck
  return pick(LIMESTONE, band * 0.6 + hash(x, y, 504) * 0.4);
};

// slate: a dark blue-grey rock split in thin sheets: long horizontal cleavage lines, faint sheen on the edges
const slate: Painter = (x, y) => {
  const sheet = (y + Math.floor(blob(x, 0, 511, 8) * 3)) % 4;
  if (sheet === 0 && hash(x, y, 512) > 0.25) return hex('#2a2e37'); // a cleavage line
  if (sheet === 1 && hash(x, y, 513) > 0.8) return hex('#5a6273'); // a sheen
  return pick(SLATE, blob(x, y, 514, 4) * 0.5 + hash(x, y, 515) * 0.5);
};

// copper ore: limestone with lumps of native copper, a few already green with verdigris
const copperOre: Painter = (x, y) => {
  const lump = blob(x, y, 521, 4) + hash(x, y, 522) * 0.25;
  if (lump > 0.86) return hash(x, y, 523) > 0.82 ? pick(VERDIGRIS, hash(x, y, 524)) : pick(COPPER, hash(x, y, 525));
  if (lump > 0.8) return hex('#8a5a3a'); // the rim of a lump
  return limestone(x, y);
};

// the dripstone of stalactites and stalagmites: wet beige rock with vertical drip streaks
const dripstone: Painter = (x, y) => {
  if ((x * 7 + (y >> 3)) % 5 === 0 && hash(x, y, 531) > 0.3) return hex('#c4b9a3'); // a wet streak
  return pick(DRIP, blob(x, y >> 1, 532, 4) * 0.55 + hash(x, y, 533) * 0.45);
};

export const UNDERGROUND_ART: Record<string, Painter> = {
  limestone, slate, copper_ore: copperOre, dripstone,
};
