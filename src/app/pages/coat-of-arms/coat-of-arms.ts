import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowDown,
  lucideArrowUp,
  lucideChevronDown,
  lucideCircleAlert,
  lucideDownload,
  lucideFilePlus,
  lucideFlipHorizontal2,
  lucideFlipVertical2,
  lucideImagePlus,
  lucideRotateCcw,
  lucideSave,
  lucideTrash2,
  lucideUpload,
} from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { CalLocalStorage } from '../../core/storage/local-storage.service';
import { compare, guid } from '../../core/utilities';
import { CoatOfArmsService } from './coat-of-arms.service';
import { HeraldicShield } from './heraldic-shield/heraldic-shield';
import { downloadBlob, fileSlug, serializeShield, svgToPng } from './heraldry/export';
import { shape, toPathData } from './heraldry/geometry';
import { decorate, LINES, type LineType } from './heraldry/lines';
import {
  type Charge,
  type CoatDraft,
  type CoatOfArms,
  defaultTinctures,
  displayName,
  newCoat,
  placeCharge,
  type Selection,
  tinctureHints,
} from './heraldry/model';
import {
  CATEGORY_LABELS,
  liesOnField,
  ORDINARIES,
  type OrdinaryCategory,
  ordinaryDef,
  type OrdinaryType,
} from './heraldry/ordinaries';
import { svgDataUrl } from './heraldry/recolour';
import {
  type CustomTincture,
  resolveTincture,
  tinctureMap,
  type TinctureId,
} from './heraldry/tinctures';
import { TincturePalette } from './tincture-palette/tincture-palette';

const ACCEPTED_TYPES = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const OPEN_GROUPS_KEY = '.coat-of-arms.open-groups';
const PREVIEW_TINCTURES = tinctureMap();

/** Line previews: the region below each line of partition. */
const LINE_PREVIEWS = LINES.map((line) => ({
  ...line,
  d: toPathData(
    shape([
      [
        ...decorate(
          [
            [-10, 24],
            [130, 24],
          ],
          line.id,
          [60, 48],
        ),
        [130, 60],
        [-10, 60],
      ],
    ]),
  ),
}));

/** Small shields for the ordinary picker: or with gules. */
const ORDINARY_PREVIEWS = (Object.keys(CATEGORY_LABELS) as OrdinaryCategory[]).map((category) => ({
  category,
  label: CATEGORY_LABELS[category],
  items: ORDINARIES.filter((o) => o.category === category).map((def) => ({
    def,
    coat: {
      ...newCoat(0),
      field: 'or',
      ordinary: {
        type: def.id,
        line: 'straight' as LineType,
        tinctures: defaultTinctures(def.id, 'or', PREVIEW_TINCTURES, ['gules', 'or']),
      },
    } satisfies CoatDraft,
  })),
}));

function clone<T>(value: T): T {
  return structuredClone(value);
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('The file could not be read.'));
    reader.readAsDataURL(file);
  });
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('The file could not be read.'));
    reader.readAsText(file);
  });
}

function imageAspect(src: string): Promise<number> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () =>
      resolve(
        image.naturalWidth && image.naturalHeight ? image.naturalWidth / image.naturalHeight : 1,
      );
    image.onerror = () => resolve(1);
    image.src = src;
  });
}

/** Aspect ratio from an SVG's viewBox or width/height, if it has them. */
function svgAspect(root: Element): number | null {
  const vb = root
    .getAttribute('viewBox')
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  if (vb && vb.length === 4 && vb[2] > 0 && vb[3] > 0) return vb[2] / vb[3];
  const w = parseFloat(root.getAttribute('width') ?? '');
  const h = parseFloat(root.getAttribute('height') ?? '');
  return w > 0 && h > 0 ? w / h : null;
}

function isSvgFile(file: File): boolean {
  return file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
}

function chargeName(file: File): string {
  const base = file.name
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim();
  return base ? base[0].toUpperCase() + base.slice(1) : 'Charge';
}

/**
 * Coat of Arms designer: pick a field, an ordinary (with a line of partition), tincture
 * each part, add charges from image files, and save the result to a gallery or export it.
 */
