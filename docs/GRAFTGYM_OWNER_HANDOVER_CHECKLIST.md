# GraftGym API owner handover checklist

Use this checklist before sending the client their API key. The client-facing guide is `docs/GRAFTGYM_CLIENT_HANDOVER.md`; the private bundle is `private-handoff/GraftGym-API-Client-Handoff.zip`.

## Before sending the bundle

1. Open the Vercel project that serves `dash.dellodigital.com`.
2. Add/import the values from `.env.vercel-client-api` into the project's private **Production** environment. This is your server configuration file and must not be given to the client. Preserve existing project settings.
3. Deploy the updated repository source containing the three `src/app/api/v1/` routes and `src/lib/client-api.ts`. Redeploying an old source revision does not add the new routes.
4. If Vercel rejects the existing five-minute automation cron on your current plan, resolve that scheduling configuration separately before deploying. The read-only client API itself does not need a cron job. Do not activate automatic email sending just to enable the client API.
5. Confirm the deployed API using the existing client key: valid requests to `/submissions`, `/memberships` and `/analytics` must return HTTP 200 with JSON. Use the backend example or the private Postman environment in the bundle.
6. Confirm that a request without a key returns HTTP 401 and a POST request to a read-only endpoint returns HTTP 405. Confirm there are no HTML login pages in the API responses.
7. Check that the returned records belong to GraftGym and membership dates have been entered where needed. An empty membership list can be correct when no end dates are recorded.
8. Update the activation-status paragraph in the client guide, `START_HERE.txt` and the email template after production verification. They currently say deployment is pending because the live endpoint returned 404 on 6 November 2026. Rebuild the ZIP if files change.
9. Send the private bundle only to the authorized client/developer through a private sharing method. Use `docs/GRAFTGYM_CLIENT_EMAIL_TEMPLATE.txt` as the covering message, updating the activation statement to match the verified state. No message has been sent automatically.

## Files you may send to the client

The ZIP contains only a client guide, introductory text, the scoped client credentials, a Postman collection/environment and a backend example. The Postman environment and `credentials.env` contain the real scoped key. Treat the entire ZIP as private. Do not post it in a public repository or on the website.

## Files you must retain privately

Do not send `.env.local` or `.env.vercel-client-api`. They contain your server credentials and configuration. Do not send Supabase service-role, Vercel account, SMTP, Gemini or OpenAI keys. The client needs only the scoped GraftGym read key.

## Ask the client to confirm

- Their developer is calling from a private backend/serverless function.
- All three endpoints return HTTP 200 after activation.
- Pagination and empty lists work normally.
- Only authorized dashboard users can view the fetched contact information.
- They have recorded the 6 November 2027 initial expiration date and arranged who will request a replacement.

## Ongoing ownership

If the key needs revocation, remove/change `CLIENT_API_KEY_HASH` on the production server and redeploy. For replacement, coordinate the new server hash and the client's backend key update; the current setup supports one active integration key. The local handoff documentation describes the existing key, so regenerate the private bundle if the key is rotated.
