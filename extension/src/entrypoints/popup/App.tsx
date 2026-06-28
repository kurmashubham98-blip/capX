import React, { useEffect, useState, useRef } from 'react';
import type { ContextCapsule, ContextCapsuleSummary } from '@capx/core';
import { toSummary } from '@capx/core';
import { CapsuleStore } from '../../storage/capsule-store';
import { ContextEngine } from '../../engine/context-engine';
import { sendToActiveTab } from '../../messages';
import { createAdapter, syncPush as doSyncPush, syncPull as doSyncPull } from '../../sync';
import type { SyncConfig } from '../../sync/types';

type View = 'list' | 'detail' | 'import' | 'sync';

const engine = new ContextEngine();
const store = new CapsuleStore();

export default function App() {
  const [capsules, setCapsules] = useState<ContextCapsuleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('list');
  const [selectedCapsule, setSelectedCapsule] = useState<ContextCapsule | null>(null);
  const [search, setSearch] = useState('');
  const [msg, setMsg] = useState('');

  const load = async () => {
    setLoading(true);
    const list = await store.listAll();
    setCapsules(list);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = search
    ? capsules.filter((c) =>
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.source.includes(search.toLowerCase()) ||
        c.tags.some((t) => t.includes(search.toLowerCase())),
      )
    : capsules;

  const showToast = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(''), 2500);
  };

  const handleCapture = async () => {
    try {
      const res = await sendToActiveTab({ type: 'CAPX_CAPTURE' }) as any;
      if (res?.type === 'CAPX_CAPTURE_RESULT') {
        showToast(`Captured ${res.capsule.messages.length} messages`);
        await load();
      } else {
        showToast('No conversation found on this page');
      }
    } catch {
      showToast('Open an AI chat to capture context');
    }
  };

  const handleInject = async (id: string) => {
    try {
      const res = await sendToActiveTab({ type: 'CAPX_INJECT', capsuleId: id }) as any;
      if (res?.type === 'CAPX_INJECT_RESULT') {
        showToast(res.message);
      } else {
        showToast('Injection failed');
      }
    } catch {
      showToast('Open an AI chat to inject context');
    }
  };

  const handleDelete = async (id: string) => {
    await store.delete(id);
    if (selectedCapsule?.id === id) { setSelectedCapsule(null); setView('list'); }
    await load();
    showToast('Deleted');
  };

  const exportJSON = async (id: string) => {
    const json = await store.exportJSON(id);
    if (!json) return;
    downloadFile(json, `capx-${id.slice(0, 8)}.json`, 'application/json');
    showToast('Downloaded JSON');
  };

  const exportMarkdown = async (id: string) => {
    const cap = await store.get(id);
    if (!cap) return;
    const md = engine.formatAsMarkdown(cap);
    downloadFile(md, `capx-${id.slice(0, 8)}.md`, 'text/markdown');
    showToast('Downloaded Markdown');
  };

  const openDetail = async (id: string) => {
    const cap = await store.get(id);
    if (cap) { setSelectedCapsule(cap); setView('detail'); }
  };

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const cap = JSON.parse(text) as ContextCapsule;
      if (!cap.id || !cap.messages) throw new Error('Invalid capsule');
      await store.save(cap);
      showToast(`Imported: ${cap.title}`);
      await load();
      setView('list');
    } catch (err) {
      showToast('Invalid capsule file');
    }
  };

  const [syncConfig, setSyncConfig] = useState<SyncConfig | null>(null);
  const [syncStatus, setSyncStatus] = useState<string>('');

  useEffect(() => {
    browser.storage.local.get('capx-sync-config').then((r: Record<string, unknown>) => {
      if (r['capx-sync-config']) setSyncConfig(r['capx-sync-config'] as SyncConfig);
    });
  }, []);

  const saveSyncConfig = async (cfg: SyncConfig) => {
    setSyncConfig(cfg);
    await browser.storage.local.set({ 'capx-sync-config': cfg });
  };

  const handleSyncPush = async () => {
    if (!syncConfig) { showToast('Configure sync first'); return; }
    try {
      const adp = createAdapter(syncConfig);
      setSyncStatus('Authenticating...');
      await adp.authenticate();
      setSyncStatus('Pushing...');
      const n = await doSyncPush(adp);
      showToast(`Pushed ${n} capsules to ${adp.name}`);
      setSyncStatus('');
    } catch (err) {
      showToast('Sync push failed: ' + (err as Error).message);
      setSyncStatus('');
    }
  };

  const handleSyncPull = async () => {
    if (!syncConfig) { showToast('Configure sync first'); return; }
    try {
      const adp = createAdapter(syncConfig);
      setSyncStatus('Authenticating...');
      await adp.authenticate();
      setSyncStatus('Pulling...');
      const n = await doSyncPull(adp);
      showToast(`Pulled ${n} capsules from ${adp.name}`);
      await load();
      setSyncStatus('');
    } catch (err) {
      showToast('Sync pull failed: ' + (err as Error).message);
      setSyncStatus('');
    }
  };

  return (
    <div className="w-[420px] min-h-[450px] bg-gray-50 flex flex-col">
      {msg && (
        <div className="fixed top-2 right-2 left-2 z-50 bg-gray-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg text-center animate-fade-in">
          {msg}
        </div>
      )}

      {view === 'list' && (
        <ListView
          capsules={filtered}
          loading={loading}
          search={search}
          onSearch={setSearch}
          onCapture={handleCapture}
          onRefresh={load}
          onDetail={openDetail}
          onInject={handleInject}
          onDelete={handleDelete}
          onExportJSON={exportJSON}
          onExportMD={exportMarkdown}
          onImportClick={() => setView('import')}
          onSyncClick={() => setView('sync')}
        />
      )}

      {view === 'detail' && selectedCapsule && (
        <DetailView
          capsule={selectedCapsule}
          onBack={() => { setSelectedCapsule(null); setView('list'); }}
          onInject={handleInject}
          onExportJSON={exportJSON}
          onExportMD={exportMarkdown}
          onDelete={handleDelete}
        />
      )}

      {view === 'sync' && (
        <SyncView
          config={syncConfig}
          status={syncStatus}
          onBack={() => setView('list')}
          onSaveConfig={saveSyncConfig}
          onPush={handleSyncPush}
          onPull={handleSyncPull}
        />
      )}

      {view === 'import' && (
        <ImportView
          onBack={() => setView('list')}
          onImport={handleImport}
        />
      )}
    </div>
  );
}

