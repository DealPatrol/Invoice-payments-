'use client';

import { use } from 'react';
import { JobDetail } from '@/components/field/JobDetail';

export default function JobPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  return <JobDetail id={params.id} />;
}
