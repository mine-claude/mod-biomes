// @ts-check
// The biomes' LOGS as sculpted 3D items (ctx.render.itemModel on each plain log's block item): the same short round log
// the base game draws for its own (mods/mineclaude/items/models/logs.ts, copied here because a packaged mod carries only its
// own folder), in the colours of each tree's tiles — the ipê's dark bark, the spruce's, the pale savanna wood, the palm's
// ringed trunk, the mossy log, the canopy log and the grey dead wood. Only the browser builds them.
import { sharedModel, tone } from './sculpt.ts';

type LogColours = { bark: number; furrow: number; grain: number; ring: number };

function sculptLog(s: any, c: LogColours) {
  const H = 0.86, y0 = -0.43;
  s.box(0.74, H, 0.74, c.bark, 0, 0, 0, { faces: { top: c.grain, bottom: c.grain } });
  s.box(0.5, H, 0.86, c.bark, 0, 0, 0, { faces: { top: c.grain, bottom: c.grain } });
  s.box(0.86, H, 0.5, c.bark, 0, 0, 0, { faces: { top: c.grain, bottom: c.grain } });
  const ridges: Array<[number, number, number]> = [[-0.12, 0.16, 0.06], [0.14, 0.1, -0.04], [0.02, 0.14, 0.02], [-0.06, 0.12, -0.03]];
  ridges.forEach(([off, w, dy], i) => {
    const h = H - 0.08 + dy;
    if (i % 2 === 0) {
      s.box(w, h, 0.03, tone(c.bark, 1.12), off, dy / 2, i === 0 ? 0.445 : -0.445);
      s.box(0.03, h - 0.06, 0.02, c.furrow, off + w / 2 + 0.03, dy / 2, i === 0 ? 0.44 : -0.44);
    } else {
      s.box(0.03, h, w, tone(c.bark, 1.12), i === 1 ? 0.445 : -0.445, dy / 2, off);
      s.box(0.02, h - 0.06, 0.03, c.furrow, i === 1 ? 0.44 : -0.44, dy / 2, off - w / 2 - 0.03);
    }
  });
  const top = y0 + H;
  s.box(0.62, 0.012, 0.62, c.ring, 0, top + 0.006, 0);
  s.box(0.46, 0.014, 0.46, c.grain, 0, top + 0.013, 0);
  s.box(0.3, 0.016, 0.3, c.ring, 0, top + 0.02, 0);
  s.box(0.12, 0.018, 0.12, tone(c.grain, 0.9), 0, top + 0.027, 0);
  s.rod([0.3, 0.02, 0.16], [0.52, 0.16, 0.2], 0.075, c.bark);
  s.box(0.03, 0.12, 0.12, c.grain, 0.53, 0.165, 0.2, { rot: [0, 0, 0.55] });
}

/** plain log path -> its colours (picked from the tiles of each tree: */
const LOGS: Record<string, LogColours> = {
  ipe_log: { bark: 0x3d2b26, furrow: 0x231713, grain: 0xa07d5c, ring: 0x6e5240 },
  spruce_log: { bark: 0x4b3627, furrow: 0x2c1f15, grain: 0xb8996a, ring: 0x8a6c47 },
  savanna_log: { bark: 0x8a7154, furrow: 0x5a4733, grain: 0xcdae7f, ring: 0xa08259 },
  palm_log: { bark: 0x8c7658, furrow: 0x5e4c36, grain: 0xc6aa7e, ring: 0x98805c },
  mossy_log: { bark: 0x4c4a2c, furrow: 0x2f3a1c, grain: 0xaa8c5c, ring: 0x7e6644 },
  canopy_log: { bark: 0x5e4b36, furrow: 0x3a2d1f, grain: 0xbb9a6c, ring: 0x8d7149 },
  dead_log: { bark: 0x6c645a, furrow: 0x47413a, grain: 0xa0947f, ring: 0x7c7262 },
};

/** @param {any} ctx */
export function registerBiomeLogModels(ctx: any) {
  for (const [path, c] of Object.entries(LOGS)) {
    ctx.render.itemModel(path, { build({ THREE }) { return sharedModel(THREE, `biomes:log:${path}`, (s) => sculptLog(s, c), { transform: (g) => g.rotateY(0.62).rotateX(0.38) }); } });
  }
}
