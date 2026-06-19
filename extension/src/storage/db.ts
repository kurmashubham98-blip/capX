import Dexie, { type Table } from 'dexie';
import type { ContextCapsule } from '@capx/core';

export class CapxDB extends Dexie {
  capsules!: Table<ContextCapsule, string>;

  constructor() {
    super('CapX');
    this.version(1).stores({
      capsules: 'id, source, model, timestamp, *tags',
    });
  }
}

export const db = new CapxDB();
