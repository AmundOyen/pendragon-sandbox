import { TestBed } from '@angular/core/testing';
import { CoatOfArmsPage } from './coat-of-arms';
import { CoatOfArmsService } from './coat-of-arms.service';
import type { CoatOfArms } from './heraldry/model';
import type { CustomTincture } from './heraldry/tinctures';

/** In-memory stand-in for the IndexedDB service (jsdom has no IndexedDB). */
function memoryStore<T extends { id: string }>() {
  let items: T[] = [];
  let next = 1;
  return {
    read: async () => structuredClone(items),
    get: async (id: string) => structuredClone(items.find((i) => i.id === id) ?? null),
    add: async (item: Omit<T, 'id'>) => {
      const created = { ...item, id: `id-${next++}` } as T;
      items.push(structuredClone(created));
      return created;
    },
    update: async (item: T) => {
      items = items.map((i) => (i.id === item.id ? structuredClone(item) : i));
      return item;
    },
    delete: async (id: string) => {
      items = items.filter((i) => i.id !== id);
    },
    query: async (where: (i: T) => boolean) => items.filter(where),
    find: async (where: (i: T) => boolean) => items.find(where) ?? null,
  };
}

class FakeCoatOfArmsService {
  coats = memoryStore<CoatOfArms>();
  tinctures = memoryStore<CustomTincture>();
}

const SVG_CHARGE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"><path d="M0 0h100v50z" fill="#e0a000"/></svg>';

