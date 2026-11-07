import {
  add,
  angleOf,
  circleLoop,
  FAR,
  FESS_POINT,
  insetLoop,
  intersect,
  normalize,
  orient,
  OUTSIDE,
  perp,
  type Pt,
  scale,
  shape,
  type Shape,
  SHIELD,
  shieldOutline,
  sub,
  transformLoop,
  dot,
} from './geometry';
import { decorate, direction, edge, type LineType } from './lines';

export type OrdinaryCategory = 'honourable' | 'sub' | 'division' | 'pattern';

export type OrdinaryType =
  // Honourable ordinaries and their diminutives
  | 'chief'
  | 'pale'
  | 'fess'
  | 'bend'
  | 'bend-sinister'
  | 'chevron'
  | 'cross'
  | 'saltire'
  | 'pile'
  | 'bordure'
  | 'bars'
  | 'bendlets'
  | 'chevronels'
  // Sub-ordinaries
  | 'canton'
  | 'label'
  | 'inescutcheon'
  | 'orle'
  | 'tressure'
  | 'fret'
  | 'lozenge'
  | 'gyron'
  | 'flaunches'
  // Divided fields
  | 'per-pale'
  | 'per-fess'
  | 'per-bend'
  | 'per-bend-sinister'
  | 'per-chevron'
  | 'per-saltire'
  | 'quarterly'
  | 'gyronny'
  // Patterns
  | 'chequy'
  | 'lozengy'
  | 'barry'
  | 'paly'
  | 'bendy'
  | 'bendy-sinister';

export interface OrdinaryDef {
  readonly id: OrdinaryType;
  readonly name: string;
  readonly category: OrdinaryCategory;
  readonly description: string;
  /** One name per clickable part. */
  readonly partNames: readonly string[];
  /** Whether the ordinary can take a decorated line of partition. */
  readonly lines: boolean;
  /**
   * Default tinctures for divisions and patterns, as indices into [first, second]. Missing
   * means the parts alternate.
   */
  readonly defaults?: readonly number[];
  readonly build: (line: LineType) => Shape[];
}

export const CATEGORY_LABELS: Record<OrdinaryCategory, string> = {
  honourable: 'Honourable ordinaries',
  sub: 'Sub-ordinaries',
  division: 'Divided fields',
  pattern: 'Patterns',
};

const { left: L, right: R, top: T, centerX: CX, fessY: FY } = SHIELD;
const W = SHIELD.width;
const H = SHIELD.height;
const O = OUTSIDE;
const FP = FESS_POINT;

/** Direction of a bend: from dexter chief (viewer's top left) through the fess point. */
const BEND = direction([L, T], FP);
/** Direction of a bend sinister: from sinister chief through the fess point. */
const BEND_SINISTER = direction([R, T], FP);
const UP: Pt = [0, -1];
const DOWN: Pt = [0, 1];
const LEFT: Pt = [-1, 0];
const RIGHT: Pt = [1, 0];
/** Saltire arms: towards the top corners and mirrored downwards. */
const TO_DEXTER_CHIEF = scale(BEND, -1);
const TO_SINISTER_CHIEF = scale(BEND_SINISTER, -1);
const TO_SINISTER_BASE: Pt = [TO_SINISTER_CHIEF[0], -TO_SINISTER_CHIEF[1]];
const TO_DEXTER_BASE: Pt = [TO_DEXTER_CHIEF[0], -TO_DEXTER_CHIEF[1]];
/** Chevron arms, from the apex down towards the base corners. */
const CHEVRON_RIGHT = normalize([0.66, 0.75]);
const CHEVRON_LEFT = normalize([-0.66, 0.75]);

const rect = (x1: number, y1: number, x2: number, y2: number): Pt[] => [
  [x1, y1],
  [x2, y1],
  [x2, y2],
  [x1, y2],
];

const lozengeLoop = (c: Pt, halfWidth: number, halfHeight: number): Pt[] => [
  [c[0], c[1] - halfHeight],
  [c[0] + halfWidth, c[1]],
  [c[0], c[1] + halfHeight],
  [c[0] - halfWidth, c[1]],
];

