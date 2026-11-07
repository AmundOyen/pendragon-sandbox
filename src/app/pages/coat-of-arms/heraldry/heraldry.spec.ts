import { fileSlug } from './export';
import { FESS_POINT, insetLoop, pointInShape, shieldOutline, SHIELD, toPathData } from './geometry';
import { decorate, LINES } from './lines';
import {
  type CoatDraft,
  copyName,
  defaultTinctures,
  duplicateCoat,
  newCoat,
  tinctureAt,
  tinctureHints,
} from './model';
import { ORDINARIES, ordinaryParts } from './ordinaries';
import { recolourSvg } from './recolour';
import { resolveTincture, ruleOfTinctureViolation, tinctureMap } from './tinctures';

const map = tinctureMap([{ id: 'c1', name: 'Celeste', color: '#88bbee', class: 'colour' }]);

describe('ordinaries', () => {
  it('builds one non-empty shape per named part, for every line of partition', () => {
    for (const def of ORDINARIES) {
      for (const line of LINES) {
        const parts = ordinaryParts(def.id, line.id);
        expect(parts.length, `${def.id} ${line.id}`).toBe(def.partNames.length);
        for (const part of parts) expect(toPathData(part)).toMatch(/^M[-\d.]+,[-\d.]+L/);
      }
    }
  });

  it('places the parts of divided fields where heraldry puts them', () => {
    const [dexter, sinister] = ordinaryParts('per-pale', 'straight');
    const left = [SHIELD.centerX - 80, SHIELD.fessY] as const;
    const right = [SHIELD.centerX + 80, SHIELD.fessY] as const;
    expect(pointInShape(left, dexter)).toBe(true);
    expect(pointInShape(right, sinister)).toBe(true);
    expect(pointInShape(left, sinister)).toBe(false);

    const [q1, q2, q3, q4] = ordinaryParts('quarterly', 'wavy');
    expect(pointInShape([60, 60], q1)).toBe(true);
    expect(pointInShape([300, 60], q2)).toBe(true);
    expect(pointInShape([100, 300], q3)).toBe(true);
    expect(pointInShape([260, 300], q4)).toBe(true);
  });

  it('cuts the hole of a bordure out of its shape', () => {
    const [bordure] = ordinaryParts('bordure', 'engrailed');
    expect(pointInShape(FESS_POINT, bordure)).toBe(false);
    expect(pointInShape([SHIELD.left + 5, SHIELD.fessY], bordure)).toBe(true);
  });

  it('keeps the edges of chequy groups apart', () => {
    const [first, second] = ordinaryParts('chequy', 'straight');
    const cell = SHIELD.width / 6;
    const p = [SHIELD.left + cell / 2, SHIELD.top + cell / 2] as const;
    const q = [SHIELD.left + cell * 1.5, SHIELD.top + cell / 2] as const;
    expect(pointInShape(p, first) && !pointInShape(p, second)).toBe(true);
    expect(pointInShape(q, second) && !pointInShape(q, first)).toBe(true);
  });
});

describe('geometry and lines', () => {
  it('insets the shield without crossing itself at the corners', () => {
    const inset = insetLoop(shieldOutline(), 30);
    for (const [x, y] of inset) {
      expect(x).toBeGreaterThanOrEqual(SHIELD.left + 29);
      expect(y).toBeGreaterThanOrEqual(SHIELD.top + 29);
    }
  });

  it('leaves straight lines alone and decorates the others away from the owner', () => {
    const line = [
      [0, 0],
      [300, 0],
    ] as const;
    expect(decorate(line, 'straight', [0, 10])).toEqual(line);
    const engrailed = decorate(line, 'engrailed', [150, 10]);
    // The cusps point away from the owner (up), the arcs bite into it (down).
    expect(Math.min(...engrailed.map((p) => p[1]))).toBeLessThan(-4);
    expect(Math.max(...engrailed.map((p) => p[1]))).toBeGreaterThan(4);
    expect(engrailed[0][1]).toBeLessThan(0);
  });
});