function downloadFile(content: string, name: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

/* ─── List View ─── */

function ListView({
  capsules, loading, search, onSearch, onCapture, onRefresh,
  onDetail, onInject, onDelete, onExportJSON, onExportMD, onImportClick, onSyncClick,
}: {
  capsules: ContextCapsuleSummary[];
  loading: boolean;
  search: string;
  onSearch: (v: string) => void;
  onCapture: () => void;
  onRefresh: () => void;
  onDetail: (id: string) => void;
  onInject: (id: string) => void;
  onDelete: (id: string) => void;
  onExportJSON: (id: string) => void;
  onExportMD: (id: string) => void;
  onImportClick: () => void;
  onSyncClick: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between px-4 pt-3 pb-2 border-b bg-white">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-gray-800">CapX</span>
          <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">v0.1.0</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onCapture} title="Capture context from this page"
            className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-md hover:bg-blue-600 transition-colors">
            <span>📋</span> Capture
          </button>
          <button onClick={onSyncClick} title="Sync settings"
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors">
            <span className="text-sm">☁️</span>
          </button>
          <button onClick={onRefresh} title="Refresh"
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors">
            <span className="text-sm">↻</span>
          </button>
        </div>
      </header>

      <div className="px-4 py-2">
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search capsules..."
          className="w-full px-3 py-1.5 text-xs border rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-3 space-y-2">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : capsules.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-3xl mb-2">📦</div>
            <p className="text-sm font-medium">No saved capsules</p>
            <p className="text-xs mt-1">Go to an AI chat and click Capture</p>
          </div>
        ) : (
          capsules.map((c) => (
            <CapsuleCard
              key={c.id}
              summary={c}
              onClick={() => onDetail(c.id)}
              onInject={() => onInject(c.id)}
              onDelete={() => onDelete(c.id)}
              onExportJSON={() => onExportJSON(c.id)}
              onExportMD={() => onExportMD(c.id)}
            />
          ))
        )}
      </div>

      <div className="px-4 py-2 border-t bg-white">
        <button onClick={onImportClick}
          className="w-full py-1.5 text-xs text-gray-500 border border-dashed rounded-md hover:bg-gray-50 transition-colors">
          + Import Capsule from File
        </button>
      </div>
    </div>
  );
}

