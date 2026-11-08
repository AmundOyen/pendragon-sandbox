import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import { SHIELD_PATH, toPathData, VIEW_HEIGHT, VIEW_WIDTH, type Pt } from '../heraldry/geometry';
import type { Charge, CoatDraft, Selection } from '../heraldry/model';
import { ordinaryDef, ordinaryParts } from '../heraldry/ordinaries';
import { recolouredCharge } from '../heraldry/recolour';
import {
  resolveTincture,
  type Tincture,
  type TinctureId,
  type TinctureMap,
} from '../heraldry/tinctures';

let nextShieldId = 0;

const MIN_CHARGE_SIZE = 12;
const MAX_CHARGE_SIZE = 700;
/** Distance of the rotate handle above a charge, in shield units. */
export const ROTATE_HANDLE_OFFSET = 30;

type DragMode = 'move' | 'resize' | 'rotate';

interface DragState {
  mode: DragMode;
  pointerId: number;
  start: Pt;
  charge: Charge;
}

interface PartView {
  index: number;
  name: string;
  d: string;
  fillRule: 'nonzero' | 'evenodd';
  tincture: TinctureId | null;
}

interface ChargeView {
  charge: Charge;
  href: string;
  /** Position and rotation; the selection outline and handles use this. */
  transform: string;
  /** The transform plus any flip, for the image itself. */
  imageTransform: string;
}

interface FurView {
  id: TinctureId;
  width: number;
  height: number;
  ground: string;
  spots: string;
  paths: readonly string[];
}

/**
 * Renders a coat of arms on the shield. When `editable`, clicking the field or a part of the
 * ordinary selects it, and a selected charge can be dragged, resized and rotated with handles.
 */
@Component({
  selector: 'app-heraldic-shield',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './heraldic-shield.html',
  host: { class: 'block' },
})
export class HeraldicShield {
  readonly coat = input.required<CoatDraft>();
  readonly tinctures = input.required<TinctureMap>();
  readonly editable = input(false);
  readonly selection = input<Selection | null>(null);
  readonly label = input('Coat of arms');

  /** The user clicked the field, a part of the ordinary or a charge. */
  readonly selectTarget = output<Selection>();
  /** A charge was moved, resized or rotated. */
  readonly chargeChange = output<Charge>();

  protected readonly uid = `coa-${++nextShieldId}`;
  protected readonly viewBox = `0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`;
  protected readonly shieldPath = SHIELD_PATH;
  protected readonly rotateOffset = ROTATE_HANDLE_OFFSET;

  private readonly svgRef = viewChild.required<ElementRef<SVGSVGElement>>('svg');
  private drag: DragState | null = null;
  /** Set when a drag ends, so the click the browser sends after it is ignored. */
  private dragJustEnded = false;

  /** The rendered `<svg>`, e.g. for export. */
  get svgElement(): SVGSVGElement {
    return this.svgRef().nativeElement;
  }

  protected readonly parts = computed<PartView[]>(() => {
    const ordinary = this.coat().ordinary;
    if (!ordinary) return [];
    const def = ordinaryDef(ordinary.type);
    return ordinaryParts(ordinary.type, ordinary.line).map((s, index) => ({
      index,
      name: def?.partNames[index] ?? '',
      d: toPathData(s),
      fillRule: s.fillRule,
      tincture: ordinary.tinctures[index] ?? null,
    }));
  });

  protected readonly visibleParts = computed(() => this.parts().filter((p) => p.tincture));

  /** Fur patterns used by the field or the ordinary (charges carry their own). */
  protected readonly furs = computed<FurView[]>(() => {
    const map = this.tinctures();
    const ids = new Set([this.coat().field, ...this.parts().map((p) => p.tincture)]);
    const furs: FurView[] = [];
    for (const id of ids) {
      const t = id ? map.get(id) : undefined;
      if (!t?.fur) continue;
      furs.push({
        id: t.id,
        width: t.fur.width,
        height: t.fur.height,
        ground: resolveTincture(map, t.fur.ground).color,
        spots: resolveTincture(map, t.fur.spots).color,
        paths: t.fur.paths,
      });
    }
    return furs;
  });

  protected readonly charges = computed<ChargeView[]>(() => {
    const map = this.tinctures();
    return this.coat().charges.map((charge) => {
      const transform = `translate(${charge.x} ${charge.y}) rotate(${charge.rotation})`;
      const flipped = charge.flipX || charge.flipY;
      return {
        charge,
        href: this.chargeHref(charge, map),
        transform,
        imageTransform: flipped
          ? `${transform} scale(${charge.flipX ? -1 : 1} ${charge.flipY ? -1 : 1})`
          : transform,
      };
    });
  });

