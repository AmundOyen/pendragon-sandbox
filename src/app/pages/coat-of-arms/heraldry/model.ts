import { FESS_POINT, pointInShape, type Pt, SHIELD } from './geometry';
import type { LineType } from './lines';
import { liesOnField, ordinaryDef, ordinaryParts, type OrdinaryType } from './ordinaries';
import {
  contrastingTincture,
  resolveTincture,
  ruleOfTinctureViolation,
  type TinctureId,
  type TinctureMap,
} from './tinctures';

export interface OrdinaryLayer {
  type: OrdinaryType;
  line: LineType;
  /** One tincture per part; null when the part was deleted (the field shows through). */
  tinctures: (TinctureId | null)[];
}

export interface Charge {
  id: string;
  name: string;
  /** SVG charges can be recoloured with a tincture; raster images keep their colours. */
  kind: 'svg' | 'raster';
  /** The original file as a data URL. */
  src: string;
  /** The SVG markup, for SVG charges. */
  svg?: string;
  /** Tincture for an SVG charge, or null to keep its own colours. */
  tincture: TinctureId | null;
  /** Centre, in shield units. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Degrees, clockwise. */
  rotation: number;
  /** Mirrored left to right. Optional: coats saved before flipping existed lack it. */
  flipX?: boolean;
  /** Mirrored top to bottom. */
  flipY?: boolean;
}

export interface CoatOfArms {
  id: string;
  name: string;
  field: TinctureId;
  ordinary: OrdinaryLayer | null;
  /** Bottom to top. */
  charges: Charge[];
  createdAt: number;
  updatedAt: number;
}

/** A coat of arms being edited; it has no id until it is first saved. */
export type CoatDraft = Omit<CoatOfArms, 'id'> & { id?: string };

export type Selection =
  { kind: 'field' } | { kind: 'part'; index: number } | { kind: 'charge'; id: string };

export const DEFAULT_NAME = 'Untitled arms';

export function newCoat(now = Date.now()): CoatDraft {
  return { name: '', field: 'azure', ordinary: null, charges: [], createdAt: now, updatedAt: now };
}

/**
 * Tinctures for a newly chosen ordinary. Parts reuse the previous ordinary's tinctures
 * where there are any; otherwise divisions and patterns start from the field and a
 * contrasting tincture, and ordinaries lying on the field take a contrasting tincture.
 */
export function defaultTinctures(
  type: OrdinaryType,
  field: TinctureId,
  map: TinctureMap,
  previous: readonly (TinctureId | null)[] = [],
): TinctureId[] {
  const def = ordinaryDef(type);
  if (!def) return [];
  const contrast = contrastingTincture(resolveTincture(map, field));
  const kept = previous.filter((t): t is TinctureId => !!t);
  if (liesOnField(def)) {
    return def.partNames.map((_, i) => kept[i] ?? contrast);
  }
  const pair = [kept[0] ?? field, kept[1] ?? (kept[0] && kept[0] !== field ? field : contrast)];
  return def.partNames.map((_, i) => pair[def.defaults?.[i] ?? i % 2]);
}

/** The tincture visible at a point: the topmost ordinary part containing it, else the field. */
export function tinctureAt(coat: CoatDraft, point: Pt): TinctureId {
  const ordinary = coat.ordinary;
  if (ordinary) {
    const parts = ordinaryParts(ordinary.type, ordinary.line);
    for (let i = parts.length - 1; i >= 0; i--) {
      const tincture = ordinary.tinctures[i];
      if (tincture && pointInShape(point, parts[i])) return tincture;
    }
  }
  return coat.field;
}

export interface TinctureHint {
  /** What the hint is about, e.g. "Chief" or the charge's name. */
  subject: string;
  message: string;
  selection: Selection;
}

/** Rule-of-tincture hints for a coat of arms. They never block anything. */
export function tinctureHints(coat: CoatDraft, map: TinctureMap): TinctureHint[] {
  const hints: TinctureHint[] = [];
  const field = resolveTincture(map, coat.field);
  const ordinary = coat.ordinary;
  const def = ordinary && ordinaryDef(ordinary.type);
  if (ordinary && def && liesOnField(def)) {
    ordinary.tinctures.forEach((id, index) => {
      if (!id) return;
      const tincture = resolveTincture(map, id);
      const broken = ruleOfTinctureViolation(tincture, field);
      if (broken) {
        hints.push({
          subject: def.partNames[index] ?? def.name,
          message: `${tincture.name} on ${field.name} is ${broken}.`,
          selection: { kind: 'part', index },
        });
      }
    });
  }
  for (const charge of coat.charges) {
    if (charge.kind !== 'svg' || !charge.tincture) continue;
    const tincture = resolveTincture(map, charge.tincture);
    const under = resolveTincture(map, tinctureAt(coat, [charge.x, charge.y]));
    const broken = ruleOfTinctureViolation(tincture, under);
    if (broken) {
      hints.push({
        subject: charge.name,
        message: `${tincture.name} on ${under.name} is ${broken}.`,
        selection: { kind: 'charge', id: charge.id },
      });
    }
  }
  return hints;
}

/** Initial placement of a new charge: centred on the fess point, about a third of the shield wide. */
export function placeCharge(
  aspect: number,
): Pick<Charge, 'x' | 'y' | 'width' | 'height' | 'rotation'> {
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  const max = SHIELD.width * 0.38;
  const width = safeAspect >= 1 ? max : max * safeAspect;
  return { x: FESS_POINT[0], y: FESS_POINT[1], width, height: width / safeAspect, rotation: 0 };
}

export function displayName(coat: Pick<CoatDraft, 'name'>): string {
  return coat.name.trim() || DEFAULT_NAME;
}

/**
 * A name for a copy that no saved coat already uses: "Sir Kay" becomes "Sir Kay (copy)",
 * then "Sir Kay (copy 2)", and so on. Copying a copy counts on from the original name.
 */
export function copyName(name: string, taken: Iterable<string>): string {
  const base = displayName({ name }).replace(/\s*\(copy(?: \d+)?\)$/, '');
  const used = new Set([...taken].map((n) => n.trim()));
  let candidate = `${base} (copy)`;
  for (let n = 2; used.has(candidate); n++) candidate = `${base} (copy ${n})`;
  return candidate;
}

/** A new, unsaved coat of arms with the same design, named as a copy. */
export function duplicateCoat(
  coat: CoatDraft,
  takenNames: Iterable<string>,
  now = Date.now(),
): Omit<CoatOfArms, 'id'> {
  const { id: _id, ...design } = structuredClone(coat);
  return { ...design, name: copyName(coat.name, takenNames), createdAt: now, updatedAt: now };
}
