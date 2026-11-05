import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
import {
  angleToDay,
  angleToHour,
  dayToAngle,
  formatDayOfYear,
  formatHour,
  holyDayAtAngle,
  hourToAngle,
  mod,
  QUARTER_HALF_WIDTH_HOURS,
  SEASON_HALF_WIDTH_DEGREES,
} from '../samhladh-timing';
import { HOLY_DAYS, holyDay, type Samhladh } from '../samhladh.data';

type Arm = 'day' | 'hour';

/** Radius of the wheel in SVG units (viewBox is −500…500). */
const R = 360;
/** Arms snap to a marked point when released within this many degrees of it. */
const SNAP_DEGREES = 7;
const SNAP_POINTS = [0, 45, 90, 135, 180, 225, 270, 315];

const HOUR_NAMES = Array.from({ length: 24 }, (_, h) =>
  h === 0 ? 'Midnight' : h === 12 ? 'Noon' : `${h % 12}${h < 12 ? 'am' : 'pm'}`,
);

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * Label positions in units of the wheel radius (x right, y down) and which edge is anchored
 * ('l' left, 'r' right, 'c' centre). Hand-placed after the printed wheel so the names sit in
 * their Day's sector without overlapping.
 */
const LABEL_LAYOUT: Record<string, [number, number, 'l' | 'r' | 'c']> = {
  // Winter Solstice: either side of the North spoke
  reindeer: [-0.05, -0.8, 'r'],
  goose: [-0.05, -0.69, 'r'],
  raven: [-0.05, -0.58, 'r'],
  salmon: [0.05, -0.85, 'l'],
  badger: [0.05, -0.74, 'l'],
  wolf: [0.05, -0.63, 'l'],
  crow: [0.05, -0.52, 'l'],
  // Imbolc
  blackbird: [0.56, -0.66, 'c'],
  // Spring Equinox: above and below the East spoke
  dog: [0.8, -0.19, 'c'],
  ram: [0.78, -0.08, 'c'],
  hare: [0.78, 0.08, 'c'],
  // Beltaine
  hawk: [0.72, 0.46, 'c'],
  seal: [0.5, 0.6, 'c'],
  // Summer Solstice: right of the South spoke
  bull: [0.05, 0.66, 'l'],
  'golden-eagle': [0.05, 0.77, 'l'],
  // Lugnasadh
  bear: [-0.64, 0.46, 'c'],
  // Autumn Equinox: above and below the West spoke
  osprey: [-0.8, -0.08, 'c'],
  otter: [-0.8, 0.08, 'c'],
  // Samhain: below the North-West spoke
  stag: [-0.72, -0.47, 'c'],
  sow: [-0.72, -0.36, 'c'],
  boar: [-0.72, -0.25, 'c'],
  horse: [-0.47, -0.22, 'c'],
  'wild-cat': [-0.47, -0.11, 'c'],
};

interface Placed {
  /** Percent of the wheel box. */
  left: number;
  top: number;
  transform: string;
}

/** Point on the wheel for an angle (clockwise from North) and radius, in SVG units. */
function polar(angle: number, r: number): { x: number; y: number } {
  const rad = (angle * Math.PI) / 180;
  return { x: Math.sin(rad) * r, y: -Math.cos(rad) * r };
}

/** Position an HTML label so it hangs off a point away from the wheel's centre line. */
function place(x: number, y: number, dirX: number, dirY: number): Placed {
  const tx = dirX > 0.35 ? '0%' : dirX < -0.35 ? '-100%' : '-50%';
  const ty = dirY > 0.35 ? '0%' : dirY < -0.35 ? '-100%' : '-50%';
  return { left: (x + 500) / 10, top: (y + 500) / 10, transform: `translate(${tx}, ${ty})` };
}

