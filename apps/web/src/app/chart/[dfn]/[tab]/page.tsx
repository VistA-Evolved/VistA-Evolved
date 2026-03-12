import { redirect } from 'next/navigation';

interface ChartPageProps {
  params: Promise<{ dfn: string; tab: string }>;
}

const TAB_ALIASES: Record<string, string> = {
  'cover-sheet': 'cover',
  'dc-summaries': 'dcsumm',
  'dc-summ': 'dcsumm',
  'ai-assist': 'aiassist',
  'tele-health': 'telehealth',
  'med-rec': 'medrec',
  'med-reconciliation': 'medrec',
  'e-prescribing': 'erx',
  eprescribing: 'erx',
};

function normalizeTabSlug(tab: string): string {
  return TAB_ALIASES[tab] ?? tab;
}

export default async function ChartPage({ params }: ChartPageProps) {
  const { dfn, tab } = await params;
  redirect(`/cprs/chart/${encodeURIComponent(dfn)}/${normalizeTabSlug(tab)}`);
}
