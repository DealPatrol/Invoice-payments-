import { NextRequest, NextResponse } from 'next/server';
import { createJobSchema } from '@/lib/field-schema';
import { jsonError } from '@/lib/field-http';
import { createJob, listJobs } from '@/lib/field-service';
import { getTenantId } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userId = await getTenantId();
    return NextResponse.json(await listJobs(userId));
  } catch (error) {
    return jsonError(error, 'Failed to list jobs');
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getTenantId();
    const input = createJobSchema.parse(await request.json());
    const job = await createJob(userId, input);
    return NextResponse.json({ job, mode: process.env.DEMO_MODE === 'true' ? 'demo' : 'postgres' }, { status: 201 });
  } catch (error) {
    return jsonError(error, 'Failed to create job');
  }
}
