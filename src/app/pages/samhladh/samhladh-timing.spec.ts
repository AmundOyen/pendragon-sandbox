import {
  angleToDay,
  dayOfYear,
  dayToAngle,
  formatDayOfYear,
  formatHour,
  invocationTiming,
} from './samhladh-timing';
import { SAMHLADHS } from './samhladh.data';

const spirit = (id: string) => SAMHLADHS.find((s) => s.id === id)!;
const total = (id: string, month: number, day: number, hour: number) =>
  invocationTiming(spirit(id), dayOfYear(month, day), hour).total;

describe('wheel mapping', () => {
  it('puts holy days on their spokes', () => {
    expect(formatDayOfYear(angleToDay(0))).toBe('Dec 21');
    expect(formatDayOfYear(angleToDay(45))).toBe('Feb 1');
    expect(formatDayOfYear(angleToDay(180))).toBe('Jun 21');
    expect(formatDayOfYear(angleToDay(315))).toBe('Nov 1');
  });

  it('round-trips day ↔ angle', () => {
    for (const doy of [0, 31, 100, 200, 354, 364]) {
      expect(angleToDay(dayToAngle(doy))).toBeCloseTo(doy, 6);
    }
  });

  it('formats hours', () => {
    expect(formatHour(0)).toBe('Midnight');
    expect(formatHour(12)).toBe('Noon');
    expect(formatHour(21)).toBe('9:00 pm');
    expect(formatHour(3.5)).toBe('3:30 am');
  });
});

describe('invocationTiming', () => {
  it('gives the best case (+8) on the Day and Hour', () => {
    expect(total('bear', 8, 1, 15)).toBe(8); // Lugnasadh, 3pm
  });

  it('gives the worst case (−23) on the Opposite Day and Hour', () => {
    expect(total('bear', 2, 1, 3)).toBe(-23); // Imbolc, 3am
  });

  it('counts Quarter and Season without the exact Hour and Day', () => {
    expect(total('bear', 8, 20, 17)).toBe(2);
  });

  it('is neutral at right angles to the spirit', () => {
    expect(total('bear', 5, 1, 9)).toBe(0); // Beltaine, 9am
  });

  it('wraps around midnight and the new year', () => {
    expect(total('wolf', 12, 21, 23.75)).toBe(8); // 11:45pm counts as midnight's Hour
    expect(total('wolf', 1, 15, 1)).toBe(2);
  });

  it('runs the Season between the two neighbouring holy days', () => {
    // Winter Solstice's Season is Samhain (Nov 1) to Imbolc (Feb 1), not ±45 days.
    expect(total('wolf', 11, 1, 6)).toBe(1);
    expect(total('wolf', 2, 1, 6)).toBe(1);
    expect(total('wolf', 2, 3, 6)).toBe(0);
    expect(total('wolf', 10, 30, 6)).toBe(0);
  });

  it('gives Dog its Spring Equinox day', () => {
    expect(total('dog', 3, 21, 6)).toBe(8);
  });
});
