// @ts-check
// Costa de Corais (biomes:coral_coast): a warm, humid coast — shell sand, palms, coral reefs in the shallows, tide pools,
// driftwood and the odd giant clam — the home of the Ermitão das Marés (creatures:tide_hermit). Everything of it is
// registered by ONE call, registerCoralCoast(ctx), from src/main.ts (the content entry: server, page, mesher Worker and the
// hosted Worker all run it, so they all generate the same chunks):
//   - its textures (textures/coral_coast/*.png, painted by coral_coast/art.ts through tools/gen-textures.ts)
//   - its blocks: shell sand, two cube corals (coral block, brain coral), three shaped corals (branching, fan, tube), the
//     seashell, the palm (log, leaves, hanging frond tip, coconut), driftwood and the giant clam; most of them are NOT
//     cubes: box models (`geometry.model`, models.ts) or crossed quads (`shape: 'cross'`)
//   - the giant clam's living upper valve (ctx.render.blockEntity, clam-renderer.ts; browser only)
//   - the biome itself (climate band, weight, shell-sand floor, no base trees or tall grass)
//   - one decoration step (feature.ts): the beach, the reefs, tide pools, driftwood, palms, clams
//   - cheap recipes (palm log and driftwood give planks, shell sand melts to glass)
import { ns } from '../src/names.ts';
import { decorateCoralCoast } from './feature.ts';
import { giantClamRenderer } from './clam-renderer.ts';
import { BRANCH_CORAL, CLAM_BASE, COCONUT, DRIFTWOOD, SEASHELL, TUBE_CORAL } from './models.ts';
import { nicheOf } from '../src/niches.ts';

export const CORAL_COAST = ns('coral_coast'); // 'biomes:coral_coast' — what spawn rules and filters name
export const BLOCKS = Object.freeze({
  shellSand: ns('shell_sand'), coral: ns('coral_block'), brain: ns('brain_coral_block'), branch: ns('branch_coral'), fan: ns('fan_coral'),
  tube: ns('tube_coral'), seashell: ns('seashell'), palmLog: ns('palm_log'), palmLeaves: ns('palm_leaves'), frond: ns('palm_frond'),
  coconut: ns('coconut'), driftwood: ns('driftwood'), clam: ns('giant_clam'),
});

const TEXTURES = ['shell_sand', 'coral_block', 'brain_coral_block', 'branch_coral', 'fan_coral', 'tube_coral_side', 'tube_coral_top', 'seashell',
  'palm_log_side', 'palm_log_top', 'palm_leaves', 'palm_frond', 'coconut', 'driftwood', 'giant_clam_shell', 'giant_clam_mantle'];

const all = (t: string) => ({ top: t, side: t, bottom: t });
// a small shape made of boxes: see-through around it, walked through, broken at once, gone when the block below goes
const shaped = (name: string, tiles: Record<string, string>, model: number[][], extra: Record<string, unknown> = {}) => ({
  name, solid: false, noCollide: true, transparent: true, cutout: true, hardness: 0.2, needsFloor: true,
  tiles, geometry: { model, rotate: false }, ...extra,
});

