import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmRadioGroupImports } from '@spartan-ng/helm/radio-group';
import {
  angleToDay,
  angleToHour,
  dayOfYear,
  dayToAngle,
  formatDayOfYear,
  formatHour,
  holyDayAtAngle,
  hourToAngle,
  invocationTiming,
} from './samhladh-timing';
import { SAMHLADHS } from './samhladh.data';
import { TimeWheel } from './time-wheel/time-wheel';

type TattooKind = 'clan' | 'friend';

@Component({
  selector: 'app-samhladh',
  imports: [
    TimeWheel,
    HlmCardImports,
    HlmBadgeImports,
    HlmInputImports,
    HlmLabelImports,
    HlmRadioGroupImports,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './samhladh.html',
})
export class SamhladhPage {
  protected readonly spirits = SAMHLADHS;

  // Start at the current date and time.
  private readonly _now = new Date();
  protected readonly dayAngle = signal(
    dayToAngle(dayOfYear(this._now.getMonth() + 1, this._now.getDate())),
  );
  protected readonly hourAngle = signal(
    hourToAngle(this._now.getHours() + this._now.getMinutes() / 60),
  );
  protected readonly selectedId = signal<string | null>(null);
  protected readonly tattoo = signal<TattooKind>('clan');
  protected readonly traitValue = signal<number | null>(null);

  protected readonly spirit = computed(
    () => this.spirits.find((s) => s.id === this.selectedId()) ?? null,
  );

  protected readonly dateText = computed(() => {
    const holy = holyDayAtAngle(this.dayAngle());
    const date = formatDayOfYear(angleToDay(this.dayAngle()));
    return holy ? `${holy.name} (${date})` : date;
  });
  protected readonly hourText = computed(() => formatHour(angleToHour(this.hourAngle())));

  protected readonly timing = computed(() => {
    const spirit = this.spirit();
    return spirit
      ? invocationTiming(spirit, angleToDay(this.dayAngle()), angleToHour(this.hourAngle()))
      : null;
  });

  protected readonly target = computed(() => {
    const value = this.traitValue();
    const timing = this.timing();
    return value !== null && timing ? value + timing.total : null;
  });

  protected formatHour = formatHour;

  protected signed(n: number): string {
    return n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '±0';
  }

  protected onTraitInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const n = Number.parseInt(raw, 10);
    this.traitValue.set(raw === '' || Number.isNaN(n) ? null : n);
  }
}
