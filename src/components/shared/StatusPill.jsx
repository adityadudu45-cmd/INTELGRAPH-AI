import { cn } from '@/lib/utils';

const TONES = {
  green: 'border-primary/40 bg-primary/10 text-[#ffd0da]',
  amber: 'border-primary/30 bg-white/[0.04] text-[#ffe1e7]',
  red: 'border-destructive/50 bg-destructive/10 text-[#ff9db0]',
  blue: 'border-border bg-white/[0.05] text-foreground/85',
  orange: 'border-primary/55 bg-primary/10 text-[#ffc2ce]',
  violet: 'border-crimson/70 bg-crimson/30 text-[#ffc9d5]',
  gray: 'border-border bg-muted/60 text-muted-foreground'
};

const MAP = {
  Draft: 'gray', Active: 'green', 'Under Review': 'amber', Completed: 'blue', Archived: 'gray',
  Confirmed: 'green', Unverified: 'amber', Suggested: 'violet', Rejected: 'red',
  CompletedDoc: 'green', Uploaded: 'gray', Processing: 'amber', 'Needs Review': 'amber', Failed: 'red',
  'Verified Sample Record': 'green', Unreviewed: 'gray', 'Needs Correction': 'orange',
  Administrator: 'orange', Analyst: 'blue', Viewer: 'gray',
  High: 'red', Medium: 'amber', Low: 'green', Critical: 'red',
  approved: 'green', pending: 'amber',
  Success: 'green', Failure: 'red', Denied: 'amber',
  Imported: 'green', 'Validation failed': 'red', Cancelled: 'gray',
  Acknowledged: 'green', Dismissed: 'gray', Approved: 'green', Corrected: 'blue',
  Final: 'green', Exact: 'green', Approximate: 'amber', Unknown: 'gray',
  AdministratorRole: 'orange', 'General note': 'gray', 'Review decision': 'amber',
  Conclusion: 'blue', 'AI conversation': 'violet', Individual: 'orange',
  Organization: 'blue', Vehicle: 'violet', Location: 'green',
  'Phone Identifier': 'gray', 'Transaction Identifier': 'amber', Event: 'violet'
};

export default function StatusPill({ value, tone, className }) {
  const t = TONES[tone || MAP[value] || 'gray'];
  return (
    <span className={cn('inline-flex items-center rounded-sm border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]', t, className)}>
      {value}
    </span>
  );
}