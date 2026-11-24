// @ts-check
// Planalto das Ruínas (biomes:ruin_plateau): a high rocky plateau of terraces and mesas, cliffs of weathered stone, a cushion
// of moss with patches of grass — and the remains of something old scattered over it — the home of the Ruin Colossus
// (creatures:ruin_colossus). Everything of it is registered by ONE call, registerRuinPlateau(ctx), from src/main.ts (the content
// entry: server, page, mesher Worker and the hosted Worker all run it, so they all generate the same chunks):
//   - its textures (textures/ruin_plateau/*.png, painted by ruin_plateau/art.ts through tools/gen-textures.ts)
//   - its blocks: weathered stone (the cliffs, the filler, the ruins' masonry), stone moss (the floor), and the NON-CUBE ruin
//     pieces: the column drum (an eight-sided drum, geometry boxes the mesher draws), the same drum lying along x or z (a
//     declared model with the cut face at its ends), the column capital (slab, scrolls and neck), the rune stone (a stone with
//     a carved glyph whose strokes glow faintly: an emissive cut-out model quad just off its faces) and the ancient statue (a
//     worn pedestal box; the figure on it is a blockEntity renderer, statue-renderer.ts)
//   - the biome itself: a cool, dry climate band (below the meadow's and the canopy's temperatures, on the dry side), almost no
//     trees, little tall grass
//   - one terrain step (ruin_plateau/terrain.ts): the plateau, its terraces and mesas, ramping up from the biome's edge
//   - one decoration step (ruin_plateau/feature.ts): cliff faces, grass and bare patches, one ruin per chunk at most, loose pieces
//   - cheap recipes: weathered stone -> cobblestone, 3 weathered stone -> 2 column drums, 2 drums -> a capital
import { ns } from '../src/names.ts';
import { decorateRuinPlateau } from './feature.ts';
import { shapePlateau } from './terrain.ts';
import { statueRenderer } from './statue-renderer.ts';
import { nicheOf } from '../src/niches.ts';

export const RUIN_PLATEAU = ns('ruin_plateau'); // 'biomes:ruin_plateau' — what spawn rules and filters name
export const BLOCKS = Object.freeze({
  stone: ns('weathered_stone'), moss: ns('stone_moss'), drum: ns('column_drum'), drumX: ns('fallen_drum_x'), drumZ: ns('fallen_drum_z'),
  capital: ns('column_capital'), rune: ns('rune_stone'), statue: ns('ancient_statue'),
});
export const RUNE_LIGHT = 3; // the glyph's faint light on its neighbours (a torch is 14)

const TEXTURES = ['weathered_stone_side', 'weathered_stone_top', 'stone_moss_top', 'stone_moss_side', 'column_drum_side', 'column_drum_top', 'column_drum_worn',
  'column_capital_side', 'column_capital_top', 'rune_stone_side', 'rune_stone_top', 'rune_stone_glyph'];

const px = (v: number) => v / 16;
// the drum's eight-sided section: three boxes (in pixels across the two axes of the section), unioned by the engine
const SECTION: Array<[number, number, number, number]> = [[3, 1, 13, 15], [1, 3, 15, 13], [2, 2, 14, 14]];
const drumBoxes = (axis: 'y' | 'x' | 'z') => SECTION.map(([a0, b0, a1, b1]) => {
  // upright: the section in x/z; lying along x: in z/y (resting on the ground, 14 px tall); along z: in x/y
  if (axis === 'y') return [px(a0), 0, px(b0), px(a1), 1, px(b1)];
  if (axis === 'x') return [0, px(a0 - 1), px(b0), 1, px(a1 - 1), px(b1)];
  return [px(b0), px(a0 - 1), 0, px(b1), px(a1 - 1), 1];
});
// the model of a lying drum: the same three boxes, the cut face at both ends, the worn shaft around
const fallenModel = (axis: 'x' | 'z') => ({
  textures: { worn: ns('column_drum_worn'), end: ns('column_drum_top') },
  elements: drumBoxes(axis).map((b) => {
    const from = [b[0] * 16, b[1] * 16, b[2] * 16], to = [b[3] * 16, b[4] * 16, b[5] * 16];
    const ends = axis === 'x' ? ['east', 'west'] : ['north', 'south'];
    const faces: Record<string, any> = {};
    for (const f of ['north', 'south', 'east', 'west', 'up', 'down']) faces[f] = { texture: ends.includes(f) ? '#end' : '#worn' };
    return { from, to, faces };
  }),
});
// the rune stone: a full cube of carved stone, and a shell a hair outside it carrying only the glyph's strokes, emissive
const G = 0.04; // the shell's gap (pixels)
const runeModel = {
  textures: { side: ns('rune_stone_side'), top: ns('rune_stone_top'), glyph: ns('rune_stone_glyph') },
  elements: [
    { from: [0, 0, 0], to: [16, 16, 16], faces: {
      north: { texture: '#side', cullface: 'north' }, south: { texture: '#side', cullface: 'south' },
      east: { texture: '#side', cullface: 'east' }, west: { texture: '#side', cullface: 'west' },
      up: { texture: '#top', cullface: 'up' }, down: { texture: '#top', cullface: 'down' } } },
    { from: [-G, 0, -G], to: [16 + G, 16, 16 + G], faces: {
      north: { texture: '#glyph', uv: [0, 0, 16, 16], emissive: true, blend: 'cutout', cullface: 'north' },
      south: { texture: '#glyph', uv: [0, 0, 16, 16], emissive: true, blend: 'cutout', cullface: 'south' },
      east: { texture: '#glyph', uv: [0, 0, 16, 16], emissive: true, blend: 'cutout', cullface: 'east' },
      west: { texture: '#glyph', uv: [0, 0, 16, 16], emissive: true, blend: 'cutout', cullface: 'west' } } },
  ],
};

