import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleAlert, lucideCopy, lucideFilePlus, lucideTrash2 } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { CoatOfArmsService } from '../coat-of-arms.service';
import { HeraldicShield } from '../heraldic-shield/heraldic-shield';
import { type CoatOfArms, displayName, duplicateCoat } from '../heraldry/model';
import { type CustomTincture, tinctureMap } from '../heraldry/tinctures';

/** The saved coats of arms. Selecting one opens it in the designer. */
@Component({
  selector: 'app-coat-of-arms-gallery',
  imports: [HlmButton, NgIcon, RouterLink, HeraldicShield],
  providers: [provideIcons({ lucideCircleAlert, lucideCopy, lucideFilePlus, lucideTrash2 })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './coat-of-arms-gallery.html',
})
export class CoatOfArmsGalleryPage {
  private readonly db = inject(CoatOfArmsService);

  protected readonly coats = signal<CoatOfArms[]>([]);
  protected readonly loaded = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly customTinctures = signal<CustomTincture[]>([]);
  protected readonly tinctures = computed(() => tinctureMap(this.customTinctures()));

  constructor() {
    void this.load();
  }

  protected displayName(coat: CoatOfArms): string {
    return displayName(coat);
  }

  protected formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  /** Save a copy of a coat of arms; it appears first, as the newest. */
  protected async duplicate(coat: CoatOfArms): Promise<void> {
    try {
      const copy = await this.db.coats.add(
        duplicateCoat(
          coat,
          this.coats().map((c) => c.name),
        ),
      );
      this.coats.update((list) => [copy, ...list]);
      this.error.set(null);
    } catch {
      this.error.set('The coat of arms could not be duplicated.');
    }
  }

  protected async delete(coat: CoatOfArms): Promise<void> {
    if (!confirm(`Delete ${displayName(coat)} from the gallery?`)) return;
    try {
      await this.db.coats.delete(coat.id);
      this.coats.update((list) => list.filter((c) => c.id !== coat.id));
    } catch {
      this.error.set('The coat of arms could not be deleted.');
    }
  }

  private async load(): Promise<void> {
    try {
      const [coats, tinctures] = await Promise.all([
        this.db.coats.read(),
        this.db.tinctures.read(),
      ]);
      this.coats.set([...coats].sort((a, b) => b.updatedAt - a.updatedAt));
      this.customTinctures.set(tinctures);
    } catch {
      this.error.set(
        'Saved coats of arms are unavailable: this browser does not allow local storage here.',
      );
    } finally {
      this.loaded.set(true);
    }
  }
}
