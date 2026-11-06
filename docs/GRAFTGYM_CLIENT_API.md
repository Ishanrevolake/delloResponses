# GraftGym client data API

A read-only API key has been created for the GraftGym dashboard integration. The full key is in the ignored private file `.env.graftgym-client`. The app server stores only its SHA-256 hash, the verified GraftGym website ID and an expiration time in `.env.local`. The initial key expires on **6 November 2027**. No database migration is required for this single-client setup.

## Give your client

1. The value of `GRAFTGYM_API_KEY` from `.env.graftgym-client`, through a private channel.
2. This API guide.
3. Your deployed dashboard's API base URL: `https://dash.dellodigital.com/api/v1`.

The localhost URL `http://127.0.0.1:3000/api/v1` is for development on this computer. Your client cannot use that URL to reach your computer remotely. Before remote use, deploy this code and configure the server environment variables described below. Do not assume the public GraftGym marketing website is the dashboard API host.

**For the client's developer:** store this token in your backend/server environment. Make calls from your server and pass only the required data to your frontend. Do not put this permanent token in public JavaScript, a browser localStorage value, or a public repository. If the dashboard is browser-only, add a server/serverless proxy or implement user sign-in before connecting.

## Authentication

Every endpoint accepts:

```http
Authorization: Bearer YOUR_GRAFTGYM_API_KEY
```

The key grants read access to the GraftGym resources below only. Website scope is fixed on the server, not supplied in a request. It does not grant access to other websites, database administration, AI provider credentials, email sending, training profiles/logs or configuration updates. The Supabase service-role key remains on the app server and must not be handed to the client.

## Endpoints

| Endpoint | Data | Date filters |
| --- | --- | --- |
| `GET /api/v1/submissions` | GraftGym enquiries, name/email/message, submission timestamp and original form fields | `from`/`to` filter submission date, UTC |
| `GET /api/v1/memberships` | Contact details, recorded membership end date, original and effective statuses, do-not-contact flag | `from`/`to` filter membership end date, UK calendar dates |
| `GET /api/v1/analytics` | All-time and period enquiry totals, daily counts, current membership totals/status counts | `from`/`to` select the enquiry reporting period, UTC |

Memberships come from explicit dates recorded in **Automation → Clients & memberships**. Records with no membership end date are excluded. Memberships are valid through their end date in `Europe/London`. `effective_status` becomes `expired` after that date when the record is active and not closed. It respects `renewed`, `cancelled`, and `closed` states. Training profiles in AI Workspace are separate records.

### Pagination and filters

Submission and membership endpoints support `page` (default 1) and `limit` (default 50, maximum 100). Dates use `YYYY-MM-DD`, inclusive. For example:

```text
/api/v1/submissions?page=1&limit=50&from=2026-11-01&to=2026-11-06
/api/v1/memberships?page=1&limit=50
/api/v1/analytics?from=2026-11-01&to=2026-11-06
```

Analytics defaults to the last seven UTC calendar days including today. It allows up to 366 days, ending today or earlier. Periods with 20,000 or more submissions are rejected so that counts are never silently truncated; request a narrower range. Membership analytics are a **current snapshot**, not historical membership counts over the enquiry reporting period. `recorded` includes closed membership records; active/expired/renewed/cancelled counts exclude closed records.

List response shape:

```json
{
  "data": [],
  "pagination": { "page": 1, "limit": 50, "total": 0, "total_pages": 0 },
  "meta": { "website": "GraftGym", "timezone": "UTC", "generated_at": "..." }
}
```

Loop through pages until all pages have been fetched. Original form fields are untrusted user input; render them as text in the client dashboard.

### Backend example

```javascript
// Run on the client's backend. Both values come from private environment settings.
const response = await fetch(`${process.env.GRAFTGYM_API_BASE_URL}/submissions?limit=50`, {
  headers: { Authorization: `Bearer ${process.env.GRAFTGYM_API_KEY}` },
  cache: 'no-store'
});
if (!response.ok) throw new Error(`GraftGym API returned ${response.status}`);
const { data, pagination } = await response.json();
```

### Errors

- `400`: unsupported/repeated parameters, invalid dates or pagination. `website_id`/`websiteId` overrides are rejected.
- `401`: missing, invalid or expired API key.
- `405`: write methods are not supported.
- `413`: analytics period contains too many records.
- `429`: rate limit reached. Respect `Retry-After: 60`.
- `503`: server configuration/database temporarily unavailable.

The current limiter allows 120 authenticated requests per minute per running server process, shared across the three endpoints. It is an application safeguard, not a global distributed quota; configure gateway/hosting rate limits for production deployments with multiple instances. Responses and errors use `Cache-Control: no-store, private`. This API intentionally has no cross-origin browser access configuration; use the client's backend.

## Deploy, revoke, rotate

Copy these existing private values from `.env.local` to your dashboard hosting provider and redeploy:

```env
CLIENT_API_KEY_HASH=the_existing_hash
CLIENT_API_WEBSITE_ID=the_verified_graftgym_website_id
CLIENT_API_KEY_EXPIRES_AT=the_existing_expiration_timestamp
```

The deployment also needs its existing `NEXT_PUBLIC_SUPABASE_URL` and private `SUPABASE_SERVICE_ROLE_KEY`. Do **not** copy the raw `GRAFTGYM_API_KEY` into public environment settings; the dashboard server needs only the hash.

To revoke this key, remove/change `CLIENT_API_KEY_HASH` from the app server's private environment, then restart/redeploy. To rotate, generate a new random token, replace the server hash and privately give the replacement token to the client. Keep expiration values consistent with the handoff file. This initial implementation supports one configured GraftGym integration key; it does not create a general multi-client key management system.

## Verification

Run `npm run test:client-api`, `npm run typecheck` and `npm run build`. Automated tests verify key expiry, query restrictions, pagination bounds, rate limiting, membership status and cross-website isolation. Live local checks with the generated key returned HTTP 200 for all three endpoints, HTTP 401 for a bad key and HTTP 400 for a website override. The live checks read existing GraftGym data without printing client records or sending emails.

## Live URL status

The confirmed API base URL is `https://dash.dellodigital.com/api/v1`. On 6 November 2026, all three unauthenticated endpoint checks returned HTTP 404. The new routes are not yet available on that deployment. Deploy the updated application and set the three `CLIENT_API_*` server variables from `.env.local` before the client starts integration. After deployment, an unauthenticated request should return HTTP 401 and a valid client-key request should return HTTP 200.

## Vercel deployment handoff

A private `.env.vercel-client-api` file has been prepared for the project owner to import into the Vercel project's **Production** environment. It contains the three client API scope/hash/expiry variables plus the private Supabase service-role key required by the server. It does not contain the raw client API token. This server import file must **not** be shared with the client.

In Vercel, open the existing project serving `dash.dellodigital.com`, then **Settings → Environment Variables**. Import or add the variables from that private file for Production, preserving the project's existing environment values. Then deploy the updated repository code containing `src/app/api/v1/` and `src/lib/client-api.ts`. Redeploying an old source revision alone does not add the new API routes. Verify that an unauthenticated API call returns 401 and a valid-key call returns 200 before sending the client the production connection details.

A Vercel integration is available but was not connected during the deployment access check. No live Vercel settings were changed and no production deployment was performed.
