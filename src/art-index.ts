// @ts-check
// The art of every biome, for tools/gen-textures.ts only (never imported by the game): one line per biome.
import type { Painter } from './pixel.ts';
import { MOSSY_FOREST_ART } from '../mossy_forest/art.ts';
import { GLOW_MARSH_ART } from '../glow_marsh/art.ts';
import { RED_DUNES_ART } from '../red_dunes/art.ts';
import { FLOWER_MEADOW_ART } from '../flower_meadow/art.ts';
import { TALL_CANOPY_ART } from '../tall_canopy/art.ts';
import { CRYSTAL_GEODES_ART } from '../crystal_geodes/art.ts';
import { CORAL_COAST_ART } from '../coral_coast/art.ts';
import { RUIN_PLATEAU_ART } from '../ruin_plateau/art.ts';
import { GOLDEN_SAVANNA_ART } from '../golden_savanna/art.ts';
import { MUSHROOM_GROVE_ART } from '../mushroom_grove/art.ts';
import { IPE_FOREST_ART } from '../ipe_forest/art.ts';
import { SNOWY_TAIGA_ART } from '../snowy_taiga/art.ts';
import { UNDERGROUND_ART } from '../underground/art.ts';

export const ART: Record<string, Record<string, Painter>> = {
  mossy_forest: MOSSY_FOREST_ART,
  glow_marsh: GLOW_MARSH_ART,
  red_dunes: RED_DUNES_ART,
  flower_meadow: FLOWER_MEADOW_ART,
  tall_canopy: TALL_CANOPY_ART,
  crystal_geodes: CRYSTAL_GEODES_ART,
  coral_coast: CORAL_COAST_ART,
  ruin_plateau: RUIN_PLATEAU_ART,
  golden_savanna: GOLDEN_SAVANNA_ART,
  mushroom_grove: MUSHROOM_GROVE_ART,
  ipe_forest: IPE_FOREST_ART,
  snowy_taiga: SNOWY_TAIGA_ART,
  underground: UNDERGROUND_ART,
};
