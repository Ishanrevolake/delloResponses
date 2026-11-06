import { AI_ACTIONS, EXERCISES, type AIAction, type AIResult } from './ai-types';
export class AppError extends Error { constructor(message: string, public status = 400) { super(message); } }
export function text(value: unknown, label: string, max = 2000, required = true): string {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new AppError(`Invalid ${label}.`);
  return value.trim();
}
export function integer(value: unknown, label: string, min: number, max: number) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) throw new AppError(`Invalid ${label}.`);
  return value;
}
export function uuid(value: unknown, label = 'ID') {
  const result = text(value, label, 36);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result)) throw new AppError(`Invalid ${label}.`);
  return result;
}
export function action(value: unknown): AIAction {
  if (!AI_ACTIONS.includes(value as AIAction)) throw new AppError('Unknown AI action.');
  return value as AIAction;
}
export function date(value: unknown, label: string) {
  const result = text(value, label, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || !Number.isFinite(Date.parse(result)) || new Date(result).toISOString().slice(0, 10) !== result) throw new AppError(`Invalid ${label}.`);
  return result;
}
export function validateResult(value: unknown): AIResult {
  if (!value || typeof value !== 'object') throw new AppError('AI returned an invalid result.', 502);
  const r = value as Record<string, unknown>;
  try {
    for (const key of ['title', 'summary', 'category', 'subject', 'body']) text(r[key], key, 12000, false);
    for (const key of ['highlights', 'next_steps']) {
      if (!Array.isArray(r[key]) || r[key].length > 20) throw new Error();
      for (const item of r[key]) text(item, key, 2000);
    }
    if (!Array.isArray(r.workouts) || r.workouts.length > 42) throw new Error();
    for (const item of r.workouts) {
      integer(item.day, 'day', 1, 6); integer(item.sets, 'sets', 1, 5);
      if (!EXERCISES.some(e => e.id === item.exercise_id)) throw new Error();
      text(item.reps, 'reps', 200); text(item.notes, 'notes', 1000, false);
    }
    return value as AIResult;
  } catch { throw new AppError('AI returned an invalid result. Please try again.', 502); }
}