function annularSector(a0: number, a1: number, r0: number, r1: number): string {
  const span = mod(a1 - a0, 360) || 360;
  const large = span > 180 ? 1 : 0;
  const p0 = polar(a0, r1);
  const p1 = polar(a0 + span, r1);
  const p2 = polar(a0 + span, r0);
  const p3 = polar(a0, r0);
  return [
    `M ${p0.x} ${p0.y}`,
    `A ${r1} ${r1} 0 ${large} 1 ${p1.x} ${p1.y}`,
    `L ${p2.x} ${p2.y}`,
    `A ${r0} ${r0} 0 ${large} 0 ${p3.x} ${p3.y}`,
    'Z',
  ].join(' ');
}

/**
 * The wheel of time from the Heathen calendar: one turn is a year for the Day arm and a day for
 * the Hour arm. Both arms move freely and snap to the eight marked points when close.
 */
@Component({
  selector: 'app-time-wheel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './time-wheel.html',
  host: { class: 'block' },
})
export class TimeWheel {
  public readonly spirits = input.required<readonly Samhladh[]>();
  /** Wheel angle of the Day arm, degrees clockwise from North. */
  public readonly dayAngle = model.required<number>();
  /** Wheel angle of the Hour arm, degrees clockwise from North. */
  public readonly hourAngle = model.required<number>();
  public readonly selectedId = model<string | null>(null);

  private readonly _svg = viewChild.required<ElementRef<SVGSVGElement>>('arms');
  protected readonly dragging = signal<Arm | null>(null);
  protected readonly focused = signal<Arm | null>(null);

  protected readonly R = R;
  protected readonly ticks = Array.from({ length: 24 }, (_, h) => {
    const major = h % 3 === 0;
    const a = polar(h * 15, R);
    const b = polar(h * 15, R - (major ? 22 : 12));
    return { x1: a.x, y1: a.y, x2: b.x, y2: b.y, major };
  });
  protected readonly spokes = HOLY_DAYS.map((h) => {
    const p = polar(h.angle, R);
    return { id: h.id, x: p.x, y: p.y };
  });

  /** Unmarked hours; the eight marked hours are shown with their holy day. */
  protected readonly hourLabels = HOUR_NAMES.flatMap((label, hour) => {
    if (hour % 3 === 0) return [];
    const angle = hourToAngle(hour);
    const p = polar(angle, R + 22);
    const d = polar(angle, 1);
    return [{ hour, label, ...place(p.x, p.y, d.x, d.y) }];
  });

  protected readonly holyLabels = HOLY_DAYS.map((h) => {
    const p = polar(h.angle, R + 104);
    return {
      ...h,
      date: `${MONTH_NAMES[h.month - 1]}. ${h.day}`,
      hourLabel: HOUR_NAMES[h.hour],
      left: (p.x + 500) / 10,
      top: (p.y + 500) / 10,
    };
  });

  /** Spirit labels placed in their Day's sector, following the printed Heathen calendar. */
  protected readonly spiritLabels = computed(() =>
    this.spirits().flatMap((spirit) => {
      const spot = LABEL_LAYOUT[spirit.id];
      if (!spot) return [];
      const [x, y, anchor] = spot;
      const tx = anchor === 'l' ? '0%' : anchor === 'r' ? '-100%' : '-50%';
      return [
        {
          spirit,
          left: (x * R + 500) / 10,
          top: (y * R + 500) / 10,
          transform: `translate(${tx}, -50%)`,
        },
      ];
    }),
  );

  /** The same spirits grouped by holy day, for screens too narrow for labels on the wheel. */
  protected readonly spiritGroups = computed(() =>
    HOLY_DAYS.map((day) => ({
      day,
      spirits: this.spirits().filter((s) => s.day === day.id),
    })).filter((g) => g.spirits.length),
  );

  protected readonly dayArm = computed(() => this.arm(this.dayAngle(), R * 0.6));
  protected readonly hourArm = computed(() => this.arm(this.hourAngle(), R - 34));

