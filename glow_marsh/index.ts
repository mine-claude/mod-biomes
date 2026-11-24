// @ts-check
// Brejo Luminoso (biomes:glow_marsh): a low, wet marsh at the water line, with pools and channels, reeds, drowned dead
// trees and a fungus that glows at night — the home of the Lampiraço (creatures:lure_lantern). Everything of it is
// registered by ONE call, registerGlowMarsh(ctx), from src/main.ts (the content entry: server, page, mesher Worker and the
// hosted Worker all run it, so they all generate the same chunks):
//   - its textures (textures/glow_marsh/*.png, painted by glow_marsh/art.ts through tools/gen-textures.ts)
//   - its blocks: mud (slows the walk a little), peat, reed (two blocks), glow fungus (a light source), dead log, marsh pad
//   - the biome itself (climate band, weight, tinted grass on the hummocks, few trees)
//   - one terrain step (terrain.ts) that brings its land down to the water line (the sea stage then fills the pools)
//   - one decoration step (feature.ts): mud and peat floor, reeds, pads, glow fungus, drowned dead trees
//   - a cheap recipe: a dead log gives planks like any log
import { ns } from '../src/names.ts';
import { shapeMarsh } from './terrain.ts';
import { decorateGlowMarsh } from './feature.ts';
import { nicheOf } from '../src/niches.ts';

export const GLOW_MARSH = ns('glow_marsh'); // 'biomes:glow_marsh' — what spawn rules and filters name
export const BLOCKS = Object.freeze({
  mud: ns('mud'), peat: ns('peat'), reed: ns('reed'), reedTop: ns('reed_top'), fungus: ns('glow_fungus'), dead: ns('dead_log'), pad: ns('marsh_pad'),
});
export const MUD_SPEED = 0.8; // walking on mud: 80% of the usual speed (the engine's speedFactor, both sides)
export const FUNGUS_LIGHT = 10; // block light of the glow fungus (a torch is 14)

const TEXTURES = ['mud_top', 'mud_side', 'peat', 'reed_bottom', 'reed_top', 'glow_fungus', 'dead_log_side', 'dead_log_top', 'marsh_pad'];

// plants drawn as two crossed quads, see-through, walk-through, broken at once, gone when the block below goes
const plant = (name: string, tile: string, extra: Record<string, unknown> = {}) => ({
  name, solid: false, noCollide: true, transparent: true, cutout: true, hardness: 0, shape: 'cross', replaceable: true, needsFloor: true,
  tiles: { top: tile, side: tile, bottom: tile }, ...extra,
});

/** @param {any} ctx */
export function registerGlowMarsh(ctx: any) {
  for (const t of TEXTURES) ctx.textures.png(t, `textures/glow_marsh/${t}.png`, { size: 16 });
  const tx = (t: string) => ns(t);

  ctx.blocks.register('mud', {
    name: 'Lama', solid: true, hardness: 0.6, tool: 'shovel', speedFactor: MUD_SPEED,
    tiles: { top: tx('mud_top'), side: tx('mud_side'), bottom: tx('mud_side') },
  });
  ctx.blocks.register('peat', {
    name: 'Turfa', solid: true, hardness: 0.7, tool: 'shovel',
    tiles: { top: tx('peat'), side: tx('peat'), bottom: tx('peat') },
  });
  // the reed is two blocks: the bottom (what the item places) and the top with the seed heads, which drops a reed
  ctx.blocks.register('reed', plant('Junco', tx('reed_bottom'), { replaceable: false }));
  ctx.blocks.register('reed_top', plant('Ponta de Junco', tx('reed_top'), { drop: BLOCKS.reed, hidden: true }));
  // the glow fungus lights its neighbours (`light`) and shines itself at night (`emissive`: its faces ignore the dark)
  ctx.blocks.register('glow_fungus', plant('Fungo Luminoso', tx('glow_fungus'), { light: FUNGUS_LIGHT, emissive: true }));
  ctx.blocks.register('dead_log', {
    name: 'Tronco Morto', solid: true, hardness: 2, tool: 'axe',
    tiles: { top: tx('dead_log_top'), side: tx('dead_log_side'), bottom: tx('dead_log_top') },
  });
  // a leaf floating on the pools: a thin plate one block above the water, which can be stood on
  ctx.blocks.register('marsh_pad', {
    name: 'Folha-de-brejo', solid: true, cutout: true, transparent: true, hardness: 0,
    tiles: { top: tx('marsh_pad'), side: tx('marsh_pad'), bottom: tx('marsh_pad') },
    geometry: { model: [[0, 0, 0, 1, 1 / 16, 1]] },
  });

  ctx.worldgen.biome('glow_marsh', {
    name: 'Brejo Luminoso',
    // mild and wet: below the desert (~0.18), on the humid side of the humidity noise
    climate: { temp: [-0.2, 0.17], humidity: [0.25, 1] },
    weight: 35,
    // terrain 2: where it grows in climate space (src/niches.ts, the whole climate map in one table); terrain 1 ignores it
    placement: nicheOf('glow_marsh'),
    surface: 'mineclaude:grass', filler: 'mineclaude:dirt', // the drier hummocks keep (tinted) grass; the feature makes the mud
    treeDensity: 0.35, grassDensity: 1.3,
    color: '#5f7a3c', // a murky green for its grass
  });
  // no `biomes` filter on purpose: the step itself only moves columns whose NEIGHBOURHOOD is mostly marsh (terrain.ts), so the
  // border fades out smoothly; with the filter, the ragged pockets of the next biome inside that fade would stay up as walls.
  // In a world without biomes biomeAt is always null and the step returns at once (nothing moves: the fixture stays the same).
  ctx.worldgen.terrain('glow_marsh_terrain', { run: (api: any) => shapeMarsh(api) });
  ctx.worldgen.feature('glow_marsh_decor', { biomes: [GLOW_MARSH], run: (api: any) => decorateGlowMarsh(api) });

  ctx.recipes.add({ key: 'planks_from_dead_log', out: 'mineclaude:planks', n: 4, in: [[BLOCKS.dead, 1]], category: 'mineclaude:building_blocks' });
}
