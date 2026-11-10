import { NextRequest, NextResponse } from 'next/server';
import { changeOrderSchema } from '@/lib/field-schema';
import { jsonError } from '@/lib/field-http';
import { createChangeOrder } from '@/lib/field-service';
import { getTenantId } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const userId = await getTenantId();
    const input = changeOrderSchema.parse(await request.json());
    const estimate = await createChangeOrder(userId, params.id, input);
    return NextResponse.json({ estimate }, { status: 201 });
  } catch (error) {
    return jsonError(error, 'Failed to add a change order');
  }
}
