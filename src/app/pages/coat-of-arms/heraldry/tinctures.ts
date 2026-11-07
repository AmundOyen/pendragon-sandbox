/**
 * Tinctures: the two metals, the main colours, the rarer stains and the furs, plus the
 * custom tinctures a user creates. See "Tinctures: metals, colours and furs" in the
 * Heraldry in Arthurian Literature primer.
 */

/** How a tincture behaves under the rule of tincture. */
export type TinctureClass = 'metal' | 'colour' | 'fur';

export type TinctureId = string;

export interface FurPattern {
  /** Tile size in shield units (userSpaceOnUse). */
  readonly width: number;
  readonly height: number;
  /** Tincture of the ground. */
  readonly ground: TinctureId;
  /** Tincture of the spots or bells. */
  readonly spots: TinctureId;
  /** Paths drawn in the spot tincture, in tile coordinates. */
  readonly paths: readonly string[];
}

export interface Tincture {
  readonly id: TinctureId;
  /** Blazon name, e.g. "Gules". */
  readonly name: string;
  /** Plain English, e.g. "Red". */
  readonly description: string;
  readonly class: TinctureClass;
  /** Display colour. For a fur, the colour of its ground (used for swatches and hints). */
  readonly color: string;
  readonly fur?: FurPattern;
  /** True for tinctures the user created. */
  readonly custom?: boolean;
}

/** A tincture the user created, as stored by {@link CoatOfArmsService}. */
export interface CustomTincture {
  id: string;
  name: string;
  color: string;
  class: Exclude<TinctureClass, 'fur'>;
}

/** Circle as a path, so fur tiles are paths only (easy to inline into charges). */
function dot(cx: number, cy: number, r: number): string {
  return `M${cx - r},${cy}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0Z`;
}

/** One ermine spot (three dots above a flared tail), centred on (x, y). */
function ermineSpot(x: number, y: number): string[] {
  return [
    dot(x, y - 5.5, 1.6),
    dot(x - 2.8, y - 3.6, 1.6),
    dot(x + 2.8, y - 3.6, 1.6),
    `M${x},${y - 2.5}C${x + 1.2},${y + 1} ${x + 2.5},${y + 4.5} ${x + 4.2},${y + 8}` +
      `L${x + 1.4},${y + 6.4}L${x},${y + 9}L${x - 1.4},${y + 6.4}L${x - 4.2},${y + 8}` +
      `C${x - 2.5},${y + 4.5} ${x - 1.2},${y + 1} ${x},${y - 2.5}Z`,
  ];
}

const ERMINE_PATHS = [...ermineSpot(9, 9), ...ermineSpot(27, 31)];

/** Vair bells: a row of upright bells and, offset by half a bell, a row of hanging ones. */
const VAIR_PATHS = [
  'M0,20L0,13L5,8L5,0L15,0L15,8L20,13L20,20Z',
  'M10,20L15,25L15,33L20,38L20,40L0,40L0,38L5,33L5,25Z',
];

