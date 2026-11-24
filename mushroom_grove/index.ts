// @ts-check
// Bosque de Cogumelos Gigantes (biomes:mushroom_grove): a damp, shaded, slightly mystical forest of GIANT MUSHROOMS instead of
// trees, on a floor of mycelium with small mushrooms, fairy rings and puffballs. Cool and humid (the cold end of the Floresta
// Musgosa's band and a little colder, on the humid side: where both fit they share by weight, so the forest keeps most of it). Everything of it is registered by ONE call,
// registerMushroomGrove(ctx), from src/main.ts:
//   - its textures (textures/mushroom_grove/*.png, painted by mushroom_grove/art.ts through tools/gen-textures.ts)
//   - its blocks, almost none of them cubes: tapering stems and a stem with shelf fungi (geometry boxes), caps in three colour
//     families (a body, a rounded dome, sloped edges and rounded corners: shapes.ts), the gills under them, small mushrooms
//     (declared models), the mycelium soil and the spore puffball (a showpiece with a block entity renderer, puffball.ts)
//   - the biome itself and one decoration step (feature.ts): the floor, the fairy rings and the giant mushrooms
//   - the violet caps and the small glowing mushroom shine at night (`light` + `emissive`, like the marsh's glow fungus)
//   - cheap recipes: a stem gives planks; small mushrooms give dye
import { ns } from '../src/names.ts';
import { decorateMushroomGrove } from './feature.ts';
import { puffballRenderer } from './puffball.ts';
import { CORNERS, DIRS, DOME, GILLS, PUFFBALL, STEM, STEM_THIN, cornerBoxes, edgeBoxes, type Box } from './shapes.ts';
import { nicheOf } from '../src/niches.ts';

export const MUSHROOM_GROVE = ns('mushroom_grove'); // 'biomes:mushroom_grove' — what spawn rules and filters name
export const COLOURS = ['red', 'ochre', 'violet'] as const;
export type Colour = typeof COLOURS[number];
export const CAP_LIGHT = 7; // block light of the violet caps' surface pieces (a torch is 14): a soft glow
export const SMALL_GLOW_LIGHT = 5;
export const BLOCKS = Object.freeze({
  soil: ns('mycelium_soil'), stem: ns('mushroom_stem'), stemThin: ns('mushroom_stem_thin'), shelfStem: ns('shelf_stem'), gills: ns('mushroom_gills'),
  smallRed: ns('small_mushroom_red'), smallOchre: ns('small_mushroom_ochre'), smallGlow: ns('small_mushroom_glow'), puffball: ns('spore_puffball'),
});
/** The block names of a cap of one colour: body, dome, edge_<dir>, corner_<corner>. */
export const capBlock = (c: Colour, part: string) => ns(part === 'body' ? `mushroom_cap_${c}` : part === 'dome' ? `mushroom_cap_${c}_top` : part.length === 1 ? `mushroom_cap_${c}_edge_${part}` : `mushroom_cap_${c}_corner_${part}`);

const TEXTURES = ['mycelium_top', 'mycelium_side', 'mushroom_stem_side', 'mushroom_stem_top', 'mushroom_gills', 'shelf_fungus', 'cap_red', 'cap_ochre', 'cap_violet', 'puffball'];
const COLOUR_NAME: Record<Colour, string> = { red: 'Vermelho', ochre: 'Ocre', violet: 'Violeta' };
const DIR_NAME: Record<string, string> = { n: 'norte', e: 'leste', s: 'sul', w: 'oeste', ne: 'nordeste', nw: 'noroeste', se: 'sudeste', sw: 'sudoeste' };

// one box in pixels (model elements) from a 0..1 box
const px = (b: Box) => ({ from: [b[0] * 16, b[1] * 16, b[2] * 16], to: [b[3] * 16, b[4] * 16, b[5] * 16] });
// a model element: `side` on the four sides and the top, `under` below
const element = (b: Box, side: string, top = side, under = side) => ({ ...px(b), faces: {
  north: { texture: side }, south: { texture: side }, east: { texture: side }, west: { texture: side }, up: { texture: top }, down: { texture: under } } });

