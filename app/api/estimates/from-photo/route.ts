import { NextRequest, NextResponse } from 'next/server';
import { photoEstimateSchema } from '@/lib/field-schema';
import { jsonError } from '@/lib/field-http';
import { createEstimateFromPhoto } from '@/lib/field-service';
import { getTenantId } from '@/lib/tenant';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const userId = await getTenantId();
    const input = photoEstimateSchema.parse(await request.json());
    const result = await createEstimateFromPhoto(userId, input);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return jsonError(error, 'Failed to draft an estimate');
  }
}
