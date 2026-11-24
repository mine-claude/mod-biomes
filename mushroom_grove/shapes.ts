// @ts-check
// Bosque de Cogumelos Gigantes: the SHAPES of its non-cube blocks (geometry boxes, 0..1 in the cell) and the plan of a giant
// mushroom cap. Pure data and pure functions: index.ts registers the blocks from these boxes, feature.ts draws the caps from
// capPlan(), and the tests read both.
//
// A cap is built in tiers (discs) above the stem top: the lowest tier is the widest (the brim), each tier above it narrower,
// and the top tier is the crown with a rounded dome block in the middle. In every tier a cell whose four neighbours are all in
// the disc is a full cap block (the body; its underside shows the gills); a cell on the rim is a sloped EDGE piece (one open
// side: it descends toward that side) or a rounded CORNER piece (two open sides). So the silhouette is a dome whose rim curves
// down, made of a handful of geometry blocks — never a stack of cubes.

export type Box = [number, number, number, number, number, number];
export type Dir = 'n' | 'e' | 's' | 'w';
export type Corner = 'ne' | 'nw' | 'se' | 'sw';

// --- the edge piece, declared for the open side +x (east): the profile descends from the inner side (x 0, top 0.9: the same
// height as the dome's shoulder, so the crown has no pit) to the outer side (x 1, top 0.45), a convex curve of three steps
const RIM = 0.9;
const EDGE_EAST: Box[] = [
  [0, 0, 0, 0.6, RIM, 1],
  [0, 0, 0, 0.85, 0.72, 1],
  [0, 0, 0, 1, 0.45, 1],
];
// --- the corner piece, declared for the open sides +x and +z: the same profile, rounded in plan view too
const CORNER_SOUTH_EAST: Box[] = [
  [0, 0, 0, 0.6, RIM, 0.6],
  [0, 0, 0, 0.85, 0.72, 0.7],
  [0, 0, 0, 0.7, 0.72, 0.85],
  [0, 0, 0, 1, 0.45, 0.55],
  [0, 0, 0, 0.55, 0.45, 1],
  [0, 0, 0, 0.88, 0.45, 0.88],
];

const mirrorX = (b: Box): Box => [1 - b[3], b[1], b[2], 1 - b[0], b[4], b[5]];
const mirrorZ = (b: Box): Box => [b[0], b[1], 1 - b[5], b[3], b[4], 1 - b[2]];
const swapXZ = (b: Box): Box => [b[2], b[1], b[0], b[5], b[4], b[3]];
const r4 = (b: Box): Box => b.map((v) => Math.round(v * 10000) / 10000) as Box;

/** The boxes of an edge piece whose open (descending) side is `dir` (n = -z, s = +z, e = +x, w = -x). */
export function edgeBoxes(dir: Dir): Box[] {
  const f = dir === 'e' ? (b: Box) => b : dir === 'w' ? mirrorX : dir === 's' ? swapXZ : (b: Box) => mirrorZ(swapXZ(b));
  return EDGE_EAST.map((b) => r4(f(b)));
}

/** The boxes of a corner piece whose open sides are the two of `corner`. */
export function cornerBoxes(corner: Corner): Box[] {
  return CORNER_SOUTH_EAST.map((b) => r4((corner[0] === 'n' ? mirrorZ : (x: Box) => x)((corner[1] === 'w' ? mirrorX : (x: Box) => x)(b))));
}

/** The dome block of a cap's crown: its shoulder at the rim pieces' inner height, a rounded crest above it (the highest point). */
export const DOME: Box[] = [
  [0, 0, 0, 1, RIM, 1],
  [0.15, RIM, 0.2, 0.85, 1, 0.8],
  [0.2, RIM, 0.15, 0.8, 1, 0.85],
];

/** The gills hanging under a cap: a thin roof with fins below it, crossed in both directions. */
export const GILLS: Box[] = [
  [0, 0.875, 0, 1, 1, 1],
  [0, 0.5, 0.1875, 1, 0.875, 0.25], [0, 0.55, 0.5, 1, 0.875, 0.5625], [0, 0.5, 0.8125, 1, 0.875, 0.875],
  [0.1875, 0.6, 0, 0.25, 0.875, 1], [0.5, 0.62, 0, 0.5625, 0.875, 1], [0.8125, 0.6, 0, 0.875, 0.875, 1],
];

/** Stems: a thick one (the lower part of a stem) and a thin one (the upper part, under the cap). */
export const STEM: Box[] = [[0.1875, 0, 0.1875, 0.8125, 1, 0.8125], [0.125, 0, 0.25, 0.875, 1, 0.75], [0.25, 0, 0.125, 0.75, 1, 0.875]];
export const STEM_THIN: Box[] = [[0.3125, 0, 0.3125, 0.6875, 1, 0.6875], [0.25, 0, 0.375, 0.75, 1, 0.625], [0.375, 0, 0.25, 0.625, 1, 0.75]];

/** The puffball's body: a low, round ball (the showpiece renderer adds the breath and the spores). */
export const PUFFBALL: Box[] = [
  [0.1875, 0, 0.1875, 0.8125, 0.5, 0.8125],
  [0.125, 0.0625, 0.25, 0.875, 0.4375, 0.75],
  [0.25, 0.0625, 0.125, 0.75, 0.4375, 0.875],
  [0.3125, 0.5, 0.3125, 0.6875, 0.5625, 0.6875],
];

export const DIRS: Dir[] = ['n', 'e', 's', 'w'];
export const CORNERS: Corner[] = ['ne', 'nw', 'se', 'sw'];

/** The two kinds of giant mushroom: the tiers (disc radii, lowest first) of the cap. */
export const CAP_TIERS = Object.freeze({ small: [2.5, 1.5], large: [3.5, 2.3, 1.5] });
export const CAP_REACH = 3; // the widest cap reaches 3 blocks from the stem (so stems stand 3..12 into the chunk)

export type CapCell = { dx: number, dy: number, dz: number, part: 'body' | 'dome' | Dir | Corner };

/** The cells of a cap whose stem top is at (0, -1, 0): dy 0 is the brim tier. Pure. */
export function capPlan(tiers: readonly number[]): CapCell[] {
  const out: CapCell[] = [];
  tiers.forEach((r, dy) => {
    const top = dy === tiers.length - 1, n = Math.floor(r), r2 = r * r;
    const inDisc = (x: number, z: number) => x * x + z * z <= r2;
    for (let dz = -n; dz <= n; dz++) {
      for (let dx = -n; dx <= n; dx++) {
        if (!inDisc(dx, dz)) continue;
        const e = !inDisc(dx + 1, dz), w = !inDisc(dx - 1, dz), s = !inDisc(dx, dz + 1), no = !inDisc(dx, dz - 1);
        const open = +e + +w + +s + +no;
        let part: CapCell['part'];
        if (open === 0) part = top ? 'dome' : 'body';
        else if (open === 1) part = e ? 'e' : w ? 'w' : s ? 's' : 'n';
        else if (open === 2 && (e || w) && (s || no)) part = `${no ? 'n' : 's'}${e ? 'e' : 'w'}` as Corner;
        else part = 'dome';
        out.push({ dx, dy, dz, part });
      }
    }
  });
  return out;
}
