import { TestBed } from '@angular/core/testing';
import { type DicePool, type RollResult, rollPool } from './dice';
import { DiceRoller } from './dice-roller';
import { DiceTrayPage } from './dice-tray';

/** Rolls in software immediately; the 3D engine needs WebGL, which jsdom lacks. */
class FakeDiceRoller {
  readonly status = () => 'fallback' as const;
  attach = async () => {};
  clear = () => {};
  lastColor: string | undefined;
  roll = async (
    pool: DicePool,
    modifier: number,
    color?: string,
  ): Promise<Omit<RollResult, 'id' | 'timestamp'>> => {
    this.lastColor = color;
    return rollPool(pool, modifier, () => 0.5);
  };
}

describe('DiceTrayPage', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [DiceTrayPage],
      providers: [{ provide: DiceRoller, useClass: FakeDiceRoller }],
    }).compileComponents();
  });

  async function render() {
    const fixture = TestBed.createComponent(DiceTrayPage);
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('offers every die type in the picker', async () => {
    const { el } = await render();
    expect(el.querySelectorAll('app-die-selector').length).toBe(7);
  });

  it('disables the roll button until a die is selected', async () => {
    const { fixture, el } = await render();
    const rollButton = el.querySelector<HTMLButtonElement>('.roll-button')!;
    expect(rollButton.disabled).toBe(true);

    el.querySelector<HTMLButtonElement>('app-die-selector[data-die="d20"] .die')!.click();
    await fixture.whenStable();

    expect(rollButton.disabled).toBe(false);
    expect(rollButton.textContent).toContain('Roll 1d20');
  });

  it('shows the result after rolling', async () => {
    const { fixture, el } = await render();
    const d6 = el.querySelector<HTMLButtonElement>('app-die-selector[data-die="d6"] .die')!;
    d6.click();
    d6.click();
    await fixture.whenStable();
    el.querySelector<HTMLButtonElement>('.roll-button')!.click();
    await fixture.whenStable();

    expect(el.querySelector('.result-formula')?.textContent).toContain('2d6');
    expect(el.querySelector('.result-total')?.textContent?.trim()).toBe('8');
  });

  it('rolls in the picked dice colour and remembers it', async () => {
    const { fixture, el } = await render();
    const roller = TestBed.inject(DiceRoller) as unknown as FakeDiceRoller;
    el.querySelector<HTMLInputElement>('input[name="dice-color"][aria-label="Brick"]')!.click();
    el.querySelector<HTMLButtonElement>('app-die-selector[data-die="d8"] .die')!.click();
    await fixture.whenStable();
    el.querySelector<HTMLButtonElement>('.roll-button')!.click();
    await fixture.whenStable();
    expect(roller.lastColor).toBe('#a8442b');

    fixture.destroy();
    const again = await render();
    const checked = again.el.querySelector<HTMLInputElement>('input[name="dice-color"]:checked');
    expect(checked?.getAttribute('aria-label')).toBe('Brick');
  });

  it('accepts a custom colour', async () => {
    const { fixture, el } = await render();
    const custom = el.querySelector<HTMLInputElement>('input[type="color"]')!;
    custom.value = '#336699';
    custom.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(el.querySelector('input[name="dice-color"]:checked')).toBeNull();
    expect(JSON.parse(localStorage.getItem('pendragon-sandbox.dice-tray.v1')!).diceColor).toBe(
      '#336699',
    );
  });
});
