import { NextRequest, NextResponse } from 'next/server';

/** Proxy to Frankfurter (ECB data, no API key) — https://www.frankfurter.app */
export async function GET(request: NextRequest) {
  const base = request.nextUrl.searchParams.get('base') || 'USD';
  try {
    const res = await fetch(
      `https://api.frankfurter.app/latest?from=${encodeURIComponent(base)}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) throw new Error('Rate service unavailable');
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'Could not fetch exchange rates' },
      { status: 502 }
    );
  }
}
