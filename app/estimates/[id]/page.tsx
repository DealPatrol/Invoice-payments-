'use client';

import { use } from 'react';
import { EstimateDetail } from '@/components/field/EstimateDetail';

export default function EstimatePage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  return <EstimateDetail id={params.id} />;
}
