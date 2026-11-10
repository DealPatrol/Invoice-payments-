import { NextRequest, NextResponse } from 'next/server';
import { updateEstimateSchema } from '@/lib/field-schema';
import { jsonError } from '@/lib/field-http';
import { getEstimate, updateEstimate } from '@/lib/field-service';
import { getTenantId } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const userId = await getTenantId();
    const estimate = await getEstimate(userId, params.id);
    if (!estimate) return NextResponse.json({ error: 'Estimate not found' }, { status: 404 });
    return NextResponse.json({ estimate });
  } catch (error) {
    return jsonError(error, 'Failed to load estimate');
  }
}

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const userId = await getTenantId();
    const input = updateEstimateSchema.parse(await request.json());
    const estimate = await updateEstimate(userId, params.id, input);
    if (!estimate) return NextResponse.json({ error: 'Estimate not found' }, { status: 404 });
    return NextResponse.json({ estimate });
  } catch (error) {
    return jsonError(error, 'Failed to update estimate');
  }
}
