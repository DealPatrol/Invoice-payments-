'use client';

import { Suspense } from 'react';
import { PhotoEstimateForm } from '@/components/field/PhotoEstimateForm';

export default function NewEstimatePage() {
  return (
    <Suspense fallback={null}>
      <PhotoEstimateForm />
    </Suspense>
  );
}
