import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMinus, lucidePlus } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { DIE_SIDES, DieType, MAX_DICE_PER_TYPE } from '../dice';

/** A card for one die type: tap the die to add one, or use the − / + buttons. */
@Component({
  selector: 'app-die-selector',
  imports: [HlmButton, NgIcon],
  providers: [provideIcons({ lucideMinus, lucidePlus })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'flex flex-col items-center gap-1 rounded-lg border px-1 pt-2 pb-1 transition-colors duration-150',
    '[class.border-primary]': 'count() > 0',
    '[class.bg-primary/10]': 'count() > 0',
    '[class.bg-card]': 'count() === 0',
    '[attr.data-die]': 'die()',
  },
  template: `
    <button
      type="button"
      class="die group focus-visible:ring-ring flex w-full flex-col items-center gap-1 rounded-md p-1 outline-none focus-visible:ring-2 disabled:cursor-default"
      [attr.aria-label]="'Add one ' + die()"
      [disabled]="atMax()"
      (click)="increment()"
    >
      <svg
        viewBox="0 0 100 100"
        aria-hidden="true"
        class="fill-primary stroke-foreground size-12 transition-transform duration-150 group-hover:scale-110 group-active:scale-95 group-disabled:scale-100"
        stroke-width="3"
        stroke-linejoin="round"
      >
        @switch (die()) {
          @case ('d4') {
            <polygon points="50,6 96,88 4,88" />
          }
          @case ('d6') {
            <rect x="12" y="12" width="76" height="76" rx="10" />
          }
          @case ('d8') {
            <polygon points="50,4 94,50 50,96 6,50" />
          }
          @case ('d10') {
            <polygon points="50,4 92,38 78,92 22,92 8,38" />
          }
          @case ('d12') {
            <polygon points="50,4 84,18 96,52 78,90 22,90 4,52 16,18" />
          }
          @case ('d20') {
            <polygon points="50,4 90,27 90,73 50,96 10,73 10,27" />
          }
          @default {
            <circle cx="50" cy="50" r="44" />
          }
        }
      </svg>
      <span class="font-display text-base font-semibold">{{ die() }}</span>
    </button>

    <div class="flex items-center">
      <button
        hlmBtn
        variant="ghost"
        size="icon-sm"
        type="button"
        [attr.aria-label]="'Remove one ' + die()"
        [disabled]="count() === 0"
        (click)="decrement()"
      >
        <ng-icon name="lucideMinus" />
      </button>
      <button
        type="button"
        class="count hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring min-w-8 rounded-md px-1 py-1 text-center font-semibold tabular-nums outline-none focus-visible:ring-2"
        [attr.aria-label]="count() + ' ' + die() + ' selected. Click to clear.'"
        [title]="count() > 0 ? 'Clear' : ''"
        (click)="clear()"
      >
        {{ count() }}
      </button>
      <button
        hlmBtn
        variant="ghost"
        size="icon-sm"
        type="button"
        [attr.aria-label]="'Add one ' + die()"
        [disabled]="atMax()"
        (click)="increment()"
      >
        <ng-icon name="lucidePlus" />
      </button>
    </div>
  `,
})
export class DieSelector {
  readonly die = input.required<DieType>();
  readonly count = input.required<number>();
  /** Emits +1 or -1 when the user adds or removes a die. */
  readonly adjust = output<number>();
  /** Emits when the user taps the count to remove every die of this type. */
  readonly cleared = output<void>();

  protected readonly sides = computed(() => DIE_SIDES[this.die()]);
  protected readonly atMax = computed(() => this.count() >= MAX_DICE_PER_TYPE);

  protected increment(): void {
    if (!this.atMax()) this.adjust.emit(1);
  }

  protected decrement(): void {
    if (this.count() > 0) this.adjust.emit(-1);
  }

  protected clear(): void {
    if (this.count() > 0) this.cleared.emit();
  }
}
