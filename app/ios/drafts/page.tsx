import type { Metadata } from 'next';
import { OfflineDrafts } from '@/components/native/OfflineDrafts';

export const metadata: Metadata = { title: 'Offline drafts | Invoice Laboratory', robots: { index: false } };

export default function IosDraftsPage() {
  return <OfflineDrafts />;
}