@Component({
  selector: 'app-coat-of-arms',
  imports: [HlmButton, HlmCardImports, HlmInput, HlmLabel, NgIcon, HeraldicShield, TincturePalette],
  providers: [
    provideIcons({
      lucideArrowDown,
      lucideArrowUp,
      lucideChevronDown,
      lucideCircleAlert,
      lucideDownload,
      lucideFilePlus,
      lucideFlipHorizontal2,
      lucideFlipVertical2,
      lucideImagePlus,
      lucideRotateCcw,
      lucideSave,
      lucideTrash2,
      lucideUpload,
    }),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './coat-of-arms.html',
})
export class CoatOfArmsPage {
  private readonly db = inject(CoatOfArmsService);
  private readonly localStorage = inject(CalLocalStorage);
  private readonly editor = viewChild.required<HeraldicShield>('editor');
  private readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  protected readonly ordinaryGroups = ORDINARY_PREVIEWS;
  protected readonly lines = LINE_PREVIEWS;
  /** Ordinary groups that are expanded; remembered in this browser. */
  protected readonly openGroups = signal<ReadonlySet<OrdinaryCategory>>(this.restoreOpenGroups());
  protected readonly acceptedTypes = ACCEPTED_TYPES.join(',') + ',.svg';

  protected readonly coat = signal<CoatDraft>(newCoat());
  /** The coat as last saved or opened, to tell whether there are unsaved changes. */
  private readonly snapshot = signal<CoatDraft>(clone(this.coat()));
  protected readonly selection = signal<Selection>({ kind: 'field' });

  protected readonly gallery = signal<CoatOfArms[]>([]);
  protected readonly galleryLoaded = signal(false);
  protected readonly customTinctures = signal<CustomTincture[]>([]);
  protected readonly tinctures = computed(() => tinctureMap(this.customTinctures()));

  protected readonly saving = signal(false);
  protected readonly exporting = signal(false);
  protected readonly dropping = signal(false);
  protected readonly message = signal<{ kind: 'error' | 'info'; text: string } | null>(null);

  protected readonly dirty = computed(() => !compare(this.coat(), this.snapshot()));
  protected readonly isSaved = computed(() => !!this.coat().id);
  protected readonly title = computed(() => displayName(this.coat()));

  protected readonly ordinary = computed(() => {
    const layer = this.coat().ordinary;
    const def = layer ? ordinaryDef(layer.type) : undefined;
    return layer && def ? { layer, def } : null;
  });

  protected readonly parts = computed(() => {
    const o = this.ordinary();
    if (!o) return [];
    const map = this.tinctures();
    return o.def.partNames.map((name, index) => {
      const id = o.layer.tinctures[index] ?? null;
      return { index, name, id, tincture: id ? resolveTincture(map, id) : null };
    });
  });

  protected readonly selectedCharge = computed(() => {
    const s = this.selection();
    return s.kind === 'charge' ? (this.coat().charges.find((c) => c.id === s.id) ?? null) : null;
  });

  /** What the tincture panel is editing. */
  protected readonly target = computed(() => {
    const s = this.selection();
    const coat = this.coat();
    if (s.kind === 'part') {
      const part = this.parts()[s.index];
      if (part) {
        return {
          kind: 'part' as const,
          title: part.name,
          hint: 'Pick a tincture for this part, or delete it to show the field.',
          tincture: part.id,
          deleted: part.id === null,
          index: s.index,
        };
      }
    }
    if (s.kind === 'charge') {
      const charge = this.selectedCharge();
      if (charge) {
        return {
          kind: 'charge' as const,
          title: charge.name,
          hint:
            charge.kind === 'svg'
              ? 'Pick a tincture for the charge, or keep its own colours. Drag it to move it; use the handles to resize or rotate it.'
              : 'Images keep their own colours; use an SVG file to recolour a charge. Drag it to move it; use the handles to resize or rotate it.',
          tincture: charge.tincture,
          charge,
        };
      }
    }
    const division = this.ordinary() && !liesOnField(this.ordinary()!.def);
    return {
      kind: 'field' as const,
      title: 'Field',
      hint: division
        ? 'The divided field covers this; it shows wherever you delete a part.'
        : 'The background of the shield. Click any part of the shield to tincture it.',
      tincture: coat.field,
    };
  });

  protected readonly hints = computed(() => tinctureHints(this.coat(), this.tinctures()));

  constructor() {
    void this.load();
  }

  // --- Field and ordinary --------------------------------------------------------------

  protected select(selection: Selection): void {
    this.selection.set(selection);
  }

  protected pickTincture(id: TinctureId | null): void {
    const target = this.target();
    switch (target.kind) {
      case 'field':
        if (id) this.coat.update((c) => ({ ...c, field: id }));
        break;
      case 'part':
        if (id) this.setPartTincture(target.index, id);
        break;
      case 'charge':
        if (target.charge.kind === 'svg') this.updateCharge({ ...target.charge, tincture: id });
        break;
    }
  }

  protected chooseOrdinary(type: OrdinaryType | null): void {
    if (!type) {
      this.coat.update((c) => ({ ...c, ordinary: null }));
      this.selection.set({ kind: 'field' });
      return;
    }
    const def = ordinaryDef(type);
    if (!def) return;
    this.coat.update((c) => ({
      ...c,
      ordinary: {
        type,
        line: def.lines ? (c.ordinary?.line ?? 'straight') : 'straight',
        tinctures: defaultTinctures(type, c.field, this.tinctures(), c.ordinary?.tinctures),
      },
    }));
    this.selection.set({ kind: 'part', index: 0 });
  }

  protected setLine(line: LineType): void {
    this.coat.update((c) => (c.ordinary ? { ...c, ordinary: { ...c.ordinary, line } } : c));
  }

  private setPartTincture(index: number, id: TinctureId | null): void {
    this.coat.update((c) => {
      if (!c.ordinary) return c;
      const tinctures = [...c.ordinary.tinctures];
      tinctures[index] = id;
      return { ...c, ordinary: { ...c.ordinary, tinctures } };
    });
  }

  protected deletePart(index: number): void {
    this.setPartTincture(index, null);
  }

  protected restorePart(index: number): void {
    const c = this.coat();
    if (!c.ordinary) return;
    const defaults = defaultTinctures(c.ordinary.type, c.field, this.tinctures());
    this.setPartTincture(index, defaults[index] ?? c.field);
    this.selection.set({ kind: 'part', index });
  }

  // --- Charges -------------------------------------------------------------------------

  protected openFilePicker(): void {
    this.fileInput().nativeElement.click();
  }

  protected onFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    void this.addFiles(Array.from(input.files ?? []));
    input.value = '';
  }

  protected onDragOver(event: DragEvent): void {
    if (!event.dataTransfer?.types.includes('Files')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    this.dropping.set(true);
  }

  protected onDragLeave(event: DragEvent): void {
    const stage = event.currentTarget as HTMLElement;
    if (!event.relatedTarget || !stage.contains(event.relatedTarget as Node))
      this.dropping.set(false);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dropping.set(false);
    void this.addFiles(Array.from(event.dataTransfer?.files ?? []));
  }

  async addFiles(files: File[]): Promise<void> {
    const rejected: string[] = [];
    let last: Charge | null = null;
    for (const file of files) {
      try {
        const charge = await this.readCharge(file);
        if (!charge) {
          rejected.push(file.name);
          continue;
        }
        this.coat.update((c) => ({ ...c, charges: [...c.charges, charge] }));
        last = charge;
      } catch {
        rejected.push(file.name);
      }
    }
    if (last) this.selection.set({ kind: 'charge', id: last.id });
    this.message.set(
      rejected.length
        ? {
            kind: 'error',
            text: `Could not add ${rejected.join(', ')}. Use SVG, PNG, JPEG, WebP or GIF images up to 5 MB.`,
          }
        : null,
    );
  }

  private async readCharge(file: File): Promise<Charge | null> {
    if (file.size > MAX_FILE_BYTES) return null;
    const base = { id: guid(), name: chargeName(file), tincture: null };
    if (isSvgFile(file)) {
      const svg = await readAsText(file);
      const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
      const root = doc.documentElement;
      if (root?.localName !== 'svg' || doc.getElementsByTagName('parsererror').length) return null;
      const src = svgDataUrl(svg);
      const aspect = svgAspect(root) ?? (await imageAspect(src));
      return { ...base, kind: 'svg', src, svg, ...placeCharge(aspect) };
    }
    if (!ACCEPTED_TYPES.includes(file.type)) return null;
    const src = await readAsDataUrl(file);
    return { ...base, kind: 'raster', src, ...placeCharge(await imageAspect(src)) };
  }

  protected updateCharge(charge: Charge): void {
    this.coat.update((c) => ({
      ...c,
      charges: c.charges.map((x) => (x.id === charge.id ? charge : x)),
    }));
  }

  protected deleteCharge(id: string): void {
    this.coat.update((c) => ({ ...c, charges: c.charges.filter((x) => x.id !== id) }));
    this.selection.set({ kind: 'field' });
  }

  /** Move a charge up (+1, drawn later) or down (-1) the stack. */
  protected moveChargeLayer(id: string, delta: 1 | -1): void {
    this.coat.update((c) => {
      const charges = [...c.charges];
      const i = charges.findIndex((x) => x.id === id);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= charges.length) return c;
      [charges[i], charges[j]] = [charges[j], charges[i]];
      return { ...c, charges };
    });
  }

  protected flipCharge(charge: Charge, axis: 'x' | 'y'): void {
    this.updateCharge(
      axis === 'x' ? { ...charge, flipX: !charge.flipX } : { ...charge, flipY: !charge.flipY },
    );
  }

  protected resetChargeTransform(charge: Charge): void {
    this.updateCharge({ ...charge, ...placeCharge(charge.width / charge.height) });
  }

  protected isFirst(charge: Charge): boolean {
    return this.coat().charges[0]?.id === charge.id;
  }

  protected isLast(charge: Charge): boolean {
    return this.coat().charges.at(-1)?.id === charge.id;
  }

  protected onStageKeydown(event: KeyboardEvent): void {
    const charge = this.selectedCharge();
    if (!charge) return;
    const step = event.shiftKey ? 10 : 2;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      this.deleteCharge(charge.id);
    } else if (moves[event.key]) {
      event.preventDefault();
      const [dx, dy] = moves[event.key];
      this.updateCharge({ ...charge, x: charge.x + dx, y: charge.y + dy });
    } else if (event.key === 'Escape') {
      this.selection.set({ kind: 'field' });
    }
  }

  // --- Collapsible ordinary groups ----------------------------------------------------

  protected isGroupOpen(category: OrdinaryCategory): boolean {
    return this.openGroups().has(category);
  }

  protected onGroupToggle(category: OrdinaryCategory, event: Event): void {
    const open = (event.target as HTMLDetailsElement).open;
    if (open === this.isGroupOpen(category)) return;
    this.openGroups.update((groups) => {
      const next = new Set(groups);
      if (open) next.add(category);
      else next.delete(category);
      return next;
    });
    try {
      this.localStorage.set(OPEN_GROUPS_KEY, [...this.openGroups()]);
    } catch {
      // Storage can be unavailable (private mode); the groups just won't be remembered.
    }
  }

  private restoreOpenGroups(): Set<OrdinaryCategory> {
    try {
      const saved = this.localStorage.get<OrdinaryCategory[]>(OPEN_GROUPS_KEY);
      if (Array.isArray(saved)) return new Set(saved.filter((c) => c in CATEGORY_LABELS));
    } catch {
      // Fall back to the default below.
    }
    return new Set<OrdinaryCategory>(['honourable']);
  }

  // --- Name, save, gallery -------------------------------------------------------------

  protected setName(event: Event): void {
    const name = (event.target as HTMLInputElement).value;
    this.coat.update((c) => ({ ...c, name }));
  }

  async save(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const now = Date.now();
      const draft: CoatDraft = { ...this.coat(), name: this.coat().name.trim(), updatedAt: now };
      const saved = draft.id
        ? await this.db.coats.update(draft as CoatOfArms)
        : await this.db.coats.add({ ...draft, createdAt: now });
      this.coat.set(clone(saved));
      this.snapshot.set(clone(saved));
      await this.refreshGallery();
      this.message.set({ kind: 'info', text: `Saved ${displayName(saved)}.` });
    } catch {
      this.message.set({
        kind: 'error',
        text: 'The coat of arms could not be saved in this browser.',
      });
    } finally {
      this.saving.set(false);
    }
  }

  protected startNew(): void {
    if (this.dirty() && !confirm('Discard your unsaved changes and start a new coat of arms?'))
      return;
    const fresh = newCoat();
    this.coat.set(fresh);
    this.snapshot.set(clone(fresh));
    this.selection.set({ kind: 'field' });
    this.message.set(null);
  }

  protected open(saved: CoatOfArms): void {
    if (saved.id === this.coat().id && !this.dirty()) return;
    if (this.dirty() && !confirm(`Discard your unsaved changes and open ${displayName(saved)}?`))
      return;
    this.coat.set(clone(saved));
    this.snapshot.set(clone(saved));
    this.selection.set({ kind: 'field' });
    this.message.set(null);
    globalThis.scrollTo?.({ top: 0, behavior: 'smooth' });
  }

  protected async deleteSaved(saved: CoatOfArms): Promise<void> {
    if (!confirm(`Delete ${displayName(saved)} from the gallery?`)) return;
    try {
      await this.db.coats.delete(saved.id);
      if (this.coat().id === saved.id) {
        // Keep it on the designer, as an unsaved coat.
        this.coat.update(({ id: _id, ...rest }) => rest);
        this.snapshot.set(newCoat());
      }
      await this.refreshGallery();
    } catch {
      this.message.set({ kind: 'error', text: 'The coat of arms could not be deleted.' });
    }
  }

  protected displayName(coat: Pick<CoatDraft, 'name'>): string {
    return displayName(coat);
  }

  protected formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  // --- Custom tinctures ----------------------------------------------------------------

  async createTincture(tincture: Omit<CustomTincture, 'id'>): Promise<void> {
    try {
      const created = await this.db.tinctures.add(tincture);
      this.customTinctures.update((list) => [...list, created]);
      this.pickTincture(created.id);
    } catch {
      this.message.set({ kind: 'error', text: 'The tincture could not be saved.' });
    }
  }

  protected async deleteTincture(tincture: CustomTincture): Promise<void> {
    if (
      !confirm(`Delete the tincture ${tincture.name}? Coats of arms using it will show it in grey.`)
    )
      return;
    try {
      await this.db.tinctures.delete(tincture.id);
      this.customTinctures.update((list) => list.filter((t) => t.id !== tincture.id));
    } catch {
      this.message.set({ kind: 'error', text: 'The tincture could not be deleted.' });
    }
  }

  // --- Export --------------------------------------------------------------------------

  protected exportSvg(): void {
    const markup = serializeShield(this.editor().svgElement);
    downloadBlob(new Blob([markup], { type: 'image/svg+xml' }), `${fileSlug(this.title())}.svg`);
  }

  protected async exportPng(): Promise<void> {
    if (this.exporting()) return;
    this.exporting.set(true);
    try {
      const png = await svgToPng(serializeShield(this.editor().svgElement));
      downloadBlob(png, `${fileSlug(this.title())}.png`);
    } catch (error) {
      this.message.set({
        kind: 'error',
        text: error instanceof Error ? error.message : 'The PNG could not be created.',
      });
    } finally {
      this.exporting.set(false);
    }
  }

  // --- Loading -------------------------------------------------------------------------

  private async load(): Promise<void> {
    try {
      const [, tinctures] = await Promise.all([this.refreshGallery(), this.db.tinctures.read()]);
      this.customTinctures.set(tinctures);
    } catch {
      this.message.set({
        kind: 'error',
        text: 'Saved coats of arms are unavailable: this browser does not allow local storage here.',
      });
    } finally {
      this.galleryLoaded.set(true);
    }
  }

  private async refreshGallery(): Promise<void> {
    const coats = await this.db.coats.read();
    this.gallery.set([...coats].sort((a, b) => b.updatedAt - a.updatedAt));
  }
}
