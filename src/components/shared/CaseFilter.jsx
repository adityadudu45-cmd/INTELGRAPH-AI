import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function CaseFilter({ cases, value, onChange, allLabel = 'All cases', className }) {
  return (
    <Select value={value || 'all'} onValueChange={onChange}>
      <SelectTrigger className={className || 'w-[220px]'}>
        <SelectValue placeholder={allLabel} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {cases.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.case_code} · {c.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}