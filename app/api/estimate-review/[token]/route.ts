import { NextRequest, NextResponse } from 'next/server';
import { reviewSchema } from '@/lib/field-schema';
import { jsonError } from '@/lib/field-http';
import { getPublicEstimate, respondToReview } from '@/lib/field-service';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  try {
    const estimate = await getPublicEstimate(params.token);
    if (!estimate) return NextResponse.json({ error: 'Estimate not found' }, { status: 404 });
    return NextResponse.json({ estimate });
  } catch (error) {
    return jsonError(error, 'Failed to load estimate');
  }
}

export async function POST(request: NextRequest, props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  try {
    const input = reviewSchema.parse(await request.json());
    const estimate = await respondToReview(params.token, input);
    return NextResponse.json({ estimate });
  } catch (error) {
    return jsonError(error, 'Failed to update estimate');
  }
}
