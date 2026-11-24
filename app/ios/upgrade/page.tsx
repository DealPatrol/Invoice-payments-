import type { Metadata } from 'next';
import { NativePaywall } from '@/components/native/NativePaywall';

export const metadata: Metadata = { title: 'Invoice Lab Pro', robots: { index: false } };

export default function IosUpgradePage() {
  return <NativePaywall />;
}
