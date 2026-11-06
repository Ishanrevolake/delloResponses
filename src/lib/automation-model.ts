export const SENDER = 'info@graftgymncl.co.uk';
export const OWNER_EMAIL = 'liamruth96@hotmail.co.uk';
export interface AutomationSettings {
    website_id: string;
    enabled: boolean;
    enabled_at: string | null;
    owner_email: string;
    enquiry_days: number;
    weekly_enabled: boolean;
    followups_enabled: boolean;
    last_run_at?: string | null;
    last_run_error?: string | null;
}
export interface AutomationClient {
    id: string;
    website_id: string;
    source_submission_id: string | null;
    name: string;
    email: string;
    enquiry_at: string | null;
    status: 'open' | 'converted' | 'closed';
    do_not_contact: boolean;
    enquiry_followup_done?: boolean;
    membership_end_date: string | null;
    membership_status: 'active' | 'renewed' | 'cancelled';
}
export interface Delivery {
    id: string;
    website_id: string;
    client_id: string | null;
    kind: 'enquiry' | 'membership' | 'weekly';
    dedupe_key: string;
    recipient: string;
    subject: string;
    body: string;
    status: 'pending' | 'sending' | 'sent' | 'failed' | 'unknown' | 'cancelled';
    created_at: string;
    updated_at?: string;
    sent_at: string | null;
    error: string | null;
}
export const defaultAutomationSettings = (websiteId: string): AutomationSettings => ({ website_id: websiteId, enabled: false, enabled_at: null, owner_email: OWNER_EMAIL, enquiry_days: 4, weekly_enabled: true, followups_enabled: true });
export function emailAddress(value: unknown): value is string {
    return typeof value === 'string' && value.length <= 254 && /^[A-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)+$/i.test(value);
}
function londonParts(now: Date) {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23', minute: '2-digit', second: '2-digit', weekday: 'short' }).formatToParts(now);
    return Object.fromEntries(parts.map(p => [p.type, p.value]));
}
export function londonDate(now = new Date()) {
    const p = londonParts(now);
    return `${p.year}-${p.month}-${p.day}`;
}
export function addDays(date: string, count: number) { return new Date(Date.parse(date + 'T12:00:00Z') + count * 86400000).toISOString().slice(0, 10); }
export function londonTime(date: string, hour: number) {
    const target = Date.parse(`${date}T${String(hour).padStart(2, '0')}:00:00Z`);
    let time = target;
    for (let i = 0; i < 3; i++) {
        const p = londonParts(new Date(time));
        const displayed = Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`);
        time += target - displayed;
    }
    return new Date(time).toISOString();
}
export function weeklyWindow(now = new Date()) {
    const p = londonParts(now);
    if (p.weekday !== 'Fri' || Number(p.hour) < 9)
        return null;
    const day = londonDate(now);
    return { key: day, start: londonTime(addDays(day, -7), 9), end: londonTime(day, 9) };
}
export function dueFor(client: AutomationClient, kind: 'enquiry' | 'membership', settings: AutomationSettings) {
    if (kind === 'enquiry')
        return client.enquiry_at ? new Date(Date.parse(client.enquiry_at) + settings.enquiry_days * 86400000).toISOString() : null;
    return client.membership_end_date ? londonTime(addDays(client.membership_end_date, 1), 0) : null;
}
export function eligible(client: AutomationClient, kind: 'enquiry' | 'membership', settings: AutomationSettings, now = new Date()) {
    const due = dueFor(client, kind, settings);
    return Boolean(settings.enabled && settings.followups_enabled && settings.enabled_at && client.status !== 'closed' && (kind !== 'enquiry' || (client.status === 'open' && !client.enquiry_followup_done && !client.membership_end_date)) && !client.do_not_contact && emailAddress(client.email) && due && Date.parse(due) <= now.getTime() && Date.parse(due) >= Date.parse(settings.enabled_at) && (kind !== 'membership' || client.membership_status === 'active'));
}
export function eventKey(client: AutomationClient, kind: 'enquiry' | 'membership', settings: AutomationSettings) {
    return `${kind}:${client.id}:${dueFor(client, kind, settings)}`;
}
export function clientEmail(client: AutomationClient, kind: 'enquiry' | 'membership') {
    const greeting = client.name.trim() || 'there';
    const subject = kind === 'enquiry' ? 'Still interested in joining GraftGym?' : 'Your GraftGym membership renewal';
    const intro = kind === 'enquiry' ? 'We’re following up on your recent enquiry with GraftGym. Are you still interested in visiting or discussing your training goals?' : `Our records show that your GraftGym membership ended on ${client.membership_end_date}.`;
    return { subject, body: `Hi ${greeting},\n\n${intro}\n\n${kind === 'enquiry' ? 'Reply to this email and our team will help with the next steps.' : 'If you’d like to renew or discuss your options, reply to this email and our team will help.'}\n\nIf you’ve already spoken with us or renewed, please let us know so we can check your record.\n\nIf you do not want further follow-up emails, reply “stop”.\n\nBest wishes,\nThe GraftGym Team\n${SENDER}` };
}
export function weeklyMetrics(clients: AutomationClient[], deliveries: Delivery[], start: string, end: string, settings: AutomationSettings) {
    const inside = (value: string | null) => Boolean(value && Date.parse(value) >= Date.parse(start) && Date.parse(value) < Date.parse(end));
    return { periodStart: start, periodEnd: end, timezone: 'Europe/London', newEnquiries: clients.filter(c => inside(c.enquiry_at)).length,
        expiredEnquiries: clients.filter(c => inside(dueFor(c, 'enquiry', settings)) && c.status === 'open').length,
        expiredMemberships: clients.filter(c => inside(dueFor(c, 'membership', settings)) && c.membership_status === 'active' && c.status !== 'closed').length,
        sent: deliveries.filter(d => d.kind !== 'weekly' && d.status === 'sent' && inside(d.sent_at)).length,
        failed: deliveries.filter(d => d.kind !== 'weekly' && ['failed', 'unknown'].includes(d.status) && inside(d.updated_at || d.created_at)).length,
        pending: deliveries.filter(d => d.status === 'pending').length, uncertain: deliveries.filter(d => ['sending', 'unknown'].includes(d.status)).length };
}
export function weeklyEmail(metrics: ReturnType<typeof weeklyMetrics>) {
    return { subject: `GraftGym weekly dashboard summary — ${londonDate(new Date(metrics.periodEnd))}`,
        body: `Hi Liam,\n\nHere’s your GraftGym update for ${new Date(metrics.periodStart).toLocaleString('en-GB', { timeZone: 'Europe/London' })} to ${new Date(metrics.periodEnd).toLocaleString('en-GB', { timeZone: 'Europe/London' })} (UK time):\n\nNew enquiries: ${metrics.newEnquiries}\nEnquiries reaching follow-up age: ${metrics.expiredEnquiries}\nMemberships expired: ${metrics.expiredMemberships}\nFollow-up emails accepted by the mail server: ${metrics.sent}\nFailed or uncertain follow-ups: ${metrics.failed}\nPending emails: ${metrics.pending}\nDeliveries requiring review: ${metrics.uncertain}\n\nReview the dashboard’s Automation page for client records and delivery details. Expiry counts exclude records currently marked renewed, converted or closed. Mail-server acceptance does not confirm inbox delivery.\n\nGraftGym Dashboard\n${SENDER}` };
}
