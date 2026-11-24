// @ts-check
// The colour of an ipê tree's blossoms, as a PURE function of the world position of its crown: groves of one colour (a slow
// value noise over a 40-block lattice) that mix at their edges (a small per-position jitter). Both sides use it: the
// decoration step (feature.ts) paints each crown with it, and the petal renderer (renderer.ts) colours the drifting petals of
// a blooming core with the same answer from the core's position — so no data has to travel with the block.
// Integer hash only (Math.imul), no world seed: the same on every side, every runtime, any order of generation.

export const PURPLE = 0, YELLOW = 1, WHITE = 2;
export type GroveColour = 0 | 1 | 2;
export const COLOUR_NAMES = ['purple', 'yellow', 'white'] as const;

const CELL = 64; // the grove lattice (blocks)
const JITTER = 0.16; // how much a single tree may stray from its grove's colour (only near a grove's edge it flips)
// thresholds on the noise: purple below, yellow in the middle, white (the rarest) on top
const PURPLE_BELOW = 0.47, YELLOW_BELOW = 0.8;

/** Pure hash of two integers and a salt -> [0, 1). */
export function hash2(x: number, z: number, salt: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(z | 0, 668265263) ^ Math.imul(salt | 0, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** The slow grove noise at a world column, about 0..1. */
export function groveNoise(wx: number, wz: number): number {
  const gx = Math.floor(wx / CELL), gz = Math.floor(wz / CELL);
  let fx = (wx - gx * CELL) / CELL, fz = (wz - gz * CELL) / CELL;
  fx = fx * fx * (3 - 2 * fx); fz = fz * fz * (3 - 2 * fz);
  const a = hash2(gx, gz, 911), b = hash2(gx + 1, gz, 911), c = hash2(gx, gz + 1, 911), d = hash2(gx + 1, gz + 1, 911);
  return (a * (1 - fx) + b * fx) * (1 - fz) + (c * (1 - fx) + d * fx) * fz;
}

export const TRUNK_MIN = 5, TRUNK_SPAN = 3; // trunks of 5..7

/**
 * The trunk height of a tree whose crown is centred on the world column (wx, wz): from its foot's ground to the top log,
 * 5..7. Pure too, so the petal renderer knows how far its petals fall (the core sits right over the trunk's top).
 */
export function trunkHeight(wx: number, wz: number): number {
  return TRUNK_MIN + Math.floor(hash2(wx, wz, 913) * TRUNK_SPAN);
}

/** The blossom colour of a tree whose crown is centred on the world column (wx, wz). */
export function blossomColour(wx: number, wz: number): GroveColour {
  const v = groveNoise(wx, wz) + (hash2(wx, wz, 912) - 0.5) * JITTER;
  return v < PURPLE_BELOW ? PURPLE : v < YELLOW_BELOW ? YELLOW : WHITE;
}
