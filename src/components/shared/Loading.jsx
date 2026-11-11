export default function Loading({ label = 'Loading records…', rows = 3 }) {
  return (
    <div className="space-y-2 p-4" role="status" aria-live="polite">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-muted border-t-primary" />
        {label}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-9 animate-pulse rounded-md bg-muted/40" />
      ))}
    </div>
  );
}