/** A straight band of `width` centred on the line through `p` with direction `d`. */
function band(p: Pt, d: Pt, width: number, line: LineType, size = 1): Pt[] {
  const n = perp(d);
  const h = width / 2;
  const a = add(p, scale(d, -FAR));
  const b = add(p, scale(d, FAR));
  return [
    ...edge(add(a, scale(n, h)), add(b, scale(n, h)), line, p, size),
    ...edge(add(b, scale(n, -h)), add(a, scale(n, -h)), line, p, size),
  ];
}

/**
 * Arms of equal width leaving `center` in the given directions (a cross, a saltire, or with
 * two arms a chevron), as one outline.
 */
function arms(
  center: Pt,
  directions: readonly Pt[],
  width: number,
  line: LineType,
  size = 1,
): Pt[] {
  const dirs = [...directions].sort((a, b) => angleOf(a) - angleOf(b));
  const h = width / 2;
  const n = dirs.length;
  const corner = (i: number): Pt => {
    const d1 = dirs[i];
    const d2 = dirs[(i + 1) % n];
    return (
      intersect(add(center, scale(perp(d1), h)), d1, add(center, scale(perp(d2), -h)), d2) ?? center
    );
  };
  const points: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const d = dirs[i];
    const farPrev = add(add(center, scale(perp(d), -h)), scale(d, FAR));
    const farNext = add(add(center, scale(perp(d), h)), scale(d, FAR));
    points.push(...edge(corner((i - 1 + n) % n), farPrev, line, center, size));
    points.push(...edge(farNext, corner(i), line, center, size));
  }
  return points;
}

/**
 * Split the plane along the line through `p` with direction `d`. Returns the part on the
 * `-perp(d)` side first (which owns the decorated edge) and the `+perp(d)` side second.
 */
function split(p: Pt, d: Pt, line: LineType): [Pt[], Pt[]] {
  const n = perp(d);
  const a = add(p, scale(d, -FAR));
  const b = add(p, scale(d, FAR));
  const e = edge(a, b, line, add(p, scale(n, -1)));
  return [
    [...e, add(b, scale(n, -FAR)), add(a, scale(n, -FAR))],
    [...e, add(b, scale(n, FAR)), add(a, scale(n, FAR))],
  ];
}

/** Wedges between consecutive rays from `center` (rays sorted by angle, i.e. clockwise). */
function wedges(center: Pt, directions: readonly Pt[], line: LineType): Pt[][] {
  const dirs = [...directions].sort((a, b) => angleOf(a) - angleOf(b));
  const n = dirs.length;
  const rays = dirs.map((d, i) => {
    const owner = add(center, scale(normalize(add(d, dirs[(i + 1) % n])), 40));
    return decorate([center, add(center, scale(d, FAR))], line, owner);
  });
  return dirs.map((d, i) => {
    const j = (i + 1) % n;
    const far = add(center, scale(normalize(add(d, dirs[j])), FAR * 1.6));
    return [center, ...rays[i], far, ...[...rays[j]].reverse()];
  });
}

/** Parallel stripes: lines with direction `d` at the given offsets along `perp(d)` from `origin`. */
function stripes(origin: Pt, d: Pt, offsets: readonly number[], line: LineType): Pt[][] {
  const n = perp(d);
  const at = (o: number, l: LineType): Pt[] => {
    const p = add(origin, scale(n, o));
    return edge(add(p, scale(d, -FAR)), add(p, scale(d, FAR)), l, add(p, scale(n, -1)));
  };
  const edges = [at(-FAR, 'straight'), ...offsets.map((o) => at(o, line)), at(FAR, 'straight')];
  return edges.slice(0, -1).map((e, i) => [...e, ...[...edges[i + 1]].reverse()]);
}

/** Offsets that divide the shield into `count` equal stripes across direction `d`. */
function stripeOffsets(origin: Pt, d: Pt, count: number): number[] {
  const n = perp(d);
  const projections = shieldOutline().map((p) => dot(sub(p, origin), n));
  const min = Math.min(...projections);
  const max = Math.max(...projections);
  return Array.from({ length: count - 1 }, (_, i) => min + ((i + 1) * (max - min)) / count);
}