/** @param {any} ctx */
export function registerRuinPlateau(ctx: any) {
  for (const t of TEXTURES) ctx.textures.png(t, `textures/ruin_plateau/${t}.png`, { size: 16 });
  const tx = (t: string) => ns(t);
  const stoneTiles = { top: tx('weathered_stone_top'), side: tx('weathered_stone_side'), bottom: tx('weathered_stone_top') };

  ctx.blocks.register('weathered_stone', { name: 'Pedra Desgastada', solid: true, hardness: 1.5, tool: 'pickaxe', tiles: stoneTiles });
  ctx.blocks.register('stone_moss', {
    name: 'Pedra Musgosa', solid: true, hardness: 1.2, tool: 'pickaxe', drop: BLOCKS.stone,
    tiles: { top: tx('stone_moss_top'), side: tx('stone_moss_side'), bottom: tx('weathered_stone_top') },
  });
  ctx.blocks.register('column_drum', {
    name: 'Tambor de Coluna', solid: true, hardness: 1.8, tool: 'pickaxe',
    tiles: { top: tx('column_drum_top'), side: tx('column_drum_side'), bottom: tx('column_drum_top') },
    geometry: { model: drumBoxes('y'), rotate: false },
  });
  for (const axis of ['x', 'z'] as const) {
    ctx.blocks.register(`fallen_drum_${axis}`, {
      name: 'Tambor Caído', solid: true, hardness: 1.8, tool: 'pickaxe', hidden: true, drop: BLOCKS.drum,
      tiles: { top: tx('column_drum_worn'), side: tx('column_drum_worn'), bottom: tx('column_drum_worn') },
      geometry: { model: drumBoxes(axis), rotate: false },
      model: fallenModel(axis),
    });
  }
  ctx.blocks.register('column_capital', {
    name: 'Capitel', solid: true, hardness: 1.8, tool: 'pickaxe',
    tiles: { top: tx('column_capital_top'), side: tx('column_capital_side'), bottom: tx('column_drum_top') },
    // the square slab on top, the scrolls' band under it, the eight-sided neck. It occludes nothing: the engine's sky light is
    // per column (a block whose occlusion covers the cell's top shades everything under it), and a capital must not leave its
    // own pillar in the dark
    geometry: { model: [[0, px(12), 0, 1, 1, 1], [px(1), px(6), px(1), px(15), px(12), px(15)], ...drumBoxes('y').map((b) => [b[0], 0, b[2], b[3], px(6), b[5]])], occlusion: [], rotate: false },
  });
  ctx.blocks.register('rune_stone', {
    name: 'Pedra Rúnica', solid: true, hardness: 2, tool: 'pickaxe', light: RUNE_LIGHT,
    tiles: { top: tx('rune_stone_top'), side: tx('rune_stone_side'), bottom: tx('rune_stone_top') },
    model: runeModel,
  });
  ctx.blocks.register('ancient_statue', {
    name: 'Estátua Antiga', solid: true, hardness: 3, tool: 'pickaxe',
    tiles: stoneTiles,
    // the block is the worn pedestal; the figure (statue-renderer.ts) stands on it and its body is what you bump into
    geometry: {
      model: [[px(1), 0, px(1), px(15), px(4), px(15)]],
      collision: [[px(3), 0, px(3), px(13), 1, px(13)]],
      selection: [[px(2), 0, px(2), px(14), 1, px(14)]],
      occlusion: [],
      rotate: false,
    },
  });
  ctx.render.blockEntity('ancient_statue', statueRenderer);

  ctx.worldgen.biome('ruin_plateau', {
    name: 'Planalto das Ruínas',
    // cool and dry: the corner of the climate below the meadow's and the canopy's temperatures (-0.2) and drier than the mossy
    // forest (0.05), which no other biome of this mod takes, and a thin band (-0.2..-0.14) shared with the meadow and the
    // canopy by weight, where the plateau breaks up into outliers
    climate: { temp: [-1, -0.14], humidity: [-1, 0.05] },
    weight: 40,
    // terrain 2: where it grows in climate space (src/niches.ts, the whole climate map in one table); terrain 1 ignores it
    placement: nicheOf('ruin_plateau'),
    surface: BLOCKS.moss, filler: BLOCKS.stone,
    treeDensity: 0.06, grassDensity: 0.4,
    color: '#8a9a58', // the grass of its patches: a dry, pale green
  });
  // no `biomes` filter on purpose (like the Brejo Luminoso): the step only lifts columns whose NEIGHBOURHOOD is mostly
  // plateau, ramping in from the border; with the filter the next biome's pockets inside the ramp would stay down as pits.
  // In a world without biomes biomeAt is always null and the step returns at once (the fixture stays the same).
  ctx.worldgen.terrain('ruin_plateau_shape', { run: (api: any) => shapePlateau(api) });
  ctx.worldgen.feature('ruin_plateau_decor', { biomes: [RUIN_PLATEAU], run: (api: any) => decorateRuinPlateau(api) });

  ctx.recipes.add({ key: 'cobblestone_from_weathered_stone', out: 'mineclaude:cobblestone', n: 1, in: [[BLOCKS.stone, 1]], category: 'mineclaude:building_blocks' });
  ctx.recipes.add({ key: 'column_drums_from_weathered_stone', out: BLOCKS.drum, n: 2, in: [[BLOCKS.stone, 3]], category: 'mineclaude:building_blocks' });
  ctx.recipes.add({ key: 'capital_from_drums', out: BLOCKS.capital, n: 1, in: [[BLOCKS.drum, 2]], category: 'mineclaude:building_blocks' });
}
