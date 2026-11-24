// @ts-check
// The shapes of the Costa de Corais' non-cube blocks: lists of boxes [x0, y0, z0, x1, y1, z1] in sixteenths of the cell (the
// engine's `geometry.model`, 0..1, at most 16 boxes). Pure data, shared by index.ts (the blocks) and art.ts (the tube coral's
// top tile has its holes where the tubes stand).

type Box = [number, number, number, number, number, number];
const px = (boxes: Box[]): Box[] => boxes.map((b) => b.map((v) => v / 16) as Box);

// [cx, cz, r] in pixels. Symmetric under a flip of either axis, so the holes of the top tile line up with the tubes whatever
// way the mesher orients that tile.
export const TUBES = [[4, 4, 2.5], [12, 4, 2.5], [4, 12, 2.5], [12, 12, 2.5], [8, 8, 2.5]] as const;
const TUBE_HEIGHT = [10, 7, 6, 12, 15];

/** Coral-galhado: a branching colony — a short trunk, four arms that turn upward, a few twigs. */
export const BRANCH_CORAL = px([
  [7, 0, 7, 9, 9, 9], // trunk
  [7, 9, 7, 9, 15, 9], // the leader
  [3, 5, 7, 7, 7, 9], [3, 7, 7, 5, 13, 9], // west arm
  [9, 3, 7, 13, 5, 9], [11, 5, 7, 13, 11, 9], // east arm
  [7, 6, 9, 9, 8, 13], [7, 8, 11, 9, 14, 13], // south arm
  [7, 4, 3, 9, 6, 7], [7, 6, 3, 9, 10, 5], // north arm
  [5, 11, 7, 6, 15, 8], [12, 9, 8, 13, 13, 9], [8, 12, 12, 9, 16, 13], [8, 9, 4, 9, 12, 5], // twigs
]);

/** Coral-tubo: a bundle of open tubes of different heights. */
export const TUBE_CORAL = px(TUBES.map(([cx, cz, r], i) => [cx - r, 0, cz - r, cx + r, TUBE_HEIGHT[i], cz + r] as Box));

/** Concha: a small spiral shell lying on the sand — the body whorl, two smaller whorls, the flared lip. */
export const SEASHELL = px([
  [5, 0, 5, 10, 3, 10],
  [9, 0, 6, 12, 2.5, 9],
  [11.5, 0, 7, 13.5, 1.8, 8.2],
  [3.5, 0, 4.5, 5.5, 2, 10.5],
]);

/** Coco: a round nut hanging high in its cell (three crossed boxes make the ball). */
export const COCONUT = px([
  [5, 8, 4, 11, 15, 12],
  [4, 8, 5, 12, 15, 11],
  [5, 7, 5, 11, 16, 11],
]);

/** Madeira à Deriva: a weathered log lying along x, rounded by three boxes, with a broken stub of a branch. */
export const DRIFTWOOD = px([
  [0, 0, 5, 16, 7, 11],
  [0, 1, 4, 16, 6, 12],
  [0, 0, 6, 16, 8, 10],
  [10, 7, 7, 12, 10, 9],
]);

/** Marisco-gigante, the LOWER valve (the block itself): a fluted bowl, its five ridges rising to the middle. The upper valve
 * is drawn by the block entity renderer (clam-renderer.ts) and hinges on the back edge, at CLAM_HINGE. */
export const CLAM_BASE = px([
  [1, 0, 2, 15, 1, 15],
  [1, 1, 3, 4, 3, 15],
  [4, 1, 2, 7, 4, 15],
  [7, 1, 2, 9, 5, 15],
  [9, 1, 2, 12, 4, 15],
  [12, 1, 3, 15, 3, 15],
]);
export const CLAM_HINGE = Object.freeze({ y: 5 / 16, z: 15 / 16 }); // on top of the highest ridge, at the back
