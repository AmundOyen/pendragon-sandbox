import { guid } from '../utilities';

type HasId = { id: string };
type Store<T extends HasId> = {
  read: () => Promise<T[]>;
  get: (id: string) => Promise<T | null>;
  add: (item: Omit<T, 'id'>) => Promise<T>;
  update: (item: T) => Promise<T>;
  delete: (id: string) => Promise<void>;
  query: (where: (item: T) => boolean) => Promise<T[]>;
  find: (where: (item: T) => boolean) => Promise<T | null>;
};

export abstract class ClientDB<STORE_NAMES extends string> {
  protected abstract readonly DatabaseName: string;
  protected abstract readonly StoreNames: readonly STORE_NAMES[];
  protected abstract readonly DBVersion: number;

  protected store<T extends HasId>(storeName: STORE_NAMES): Store<T> {
    return {
      read: () => this.read<T>(storeName),
      get: (id: string) => this.get<T>(storeName, id),
      add: (item: Omit<T, 'id'>) => this.add<T>(storeName, item),
      update: (item: T) => this.update<T>(storeName, item),
      delete: (id: string) => this.delete(storeName, id),
      query: (where: (item: T) => boolean) => this.query<T>(storeName, where),
      find: (where: (item: T) => boolean) => this.find<T>(storeName, where),
    };
  }

  private async read<T>(storeName: STORE_NAMES): Promise<T[]> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error as Error);
    });
  }

  private async get<T>(storeName: STORE_NAMES, id: string): Promise<T | null> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error as Error);
    });
  }

  private async add<T>(storeName: STORE_NAMES, item: Omit<T, 'id'>): Promise<T> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const id = guid();
      const request = store.add({ ...item, id });

      request.onsuccess = () => resolve({ ...item, id: request.result } as T);
      request.onerror = () => reject(request.error as Error);
    });
  }

  private async update<T>(storeName: STORE_NAMES, item: T): Promise<T> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.put(item);

      request.onsuccess = () => resolve(item);
      request.onerror = () => reject(request.error as Error);
    });
  }

  private async delete(storeName: STORE_NAMES, id: string): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error as Error);
    });
  }

  private async query<T>(storeName: STORE_NAMES, where: (item: T) => boolean): Promise<T[]> {
    const items = await this.read<T>(storeName);
    return items.filter(i => where(i));
  }

  private async find<T>(storeName: STORE_NAMES, where: (item: T) => boolean): Promise<T | null> {
    const items = await this.read<T>(storeName);
    return items.find(i => where(i)) ?? null;
  }

  private initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DatabaseName, this.DBVersion);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.StoreNames.forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: 'id' });
          }
        });
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error as Error);
    });
  }
}