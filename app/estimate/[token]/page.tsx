'use client';

import { use } from 'react';
import { EstimateReview } from '@/components/field/EstimateReview';

export default function PublicEstimatePage(props: { params: Promise<{ token: string }> }) {
  const params = use(props.params);
  return <EstimateReview token={params.token} />;
}