  protected readonly selectedPart = computed(() => {
    const s = this.selection();
    return s?.kind === 'part'
      ? (this.visibleParts().find((p) => p.index === s.index) ?? null)
      : null;
  });

  protected readonly fieldSelected = computed(() => this.selection()?.kind === 'field');

  protected readonly selectedCharge = computed(() => {
    const s = this.selection();
    return s?.kind === 'charge' ? (this.charges().find((c) => c.charge.id === s.id) ?? null) : null;
  });

  protected fill(id: TinctureId | null): string {
    const t: Tincture = resolveTincture(this.tinctures(), id);
    return t.fur ? `url(#${this.uid}-fur-${t.id})` : t.color;
  }

  protected corners(charge: Charge): Pt[] {
    const w = charge.width / 2;
    const h = charge.height / 2;
    return [
      [-w, -h],
      [w, -h],
      [w, h],
      [-w, h],
    ];
  }

  protected pick(selection: Selection): void {
    if (this.editable()) this.selectTarget.emit(selection);
  }

  protected onChargePointerDown(event: PointerEvent, charge: Charge): void {
    if (!this.editable()) return;
    event.preventDefault();
    event.stopPropagation();
    this.selectTarget.emit({ kind: 'charge', id: charge.id });
    this.startDrag(event, 'move', charge);
  }

  protected onHandlePointerDown(event: PointerEvent, mode: DragMode, charge: Charge): void {
    if (!this.editable()) return;
    event.preventDefault();
    event.stopPropagation();
    this.startDrag(event, mode, charge);
  }

  protected onPointerMove(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    const p = this.toShield(event);
    if (!p) return;
    const c = drag.charge;
    switch (drag.mode) {
      case 'move': {
        const x = clamp(c.x + p[0] - drag.start[0], 0, VIEW_WIDTH);
        const y = clamp(c.y + p[1] - drag.start[1], 0, VIEW_HEIGHT);
        this.chargeChange.emit({ ...c, x: round(x), y: round(y) });
        break;
      }
      case 'resize': {
        const before = Math.hypot(drag.start[0] - c.x, drag.start[1] - c.y) || 1;
        const after = Math.hypot(p[0] - c.x, p[1] - c.y);
        const aspect = c.width / c.height;
        let width = c.width * (after / before);
        width = clamp(width, MIN_CHARGE_SIZE * Math.max(1, aspect), MAX_CHARGE_SIZE);
        this.chargeChange.emit({ ...c, width: round(width), height: round(width / aspect) });
        break;
      }
      case 'rotate': {
        let angle = (Math.atan2(p[1] - c.y, p[0] - c.x) * 180) / Math.PI + 90;
        if (event.shiftKey) angle = Math.round(angle / 15) * 15;
        angle = ((((angle + 180) % 360) + 360) % 360) - 180;
        this.chargeChange.emit({ ...c, rotation: round(angle) });
        break;
      }
    }
  }

  protected onPointerUp(event: PointerEvent): void {
    if (!this.drag || event.pointerId !== this.drag.pointerId) return;
    this.drag = null;
    const svg = this.svgElement;
    if (svg.hasPointerCapture?.(event.pointerId)) svg.releasePointerCapture(event.pointerId);
    // The pointer was captured by the <svg>, so the click that follows lands on it and would
    // read as a click outside the shield. Swallow it; clear the flag if no click comes.
    this.dragJustEnded = true;
    setTimeout(() => (this.dragJustEnded = false));
  }

  protected onClick(event: MouseEvent): void {
    if (this.dragJustEnded) {
      this.dragJustEnded = false;
      event.stopPropagation();
    }
  }

  private startDrag(event: PointerEvent, mode: DragMode, charge: Charge): void {
    const start = this.toShield(event);
    if (!start) return;
    this.drag = { mode, pointerId: event.pointerId, start, charge: { ...charge } };
    this.svgElement.setPointerCapture?.(event.pointerId);
  }

  /** Pointer position in shield units. */
  private toShield(event: PointerEvent): Pt | null {
    return this.clientToShield(event.clientX, event.clientY);
  }

  /** A point on the screen (e.g. where something was dropped) in shield units. */
  clientToShield(clientX: number, clientY: number): Pt | null {
    const svg = this.svgElement;
    const matrix = svg.getScreenCTM?.();
    if (!matrix) return null;
    const p = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
    return [p.x, p.y];
  }

  private chargeHref(charge: Charge, map: TinctureMap): string {
    if (charge.kind === 'svg' && charge.tincture && charge.svg) {
      return (
        recolouredCharge(charge.id, charge.svg, resolveTincture(map, charge.tincture), map) ??
        charge.src
      );
    }
    return charge.src;
  }
}

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));
const round = (v: number): number => Math.round(v * 10) / 10;
