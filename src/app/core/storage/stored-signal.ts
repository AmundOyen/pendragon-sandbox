import { WritableSignal, inject } from '@angular/core';
import { StoredSignalOptions } from './stored-signal-options';
import { CalSignalStorage } from './signal-storage.service';

export function storedSignal<T>(token: string, options?: StoredSignalOptions<T>): WritableSignal<T> {
  const service = inject(CalSignalStorage);
  return service.create(token, options);
}