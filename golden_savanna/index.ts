// @ts-check
// Savana Dourada (biomes:golden_savanna): a warm, dry-ish open grassland — golden grass, tall golden tufts, sparse FLAT-TOP
// trees with weaver-bird nests, tall termite mounds, thorn bushes, bleached bones and lichen boulders. Warm like the red
// dunes but on the moister side of their humidity edge, so the two meet; never hot enough to reach the yellow desert. The
// goblins gather at its termite mounds at night (mod creatures). Everything of it is registered by ONE call,
// registerGoldenSavanna(ctx), from src/main.ts:
//   - its textures (textures/golden_savanna/*.png, painted by golden_savanna/art.ts through tools/gen-textures.ts)
//   - its blocks: tall golden grass (two blocks), savanna log and leaves, termite earth and the three tapered mound pieces
//     (`geometry` boxes, drawn by the mesher), thorn bush, bleached bones (flat `geometry`), lichen boulder, weaver nest
//   - the biome itself, and one decoration step (feature.ts)
//   - the weaver nest's live visual (nest-renderer.ts, ctx.render.blockEntity: only the browser runs it)
//   - cheap recipes: log -> planks, termite earth -> clay, boulder -> cobblestone, bones -> bones, thorn bush -> sticks
import { ns } from '../src/names.ts';
import { decorateGoldenSavanna } from './feature.ts';
import { weaverNestRenderer } from './nest-renderer.ts';
import { nicheOf } from '../src/niches.ts';

export const GOLDEN_SAVANNA = ns('golden_savanna'); // 'biomes:golden_savanna' — what spawn rules and filters name
export const BLOCKS = Object.freeze({
  grass: ns('savanna_grass'), grassTop: ns('savanna_grass_top'), log: ns('savanna_log'), leaves: ns('savanna_leaves'),
  earth: ns('termite_earth'), base: ns('termite_mound_base'), mid: ns('termite_mound_mid'), top: ns('termite_mound_top'),
  thorn: ns('thorn_bush'), bones: ns('bleached_bones'), boulder: ns('lichen_boulder'), nest: ns('weaver_nest'),
});
// warm (the red dunes' temperature band, so never the yellow desert above ~0.18 even with the +-0.04 jitter) and on the
// moist side of the dunes' humidity edge (-0.02), short of the glow marsh (0.25)
export const CLIMATE = Object.freeze({ temp: [-0.04, 0.14], humidity: [-0.02, 0.24] });

const TEXTURES = ['savanna_grass_bottom', 'savanna_grass_top', 'savanna_log_side', 'savanna_log_top', 'savanna_leaves', 'termite_earth',
  'termite_mound_side', 'termite_mound_top', 'thorn_bush', 'bleached_bones', 'lichen_boulder_side', 'lichen_boulder_top', 'weaver_nest'];

/** The three mound pieces, each a stack of boxes narrowing upward; each one's foot is a bit narrower than the top of the piece
 * below it (earth cube 1.0 -> base 0.94..0.8 -> mid 0.7..0.56 -> top 0.48..0.1), so a stacked spire tapers smoothly. */
