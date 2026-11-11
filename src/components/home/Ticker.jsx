const ITEMS = [
  'AI Intelligence',
  'Network Analysis',
  'Data Visualisation',
  'Entity Exploration',
  'Relationship Mapping',
  'Pattern Detection',
  'Evidence Intelligence'
];

function Row() {
  return (
    <div className="flex shrink-0 items-center">
      {ITEMS.map((item) => (
        <div key={item} className="flex items-center">
          <span className="whitespace-nowrap font-display text-[11px] font-semibold uppercase tracking-[0.26em] text-foreground/85 sm:text-[12px]">
            {item}
          </span>
          <span className="mx-5 inline-block h-1 w-1 rotate-45 bg-primary shadow-[0_0_10px_hsl(var(--neon))] sm:mx-7" />
        </div>
      ))}
    </div>
  );
}

export default function Ticker() {
  return (
    <div className="relative overflow-hidden border-y border-primary/25 bg-background">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-background to-transparent" />
      <div className="group flex w-max animate-marquee py-3.5 hover:[animation-play-state:paused]">
        <Row />
        <Row />
        <Row />
        <Row />
      </div>
    </div>
  );
}