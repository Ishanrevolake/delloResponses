export const AI_ACTIONS = ['summary', 'reply', 'insights', 'ask', 'progress', 'workout'] as const;
export type AIAction = typeof AI_ACTIONS[number];
export interface AIResult {
  title: string; summary: string; category: string;
  highlights: string[]; next_steps: string[]; subject: string; body: string;
  workouts: { day: number; exercise_id: string; sets: number; reps: string; notes: string }[];
}
export interface SavedAIResult { result: AIResult; generatedAt: string; cached: boolean; model: string; evidence?: Record<string, unknown> }
export interface AISettings {
  business_name: string; services: string; prices: string; opening_hours: string; tone: string;
  ai_enabled: boolean; approved_exercises: string[];
}
export const DEFAULT_AI_SETTINGS: AISettings = { business_name: '', services: '', prices: '', opening_hours: '', tone: 'Friendly and professional', ai_enabled: false, approved_exercises: [] };
export const EXERCISES = [
  { id: 'walk', name: 'Comfortable walking', equipment: 'none' },
  { id: 'chair_squat', name: 'Chair squat', equipment: 'chair' },
  { id: 'wall_pushup', name: 'Wall push-up', equipment: 'wall' },
  { id: 'bird_dog', name: 'Bird dog', equipment: 'mat' },
  { id: 'glute_bridge', name: 'Glute bridge', equipment: 'mat' },
  { id: 'band_row', name: 'Resistance band row', equipment: 'resistance band' },
  { id: 'dumbbell_row', name: 'Supported dumbbell row', equipment: 'dumbbell and bench' },
] as const;
export interface Member {
  id: string; website_id: string; name: string; goal: string; experience: string;
  equipment: string; days_per_week: number; session_minutes: number;
  ai_consent: boolean; trainer_clearance: boolean; created_at: string;
}
export interface WorkoutLog { id: string; member_id: string; performed_on: string; exercise: string; minutes: number; sets: number; reps: number; weight_kg: number | null; notes: string }