describe('CoatOfArmsPage', () => {
  let service: FakeCoatOfArmsService;

  beforeEach(async () => {
    service = new FakeCoatOfArmsService();
    await TestBed.configureTestingModule({
      imports: [CoatOfArmsPage],
      providers: [{ provide: CoatOfArmsService, useValue: service }],
    }).compileComponents();
    localStorage.clear();
    vi.spyOn(globalThis, 'confirm').mockReturnValue(true);
    vi.spyOn(globalThis, 'scrollTo').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  async function render() {
    const fixture = TestBed.createComponent(CoatOfArmsPage);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const stage = () => el.querySelector<SVGSVGElement>('.stage svg')!;
    const click = async (selector: string, root: ParentNode = el) => {
      const target = root.querySelector(selector) as HTMLElement | SVGElement | null;
      expect(target, selector).not.toBeNull();
      target!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await fixture.whenStable();
    };
    const pickTincture = async (id: string) => {
      const input = el.querySelector<HTMLInputElement>(`[data-tincture="${id}"] input`)!;
      input.checked = true;
      input.dispatchEvent(new Event('change'));
      await fixture.whenStable();
    };
    const selectField = () => click('.field', stage());
    const title = () => el.querySelector('.target-title')!.textContent!.trim();
    return {
      fixture,
      el,
      stage,
      click,
      pickTincture,
      selectField,
      title,
      page: fixture.componentInstance,
    };
  }

  it('starts with a plain azure field and nothing selected', async () => {
    const { el, stage, title } = await render();
    expect(title()).toBe('Nothing selected');
    expect(el.querySelector('app-tincture-palette')).toBeNull();
    expect(stage().querySelector('[data-ui] path')).toBeNull();
    expect(stage().querySelector('.field')!.getAttribute('fill')).toBe('#1f4fa8');
    expect(stage().querySelectorAll('.part').length).toBe(0);
  });

  it('sets the field tincture from the palette', async () => {
    const { stage, pickTincture, selectField, title } = await render();
    await selectField();
    expect(title()).toBe('Field');
    await pickTincture('gules');
    expect(stage().querySelector('.field')!.getAttribute('fill')).toBe('#d0181f');
  });

  it('adds an ordinary, tinctures a part and deletes it', async () => {
    const { el, stage, click, pickTincture } = await render();
    await click('[data-ordinary="per-pale"]');
    expect(stage().querySelectorAll('.part').length).toBe(2);
    expect(el.querySelector('.target-title')!.textContent).toContain('Dexter');

    await click('.part[data-part="1"]', stage());
    expect(el.querySelector('.target-title')!.textContent).toContain('Sinister');
    await pickTincture('vert');
    expect(stage().querySelector('.part[data-part="1"]')!.getAttribute('fill')).toBe('#1c8a3a');

    await click('.delete-part');
    expect(stage().querySelectorAll('.part').length).toBe(1);
    expect(el.textContent).toContain('Restore part');
  });

  it('selects the field from the empty panel', async () => {
    const { click, title } = await render();
    await click('.select-field');
    expect(title()).toBe('Field');
  });

  it('clears the selection when clicking outside the shield', async () => {
    const { fixture, stage, click, selectField, title } = await render();
    await click('[data-ordinary="chief"]');
    expect(title()).toBe('Chief');

    // The space around the shield inside the <svg>.
    stage().dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();
    expect(title()).toBe('Nothing selected');

    await selectField();
    expect(title()).toBe('Field');
    // The page around the designer.
    await click('#gallery-title');
    expect(title()).toBe('Nothing selected');
  });

  it('keeps the selection when clicking in the editing panels', async () => {
    const { click, selectField, title } = await render();
    await selectField();
    await click('#ordinary-title');
    await click('.ordinary-group summary');
    expect(title()).toBe('Field');
  });

  it('clears the selection with Escape', async () => {
    const { fixture, el, selectField, title } = await render();
    await selectField();
    el.querySelector('.stage')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();
    expect(title()).toBe('Nothing selected');
  });

  it('uses a pattern for a fur field', async () => {
    const { stage, pickTincture, selectField } = await render();
    await selectField();
    await pickTincture('ermine');
    expect(stage().querySelector('.field')!.getAttribute('fill')).toMatch(
      /^url\(#coa-\d+-fur-ermine\)$/,
    );
    expect(stage().querySelector('pattern[id$="-fur-ermine"]')).not.toBeNull();
  });

  it('shows a rule-of-tincture hint for metal on metal', async () => {
    const { el, click, pickTincture, selectField } = await render();
    await selectField();
    await pickTincture('argent');
    await click('[data-ordinary="chief"]');
    await pickTincture('or');
    expect(el.querySelector('.hints')!.textContent).toContain('metal on metal');
  });

  it('adds an SVG charge, recolours it and deletes it', async () => {
    const { fixture, el, stage, pickTincture, page, click } = await render();
    await page.addFiles([new File([SVG_CHARGE], 'golden-lion.svg', { type: 'image/svg+xml' })]);
    await fixture.whenStable();

    const image = stage().querySelector('image.charge')!;
    expect(image.getAttribute('width')).not.toBeNull();
    expect(Number(image.getAttribute('width')) / Number(image.getAttribute('height'))).toBeCloseTo(
      2,
    );
    expect(el.querySelector('.target-title')!.textContent).toContain('Golden lion');

    await pickTincture('gules');
    const href = decodeURIComponent(stage().querySelector('image.charge')!.getAttribute('href')!);
    expect(href).toContain('fill="#d0181f"');

    await click('.delete-charge');
    expect(stage().querySelectorAll('image.charge').length).toBe(0);
  });

  it('flips a charge horizontally and vertically', async () => {
    const { fixture, stage, page, click } = await render();
    await page.addFiles([new File([SVG_CHARGE], 'lion.svg', { type: 'image/svg+xml' })]);
    await fixture.whenStable();
    const image = () => stage().querySelector('image.charge')!;
    expect(image().getAttribute('transform')).not.toContain('scale');

    await click('.flip-x');
    expect(image().getAttribute('transform')).toContain('scale(-1 1)');
    await click('.flip-y');
    expect(image().getAttribute('transform')).toContain('scale(-1 -1)');
    // The handles are not mirrored, so the rotate handle stays on top.
    expect(stage().querySelector('g[data-ui][transform]')!.getAttribute('transform')).not.toContain(
      'scale',
    );

    await click('.flip-x');
    expect(image().getAttribute('transform')).toContain('scale(1 -1)');
  });

  it('collapses the ordinary groups and remembers which are open', async () => {
    const { fixture, el } = await render();
    const group = (category: string) =>
      el.querySelector<HTMLDetailsElement>(`.ordinary-group[data-category="${category}"]`)!;
    expect(group('honourable').open).toBe(true);
    expect(group('division').open).toBe(false);

    group('division').open = true;
    group('division').dispatchEvent(new Event('toggle'));
    group('honourable').open = false;
    group('honourable').dispatchEvent(new Event('toggle'));
    await fixture.whenStable();

    const again = await render();
    const groupAgain = (category: string) =>
      again.el.querySelector<HTMLDetailsElement>(`.ordinary-group[data-category="${category}"]`)!;
    expect(groupAgain('division').open).toBe(true);
    expect(groupAgain('honourable').open).toBe(false);
  });

  it('names the chosen ordinary on its group', async () => {
    const { el, click } = await render();
    await click('[data-ordinary="quarterly"]');
    const summary = el.querySelector('.ordinary-group[data-category="division"] summary')!;
    expect(summary.textContent).toContain('Quarterly');
  });

  it('rejects files that are not images', async () => {
    const { fixture, el, page } = await render();
    await page.addFiles([new File(['hello'], 'notes.txt', { type: 'text/plain' })]);
    await fixture.whenStable();
    expect(el.querySelector('[role="alert"]')!.textContent).toContain('notes.txt');
  });

  it('saves to the gallery and opens a saved coat of arms again', async () => {
    const { fixture, el, stage, click, pickTincture, selectField, page } = await render();
    const name = el.querySelector<HTMLInputElement>('.coat-name')!;
    name.value = 'Sir Bors';
    name.dispatchEvent(new Event('input'));
    await selectField();
    await pickTincture('or');
    await page.save();
    await fixture.whenStable();

    expect(await service.coats.read()).toHaveLength(1);
    expect(el.querySelectorAll('.gallery-item').length).toBe(1);
    expect(el.querySelector('.gallery-item')!.textContent).toContain('Sir Bors');
    expect(el.querySelector('.save-button')!.textContent).toContain('Saved');

    await click('button', el.querySelector('header')!); // New
    expect(el.querySelector<HTMLInputElement>('.coat-name')!.value).toBe('');

    await click('.gallery-item button');
    expect(el.querySelector<HTMLInputElement>('.coat-name')!.value).toBe('Sir Bors');
    expect(stage().querySelector('.field')!.getAttribute('fill')).toBe('#f2c318');
  });

  it('creates a custom tincture shared through the service', async () => {
    const { fixture, el, page, stage, selectField } = await render();
    await selectField();
    await page.createTincture({ name: 'Celeste', color: '#88bbee', class: 'colour' });
    await fixture.whenStable();
    expect(await service.tinctures.read()).toHaveLength(1);
    expect(el.textContent).toContain('Celeste');
    expect(stage().querySelector('.field')!.getAttribute('fill')).toBe('#88bbee');
  });
});
