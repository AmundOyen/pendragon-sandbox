/** The polyhedral dice available in the tray. */
export const DIE_TYPES = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'] as const;
export type DieType = (typeof DIE_TYPES)[number];

export const DIE_SIDES: Record<DieType, number> = {
  d4: 4,
  d6: 6,
  d8: 8,
  d10: 10,
  d12: 12,
  d20: 20,
  d100: 100,
};

/** Maximum number of dice of a single type that can be rolled at once. */
export const MAX_DICE_PER_TYPE = 50;

/** How many dice of each type are selected. */
export type DicePool = Record<DieType, number>;

export interface DieGroupResult {
  die: DieType;
  rolls: number[];
  subtotal: number;
}

export interface RollResult {
  id: number;
  timestamp: number;
  pool: DicePool;
  modifier: number;
  groups: DieGroupResult[];
  total: number;
}

export function emptyPool(): DicePool {
  return { d4: 0, d6: 0, d8: 0, d10: 0, d12: 0, d20: 0, d100: 0 };
}

export function poolSize(pool: DicePool): number {
  return DIE_TYPES.reduce((sum, die) => sum + pool[die], 0);
}

/** A random-integer source in [0, 1). Injectable for deterministic tests. */
export type RandomSource = () => number;

export function rollDie(sides: number, random: RandomSource = Math.random): number {
  return Math.floor(random() * sides) + 1;
}

export function rollPool(
  pool: DicePool,
  modifier: number,
  random: RandomSource = Math.random,
): Omit<RollResult, 'id' | 'timestamp'> {
  const groups: DieGroupResult[] = [];
  for (const die of DIE_TYPES) {
    const count = pool[die];
    if (count <= 0) continue;
    const rolls = Array.from({ length: count }, () => rollDie(DIE_SIDES[die], random));
    groups.push({ die, rolls, subtotal: rolls.reduce((a, b) => a + b, 0) });
  }
  const total = groups.reduce((sum, g) => sum + g.subtotal, 0) + modifier;
  return { pool: { ...pool }, modifier, groups, total };
}

/** Formats a pool as dice notation, e.g. `2d6 + 1d20 + 3`. */
export function formatPool(pool: DicePool, modifier = 0): string {
  const parts = DIE_TYPES.filter((die) => pool[die] > 0).map((die) => `${pool[die]}${die}`);
  if (modifier > 0) parts.push(`${modifier}`);
  let text = parts.join(' + ');
  if (modifier < 0) text += ` - ${Math.abs(modifier)}`;
  return text;
}
