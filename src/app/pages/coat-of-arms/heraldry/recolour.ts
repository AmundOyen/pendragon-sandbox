import { resolveTincture, type Tincture, type TinctureMap } from './tinctures';

/**
 * Recolouring uploaded SVG charges with a tincture.
 *
 * Charges are drawn with `<image>`, so their markup never runs in the page. To recolour
 * one, its fills are rewritten and the result is encoded as a new data URL:
 *
 * - Line art (a coloured figure with black outlines and white details): every fill that is
 *   not black, white or none takes the tincture; outlines and highlights are kept.
 * - Drawn in black on white (only black and white fills, like the charge library): the white
 *   fills take the tincture and the black lines are kept.
 * - A silhouette (only black or unset fills): the black fills take the tincture.
 *
 * A fur is drawn with a pattern added to the charge's own `<defs>`.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
const FUR_ID = 'coa-charge-fur';

const NAMED: Record<string, [number, number, number]> = {
  black: [0, 0, 0],
  white: [255, 255, 255],
};

type FillKind = 'none' | 'black' | 'white' | 'colour';

function parseColour(value: string): [number, number, number] | null {
  const v = value.trim().toLowerCase();
  if (v in NAMED) return NAMED[v];
  let m = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(v);
  if (m) return [m[1], m[2], m[3]].map((h) => parseInt(h + h, 16)) as [number, number, number];
  m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})(?:[0-9a-f]{2})?$/.exec(v);
  if (m) return [m[1], m[2], m[3]].map((h) => parseInt(h, 16)) as [number, number, number];
  m = /^rgba?\(\s*([\d.]+)%?[\s,]+([\d.]+)%?[\s,]+([\d.]+)%?/.exec(v);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  return null;
}

function classify(value: string): FillKind {
  const v = value.trim().toLowerCase();
  if (!v || v === 'none' || v === 'transparent' || v.startsWith('url(') || v === 'inherit')
    return 'none';
  if (v === 'currentcolor') return 'black';
  const rgb = parseColour(v);
  if (!rgb) return 'colour';
  const luminance = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
  if (luminance < 0.18) return 'black';
  if (luminance > 0.93) return 'white';
  return 'colour';
}

const STYLE_FILL = /(^|[;{\s])fill\s*:\s*([^;}"!]+)/g;

/** Every fill value in the document: attributes, style attributes and `<style>` sheets. */
function collectFills(root: Element): string[] {
  const fills: string[] = [];
  for (const el of [root, ...Array.from(root.querySelectorAll('*'))]) {
    const attr = el.getAttribute('fill');
    if (attr !== null) fills.push(attr);
    const style = el.getAttribute('style');
    if (style) for (const m of style.matchAll(STYLE_FILL)) fills.push(m[2]);
    if (el.localName === 'style' && el.textContent) {
      for (const m of el.textContent.matchAll(STYLE_FILL)) fills.push(m[2]);
    }
  }
  return fills;
}

function rewriteFills(root: Element, replace: (kind: FillKind) => boolean, fill: string): void {
  const swap = (value: string) => (replace(classify(value)) ? fill : value);
  for (const el of [root, ...Array.from(root.querySelectorAll('*'))]) {
    const attr = el.getAttribute('fill');
    if (attr !== null) el.setAttribute('fill', swap(attr));
    const style = el.getAttribute('style');
    if (style) {
      el.setAttribute(
        'style',
        style.replace(STYLE_FILL, (_, pre: string, v: string) => `${pre}fill:${swap(v)}`),
      );
    }
    if (el.localName === 'style' && el.textContent) {
      el.textContent = el.textContent.replace(
        STYLE_FILL,
        (_, pre: string, v: string) => `${pre}fill:${swap(v)}`,
      );
    }
  }
}

function viewBoxWidth(root: Element): number {
  const vb = root
    .getAttribute('viewBox')
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  if (vb && vb.length === 4 && vb[2] > 0) return vb[2];
  const w = parseFloat(root.getAttribute('width') ?? '');
  return w > 0 ? w : 100;
}

/** Markup of a fur pattern, as used on the shield, scaled by `k`. */
export function furPatternMarkup(
  id: string,
  fur: NonNullable<Tincture['fur']>,
  map: TinctureMap,
  k = 1,
): string {
  const ground = resolveTincture(map, fur.ground).color;
  const spots = resolveTincture(map, fur.spots).color;
  return (
    `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${fur.width}" height="${fur.height}"` +
    ` patternTransform="scale(${k})">` +
    `<rect width="${fur.width}" height="${fur.height}" fill="${ground}"/>` +
    fur.paths.map((d) => `<path d="${d}" fill="${spots}"/>`).join('') +
    `</pattern>`
  );
}

/** Recolour SVG markup with a tincture. Returns null when the markup cannot be parsed. */
export function recolourSvg(markup: string, tincture: Tincture, map: TinctureMap): string | null {
  const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
  const root = doc.documentElement;
  if (!root || root.localName !== 'svg' || doc.getElementsByTagName('parsererror').length)
    return null;

  const fill = tincture.fur ? `url(#${FUR_ID})` : tincture.color;
  const kinds = collectFills(root).map(classify);
  if (kinds.includes('colour')) {
    rewriteFills(root, (kind) => kind === 'colour', fill);
  } else if (kinds.includes('white')) {
    // Drawn in black on white (like the charge library): the white body takes the tincture.
    rewriteFills(root, (kind) => kind === 'white', fill);
  } else {
    rewriteFills(root, (kind) => kind === 'black', fill);
    // Shapes without a fill default to black: give them the tincture through the root.
    if (root.getAttribute('fill') === null) root.setAttribute('fill', fill);
  }

  // Added after the rewrite so the pattern keeps its own colours.
  if (tincture.fur) {
    const k = viewBoxWidth(root) / 150;
    const holder = new DOMParser().parseFromString(
      `<svg xmlns="${SVG_NS}"><defs>${furPatternMarkup(FUR_ID, tincture.fur, map, k)}</defs></svg>`,
      'image/svg+xml',
    );
    root.insertBefore(
      doc.importNode(holder.documentElement.firstElementChild!, true),
      root.firstChild,
    );
  }
  return new XMLSerializer().serializeToString(doc);
}

export function svgDataUrl(markup: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
}

const cache = new Map<string, string>();
const CACHE_LIMIT = 200;

/** Data URL of an SVG charge in a tincture (cached), or null if it cannot be recoloured. */
export function recolouredCharge(
  chargeId: string,
  markup: string,
  tincture: Tincture,
  map: TinctureMap,
): string | null {
  const key = `${chargeId}|${markup.length}|${tincture.id}|${tincture.color}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const recoloured = recolourSvg(markup, tincture, map);
  if (!recoloured) return null;
  const url = svgDataUrl(recoloured);
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value!);
  cache.set(key, url);
  return url;
}
