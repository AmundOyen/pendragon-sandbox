/**
 * Shield geometry. All coordinates are in the shield's own viewBox (0 0 358 413), with y
 * pointing down. Ordinaries are built as polygons that may reach well outside the shield;
 * the renderer clips them to the shield outline.
 */

export type Pt = readonly [number, number];

export const VIEW_WIDTH = 358;
export const VIEW_HEIGHT = 413;

/** The shield outline (the shape of the coat of arms). */
export const SHIELD_PATH =
  'M182.249,403.342C182.249,403.342 347.23,356.941 352.517,139.338C353.54,97.252 352.621,13.042 352.621,13.042' +
  'L11.498,13.042C11.498,13.042 10.579,97.252 11.601,139.338C16.888,356.941 182.249,403.342 182.249,403.342Z';

/** Key measurements of the shield. */
export const SHIELD = {
  left: 11.5,
  right: 352.6,
  top: 13.04,
  bottom: 403.34,
  centerX: 182.05,
  /** The fess point: the visual centre, a little above the geometric middle. */
  fessY: 185,
  get width() {
    return this.right - this.left;
  },
  get height() {
    return this.bottom - this.top;
  },
} as const;

/** The fess point (centre of the shield). */
export const FESS_POINT: Pt = [SHIELD.centerX, SHIELD.fessY];

/** A box safely outside the shield, used for the outer corners of ordinaries. */
export const OUTSIDE = { left: -80, right: 440, top: -80, bottom: 500 } as const;

/** Far enough from the fess point to leave the shield in any direction. */
export const FAR = 700;

// ---------------------------------------------------------------------------------------
// Vector helpers
// ---------------------------------------------------------------------------------------

export const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];
export const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]];
export const scale = (a: Pt, k: number): Pt => [a[0] * k, a[1] * k];
export const dot = (a: Pt, b: Pt): number => a[0] * b[0] + a[1] * b[1];
export const length = (a: Pt): number => Math.hypot(a[0], a[1]);
export const normalize = (a: Pt): Pt => {
  const l = length(a) || 1;
  return [a[0] / l, a[1] / l];
};
/** Rotate +90° (with y down this turns clockwise on screen). */
export const perp = (a: Pt): Pt => [-a[1], a[0]];
export const fromAngle = (degrees: number): Pt => {
  const r = (degrees * Math.PI) / 180;
  return [Math.cos(r), Math.sin(r)];
};
export const angleOf = (a: Pt): number => (Math.atan2(a[1], a[0]) * 180) / Math.PI;

/** Intersection of the lines p + t·d and q + s·e (null when parallel). */
export function intersect(p: Pt, d: Pt, q: Pt, e: Pt): Pt | null {
  const den = d[0] * e[1] - d[1] * e[0];
  if (Math.abs(den) < 1e-9) return null;
  const t = ((q[0] - p[0]) * e[1] - (q[1] - p[1]) * e[0]) / den;
  return add(p, scale(d, t));
}

/** Signed area (positive when the loop runs clockwise on screen, since y points down). */
export function signedArea(points: readonly Pt[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    area += x1 * y2 - x2 * y1;
  }
  return area / 2;
}

export function centroid(points: readonly Pt[]): Pt {
  const sum = points.reduce<Pt>((acc, p) => add(acc, p), [0, 0]);
  return scale(sum, 1 / Math.max(1, points.length));
}

/** Return the loop running clockwise (`cw`) or counter-clockwise on screen. */
export function orient(points: readonly Pt[], cw = true): Pt[] {
  const isCw = signedArea(points) > 0;
  return isCw === cw ? [...points] : [...points].reverse();
}

// ---------------------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------------------

/** A filled region: one or more closed loops and a fill rule. */
export interface Shape {
  readonly loops: readonly (readonly Pt[])[];
  readonly fillRule: 'nonzero' | 'evenodd';
}

export const shape = (
  loops: readonly (readonly Pt[])[],
  fillRule: Shape['fillRule'] = 'nonzero',
): Shape => ({
  loops,
  fillRule,
});

const fmt = (n: number): string => (Math.round(n * 10) / 10).toString();

/** SVG path data for a shape. */
export function toPathData(s: Shape): string {
  return s.loops
    .filter((loop) => loop.length > 1)
    .map((loop) => 'M' + loop.map(([x, y]) => `${fmt(x)},${fmt(y)}`).join('L') + 'Z')
    .join('');
}

