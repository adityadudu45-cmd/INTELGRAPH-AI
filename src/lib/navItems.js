import {
  LayoutDashboard, FolderKanban, UploadCloud, Boxes, Network, GitBranch,
  Activity, Clock, FileSearch, Archive, FileText, ScrollText
} from 'lucide-react';

export const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }]
  },
  {
    label: 'Investigate',
    items: [
      { to: '/cases', label: 'Case Workspace', icon: FolderKanban },
      { to: '/ingestion', label: 'Data Ingestion', icon: UploadCloud },
      { to: '/entities', label: 'Entity Explorer', icon: Boxes },
      { to: '/documents', label: 'Document Intelligence', icon: FileSearch }
    ]
  },
  {
    label: 'Analyse',
    items: [
      { to: '/graph', label: 'Network Graph', icon: Network },
      { to: '/relationships', label: 'Relationship Analysis', icon: GitBranch },
      { to: '/patterns', label: 'Pattern Analysis', icon: Activity },
      { to: '/timeline', label: 'Timeline Analysis', icon: Clock }
    ]
  },
  {
    label: 'Record',
    items: [
      { to: '/evidence', label: 'Evidence Library', icon: Archive },
      { to: '/reports', label: 'Reports', icon: FileText },
      { to: '/audit', label: 'Audit Logs', icon: ScrollText }
    ]
  }
];

export const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);