  protected readonly dayText = computed(() => {
    const holy = holyDayAtAngle(this.dayAngle());
    const date = formatDayOfYear(angleToDay(this.dayAngle()));
    return holy ? `${date}, ${holy.name}` : date;
  });
  protected readonly hourText = computed(() => formatHour(angleToHour(this.hourAngle())));
  protected readonly dayValue = computed(() => Math.round(angleToDay(this.dayAngle())));
  protected readonly hourValue = computed(
    () => Math.round(angleToHour(this.hourAngle()) * 100) / 100,
  );

  /** Highlight bands for the selected spirit's Season and Quarter, and their opposites. */
  protected readonly bands = computed(() => {
    const spirit = this.spirits().find((s) => s.id === this.selectedId());
    if (!spirit) return null;
    const day = holyDay(spirit.day);
    const season = (center: number) =>
      annularSector(
        center - SEASON_HALF_WIDTH_DEGREES,
        center + SEASON_HALF_WIDTH_DEGREES,
        R - 46,
        R - 26,
      );
    const quarter = (hour: number) =>
      annularSector(
        hourToAngle(hour - QUARTER_HALF_WIDTH_HOURS),
        hourToAngle(hour + QUARTER_HALF_WIDTH_HOURS),
        R + 2,
        R + 14,
      );
    const spoke = polar(day.angle, R);
    return {
      season: season(day.angle),
      oppositeSeason: season(day.angle + 180),
      quarter: quarter(day.hour),
      oppositeQuarter: quarter(day.hour + 12),
      spoke,
      oppositeSpoke: { x: -spoke.x, y: -spoke.y },
    };
  });

  protected onPointerDown(event: PointerEvent, arm: Arm): void {
    event.preventDefault();
    (event.target as Element).setPointerCapture(event.pointerId);
    this.dragging.set(arm);
  }

  protected onPointerMove(event: PointerEvent): void {
    const arm = this.dragging();
    if (!arm) return;
    const rect = this._svg().nativeElement.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    if (dx === 0 && dy === 0) return;
    const angle = mod((Math.atan2(dx, -dy) * 180) / Math.PI, 360);
    this.setAngle(arm, this.snap(angle));
  }

  protected onPointerUp(): void {
    this.dragging.set(null);
  }

  protected onKeydown(event: KeyboardEvent, arm: Arm): void {
    const current = arm === 'day' ? this.dayAngle() : this.hourAngle();
    const step = (dir: 1 | -1) =>
      arm === 'day'
        ? dayToAngle(Math.round(angleToDay(current)) + dir)
        : hourToAngle(Math.round(angleToHour(current) * 4) / 4 + dir * 0.25);
    const jump = (dir: 1 | -1) => {
      const k =
        dir === 1 ? Math.floor(current / 45 + 1e-6) + 1 : Math.ceil(current / 45 - 1e-6) - 1;
      return mod(k * 45, 360);
    };
    let next: number | null = null;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        next = step(1);
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        next = step(-1);
        break;
      case 'PageUp':
        next = jump(1);
        break;
      case 'PageDown':
        next = jump(-1);
        break;
      case 'Home':
        next = 0;
        break;
    }
    if (next === null) return;
    event.preventDefault();
    this.setAngle(arm, mod(next, 360));
  }

  protected select(id: string): void {
    this.selectedId.set(this.selectedId() === id ? null : id);
  }

  private setAngle(arm: Arm, angle: number): void {
    (arm === 'day' ? this.dayAngle : this.hourAngle).set(angle);
  }

  private snap(angle: number): number {
    for (const p of SNAP_POINTS) {
      const d = mod(angle - p + 180, 360) - 180;
      if (Math.abs(d) <= SNAP_DEGREES) return p;
    }
    return angle;
  }

  private arm(angle: number, length: number) {
    const tip = polar(angle, length);
    return { x: tip.x, y: tip.y };
  }
}
