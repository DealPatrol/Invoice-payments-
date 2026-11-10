import { NextRequest, NextResponse } from 'next/server';
import { applyChangeSchema } from '@/lib/field-schema';
import { jsonError } from '@/lib/field-http';
import { applyChangeOrder } from '@/lib/field-service';
import { getTenantId } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const userId = await getTenantId();
    const input = applyChangeSchema.parse(await request.json());
    const result = await applyChangeOrder(userId, params.id, input.mode);
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error, 'Failed to apply change order');
  }
}
