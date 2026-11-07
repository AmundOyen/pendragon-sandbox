import { add, centroid, dot, length, normalize, perp, type Pt, scale, sub } from './geometry';

/** Lines of partition: the decorated edges any ordinary or division can take. */
export type LineType =
  | 'straight'
  | 'engrailed'
  | 'invected'
  | 'wavy'
  | 'indented'
  | 'dancetty'
  | 'embattled'
  | 'raguly'
  | 'nebuly';

interface LineProfile {
  /** Preferred length of one repeat, in shield units (adjusted so repeats fit the edge). */
  readonly period: number;
  /** Peak-to-peak height, in shield units. */
  readonly amplitude: number;
  /**
   * One repeat as [u, v] points: u runs 0..1 along the edge, v -0.5..0.5 across it, with
   * positive v pointing away from the part that owns the edge.
   */
  readonly samples: readonly Pt[];
}

export interface LineDef {
  readonly id: LineType;
  readonly name: string;
  readonly description: string;
}

export const LINES: readonly LineDef[] = [
  { id: 'straight', name: 'Plain', description: 'A straight edge' },
  { id: 'engrailed', name: 'Engrailed', description: 'Scallops with the points facing out' },
  { id: 'invected', name: 'Invected', description: 'Scallops with the points facing in' },
  { id: 'wavy', name: 'Wavy', description: 'Gentle waves' },
  { id: 'indented', name: 'Indented', description: 'Small teeth' },
  { id: 'dancetty', name: 'Dancetty', description: 'A large zigzag' },
  { id: 'embattled', name: 'Embattled', description: 'Castle crenellations' },
  { id: 'raguly', name: 'Raguly', description: 'Like lopped branches' },
  { id: 'nebuly', name: 'Nebuly', description: 'Cloud-like lobes' },
];

const CURVE_STEPS = 14;

function sampleCurve(fn: (t: number) => Pt): Pt[] {
  return Array.from({ length: CURVE_STEPS }, (_, i) => fn(i / CURVE_STEPS));
}

/** Scallop: cusps on the outside, arcs biting into the owner. */
const scallop = (t: number): number => 0.5 - Math.sqrt(Math.max(0, 1 - (2 * t - 1) ** 2));

const PROFILES: Record<Exclude<LineType, 'straight'>, LineProfile> = {
  engrailed: { period: 30, amplitude: 11, samples: sampleCurve((t) => [t, scallop(t)]) },
  invected: { period: 30, amplitude: 11, samples: sampleCurve((t) => [t, -scallop(t)]) },
  wavy: {
    period: 64,
    amplitude: 13,
    samples: sampleCurve((t) => [t, 0.5 * Math.sin(2 * Math.PI * t)]),
  },
  indented: {
    period: 16,
    amplitude: 8,
    samples: [
      [0, -0.5],
      [0.5, 0.5],
    ],
  },
  dancetty: {
    period: 72,
    amplitude: 26,
    samples: [
      [0, -0.5],
      [0.5, 0.5],
    ],
  },
  embattled: {
    period: 36,
    amplitude: 13,
    samples: [
      [0, -0.5],
      [0, 0.5],
      [0.5, 0.5],
      [0.5, -0.5],
    ],
  },
  raguly: {
    period: 34,
    amplitude: 13,
    samples: [
      [0, -0.5],
      [0.22, 0.5],
      [0.62, 0.5],
      [0.4, -0.5],
    ],
  },
  nebuly: {
    period: 42,
    amplitude: 17,
    samples: sampleCurve((t) => [
      t - 0.18 * Math.sin(4 * Math.PI * t),
      0.5 * Math.sin(2 * Math.PI * t),
    ]),
  },
};

/** Arc-length parametrisation of a polyline; extrapolates beyond both ends. */
class Polyline {
  private readonly cumulative: number[] = [0];
  private readonly points: readonly Pt[];
  readonly total: number;

  constructor(
    points: readonly Pt[],
    private readonly closed: boolean,
  ) {
    this.points = closed ? [...points, points[0]] : points;
    for (let i = 1; i < this.points.length; i++) {
      this.cumulative.push(
        this.cumulative[i - 1] + length(sub(this.points[i], this.points[i - 1])),
      );
    }
    this.total = this.cumulative[this.cumulative.length - 1];
  }

  private segmentAt(s: number): number {
    const last = this.points.length - 2;
    let i = 0;
    while (i < last && this.cumulative[i + 1] < s) i++;
    return i;
  }

  private pointAt(s: number): Pt {
    if (this.closed) s = ((s % this.total) + this.total) % this.total;
    const i = this.segmentAt(s);
    const a = this.points[i];
    const b = this.points[i + 1];
    const segLength = this.cumulative[i + 1] - this.cumulative[i] || 1;
    return add(a, scale(sub(b, a), (s - this.cumulative[i]) / segLength));
  }

  /**
   * Point and left-hand unit normal at arc length `s`. The normal follows the direction
   * over a window of `smooth` on either side, so decorations turn smoothly round corners
   * instead of looping over themselves.
   */
  at(s: number, smooth = 0): { point: Pt; normal: Pt } {
    const point = this.pointAt(s);
    const w = Math.max(smooth, 0.5);
    const dir = normalize(sub(this.pointAt(s + w), this.pointAt(s - w)));
    return { point, normal: scale(perp(dir), -1) };
  }
}

/**
 * Where the owner of a decorated edge lies: a point on its side of the edge, or, for a
 * closed loop, whether the owner is inside or outside the loop.
 */
export type EdgeOwner = Pt | 'inside' | 'outside';

/**
 * Decorate a polyline (an edge from its first to its last point, or a closed loop) with a
 * line of partition. Straight lines are returned unchanged. The result can be reversed to
 * use the same edge for the part on the other side. `size` scales the decoration, for narrow
 * ordinaries such as bendlets.
 */
export function decorate(
  points: readonly Pt[],
  line: LineType,
  owner: EdgeOwner,
  closed = false,
  size = 1,
): Pt[] {
  if (line === 'straight' || points.length < 2) return [...points];
  const profile = PROFILES[line];
  const path = new Polyline(points, closed);
  if (path.total < 1) return [...points];

  // Which way is "away from the owner"? Decided once, at the middle of the edge.
  const middle = path.at(path.total / 2);
  let ownerPoint: Pt;
  if (owner === 'inside' || owner === 'outside') {
    const c = centroid(points);
    ownerPoint = owner === 'inside' ? c : add(middle.point, sub(middle.point, c));
  } else {
    ownerPoint = owner;
  }
  const sign = dot(middle.normal, sub(ownerPoint, middle.point)) > 0 ? -1 : 1;

  const repeats = Math.max(1, Math.round(path.total / (profile.period * size)));
  const amplitude = profile.amplitude * size;
  const period = path.total / repeats;
  const result: Pt[] = [];
  for (let k = 0; k < repeats; k++) {
    for (const [u, v] of profile.samples) {
      const { point, normal } = path.at((k + u) * period, period / 2);
      result.push(add(point, scale(normal, v * amplitude * sign)));
    }
  }
  if (!closed) {
    const [u, v] = profile.samples[0];
    const { point, normal } = path.at((repeats + u) * period, period / 2);
    result.push(add(point, scale(normal, v * amplitude * sign)));
  }
  return result;
}

/** The decorated edge between a straight pair of points, owned by the side containing `owner`. */
export function edge(a: Pt, b: Pt, line: LineType, owner: Pt, size = 1): Pt[] {
  return decorate([a, b], line, owner, false, size);
}

/** Unit direction from a to b. */
export const direction = (a: Pt, b: Pt): Pt => normalize(sub(b, a));
