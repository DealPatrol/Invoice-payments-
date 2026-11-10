import { NextRequest, NextResponse } from 'next/server';
import { manualEstimateSchema } from '@/lib/field-schema';
import { jsonError } from '@/lib/field-http';
import { createManualEstimate, listEstimates } from '@/lib/field-service';
import { getTenantId } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const userId = await getTenantId();
    const { searchParams } = new URL(request.url);
    const result = await listEstimates(userId, {
      status: searchParams.get('status') || undefined,
      search: searchParams.get('search') || undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error, 'Failed to list estimates');
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getTenantId();
    const input = manualEstimateSchema.parse(await request.json());
    const estimate = await createManualEstimate(userId, input);
    return NextResponse.json({ estimate }, { status: 201 });
  } catch (error) {
    return jsonError(error, 'Failed to create estimate');
  }
}
