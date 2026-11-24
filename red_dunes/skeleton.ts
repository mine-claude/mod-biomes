// @ts-check
// The fossil skeleton of the Dunas Vermelhas: ONE block (biomes:fossil_skeleton) whose states are the parts of a skeleton —
// a vertebra, the tapering tail, a rib (two cells: the arc and its top curling back), a short rib, a skull (plain or horned),
// the snout in front of it (plain or tusked), a long bone (femur) and a scatter of bone fragments — each part a model of
// boxes (`geometry`), declared FACING NORTH and turned by `facing` (n/e/s/w). The convention of every part: its FRONT is -z
//   - vertebra, tail: the spine runs along z, the front toward the head (so the discs of neighbours meet at the cell edges);
//   - rib, rib_top, rib_short: the front points OUTWARD from the spine; the inner end (z = 1) leans on the vertebra beside it;
//   - skull, snout: the front is where the snout points (away from the spine); the snout cell lies in front of the skull;
//   - femur, fragments: lying on the sand; the femur along z.
// Only the terrain-2 decoration places it (feature.ts): terrain-1 worlds keep their cube fossil bones byte for byte. A hidden
// block (no item of its own): breaking any part gives the fossil bone, as the cube always did.
// Original designs, in 1/16 units (b() divides).
import { ns } from '../src/names.ts';

export const SKELETON = ns('fossil_skeleton');
export const PARTS = ['vertebra', 'tail', 'rib', 'rib_top', 'rib_short', 'skull', 'skull_horned', 'snout', 'snout_tusked', 'femur', 'fragments'] as const;
export type Part = typeof PARTS[number];
export type Facing = 'n' | 'e' | 's' | 'w';
export const FACINGS: readonly Facing[] = ['n', 'e', 's', 'w'];

type Box = number[];
const b = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): Box => [x0 / 16, y0 / 16, z0 / 16, x1 / 16, y1 / 16, z1 / 16];

// the cranium of both skulls: braincase, brow over two eye sockets (the holes at x 3..6 and 10..13, y 4..8, z 6..8), the nasal
// bridge between them, a short upper muzzle over the slightly open lower jaw, four teeth, the jaw's two rami on the ground
const CRANIUM: Box[] = [
  b(3, 1, 8, 13, 8, 16), // the braincase
  b(4, 8, 9, 12, 10, 15), // its rounded crown
  b(3, 8, 6, 13, 9, 9), // the brow over the sockets
  b(3, 1, 6, 13, 4, 8), // the cheekbones under the sockets
  b(6, 4, 6, 10, 8, 8), // the nasal bridge between them
  b(5, 2, 0, 11, 5, 6), // the upper muzzle
  b(5, 0, 1, 11, 1, 7), // the lower jaw, a gap under the muzzle
  b(4, 0, 7, 5, 2, 14), b(11, 0, 7, 12, 2, 14), // the jaw's rami along the cheeks
  b(5, 1, 1, 6, 2, 2), b(10, 1, 1, 11, 2, 2), b(5, 1, 4, 6, 2, 5), b(10, 1, 4, 11, 2, 5), // teeth
  b(6, 0, 14, 10, 3, 16), // the knob where the neck meets it
];
const HORNS: Box[] = [ // two horns from the back of the crown, out and up, curling forward at the tip
  b(1, 7, 11, 3, 10, 14), b(0, 9, 10, 2, 13, 13), b(0, 13, 8, 2, 15, 11), b(1, 14, 6, 2, 16, 8),
  b(13, 7, 11, 15, 10, 14), b(14, 9, 10, 16, 13, 13), b(14, 13, 8, 16, 15, 11), b(14, 14, 6, 15, 16, 8),
];
const SNOUT: Box[] = [ // the long jaws in front of the skull: upper and lower, a rounded tip, teeth between them
  b(5, 2, 4, 11, 5, 16), b(6, 2, 1, 10, 4, 4), b(7, 2, 0, 9, 3, 1),
  b(5, 0, 5, 11, 1, 16), b(6, 0, 2, 10, 1, 5),
  b(5, 1, 6, 6, 2, 7), b(10, 1, 6, 11, 2, 7), b(5, 1, 10, 6, 2, 11), b(10, 1, 10, 11, 2, 11), b(5, 1, 14, 6, 2, 15), b(10, 1, 14, 11, 2, 15),
];
const TUSKS: Box[] = [ // a tusk from each side of the jaw, forward and up
  b(3, 2, 8, 5, 4, 11), b(2, 3, 4, 4, 5, 8), b(2, 5, 1, 4, 7, 4), b(2, 7, 0, 3, 9, 2),
  b(11, 2, 8, 13, 4, 11), b(12, 3, 4, 14, 5, 8), b(12, 5, 1, 14, 7, 4), b(13, 7, 0, 14, 9, 2),
];

