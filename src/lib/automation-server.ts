import 'server-only';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { AppError } from './ai-validation';
import type { DB } from './ai-server';
import { SENDER, emailAddress, clientEmail, eligible, eventKey, dueFor, weeklyWindow, weeklyMetrics, weeklyEmail, type AutomationClient, type AutomationSettings, type Delivery } from './automation-model';
export function automationDB() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key)
        throw new AppError('Background automation needs SUPABASE_SERVICE_ROLE_KEY in the server environment.', 503);
    return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
export function automationError(error: {
    code?: string;
} | null) {
    if (!error)
        return;
    if (['42P01', 'PGRST205', 'PGRST202', '42703', 'PGRST204'].includes(error.code || ''))
        throw new AppError('Apply supabase/migrations/202611020001_automation.sql to set up automation.', 503);
    throw new AppError('Could not read or save automation records.', 500);
}
export function requireGraft(name: string) {
    if (name.toLowerCase().replace(/[^a-z]/g, '') !== 'graftgym')
        throw new AppError('These email automations are configured for GraftGym only.', 400);
}
// Never silently truncate counts. Preview and chatbot refuse oversized sets.
export async function allRows<T>(db: DB, table: string, websiteId: string): Promise<T[]> {
    const rows: T[] = [];
    for (let offset = 0; offset < 20000; offset += 1000) {
        const { data, error } = await db.from(table).select('*').eq('website_id', websiteId).order('id').range(offset, offset + 999);
        automationError(error);
        rows.push(...(data || []));
        if (!data || data.length < 1000)
            return rows;
    }
    throw new AppError('This website has over 20,000 records. Archive old records before running this operation.', 413);
}
export async function syncEnquiries(db: DB, websiteId: string) {
    const submissions = await allRows<{
        id: string;
        created_at: string;
        data: Record<string, unknown>;
    }>(db, 'submissions', websiteId);
    let imported = 0;
    for (let offset = 0; offset < submissions.length; offset += 500) {
        const batch = submissions.slice(offset, offset + 500).filter(s => emailAddress(s.data?.email));
        if (!batch.length)
            continue;
        const { data, error } = await db.from('automation_clients').upsert(batch.map(s => ({ website_id: websiteId, source_submission_id: s.id,
            name: String(s.data.fullName || s.data.name || '').slice(0, 120), email: String(s.data.email).trim().toLowerCase(), enquiry_at: s.created_at,
            enquiry_followup_done: s.data.email_sent === true, do_not_contact: s.data.do_not_contact === true,
        })), { onConflict: 'website_id,source_submission_id', ignoreDuplicates: true }).select('id');
        automationError(error);
        imported += data?.length || 0;
        // Preserve manual edits; only propagate source flags that suppress contact.
        const contacted = batch.filter(s => s.data.email_sent === true).map(s => s.id);
        const blocked = batch.filter(s => s.data.do_not_contact === true).map(s => s.id);
        if (contacted.length) {
            const r = await db.from('automation_clients').update({ enquiry_followup_done: true }).eq('website_id', websiteId).in('source_submission_id', contacted);
            automationError(r.error);
        }
        if (blocked.length) {
            const r = await db.from('automation_clients').update({ do_not_contact: true }).eq('website_id', websiteId).in('source_submission_id', blocked);
            automationError(r.error);
        }
    }
    return imported;
}
export function candidates(clients: AutomationClient[], settings: AutomationSettings, now = new Date()) {
    const blocked = new Set(clients.filter(c => c.do_not_contact).map(c => c.email.toLowerCase()));
    const seen = new Set<string>();
    const currentMembers = new Set(clients.filter(other => other.membership_end_date && other.membership_status === 'active' && other.status !== 'closed' && Date.parse(dueFor(other, 'membership', settings)!) > now.getTime()).map(other => other.email.toLowerCase()));
    return clients.flatMap(c => (['membership', 'enquiry'] as const).filter(kind => eligible(c, kind, settings, now)).map(kind => ({ client: c, kind, key: eventKey(c, kind, settings), ...clientEmail(c, kind) })))
        .sort((a, b) => a.kind === b.kind ? String(b.client.membership_end_date || b.client.enquiry_at).localeCompare(String(a.client.membership_end_date || a.client.enquiry_at)) : a.kind === 'membership' ? -1 : 1)
        .filter(c => {
        const email = c.client.email.toLowerCase();
        if (blocked.has(email) || seen.has(email))
            return false;
        if (currentMembers.has(email))
            return false;
        seen.add(email);
        return true;
    });
}
export function pendingCandidates(clients: AutomationClient[], deliveries: Delivery[], settings: AutomationSettings, now = new Date()) {
    const keys = new Set(deliveries.map(d => d.dedupe_key));
    const recentRecipients = new Set(deliveries.filter(d => d.kind !== 'weekly' && d.status !== 'cancelled' && (Date.parse(d.sent_at || d.created_at) > now.getTime() - 7 * 86400000 || ['pending', 'sending'].includes(d.status))).map(d => d.recipient.toLowerCase()));
    return candidates(clients, settings, now).filter(c => !keys.has(c.key) && !recentRecipients.has(c.client.email.toLowerCase()));
}
export async function previewAutomation(db: DB, settings: AutomationSettings, now = new Date()) {
    const [clients, deliveries] = await Promise.all([allRows<AutomationClient>(db, 'automation_clients', settings.website_id), allRows<Delivery>(db, 'automation_deliveries', settings.website_id)]);
    const due = pendingCandidates(clients, deliveries, { ...settings, enabled: true, enabled_at: settings.enabled_at || now.toISOString() }, now);
    const window = weeklyWindow(now);
    const end = window?.end || now.toISOString();
    const start = window?.start || new Date(now.getTime() - 7 * 86400000).toISOString();
    const metrics = weeklyMetrics(clients, deliveries, start, end, settings);
    return { due: due.slice(0, 50).map(c => ({ clientId: c.client.id, recipient: c.client.email, kind: c.kind, subject: c.subject, body: c.body })), totalDue: due.length,
        weekly: { recipient: settings.owner_email, ...weeklyEmail(metrics), metrics }, currentWeekScheduled: Boolean(window), sender: SENDER,
        clients: clients.slice(0, 500), clientCount: clients.length, deliveries: deliveries.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 100) };
}
async function enqueue(db: DB, value: Record<string, unknown>) {
    const { error } = await db.from('automation_deliveries').upsert(value, { onConflict: 'website_id,dedupe_key', ignoreDuplicates: true });
    automationError(error);
}
export function mailTransport() {
    const { SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_PORT, SMTP_SECURE } = process.env;
    const port = Number(SMTP_PORT || 465);
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !Number.isInteger(port) || port < 1 || port > 65535)
        throw new AppError('Configure SMTP_HOST, SMTP_USER, SMTP_PASS and a valid SMTP_PORT before sending.', 503);
    return nodemailer.createTransport({ host: SMTP_HOST, port, secure: SMTP_SECURE ? SMTP_SECURE === 'true' : port === 465, auth: { user: SMTP_USER, pass: SMTP_PASS }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000 });
}
export async function runAutomation(db: DB, settings: AutomationSettings, now = new Date()) {
    if (!settings.enabled)
        return { queued: 0, processed: 0 };
    const { data: site, error: siteError } = await db.from('websites').select('name').eq('id', settings.website_id).single();
    automationError(siteError);
    if (!site)
        throw new AppError('Website not found.', 404);
    requireGraft(site.name);
    await syncEnquiries(db, settings.website_id);
    const [clients, deliveries] = await Promise.all([allRows<AutomationClient>(db, 'automation_clients', settings.website_id), allRows<Delivery>(db, 'automation_deliveries', settings.website_id)]);
    let queued = 0, processed = 0;
    if (process.env.AUTOMATION_SEND_ENABLED !== 'true')
        return { queued, processed, previewOnly: true, due: pendingCandidates(clients, deliveries, settings, now).length };
    const due = pendingCandidates(clients, deliveries, settings, now).slice(0, 100);
    if (due.length) {
        const result = await db.from('automation_deliveries').upsert(due.map(c => ({ website_id: settings.website_id, client_id: c.client.id, kind: c.kind, dedupe_key: c.key, recipient: c.client.email, subject: c.subject, body: c.body })), { onConflict: 'website_id,dedupe_key', ignoreDuplicates: true });
        automationError(result.error);
        queued = due.length;
    }
    // Friday 09:00 UK time; a Friday catch-up window accommodates temporary downtime.
    const window = weeklyWindow(now);
    if (settings.weekly_enabled && window && settings.enabled_at && Date.parse(window.end) >= Date.parse(settings.enabled_at)) {
        const metrics = weeklyMetrics(clients, deliveries, window.start, window.end, settings);
        await enqueue(db, { website_id: settings.website_id, kind: 'weekly', dedupe_key: `weekly:${window.key}`, recipient: settings.owner_email, ...weeklyEmail(metrics) });
    }
    const transport = mailTransport(); // Fail before claiming any messages when configuration is missing.
    try {
        // Stale claims are uncertain, never retried automatically: SMTP has no exactly-once guarantee.
        const stale = await db.from('automation_deliveries').update({ status: 'unknown', error: 'Worker interrupted; check mailbox before cancelling or contacting again.' }).eq('website_id', settings.website_id).eq('status', 'sending').lt('claimed_at', new Date(now.getTime() - 10 * 60000).toISOString());
        automationError(stale.error);
        for (let i = 0; i < 3; i++) {
            const { data, error } = await db.rpc('claim_automation_delivery', { site: settings.website_id });
            automationError(error);
            const delivery = data?.[0] as Delivery | undefined;
            if (!delivery)
                break;
            const { data: current, error: currentError } = await db.from('automation_settings').select('*').eq('website_id', settings.website_id).single();
            automationError(currentError);
            let valid = Boolean(current?.enabled && emailAddress(delivery.recipient));
            let client: AutomationClient | null = null;
            if (delivery.kind === 'weekly')
                valid = valid && current.weekly_enabled && current.owner_email === delivery.recipient && delivery.dedupe_key === `weekly:${weeklyWindow(new Date())?.key}`;
            else {
                const record = await db.from('automation_clients').select('*').eq('id', delivery.client_id!).eq('website_id', settings.website_id).maybeSingle();
                automationError(record.error);
                client = record.data;
                valid = valid && Boolean(client && client.email === delivery.recipient && eligible(client, delivery.kind, current, new Date()) && eventKey(client, delivery.kind, current) === delivery.dedupe_key);
                if (valid && client) {
                    const related = await db.from('automation_clients').select('*').eq('website_id', settings.website_id).eq('email', delivery.recipient);
                    automationError(related.error);
                    valid = candidates(related.data || [], current, new Date()).some(candidate => candidate.client.id === client!.id && candidate.kind === delivery.kind && candidate.key === delivery.dedupe_key);
                }
                // Recheck manual email flags immediately before delivery, not just at the start of the run.
                if (valid && client?.source_submission_id) {
                    const source = await db.from('submissions').select('data').eq('id', client.source_submission_id).eq('website_id', settings.website_id).maybeSingle();
                    automationError(source.error);
                    const sourceData = source.data?.data;
                    valid = Boolean(sourceData && sourceData.do_not_contact !== true && String(sourceData.email || '').trim().toLowerCase() === delivery.recipient.toLowerCase() && (delivery.kind !== 'enquiry' || sourceData.email_sent !== true));
                }
            }
            if (!valid) {
                const cancelled = await db.from('automation_deliveries').update({ status: 'cancelled', error: 'Client status, settings or recipient changed before delivery.' }).eq('id', delivery.id);
                automationError(cancelled.error);
                continue;
            }
            try {
                const info = await transport.sendMail({ from: `"GraftGym" <${SENDER}>`, replyTo: SENDER, to: delivery.recipient, subject: delivery.subject, text: delivery.body, messageId: `<${delivery.id}@graftgymncl.co.uk>` });
                if (!info.accepted?.length)
                    throw new Error('No recipient accepted');
                const saved = await db.from('automation_deliveries').update({ status: 'sent', sent_at: new Date().toISOString(), provider_id: String(info.messageId), error: null }).eq('id', delivery.id);
                automationError(saved.error);
            }
            catch (error) {
                const code = (error as {
                    code?: string;
                    responseCode?: number;
                }).code;
                const definite = ['EAUTH', 'EENVELOPE'].includes(code || '');
                const update = await db.from('automation_deliveries').update({ status: definite ? 'failed' : 'unknown', error: definite ? 'Mail server rejected this send. Check SMTP configuration and recipient.' : 'Delivery outcome uncertain. Check the sender mailbox before contacting this client again.' }).eq('id', delivery.id).eq('status', 'sending');
                automationError(update.error);
            }
            processed++;
        }
    }
    finally {
        transport.close();
    }
    return { queued, processed };
}