/** @param {any} ctx */
export function registerCoralCoast(ctx: any) {
  for (const t of TEXTURES) ctx.textures.png(t, `textures/coral_coast/${t}.png`, { size: 16 });
  const tx = (t: string) => ns(t);

  ctx.blocks.register('shell_sand', {
    name: 'Areia de Conchas', solid: true, gravity: true, hardness: 0.5, tool: 'shovel', tiles: all(tx('shell_sand')),
  });
  ctx.blocks.register('coral_block', { name: 'Bloco de Coral', solid: true, hardness: 1.2, tool: 'pickaxe', tiles: all(tx('coral_block')) });
  ctx.blocks.register('brain_coral_block', { name: 'Coral-cérebro', solid: true, hardness: 1.2, tool: 'pickaxe', tiles: all(tx('brain_coral_block')) });
  ctx.blocks.register('branch_coral', shaped('Coral-galhado', all(tx('branch_coral')), BRANCH_CORAL));
  ctx.blocks.register('fan_coral', {
    name: 'Coral-leque', solid: false, noCollide: true, transparent: true, cutout: true, hardness: 0, shape: 'cross', replaceable: true, needsFloor: true,
    tiles: all(tx('fan_coral')),
  });
  ctx.blocks.register('tube_coral', shaped('Coral-tubo', { top: tx('tube_coral_top'), side: tx('tube_coral_side'), bottom: tx('tube_coral_top') }, TUBE_CORAL));
  ctx.blocks.register('seashell', shaped('Concha', all(tx('seashell')), SEASHELL, { hardness: 0 }));
  ctx.blocks.register('palm_log', {
    name: 'Tronco de Palmeira', solid: true, hardness: 2, tool: 'axe',
    tiles: { top: tx('palm_log_top'), side: tx('palm_log_side'), bottom: tx('palm_log_top') },
  });
  // like the base game's leaves: solid, see-through, quick to break (no leaf decay in this game)
  ctx.blocks.register('palm_leaves', { name: 'Folhas de Palmeira', solid: true, transparent: true, cutout: true, hardness: 0.2, tiles: all(tx('palm_leaves')) });
  // the drooping tip of a frond hangs under the crown (two crossed quads, no floor needed)
  ctx.blocks.register('palm_frond', {
    name: 'Ponta de Folha de Palmeira', solid: false, noCollide: true, transparent: true, cutout: true, hardness: 0, shape: 'cross', replaceable: true,
    tiles: all(tx('palm_frond')), drop: BLOCKS.palmLeaves,
  });
  ctx.blocks.register('coconut', shaped('Coco', all(tx('coconut')), COCONUT, { needsFloor: false, hardness: 0.3 }));
  ctx.blocks.register('driftwood', {
    name: 'Madeira à Deriva', solid: true, transparent: true, cutout: true, hardness: 1.5, tool: 'axe',
    tiles: all(tx('driftwood')),
    geometry: { model: DRIFTWOOD, rotate: false },
  });
  // the giant clam: the block is the lower valve (a fluted bowl you can stand on); the upper valve is the renderer's
  ctx.blocks.register('giant_clam', {
    name: 'Marisco-gigante', solid: true, transparent: true, cutout: true, hardness: 1.5, tool: 'pickaxe',
    tiles: { top: tx('giant_clam_mantle'), side: tx('giant_clam_shell'), bottom: tx('giant_clam_shell') },
    geometry: { model: CLAM_BASE, rotate: false },
  });
  ctx.render.blockEntity('giant_clam', giantClamRenderer);

  ctx.worldgen.biome('coral_coast', {
    name: 'Costa de Corais',
    // warm and humid: the top of the temperature band, from a little under the desert (~0.18) into its edge (where the
    // base game's desert sand takes a column, the decoration treats it as beach sand: a sandy tropical shore), on the humid
    // side of the humidity noise. Coasts are everywhere in the base terrain (about a tenth of the columns are beach, another
    // tenth shallow sea), so the band meets the sea often.
    climate: { temp: [0.1, 0.24], humidity: [0, 1] }, // (never on the dry side, where the Dunas Vermelhas are)
    weight: 45,
    // terrain 2: where it grows in climate space (src/niches.ts, the whole climate map in one table); terrain 1 ignores it
    placement: nicheOf('coral_coast'),
    surface: BLOCKS.shellSand, filler: 'mineclaude:sand',
    treeDensity: 0, grassDensity: 0, // its trees are the palms of the decoration step
    color: '#5fbf58', // a lush tint for any grass left in it
  });
  ctx.worldgen.feature('coral_coast_decor', { biomes: [CORAL_COAST], run: (api: any) => decorateCoralCoast(api) });

  ctx.recipes.add({ key: 'planks_from_palm_log', out: 'mineclaude:planks', n: 4, in: [[BLOCKS.palmLog, 1]], category: 'mineclaude:building_blocks' });
  ctx.recipes.add({ key: 'planks_from_driftwood', out: 'mineclaude:planks', n: 2, in: [[BLOCKS.driftwood, 1]], category: 'mineclaude:building_blocks' });
  ctx.recipes.add({ key: 'glass_from_shell_sand', type: 'smelting', out: 'mineclaude:glass', n: 1, in: [[BLOCKS.shellSand, 1], ['mineclaude:coal', 1]], station: 'furnace', category: 'mineclaude:furnace_blocks' });
}
