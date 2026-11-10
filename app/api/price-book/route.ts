import { NextRequest, NextResponse } from 'next/server';
import { jsonError } from '@/lib/field-http';
import { getShopSettings, saveShopSettings } from '@/lib/shop-settings';
import { getTenantId } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userId = await getTenantId();
    return NextResponse.json(await getShopSettings(userId));
  } catch (error) {
    return jsonError(error, 'Failed to load your price book');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getTenantId();
    const body = await request.json();
    return NextResponse.json(await saveShopSettings(userId, body));
  } catch (error) {
    return jsonError(error, 'Failed to save your price book');
  }
}
