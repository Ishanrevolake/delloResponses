import { isAIConfigured, modelName, providerLabel } from '@/lib/ai-config';
import { NextResponse } from 'next/server';
import { requireUser, requireWebsite, dbError, apiError, readBody } from '@/lib/ai-server';
import { AppError, uuid, text, integer, date } from '@/lib/ai-validation';
import { DEFAULT_AI_SETTINGS, EXERCISES } from '@/lib/ai-types';

export async function GET(req: Request) {
  try {
    const { db, user } = await requireUser();
    const url = new URL(req.url);
    const site = await requireWebsite(db, user.id, url.searchParams.get('websiteId'));
    const [settings, members, history] = await Promise.all([
      db.from('ai_business_settings').select('*').eq('owner_id', user.id).eq('website_id', site.id).maybeSingle(),
      db.from('fitness_members').select('*').eq('owner_id', user.id).eq('website_id', site.id).order('created_at', { ascending: false }).limit(500),
      db.from('ai_results').select('id,action,result,created_at,model,evidence').eq('owner_id', user.id).eq('website_id', site.id).order('created_at', { ascending: false }).limit(15),
    ]);
    dbError(settings.error); dbError(members.error); dbError(history.error);
    let logs: unknown[] = [];
    const memberId = url.searchParams.get('memberId');
    if (memberId) uuid(memberId);
    if (memberId && members.data?.some(m => m.id === memberId)) {
      const result = await db.from('fitness_workout_logs').select('*').eq('owner_id', user.id).eq('member_id', memberId).order('performed_on', { ascending: false }).limit(500);
      dbError(result.error); logs = result.data || [];
    }
    return NextResponse.json({
      settings: settings.data || { ...DEFAULT_AI_SETTINGS, business_name: site.name }, members: members.data, logs, history: history.data,
      configured: isAIConfigured(), model: modelName(), providerLabel: providerLabel()
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) { return apiError(e); }
}
export async function POST(req: Request) {
  try {
    const { db, user } = await requireUser();
    const body = await readBody(req);
    const site = await requireWebsite(db, user.id, body.websiteId);
    if (body.operation === 'settings') {
      const s = body.settings as Record<string, unknown>;
      if (!s || typeof s.ai_enabled !== 'boolean' || !Array.isArray(s.approved_exercises) || s.approved_exercises.some(id => !EXERCISES.some(e => e.id === id))) throw new AppError('Invalid AI settings.');
      const { error } = await db.from('ai_business_settings').upsert({
        owner_id: user.id, website_id: site.id,
        business_name: text(s.business_name, 'business name', 120), services: text(s.services, 'services', 4000, false),
        prices: text(s.prices, 'prices', 2000, false), opening_hours: text(s.opening_hours, 'opening hours', 1000, false),
        tone: text(s.tone, 'tone', 200), ai_enabled: s.ai_enabled, approved_exercises: s.approved_exercises,
      }, { onConflict: 'owner_id,website_id' });
      dbError(error);
    } else if (body.operation === 'member') {
      const m = body.member as Record<string, unknown>;
      if (!m || !['beginner', 'intermediate', 'advanced'].includes(String(m.experience)) || typeof m.ai_consent !== 'boolean' || typeof m.trainer_clearance !== 'boolean') throw new AppError('Invalid member profile.');
      const record = {
        owner_id: user.id, website_id: site.id, name: text(m.name, 'name', 120), goal: text(m.goal, 'goal', 1000),
        experience: m.experience, equipment: text(m.equipment, 'equipment', 1000, false), days_per_week: integer(m.days_per_week, 'training days', 1, 6),
        session_minutes: integer(m.session_minutes, 'session minutes', 10, 120), ai_consent: m.ai_consent, trainer_clearance: m.trainer_clearance
      };
      if (m.id && !m.ai_consent) {
        const removed = await db.from('ai_results').delete().eq('owner_id', user.id).eq('website_id', site.id).eq('evidence->>memberId', uuid(m.id)); dbError(removed.error);
      }
      const query = m.id ? db.from('fitness_members').update(record).eq('id', uuid(m.id)).eq('owner_id', user.id).eq('website_id', site.id) : db.from('fitness_members').insert(record);
      const result = await query.select().single(); dbError(result.error);
      return NextResponse.json({ success: true, member: result.data });
    } else if (body.operation === 'log') {
      const memberId = uuid(body.memberId);
      const { data: member, error: memberError } = await db.from('fitness_members').select('id').eq('id', memberId).eq('owner_id', user.id).eq('website_id', site.id).maybeSingle();
      dbError(memberError); if (!member) throw new AppError('Member not found.', 404);
      const l = body.log as Record<string, unknown>; if (!l) throw new AppError('Invalid workout log.');
      const performedOn = date(l.performed_on, 'workout date');
      if (performedOn > new Date().toISOString().slice(0, 10)) throw new AppError('Workout date cannot be in the future.');
      if (l.weight_kg !== null && (typeof l.weight_kg !== 'number' || !Number.isFinite(l.weight_kg) || l.weight_kg < 0 || l.weight_kg > 1000)) throw new AppError('Invalid weight.');
      const result = await db.from('fitness_workout_logs').insert({
        owner_id: user.id, member_id: memberId,
        performed_on: performedOn, exercise: text(l.exercise, 'exercise', 120), minutes: integer(l.minutes, 'minutes', 1, 300),
        sets: integer(l.sets, 'sets', 0, 20), reps: integer(l.reps, 'reps', 0, 1000), weight_kg: l.weight_kg, notes: text(l.notes, 'notes', 1000, false)
      });
      dbError(result.error);
    } else if (body.operation === 'delete-log') {
      const logId = uuid(body.logId);
      const { data: log, error } = await db.from('fitness_workout_logs').select('id,member_id').eq('id', logId).eq('owner_id', user.id).maybeSingle();
      dbError(error); if (!log) throw new AppError('Log not found.', 404);
      const { data: member } = await db.from('fitness_members').select('id').eq('id', log.member_id).eq('website_id', site.id).eq('owner_id', user.id).maybeSingle();
      if (!member) throw new AppError('Member not found.', 404);
      const deleted = await db.from('fitness_workout_logs').delete().eq('id', log.id).eq('owner_id', user.id); dbError(deleted.error);
    } else if (body.operation === 'delete-member') {
      const removed = await db.from('ai_results').delete().eq('owner_id', user.id).eq('website_id', site.id).eq('evidence->>memberId', uuid(body.memberId)); dbError(removed.error);
      const result = await db.from('fitness_members').delete().eq('id', uuid(body.memberId)).eq('website_id', site.id).eq('owner_id', user.id); dbError(result.error);
    } else if (body.operation === 'clear-history') {
      const result = await db.from('ai_results').delete().eq('website_id', site.id).eq('owner_id', user.id); dbError(result.error);
    } else { throw new AppError('Unknown operation.'); }
    return NextResponse.json({ success: true });
  } catch (e) { return apiError(e); }
}
