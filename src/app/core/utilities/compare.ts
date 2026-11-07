/* eslint-disable @typescript-eslint/no-explicit-any */

type DataType = 'string' | 'number' | 'boolean' | 'date' | 'undefined' | 'null' | 'object' | 'array';

function dataType(value: unknown): DataType {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (value instanceof Date) return 'date';
  return typeof value as DataType;
}

export function compare<T>(a: T | null | undefined, b: T | null | undefined): boolean {
  const typeA = dataType(a);
  const typeB = dataType(b);
  if (typeA !== typeB) {
    if(a === '' && b === null || b === '' && a === null) {return true;}
    return false; 
  }
  switch (typeA) {
    case 'object': {
      const keysA = Object.keys(a as any);
      const keysB = Object.keys(b as any);
      if (keysA.length !== keysB.length) { return false; }
      return keysA.every(key => compare((a as any)[key], (b as any)[key]));
    }
    case 'array': {
      const arrA = a as any[];
      const arrB = b as any[];
      if (arrA.length !== arrB.length) { return false; }
      return arrA.every((value, index) => compare(value, arrB[index]));
    }
    case 'date': return (a as Date).getTime() === (b as Date).getTime();
    default: return a === b;
  }
}