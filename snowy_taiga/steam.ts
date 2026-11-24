// @ts-check
// The Hot Spring Vent's steam (ctx.render.blockEntity, browser only): a handful of soft puffs rising from the opening,
// swelling, leaning with a slow breeze and fading out, each on its own clock so the plume never pulses as one. Subtle on
// purpose: pale and see-through by day, a dim grey at night. The puff texture is drawn by code (a lumpy round blot in a
// 32 x 32 DataTexture), made once and shared by every vent; each vent owns only its puffs' materials (tracked, so the engine
// disposes them with the instance).

export const PUFFS = 7; // puffs per vent
export const RISE = 3.2; // blocks a puff climbs over its life
export const PERIOD = 4.6; // seconds of a puff's life
const BASE_Y = 0.45; // the vent's opening (its rim is half a block high)

let sharedTexture: any = null;
/** The puff: a soft round blot with a lumpy edge, white, alpha falling off from the middle (pure maths, no DOM). */
function puffTexture(THREE: any) {
  if (sharedTexture) return sharedTexture;
  const N = 32, px = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = (x + 0.5) / N * 2 - 1, dy = (y + 0.5) / N * 2 - 1, a = Math.atan2(dy, dx);
    const edge = 0.82 + 0.1 * Math.sin(a * 3 + 0.7) + 0.06 * Math.sin(a * 5 + 2.1);
    const r = Math.sqrt(dx * dx + dy * dy) / edge, alpha = Math.max(0, 1 - r * r) ** 1.4;
    const i = (y * N + x) * 4;
    px[i] = px[i + 1] = px[i + 2] = 255; px[i + 3] = Math.round(alpha * 255);
  }
  sharedTexture = new THREE.DataTexture(px, N, N, THREE.RGBAFormat);
  sharedTexture.magFilter = THREE.LinearFilter; sharedTexture.minFilter = THREE.LinearFilter;
  sharedTexture.needsUpdate = true;
  return sharedTexture;
}

/** A small integer hash -> [0, 1), so every vent (by its cell) and every puff gets its own phase and lean. */
const hash = (a: number, b: number, c: number) => {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

/** Where puff `i` of a vent is at time t (seconds): pure, so the tests can check it without a scene. */
export function puffAt(seed: number, i: number, t: number) {
  const phase = (i + hash(seed, i, 1) * 0.8) / PUFFS;
  const u = ((t / PERIOD + phase) % 1 + 1) % 1; // 0..1 through its life
  const lean = hash(seed, i, 2) * Math.PI * 2, wind = 0.35 + hash(seed, 0, 3) * 0.3;
  return {
    u,
    x: 0.5 + Math.cos(lean) * 0.12 * u + Math.sin(t * 0.7 + i) * 0.06 * u + wind * u * u,
    y: BASE_Y + RISE * u,
    z: 0.5 + Math.sin(lean) * 0.12 * u + Math.cos(t * 0.6 + i * 1.7) * 0.06 * u,
    scale: 0.45 + 1.3 * u,
    opacity: 0.85 * Math.min(1, u / 0.08) * (1 - u) ** 1.2, // thickest right over the opening, thinning as it climbs
  };
}

export class SteamRenderer {
  maxDistance = 56;

  create(e: any) {
    const T = e.THREE, map = puffTexture(T);
    const seed = (e.pos.x * 73856093) ^ (e.pos.y * 19349663) ^ (e.pos.z * 83492791);
    const puffs = [];
    for (let i = 0; i < PUFFS; i++) {
      const mat = new T.SpriteMaterial({ map, transparent: true, depthWrite: false, opacity: 0, color: 0xffffff });
      e.track(mat);
      const sprite = new T.Sprite(mat);
      sprite.renderOrder = 2;
      e.group.add(sprite);
      puffs.push({ sprite, mat });
    }
    e.store.seed = seed;
    e.store.puffs = puffs;
  }

  render(e: any, frame: any) {
    const puffs = e.store.puffs;
    if (!puffs) return;
    // by day a pale white; at night it greys down with the light so it does not glow
    const lit = 0.35 + 0.65 * Math.max(0, Math.min(1, frame.daylight ?? 1));
    for (let i = 0; i < puffs.length; i++) {
      const p = puffAt(e.store.seed, i, frame.time), { sprite, mat } = puffs[i];
      sprite.position.set(p.x, p.y, p.z);
      sprite.scale.set(p.scale, p.scale, p.scale);
      mat.opacity = p.opacity;
      mat.color.setRGB(lit * 0.86, lit * 0.89, lit * 0.92); // a faint blue-grey, so it still reads against the snow
    }
  }

  dispose(e: any) {
    for (const p of e.store.puffs ?? []) e.group.remove(p.sprite);
    e.store.puffs = null;
  }
}
