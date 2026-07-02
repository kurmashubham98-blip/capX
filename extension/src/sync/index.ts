import type { SyncAdapter, SyncConfig } from './types';
import { SupabaseSyncAdapter } from './supabase-adapter';
import { CapsuleStore } from '../storage/capsule-store';

const ADAPTERS: Record<string, new () => SyncAdapter> = {
  supabase: SupabaseSyncAdapter,
};

export function createAdapter(config: SyncConfig): SyncAdapter {
  const AdapterClass = ADAPTERS[config.adapter];
  if (!AdapterClass) throw new Error(`Unknown sync adapter: ${config.adapter}`);
  return new AdapterClass();
}

export async function syncPush(adapter: SyncAdapter): Promise<number> {
  const store = new CapsuleStore();
  const capsules = await store.listAll();
  const full = await Promise.all(capsules.map((c) => store.get(c.id)));
  const valid = full.filter((c): c is NonNullable<typeof c> => c != null);
  await adapter.push(valid);
  return valid.length;
}

export async function syncPull(adapter: SyncAdapter): Promise<number> {
  const store = new CapsuleStore();
  const remote = await adapter.pull();
  for (const cap of remote) {
    await store.save(cap);
  }
  return remote.length;
}
