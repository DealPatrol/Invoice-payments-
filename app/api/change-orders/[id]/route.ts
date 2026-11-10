import { NextRequest, NextResponse } from 'next/server';
import { changeStatusSchema } from '@/lib/field-schema';
import { jsonError } from '@/lib/field-http';
import { updateChangeOrderStatus } from '@/lib/field-service';
import { getTenantId } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const userId = await getTenantId();
    const input = changeStatusSchema.parse(await request.json());
    const estimate = await updateChangeOrderStatus(userId, params.id, input.status);
    return NextResponse.json({ estimate });
  } catch (error) {
    return jsonError(error, 'Failed to update change order');
  }
}
