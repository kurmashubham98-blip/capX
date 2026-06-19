import type { ContextCapsule, ContextCapsuleSummary } from '@capx/core';
import { toSummary } from '@capx/core';
import { db } from './db';

export class CapsuleStore {
  async save(capsule: ContextCapsule): Promise<void> {
    await db.capsules.put(capsule);
  }

  async get(id: string): Promise<ContextCapsule | undefined> {
    return db.capsules.get(id);
  }

  async delete(id: string): Promise<void> {
    await db.capsules.delete(id);
  }

  async listAll(): Promise<ContextCapsuleSummary[]> {
    const all = await db.capsules.toArray();
    return all.map(toSummary).sort((a, b) => b.timestamp - a.timestamp);
  }

  async findBySource(source: string): Promise<ContextCapsuleSummary[]> {
    const matches = await db.capsules.where('source').equals(source).toArray();
    return matches.map(toSummary).sort((a, b) => b.timestamp - a.timestamp);
  }

  async search(query: string): Promise<ContextCapsuleSummary[]> {
    const all = await db.capsules.toArray();
    const lower = query.toLowerCase();
    const filtered = all.filter(
      (c) =>
        c.title.toLowerCase().includes(lower) ||
        c.tags.some((t) => t.toLowerCase().includes(lower)) ||
        c.messages.some((m) => m.content.toLowerCase().includes(lower)),
    );
    return filtered.map(toSummary).sort((a, b) => b.timestamp - a.timestamp);
  }

  async getCount(): Promise<number> {
    return db.capsules.count();
  }

  async exportJSON(id: string): Promise<string | null> {
    const capsule = await this.get(id);
    return capsule ? JSON.stringify(capsule, null, 2) : null;
  }

  async importJSON(json: string): Promise<ContextCapsule> {
    const capsule: ContextCapsule = JSON.parse(json);
    await this.save(capsule);
    return capsule;
  }
}