describe('tinctures', () => {
  it('applies the rule of tincture, with furs exempt', () => {
    const t = (id: string) => resolveTincture(map, id);
    expect(ruleOfTinctureViolation(t('or'), t('argent'))).toBe('metal on metal');
    expect(ruleOfTinctureViolation(t('gules'), t('azure'))).toBe('colour on colour');
    expect(ruleOfTinctureViolation(t('c1'), t('vert'))).toBe('colour on colour');
    expect(ruleOfTinctureViolation(t('or'), t('gules'))).toBeNull();
    expect(ruleOfTinctureViolation(t('ermine'), t('argent'))).toBeNull();
  });

  it('shows deleted custom tinctures as unknown', () => {
    expect(resolveTincture(map, 'gone').name).toBe('Unknown');
  });

  it('picks contrasting defaults and keeps previous tinctures', () => {
    expect(defaultTinctures('chief', 'azure', map)).toEqual(['or']);
    expect(defaultTinctures('chief', 'argent', map)).toEqual(['gules']);
    expect(defaultTinctures('per-pale', 'azure', map)).toEqual(['azure', 'or']);
    expect(defaultTinctures('quarterly', 'gules', map)).toEqual(['gules', 'or', 'or', 'gules']);
    expect(defaultTinctures('fess', 'azure', map, ['vert'])).toEqual(['vert']);
  });

  it('hints when an ordinary or a charge breaks the rule of tincture', () => {
    const coat: CoatDraft = {
      ...newCoat(0),
      field: 'argent',
      ordinary: { type: 'chief', line: 'straight', tinctures: ['or'] },
      charges: [
        {
          id: 'c',
          name: 'Lion',
          kind: 'svg',
          src: '',
          svg: '<svg/>',
          tincture: 'gules',
          x: FESS_POINT[0],
          y: 40,
          width: 40,
          height: 40,
          rotation: 0,
        },
      ],
    };
    expect(tinctureAt(coat, [FESS_POINT[0], 40])).toBe('or');
    expect(tinctureAt(coat, FESS_POINT)).toBe('argent');
    const hints = tinctureHints(coat, map);
    expect(hints.map((h) => h.subject)).toEqual(['Chief']);
    expect(hints[0].message).toContain('metal on metal');

    coat.charges[0].tincture = 'azure';
    coat.ordinary!.tinctures = ['vert'];
    expect(tinctureHints(coat, map).map((h) => h.subject)).toEqual(['Lion']);
  });
});

describe('recolourSvg', () => {
  const parse = (markup: string) =>
    new DOMParser().parseFromString(markup, 'image/svg+xml').documentElement;

  it('recolours the coloured fills of line art and keeps outlines and highlights', () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">' +
      '<path d="M0 0h5v5z" fill="#e0a000" stroke="#000"/>' +
      '<path d="M5 5h5v5z" style="fill: #000000"/>' +
      '<circle r="1" fill="white"/></svg>';
    const out = parse(recolourSvg(svg, resolveTincture(map, 'gules'), map)!);
    const [coloured, black] = Array.from(out.querySelectorAll('path'));
    expect(coloured.getAttribute('fill')).toBe('#d0181f');
    expect(black.getAttribute('style')).toContain('#000000');
    expect(out.querySelector('circle')!.getAttribute('fill')).toBe('white');
  });

  it('recolours a black silhouette, including shapes without a fill', () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0h5v5z"/></svg>';
    const out = parse(recolourSvg(svg, resolveTincture(map, 'or'), map)!);
    expect(out.getAttribute('fill')).toBe('#f2c318');
  });

  it('recolours fills in style sheets', () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg"><style>.a{fill:#3366cc}</style><path class="a" d="M0 0h5v5z"/></svg>';
    const out = parse(recolourSvg(svg, resolveTincture(map, 'vert'), map)!);
    expect(out.querySelector('style')!.textContent).toContain('fill:#1c8a3a');
  });

  it('adds a pattern for furs', () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 150"><path d="M0 0h5v5z"/></svg>';
    const out = parse(recolourSvg(svg, resolveTincture(map, 'ermine'), map)!);
    expect(out.getAttribute('fill')).toBe('url(#coa-charge-fur)');
    const pattern = out.querySelector('pattern#coa-charge-fur')!;
    expect(pattern).not.toBeNull();
    // The pattern keeps its own colours.
    expect(pattern.querySelector('rect')!.getAttribute('fill')).toBe('#ffffff');
  });

  it('rejects markup that is not SVG', () => {
    expect(recolourSvg('<html></html>', resolveTincture(map, 'or'), map)).toBeNull();
    expect(recolourSvg('not xml', resolveTincture(map, 'or'), map)).toBeNull();
  });
});

describe('fileSlug', () => {
  it('makes a file name from a coat of arms name', () => {
    expect(fileSlug('Sir Bors de Ganis')).toBe('sir-bors-de-ganis');
    expect(fileSlug('Tenné & Gules!')).toBe('tenne-gules');
    expect(fileSlug('  ')).toBe('coat-of-arms');
  });
});

describe('duplicating', () => {
  it('names copies so they do not clash', () => {
    expect(copyName('Sir Kay', [])).toBe('Sir Kay (copy)');
    expect(copyName('Sir Kay', ['Sir Kay (copy)'])).toBe('Sir Kay (copy 2)');
    expect(copyName('Sir Kay (copy)', ['Sir Kay (copy)', 'Sir Kay (copy 2)'])).toBe(
      'Sir Kay (copy 3)',
    );
    expect(copyName('  ', [])).toBe('Untitled arms (copy)');
  });

  it('copies the design deeply, without the id', () => {
    const original = {
      ...newCoat(1),
      id: 'a',
      name: 'Sir Kay',
      ordinary: { type: 'chief' as const, line: 'wavy' as const, tinctures: ['or'] },
    };
    const copy = duplicateCoat(original, ['Sir Kay'], 5);
    expect('id' in copy).toBe(false);
    expect(copy.name).toBe('Sir Kay (copy)');
    expect(copy.createdAt).toBe(5);
    expect(copy.ordinary).toEqual(original.ordinary);
    copy.ordinary!.tinctures[0] = 'gules';
    expect(original.ordinary.tinctures[0]).toBe('or');
  });
});
