import type { ContextCapsule } from '@capx/core';

export interface SyncAdapter {
  readonly name: string;
  push(capsules: ContextCapsule[]): Promise<void>;
  pull(): Promise<ContextCapsule[]>;
  isAuthenticated(): Promise<boolean>;
  authenticate(): Promise<void>;
  signOut(): Promise<void>;
}

export interface SyncConfig {
  adapter: string;
  supabaseUrl?: string;
  supabaseKey?: string;
}
