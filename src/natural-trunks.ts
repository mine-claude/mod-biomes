// @ts-check
// The NATURAL TRUNKS of the biomes' trees (docs/modding.md §5.1): one block per log of a tree, the same for the game as
// the plain log it grows from (a full solid cube, axe, the same hardness and sound), drawn by the browser as a 3D trunk in
// the look of its tree — the ipê's twisted dark bark, the conifer's straight strips, the palm's rings, the mossy trunk's
// moss patches, the tall canopy's buttress roots, the marsh's bare dead wood (client/src/mesher/trunk.ts). No item of its
// own (`hidden`): breaking one gives the plain log, so building is unchanged. Worlds of terrain 2 grow them wherever a
// tree puts the plain log (the engine's natural-trunk pass); terrain 1 and every player-placed log keep the plain cube.
// Registered LAST among the mod's blocks (after the underground): new block names, nothing else moves.
import { ns } from './names.ts';

type Trunk = { plain: string, name: string, style: string, tiles: string, hardness?: number, accent?: string };
/** natural block path -> what it grows from and how it looks */
export const NATURAL_TRUNKS: Record<string, Trunk> = {
  ipe_tree_log: { plain: 'ipe_log', name: 'Tronco de Ipê', style: 'ipe', tiles: 'ipe_log', hardness: 2.4 },
  spruce_tree_log: { plain: 'spruce_log', name: 'Tronco de Abeto', style: 'conifer', tiles: 'spruce_log' },
  savanna_tree_log: { plain: 'savanna_log', name: 'Tronco de Savana', style: 'savanna', tiles: 'savanna_log' },
  palm_tree_log: { plain: 'palm_log', name: 'Tronco de Palmeira', style: 'palm', tiles: 'palm_log' },
  mossy_tree_log: { plain: 'mossy_log', name: 'Tronco Musgoso', style: 'mossy', tiles: 'mossy_log', accent: 'moss_carpet_top' },
  canopy_tree_log: { plain: 'canopy_log', name: 'Tronco de Copa', style: 'canopy', tiles: 'canopy_log' },
  dead_tree_log: { plain: 'dead_log', name: 'Tronco Morto', style: 'dead', tiles: 'dead_log' },
};

/** @param {any} ctx */
export function registerNaturalTrunks(ctx: any) {
  for (const [path, t] of Object.entries(NATURAL_TRUNKS)) {
    ctx.blocks.register(path, {
      name: t.name, solid: true, hidden: true, hardness: t.hardness ?? 2, tool: 'axe',
      tiles: { top: ns(`${t.tiles}_top`), side: ns(`${t.tiles}_side`), bottom: ns(`${t.tiles}_top`) },
      trunk: { of: ns(t.plain), style: t.style, ...(t.accent && { accent: ns(t.accent) }) },
    });
  }
}
