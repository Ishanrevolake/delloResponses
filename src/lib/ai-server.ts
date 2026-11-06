import 'server-only';
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { AppError, uuid } from './ai-validation';

export async function requireUser() {
  const db = await createClient();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) throw new AppError('Please sign in to continue.', 401);
  return { db, user };
}
export type DB = Awaited<ReturnType<typeof requireUser>>['db'];
export async function requireWebsite(db: DB, userId: string, id: unknown) {
  const websiteId = uuid(id, 'website ID');
  const { data, error } = await db.from('websites').select('id,name,owner_id').eq('id', websiteId).maybeSingle();
  if (error) throw new AppError('Could not verify website access.', 500);
  if (!data) throw new AppError('Website not found.', 404);
  if (data.owner_id !== userId) {
    const { data: role } = await db.from('user_roles').select('role').eq('user_id', userId).maybeSingle();
    if (role?.role !== 'admin') throw new AppError('You cannot access this website.', 403);
  }
  return data;
}
export function dbError(error: { code?: string } | null) {
  if (!error) return;
  if (['42P01', 'PGRST205', 'PGRST202'].includes(error.code || '')) throw new AppError('AI database setup is required. Apply supabase/migrations/202611010001_ai_fitness.sql.', 503);
  throw new AppError('Could not read or save data. Please try again.', 500);
}
export function apiError(error: unknown) {
  if (error instanceof AppError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid JSON request.' }, { status: 400 });
  console.error('AI/fitness request failed:', error instanceof Error ? error.name : 'Unknown error');
  return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
}
export async function readBody(req: Request): Promise<Record<string, unknown>> {
  if (Number(req.headers.get('content-length')) > 30000) throw new AppError('Request is too large.', 413);
  const raw = await req.text();
  if (raw.length > 30000) throw new AppError('Request is too large.', 413);
  const body = JSON.parse(raw);
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new AppError('Invalid request.');
  return body;
}