/* ─── Capsule Card ─── */

function CapsuleCard({ summary, onClick, onInject, onDelete, onExportJSON, onExportMD }: {
  summary: ContextCapsuleSummary;
  onClick: () => void;
  onInject: () => void;
  onDelete: () => void;
  onExportJSON: () => void;
  onExportMD: () => void;
}) {
  return (
    <div className="bg-white border rounded-lg hover:shadow-sm transition-shadow">
      <button onClick={onClick} className="w-full text-left px-3 pt-2.5 pb-1.5 hover:bg-gray-50 transition-colors">
        <p className="text-sm font-medium text-gray-800 truncate">{summary.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">{summary.source}</span>
          <span className="text-[11px] text-gray-400">{summary.messageCount} msgs</span>
          <span className="text-[11px] text-gray-400">{new Date(summary.timestamp).toLocaleDateString()}</span>
        </div>
        {summary.tags.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {summary.tags.map((t) => <span key={t} className="text-[10px] bg-gray-100 text-gray-500 px-1 rounded">{t}</span>)}
          </div>
        )}
      </button>
      <div className="flex items-center gap-1 px-3 pb-2 border-t pt-1.5">
        <ActionBtn label="JSON" onClick={onExportJSON} />
        <ActionBtn label="MD" onClick={onExportMD} />
        <ActionBtn label="Inject" onClick={onInject} color="purple" />
        <button onClick={onDelete}
          className="ml-auto text-[11px] text-gray-300 hover:text-red-400 transition-colors px-1">🗑</button>
      </div>
    </div>
  );
}

function ActionBtn({ label, onClick, color = 'gray' }: { label: string; onClick: () => void; color?: string }) {
  const colors: Record<string, string> = {
    gray: 'border-gray-200 text-gray-500 hover:bg-gray-50',
    blue: 'border-blue-200 text-blue-600 hover:bg-blue-50',
    purple: 'border-purple-200 text-purple-600 hover:bg-purple-50',
    red: 'border-red-200 text-red-500 hover:bg-red-50',
  };
  return (
    <button onClick={onClick}
      className={`text-[10px] font-medium px-2 py-0.5 rounded border ${colors[color] || colors.gray} transition-colors`}>
      {label}
    </button>
  );
}

/* ─── Detail View ─── */

