import type { SyncAdapter } from './types';
import type { ContextCapsule } from '@capx/core';

const STORAGE_KEY = 'capx-supabase-config';

interface SupabaseConfig {
  url: string;
  key: string;
}

export class SupabaseSyncAdapter implements SyncAdapter {
  readonly name = 'supabase';

  private config: SupabaseConfig | null = null;
  private authenticated = false;

  async loadConfig(): Promise<SupabaseConfig | null> {
    if (this.config) return this.config;
    const raw = (await browser.storage.local.get(STORAGE_KEY))[STORAGE_KEY];
    if (raw) this.config = JSON.parse(raw);
    return this.config;
  }

  async saveConfig(config: SupabaseConfig): Promise<void> {
    this.config = config;
    await browser.storage.local.set({ [STORAGE_KEY]: JSON.stringify(config) });
  }

  private async request(method: string, path: string, body?: unknown): Promise<Response> {
    const cfg = await this.loadConfig();
    if (!cfg) throw new Error('Supabase not configured');
    const isSync = path.startsWith('/');

    const url = isSync
      ? `${cfg.url}/rest/v1/${path}`
      : `https://${cfg.url.split('://')[1] || cfg.url}${path}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'apikey': cfg.key,
    };

    if (isSync) {
      headers['Prefer'] = 'resolution=merge-duplicates';
    }

    return fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async isAuthenticated(): Promise<boolean> {
    const cfg = await this.loadConfig();
    return !!cfg && this.authenticated;
  }

  async authenticate(): Promise<void> {
    const cfg = await this.loadConfig();
    if (!cfg) throw new Error('Configure Supabase URL and key first');
    try {
      const res = await this.request('GET', '/capsules?limit=1');
      if (res.ok) {
        this.authenticated = true;
        return;
      }
      throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      throw new Error('Failed to authenticate with Supabase: ' + (err as Error).message);
    }
  }

  async signOut(): Promise<void> {
    this.authenticated = false;
  }

  async push(capsules: ContextCapsule[]): Promise<void> {
    if (!this.authenticated) await this.authenticate();
    const rows = capsules.map((c) => ({
      id: c.id,
      title: c.title,
      source: c.source,
      model: c.model,
      timestamp: c.timestamp,
      messages: JSON.stringify(c.messages),
      metadata: JSON.stringify(c.metadata),
      tags: c.tags,
      updated_at: new Date().toISOString(),
    }));

    const chunkSize = 50;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const res = await this.request('POST', '/capsules', chunk);
      if (!res.ok) throw new Error(`Push failed: ${res.status} ${await res.text()}`);
    }
  }

  async pull(): Promise<ContextCapsule[]> {
    if (!this.authenticated) await this.authenticate();
    const res = await this.request('GET', '/capsules?order=timestamp.desc');
    if (!res.ok) throw new Error(`Pull failed: ${res.status}`);
    const rows = (await res.json()) as any[];
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      source: r.source,
      model: r.model,
      timestamp: r.timestamp,
      messages: typeof r.messages === 'string' ? JSON.parse(r.messages) : r.messages,
      metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata,
      tags: r.tags || [],
    }));
  }
}
