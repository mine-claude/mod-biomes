// @ts-check
// Helpers of the blended terrain steps (terrain 2: api.biomeWeight exists).
//
// The engine's blend weight of a column is bilinear between nodes of a global grid every few blocks (4 in the base game; any of
// 2/4/8/16 divides a chunk). Sampling the weight every 4 blocks over the chunk, corners included, reads every node a column of
// the chunk interpolates between; if all of them are 0, no column of the chunk has any of the biome, and the step can skip the
// chunk after 25 lookups instead of 256.

/** True when the biome `key` has no weight anywhere in this chunk (the step has nothing to do). */
export function biomeAbsent(api: any, key: string): boolean {
  for (let dz = 0; dz <= 16; dz += 4) for (let dx = 0; dx <= 16; dx += 4) if (api.biomeWeight(api.x0 + dx, api.z0 + dz, key) > 0) return false;
  return true;
}
