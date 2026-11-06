import { AppError } from './ai-validation';
export interface SubmissionRecord { id: string; created_at: string; data: Record<string, unknown> }
export function redact(value: unknown, max = 2000) {
  return String(value ?? '').slice(0, max).replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]').replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, '[phone]');
}
export function messageOf(row: SubmissionRecord) {
  // Only known enquiry fields are sent; arbitrary form fields may contain personal information.
  return redact(row.data.message ?? row.data.enquiry ?? row.data.comments ?? '', 2500);
}
export function classify(message: string) {
  if (/personal train|\bpt\b|one.to.one/i.test(message)) return 'personal_training';
  if (/trial|free pass|try out/i.test(message)) return 'trial';
  if (/member|join|subscription/i.test(message)) return 'membership';
  if (/nutri|diet|meal/i.test(message)) return 'nutrition';
  return 'general';
}
export function aggregate(rows: SubmissionRecord[], start: string, end: string, search = '', groupBy = 'day') {
  const startMs = Date.parse(`${start}T00:00:00.000Z`), endMs = Date.parse(`${end}T23:59:59.999Z`);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs > endMs || endMs - startMs > 366 * 86400000) throw new AppError('Choose an ordered date range of at most 366 days.');
  const filtered = rows.filter(r => {
    const time = Date.parse(r.created_at);
    return time >= startMs && time <= endMs && (!search || messageOf(r).toLowerCase().includes(search.toLowerCase()));
  });
  const groups: Record<string, number> = {};
  for (const row of filtered) {
    const key = groupBy === 'category' ? classify(messageOf(row)) : row.created_at.slice(0, 10);
    groups[key] = (groups[key] || 0) + 1;
  }
  return {
    start, end, timezone: 'UTC', total: filtered.length, search, groupBy, groups,
    categoryMethod: 'Keyword rules; categories are approximate, not AI labels.',
    searchMethod: 'Case-insensitive exact phrase in the enquiry message; not semantic matching.'
  };
}
export function progressMetrics(logs: { performed_on: string; minutes: number }[], daysPerWeek: number, today: string) {
  const end = Date.parse(`${today}T23:59:59.999Z`), start = end - 28 * 86400000;
  const recent = logs.filter(l => Date.parse(l.performed_on) > start && Date.parse(l.performed_on) <= end);
  const trainingDays = new Set(recent.map(l => l.performed_on)).size;
  return {
    window: 'Last 28 days, UTC', trainingDays, targetTrainingDays: daysPerWeek * 4,
    adherencePercent: Math.round(trainingDays / (daysPerWeek * 4) * 100), minutes: recent.reduce((sum, l) => sum + l.minutes, 0), loggedExercises: recent.length
  };
}
