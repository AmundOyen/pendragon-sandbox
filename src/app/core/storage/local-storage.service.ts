import { Service } from '@angular/core';

@Service()
export class CalLocalStorage {
  private readonly prefix = 'pen-san';

  public getAsync<T>(key: string): Promise<T | null> {
    return Promise.resolve(this.get<T>(key));
  }

  public setAsync<T>(key: string, value: T): Promise<T> {
    return Promise.resolve(this.set<T>(key, value));
  }

  public removeAsync(key: string): Promise<string> {
    return Promise.resolve(this.remove(key));
  }

  public get<T>(key: string): T | null {
    const result = globalThis.localStorage.getItem(this.prefix + key);
    return result ? JSON.parse(result) as T : null;
  }

  public set<T>(key: string, value: T): T {
    globalThis.localStorage.setItem(this.prefix + key, JSON.stringify(value));
    return value;
  }

  public remove(key: string): string {
    globalThis.localStorage.removeItem(this.prefix + key);
    return key;
  }

}