/** Winding number of `p` around one loop. */
function winding(p: Pt, loop: readonly Pt[]): number {
  let w = 0;
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i];
    const b = loop[(i + 1) % loop.length];
    const cross = (b[0] - a[0]) * (p[1] - a[1]) - (p[0] - a[0]) * (b[1] - a[1]);
    if (a[1] <= p[1]) {
      if (b[1] > p[1] && cross > 0) w++;
    } else if (b[1] <= p[1] && cross < 0) {
      w--;
    }
  }
  return w;
}

export function pointInShape(p: Pt, s: Shape): boolean {
  if (s.fillRule === 'evenodd') {
    return s.loops.reduce((n, loop) => n + Math.abs(winding(p, loop)), 0) % 2 === 1;
  }
  return s.loops.reduce((n, loop) => n + winding(p, loop), 0) !== 0;
}

// ---------------------------------------------------------------------------------------
// The shield outline as points
// ---------------------------------------------------------------------------------------

type Cubic = readonly [Pt, Pt, Pt, Pt];

const SHIELD_CUBICS: readonly Cubic[] = [
  [
    [182.249, 403.342],
    [182.249, 403.342],
    [347.23, 356.941],
    [352.517, 139.338],
  ],
  [
    [352.517, 139.338],
    [353.54, 97.252],
    [352.621, 13.042],
    [352.621, 13.042],
  ],
  [
    [352.621, 13.042],
    [352.621, 13.042],
    [11.498, 13.042],
    [11.498, 13.042],
  ],
  [
    [11.498, 13.042],
    [11.498, 13.042],
    [10.579, 97.252],
    [11.601, 139.338],
  ],
  [
    [11.601, 139.338],
    [16.888, 356.941],
    [182.249, 403.342],
    [182.249, 403.342],
  ],
];

function cubicAt([p0, p1, p2, p3]: Cubic, t: number): Pt {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [
    a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
    a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1],
  ];
}

let shieldOutlineCache: Pt[] | null = null;

/** The shield outline sampled as a closed loop (no repeated end point). */
export function shieldOutline(): Pt[] {
  if (!shieldOutlineCache) {
    const points: Pt[] = [];
    for (const cubic of SHIELD_CUBICS) {
      const steps = 40;
      for (let i = 0; i < steps; i++) {
        const p = cubicAt(cubic, i / steps);
        // Control points that coincide with an end point bunch samples together; skip those.
        const last = points[points.length - 1];
        if (!last || length(sub(p, last)) > 1.5) points.push(p);
      }
    }
    shieldOutlineCache = points;
  }
  return shieldOutlineCache;
}

/**
 * Offset a convex closed loop inwards by `distance`, with mitred corners so the shield's
 * point and top corners stay sharp.
 */
export function insetLoop(loop: readonly Pt[], distance: number): Pt[] {
  const c = centroid(loop);
  const n = loop.length;
  const normals: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = loop[i];
    const b = loop[(i + 1) % n];
    let nrm = normalize(perp(sub(b, a)));
    if (dot(nrm, sub(c, a)) < 0) nrm = scale(nrm, -1);
    normals.push(nrm);
  }
  const offset = loop.map((p, i) => {
    const n1 = normals[(i - 1 + n) % n];
    const n2 = normals[i];
    const m = normalize(add(n1, n2));
    const cos = Math.max(0.25, dot(m, n2));
    return add(p, scale(m, distance / cos));
  });
  // Near a corner, points offset from one edge can end up closer than `distance` to the
  // next edge, and the inset loop would cross itself there. Drop those points.
  return offset.filter((p) => distanceToLoop(p, loop) >= distance - 0.5);
}

function distanceToSegment(p: Pt, a: Pt, b: Pt): number {
  const ab = sub(b, a);
  const t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / (dot(ab, ab) || 1)));
  return length(sub(p, add(a, scale(ab, t))));
}

function distanceToLoop(p: Pt, loop: readonly Pt[]): number {
  let min = Infinity;
  for (let i = 0; i < loop.length; i++)
    min = Math.min(min, distanceToSegment(p, loop[i], loop[(i + 1) % loop.length]));
  return min;
}

/** Scale a loop about `from` and move that point to `to`. */
export function transformLoop(loop: readonly Pt[], from: Pt, to: Pt, k: number): Pt[] {
  return loop.map((p) => add(to, scale(sub(p, from), k)));
}

/** Points on a circle, as a closed loop. */
export function circleLoop(center: Pt, radius: number, steps = 96): Pt[] {
  return Array.from({ length: steps }, (_, i) =>
    add(center, scale(fromAngle((360 * i) / steps), radius)),
  );
}
