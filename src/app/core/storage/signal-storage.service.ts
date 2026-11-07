import { Injectable, WritableSignal, effect, inject, signal } from '@angular/core';
import { compare } from '../utilities';
import { CalLocalStorage } from './local-storage.service';
import { StoredSignalOptions } from './stored-signal-options';

@Injectable({
  providedIn: 'root'
})
export class CalSignalStorage {
  private readonly storage = inject(CalLocalStorage);

  create<T>(token: string, options?: StoredSignalOptions<T>): WritableSignal<T> {
    const initialValue = options?.initialValue as T;
    const result = signal<T>(initialValue);
    effect(() => this.setValue(token, result()));
    const value = this.storage.get<T>(token);
    if (value) { result.set(value); }
    return result;
  }

  async clear(token: string): Promise<void> {
    await this.storage.removeAsync(token);
  }

  private setValue<T>(token: string, value: T) {
    const current = this.storage.get<T>(token);
    if (compare(current, value)) { return; }
    this.storage.set(token, value);
  }
}

export { CalSignalStorage as CalSignalStorageService };