/** Alternate loops into two groups. */
function alternate(loops: readonly Pt[][]): Shape[] {
  return [shape(loops.filter((_, i) => i % 2 === 0)), shape(loops.filter((_, i) => i % 2 === 1))];
}

const diagonals = [TO_DEXTER_CHIEF, TO_SINISTER_CHIEF, TO_SINISTER_BASE, TO_DEXTER_BASE];

export const ORDINARIES: readonly OrdinaryDef[] = [
  // --- Honourable ordinaries -----------------------------------------------------------
  {
    id: 'chief',
    name: 'Chief',
    category: 'honourable',
    description: 'Band across the top',
    partNames: ['Chief'],
    lines: true,
    build: (line) => {
      const y = T + H * 0.27;
      return [
        shape([
          [[O.left, O.top], [O.right, O.top], ...edge([O.right, y], [O.left, y], line, [CX, T])],
        ]),
      ];
    },
  },
  {
    id: 'pale',
    name: 'Pale',
    category: 'honourable',
    description: 'Vertical band down the centre',
    partNames: ['Pale'],
    lines: true,
    build: (line) => [shape([band([CX, FY], DOWN, W * 0.3, line)])],
  },
  {
    id: 'fess',
    name: 'Fess',
    category: 'honourable',
    description: 'Horizontal band across the centre',
    partNames: ['Fess'],
    lines: true,
    build: (line) => [shape([band(FP, RIGHT, H * 0.26, line)])],
  },
  {
    id: 'bend',
    name: 'Bend',
    category: 'honourable',
    description: 'Diagonal, dexter chief to sinister base',
    partNames: ['Bend'],
    lines: true,
    build: (line) => [shape([band(FP, BEND, W * 0.27, line)])],
  },
  {
    id: 'bend-sinister',
    name: 'Bend sinister',
    category: 'honourable',
    description: 'Diagonal, sinister chief to dexter base',
    partNames: ['Bend sinister'],
    lines: true,
    build: (line) => [shape([band(FP, BEND_SINISTER, W * 0.27, line)])],
  },
  {
    id: 'chevron',
    name: 'Chevron',
    category: 'honourable',
    description: 'Inverted V rising from the base',
    partNames: ['Chevron'],
    lines: true,
    build: (line) => [shape([arms([CX, FY - 10], [CHEVRON_LEFT, CHEVRON_RIGHT], W * 0.22, line)])],
  },
  {
    id: 'cross',
    name: 'Cross',
    category: 'honourable',
    description: 'Pale and fess combined',
    partNames: ['Cross'],
    lines: true,
    build: (line) => [shape([arms(FP, [UP, RIGHT, DOWN, LEFT], W * 0.26, line)])],
  },
  {
    id: 'saltire',
    name: 'Saltire',
    category: 'honourable',
    description: 'Diagonal cross (X)',
    partNames: ['Saltire'],
    lines: true,
    build: (line) => [shape([arms(FP, diagonals, W * 0.23, line)])],
  },
  {
    id: 'pile',
    name: 'Pile',
    category: 'honourable',
    description: 'Wedge pointing down from the chief',
    partNames: ['Pile'],
    lines: true,
    build: (line) => [
      shape([
        decorate(
          [
            [CX - W * 0.28, O.top],
            [CX, T + H * 0.85],
            [CX + W * 0.28, O.top],
          ],
          line,
          [CX, T + 40],
        ),
      ]),
    ],
  },
  {
    id: 'bordure',
    name: 'Bordure',
    category: 'honourable',
    description: 'Border round the edge',
    partNames: ['Bordure'],
    lines: true,
    build: (line) => [
      shape(
        [
          rect(O.left, O.top, O.right, O.bottom),
          decorate(insetLoop(shieldOutline(), 30), line, 'outside', true),
        ],
        'evenodd',
      ),
    ],
  },
  {
    id: 'bars',
    name: 'Two bars',
    category: 'honourable',
    description: 'Diminutives of the fess',
    partNames: ['Bars'],
    lines: true,
    build: (line) => [
      shape([band([CX, FY - 45], RIGHT, 40, line, 0.6), band([CX, FY + 45], RIGHT, 40, line, 0.6)]),
    ],
  },
  {
    id: 'bendlets',
    name: 'Three bendlets',
    category: 'honourable',
    description: 'Diminutives of the bend, as Lancelot bears them',
    partNames: ['Bendlets'],
    lines: true,
    build: (line) => {
      const n = perp(BEND);
      return [shape([-1, 0, 1].map((k) => band(add(FP, scale(n, k * 70)), BEND, 34, line, 0.55)))];
    },
  },
  {
    id: 'chevronels',
    name: 'Three chevronels',
    category: 'honourable',
    description: 'Diminutives of the chevron',
    partNames: ['Chevronels'],
    lines: true,
    build: (line) => [
      shape(
        [115, 190, 265].map((y) => arms([CX, y], [CHEVRON_LEFT, CHEVRON_RIGHT], 28, line, 0.5)),
      ),
    ],
  },
  // --- Sub-ordinaries ------------------------------------------------------------------
  {
    id: 'canton',
    name: 'Canton',
    category: 'sub',
    description: 'A small square in dexter chief',
    partNames: ['Canton'],
    lines: true,
    build: (line) => {
      const x = L + W / 3;
      const y = T + W / 3;
      return [
        shape([
          [
            [O.left, O.top],
            ...decorate(
              [
                [x, O.top],
                [x, y],
                [O.left, y],
              ],
              line,
              [L + 20, T + 20],
            ),
          ],
        ]),
      ];
    },
  },
  {
    id: 'label',
    name: 'Label',
    category: 'sub',
    description: 'A bar with hanging points, the mark of an eldest son',
    partNames: ['Label'],
    lines: false,
    build: () => {
      const top = T + 26;
      const barBottom = top + 18;
      const pointBottom = top + 72;
      const point = (x: number): Pt[] => [
        [x - 12, barBottom - 4],
        [x + 12, barBottom - 4],
        [x + 18, pointBottom],
        [x - 18, pointBottom],
      ];
      return [
        shape(
          [rect(L + 40, top, R - 40, barBottom), point(CX - 92), point(CX), point(CX + 92)].map(
            (loop) => orient(loop),
          ),
        ),
      ];
    },
  },
  {
    id: 'inescutcheon',
    name: 'Inescutcheon',
    category: 'sub',
    description: 'A small shield in the centre',
    partNames: ['Inescutcheon'],
    lines: true,
    build: (line) => {
      const loop = transformLoop(
        shieldOutline(),
        [CX, (T + SHIELD.bottom) / 2],
        [CX, FY + 4],
        0.36,
      );
      return [shape([decorate(loop, line, 'inside', true)])];
    },
  },
  {
    id: 'orle',
    name: 'Orle',
    category: 'sub',
    description: 'A narrow inner border',
    partNames: ['Orle'],
    lines: true,
    build: (line) => [
      shape(
        [
          decorate(insetLoop(shieldOutline(), 26), line, 'inside', true, 0.6),
          decorate(insetLoop(shieldOutline(), 46), line, 'outside', true, 0.6),
        ],
        'evenodd',
      ),
    ],
  },
  {
    id: 'tressure',
    name: 'Tressure',
    category: 'sub',
    description: 'A double narrow inner border',
    partNames: ['Tressure'],
    lines: false,
    build: () => [
      shape(
        [28, 36, 46, 54].map((d) => insetLoop(shieldOutline(), d)),
        'evenodd',
      ),
    ],
  },
  {
    id: 'fret',
    name: 'Fret',
    category: 'sub',
    description: 'A bendlet and bendlet sinister interlaced with a mascle',
    partNames: ['Fret'],
    lines: false,
    build: () => [
      shape([
        orient(band(FP, BEND, 22, 'straight')),
        orient(band(FP, BEND_SINISTER, 22, 'straight')),
        orient(lozengeLoop(FP, 72, 90)),
        orient(lozengeLoop(FP, 50, 64), false),
      ]),
    ],
  },
  {
    id: 'lozenge',
    name: 'Lozenge',
    category: 'sub',
    description: 'A diamond in the centre',
    partNames: ['Lozenge'],
    lines: true,
    build: (line) => [shape([decorate(lozengeLoop(FP, 72, 104), line, 'inside', true)])],
  },
  {
    id: 'gyron',
    name: 'Gyron',
    category: 'sub',
    description: 'A triangle from dexter chief to the centre',
    partNames: ['Gyron'],
    lines: true,
    build: (line) => {
      const corner = add([L, T], scale(TO_DEXTER_CHIEF, 140));
      return [shape([decorate([corner, FP, [O.left, FY]], line, [L + 20, FY - 30])])];
    },
  },
  {
    id: 'flaunches',
    name: 'Flaunches',
    category: 'sub',
    description: 'Curved segments on both flanks',
    partNames: ['Flaunches'],
    lines: true,
    build: (line) => {
      const r = 260;
      const depth = 82;
      return [
        shape([
          orient(decorate(circleLoop([L + depth - r, FY + 20], r), line, 'inside', true)),
          orient(decorate(circleLoop([R - depth + r, FY + 20], r), line, 'inside', true)),
        ]),
      ];
    },
  },
  // --- Divided fields ------------------------------------------------------------------
  {
    id: 'per-pale',
    name: 'Per pale',
    category: 'division',
    description: 'Divided down the middle',
    partNames: ['Dexter', 'Sinister'],
    lines: true,
    build: (line) => {
      // Along DOWN, -perp is the sinister side (viewer's right).
      const [sinister, dexter] = split([CX, FY], DOWN, line);
      return [shape([dexter]), shape([sinister])];
    },
  },
  {
    id: 'per-fess',
    name: 'Per fess',
    category: 'division',
    description: 'Divided across the middle',
    partNames: ['Chief', 'Base'],
    lines: true,
    build: (line) => split(FP, RIGHT, line).map((loop) => shape([loop])),
  },
  {
    id: 'per-bend',
    name: 'Per bend',
    category: 'division',
    description: 'Divided along the line of a bend',
    partNames: ['Chief', 'Base'],
    lines: true,
    build: (line) => split(FP, BEND, line).map((loop) => shape([loop])),
  },
  {
    id: 'per-bend-sinister',
    name: 'Per bend sinister',
    category: 'division',
    description: 'Divided along the line of a bend sinister',
    partNames: ['Chief', 'Base'],
    lines: true,
    build: (line) => {
      const [base, chief] = split(FP, BEND_SINISTER, line);
      return [shape([chief]), shape([base])];
    },
  },
  {
    id: 'per-chevron',
    name: 'Per chevron',
    category: 'division',
    description: 'Divided along the line of a chevron',
    partNames: ['Chief', 'Base'],
    lines: true,
    build: (line) => {
      const apex: Pt = [CX, FY - 20];
      const left = add(apex, scale(CHEVRON_LEFT, FAR));
      const right = add(apex, scale(CHEVRON_RIGHT, FAR));
      const e = decorate([left, apex, right], line, [CX, T]);
      return [
        shape([[...e, [right[0], -FAR], [left[0], -FAR]]]),
        shape([[...e, [right[0], FAR * 2], [left[0], FAR * 2]]]),
      ];
    },
  },
  {
    id: 'per-saltire',
    name: 'Per saltire',
    category: 'division',
    description: 'Divided by a diagonal cross',
    partNames: ['Chief', 'Dexter', 'Sinister', 'Base'],
    lines: true,
    defaults: [0, 1, 1, 0],
    build: (line) => {
      // Clockwise from the chief: chief, sinister, base, dexter.
      const [chief, sinister, base, dexter] = wedges(FP, diagonals, line);
      return [chief, dexter, sinister, base].map((loop) => shape([loop]));
    },
  },
  {
    id: 'quarterly',
    name: 'Quarterly',
    category: 'division',
    description: 'Divided into four quarters',
    partNames: ['First quarter', 'Second quarter', 'Third quarter', 'Fourth quarter'],
    lines: true,
    defaults: [0, 1, 1, 0],
    build: (line) => {
      // Clockwise from straight up: sinister chief, sinister base, dexter base, dexter chief.
      const [q2, q4, q3, q1] = wedges(FP, [UP, RIGHT, DOWN, LEFT], line);
      return [q1, q2, q3, q4].map((loop) => shape([loop]));
    },
  },
  {
    id: 'gyronny',
    name: 'Gyronny',
    category: 'division',
    description: 'Eight wedges like a pinwheel',
    partNames: Array.from({ length: 8 }, (_, i) => `Gyron ${i + 1}`),
    lines: true,
    build: (line) =>
      wedges(
        FP,
        [
          UP,
          TO_SINISTER_CHIEF,
          RIGHT,
          TO_SINISTER_BASE,
          DOWN,
          TO_DEXTER_BASE,
          LEFT,
          TO_DEXTER_CHIEF,
        ],
        line,
      )
        // Sorted by angle, so the first gyron is the one in dexter chief, just left of the top.
        .map((loop) => shape([loop])),
  },
  // --- Patterns ------------------------------------------------------------------------
  {
    id: 'chequy',
    name: 'Chequy',
    category: 'pattern',
    description: 'A chessboard',
    partNames: ['First tincture', 'Second tincture'],
    lines: false,
    build: () => {
      const size = W / 6;
      const rows = Math.ceil(H / size);
      const groups: Pt[][][] = [[], []];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < 6; c++) {
          groups[(r + c) % 2].push(
            rect(L + c * size, T + r * size, L + (c + 1) * size, T + (r + 1) * size),
          );
        }
      }
      return groups.map((loops) => shape(loops));
    },
  },
  {
    id: 'lozengy',
    name: 'Lozengy',
    category: 'pattern',
    description: 'Diamonds',
    partNames: ['First tincture', 'Second tincture'],
    lines: false,
    build: () => {
      const w = W / 5;
      const h = w * 1.4;
      const groups: Pt[][][] = [[], []];
      for (let j = -1; j <= Math.ceil(H / h) + 1; j++) {
        for (let i = -1; i <= 6; i++) {
          groups[0].push(lozengeLoop([L + i * w, T + j * h], w / 2, h / 2));
          groups[1].push(lozengeLoop([L + (i + 0.5) * w, T + (j + 0.5) * h], w / 2, h / 2));
        }
      }
      return groups.map((loops) => shape(loops));
    },
  },
  {
    id: 'barry',
    name: 'Barry',
    category: 'pattern',
    description: 'Six horizontal stripes',
    partNames: ['First tincture', 'Second tincture'],
    lines: true,
    build: (line) => alternate(stripes(FP, RIGHT, stripeOffsets(FP, RIGHT, 6), line)),
  },
  {
    id: 'paly',
    name: 'Paly',
    category: 'pattern',
    description: 'Six vertical stripes',
    partNames: ['First tincture', 'Second tincture'],
    lines: true,
    build: (line) => alternate(stripes(FP, UP, stripeOffsets(FP, UP, 6), line)),
  },
  {
    id: 'bendy',
    name: 'Bendy',
    category: 'pattern',
    description: 'Six diagonal stripes',
    partNames: ['First tincture', 'Second tincture'],
    lines: true,
    build: (line) =>
      alternate(stripes(FP, scale(BEND, -1), stripeOffsets(FP, scale(BEND, -1), 6), line)),
  },
  {
    id: 'bendy-sinister',
    name: 'Bendy sinister',
    category: 'pattern',
    description: 'Six diagonal stripes the other way',
    partNames: ['First tincture', 'Second tincture'],
    lines: true,
    build: (line) =>
      alternate(stripes(FP, BEND_SINISTER, stripeOffsets(FP, BEND_SINISTER, 6), line)),
  },
];

const BY_ID = new Map(ORDINARIES.map((o) => [o.id, o]));

export function ordinaryDef(id: OrdinaryType): OrdinaryDef | undefined {
  return BY_ID.get(id);
}

const buildCache = new Map<string, Shape[]>();

/** The parts of an ordinary with the given line (cached; shapes are immutable). */
export function ordinaryParts(id: OrdinaryType, line: LineType): Shape[] {
  const def = BY_ID.get(id);
  if (!def) return [];
  const effectiveLine = def.lines ? line : 'straight';
  const key = `${id}|${effectiveLine}`;
  let parts = buildCache.get(key);
  if (!parts) {
    parts = def.build(effectiveLine);
    buildCache.set(key, parts);
  }
  return parts;
}

/** Whether the ordinary lies on the field (so the rule of tincture applies to it). */
export function liesOnField(def: OrdinaryDef): boolean {
  return def.category === 'honourable' || def.category === 'sub';
}
