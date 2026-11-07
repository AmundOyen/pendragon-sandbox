import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucidePlus, lucideTrash2, lucideX } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import {
  type CustomTincture,
  isHexColor,
  PALETTE_GROUPS,
  resolveTincture,
  type Tincture,
  type TinctureId,
  type TinctureMap,
  toTincture,
} from '../heraldry/tinctures';

let nextPaletteId = 0;

interface SwatchView {
  tincture: Tincture;
  ground: string;
  spots: string;
}

/**
 * A palette of tinctures: the metals, colours, stains and furs, and the user's own
 * tinctures, which can be added and deleted here.
 */
@Component({
  selector: 'app-tincture-palette',
  imports: [HlmButton, HlmInput, HlmLabel, NgIcon],
  providers: [provideIcons({ lucideCheck, lucidePlus, lucideTrash2, lucideX })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tincture-palette.html',
})
export class TincturePalette {
  readonly tinctures = input.required<TinctureMap>();
  readonly custom = input<readonly CustomTincture[]>([]);
  readonly selected = input<TinctureId | null>(null);
  /** Offer "Own colours" (null), for charges. */
  readonly allowOwnColours = input(false);
  readonly label = input('Tincture');

  readonly pick = output<TinctureId | null>();
  readonly createCustom = output<Omit<CustomTincture, 'id'>>();
  readonly deleteCustom = output<CustomTincture>();

  protected readonly uid = `palette-${++nextPaletteId}`;

  protected readonly groups = computed(() => {
    const map = this.tinctures();
    const groups = PALETTE_GROUPS.map((g) => ({
      label: g.label,
      swatches: g.ids.map((id) => this.swatch(resolveTincture(map, id), map)),
    }));
    const custom = this.custom().map((c) => this.swatch(toTincture(c), map));
    return [...groups, { label: 'Your tinctures', swatches: custom }];
  });

  protected readonly selectedCustom = computed(
    () => this.custom().find((c) => c.id === this.selected()) ?? null,
  );
  protected readonly selectedName = computed(() => {
    const id = this.selected();
    if (id === null) return this.allowOwnColours() ? 'Own colours' : 'None';
    const t = resolveTincture(this.tinctures(), id);
    return `${t.name} — ${t.description}`;
  });

  protected readonly creating = signal(false);
  protected readonly newName = signal('');
  protected readonly newColor = signal('#3a7d44');
  protected readonly newClass = signal<CustomTincture['class']>('colour');
  protected readonly canCreate = computed(
    () => this.newName().trim().length > 0 && isHexColor(this.newColor()),
  );

  protected choose(id: TinctureId | null): void {
    this.pick.emit(id);
  }

  protected startCreating(): void {
    this.newName.set('');
    this.creating.set(true);
  }

  protected submitCustom(event: Event): void {
    event.preventDefault();
    if (!this.canCreate()) return;
    this.createCustom.emit({
      name: this.newName().trim(),
      color: this.newColor().toLowerCase(),
      class: this.newClass(),
    });
    this.creating.set(false);
  }

  protected value(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  private swatch(tincture: Tincture, map: TinctureMap): SwatchView {
    return {
      tincture,
      ground: tincture.fur ? resolveTincture(map, tincture.fur.ground).color : tincture.color,
      spots: tincture.fur ? resolveTincture(map, tincture.fur.spots).color : '',
    };
  }
}