/** The boxes of each part: model (what is drawn), collision (what the body hits; [] = walk through), selection (the aim). */
export const PART_GEOMETRY: Record<Part, { model: Box[], collision: Box[], selection: Box[] }> = {
  // a vertebra: two discs meeting the neighbours, the waisted body, the side wings and the spike leaning back
  vertebra: {
    model: [b(4, 0, 0, 12, 5, 3), b(5, 0, 3, 11, 4, 13), b(4, 0, 13, 12, 5, 16), b(1, 2, 6, 15, 4, 10), b(7, 4, 5, 9, 9, 11), b(7, 9, 8, 9, 11, 13)],
    collision: [b(4, 0, 0, 12, 5, 16)], // 5/16 high: walked over (the step is half a block)
    selection: [b(1, 0, 0, 15, 11, 16)],
  },
  // the tail's end: discs shrinking away from the body to a point
  tail: {
    model: [b(5, 0, 0, 11, 4, 4), b(6, 0, 4, 10, 3, 8), b(6, 0, 8, 9, 2, 12), b(7, 0, 12, 9, 1, 16), b(7, 4, 1, 9, 6, 3), b(2, 1, 1, 14, 3, 3)],
    collision: [],
    selection: [b(2, 0, 0, 14, 6, 16)],
  },
  // a rib's lower arc: from the spine (z = 1, on the ground) out and up to the top of the cell
  rib: {
    model: [b(7, 0, 12, 9, 2, 16), b(7, 1, 9, 9, 4, 13), b(7, 3, 6, 9, 7, 10), b(7, 6, 4, 9, 11, 7), b(7, 10, 3, 9, 16, 5)],
    collision: [b(6, 0, 2, 10, 16, 9)],
    selection: [b(6, 0, 2, 10, 16, 16)],
  },
  // the rib's top, in the cell above: up from the arc, curling back toward the spine, a thin tip
  rib_top: {
    model: [b(7, 0, 3, 9, 5, 5), b(7, 4, 4, 9, 8, 7), b(7, 7, 6, 9, 10, 10), b(7, 9, 9, 9, 11, 13), b(7.5, 10, 13, 8.5, 11, 15)],
    collision: [b(6, 0, 2, 10, 10, 9)],
    selection: [b(6, 0, 2, 10, 12, 16)],
  },
  // a short rib of the neck: one cell, out, up and hooked back
  rib_short: {
    model: [b(7, 0, 12, 9, 2, 16), b(7, 1, 8, 9, 5, 13), b(7, 4, 5, 9, 9, 9), b(7, 8, 5, 9, 12, 8), b(7, 11, 7, 9, 13, 11)],
    collision: [b(6, 0, 4, 10, 12, 12)],
    selection: [b(6, 0, 4, 10, 13, 16)],
  },
  skull: {
    model: CRANIUM,
    collision: [b(3, 0, 6, 13, 10, 16), b(5, 0, 0, 11, 5, 6)], // the skull is the one part that stops a walker (10/16 high)
    selection: [b(3, 0, 0, 13, 10, 16)],
  },
  skull_horned: {
    model: [...CRANIUM, ...HORNS],
    collision: [b(3, 0, 6, 13, 10, 16), b(5, 0, 0, 11, 5, 6)],
    selection: [b(0, 0, 0, 16, 16, 16)],
  },
  snout: {
    model: SNOUT,
    collision: [b(5, 0, 1, 11, 5, 16)],
    selection: [b(5, 0, 0, 11, 5, 16)],
  },
  snout_tusked: {
    model: [...SNOUT, ...TUSKS],
    collision: [b(5, 0, 1, 11, 5, 16)],
    selection: [b(2, 0, 0, 14, 9, 16)],
  },
  // a long bone lying on the sand: the shaft and the two knobbed ends, each of two lobes
  femur: {
    model: [b(6.5, 0, 3, 9.5, 2.5, 13), b(5, 0, 0, 8, 3, 3), b(8, 0, 1, 11, 3.5, 4), b(5, 0, 13, 8, 3, 16), b(8, 0, 12, 11, 3, 15)],
    collision: [],
    selection: [b(4, 0, 0, 12, 4, 16)],
  },
  // bits of bone scattered on the sand
  fragments: {
    model: [b(2, 0, 3, 7, 1.5, 5), b(1.5, 0, 2.5, 3, 2, 5.5), b(9, 0, 9, 14, 1.5, 10.5), b(4, 0, 10, 6, 2, 12), b(11, 0, 2, 12.5, 1, 6), b(6, 0, 13, 10, 1, 14)],
    collision: [],
    selection: [b(1, 0, 1, 15, 3, 15)],
  },
};

