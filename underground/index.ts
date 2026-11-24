// @ts-check
// Subsolo (biomes:underground): what this mod adds UNDER every biome in terrain-2 worlds, through the underground API of the
// base game (ctx.worldgen.oreDeposit / caveRoom / caveDecor, docs/modding.md 22.7):
//   - STRATA: a band of pale Calcário (limestone) around the sea level and Ardósia (slate) at the bottom of the world, both
//     gently undulating (`layer` deposits: they replace plain stone; the game's ores already in it stay)
//   - COPPER: lumps of Minério de Cobre inside the limestone band only (a `blob` deposit hosted by the limestone)
//   - two cave ROOMS of its own, using the blocks of its biomes: the CRYSTAL GROTTO (amethyst walls, crystal clusters — the
//     Geodos de Cristal's blocks; the geodes themselves stay a structure of their own) and the MUSHROOM CAVE (mycelium floor,
//     glowing fungi, giant mushroom stems as pillars; only under the mushroom, marsh and forest biomes)
//   - DECOR for the base game's rooms: stalactites and stalagmites (non-cube dripstone), hanging moss over the lakes, a few
//     glowing fungi in the great caverns
// Blocks are registered here, at the END of the mod (after every biome), so no earlier block of the mod changes its id.
// Terrain 1 worlds never read any of it (the base game's terrain 1 has no deposits, rooms nor decor).
import { ns } from '../src/names.ts';

export const BLOCKS = Object.freeze({
  limestone: ns('limestone'), slate: ns('slate'), copper: ns('copper_ore'), stalactite: ns('stalactite'), stalagmite: ns('stalagmite'),
});
const TEXTURES = ['limestone', 'slate', 'copper_ore', 'dripstone'];

/** A box of a model in pixels (16 per block). */
const px = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => [x0 / 16, y0 / 16, z0 / 16, x1 / 16, y1 / 16, z1 / 16];
// a stalactite hangs from the top of its cell, thinning to a point; the stalagmite is the same cone standing up
export const STALACTITE_MODEL = [px(4, 11, 4, 12, 16, 12), px(5, 6, 5, 11, 11, 11), px(6, 2, 6, 10, 6, 10), px(7, 0, 7, 9, 2, 9)];
export const STALAGMITE_MODEL = STALACTITE_MODEL.map(([x0, y0, z0, x1, y1, z1]) => [x0, 1 - y1, z0, x1, 1 - y0, z1]);

const B = (n: string) => `mineclaude:${n}`;
const G = (n: string) => ns(n);

/** The deposits (strata and copper): depths are fractions of the sea level (0 = sea level, 1 = the world floor). */
export const DEPOSITS = Object.freeze({
  limestone_band: { kind: 'layer', block: BLOCKS.limestone, depth: [-0.5, 0.3], thickness: 8, size: 180, undulation: 6, frequency: 1 },
  slate_deep: { kind: 'layer', block: BLOCKS.slate, depth: [0.55, 1], thickness: 12, size: 140, undulation: 4, frequency: 1 },
  copper_lumps: { kind: 'blob', block: BLOCKS.copper, host: [BLOCKS.limestone], depth: [-0.5, 0.3], size: 10, frequency: 0.4, density: 0.5 },
});

/** The rooms of this mod. */
export const ROOMS = Object.freeze({
  crystal_grotto: {
    weight: 1, depth: [0.35, 1], shape: 'ellipsoid', radius: [5, 8], height: [6, 9], wobble: 0.18,
    decor: [
      { block: G('crystal_cluster'), on: 'floor', chance: 0.22 },
      { block: G('crystal_cluster_hanging'), on: 'ceiling', chance: 0.14 },
      { block: G('lit_amethyst'), on: 'wall', chance: 0.07, replace: true },
      { block: G('amethyst_block'), on: 'wall', chance: 0.65, replace: true },
      { block: G('amethyst_block'), on: 'ceiling', chance: 0.55, replace: true },
      { block: G('calcite'), on: 'floor', chance: 0.5, replace: true },
    ],
  },
  mushroom_cave: {
    weight: 4, depth: [0.05, 0.55], biomes: [G('mushroom_grove'), G('glow_marsh'), G('mossy_forest'), G('tall_canopy')],
    shape: 'dome', radius: [7, 11], height: [7, 11], wobble: 0.2,
    pillars: { count: [2, 4], radius: [0.8, 1.5], block: G('mushroom_stem') },
    decor: [
      { block: G('glow_fungus'), on: 'floor', chance: 0.14 },
      { block: G('mycelium_soil'), on: 'floor', chance: 0.85, replace: true },
      { block: G('hanging_moss'), on: 'ceiling', chance: 0.07 },
    ],
  },
});

/** Decor this mod adds to the base game's rooms (and to its own grotto). */
export const DECOR = Object.freeze({
  stalactites: { rooms: [B('grand_cavern'), B('lake_hall'), B('collapsed_shaft'), B('lava_chamber')], block: BLOCKS.stalactite, on: 'ceiling', chance: 0.07 },
  stalagmites: { rooms: [B('grand_cavern'), B('collapsed_shaft')], block: BLOCKS.stalagmite, on: 'floor', chance: 0.045 },
  lake_moss: { rooms: [B('lake_hall')], block: G('hanging_moss'), on: 'ceiling', chance: 0.05 },
  cavern_glow: { rooms: [B('grand_cavern')], block: G('glow_fungus'), on: 'floor', chance: 0.02 },
});

/** @param {any} ctx */
export function registerUnderground(ctx: any) {
  for (const t of TEXTURES) ctx.textures.png(t, `textures/underground/${t}.png`, { size: 16 });
  const tx = (t: string) => ns(t);
  const all = (t: string) => ({ top: tx(t), side: tx(t), bottom: tx(t) });
  ctx.blocks.register('limestone', { name: 'Calcário', solid: true, hardness: 1.2, tool: 'pickaxe', tiles: all('limestone') });
  ctx.blocks.register('slate', { name: 'Ardósia', solid: true, hardness: 2.2, tool: 'pickaxe', tiles: all('slate') });
  ctx.blocks.register('copper_ore', { name: 'Minério de Cobre', solid: true, hardness: 3, tool: 'pickaxe', tiles: all('copper_ore') });
  const drip = (name: string, model: number[][], extra: Record<string, unknown> = {}) => ({
    name, solid: false, noCollide: true, transparent: true, cutout: true, hardness: 0.6, tool: 'pickaxe', tiles: all('dripstone'), geometry: { model, rotate: false }, ...extra,
  });
  ctx.blocks.register('stalactite', drip('Estalactite', STALACTITE_MODEL));
  ctx.blocks.register('stalagmite', drip('Estalagmite', STALAGMITE_MODEL, { needsFloor: true }));

  for (const [path, spec] of Object.entries(DEPOSITS)) ctx.worldgen.oreDeposit(path, spec);
  for (const [path, spec] of Object.entries(ROOMS)) ctx.worldgen.caveRoom(path, spec);
  for (const [path, spec] of Object.entries(DECOR)) ctx.worldgen.caveDecor(path, spec);
}
