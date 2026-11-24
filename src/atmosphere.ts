// @ts-check
// The AIR of the biomes (ctx.particles.ambient, docs/modding.md §32.9): what floats around the player in each biome on the
// shaded graphics presets, on top of the base game's (falling leaves under any tree, motes in the sun, fireflies, embers,
// sea spray). The engine finds where each one can start and caps them per preset; this file only says which particle,
// where and when — the same conditions as the biomes' soundscapes (src/ambience.ts).
import { ns } from './names.ts';

/** @param {any} ctx */
export function registerBiomeAtmosphere(ctx: any) {
  // the kinds (new ones always at the end: the `ptc` message carries the id)
  ctx.particles.register('spore', { colors: ['#b8f7ff', '#d9b8ff', '#9ff0c8'], size: 0.05, life: 5, gravity: -0.02, drag: 1.5, speed: 0.2, spread: 0, rise: 0, shrink: false, burst: 8 });
  ctx.particles.register('snowflake', { colors: ['#ffffff', '#eef6ff', '#f6fbff'], size: 0.06, life: 5, gravity: 0.06, drag: 1.4, speed: 0.1, spread: 0, rise: 0, shrink: false, burst: 8 });
  ctx.particles.register('marsh_light', { colors: ['#7dffcf', '#b6ff8a', '#5ce6ff'], size: 0.08, life: 5, gravity: 0, drag: 1.2, speed: 0.35, spread: 0, rise: 0, shrink: false, burst: 8 });
  const A = (path: string, def: any) => ctx.particles.ambient(path, def);
  // Bosque de Cogumelos Gigantes: glowing spores drifting up between the caps, day and night
  A('mushroom_spores', { particle: 'spore', anchor: 'air', height: [-2, 7], glow: true, blink: 0.3, rate: 14, wind: 0.4, flutter: 0.4, radius: 16, max: 90,
    when: { biome: ns('mushroom_grove') } });
  // Taiga Nevada: a light snow always drifting through the pines (the snow weather adds the real snowfall on top)
  A('taiga_snow', { particle: 'snowflake', anchor: 'air', height: [1, 12], rate: 30, wind: 1.3, flutter: 0.5, radius: 18, max: 160,
    when: { biome: ns('snowy_taiga'), weather: ['clear', 'snow'] } });
  // Brejo Luminoso: the marsh lights — more fireflies, greener, low over the water and the moss at night
  A('marsh_lights', { particle: 'marsh_light', anchor: 'ground', height: [0.2, 1.6], glow: true, blink: 0.8, rate: 6, radius: 22, max: 70,
    when: { biome: ns('glow_marsh'), time: 'night', weather: 'clear' } });
  // Ipezal: the flowering canopies shed petals all the time (the falling leaves of the base game take the blossom's colour)
  A('ipe_petals', { particle: 'mineclaude:falling_leaf', anchor: 'canopy', fromBlock: true, rate: 10, gust: 2.5, wind: 1.6, flutter: 0.9, radius: 18, max: 80,
    when: { biome: ns('ipe_forest') } });
}