export const MOUND_MODELS = Object.freeze({
  base: [[0.03, 0, 0.03, 0.97, 0.45, 0.97], [0.1, 0.45, 0.1, 0.9, 1, 0.9], [0.62, 0.3, 0, 0.88, 0.7, 0.03], [0, 0.1, 0.3, 0.03, 0.5, 0.62]],
  mid: [[0.15, 0, 0.15, 0.85, 0.55, 0.85], [0.22, 0.55, 0.22, 0.78, 1, 0.78], [0.85, 0.15, 0.38, 0.9, 0.5, 0.64]],
  top: [[0.26, 0, 0.26, 0.74, 0.35, 0.74], [0.32, 0.35, 0.32, 0.68, 0.65, 0.68], [0.4, 0.65, 0.4, 0.6, 0.88, 0.6], [0.45, 0.88, 0.45, 0.55, 1, 0.55]],
});
// the bones lying in the grass, a little pile in 1/16 units: a horned skull looking east (braincase, brow over two eye
// sockets, the nasal bridge, the muzzle and its lower jaw), two ribs standing out of the grass as arches, a long bone with
// knobbed ends along each edge and a short row of vertebrae
const u = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => [x0 / 16, y0 / 16, z0 / 16, x1 / 16, y1 / 16, z1 / 16];
export const BONES_MODEL = [
  // the skull
  u(2, 0, 9, 7, 4, 15), u(3, 4, 10, 6, 5, 14), // braincase and crown
  u(7, 0, 9, 9, 2, 15), u(7, 2, 11.5, 9, 4, 12.5), u(7, 4, 9.5, 8, 5, 14.5), // cheeks, nasal bridge, brow: the sockets between
  u(9, 1, 10.5, 12.5, 3, 13.5), u(9, 0, 10.5, 12, 0.6, 13.5), u(11.5, 0.6, 10.7, 12.2, 1, 11.3), u(11.5, 0.6, 12.7, 12.2, 1, 13.3), // muzzle, jaw, teeth
  u(3, 3, 7.5, 4.5, 4.5, 9), u(2, 4, 6.5, 3.5, 6, 8), u(1.5, 5.5, 6, 2.5, 7, 7), // a horn out of each side, back and up
  u(3, 3, 15, 4.5, 4.5, 16), u(2, 4, 15, 3.5, 6, 16), u(1.5, 5.5, 15, 2.5, 7, 16),
  // two ribs, arches out of the grass
  u(4, 0, 5.5, 5, 3, 6.5), u(4.5, 3, 5.5, 6, 4, 6.5), u(6, 3.5, 5.5, 8, 4.5, 6.5), u(8, 2.5, 5.5, 9, 4, 6.5), u(8.5, 0, 5.5, 9.5, 2.5, 6.5),
  u(5, 0, 7.3, 6, 2, 8.1), u(5.5, 2, 7.3, 7, 3, 8.1), u(7, 2.5, 7.3, 8.5, 3.3, 8.1), u(8.5, 0, 7.3, 9.3, 2.6, 8.1),
  // a long bone along the north edge, another along the east edge
  u(3.5, 0, 2.3, 12, 1.4, 3.5), u(1.5, 0, 1.4, 3.5, 2, 4.4), u(12, 0, 1.4, 14, 2, 4.4),
  u(13.3, 0, 6.5, 14.5, 1.2, 13), u(12.6, 0, 5, 15, 1.8, 6.5), u(12.6, 0, 13, 15, 1.8, 14.5),
  // vertebrae in a row, each with its spike
  u(10, 0, 5.5, 11.4, 1.3, 7), u(10, 0, 7.3, 11.4, 1.3, 8.8), u(10.4, 1.3, 5.9, 11, 2.2, 6.6), u(10.4, 1.3, 7.7, 11, 2.2, 8.4),
];

const plant = (name: string, tile: string, extra: Record<string, unknown> = {}) => ({
  name, solid: false, noCollide: true, transparent: true, cutout: true, hardness: 0, shape: 'cross', replaceable: true, needsFloor: true,
  tiles: { top: tile, side: tile, bottom: tile }, ...extra,
});

