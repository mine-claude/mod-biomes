// @ts-check
// The SOUNDSCAPES of the biomes (ctx.sounds.ambience, docs/modding.md §23.2). They play on top of the base game's (rain,
// wind, caves, the generic forest of leaves around): each one here is what makes a biome sound like itself, by day and by
// night. The engine crossfades them by the share of each biome around the player. Every voice is procedural.
import { ns } from './names.ts';

/** @param {any} ctx */
export function registerBiomeAmbience(ctx: any) {
  const A = (path: string, def: any) => ctx.sounds.ambience(path, def);
  const day = (biome: string, extra: any = {}) => ({ biome: ns(biome), time: 'day', weather: 'clear', ...extra });
  const night = (biome: string, extra: any = {}) => ({ biome: ns(biome), time: 'night', ...extra });

  // Floresta Musgosa: damp and quiet, whistling birds by day; owls and frogs in the wet moss by night
  A('mossy_forest_day', { when: day('mossy_forest'), fade: 4, events: [
    { voice: 'bird_whistle', every: [4, 10], gain: [0.25, 0.5], pan: 0.9 },
    { voice: 'bird_chirp', every: [5, 12], gain: [0.15, 0.35], pan: 0.9 },
  ] });
  A('mossy_forest_night', { when: night('mossy_forest'), bed: { voice: 'frogs', gain: 0.25 }, fade: 4, events: [
    { voice: 'owl', every: [12, 30], gain: [0.3, 0.6], pan: 0.9 },
  ] });
  // Bosque de Copas Altas: a tall canopy full of song, woodpeckers and creaking trunks
  A('tall_canopy_day', { when: day('tall_canopy'), bed: { voice: 'leaves', gain: 0.4 }, fade: 4, events: [
    { voice: 'bird_song', every: [5, 12], gain: [0.25, 0.5], pan: 0.9 },
    { voice: 'woodpecker', every: [15, 40], gain: [0.2, 0.4], pan: 0.9 },
    { voice: 'creak', every: [15, 35], gain: [0.15, 0.3], pan: 0.7 },
  ] });
  A('tall_canopy_night', { when: night('tall_canopy'), fade: 4, events: [{ voice: 'owl', every: [15, 35], gain: [0.3, 0.55], pan: 0.9 }] });
  // Ipezal: songbirds all day long
  A('ipe_forest_day', { when: day('ipe_forest'), fade: 4, events: [
    { voice: 'bird_song', every: [3, 8], gain: [0.3, 0.6], pan: 0.9 },
    { voice: 'bird_warble', every: [4, 10], gain: [0.2, 0.45], pan: 0.9 },
    { voice: 'bird_chirp', every: [3, 9], gain: [0.2, 0.45], pan: 0.9 },
  ] });
  A('ipe_forest_night', { when: night('ipe_forest'), bed: { voice: 'crickets', gain: 0.5 }, fade: 4 });
  // Brejo Luminoso: frogs and insects at night, a few marsh birds by day
  A('glow_marsh_night', { when: night('glow_marsh'), beds: [{ voice: 'frogs', gain: 0.85 }, { voice: 'crickets', gain: 0.4 }], fade: 4, events: [
    { voice: 'frog_croak', every: [3, 9], gain: [0.3, 0.7], pan: 0.9 },
  ] });
  A('glow_marsh_day', { when: day('glow_marsh'), bed: { voice: 'frogs', gain: 0.25 }, fade: 4, events: [
    { voice: 'bird_whistle', every: [8, 20], gain: [0.2, 0.4], pan: 1 },
    { voice: 'frog_croak', every: [10, 25], gain: [0.2, 0.4], pan: 0.9 },
  ] });
  // Costa de Corais: the surf, louder near the water, a wave breaking close now and then
  A('coral_coast', { when: { biome: ns('coral_coast') }, bed: { voice: 'waves', gain: 0.55 }, fade: 4 });
  A('coral_coast_shore', { when: { biome: ns('coral_coast'), near: 'water' }, bed: { voice: 'waves', gain: 0.6 }, fade: 3, events: [
    { voice: 'wave_crash', every: [7, 16], gain: [0.3, 0.6], pan: 0.6 },
  ] });
  // Savana Dourada: cicadas in the heat and a dry wind; crickets at night
  A('golden_savanna_day', { when: day('golden_savanna'), beds: [{ voice: 'cicadas', gain: 0.6 }, { voice: 'wind_dry', gain: 0.25 }], fade: 4 });
  A('golden_savanna_night', { when: night('golden_savanna'), bed: { voice: 'crickets', gain: 0.6 }, fade: 4 });
  // Taiga Nevada: a cold wind through the pines, creaking trunks, an owl at night
  A('snowy_taiga', { when: { biome: ns('snowy_taiga') }, bed: { voice: 'wind_soft', gain: 0.65 }, fade: 4, events: [
    { voice: 'creak', every: [8, 22], gain: [0.2, 0.4], pan: 0.8 },
  ] });
  A('snowy_taiga_night', { when: night('snowy_taiga'), fade: 4, events: [{ voice: 'owl', every: [18, 40], gain: [0.25, 0.5], pan: 0.9 }] });
  // Bosque de Cogumelos Gigantes: an eerie low hum and spores puffing
  A('mushroom_grove', { when: { biome: ns('mushroom_grove') }, bed: { voice: 'hum', gain: 0.55 }, fade: 5, events: [
    { voice: 'puff', every: [4, 12], gain: [0.2, 0.45], pan: 0.9 },
  ] });
  // Dunas Vermelhas: dry wind with sand in it
  A('red_dunes', { when: { biome: ns('red_dunes') }, bed: { voice: 'wind_dry', gain: 0.75 }, fade: 4 });
  // Planalto das Ruínas: sparse wind and a far call coming back off the stones
  A('ruin_plateau', { when: { biome: ns('ruin_plateau') }, bed: { voice: 'wind', gain: 0.45 }, fade: 4, events: [
    { voice: 'echo_call', every: [20, 55], gain: [0.15, 0.35], pan: 1 },
  ] });
  // Prado Florido: a soft field full of small birds
  A('flower_meadow_day', { when: day('flower_meadow'), bed: { voice: 'meadow', gain: 0.55 }, fade: 4, events: [
    { voice: 'bird_chirp', every: [3, 9], gain: [0.2, 0.45], pan: 1 },
    { voice: 'bird_warble', every: [8, 18], gain: [0.15, 0.35], pan: 1 },
  ] });
  A('flower_meadow_night', { when: night('flower_meadow'), bed: { voice: 'crickets', gain: 0.65 }, fade: 4 });
  // Geodos de Cristal (underground, under any biome): crystals chiming in the dark
  A('crystal_geodes', { when: { near: 'glass', depth: [3, 10] }, fade: 3, events: [
    { voice: 'chime', every: [3, 9], gain: [0.2, 0.5], pan: 0.9 },
  ] });
}
