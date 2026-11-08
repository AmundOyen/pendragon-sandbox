import { TestBed } from '@angular/core/testing';
import { ChargeLibrary } from './charge-library';
import {
  CHARGE_DRAG_TYPE,
  CHARGE_LIBRARY,
  libraryCharge,
  libraryChargeUrl,
} from './charge-library.data';

describe('ChargeLibrary', () => {
  async function render() {
    const fixture = TestBed.createComponent(ChargeLibrary);
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('shows every charge with a preview and a label', async () => {
    const { el } = await render();
    const items = el.querySelectorAll<HTMLButtonElement>('.library-charge');
    expect(items.length).toBe(CHARGE_LIBRARY.length);
    const lion = el.querySelector('[data-charge-file="lion-rampant.svg"]')!;
    expect(lion.textContent!.trim()).toBe('Lion rampant');
    expect(lion.querySelector('img')!.getAttribute('src')).toBe(
      'cote-of-arms/charges/lion-rampant.svg',
    );
    expect(lion.getAttribute('draggable')).toBe('true');
  });

  it('filters the charges by name', async () => {
    const { fixture, el } = await render();
    const search = el.querySelector<HTMLInputElement>('.charge-search')!;
    search.value = 'LION';
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    const names = Array.from(el.querySelectorAll('.library-charge')).map((b) =>
      b.textContent!.trim(),
    );
    expect(names).toEqual(['Lion rampant', 'Lion passant', "Lion's head"]);

    search.value = 'unicorn';
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(el.textContent).toContain('No charge matches');
  });

  it('puts the charge in the drag data and emits it on click', async () => {
    const { fixture, el } = await render();
    const added: string[] = [];
    fixture.componentInstance.add.subscribe((c) => added.push(c.file));
    const button = el.querySelector<HTMLButtonElement>('[data-charge-file="keys.svg"]')!;

    const data = new Map<string, string>();
    const dragstart = Object.assign(new Event('dragstart'), {
      dataTransfer: { setData: (type: string, value: string) => data.set(type, value) },
    });
    button.dispatchEvent(dragstart);
    expect(data.get(CHARGE_DRAG_TYPE)).toBe('keys.svg');
    expect(data.get('text/plain')).toBe('Key');

    button.click();
    expect(added).toEqual(['keys.svg']);
  });

  it('only accepts files from the library', () => {
    expect(libraryCharge('wolf.svg')?.name).toBe('Wolf');
    expect(libraryCharge('../../secret.svg')).toBeNull();
    expect(libraryCharge(null)).toBeNull();
    expect(libraryChargeUrl(libraryCharge('wolf.svg')!)).toBe('cote-of-arms/charges/wolf.svg');
  });
});
