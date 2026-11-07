import { Service } from '@angular/core';
import { ClientDB } from '../../core/client-db/client-db';
import type { CoatOfArms } from './heraldry/model';
import type { CustomTincture } from './heraldry/tinctures';

type StoreName = 'coats' | 'tinctures';

/** Saved coats of arms and the user's custom tinctures, kept in IndexedDB. */
@Service()
export class CoatOfArmsService extends ClientDB<StoreName> {
  protected readonly DatabaseName = 'pendragon-sandbox.coat-of-arms';
  protected readonly StoreNames = ['coats', 'tinctures'] as const;
  protected readonly DBVersion = 1;

  /** Saved coats of arms. */
  readonly coats = this.store<CoatOfArms>('coats');
  /** Custom tinctures, shared by every coat of arms. */
  readonly tinctures = this.store<CustomTincture>('tinctures');
}
