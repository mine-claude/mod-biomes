// @ts-check
// The spore puffball's showpiece (ctx.render.blockEntity, docs/sdk-block-entity-render.md): on top of the ball that the mesher
// draws (geometry boxes), a faint halo that slowly BREATHES and a few spores that drift up from it; every several seconds the
// ball PUFFS — the halo pulls in and a small ring of spores bursts out and fades. Subtle on purpose: a handful of points and
// one transparent sphere per puffball, additive blending (dark = invisible, so a spore fades by darkening), no texture.
//
// Browser only: on the server and in the Workers the registration is accepted and never runs. Everything moves by the frame
// clock and a per-position phase, so two puffballs side by side never breathe in step. The objects are made by hand, so the
// renderer dims them itself with the day light (frame.daylight): spores keep a faint glow at night, like the grove.

const DRIFT = 10; // spores drifting up all the time
const BURST = 14; // spores of a puff
const PUFF_EVERY = [6, 10]; // seconds between puffs (per puffball, from its position)
const PUFF_LEN = 1.6; // seconds a puff lasts
const RISE = 1.8; // how high a drifting spore goes (blocks)

// a pure hash of the cell (the same puffball always has the same rhythm)
const cellHash = (x: number, y: number, z: number, salt: number) => {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1442695041) ^ Math.imul(salt, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

let sharedHalo: any = null; // one sphere geometry for every puffball (never tracked: shared)

/** The renderer object (the same instance serves every puffball; per-position state lives in e.store). */
export function puffballRenderer() {
  return {
    maxDistance: 40,
    create(e: any) {
      const T = e.THREE, { x, y, z } = e.pos;
      const s = e.store;
      s.phase = cellHash(x, y, z, 1) * 100;
      s.every = PUFF_EVERY[0] + cellHash(x, y, z, 2) * (PUFF_EVERY[1] - PUFF_EVERY[0]);
      s.seeds = Array.from({ length: DRIFT + BURST }, (_, i) => [cellHash(x, y, z, 10 + i), cellHash(x, y, z, 60 + i), cellHash(x, y, z, 110 + i)]);
      // the halo: a faint sphere around the ball
      sharedHalo ??= new T.SphereGeometry(0.42, 14, 10);
      const haloMat = new T.MeshBasicMaterial({ color: 0xf3ecd6, transparent: true, opacity: 0.1, depthWrite: false });
      e.track(haloMat);
      const halo = new T.Mesh(sharedHalo, haloMat);
      halo.position.set(0.5, 0.26, 0.5);
      halo.scale.set(1, 0.72, 1);
      e.group.add(halo);
      // the spores: points with a colour each (additive: the colour IS the opacity)
      const geo = new T.BufferGeometry();
      s.pos = new Float32Array((DRIFT + BURST) * 3);
      s.col = new Float32Array((DRIFT + BURST) * 3);
      geo.setAttribute('position', new T.BufferAttribute(s.pos, 3));
      geo.setAttribute('color', new T.BufferAttribute(s.col, 3));
      const mat = new T.PointsMaterial({ size: 0.07, vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending, sizeAttenuation: true });
      e.track(geo); e.track(mat);
      const points = new T.Points(geo, mat);
      points.frustumCulled = false;
      e.group.add(points);
      Object.assign(s, { halo, haloMat, geo, points });
    },
    render(e: any, frame: any) {
      const s = e.store;
      if (!s.geo) return;
      const t = frame.time + s.phase;
      const light = Math.max(0.28, Math.min(1, frame.daylight ?? 1)); // spores keep a faint glow at night
      // the puff: where we are in this puffball's cycle
      const inCycle = t % s.every, puff = inCycle < PUFF_LEN ? inCycle / PUFF_LEN : -1;
      // breath: a slow swell; during a puff the halo pulls in first, then swells out
      const breath = 1 + Math.sin(t * 1.1) * 0.05 + (puff >= 0 ? (puff < 0.2 ? -0.12 * (puff / 0.2) : 0.18 * (1 - puff)) : 0);
      s.halo.scale.set(breath, 0.72 * breath, breath);
      s.haloMat.opacity = (0.07 + Math.sin(t * 1.1) * 0.025 + (puff >= 0 ? 0.12 * (1 - puff) : 0)) * light;
      const P = s.pos, C = s.col;
      for (let i = 0; i < DRIFT + BURST; i++) {
        const [a, b, c] = s.seeds[i];
        let px = 0.5, py = 0.5, pz = 0.5, bright = 0;
        if (i < DRIFT) {
          // a drifting spore: up from the ball, swaying, fading as it goes (each one loops on its own clock)
          const k = (t * (0.08 + a * 0.06) + b) % 1, sway = Math.sin(t * (0.7 + c) + a * 6.283) * 0.18 * k;
          px = 0.5 + (a - 0.5) * 0.5 + sway; pz = 0.5 + (c - 0.5) * 0.5 + Math.cos(t * 0.6 + b * 6.283) * 0.15 * k; py = 0.45 + k * RISE;
          bright = (k < 0.1 ? k / 0.1 : 1 - (k - 0.1) / 0.9) * 0.55;
        } else if (puff >= 0) {
          // a burst spore: out and up in a ring, slowing down, fading
          const ang = a * 6.283, out = (1 - (1 - puff) * (1 - puff)) * (0.5 + b * 0.5);
          px = 0.5 + Math.cos(ang) * out; pz = 0.5 + Math.sin(ang) * out; py = 0.45 + puff * (0.3 + c * 0.6);
          bright = (1 - puff) * 0.8;
        }
        P[i * 3] = px; P[i * 3 + 1] = py; P[i * 3 + 2] = pz;
        const v = bright * light;
        C[i * 3] = v * 0.95; C[i * 3 + 1] = v * 0.92; C[i * 3 + 2] = v * 0.78;
      }
      s.geo.attributes.position.needsUpdate = true;
      s.geo.attributes.color.needsUpdate = true;
    },
  };
}
