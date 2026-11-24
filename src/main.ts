// @ts-check
// Biomas do Mundo (biomes): the official biome mod. This is the CONTENT entry — it runs everywhere a world is generated (the
// server, the page, the page's mesher Worker and the hosted world's Worker), so every side registers the same blocks, biomes
// and generation steps and generates byte-identical chunks. Biomes only shape worlds CREATED with biomes (every new world
// by default; MODLOADER_BIOMES=0 opts out); an existing world without them never changes.
// One biome = one folder + ONE import + ONE call here (see README.md, "Como acrescentar um bioma").
import { registerMossyForest } from '../mossy_forest/index.ts';
import { registerGlowMarsh } from '../glow_marsh/index.ts';
import { registerRedDunes, registerFossilSkeleton } from '../red_dunes/index.ts';
import { registerFlowerMeadow } from '../flower_meadow/index.ts';
import { registerTallCanopy } from '../tall_canopy/index.ts';
import { registerCrystalGeodes } from '../crystal_geodes/index.ts';
import { registerCoralCoast } from '../coral_coast/index.ts';
import { registerRuinPlateau } from '../ruin_plateau/index.ts';
import { registerGoldenSavanna } from '../golden_savanna/index.ts';
import { registerMushroomGrove } from '../mushroom_grove/index.ts';
import { registerIpeForest } from '../ipe_forest/index.ts';
import { registerSnowyTaiga } from '../snowy_taiga/index.ts';
import { registerUnderground } from '../underground/index.ts';
import { registerBiomeItemModels } from './item-models.ts';
import { registerNaturalTrunks } from './natural-trunks.ts';
import { registerBiomeAmbience } from './ambience.ts';
import { registerBiomeAtmosphere } from './atmosphere.ts';

/** @param {any} ctx */
export default function register(ctx) {
  registerMossyForest(ctx); // Floresta Musgosa (mossy_forest/)
  registerGlowMarsh(ctx); // Brejo Luminoso (glow_marsh/)
  registerRedDunes(ctx); // Dunas Vermelhas (red_dunes/)
  registerFlowerMeadow(ctx); // Prado Florido (flower_meadow/)
  registerTallCanopy(ctx); // Bosque de Copas Altas (tall_canopy/)
  registerCrystalGeodes(ctx); // Geodos de Cristal (crystal_geodes/): underground, under any biome
  registerCoralCoast(ctx); // Costa de Corais (coral_coast/)
  registerRuinPlateau(ctx); // Planalto das Ruínas (ruin_plateau/)
  registerGoldenSavanna(ctx); // Savana Dourada (golden_savanna/)
  registerMushroomGrove(ctx); // Bosque de Cogumelos Gigantes (mushroom_grove/)
  registerIpeForest(ctx); // Ipezal (ipe_forest/)
  registerSnowyTaiga(ctx); // Taiga Nevada (snowy_taiga/)
  registerUnderground(ctx); // Subsolo (underground/): strata, copper, crystal grottos, mushroom caves, stalactites — LAST (new block ids)
  registerFossilSkeleton(ctx); // the shaped fossil skeleton of the red dunes (red_dunes/skeleton.ts): appended after every older block
  registerNaturalTrunks(ctx); // the natural 3D trunks of the trees (src/natural-trunks.ts): appended after every other block
  registerBiomeItemModels(ctx); // the sculpted 3D models of the biomes' items (src/item-models.ts): the browser builds them, the other sides only record them
  if (ctx.sounds?.ambience) registerBiomeAmbience(ctx); // how each biome sounds (src/ambience.ts): browser plays, every side registers
  if (ctx.particles?.ambient) registerBiomeAtmosphere(ctx); // what floats in each biome's air (src/atmosphere.ts): spores, snow, marsh lights, petals
}
