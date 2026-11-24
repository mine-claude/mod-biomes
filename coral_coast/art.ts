// @ts-check
// Costa de Corais: the pixel art of its blocks, painted by code (16 x 16, original). tools/gen-textures.ts writes each one to
// textures/coral_coast/<name>.png; `--check` compares with the committed files.
// Several blocks here are boxes smaller than the cell (geometry models): the mesher maps each face of a box onto the part of
// the tile it covers, so those tiles are painted as a whole surface (no outline), and the tube coral's top tile has its
// holes exactly where the tubes of its model stand (TUBES below, shared with index.ts).
import { CLEAR, blob, hash, hex, pick, type Painter } from '../src/pixel.ts';
import { TUBES } from './models.ts';

// shell sand: warm pale sand with crushed shell — white, peach and pink flecks, the odd whole little shell
const SAND = ['#e6d3a3', '#ecdcad', '#dfc996', '#f0e2b8', '#d9c28d'];
const FLECK = ['#fff8ec', '#f6c9b4', '#f2a9a0', '#fbe6d0', '#c9b6e0'];
const shellSand: Painter = (x, y) => {
  if (hash(x, y, 301) > 0.86) return pick(FLECK, hash(x, y, 302));
  // a tiny spiral shell, two of them on the tile
  for (const [cx, cy] of [[4, 11], [12, 4]] as const) {
    const dx = x - cx, dy = y - cy;
    if (dx * dx + dy * dy <= 1.2) return dx === 0 && dy === 0 ? hex('#c98a6e') : hex('#f4d9c4');
  }
  return pick(SAND, blob(x, y, 303, 4) * 0.5 + hash(x, y, 304) * 0.5);
};

// coral block: a porous rose-red reef stone, round polyp pits with pale rims
const CORAL = ['#d9566a', '#e2667a', '#c94a60', '#ea7a8c', '#d05c70'];
const coralBlock: Painter = (x, y) => {
  // polyps on a staggered 4 x 4 lattice
  const px = (x + (Math.floor(y / 4) % 2) * 2) % 4, py = y % 4;
  if (px === 1 && py === 1) return hex('#7a2236');
  if ((px === 0 || px === 2) && py === 1 && hash(x, y, 311) > 0.3) return hex('#f5a3b0');
  if (hash(x, y, 312) > 0.95) return hex('#fff0e6');
  return pick(CORAL, blob(x, y, 313, 4) * 0.6 + hash(x, y, 314) * 0.4);
};

// brain coral: ochre-green ridges that wander in a maze, dark grooves between them
const BRAIN = ['#b7b04a', '#c6bf58', '#a8a242', '#d2ca66'];
const brainCoral: Painter = (x, y) => {
  const w = Math.sin(x * 0.9 + Math.sin(y * 0.7) * 2.2) + Math.cos(y * 0.8 + Math.sin(x * 0.6) * 2);
  const groove = Math.abs(w) < 0.35;
  if (groove) return pick(['#5d5a22', '#6b6728'], hash(x, y, 321));
  if (Math.abs(w) < 0.7) return hex('#8f8a36');
  return pick(BRAIN, blob(x, y, 322, 4) * 0.5 + hash(x, y, 323) * 0.5);
};

// branch coral (the boxes of a branching colony): magenta-pink with paler polyp dots and lighter tips at the top rows
const BRANCH = ['#c8407e', '#d44e8a', '#b93672', '#df5f97'];
const branchCoral: Painter = (x, y) => {
  if (y <= 2 && hash(x, y, 331) > 0.3) return pick(['#f6a6cb', '#f9c0da'], hash(x, y, 332));
  if ((x + y * 3) % 5 === 0 && hash(x, y, 333) > 0.4) return hex('#f3b1d0');
  return pick(BRANCH, blob(x, y, 334, 2) * 0.5 + hash(x, y, 335) * 0.5);
};

