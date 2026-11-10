import { NextRequest, NextResponse } from 'next/server';
import { jsonError } from '@/lib/field-http';
import { convertEstimateToInvoice } from '@/lib/field-service';
import { getTenantId } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export async function POST(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const userId = await getTenantId();
    const result = await convertEstimateToInvoice(userId, params.id);
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error, 'Failed to convert estimate');
  }
}
