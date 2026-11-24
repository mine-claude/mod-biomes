// @ts-check
// The biomes' items as sculpted 3D models (ctx.render.itemModel, src/sculpt.ts — the same builder the base game's
// models use): the Frutinhas-do-gelo as a cluster of frosted berries on a sprig, the Lasca de Cristal as a broken
// lilac crystal with a translucent shell, the Osso Fóssil as a long bone sunk in a slab of red sandstone. Original designs in the icons' colours (snowy_taiga/art.ts, crystal_geodes/art.ts).
// Registered from the content entry (src/main.ts) like the block entity renderers: only the browser builds them.
import { sharedModel, tone, hex } from './sculpt.ts';
import { registerBiomeLogModels } from './log-models.ts';

/** A model definition over a sculpted, cached, shared geometry (what ctx.render.itemModel takes). */
const sculpted = (key: string, build: (solid: any, glass: any) => void, opts: { transform?: (g: any) => void } = {}) => ({
  /** @param {any} kit */
  build({ THREE }) { return sharedModel(THREE, `biomes:${key}`, build, { transform: opts.transform }); },
});

/** Frost berries: five red berries on a short sprig, each with a frosty glint, two small leaves. */
const frostBerries = sculpted('frost_berries', (s) => {
  const red = hex('#d0283a'), dark = hex('#8e1424'), frost = hex('#ffd6da'), leaf = hex('#3a7350'), leafDark = hex('#1e3f2c'), stem = hex('#5a3a22');
  s.rod([0.02, -0.46, 0], [-0.04, 0.1, 0], 0.02, stem);
  const berries = [[0, 0.1, 0, 0.17], [-0.2, -0.04, 0.08, 0.15], [0.2, -0.02, -0.06, 0.15], [0.06, -0.2, 0.14, 0.13], [-0.1, -0.22, -0.14, 0.12]];
  for (const [x, y, z, r] of berries) {
    s.rod([-0.02, y - 0.1, 0], [x, y, z], 0.012, stem); // the stalk to each berry
    s.lathe([[0, -r], [r * 0.8, -r * 0.5], [r, 0], [r * 0.8, r * 0.5], [0, r]], 7, red, x, y, z, { twist: 0.3 });
    s.box(r * 0.5, r * 0.25, r * 0.5, frost, x - r * 0.3, y + r * 0.6, z + r * 0.3, { rot: [0.3, 0.4, 0.2] }); // the frost on top
    s.box(r * 0.25, r * 0.25, r * 0.25, dark, x, y + r * 0.9, z, { rot: [0.2, 0.6, 0.2] }); // the calyx
  }
  s.box(0.22, 0.02, 0.1, leaf, -0.2, 0.2, 0.02, { rot: [0.2, 0.4, 0.5], faces: { bottom: leafDark } }); // the leaves
  s.box(0.2, 0.02, 0.09, leaf, 0.16, 0.16, -0.04, { rot: [-0.2, -0.3, -0.5], faces: { bottom: leafDark } });
});

/** The raw crystal shard: a short broken crystal standing on its slant, lilac, a white glint, in a translucent shell. */
const crystalShardRaw = sculpted('crystal_shard_raw', (s, glass) => {
  const light = hex('#efe4ff'), mid = hex('#c6a6f5'), deep = hex('#7c55c9'), dark = hex('#5a3a9e'), glint = hex('#ffffff');
  glass.lathe([[0.1, -0.44], [0.22, -0.3], [0.24, 0.1], [0.16, 0.34], [0, 0.46]], 6, mid, 0, 0, 0, { gloss: 0.4 });
  s.lathe([[0.05, -0.4], [0.13, -0.26], [0.14, 0.08], [0.08, 0.3], [0, 0.38]], 6, light, 0, 0, 0); // the pale core
  s.lathe([[0.08, -0.5], [0.22, -0.42], [0.2, -0.36]], 6, dark, 0, 0, 0); // the broken base, darker
  s.box(0.07, 0.1, 0.07, deep, -0.12, -0.3, 0.12, { rot: [0.5, 0.3, -0.4] }); // smaller shards at the foot
  s.box(0.05, 0.14, 0.05, deep, 0.16, -0.34, -0.06, { rot: [-0.3, 0.2, 0.6] });
  s.box(0.03, 0.16, 0.012, glint, -0.1, 0.1, 0.22, { rot: [0, 0, 0.15] }); // the glint
}, { transform: (g) => g.rotateZ(-0.3).rotateY(0.3) });

/** The fossil bone (biomes:fossil_bone): a big pale long bone, cracked and stained, half sunk in a slab of banded red
 * sandstone — the block's look (red_dunes/art.ts) as a thing to hold. */
const fossilBone = sculpted('fossil_bone', (s) => {
  const ivory = hex('#e2d3b2'), old = hex('#cdb894'), stain = hex('#c09468'), pore = hex('#7a6448');
  const rock = hex('#ad5129'), band = hex('#d98d55'), deep = hex('#8f3a1d');
  // the slab of sandstone, its strata on the sides, a broken corner
  s.box(0.86, 0.2, 0.5, rock, 0, -0.2, 0, { faces: { top: hex('#b85c30') } });
  s.box(0.88, 0.045, 0.52, band, 0, -0.16, 0);
  s.box(0.88, 0.035, 0.52, deep, 0, -0.27, 0);
  s.box(0.2, 0.16, 0.2, rock, 0.36, -0.12, 0.2, { rot: [0.2, 0.5, 0.3] });
  // the bone along the slab, sunk to half its depth: the shaft, the two knobbed ends, stains and pores
  s.rod([-0.3, -0.06, 0.04], [0.3, -0.06, -0.04], 0.075, ivory);
  for (const sign of [1, -1]) {
    const x = sign * 0.35, z = -sign * 0.045;
    s.lathe([[0, -0.11], [0.1, -0.05], [0.1, 0.05], [0, 0.11]], 7, old, x, -0.04, z + 0.07, { rot: [Math.PI / 2, 0, 0] });
    s.lathe([[0, -0.1], [0.09, -0.04], [0.09, 0.04], [0, 0.1]], 7, ivory, x, -0.05, z - 0.07, { rot: [Math.PI / 2, 0, 0] });
  }
  s.box(0.16, 0.02, 0.1, stain, -0.08, 0.01, 0.01, { rot: [0, 0.2, 0] });
  s.box(0.03, 0.02, 0.03, pore, 0.12, 0.015, -0.02);
  s.box(0.025, 0.02, 0.025, pore, -0.2, 0.012, 0.03);
}, { transform: (g) => g.rotateX(0.35).rotateY(-0.4) });

/** @param {any} ctx */
export function registerBiomeItemModels(ctx) {
  ctx.render.itemModel('fossil_bone', fossilBone);
  ctx.render.itemModel('frost_berries', frostBerries);
  ctx.render.itemModel('crystal_shard_raw', crystalShardRaw);
  registerBiomeLogModels(ctx); // the plain logs of the trees (src/log-models.ts)
}
