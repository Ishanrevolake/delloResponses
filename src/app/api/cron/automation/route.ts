import { NextResponse } from 'next/server';
import { timingSafeEqual, createHash } from 'node:crypto';
import { apiError } from '@/lib/ai-server';
import { AppError } from '@/lib/ai-validation';
import { automationDB, automationError, runAutomation } from '@/lib/automation-server';
import type { AutomationSettings } from '@/lib/automation-model';
export const maxDuration = 120;
export async function GET(req: Request) {
    try {
        const secret = process.env.CRON_SECRET;
        if (!secret)
            throw new AppError('Configure CRON_SECRET before running background automation.', 503);
        const expected = createHash('sha256').update(`Bearer ${secret}`).digest();
        const provided = createHash('sha256').update(req.headers.get('authorization') || '').digest();
        if (!timingSafeEqual(expected, provided))
            throw new AppError('Unauthorized.', 401);
        const db = automationDB();
        const { data, error } = await db.from('automation_settings').select('*').eq('enabled', true).order('last_run_at', { nullsFirst: true }).limit(10);
        automationError(error);
        const results = [];
        const started = Date.now();
        for (const settings of (data || []) as AutomationSettings[]) {
            if (Date.now() - started > 70000)
                break;
            try {
                results.push({ websiteId: settings.website_id, ...await runAutomation(db, settings) });
                const tracked = await db.from('automation_settings').update({ last_run_at: new Date().toISOString(), last_run_error: null }).eq('website_id', settings.website_id);
                automationError(tracked.error);
            }
            catch (e) {
                const message = e instanceof AppError ? e.message : 'Automation run failed; check server configuration.';
                results.push({ websiteId: settings.website_id, error: message });
                await db.from('automation_settings').update({ last_run_at: new Date().toISOString(), last_run_error: message }).eq('website_id', settings.website_id);
            }
        }
        if (results.some(r => 'error' in r))
            return NextResponse.json({ results }, { status: 500 });
        return NextResponse.json({ results }, { headers: { 'Cache-Control': 'no-store' } });
    }
    catch (e) {
        return apiError(e);
    }
}
