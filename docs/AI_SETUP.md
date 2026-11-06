# GraftGym AI integration

The app now includes six AI workflows at `/ai`: enquiry summary/tagging, editable reply drafts, weekly enquiry insights, natural-language dashboard questions, member progress summaries, and trainer-reviewed workout drafts. GraftGym is selected by default when its website is present. All features use the existing Supabase sign-in and website access model.

## Activate

1. In the connected Supabase project's SQL Editor, run `supabase/migrations/202611010001_ai_fitness.sql` once. It assumes the existing `websites`, `submissions`, and `user_roles` tables are installed. It creates only new AI/fitness tables, indexes, RLS policies, and the usage reservation function. For projects with established Supabase migration tracking, use your normal migration workflow instead.
2. Add `OPENAI_API_KEY` to `.env.local` and the production server's secret settings. Do not paste keys into chat, commit them, or use a `NEXT_PUBLIC_` prefix. Set `OPENAI_MODEL` if needed; the default is `gpt-4.1-mini`, and the selected model must support the Responses API and strict JSON Schema output.
3. Restart the app (`npm run dev`) or deploy the updated app through your existing hosting process.
4. Sign in, open **AI Workspace**, select **GraftGym**, then open **AI settings**. Enter verified services, prices/currency, hours, booking information, and reply tone. Enable AI data sharing and save. Missing facts will not be supplied automatically.
5. A qualified trainer should approve the exercises permitted for workout drafts. For each member, create a profile, record their AI-processing permission, confirm trainer suitability, and record available equipment. Add workout logs for progress analysis.
6. Keep the existing SMTP settings configured to send reviewed drafts from the Responses email dialog. Draft generation does not send emails.

No API key or production database migration was supplied/applied during implementation. Generation is unavailable until activation; the app shows a setup message instead of synthetic AI results.

## Workflows

- **Enquiries:** choose an enquiry and click **Summarize & tag** or **Draft reply**. Only allowlisted enquiry message fields (`message`, `enquiry`, `comments`) are sent; arbitrary form fields are excluded. A message is required. Results include category, summary, follow-ups, and/or a draft.
- **Responses:** the AI link opens the exact website/enquiry. The GraftGym email dialog can generate a draft directly into its editable subject and body. Staff review and click Send. The email endpoint authenticates the caller, checks website access, and requires the recipient to match the selected submission.
- **Weekly insights:** available on the overview and in `/ai`. Generated on demand, comparing the last seven UTC calendar days with the prior seven. Counts and percent change are calculated in code. Themes use up to 30 recent messages, explicitly labeled as a sample. This is not a scheduled report.
- **Ask dashboard:** select a period of at most 366 days and ask about enquiry counts, daily trends, approximate keyword categories, or exact-phrase message matching. The AI creates a constrained date/filter/grouping plan; the server validates it, calculates counts, and supplies only those metrics to the answer model. No AI-generated SQL runs. Questions requiring revenue, sales conversion, health outcomes, or unsupported semantic filtering are identified as unsupported. Data sets over 10,000 submissions require a narrower interval. Category grouping uses documented keyword rules, separate from saved AI enquiry tags.
- **Members & workouts:** create/edit/delete private member profiles and add/delete exercise logs. The form exposes the latest 500 members and 500 workout entries for the selected member. Progress uses at most 1,000 entries from the past 90 days, with unique training dates and total minutes calculated for a 28-day window. Multiple exercises on one date count as one training day.
- **Workout drafts:** require AI permission, trainer suitability confirmation, and approved exercises matching recorded equipment. The server validates exercise IDs, days, set limits, and maximum exercise count per day. Plans are drafts requiring trainer review; they are not diagnoses or rehabilitation programs.
- **History:** latest 15 results per account/website, with timestamps, model and source metrics. Historical results can be cleared. Deleting a member or removing their AI permission removes saved results associated with that member. Profile deletion cascades to workout logs.

## Data and access

- The API authenticates every AI/fitness request and explicitly verifies website ownership or the existing `admin` role, even if existing website RLS is permissive.
- New member profiles, logs, AI settings and generated results are private to the account that creates them. Admins can access websites under the existing role model, but do not automatically share another account's new member records or AI history.
- Known email addresses and phone numbers are masked before provider calls. Member names and structured contact fields are excluded. This is data minimization, not guaranteed anonymization: free text may still contain personal data. Operators should collect permission and avoid entering unnecessary sensitive information.
- OpenAI requests use `store: false`. This does not imply zero provider retention; consult the provider's data policies for your account. The app stores generated results in Supabase until cleared.
- Results are cached per account, source content, website, settings, model, and prompt version for up to 24 hours. Source/settings changes invalidate cache keys. Database-backed atomic reservations allow 5 new requests per minute and 50 per rolling 24 hours per account across server instances. Failed provider attempts consume a reservation; cached results do not. An uncached dashboard question may make two provider calls under one reservation. Configure provider spending limits separately.
- No automatic outbound messages or writes to external fitness systems are performed.
- The overview's misleading conversion card has been renamed **Active Website Rate**. It measures active websites / total websites, not sales conversion.

## Implementation

- `src/lib/ai.ts`: server-only OpenAI Responses API adapter, strict JSON Schema output, timeout, provider error handling.
- `src/app/api/ai/route.ts`: six workflows, authorization, validated context, caching and usage reservations.
- `src/app/api/fitness/route.ts`: settings, member profiles, exercise logs, private result history.
- `src/lib/ai-metrics.ts`: deterministic counts, keyword categories, contact masking and progress metrics.
- `src/lib/ai-validation.ts`: input/output validation.
- `src/components/ai/`: workspace, overview card, enquiry actions, member/log forms and result rendering.
- `supabase/migrations/202611010001_ai_fitness.sql`: persistence, RLS and atomic usage reservations.

## Validation

Run `npm run typecheck`, `npm run test:ai`, and `npm run build`. AI tests use mocked database/provider boundaries and do not spend API credits. A live acceptance test after activation should verify: owner/admin boundaries with real accounts; denied cross-owner member access; settings persistence; enquiry tags/drafts; one count question against manually checked rows; weekly metrics; consent enforcement; a multi-exercise workout date; trainer-reviewed plan equipment; history deletion; and rate limiting under concurrent calls. SQL/RLS and provider behavior require those live checks; unit tests do not replace them.

Official API reference used: https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses

## Automatic follow-ups and conversational chatbot

The newer `/automation` workflows and **AI Workspace → Chatbot** are described in `docs/AUTOMATION_SETUP.md`. Apply the additional `202611020001_automation.sql` migration to enable their storage. Unlike the original manual draft workflow above, these new workflows can send messages in the background when the server sending flag, website settings and scheduler are configured. Automatic emails use verified templates; the chatbot uses OpenAI for read-only questions about the recorded automation data.

## Gemini alternative

For the current Google Gemini configuration and provider switching, see `docs/GEMINI_SETUP.md`. The active provider is selected by `AI_PROVIDER`; Gemini uses `GEMINI_API_KEY` and `GEMINI_MODEL`. The original OpenAI configuration remains supported when `AI_PROVIDER=openai` is selected explicitly.