/** @param {any} ctx */
export function registerGoldenSavanna(ctx: any) {
  for (const t of TEXTURES) ctx.textures.png(t, `textures/golden_savanna/${t}.png`, { size: 16 });
  const tx = (t: string) => ns(t);
  const all = (t: string) => ({ top: tx(t), side: tx(t), bottom: tx(t) });

  // the tall golden grass is two blocks: the bottom (what the item places) and the top with the seed plumes
  ctx.blocks.register('savanna_grass', plant('Capim-dourado', tx('savanna_grass_bottom'), { replaceable: false }));
  ctx.blocks.register('savanna_grass_top', plant('Ponta de Capim-dourado', tx('savanna_grass_top'), { drop: BLOCKS.grass, hidden: true }));
  ctx.blocks.register('savanna_log', {
    name: 'Tronco de Savana', solid: true, hardness: 2, tool: 'axe',
    tiles: { top: tx('savanna_log_top'), side: tx('savanna_log_side'), bottom: tx('savanna_log_top') },
  });
  ctx.blocks.register('savanna_leaves', {
    name: 'Folhas de Savana', solid: true, cutout: true, transparent: true, hardness: 0.2, drop: null, tiles: all('savanna_leaves'),
  });
  ctx.blocks.register('termite_earth', {
    name: 'Terra de Cupim', solid: true, hardness: 0.7, tool: 'shovel', tiles: all('termite_earth'),
  });
  // the mound pieces: solid, drawn by the mesher from boxes (collision follows the model), each breaks into termite earth
  const mound = (name: string, model: number[][], top: string) => ({
    name, solid: true, hardness: 0.9, tool: 'shovel', drop: BLOCKS.earth,
    tiles: { top: tx(top), side: tx('termite_mound_side'), bottom: tx('termite_earth') }, geometry: { model },
  });
  ctx.blocks.register('termite_mound_base', mound('Base de Cupinzeiro', MOUND_MODELS.base, 'termite_earth'));
  ctx.blocks.register('termite_mound_mid', mound('Meio de Cupinzeiro', MOUND_MODELS.mid, 'termite_earth'));
  ctx.blocks.register('termite_mound_top', mound('Topo de Cupinzeiro', MOUND_MODELS.top, 'termite_mound_top'));
  ctx.blocks.register('thorn_bush', plant('Arbusto-de-espinhos', tx('thorn_bush')));
  // the bones lie flat in the grass: walk-through, aimed at as one low box, nothing hidden behind them
  ctx.blocks.register('bleached_bones', {
    name: 'Ossada Desbotada', solid: false, noCollide: true, transparent: true, hardness: 0.3, needsFloor: true, tiles: all('bleached_bones'),
    geometry: { model: BONES_MODEL, collision: [], selection: [[0, 0, 0, 1, 0.45, 1]], occlusion: [] },
  });
  ctx.blocks.register('lichen_boulder', {
    name: 'Rocha com Líquen', solid: true, hardness: 1.5, tool: 'pickaxe',
    tiles: { top: tx('lichen_boulder_top'), side: tx('lichen_boulder_side'), bottom: tx('lichen_boulder_side') },
  });
  // the weaver nest: the mesher draws only the knot tied under the leaves; the browser hangs the swaying pouch from it
  ctx.blocks.register('weaver_nest', {
    name: 'Ninho de Tecelão', solid: false, noCollide: true, transparent: true, hardness: 0.2, tiles: all('weaver_nest'),
    geometry: { model: [[0.4, 0.8, 0.4, 0.6, 1, 0.6]], collision: [], selection: [[0.25, 0, 0.25, 0.75, 1, 0.75]], occlusion: [] },
  });

  ctx.worldgen.biome('golden_savanna', {
    name: 'Savana Dourada',
    climate: { temp: [CLIMATE.temp[0], CLIMATE.temp[1]], humidity: [CLIMATE.humidity[0], CLIMATE.humidity[1]] },
    weight: 40,
    // terrain 2: where it grows in climate space (src/niches.ts, the whole climate map in one table); terrain 1 ignores it
    placement: nicheOf('golden_savanna'),
    surface: 'mineclaude:grass', filler: 'mineclaude:dirt',
    treeDensity: 0, grassDensity: 1.2, // no trees of the game: the flat-top trees are the feature's
    color: '#e8a01c', // golden grass (only the hue counts: the grass top comes out a sun-dried gold)
  });
  ctx.worldgen.feature('golden_savanna_decor', { biomes: [GOLDEN_SAVANNA], run: (api: any) => decorateGoldenSavanna(api) });

  ctx.render.blockEntity('weaver_nest', weaverNestRenderer);

  ctx.recipes.add({ key: 'planks_from_savanna_log', out: 'mineclaude:planks', n: 4, in: [[BLOCKS.log, 1]], category: 'mineclaude:building_blocks' });
  ctx.recipes.add({ key: 'clay_from_termite_earth', out: 'mineclaude:clay', n: 1, in: [[BLOCKS.earth, 1]], category: 'mineclaude:building_blocks' });
  ctx.recipes.add({ key: 'cobblestone_from_lichen_boulder', out: 'mineclaude:cobblestone', n: 1, in: [[BLOCKS.boulder, 1]], category: 'mineclaude:building_blocks' });
  ctx.recipes.add({ key: 'bones_from_bleached_bones', out: 'mineclaude:bone', n: 2, in: [[BLOCKS.bones, 1]], category: 'mineclaude:misc' });
  ctx.recipes.add({ key: 'sticks_from_thorn_bush', out: 'mineclaude:stick', n: 2, in: [[BLOCKS.thorn, 1]], category: 'mineclaude:misc' });
}