// fan coral (two crossed quads): a violet sea fan, a lattice of thin branches spreading from a short stalk
const FAN = ['#7d4cc8', '#8c5ad6', '#9b6be0', '#6f40b8'];
const fanCoral: Painter = (x, y) => {
  const cx = 7.5, by = 15;
  if (y >= 13 && Math.abs(x - cx) < 1) return hex('#5a3394'); // the stalk
  const dx = x - cx, dy = by - y;
  const r = Math.sqrt(dx * dx * 0.9 + dy * dy);
  if (r > 12.5 || dy < 2) return CLEAR;
  // radial branches and the cross links between them make the lattice
  const ang = Math.atan2(dx, dy);
  const ray = Math.abs(Math.sin(ang * 6)) < 0.3;
  const ring = Math.abs(Math.sin(r * 0.9)) < 0.3;
  if (r > 11.2) return pick(['#b48cf0', '#c4a2f6'], hash(x, y, 341)); // the pale rim
  if (ray) return pick(['#5a3394', '#64399f'], hash(x, y, 342)); // the stiff branches
  if (ring) return pick(['#a77de8', '#b48cf0'], hash(x, y, 343)); // the cross links
  // the mesh between them: mostly filled, small holes
  return hash(x, y, 344) < 0.22 ? CLEAR : pick(FAN, hash(x, y, 345));
};

// tube coral: bundles of orange tubes; the side has growth rings, the top has a dark mouth at each tube's centre
const TUBE = ['#e5762c', '#ef8838', '#d9692a', '#f39a4c'];
const tubeSide: Painter = (x, y) => {
  if (y % 4 === 0) return pick(['#c25a1e', '#b8521c'], hash(x, y, 351));
  if (y <= 1) return hex('#ffc27a');
  return pick(TUBE, blob(x, y, 352, 2) * 0.4 + hash(x, y, 353) * 0.6);
};
const tubeTop: Painter = (x, y) => {
  for (const [cx, cz, r] of TUBES) {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cz);
    if (d < r * 0.5) return hex('#4a1c08');
    if (d < r) return pick(['#ffb466', '#ffc27a', '#f6a050'], hash(x, y, 354));
  }
  return pick(TUBE, hash(x, y, 355));
};

// seashell: a cream spiral shell with peach bands (the faces of a small lying shell model)
const seashell: Painter = (x, y) => {
  const band = (x + y) % 4 === 0;
  if (band) return pick(['#e08a64', '#d8775a'], hash(x, y, 361));
  if (hash(x, y, 362) > 0.9) return hex('#fffaf0');
  return pick(['#f6e2c8', '#f1d7b8', '#fbeedc'], hash(x, y, 363));
};

// palm trunk: rings of diamond scales left by fallen fronds, tan and brown
const PALM = ['#a2804f', '#b08d59', '#977446', '#bc9a65'];
const palmSide: Painter = (x, y) => {
  const ring = y % 4;
  if (ring === 0) return pick(['#6b4e2c', '#5f4426'], hash(x, y, 371));
  const scale = (x + (Math.floor(y / 4) % 2) * 2) % 4;
  if (scale === 0) return hex('#7e5f37');
  if (ring === 1) return pick(['#c9a874', '#d2b27f'], hash(x, y, 372)); // the lit lip of each ring
  return pick(PALM, hash(x, y, 373) * 0.6 + blob(x, y, 374, 4) * 0.4);
};
const palmTop: Painter = (x, y) => {
  const r = Math.hypot(x - 7.5, y - 7.5);
  if (r > 6.8) return pick(['#6b4e2c', '#7e5f37'], hash(x, y, 375));
  return pick(['#cfb07a', '#c4a56e', '#d8bb86'], (r < 3 ? 0.6 : 0) * 0.5 + hash(x, y, 376) * 0.5); // fibrous, no rings
};