/** The props of the skeleton block: one type, a state per part and facing, each part its own geometry. */
export function skeletonProps(tile: string, drop: string) {
  return {
    name: 'Esqueleto Fóssil', solid: true, transparent: true, hardness: 1.5, tool: 'pickaxe', hidden: true, drop,
    tiles: { top: tile, side: tile, bottom: tile },
    geometry: { ...PART_GEOMETRY.vertebra, occlusion: [] },
    states: {
      version: 1,
      properties: { part: [...PARTS], facing: [...FACINGS] },
      default: { part: 'vertebra', facing: 'n' },
      bind: { facing: 'facing' },
      variants: PARTS.filter((p) => p !== 'vertebra').map((part) => ({ when: { part }, props: { geometry: { ...PART_GEOMETRY[part], occlusion: [] } } })),
    },
  };
}

// ---- where each part goes: the skeleton's layout, pure (feature.ts places it; the tests read it)

/** The direction of a step in the world: +x east, -x west, +z south, -z north. */
export const facingOf = (dx: number, dz: number): Facing => (dx > 0 ? 'e' : dx < 0 ? 'w' : dz > 0 ? 's' : 'n');
export const STEP: Record<Facing, [number, number]> = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };

export type Piece = { i: number, s: number, dy: number, part: Part, facing: Facing };

/**
 * The parts of a skeleton of `len` vertebrae, in spine coordinates: i along the spine (0 = the neck, len - 1 = the tail's
 * end; the skull at i = -1 and the snout at -2), s across it (-1, 0, +1), dy above the sand. `head`/`side` are the world
 * directions of -i and +s. `kind` in [0, 1) picks the skull (horned / tusked / plain); `snout` whether the cell in front
 * of the skull is free for the snout; `hind` in [0, 1) which side keeps both legs.
 * The SAME cells as the cube fossil of terrain 1 (spine i 0..len-1, ribs at odd i < len - 1 on both sides, the skull at
 * i = -1) plus, where the fossil rests on the sand, its legs behind the tail (i = len) and a scatter at the neck.
 */
export function skeletonLayout(len: number, head: Facing, side: Facing, kind: number, snout: boolean, hind: number): Piece[] {
  const back = FACINGS[(FACINGS.indexOf(head) + 2) % 4], other = FACINGS[(FACINGS.indexOf(side) + 2) % 4];
  const out: Piece[] = [];
  for (let i = 0; i < len; i++) {
    out.push({ i, s: 0, dy: 1, part: i === len - 1 ? 'tail' : 'vertebra', facing: head });
    if (i % 2 === 1 && i < len - 1) {
      for (const s of [-1, 1]) {
        const facing = s > 0 ? side : other; // outward
        if (i === 1) out.push({ i, s, dy: 1, part: 'rib_short', facing });
        else { out.push({ i, s, dy: 1, part: 'rib', facing }); out.push({ i, s, dy: 2, part: 'rib_top', facing }); }
      }
    }
  }
  const horned = kind < 0.4, tusked = !horned && kind < 0.7;
  out.push({ i: -1, s: 0, dy: 1, part: horned ? 'skull_horned' : 'skull', facing: head });
  if (snout) out.push({ i: -2, s: 0, dy: 1, part: tusked ? 'snout_tusked' : 'snout', facing: head });
  // the legs: two long bones stretched behind (or one and a scatter), and bits of a foreleg at the neck
  out.push({ i: len, s: -1, dy: 1, part: hind < 0.6 ? 'femur' : 'fragments', facing: back });
  out.push({ i: len, s: 1, dy: 1, part: 'femur', facing: back });
  out.push({ i: 0, s: hind < 0.5 ? -1 : 1, dy: 1, part: 'fragments', facing: hind < 0.5 ? other : side });
  return out;
}