/** @param {any} ctx */
export function registerMushroomGrove(ctx: any) {
  for (const t of TEXTURES) ctx.textures.png(t, `textures/mushroom_grove/${t}.png`, { size: 16 });
  const tx = (t: string) => ns(t);
  const STEM_SIDE = tx('mushroom_stem_side'), STEM_TOP = tx('mushroom_stem_top'), GILL = tx('mushroom_gills'), SHELF = tx('shelf_fungus');

  ctx.blocks.register('mycelium_soil', {
    name: 'Solo de Micélio', solid: true, hardness: 0.6, tool: 'shovel', drop: 'mineclaude:dirt',
    tiles: { top: tx('mycelium_top'), side: tx('mycelium_side'), bottom: 'dirt' },
  });
  // stems: geometry boxes, a rounded section; thick low, thin under the cap
  const stem = (name: string, boxes: Box[]) => ({ name, solid: true, hardness: 1.2, tool: 'axe', tiles: { top: STEM_TOP, side: STEM_SIDE, bottom: STEM_TOP }, geometry: { model: boxes, rotate: false } });
  ctx.blocks.register('mushroom_stem', stem('Caule de Cogumelo', STEM));
  ctx.blocks.register('mushroom_stem_thin', stem('Caule Fino de Cogumelo', STEM_THIN));
  // a thick stem with three shelf fungi (brackets) at different heights: the boxes answer for physics, the model draws it
  const SHELVES: Box[] = [[0.8125, 0.5625, 0.25, 1, 0.6875, 0.75], [0.25, 0.3125, 0, 0.75, 0.4375, 0.1875], [0, 0.75, 0.375, 0.1875, 0.8125, 0.625]];
  ctx.blocks.register('shelf_stem', {
    ...stem('Caule com Orelhas', [...STEM, ...SHELVES]), drop: BLOCKS.stem,
    model: { textures: { stem: STEM_SIDE, cut: STEM_TOP, shelf: SHELF, gill: GILL },
      elements: [...STEM.map((b) => element(b, '#stem', '#cut', '#cut')), ...SHELVES.map((b) => element(b, '#shelf', '#shelf', '#gill'))] },
  });
  // the gills under a cap: a thin roof and crossed fins hanging from it
  ctx.blocks.register('mushroom_gills', {
    name: 'Lamelas de Cogumelo', solid: true, hardness: 0.3, drop: null,
    tiles: { top: GILL, side: GILL, bottom: GILL }, geometry: { model: GILLS, rotate: false },
  });

  // the caps: three colour families; the violet one glows at night (its surface pieces light their neighbours)
  for (const c of COLOURS) {
    const skin = tx(`cap_${c}`), glow = c === 'violet';
    const lit = glow ? { emissive: true, light: CAP_LIGHT } : {};
    const piece = (path: string, name: string, boxes: Box[]) => ctx.blocks.register(path, {
      name, solid: true, hardness: 0.6, hidden: true, drop: capBlock(c, 'body'), tiles: { top: skin, side: skin, bottom: GILL }, geometry: { model: boxes, rotate: false }, ...lit, // rotate: false: each direction is its own block
    });
    ctx.blocks.register(`mushroom_cap_${c}`, {
      name: `Chapéu de Cogumelo ${COLOUR_NAME[c]}`, solid: true, hardness: 0.6, tiles: { top: skin, side: skin, bottom: GILL }, ...(glow ? { emissive: true } : {}),
    });
    piece(`mushroom_cap_${c}_top`, `Cúpula de Cogumelo ${COLOUR_NAME[c]}`, DOME);
    for (const d of DIRS) piece(`mushroom_cap_${c}_edge_${d}`, `Aba de Cogumelo ${COLOUR_NAME[c]} (${DIR_NAME[d]})`, edgeBoxes(d));
    for (const k of CORNERS) piece(`mushroom_cap_${c}_corner_${k}`, `Canto de Cogumelo ${COLOUR_NAME[c]} (${DIR_NAME[k]})`, cornerBoxes(k));
  }

  // small mushrooms: declared models (a stem and a cap with gills under it), walk-through, gone when the floor goes
  // (a glowing one: `emissive` on its cap elements only — on a block with a model it goes per element)
  const small = (path: string, name: string, cap: string, parts: Array<[Box, Box]>, glow = false) => {
    const sel: Box = [Math.min(...parts.map(([s, k]) => Math.min(s[0], k[0]))), 0, Math.min(...parts.map(([s, k]) => Math.min(s[2], k[2]))),
      Math.max(...parts.map(([s, k]) => Math.max(s[3], k[3]))), Math.max(...parts.map(([, k]) => k[4])), Math.max(...parts.map(([s, k]) => Math.max(s[5], k[5])))];
    ctx.blocks.register(path, {
      name, solid: false, noCollide: true, hardness: 0, replaceable: true, needsFloor: true,
      tiles: { top: cap, side: cap, bottom: GILL },
      geometry: { model: [sel], collision: [], support: [], rotate: false },
      model: { textures: { stem: STEM_SIDE, cap, gill: GILL }, elements: parts.flatMap(([s, k]) => [element(s, '#stem'), { ...element(k, '#cap', '#cap', '#gill'), ...(glow ? { emissive: true } : {}) }]) },
      ...(glow ? { light: SMALL_GLOW_LIGHT } : {}),
    });
  };
  const b = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): Box => [x0 / 16, y0 / 16, z0 / 16, x1 / 16, y1 / 16, z1 / 16];
  small('small_mushroom_red', 'Cogumelinho Vermelho', tx('cap_red'), [[b(7, 0, 7, 9, 6, 9), b(4, 6, 4, 12, 8, 12)], [b(7, 0, 7, 9, 6, 9), b(5, 8, 5, 11, 9, 11)]]);
  small('small_mushroom_ochre', 'Cogumelinhos Ocres', tx('cap_ochre'), [[b(4, 0, 5, 6, 4, 7), b(2, 4, 3, 8, 6, 9)], [b(10, 0, 9, 11, 6, 10), b(8, 6, 7, 13, 7, 12)]]);
  small('small_mushroom_glow', 'Cogumelinho Luminoso', tx('cap_violet'),
    [[b(5, 0, 6, 6, 7, 7), b(4, 7, 5, 7, 8, 8)], [b(9, 0, 9, 10, 5, 10), b(8, 5, 8, 11, 6, 11)], [b(11, 0, 4, 12, 3, 5), b(10, 3, 3, 13, 4, 6)]],
    true);
  // the spore puffball: a round ball (geometry boxes) that breathes and puffs spores (puffball.ts, a block entity renderer)
  ctx.blocks.register('spore_puffball', {
    name: 'Bufa-de-lobo', solid: true, hardness: 0.2, tiles: { top: tx('puffball'), side: tx('puffball'), bottom: tx('puffball') }, geometry: { model: PUFFBALL, rotate: false },
  });
  ctx.render.blockEntity('spore_puffball', puffballRenderer());

  ctx.worldgen.biome('mushroom_grove', {
    name: 'Bosque de Cogumelos Gigantes',
    // cool and humid: the cold end of the Floresta Musgosa's band (-0.45..0.12) and colder, its humidity and a bit drier. Where
    // both fit, the pick noise shares by weight (~5% of the land for the grove; the forest goes from ~19% to ~16.5%)
    climate: { temp: [-0.6, -0.15], humidity: [-0.03, 1] },
    weight: 45,
    // terrain 2: where it grows in climate space (src/niches.ts, the whole climate map in one table); terrain 1 ignores it
    placement: nicheOf('mushroom_grove'),
    surface: BLOCKS.soil, filler: 'mineclaude:dirt',
    treeDensity: 0, grassDensity: 0.4, // no trees: the giant mushrooms are the trees here
    color: '#5f8a6a', // a cold, damp green for the grass that stays (columns that keep grass)
  });
  ctx.worldgen.feature('mushroom_grove_decor', { biomes: [MUSHROOM_GROVE], run: (api: any) => decorateMushroomGrove(api) });

  ctx.recipes.add({ key: 'planks_from_mushroom_stem', out: 'mineclaude:planks', n: 2, in: [[BLOCKS.stem, 1]], category: 'mineclaude:building_blocks' });
  ctx.recipes.add({ key: 'planks_from_mushroom_stem_thin', out: 'mineclaude:planks', n: 1, in: [[BLOCKS.stemThin, 1]], category: 'mineclaude:building_blocks' });
  for (const [block, dye] of [['small_mushroom_red', 'dye_red'], ['small_mushroom_ochre', 'dye_yellow'], ['small_mushroom_glow', 'dye_purple']]) {
    ctx.recipes.add({ key: `${dye}_from_${block}`, out: `mineclaude:${dye}`, n: 1, in: [[ns(block), 1]], category: 'mineclaude:misc' });
  }
}
