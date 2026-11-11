import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertTriangle, History, Loader2, Plus, Send, Sparkles, Trash2, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toList } from '@/lib/constants';
import { cn } from '@/lib/utils';
import NexusMessage from './NexusMessage';

const STORE_KEY = 'intelgraph.nexus.v1';

const SUGGESTIONS = [
  'How do I use this platform?',
  'Explain the network graph.',
  'Summarize this demonstration case.',
  'Explain the detected patterns.',
  'How do I generate a report?'
];

const newThread = () => ({ id: crypto.randomUUID(), title: '', messages: [] });

function loadStore() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (parsed && Array.isArray(parsed.threads)) return parsed;
  } catch {
    /* ignore malformed storage */
  }
  return { threads: [], activeId: '' };
}

export default function NexusChat() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [store, setStore] = useState(loadStore);
  const [showHistory, setShowHistory] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [cases, setCases] = useState([]);
  const [caseId, setCaseId] = useState('');
  const endRef = useRef(null);

  const thread = store.threads.find((t) => t.id === store.activeId) || null;
  const messages = thread?.messages || [];

  useEffect(() => {
    base44.entities.Investigation.list('-created_date', 30).then((r) => setCases(toList(r))).catch(() => setCases([]));
  }, []);

  useEffect(() => {
    const fromQuery = new URLSearchParams(location.search).get('case');
    const fromPath = location.pathname.startsWith('/cases/') ? location.pathname.split('/')[2] : '';
    const initial = fromQuery || fromPath || '';
    if (initial) setCaseId(initial);
  }, [location.pathname, location.search]);

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch {
      /* storage may be unavailable */
    }
  }, [store]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [open, messages.length, sending]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const selectedCase = useMemo(() => cases.find((c) => c.id === caseId), [cases, caseId]);

  const writeMessage = useCallback((threadId, updater) => {
    setStore((prev) => ({
      ...prev,
      threads: prev.threads.map((t) => (t.id === threadId ? updater(t) : t))
    }));
  }, []);

  const send = async (raw) => {
    const question = (raw ?? input).trim();
    if (!question || sending) return;
    setError('');

    let target = thread;
    if (!target) {
      target = newThread();
      setStore((prev) => ({ threads: [...prev.threads, target], activeId: target.id }));
    }

    const history = target.messages.slice(-6).map((m) => ({ role: m.role, text: m.text }));

    writeMessage(target.id, (t) => ({
      ...t,
      title: t.messages.length ? t.title : question.slice(0, 52),
      messages: [...t.messages, { id: crypto.randomUUID(), role: 'user', text: question }]
    }));
    setInput('');
    setSending(true);

    try {
      const res = await base44.functions.invoke('nexusAssist', { question, caseId, history });
      const data = res?.data || {};
      if (data.error) throw new Error(data.error);
      writeMessage(target.id, (t) => ({
        ...t,
        messages: [
          ...t.messages,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            text: data.answer,
            citations: data.citations || [],
            status: data.status,
            followUps: data.followUps || []
          }
        ]
      }));
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'NEXUS AI could not answer just now. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const startThread = () => {
    const fresh = newThread();
    setStore((prev) => ({ threads: [...prev.threads, fresh], activeId: fresh.id }));
    setError('');
    setShowHistory(false);
  };

  const clearThread = () => {
    if (!thread) return;
    writeMessage(thread.id, (t) => ({ ...t, title: '', messages: [] }));
    setError('');
  };

  const selectThread = (id) => {
    setStore((prev) => ({ ...prev, activeId: id }));
    setShowHistory(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close NEXUS AI assistant' : 'Open NEXUS AI assistant'}
        className="group fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-primary/50 bg-background/85 backdrop-blur-xl transition-transform duration-300 hover:scale-105"
        style={{ boxShadow: '0 0 0 1px hsl(var(--neon) / 0.25), 0 0 32px -6px hsl(var(--neon) / 0.75)' }}
      >
        <span className="pointer-events-none absolute inset-[-6px] rounded-full border border-dashed border-primary/35 animate-spin-slower" />
        <span className="pointer-events-none absolute inset-0 rounded-full bg-primary/10" />
        {open ? <X className="relative h-5 w-5 text-primary" /> : <Sparkles className="relative h-5 w-5 text-primary" />}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="NEXUS AI assistant"
          className="animate-rise-in fixed inset-x-3 bottom-24 z-50 flex max-h-[72vh] flex-col overflow-hidden rounded-md border border-primary/25 bg-[hsl(0_0%_3%)]/95 backdrop-blur-xl sm:inset-x-auto sm:right-5 sm:w-[380px]"
          style={{ boxShadow: '0 0 0 1px hsl(var(--neon) / 0.18), 0 40px 100px -50px rgb(var(--neon-glow) / 0.9)' }}
        >
          <div className="relative border-b border-white/[0.08] px-3.5 py-2.5">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px ig-neon-rule" />
            <div className="flex items-start gap-2">
              <div>
                <div className="font-display text-[12px] font-bold uppercase tracking-[0.2em] text-primary">Nexus AI</div>
                <div className="text-[10px] text-muted-foreground">Your intelligent platform assistant.</div>
              </div>
              <div className="ml-auto flex items-center gap-1">
                <button onClick={() => setShowHistory((v) => !v)} className="rounded-sm p-1.5 text-muted-foreground transition-colors hover:text-primary" aria-label="Conversation history">
                  <History className="h-3.5 w-3.5" />
                </button>
                <button onClick={startThread} className="rounded-sm p-1.5 text-muted-foreground transition-colors hover:text-primary" aria-label="New conversation">
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <button onClick={clearThread} className="rounded-sm p-1.5 text-muted-foreground transition-colors hover:text-primary" aria-label="Clear conversation">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setOpen(false)} className="rounded-sm p-1.5 text-muted-foreground transition-colors hover:text-primary" aria-label="Close assistant">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="mt-2 flex items-center gap-1.5">
              <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-muted-foreground">Context</span>
              <select
                value={caseId}
                onChange={(e) => setCaseId(e.target.value)}
                aria-label="Assistant case context"
                className="min-w-0 flex-1 rounded-sm border border-white/10 bg-background px-1.5 py-1 text-[10px] text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Whole dataset overview</option>
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>{c.case_code} — {c.title}</option>
                ))}
              </select>
            </div>
          </div>

          {showHistory && (
            <div className="ig-scroll max-h-[132px] overflow-y-auto border-b border-white/[0.08] px-3 py-2">
              <div className="mb-1 font-mono text-[8px] uppercase tracking-[0.14em] text-muted-foreground">Local conversations</div>
              {!store.threads.length && <p className="text-[10px] text-muted-foreground">No previous conversations yet.</p>}
              {store.threads.slice().reverse().map((t) => (
                <button
                  key={t.id}
                  onClick={() => selectThread(t.id)}
                  className={cn(
                    'mb-1 flex w-full items-center justify-between gap-2 rounded-sm border px-1.5 py-1 text-left text-[10px]',
                    t.id === store.activeId ? 'border-primary/40 bg-primary/10 text-primary' : 'border-white/[0.07] text-muted-foreground hover:border-primary/30'
                  )}
                >
                  <span className="truncate">{t.title || 'New conversation'}</span>
                  <span className="shrink-0 font-mono text-[8px]">{t.messages.length}</span>
                </button>
              ))}
            </div>
          )}

          <div className="ig-scroll flex-1 space-y-2.5 overflow-y-auto px-3 py-3">
            {!messages.length && (
              <div className="space-y-2">
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {selectedCase
                    ? `Grounded in the stored records of ${selectedCase.case_code}.`
                    : 'Ask about the platform or the synthetic dataset. Answers cite the stored records they use.'}
                </p>
                <div className="flex flex-wrap gap-1">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-sm border border-white/10 px-1.5 py-1 text-left text-[9px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => (
              <NexusMessage key={m.id} message={m} onAsk={send} />
            ))}

            {sending && (
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                <span className="font-mono uppercase tracking-[0.14em]">Reading stored records…</span>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-1.5 rounded-sm border border-destructive/40 bg-destructive/10 px-2 py-1.5 text-[10px] leading-relaxed text-destructive">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t border-white/[0.08] px-2.5 py-2">
            <div className="flex items-end gap-1.5">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                rows={1}
                placeholder="Ask NEXUS AI…"
                aria-label="Message NEXUS AI"
                className="ig-scroll max-h-[96px] min-h-[34px] flex-1 resize-none rounded-sm border border-white/10 bg-white/[0.02] px-2 py-2 text-[11px] leading-relaxed text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <button
                onClick={() => send()}
                disabled={sending || !input.trim()}
                aria-label="Send message"
                className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-sm border border-primary/40 bg-primary/15 text-primary transition-colors hover:bg-primary/25 disabled:opacity-40"
              >
                {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              </button>
            </div>
            <p className="mt-1.5 text-[8px] uppercase tracking-[0.14em] text-muted-foreground">
              Synthetic data only · answers cite stored records
            </p>
          </div>
        </div>
      )}
    </>
  );
}