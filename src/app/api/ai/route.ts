import { requireAIConfigured, aiProvider } from '@/lib/ai-config';
import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { requireUser, requireWebsite, dbError, apiError, readBody, type DB } from '@/lib/ai-server';
import { AppError, action, uuid, text, date, validateResult } from '@/lib/ai-validation';
import { generateJSON, generateResult, modelName, PROMPT_VERSION } from '@/lib/ai';
import { aggregate, messageOf, progressMetrics, redact, type SubmissionRecord } from '@/lib/ai-metrics';
import { EXERCISES } from '@/lib/ai-types';
export const maxDuration = 120;
const day = (offset: number) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

async function loadRows(db: DB, websiteId: string, start: string, end: string) {
  const rows: SubmissionRecord[] = [];
  for (let offset = 0;offset < 10000;offset += 1000) {
    const { data, error } = await db.from('submissions').select('id,data,created_at')
      .eq('website_id', websiteId).gte('created_at', `${start}T00:00:00Z`).lte('created_at', `${end}T23:59:59.999Z`)
      .order('created_at', { ascending: false }).order('id').range(offset, offset + 999);
    dbError(error); rows.push(...(data || []));
    if (!data || data.length < 1000) return rows;
  }
  const { count, error } = await db.from('submissions').select('id', { count: 'exact', head: true }).eq('website_id', websiteId)
    .gte('created_at', `${start}T00:00:00Z`).lte('created_at', `${end}T23:59:59.999Z`);
  dbError(error);
  if ((count || 0) > rows.length) throw new AppError('This period has over 10,000 submissions. Choose a smaller date range.');
  return rows;
}
export async function POST(req: Request) {
  try {
    const { db, user } = await requireUser();
    const body = await readBody(req), task = action(body.action);
    const site = await requireWebsite(db, user.id, body.websiteId);
    const { data: settings, error: settingsError } = await db.from('ai_business_settings').select('*').eq('owner_id', user.id).eq('website_id', site.id).maybeSingle();
    dbError(settingsError);
    if (!settings?.ai_enabled) throw new AppError('Enable AI data sharing for this website in AI settings first.', 403);
    requireAIConfigured();
    const business = { business_name: settings.business_name, services: settings.services, prices: settings.prices, opening_hours: settings.opening_hours, tone: settings.tone };
    let context: Record<string, unknown> = { business }, evidence: Record<string, unknown> = {};
    let instructions = '';
    let rows: SubmissionRecord[] = [];
    const today = day(0);
    let start = task === 'insights' ? day(-13) : date(body.start || day(-29), 'start date');
    let end = task === 'insights' ? today : date(body.end || today, 'end date');
    let question = '';
    if (task === 'summary' || task === 'reply') {
      const id = uuid(body.submissionId, 'submission ID');
      const { data: row, error } = await db.from('submissions').select('id,data,created_at').eq('id', id).eq('website_id', site.id).maybeSingle();
      dbError(error); if (!row) throw new AppError('Submission not found.', 404);
      const message = messageOf(row);
      if (!message) throw new AppError('This submission has no enquiry message to analyze.');
      context = { business, enquiry: { message, submittedAt: row.created_at } };
      evidence = { submissionId: id, submittedAt: row.created_at };
      instructions = task === 'summary' ? 'Summarize this enquiry, assign a category, and list missing information and suggested follow-up actions.' : 'Draft a reply for staff review. Fill subject and body. Use a neutral greeting without a name. Answer using only business facts and ask for missing information. Never claim the message has been sent or a booking confirmed.';
    } else if (task === 'insights' || task === 'ask') {
      aggregate([], start, end); // Validate interval before database work.
      if (end > today) throw new AppError('The end date cannot be in the future.');
      rows = await loadRows(db, site.id, start, end);
      if (task === 'insights') {
        const current = aggregate(rows, day(-6), today, '', 'category');
        const previous = aggregate(rows, day(-13), day(-7), '', 'category');
        const changePercent = previous.total === 0 ? null : Math.round((current.total - previous.total) / previous.total * 1000) / 10;
        evidence = { current, previous, changePercent, sampleSize: Math.min(rows.length, 30), sampleMethod: '30 most recent messages; themes may not represent every enquiry.' };
        context = { business, metrics: evidence, recentMessageSample: rows.slice(0, 30).map(messageOf) };
        instructions = 'Explain the current seven-day enquiry metrics compared with the previous seven days. Counts and percentage change in metrics are authoritative. Category counts use keyword rules, not AI classification. A null changePercent means no meaningful percentage baseline. Distinguish measured facts, sample themes, and suggestions. Do not infer sales conversions, member churn or revenue.';
      } else {
        question = text(body.question, 'question', 1000);
        // Cache input includes all authorized source records so changed data invalidates answers.
        context = {
          business, question, availableStart: start, availableEnd: end,
          source: rows.map(r => ({ id: r.id, created_at: r.created_at, message: messageOf(r) }))
        };
        instructions = 'Answer the question using only the calculated metrics and their stated scope. Explain any exact-phrase search or approximate category limitations. If the question requires unavailable data, clearly state that it cannot be answered. No sales conversion or health claims.';
      }
    } else {
      const { data: member, error } = await db.from('fitness_members').select('*').eq('id', uuid(body.memberId, 'member ID')).eq('website_id', site.id).eq('owner_id', user.id).maybeSingle();
      dbError(error); if (!member) throw new AppError('Member not found.', 404);
      if (!member.ai_consent) throw new AppError('Record the member’s permission for AI processing before continuing.', 403);
      const { data: logs, error: logError } = await db.from('fitness_workout_logs').select('performed_on,exercise,minutes,sets,reps,weight_kg,notes').eq('member_id', member.id).eq('owner_id', user.id)
        .gte('performed_on', day(-89)).lte('performed_on', today).order('performed_on', { ascending: false }).limit(1001);
      dbError(logError); if ((logs?.length || 0) > 1000) throw new AppError('Too many workout logs in the last 90 days to summarize.');
      if (task === 'progress' && !logs?.length) throw new AppError('Add workout logs before generating a progress summary.');
      const profile = { goal: redact(member.goal), experience: member.experience, equipment: redact(member.equipment), daysPerWeek: member.days_per_week, sessionMinutes: member.session_minutes };
      evidence = { memberId: member.id, metrics: progressMetrics(logs || [], member.days_per_week, today), logCount: logs?.length || 0 };
      context = { profile, metrics: evidence.metrics, logs: (logs || []).map(l => ({ ...l, notes: redact(l.notes), exercise: redact(l.exercise) })) };
      if (task === 'progress') instructions = 'Summarize workout consistency and logged training progress. Adherence is unique training dates versus the 28-day target, not number of exercise entries. Do not infer fat loss, strength gains or injury status without direct supporting measurements. Suggest practical questions for the trainer.';
      else {
        if (!member.trainer_clearance) throw new AppError('A trainer must confirm suitability before creating a workout draft.', 403);
        const equipment = member.equipment.toLowerCase();
        const approved = EXERCISES.filter(e => settings.approved_exercises.includes(e.id) && (e.equipment === 'none' || e.equipment.split(' and ').every(part => equipment.includes(part))));
        if (!approved.length) throw new AppError('Approve exercises in AI settings that match the member’s recorded equipment before creating a workout draft.');
        context = { ...context, approvedExerciseLibrary: approved };
        instructions = 'Create a conservative one-week workout DRAFT for trainer review, respecting experience, equipment, daysPerWeek and sessionMinutes. Use ONLY approvedExerciseLibrary exercise IDs and available equipment. Day numbers are session indices 1 through daysPerWeek, not calendar weekdays. Each day must have 1-7 exercises, sets 1-5, simple reps or duration, rest notes and a warm-up/cool-down suggestion. Do not prescribe rehabilitation, maximal lifts or exercise through pain. If equipment or suitability is insufficient, return no workouts and explain. Explicitly label this as requiring trainer review before use.';
      }
    }
    const model = modelName();
    const cacheKey = createHash('sha256').update(JSON.stringify({ version: PROMPT_VERSION, provider: aiProvider(), task, websiteId: site.id, context, evidence, model })).digest('hex');
    const { data: cached, error: cacheError } = await db.from('ai_results').select('*').eq('owner_id', user.id).eq('cache_key', cacheKey).gte('created_at', new Date(Date.now() - 86400000).toISOString()).maybeSingle();
    dbError(cacheError);
    if (cached) return NextResponse.json({ result: validateResult(cached.result), generatedAt: cached.created_at, model: cached.model, cached: true, evidence: cached.evidence });
    const { data: allowed, error: limitError } = await db.rpc('reserve_ai_request'); dbError(limitError);
    if (!allowed) throw new AppError('AI limit reached: 5 requests per minute and 50 per 24 hours. Please try again later.', 429);
    if (task === 'ask') {
      const schema = { type: 'object', additionalProperties: false, properties: { start: { type: 'string' }, end: { type: 'string' }, search: { type: 'string' }, groupBy: { type: 'string', enum: ['day', 'category'] }, supported: { type: 'boolean' } }, required: ['start', 'end', 'search', 'groupBy', 'supported'] };
      const plan = await generateJSON('Translate the question into a read-only enquiry count query. Return start/end YYYY-MM-DD within availableStart/availableEnd (inclusive), exact phrase search (empty for all), groupBy day or category. Dates are UTC. Use supplied today for relative dates. supported=false for questions requiring other data (revenue, conversions, members, health), semantic classifications or complex predicates that an exact-phrase search cannot represent. Never produce SQL.', { question, today, availableStart: start, availableEnd: end }, schema) as Record<string, unknown>;
      const queryStart = date(plan.start, 'query start'), queryEnd = date(plan.end, 'query end');
      if (queryStart < start || queryEnd > end || queryStart > queryEnd) throw new AppError('That question is outside the selected date range. Expand the date range and try again.');
      if (typeof plan.supported !== 'boolean' || !['day', 'category'].includes(String(plan.groupBy))) throw new AppError('AI returned an invalid query plan.', 502);
      const search = text(plan.search, 'search', 100, false);
      evidence = plan.supported ? aggregate(rows, queryStart, queryEnd, search, String(plan.groupBy)) : { supported: false, reason: 'This question needs data or filtering beyond enquiry counts. Available: date counts, daily trends, keyword categories and exact-phrase message search.' };
      start = queryStart; end = queryEnd;
      context = { question, metrics: evidence }; // Never send the full source dataset to the answer model.
    }
    const result = await generateResult(instructions, context, task);
    if (task === 'workout') {
      const profile = context.profile as { daysPerWeek: number };
      const library = context.approvedExerciseLibrary as { id: string }[];
      if (result.workouts.some(w => !library.some(e => e.id === w.exercise_id) || w.day > profile.daysPerWeek || result.workouts.filter(item => item.day === w.day).length > 7)) throw new AppError('The workout draft used an unapproved exercise or exceeded the member’s schedule. Please try again.', 502);
    }
    const generatedAt = new Date().toISOString();
    const { error: saveError } = await db.from('ai_results').upsert({ owner_id: user.id, website_id: site.id, cache_key: cacheKey, action: task, model, result, evidence, created_at: generatedAt }, { onConflict: 'owner_id,cache_key' });
    dbError(saveError);
    return NextResponse.json({ result, generatedAt, model, cached: false, evidence });
  } catch (e) { return apiError(e); }
}
