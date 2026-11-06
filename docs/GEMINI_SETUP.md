# Gemini provider setup

The dashboard now supports **Google Gemini** and **OpenAI**. All AI features share the selected provider: enquiry summaries, reply drafts, weekly insights, enquiry questions, training progress, workout drafts, and the automation chatbot.

The local private environment has been configured with:

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=your_private_key
GEMINI_MODEL=gemini-3.1-flash-lite
```

The actual key is stored only in ignored `.env.local`, not in this document or source code. The project name/number is not needed for API-key authentication. For a hosted dashboard, configure the same three variables in the hosting provider's private environment settings and redeploy. Never use a `NEXT_PUBLIC_` prefix for the API key.

## Behavior

- Gemini uses Google's `generateContent` endpoint with `x-goog-api-key` authentication and JSON Schema structured output. Model output still passes the dashboard's runtime validation.
- All routes check the selected provider's key. OpenAI is not required when Gemini is selected. There is **no automatic fallback** to OpenAI or another paid provider on missing credentials, quota errors, or outages.
- Cache keys include provider, model and prompt version, so old provider results do not silently substitute for new ones.
- Free-tier quotas depend on the project/model. If a quota is exhausted the API returns a clear error. API keys do not prove that an account is on the free billing tier; review the project's billing/quota settings in AI Studio. The code does not enable Google billing.
- The selected model was listed by the supplied key and passed a live structured-generation request. Google's older `gemini-2.5-flash` endpoint rejected new-user access, so it is not used as the default.
- Business settings show the active provider's name in the data-sharing text. Training consent refers to the selected AI provider. Review Google's free-tier data-use terms before processing client data.
- Automatic follow-ups and owner report emails continue to use verified templates and calculated data. They do not require Gemini or OpenAI, and the sending flag remains independent of the AI provider.

## Tests

```powershell
npm.cmd run typecheck
npm.cmd run test:ai
npm.cmd run test:automation
npm.cmd run build
```

`test:ai` includes both provider adapters, credential isolation, quota handling, truncated/blocked output, runtime validation and existing dashboard workflow tests. Automated tests mock external calls and do not spend API quota.

For an explicitly requested live check with a running local app:

```powershell
npm.cmd run test:ai:live
```

This script uses the configured provider and consumes its quota. It creates a temporary synthetic account/site, AI settings, an enquiry, training profile/logs, and a membership contact. It calls all six AI actions plus the chatbot through the actual authenticated HTTP routes and verifies calculated metrics. Requests are paced to respect the dashboard's per-minute limit. Cleanup runs in `finally` and removes the temporary website/account. It does not send emails, enable automation, alter real client records, or print credentials. Use only with the intended local server and database. The temporary site has an `ai-smoke-*.example.invalid` domain and must not be retained if a test process is externally interrupted.

Official references:
- https://ai.google.dev/gemini-api/docs/generate-content/structured-output
- https://ai.google.dev/gemini-api/docs/pricing

## Verified integration results

Live checks against the configured Gemini project passed for all seven workflows: enquiry summary/tagging, reply draft, weekly insights, enquiry count questions, member progress summaries, workout drafts, and the multi-turn dashboard chatbot. Checks used isolated synthetic records through the authenticated local API. The test accounts and websites were removed after each run; no SMTP messages were sent.

The live checks exposed two compatibility issues, both corrected: historical logs could be copied into the workout field of a progress summary, and Gemini rejected a large explicitly bounded workout-array schema. Each action now has a dedicated schema; non-workout actions require an empty workout array. Workout array size and all exercise/day/set restrictions remain enforced by application validation even where the provider schema omits the large array bound.

Automated coverage includes 36 AI/provider tests and 31 automation tests. The selected provider never automatically falls back to a paid OpenAI request.
