import { NextResponse } from 'next/server';
import { requireUser, requireWebsite, readBody, apiError } from '@/lib/ai-server';
import { AppError, text, integer, date, uuid } from '@/lib/ai-validation';
import { defaultAutomationSettings, emailAddress, SENDER, type AutomationSettings } from '@/lib/automation-model';
import { automationError, requireGraft, previewAutomation, syncEnquiries } from '@/lib/automation-server';
export async function GET(req: Request) {
    try {
        const { db, user } = await requireUser();
        const site = await requireWebsite(db, user.id, new URL(req.url).searchParams.get('websiteId'));
        requireGraft(site.name);
        const { data, error } = await db.from('automation_settings').select('*').eq('website_id', site.id).maybeSingle();
        automationError(error);
        const settings: AutomationSettings = data || defaultAutomationSettings(site.id);
        return NextResponse.json({ settings, ...await previewAutomation(db, settings), configuration: { sender: SENDER, backgroundReady: Boolean(process.env.CRON_SECRET && process.env.SUPABASE_SERVICE_ROLE_KEY), sendingEnabled: process.env.AUTOMATION_SEND_ENABLED === 'true', smtpReady: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) } }, { headers: { 'Cache-Control': 'no-store' } });
    }
    catch (e) {
        return apiError(e);
    }
}
export async function POST(req: Request) {
    try {
        const { db, user } = await requireUser();
        const body = await readBody(req);
        const site = await requireWebsite(db, user.id, body.websiteId);
        requireGraft(site.name);
        if (body.operation === 'sync')
            return NextResponse.json({ imported: await syncEnquiries(db, site.id) });
        if (body.operation === 'settings') {
            const s = body.settings as Record<string, unknown>;
            if (!s || typeof s.enabled !== 'boolean' || typeof s.weekly_enabled !== 'boolean' || typeof s.followups_enabled !== 'boolean' || !emailAddress(s.owner_email))
                throw new AppError('Invalid automation settings.');
            const previous = await db.from('automation_settings').select('*').eq('website_id', site.id).maybeSingle();
            automationError(previous.error);
            const value = { website_id: site.id, enabled: s.enabled, owner_email: s.owner_email, enquiry_days: integer(s.enquiry_days, 'enquiry follow-up days', 1, 30), weekly_enabled: s.weekly_enabled, followups_enabled: s.followups_enabled,
                enabled_at: s.enabled ? (previous.data?.enabled ? previous.data.enabled_at : new Date().toISOString()) : previous.data?.enabled_at || null, updated_at: new Date().toISOString() };
            const result = await db.from('automation_settings').upsert(value);
            automationError(result.error);
        }
        else if (body.operation === 'client') {
            const c = body.client as Record<string, unknown>;
            if (!c || !emailAddress(c.email) || !['open', 'converted', 'closed'].includes(String(c.status)) || !['active', 'renewed', 'cancelled'].includes(String(c.membership_status)) || typeof c.do_not_contact !== 'boolean' || typeof c.enquiry_followup_done !== 'boolean')
                throw new AppError('Invalid client record.');
            const end = c.membership_end_date ? date(c.membership_end_date, 'membership end date') : null;
            const record = { website_id: site.id, name: text(c.name, 'client name', 120), email: c.email.trim().toLowerCase(), status: c.status, do_not_contact: c.do_not_contact, enquiry_followup_done: c.enquiry_followup_done, membership_end_date: end, membership_status: c.membership_status };
            const query = c.id ? db.from('automation_clients').update(record).eq('website_id', site.id).eq('id', uuid(c.id)) : db.from('automation_clients').insert(record);
            const result = await query.select('id').single();
            automationError(result.error);
        }
        else
            throw new AppError('Unknown operation.');
        return NextResponse.json({ success: true });
    }
    catch (e) {
        return apiError(e);
    }
}
