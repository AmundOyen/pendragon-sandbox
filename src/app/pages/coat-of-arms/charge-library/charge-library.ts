import { ChangeDetectionStrategy, Component, computed, output, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideSearch } from '@ng-icons/lucide';
import { HlmInput } from '@spartan-ng/helm/input';
import {
  CHARGE_DRAG_TYPE,
  CHARGE_LIBRARY,
  type LibraryCharge,
  libraryChargeUrl,
} from './charge-library.data';

/**
 * The built-in charges as a grid of previews with labels. Drag one onto the shield to place
 * it there, or click it (or press Enter) to add it in the centre.
 */
@Component({
  selector: 'app-charge-library',
  imports: [HlmInput, NgIcon],
  providers: [provideIcons({ lucideSearch })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './charge-library.html',
})
export class ChargeLibrary {
  /** A charge was clicked; the designer adds it in the centre. */
  readonly add = output<LibraryCharge>();

  protected readonly query = signal('');
  protected readonly charges = computed(() => {
    const q = this.query().trim().toLowerCase();
    return CHARGE_LIBRARY.filter((c) => !q || c.name.toLowerCase().includes(q));
  });

  protected url(charge: LibraryCharge): string {
    return libraryChargeUrl(charge);
  }

  protected onDragStart(event: DragEvent, charge: LibraryCharge): void {
    const data = event.dataTransfer;
    if (!data) return;
    data.setData(CHARGE_DRAG_TYPE, charge.file);
    data.setData('text/plain', charge.name);
    data.effectAllowed = 'copy';
  }

  protected onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }
}
