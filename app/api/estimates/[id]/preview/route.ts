import { NextRequest, NextResponse } from 'next/server';
import { jsonError } from '@/lib/field-http';
import { refreshPreview } from '@/lib/field-service';
import { getTenantId } from '@/lib/tenant';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const userId = await getTenantId();
    const estimate = await refreshPreview(userId, params.id);
    return NextResponse.json({ estimate });
  } catch (error) {
    return jsonError(error, 'Failed to build a preview');
  }
}