// palm leaves (the crown): long bright leaflets crossing the tile diagonally, gaps between them (cutout)
const PALM_LEAF = ['#3f9a3a', '#4fae42', '#5fbf4c', '#368a34'];
const palmLeaves: Painter = (x, y) => {
  const d = (x + y) % 5, e = (x - y + 32) % 7;
  if (d === 0) return hex('#7a9a3a'); // a midrib
  if (d === 3 && e < 2) return CLEAR;
  if (hash(x, y, 381) < 0.1) return CLEAR;
  return pick(PALM_LEAF, blob(x, y, 382, 4) * 0.5 + hash(x, y, 383) * 0.5);
};
// the drooping tip of a frond (two crossed quads hanging under the crown): a midrib with leaflets hanging from it
const palmFrond: Painter = (x, y) => {
  const rib = 7.5 + Math.sin(y * 0.25) * 1.2;
  if (Math.abs(x - rib) < 0.6 && y < 13) return hex('#6a8a32');
  const dx = Math.abs(x - rib);
  // leaflets slant down and out from the midrib, shorter towards the tip (bottom)
  if (dx < 6 - y * 0.32 && (Math.floor(y + dx * 0.8) % 3 !== 0)) return pick(PALM_LEAF, hash(x, y, 391));
  return CLEAR;
};

// coconut: brown husk with fibres and the three dark "eyes" on one side
const coconut: Painter = (x, y) => {
  if ((x === 6 || x === 9) && y === 6) return hex('#2e1d0e');
  if (x === 7 && y === 9) return hex('#2e1d0e');
  if ((x * 7 + y * 3) % 6 === 0) return hex('#8a6438');
  return pick(['#6b4a26', '#5d3f1f', '#78552e'], hash(x, y, 395));
};

// driftwood: wood bleached silver by sun and salt, long grain along the log, a knot here and there
const DRIFT = ['#b9b2a4', '#c6bfb1', '#aea797', '#d0c9bb'];
const driftSide: Painter = (x, y) => {
  const grain = (y + Math.floor(hash(x >> 3, 0, 401) * 2)) % 3 === 0;
  if (Math.hypot(x - 11, y - 8) < 1.3) return hex('#6f675b'); // a knot
  if (grain) return pick(['#918a7c', '#9c9586'], hash(x, y, 402));
  return pick(DRIFT, hash(x, y, 403) * 0.6 + blob(x, y, 404, 4) * 0.4);
};

// giant clam: the outside of the valves is ivory with deep radial flutes; inside, the mantle is turquoise and indigo with
// iridescent spots (the top of the lower valve, seen when the shell opens)
const clamShell: Painter = (x, y) => {
  const flute = x % 4;
  if (flute === 0) return pick(['#8f8a80', '#9a9488'], hash(x, y, 411));
  if (y % 5 === 2) return hex('#cfc8b8'); // growth lines across the flutes
  if (flute === 2) return pick(['#f4efe2', '#fbf7ec'], hash(x, y, 412));
  return pick(['#e2dccd', '#d9d2c2', '#e9e3d4'], hash(x, y, 413));
};
const clamMantle: Painter = (x, y) => {
  const v = Math.sin(x * 0.8) + Math.cos(y * 0.9 + x * 0.3);
  if (hash(x, y, 421) > 0.9) return pick(['#9ff7ff', '#c9b4ff', '#7fffd8'], hash(x, y, 422)); // iridescent spots
  if (v > 0.9) return hex('#2b3c9e');
  return pick(['#1aa6a6', '#22b8b4', '#148f98', '#2a9fc4'], blob(x, y, 423, 4) * 0.5 + hash(x, y, 424) * 0.5);
};

/** Every texture of this biome, by file name (textures/coral_coast/<name>.png). */
export const CORAL_COAST_ART: Record<string, Painter> = {
  shell_sand: shellSand,
  coral_block: coralBlock,
  brain_coral_block: brainCoral,
  branch_coral: branchCoral,
  fan_coral: fanCoral,
  tube_coral_side: tubeSide,
  tube_coral_top: tubeTop,
  seashell,
  palm_log_side: palmSide,
  palm_log_top: palmTop,
  palm_leaves: palmLeaves,
  palm_frond: palmFrond,
  coconut,
  driftwood: driftSide,
  giant_clam_shell: clamShell,
  giant_clam_mantle: clamMantle,
};
