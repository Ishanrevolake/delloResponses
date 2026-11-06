# GraftGym email automation and chatbot

The `/automation` page adds automatic client follow-ups and the owner's weekly report. The chatbot is available there and in **AI Workspace → Chatbot**. Sending uses verified templates and explicit dates, not AI guesses. OpenAI is used for conversational questions and explanations; SMTP handles outgoing mail.

## Configured behavior

- Sender and reply address: **info@graftgymncl.co.uk**.
- Owner report recipient: **liamruth96@hotmail.co.uk** (editable in Automation settings).
- Report: **Friday at 09:00, Europe/London**. The worker uses GMT/BST automatically and a Friday catch-up window after 09:00. A report still pending after Friday is cancelled, rather than delivered on another day.
- Enquiry follow-up: after **four full 24-hour days** by default, matching the old `days > 3` threshold. The setting is editable from 1–30 days. This is an enquiry age rule, not proof a trial ended.
- Membership reminder: an explicit end date is required. A membership is valid through that date in UK time; a reminder becomes due at the following UK midnight.
- No historical bulk send: expiry events before the most recent activation time are excluded. Pause/re-enable starts a new eligibility period.
- Converted enquiries, closed clients, manually handled enquiries and opt-outs are suppressed. Converted clients can still receive membership reminders if their membership is active and has ended. Renewed/cancelled membership status suppresses the old membership reminder. To track the next cycle, enter the new end date and set membership status to active.
- One eligible client per email address is selected per run, with membership reminders prioritized. A current active membership or any opted-out duplicate suppresses obsolete duplicate records. No new automated follow-up is sent to an address attempted in the past seven days. Queued/in-progress attempts also block duplicates.
- Each report week and each client expiry event has a persistent unique key. Atomic database claims prevent two workers from sending the same queued record. Claims also serialize duplicate-recipient records.
- SMTP acceptance is recorded as `sent`, not confirmed inbox delivery. Definite authentication/envelope rejections are `failed`. Other errors or interrupted claims are `unknown`; these events are **not retried automatically** because SMTP cannot guarantee exactly-once delivery. Review the mailbox before making a manual follow-up.
- Replying “stop” is mentioned in client messages. Inbox parsing is not implemented: staff must mark **Do not contact** when such a reply is received.

## Activation

1. Apply `supabase/migrations/202611020001_automation.sql` once in the existing project's SQL Editor. The earlier AI migration must already exist. The implementation check found the AI tables present and the new SUPABASE_SERVICE_ROLE_KEYautomation tables missing.
2. Add `` to `.env.local` and the production server's private environment settings. Use the project's backend/service-role key. This privileged key must never be sent to the browser or prefixed with `NEXT_PUBLIC_`.
3. A private `CRON_SECRET` was generated in the local `.env.local` without printing it. Copy it into the deployment's private environment settings. The scheduler must send `Authorization: Bearer <CRON_SECRET>`. Keep the value secret.
4. SMTP settings already exist locally. They must authorize sending **from info@graftgymncl.co.uk**. Verify the mailbox/provider configuration before activation; credentials were not exercised in implementation tests.
5. Restart the app, open `/automation`, and choose **Clients & memberships → Sync enquiries**. Existing submissions with an email address are imported without overwriting later staff edits. Worker runs also sync new enquiries. Source `email_sent` and `do_not_contact` flags suppress contact.
6. Record membership dates and statuses explicitly. These cannot be inferred reliably from old enquiry timestamps or arbitrary form fields. Membership clients can be added independently, or dates can be added to imported enquiry clients. These contact records are separate from training profiles in AI Workspace.
7. Review **Email previews** and the owner address. Enable the website's automation switches and save. `AUTOMATION_SEND_ENABLED=false` is the server-level preview default: scheduled runs can sync records and report due counts, but do not enqueue or send messages.
8. Configure a persistent scheduler using one option below. Set `AUTOMATION_SEND_ENABLED=true` in the server environment and restart/redeploy to activate sending. There is no separate conversational approval required; these settings are the operational controls.

