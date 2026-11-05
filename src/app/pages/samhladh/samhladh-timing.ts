import { HOLY_DAYS, type HolyDay, holyDay, type Samhladh } from './samhladh.data';

/** The wheel uses a fixed 365-day year. */
export const YEAR_DAYS = 365;
/** A Season is the quarter of the year centred on a holy day (as a Quarter is 6 of 24 hours). */
export const SEASON_HALF_WIDTH_DAYS = 45;
/** A Quarter is the six hours centred on an Hour. */
export const QUARTER_HALF_WIDTH_HOURS = 3;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_START = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

/** 0-based day of a non-leap year. */
export function dayOfYear(month: number, day: number): number {
  return MONTH_START[month - 1] + day - 1;
}

export function formatDayOfYear(doy: number): string {
  const d = mod(Math.round(doy), YEAR_DAYS);
  let m = 11;
  while (MONTH_START[m] > d) m--;
  return `${MONTHS[m]} ${d - MONTH_START[m] + 1}`;
}

export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/** Holy days in wheel order, each with its day of year unwrapped to increase monotonically. */
const ANCHORS = (() => {
  const base = dayOfYear(HOLY_DAYS[0].month, HOLY_DAYS[0].day);
  return HOLY_DAYS.map((h) => {
    let d = dayOfYear(h.month, h.day);
    if (d < base) d += YEAR_DAYS;
    return { angle: h.angle, day: d };
  }).concat({ angle: 360, day: base + YEAR_DAYS });
})();

/**
 * Wheel angle → day of year. The holy days sit on fixed 45° spokes but are not evenly spaced
 * in the calendar, so the mapping is linear between neighbouring holy days.
 */
export function angleToDay(angle: number): number {
  const a = mod(angle, 360);
  for (let i = 0; i < ANCHORS.length - 1; i++) {
    const from = ANCHORS[i];
    const to = ANCHORS[i + 1];
    if (a >= from.angle && a <= to.angle) {
      const t = (a - from.angle) / (to.angle - from.angle);
      return mod(from.day + t * (to.day - from.day), YEAR_DAYS);
    }
  }
  return ANCHORS[0].day;
}

/** Day of year → wheel angle (inverse of {@link angleToDay}). */
export function dayToAngle(doy: number): number {
  let d = mod(doy, YEAR_DAYS);
  if (d < ANCHORS[0].day) d += YEAR_DAYS;
  for (let i = 0; i < ANCHORS.length - 1; i++) {
    const from = ANCHORS[i];
    const to = ANCHORS[i + 1];
    if (d >= from.day && d <= to.day) {
      const t = (d - from.day) / (to.day - from.day);
      return from.angle + t * (to.angle - from.angle);
    }
  }
  return 0;
}

export const angleToHour = (angle: number): number => mod(angle, 360) / 15;
export const hourToAngle = (hour: number): number => mod(hour, 24) * 15;

export function formatHour(hour: number): string {
  const totalMinutes = mod(Math.round(hour * 60), 24 * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const suffix = h < 12 ? 'am' : 'pm';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  if (m === 0 && h === 0) return 'Midnight';
  if (m === 0 && h === 12) return 'Noon';
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** Holy day exactly at a wheel angle (after snapping), if any. */
export function holyDayAtAngle(angle: number): HolyDay | undefined {
  return HOLY_DAYS.find((h) => Math.abs(circularDiff(h.angle, angle, 360)) < 0.01);
}

export function circularDiff(a: number, b: number, period: number): number {
  const d = mod(a - b, period);
  return Math.min(d, period - d);
}

export interface TimingModifier {
  id: 'hour' | 'quarter' | 'day' | 'season' | 'opp-hour' | 'opp-quarter' | 'opp-day' | 'opp-season';
  label: string;
  value: number;
  applies: boolean;
}

export interface TimingResult {
  /** The spirit's own Day and Hour, and their opposites. */
  day: HolyDay;
  oppositeDay: HolyDay;
  hour: number;
  oppositeHour: number;
  modifiers: TimingModifier[];
  total: number;
}

/**
 * Invocation modifiers from Beyond the Wall (cumulative):
 * Quarter +1, Hour +3, Season +1, Day +3; Opposite Quarter −3, Hour −5, Season −5, Day −10.
 */
export function invocationTiming(
  spirit: Samhladh,
  selectedDay: number,
  selectedHour: number,
): TimingResult | null {
  if (!spirit.day) return null;
  const day = holyDay(spirit.day);
  const oppositeDay = HOLY_DAYS.find((h) => h.angle === mod(day.angle + 180, 360))!;
  const hour = day.hour;
  const oppositeHour = mod(hour + 12, 24);

  const doy = mod(Math.round(selectedDay), YEAR_DAYS);
  const dayDist = (h: HolyDay) => circularDiff(doy, dayOfYear(h.month, h.day), YEAR_DAYS);
  const hourDist = (h: number) => circularDiff(selectedHour, h, 24);

  const modifiers: TimingModifier[] = [
    { id: 'hour', label: "On the spirit's Hour", value: 3, applies: hourDist(hour) < 0.5 },
    {
      id: 'quarter',
      label: "In the spirit's Quarter",
      value: 1,
      applies: hourDist(hour) <= QUARTER_HALF_WIDTH_HOURS,
    },
    { id: 'day', label: "On the spirit's Day", value: 3, applies: dayDist(day) === 0 },
    {
      id: 'season',
      label: "In the spirit's Season",
      value: 1,
      applies: dayDist(day) <= SEASON_HALF_WIDTH_DAYS,
    },
    {
      id: 'opp-hour',
      label: 'On the Opposite Hour',
      value: -5,
      applies: hourDist(oppositeHour) < 0.5,
    },
    {
      id: 'opp-quarter',
      label: 'In the Opposite Quarter',
      value: -3,
      applies: hourDist(oppositeHour) <= QUARTER_HALF_WIDTH_HOURS,
    },
    {
      id: 'opp-day',
      label: 'On the Opposite Day',
      value: -10,
      applies: dayDist(oppositeDay) === 0,
    },
    {
      id: 'opp-season',
      label: 'In the Opposite Season',
      value: -5,
      applies: dayDist(oppositeDay) <= SEASON_HALF_WIDTH_DAYS,
    },
  ];

  return {
    day,
    oppositeDay,
    hour,
    oppositeHour,
    modifiers,
    total: modifiers.reduce((sum, m) => sum + (m.applies ? m.value : 0), 0),
  };
}