export const STANDARD_TINCTURES: readonly Tincture[] = [
  { id: 'or', name: 'Or', description: 'Gold / yellow', class: 'metal', color: '#f2c318' },
  { id: 'argent', name: 'Argent', description: 'Silver / white', class: 'metal', color: '#ffffff' },
  { id: 'gules', name: 'Gules', description: 'Red', class: 'colour', color: '#d0181f' },
  { id: 'azure', name: 'Azure', description: 'Blue', class: 'colour', color: '#1f4fa8' },
  { id: 'vert', name: 'Vert', description: 'Green', class: 'colour', color: '#1c8a3a' },
  { id: 'sable', name: 'Sable', description: 'Black', class: 'colour', color: '#141414' },
  { id: 'purpure', name: 'Purpure', description: 'Purple', class: 'colour', color: '#7b2a8c' },
  {
    id: 'murrey',
    name: 'Murrey',
    description: 'Mulberry (stain)',
    class: 'colour',
    color: '#8c1c4b',
  },
  {
    id: 'sanguine',
    name: 'Sanguine',
    description: 'Blood red (stain)',
    class: 'colour',
    color: '#9b1b1b',
  },
  {
    id: 'tenne',
    name: 'Tenné',
    description: 'Tawny orange (stain)',
    class: 'colour',
    color: '#c4651a',
  },
  {
    id: 'ermine',
    name: 'Ermine',
    description: 'White with black tails',
    class: 'fur',
    color: '#ffffff',
    fur: { width: 36, height: 44, ground: 'argent', spots: 'sable', paths: ERMINE_PATHS },
  },
  {
    id: 'ermines',
    name: 'Ermines',
    description: 'Black with white tails',
    class: 'fur',
    color: '#141414',
    fur: { width: 36, height: 44, ground: 'sable', spots: 'argent', paths: ERMINE_PATHS },
  },
  {
    id: 'erminois',
    name: 'Erminois',
    description: 'Gold with black tails',
    class: 'fur',
    color: '#f2c318',
    fur: { width: 36, height: 44, ground: 'or', spots: 'sable', paths: ERMINE_PATHS },
  },
  {
    id: 'pean',
    name: 'Pean',
    description: 'Black with gold tails',
    class: 'fur',
    color: '#141414',
    fur: { width: 36, height: 44, ground: 'sable', spots: 'or', paths: ERMINE_PATHS },
  },
  {
    id: 'vair',
    name: 'Vair',
    description: 'Blue-and-white pelts',
    class: 'fur',
    color: '#1f4fa8',
    fur: { width: 20, height: 40, ground: 'argent', spots: 'azure', paths: VAIR_PATHS },
  },
];

/** Groups shown in the palette, in order. */
export const PALETTE_GROUPS: readonly { label: string; ids: readonly TinctureId[] }[] = [
  { label: 'Metals', ids: ['or', 'argent'] },
  { label: 'Colours', ids: ['gules', 'azure', 'vert', 'sable', 'purpure'] },
  { label: 'Stains', ids: ['murrey', 'sanguine', 'tenne'] },
  { label: 'Furs', ids: ['ermine', 'ermines', 'erminois', 'pean', 'vair'] },
];

/** Shown for a tincture id that no longer exists (e.g. a deleted custom tincture). */
export const UNKNOWN_TINCTURE: Tincture = {
  id: 'unknown',
  name: 'Unknown',
  description: 'This tincture no longer exists',
  class: 'colour',
  color: '#9a9a9a',
};

export function isHexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value);
}

export function toTincture(custom: CustomTincture): Tincture {
  return {
    id: custom.id,
    name: custom.name,
    description: custom.class === 'metal' ? 'Custom metal' : 'Custom colour',
    class: custom.class,
    color: isHexColor(custom.color) ? custom.color.toLowerCase() : UNKNOWN_TINCTURE.color,
    custom: true,
  };
}

export type TinctureMap = ReadonlyMap<TinctureId, Tincture>;

export function tinctureMap(custom: readonly CustomTincture[] = []): TinctureMap {
  return new Map([...STANDARD_TINCTURES, ...custom.map(toTincture)].map((t) => [t.id, t]));
}

export function resolveTincture(map: TinctureMap, id: TinctureId | null | undefined): Tincture {
  return (id && map.get(id)) || UNKNOWN_TINCTURE;
}

/**
 * Rule of tincture: metal must not lie on metal, nor colour on colour. Furs sit on anything.
 * Returns a short message when `top` (lying on `bottom`) breaks the rule, otherwise null.
 */
export function ruleOfTinctureViolation(top: Tincture, bottom: Tincture): string | null {
  if (top.class === 'fur' || bottom.class === 'fur') return null;
  if (top.class !== bottom.class) return null;
  return top.class === 'metal' ? 'metal on metal' : 'colour on colour';
}

/** A contrasting default tincture to place on something of the given tincture. */
export function contrastingTincture(on: Tincture): TinctureId {
  return on.class === 'metal' ? 'gules' : 'or';
}
