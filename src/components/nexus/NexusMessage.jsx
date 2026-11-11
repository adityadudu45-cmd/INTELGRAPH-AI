import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, CornerDownRight } from 'lucide-react';

const STATUS_COPY = {
  partial: 'Partial context only',
  unavailable: 'Not in the stored records'
};

export default function NexusMessage({ message, onAsk }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  if (isUser) {
    return (
      <div className="animate-rise-in flex justify-end">
        <div className="max-w-[85%] rounded-sm rounded-br-none border border-primary/35 bg-primary/[0.12] px-3 py-2 text-[12px] leading-relaxed text-foreground">
          {message.text}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-rise-in">
      <div className="rounded-sm rounded-bl-none border border-white/[0.09] bg-white/[0.025] px-3 py-2.5">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="font-display text-[9px] uppercase tracking-[0.2em] text-primary">Nexus AI</span>
          {STATUS_COPY[message.status] && (
            <span className="rounded-sm border border-amber-400/30 bg-amber-400/[0.08] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.08em] text-amber-300">
              {STATUS_COPY[message.status]}
            </span>
          )}
          <button onClick={copy} className="ml-auto text-muted-foreground transition-colors hover:text-primary" aria-label="Copy answer">
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>
        <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-foreground/90">{message.text}</p>

        {message.citations?.length > 0 && (
          <div className="mt-2.5 border-t border-white/[0.07] pt-2">
            <div className="mb-1 font-mono text-[8px] uppercase tracking-[0.14em] text-muted-foreground">Source records</div>
            <div className="flex flex-wrap gap-1">
              {message.citations.map((c) => (
                <Link
                  key={c.id}
                  to={c.to}
                  title={`${c.kind} · ${c.id}`}
                  className="flex max-w-[190px] items-center gap-1 rounded-sm border border-primary/25 bg-primary/[0.07] px-1.5 py-0.5 text-[9px] text-primary transition-colors hover:border-primary/60"
                >
                  <span className="truncate">{c.label}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {message.followUps?.length > 0 && onAsk && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {message.followUps.map((f) => (
            <button
              key={f}
              onClick={() => onAsk(f)}
              className="flex items-center gap-1 rounded-sm border border-white/10 px-1.5 py-1 text-left text-[9px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              <CornerDownRight className="h-2.5 w-2.5 shrink-0" />
              <span className="max-w-[190px] truncate">{f}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}