function DetailView({ capsule, onBack, onInject, onExportJSON, onExportMD, onDelete }: {
  capsule: ContextCapsule;
  onBack: () => void;
  onInject: (id: string) => void;
  onExportJSON: (id: string) => void;
  onExportMD: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const tokens = capsule.messages.reduce((s, m) => s + Math.ceil(m.content.length / 4), 0);

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-2 px-4 pt-3 pb-2 border-b bg-white">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600 text-sm">←</button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{capsule.title}</p>
        </div>
      </header>

      <div className="px-4 py-2 border-b bg-gray-50/50">
        <div className="flex items-center gap-3 text-[11px] text-gray-500">
          <span>📦 {capsule.source}</span>
          <span>🤖 {capsule.model}</span>
          <span>📄 {capsule.messages.length} msgs</span>
          <span>🔤 ~{tokens} tokens</span>
        </div>
        {capsule.metadata.url && (
          <p className="text-[10px] text-gray-400 mt-1 truncate">{capsule.metadata.url}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
        {capsule.messages.map((msg) => (
          <div key={msg.id} className={`rounded-lg p-2.5 ${msg.role === 'user' ? 'bg-blue-50 ml-4' : 'bg-gray-50 mr-4'}`}>
            <p className="text-[10px] font-semibold text-gray-400 mb-1">
              {msg.role === 'user' ? '👤 User' : msg.role === 'assistant' ? '🤖 Assistant' : '⚙️ System'}
            </p>
            <p className="text-xs text-gray-700 whitespace-pre-wrap line-clamp-6">{msg.content}</p>
            {(msg.images?.length ?? 0) > 0 && (
              <p className="text-[10px] text-gray-400 mt-1">🖼️ {msg.images!.length} image(s)</p>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 px-4 py-2 border-t bg-white flex-wrap">
        <button onClick={() => onInject(capsule.id)}
          className="px-3 py-1.5 bg-purple-500 text-white text-xs font-medium rounded-md hover:bg-purple-600 transition-colors">
          Inject into active chat
        </button>
        <button onClick={() => onExportJSON(capsule.id)}
          className="px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-medium rounded-md hover:bg-gray-50 transition-colors">
          JSON
        </button>
        <button onClick={() => onExportMD(capsule.id)}
          className="px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-medium rounded-md hover:bg-gray-50 transition-colors">
          Markdown
        </button>
        <button onClick={() => onDelete(capsule.id)}
          className="ml-auto px-2 py-1.5 text-xs text-red-400 hover:text-red-500 transition-colors">
          Delete
        </button>
      </div>
    </div>
  );
}

/* ─── Sync View ─── */

function SyncView({ config, status, onBack, onSaveConfig, onPush, onPull }: {
  config: SyncConfig | null;
  status: string;
  onBack: () => void;
  onSaveConfig: (cfg: SyncConfig) => void;
  onPush: () => void;
  onPull: () => void;
}) {
  const [url, setUrl] = useState(config?.supabaseUrl || '');
  const [key, setKey] = useState(config?.supabaseKey || '');

  const save = () => {
    if (!url || !key) return;
    onSaveConfig({ adapter: 'supabase', supabaseUrl: url, supabaseKey: key });
  };

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-2 px-4 pt-3 pb-2 border-b bg-white">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600 text-sm">←</button>
        <span className="text-sm font-medium text-gray-800">Cloud Sync</span>
      </header>

      <div className="flex-1 p-4 space-y-3">
        <p className="text-xs text-gray-500">
          Sync capsules with Supabase. Create a free project at supabase.com, then add your URL and anon key.
        </p>

        <div>
          <label className="text-[11px] font-medium text-gray-600">Supabase URL</label>
          <input value={url} onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-project.supabase.co"
            className="w-full mt-1 px-3 py-1.5 text-xs border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400" />
        </div>

        <div>
          <label className="text-[11px] font-medium text-gray-600">Supabase Anon Key</label>
          <input value={key} onChange={(e) => setKey(e.target.value)}
            placeholder="eyJhbGciOiJIUzI1NiIs..."
            className="w-full mt-1 px-3 py-1.5 text-xs border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400" />
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={save}
            className="flex-1 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-md hover:bg-blue-600 transition-colors">
            Save Config
          </button>
        </div>

        {config && (
          <div className="pt-2 border-t space-y-2">
            <p className="text-xs text-green-600">✓ Configured: {config.supabaseUrl}</p>
            <div className="flex gap-2">
              <button onClick={onPush} disabled={!!status}
                className="flex-1 py-1.5 bg-purple-500 text-white text-xs font-medium rounded-md hover:bg-purple-600 disabled:opacity-50 transition-colors">
                {status || 'Push to Cloud'}
              </button>
              <button onClick={onPull} disabled={!!status}
                className="flex-1 py-1.5 border border-gray-200 text-gray-600 text-xs font-medium rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors">
                Pull from Cloud
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Import View ─── */

function ImportView({ onBack, onImport }: { onBack: () => void; onImport: (file: File) => Promise<void> }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (file: File) => {
    if (file.name.endsWith('.json')) onImport(file);
  };

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-2 px-4 pt-3 pb-2 border-b bg-white">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600 text-sm">←</button>
        <span className="text-sm font-medium text-gray-800">Import Capsule</span>
      </header>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onClick={() => inputRef.current?.click()}
        className={`flex-1 m-4 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors ${
          dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".json"
          hidden
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        <div className="text-3xl mb-2">📥</div>
        <p className="text-sm font-medium text-gray-600">Drop a capsule file here</p>
        <p className="text-xs text-gray-400 mt-1">or click to browse</p>
        <p className="text-[10px] text-gray-300 mt-2">Accepts .json files exported from CapX</p>
      </div>
    </div>
  );
}
