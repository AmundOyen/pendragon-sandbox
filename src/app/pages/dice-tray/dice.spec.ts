import { describe, expect, it } from 'vitest';
import { emptyPool, formatPool, poolSize, rollDie, rollPool } from './dice';

describe('rollDie', () => {
  it('maps the lowest random value to 1', () => {
    expect(rollDie(20, () => 0)).toBe(1);
  });

  it('maps the highest random value to the number of sides', () => {
    expect(rollDie(20, () => 0.999999)).toBe(20);
  });

  it('never leaves the [1, sides] range', () => {
    for (let i = 0; i < 1000; i++) {
      const value = rollDie(6);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(6);
    }
  });
});

describe('rollPool', () => {
  it('rolls the requested number of each die and sums them with the modifier', () => {
    const pool = { ...emptyPool(), d6: 2, d20: 1 };
    const result = rollPool(pool, 3, () => 0.5);

    expect(result.groups).toEqual([
      { die: 'd6', rolls: [4, 4], subtotal: 8 },
      { die: 'd20', rolls: [11], subtotal: 11 },
    ]);
    expect(result.total).toBe(8 + 11 + 3);
  });

  it('skips dice with a count of zero', () => {
    const result = rollPool(emptyPool(), 0);
    expect(result.groups).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('copies the pool so later edits do not change the result', () => {
    const pool = { ...emptyPool(), d4: 1 };
    const result = rollPool(pool, 0);
    pool.d4 = 5;
    expect(result.pool.d4).toBe(1);
  });
});

describe('formatPool', () => {
  it('joins dice groups with a positive modifier', () => {
    expect(formatPool({ ...emptyPool(), d6: 2, d20: 1 }, 3)).toBe('2d6 + 1d20 + 3');
  });

  it('renders a negative modifier as a subtraction', () => {
    expect(formatPool({ ...emptyPool(), d8: 1 }, -2)).toBe('1d8 - 2');
  });

  it('omits a zero modifier', () => {
    expect(formatPool({ ...emptyPool(), d100: 1 })).toBe('1d100');
  });
});

describe('poolSize', () => {
  it('counts every selected die', () => {
    expect(poolSize({ ...emptyPool(), d4: 2, d12: 3 })).toBe(5);
  });
});
