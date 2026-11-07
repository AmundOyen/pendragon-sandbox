import type { CoatOfArms } from '../heraldry/model';
import type { CustomTincture } from '../heraldry/tinctures';

/** In-memory stand-in for the IndexedDB service (jsdom has no IndexedDB). */
export function memoryStore<T extends { id: string }>() {
  let items: T[] = [];
  let next = 1;
  return {
    read: async () => structuredClone(items),
    get: async (id: string) => structuredClone(items.find((i) => i.id === id) ?? null),
    add: async (item: Omit<T, 'id'>) => {
      const created = { ...item, id: `id-${next++}` } as T;
      items.push(structuredClone(created));
      return created;
    },
    update: async (item: T) => {
      items = items.map((i) => (i.id === item.id ? structuredClone(item) : i));
      return item;
    },
    delete: async (id: string) => {
      items = items.filter((i) => i.id !== id);
    },
    query: async (where: (i: T) => boolean) => items.filter(where),
    find: async (where: (i: T) => boolean) => items.find(where) ?? null,
  };
}

export class FakeCoatOfArmsService {
  coats = memoryStore<CoatOfArms>();
  tinctures = memoryStore<CustomTincture>();
}
