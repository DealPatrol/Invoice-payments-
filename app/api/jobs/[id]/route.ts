import { NextRequest, NextResponse } from 'next/server';
import { updateJobSchema } from '@/lib/field-schema';
import { jsonError } from '@/lib/field-http';
import { getJob, updateJob } from '@/lib/field-service';
import { getTenantId } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const userId = await getTenantId();
    const job = await getJob(userId, params.id);
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    return NextResponse.json({ job });
  } catch (error) {
    return jsonError(error, 'Failed to load job');
  }
}

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const userId = await getTenantId();
    const input = updateJobSchema.parse(await request.json());
    const job = await updateJob(userId, params.id, input);
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    return NextResponse.json({ job });
  } catch (error) {
    return jsonError(error, 'Failed to update job');
  }
}
