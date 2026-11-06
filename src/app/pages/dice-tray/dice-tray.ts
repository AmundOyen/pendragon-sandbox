import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideDelete,
  lucideEraser,
  lucideInfo,
  lucideMinus,
  lucidePlus,
  lucideRotateCcw,
  lucideTrash2,
} from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmSpinner } from '@spartan-ng/helm/spinner';
import {
  DEFAULT_DICE_COLOR,
  DICE_COLORS,
  DIE_SIDES,
  DIE_TYPES,
  type DicePool,
  type DieType,
  emptyPool,
  formatPool,
  isHexColor,
  MAX_DICE_PER_TYPE,
  poolSize,
  type RollResult,
} from './dice';
import { DiceRoller } from './dice-roller';
import { DieSelector } from './die-selector/die-selector';

const STORAGE_KEY = 'pendragon-sandbox.dice-tray.v1';
const HISTORY_LIMIT = 30;

function clampCount(count: number): number {
  return Math.max(0, Math.min(MAX_DICE_PER_TYPE, Math.trunc(count)));
}

interface PersistedState {
  pool: DicePool;
  modifier: number;
  history: RollResult[];
  diceColor: string;
}

/**
 * Dice tray, ported from AmundOyen/dice-tray: pick dice and a modifier, roll them onto a 3D
 * tray (@3d-dice/dice-box), and keep a history of recent rolls.
 */
@Component({
  selector: 'app-dice-tray',
  imports: [HlmButton, HlmCardImports, HlmInput, HlmLabel, HlmSpinner, NgIcon, DieSelector],
  providers: [
    provideIcons({
      lucideDelete,
      lucideEraser,
      lucideInfo,
      lucideMinus,
      lucidePlus,
      lucideRotateCcw,
      lucideTrash2,
    }),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dice-tray.html',
})
export class DiceTrayPage {
  private readonly roller = inject(DiceRoller);
  private readonly trayHost = viewChild.required<ElementRef<HTMLElement>>('trayHost');

  protected readonly dieTypes = DIE_TYPES;
  protected readonly diceColors = DICE_COLORS;

  protected readonly pool = signal<DicePool>(emptyPool());
  protected readonly modifier = signal(0);
  protected readonly history = signal<RollResult[]>([]);
  protected readonly rolling = signal(false);
  protected readonly diceColor = signal(DEFAULT_DICE_COLOR);
  /** True when the colour is not one of the presets (picked with the custom colour input). */
  protected readonly isCustomColor = computed(
    () => !DICE_COLORS.some((c) => c.value === this.diceColor()),
  );
  protected readonly rollerStatus = this.roller.status;

  protected readonly diceCount = computed(() => poolSize(this.pool()));
  protected readonly formula = computed(() => formatPool(this.pool(), this.modifier()));
  protected readonly canRoll = computed(() => this.diceCount() > 0 && !this.rolling());
  protected readonly latest = computed(() => this.history()[0] ?? null);
  protected readonly previous = computed(() => this.history().slice(1));

  private nextId = 1;

  constructor() {
    this.restore();
    effect(() => this.persist());
    afterNextRender(() => {
      void this.roller.attach(this.trayHost().nativeElement);
    });
  }

  protected setCount(die: DieType, count: number): void {
    this.pool.update((pool) => ({ ...pool, [die]: clampCount(count) }));
  }

  protected adjustCount(die: DieType, delta: number): void {
    this.pool.update((pool) => ({ ...pool, [die]: clampCount(pool[die] + delta) }));
  }

  protected setModifier(value: number | string | null): void {
    const parsed = typeof value === 'number' ? value : Number.parseInt(value ?? '', 10);
    this.modifier.set(Number.isFinite(parsed) ? Math.max(-999, Math.min(999, parsed)) : 0);
  }

  protected onModifierInput(event: Event): void {
    this.setModifier((event.target as HTMLInputElement).value);
  }

  protected nudgeModifier(delta: number): void {
    this.setModifier(this.modifier() + delta);
  }

  protected setDiceColor(value: string): void {
    if (isHexColor(value)) this.diceColor.set(value.toLowerCase());
  }

  protected onCustomColor(event: Event): void {
    this.setDiceColor((event.target as HTMLInputElement).value);
  }

  protected clearSelection(): void {
    this.pool.set(emptyPool());
    this.modifier.set(0);
  }

  protected clearTray(): void {
    this.roller.clear();
  }

  protected clearHistory(): void {
    this.history.set([]);
  }

  protected roll(): void {
    if (!this.canRoll()) return;
    void this.rollWith(this.pool(), this.modifier());
  }

  /** Re-roll a previous result using the same dice, and restore that selection. */
  protected reroll(result: RollResult): void {
    if (this.rolling()) return;
    this.pool.set({ ...result.pool });
    this.modifier.set(result.modifier);
    void this.rollWith(result.pool, result.modifier);
  }

  protected formatResult(result: RollResult): string {
    return formatPool(result.pool, result.modifier);
  }

  protected isMax(die: DieType, value: number): boolean {
    return value === DIE_SIDES[die];
  }

  protected isMin(value: number): boolean {
    return value === 1;
  }

  private async rollWith(pool: DicePool, modifier: number): Promise<void> {
    this.rolling.set(true);
    this.revealTray();
    try {
      const outcome = await this.roller.roll(pool, modifier, this.diceColor());
      const result: RollResult = { id: this.nextId++, timestamp: Date.now(), ...outcome };
      this.history.update((history) => [result, ...history].slice(0, HISTORY_LIMIT));
    } finally {
      this.rolling.set(false);
    }
  }

  /** On narrow screens the tray can be scrolled away while picking dice; bring it back. */
  private revealTray(): void {
    const tray = this.trayHost().nativeElement;
    const rect = tray.getBoundingClientRect?.();
    const viewport = globalThis.innerHeight ?? 0;
    if (rect && viewport && (rect.top < 0 || rect.bottom > viewport)) {
      tray.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    }
  }

  private restore(): void {
    try {
      const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
      if (!raw) return;
      const state = JSON.parse(raw) as Partial<PersistedState>;
      if (state.pool) {
        const pool = emptyPool();
        for (const die of DIE_TYPES) {
          const count = Number(state.pool[die]);
          pool[die] = Number.isFinite(count) ? clampCount(count) : 0;
        }
        this.pool.set(pool);
      }
      if (typeof state.modifier === 'number') this.modifier.set(state.modifier);
      if (isHexColor(state.diceColor)) this.diceColor.set(state.diceColor);
      if (Array.isArray(state.history)) {
        this.history.set(state.history.slice(0, HISTORY_LIMIT));
        this.nextId = Math.max(0, ...state.history.map((r) => r.id)) + 1;
      }
    } catch {
      // Ignore corrupt or unavailable storage; start fresh.
    }
  }

  private persist(): void {
    const state: PersistedState = {
      pool: this.pool(),
      modifier: this.modifier(),
      history: this.history(),
      diceColor: this.diceColor(),
    };
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage may be full or blocked (private mode); the page works without it.
    }
  }
}
