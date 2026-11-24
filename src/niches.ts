// @ts-check
// THE CLIMATE MAP of the official biomes in terrain 2: every biome's niche, in one table, so the whole map reads at a glance.
// Each one is the `placement` of its biome (ctx.worldgen.biome, docs/modding.md §22.6): ranges over the base game's climate
// axes. Terrain 1 never reads `placement` (its worlds keep choosing by `climate` alone, byte for byte as before).
//
// How the game picks (mods/mineclaude/worldgen/terrain/biome-source.ts): the niches that hold a column compete, the one that
// lists MORE axes wins (a coast biome beats a forest on the coast), equal ones share by weight per Voronoi cell; a column no
// niche holds takes the nearest niche. Temperature is the AIR temperature (it drops with altitude: cold niches climb
// mountains); temperature, humidity and weirdness are read once per cell (big coherent areas), the others per column.
//
// The bands below were drawn on the measured spread of the axes over land (seed 12345, 200x200 samples of an 8 km square):
//   temperature  p10 -0.27  p25 -0.16  p50 -0.04  p75 0.07  p90 0.16   (the base game's desert starts at 0.18, low ground)
//   humidity     p10 -0.20  p25 -0.11  p50 -0.01  p75 0.09  p90 0.17
//   weirdness    about -0.5..0.5 (a noise of its own: rare biomes ask for an extreme)
//   continents   land from about -0.12 (the beach) to 0.32 (deep inland); erosion: low = mountains, high = flat old land
//   altitude     blocks above the sea of the smooth ground: p50 8, p90 27
//
//        humidity →   dry (< -0.04)          mid                     wet (> 0.06)
//   cold  (< -0.22)    ── snowy taiga (all of the cold, and every high mountain the air cools down to it) ──
//   cool  (-0.22..)    ruin plateau (flat)    plateau / mossy edge    mossy forest   [weird: mushroom grove]
//   mild  (-0.08..)    flower meadow          tall canopy             mossy forest                        [low, flat, near rivers: glow marsh]
//   warm  (0.05..)     red dunes (inland)     golden savanna          ipê forest
//   (the warm niches stay below ~24 blocks up: a hot cell's mountain cools into the mild ones, never straight into snow)
//   coast              ───────── coral coast on warm coasts (beats every other niche on the beach band) ─────────
const T = 'mineclaude:overworld/temperature';
const H = 'mineclaude:overworld/humidity';
const W = 'mineclaude:overworld/weirdness';
const C = 'mineclaude:overworld/continents';
const E = 'mineclaude:overworld/erosion';
const R = 'mineclaude:overworld/rivers';
const ALT = 'altitude';

type Niche = Record<string, [number, number]>;

export const NICHES: Readonly<Record<string, Niche>> = Object.freeze({
  snowy_taiga: { [T]: [-1, -0.22], [H]: [-1, 1], [ALT]: [3, 99] },
  ruin_plateau: { [T]: [-0.22, -0.07], [H]: [-1, -0.04], [E]: [-0.02, 1], [ALT]: [3, 40] },
  mossy_forest: { [T]: [-0.22, 0.04], [H]: [0.04, 1] },
  mushroom_grove: { [T]: [-0.3, 0.02], [H]: [0.02, 1], [W]: [0.2, 1] },
  flower_meadow: { [T]: [-0.08, 0.08], [H]: [-1, -0.02] },
  tall_canopy: { [T]: [-0.08, 0.08], [H]: [-0.02, 0.08] },
  glow_marsh: { [T]: [-0.2, 0.17], [H]: [-0.04, 1], [E]: [0.02, 1], [R]: [0, 70], [ALT]: [-2, 4] },
  red_dunes: { [T]: [0.05, 0.4], [H]: [-1, -0.05], [C]: [-0.07, 1], [ALT]: [3, 20] },
  golden_savanna: { [T]: [0.05, 0.4], [H]: [-0.05, 0.08], [ALT]: [-5, 24] },
  ipe_forest: { [T]: [0.05, 0.4], [H]: [0.08, 1], [ALT]: [-5, 24] },
  coral_coast: { [T]: [0.03, 0.4], [H]: [-1, 1], [C]: [-0.2, -0.04], [ALT]: [-40, 4] },
});

/** The niche of a biome folder, for its `placement` (a fresh copy: the registry freezes what it gets). */
export const nicheOf = (biome: string): Niche => Object.fromEntries(Object.entries(NICHES[biome]).map(([k, r]) => [k, [r[0], r[1]]]));