The code was implemented and tested with mocked SMTP/provider/database boundaries. The new migration, live SMTP delivery, live RLS behavior and production scheduler have not been activated or verified. No real emails were sent.

## Scheduler options

### Vercel hosting

Automatic scheduling is currently disabled: `vercel.json` declares no cron jobs. This keeps deployments compatible with Vercel Hobby and leaves automation paused. The authenticated `GET /api/cron/automation` endpoint remains available for a separately configured scheduler. If automation is re-enabled later, a five-minute Vercel schedule requires a plan that supports that frequency, or an external scheduler. Daily Hobby polling cannot reliably provide Friday 09:00 UK delivery.

### Supabase Cron or another hosted scheduler

See `supabase/automation_schedule.sql.example`. Enable Supabase Cron and `pg_net`, store the dashboard base URL and cron token in Vault, then install the example schedule. The URL must be the deployed, reachable dashboard, not localhost. Alternatively, schedule an authenticated GET every five minutes with your hosting service. Do not configure two schedulers unnecessarily; database claims protect against overlap, but one scheduler is sufficient.

### Local testing

Keep the app running in one terminal:

```powershell
npm.cmd run dev
```

Start the local poller in another terminal:

```powershell
npm.cmd run automation:local
```

It reads `.env.local` and checks the endpoint every minute. Optional `AUTOMATION_BASE_URL` defaults to `http://127.0.0.1:3000`. The laptop and both processes must stay running; this is not a production scheduler. Ctrl+C stops the poller. It never prints the cron token.

## Dashboard controls

- **Settings:** sender, recipient, four-day rule, weekly schedule, enable/pause switches, worker configuration and last run status.
- **Clients & memberships:** import enquiries, add/edit membership clients, record renewals, close enquiries and suppress contact.
- **Email previews:** actual template bodies, owner summary snapshot, and up to 50 currently eligible unqueued messages. Viewing previews sends nothing.
- **Delivery history:** latest 100 queued/sent/failed/uncertain/cancelled messages, body, timestamps and error information. Records are visible to the site's owner and existing admins.
- **Chatbot:** multi-turn questions about new enquiries, expired enquiries/memberships, pending unqueued follow-ups and delivery problems. Queries are constrained and read-only. Counts are computed in code; identity/contact fields are displayed directly in the UI and excluded from the model's facts. User-entered messages and prior conversation are still sent to OpenAI. Existing per-account AI data-sharing permission and rate limits apply. Conversation is kept in the current tab only.

Lists show up to 500 clients, 100 deliveries and 50 chatbot matches. Counts and worker processing use paginated source data and refuse sets of 20,000 or more rows instead of silently truncating. Worker invocations enqueue up to 100 new client events and attempt up to three deliveries; the weekly report has send priority. Larger queues drain over subsequent runs. The chatbot does not alter records or send email. It reports only imported enquiries and explicitly recorded membership dates, not data from an external membership system.

## Validation commands

```powershell
npm.cmd run typecheck
npm.cmd run test:ai
npm.cmd run test:automation
npm.cmd run build
```

Before live use, verify actual website-owner/admin boundaries and cron authorization, sync a test enquiry, inspect the two client templates and owner report, record a test membership/renewal, verify UK local scheduling, and check one controlled SMTP delivery. Confirm suppression and queue history with real database records. Automated tests cover DST transitions, date boundaries, old backlog suppression, duplicate addresses, opt-outs/renewals, claim/send behavior, SMTP uncertainty, source recipient changes, endpoint permissions and chatbot query handling.

Official scheduler references: https://vercel.com/docs/cron-jobs/manage-cron-jobs and https://supabase.com/docs/guides/functions/schedule-functions

The chatbot can use Google Gemini as an alternative to OpenAI. See `docs/GEMINI_SETUP.md`. Changing the AI provider does not activate automatic email sending.
