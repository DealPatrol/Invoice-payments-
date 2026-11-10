import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { UnauthorizedError } from './tenant';

export function jsonError(error: unknown, fallback: string) {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof ZodError) {
    return NextResponse.json({ error: error.flatten() }, { status: 400 });
  }
  const message = error instanceof Error ? error.message : fallback;
  const notFound = /not found/i.test(message);
  const conflict = /cannot|already|approve|before|instead|different client|declined/i.test(message);
  const badRequest = /too large|add a photo|choose a client|give the job|name the change|quantity|unit price|description|valid date|photos must|attach up to/i.test(message);
  const status = notFound ? 404 : badRequest ? 400 : conflict ? 409 : 500;
  return NextResponse.json({ error: message }, { status });
}
