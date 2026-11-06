# GraftGym API client integration guide

Prepared by Dello Digital for the GraftGym dashboard developer on 6 November 2026.

This guide explains how to connect your dashboard to GraftGym enquiry, membership and analytics data. Access is read-only and restricted to GraftGym. The API key is supplied separately in the private handoff bundle; this guide contains no key.

**Activation status:** awaiting production deployment. The production submissions endpoint returned HTTP 404 when checked on 6 November 2026. Wait for Dello Digital to confirm activation before expecting the steps below to return data. The endpoints and key have passed local checks.

## Step 1 Understand what you received

The private bundle contains:

| File | Purpose |
| --- | --- |
| `START_HERE.txt` | Short introduction and activation status |
| `CLIENT_GUIDE.md` | This complete guide |
| `credentials.env` | Your actual API key, base URL and expiration time |
| `GraftGym.postman_collection.json` | Three ready-made API requests |
| `GraftGym.postman_environment.json` | Private Postman variables including your actual key |
| `backend-example.mjs` | A Node.js server-side connection and pagination example |

Keep the bundle private. Both `credentials.env` and the Postman environment contain your key. Share it only with the developer responsible for the authorized GraftGym dashboard. You do not need Supabase, Gemini, OpenAI, SMTP or Vercel administrator credentials.

Connection details:

```text
API base URL: https://dash.dellodigital.com/api/v1
Authentication: Authorization header using a Bearer token
Access: read-only GraftGym data
Initial key expiry: 6 November 2027
```

The exact UTC expiration timestamp is in `credentials.env`. Contact Dello Digital before expiry to arrange a replacement. The website scope is fixed by the key, so do not send a website ID.

## Step 2 Confirm that your dashboard has a backend

Ask your developer: “Can our dashboard call this API from a backend or serverless function using a private environment variable?”

- If yes, continue with the setup below.
- If the dashboard is only browser code, add a backend/serverless function first. The developer can use the server functionality in your existing hosting platform.
- Do not place the permanent key in a React component, a browser JavaScript file, localStorage, a public repository, or a public environment variable. Do not use `NEXT_PUBLIC_`, `VITE_` or another browser-exposed prefix for it.

The intended connection is:

```text
Authorized dashboard user
    -> Your authenticated backend or serverless function
    -> GraftGym API with the private key
    -> Your backend returns the data needed by your dashboard
```

Protect your own backend with your dashboard's user authentication. A public proxy that forwards this private data to anyone would expose client information. Direct cross-origin browser calls are not configured for this API.

## Step 3 Store the connection settings privately

Your developer should add these variables to the backend's private environment settings:

```env
GRAFTGYM_API_BASE_URL=https://dash.dellodigital.com/api/v1
GRAFTGYM_API_KEY=copy_the_actual_value_from_credentials.env
```

Use the full key value. Do not include the text `Bearer` in the environment value; the request code adds it. Copy without extra spaces or surrounding quotes. Restart or redeploy your backend after changing its environment settings.

If importing `credentials.env` into the backend hosting platform, ensure it is being imported as private server configuration. Do not upload it as a publicly served website asset.

## Step 4 Test the connection in Postman

You may skip this step if the developer tests directly from the backend.

1. Open Postman in a private workspace intended for this integration.
2. Choose **Import** and select `GraftGym.postman_collection.json` from the bundle.
3. Import `GraftGym.postman_environment.json` as well. This file contains the actual key; do not publish or share the environment with an unrelated workspace.
4. Select the **GraftGym private client API** environment for the imported collection.
5. Open **Enquiries first page** and click **Send**.
6. Confirm HTTP **200** and a JSON response containing `data`, `pagination` and `meta`.
7. Repeat for **Memberships first page** and **Analytics last seven days**.

The collection supplies the Bearer header automatically. You do not need to paste the key into the request URL or use a dashboard login cookie.

For a manual request, choose method GET, enter the endpoint, then set Authorization to Bearer Token and paste only the key value. A request without a valid key should return HTTP 401 once the API is activated. Before deployment, HTTP 404 is expected and does not mean your key is wrong.

Postman references: [Importing data](https://learning.postman.com/docs/getting-started/importing-and-exporting/importing-data) and [Collection authorization](https://learning.postman.com/docs/use/use-collections/create-collections).

## Step 5 Choose the correct endpoint

| Dashboard section | GET endpoint | Data returned |
| --- | --- | --- |
| Enquiries and responses | `/submissions` | Submission ID, date/time, name, email, message and original form fields |
| Memberships | `/memberships` | Recorded membership end dates, contact details and status |
| Overview and charts | `/analytics` | Enquiry totals, daily enquiry counts and current membership counts |

These paths are relative to the API base URL. For example, the full enquiry endpoint is:

```text
https://dash.dellodigital.com/api/v1/submissions
```

The browser pages `/responses` and `/analytics` are human-facing pages, not these JSON endpoints. The API cannot send emails, renew memberships, change records or return other websites' data. It does not include workout logs, training profiles, AI conversations or server settings.

Every request uses:

```http
Authorization: Bearer YOUR_ACTUAL_KEY
```

## Step 6 Retrieve and display enquiries

First request:

```http
GET https://dash.dellodigital.com/api/v1/submissions?page=1&limit=50
Authorization: Bearer YOUR_ACTUAL_KEY
```

Illustrative response; these are not real client details:

```json
{
  "data": [
    {
      "id": "example-submission-id",
      "submitted_at": "2026-11-05T10:30:00Z",
      "name": "Example Client",
      "email": "example@example.invalid",
      "message": "I would like to know about personal training.",
      "fields": {
        "name": "Example Client",
        "email": "example@example.invalid",
        "message": "I would like to know about personal training."
      }
    }
  ],
  "pagination": { "page": 1, "limit": 50, "total": 1, "total_pages": 1 },
  "meta": {
    "website": "GraftGym",
    "timezone": "UTC",
    "generated_at": "2026-11-06T09:00:00Z"
  }
}
```

Map `name`, `email`, `message` and `submitted_at` into your enquiry table. Some contact fields may be null when not submitted. `fields` preserves the original form payload, whose keys can vary. Render user-entered content as text, not untrusted HTML. Use `id` as the record identity.

To request a date range:

```text
/submissions?page=1&limit=50&from=2026-11-01&to=2026-11-06
```

`from` and `to` use inclusive UTC submission dates in `YYYY-MM-DD` format. Omitting them returns submissions across all dates.

## Step 7 Retrieve and display memberships

```http
GET https://dash.dellodigital.com/api/v1/memberships?page=1&limit=50
Authorization: Bearer YOUR_ACTUAL_KEY
```

Example record in the response's `data` array:

```json
{
  "id": "example-membership-id",
  "name": "Example Member",
  "email": "member@example.invalid",
  "membership_end_date": "2026-11-05",
  "membership_status": "active",
  "client_status": "converted",
  "effective_status": "expired",
  "do_not_contact": false
}
```

Display `effective_status` for the current membership state. It can be active, expired, renewed, cancelled or closed. Keep the original `membership_status` and `client_status` if you need them for detail views.

Memberships come from explicit end dates entered in **Automation → Clients & memberships**. A membership stays valid through its end date in UK time (`Europe/London`) and can become expired the next day. Renewed, cancelled and closed records are handled accordingly. The age of an enquiry does not establish membership expiry.

Only records with a membership end date are included. An empty `data` array with HTTP 200 can mean no membership dates have been recorded; it is not an authentication error. Training profiles are separate from membership records.

Optional filters:

```text
/memberships?from=2026-11-01&to=2026-11-30&page=1&limit=50
```

For this endpoint, the dates filter the **membership end date**, not the enquiry date or last update time. The response metadata identifies the UK time zone.

## Step 8 Use analytics for dashboard cards and charts

```http
GET https://dash.dellodigital.com/api/v1/analytics
Authorization: Bearer YOUR_ACTUAL_KEY
```

Without date filters, enquiry analytics cover the last seven UTC calendar days including today. To choose a period:

```text
/analytics?from=2026-11-01&to=2026-11-06
```

Use these response paths:

| Response path | Suggested display |
| --- | --- |
| `data.enquiries.total_all_time` | Total enquiries |
| `data.enquiries.total_in_period` | Enquiries in the selected period |
| `data.enquiries.daily` | Date/count pairs for the enquiry chart |
| `data.memberships.recorded` | Membership records with an end date, including closed records |
| `data.memberships.active` | Currently active memberships, excluding closed records |
| `data.memberships.expired` | Currently expired memberships, excluding closed records |
| `data.memberships.renewed` | Records marked renewed, excluding closed records |
| `data.memberships.cancelled` | Records marked cancelled, excluding closed records |

Membership counts are a **current snapshot**. Selecting an old enquiry period does not reconstruct historical membership counts. The individual status counts may not add up to `recorded` because closed records are included only in that total.

Analytics periods support up to 366 days and cannot end in the future. If the selected period contains 20,000 or more submissions, request a narrower period. This endpoint does not accept pagination parameters. It does not provide revenue, visitor totals or sales conversion rates.

## Step 9 Handle pagination and refresh correctly

The submissions and memberships endpoints return paginated lists:

- `page` defaults to 1.
- `limit` defaults to 50 and can be at most 100.
- `pagination.total` is the number of records matching your filters.
- `pagination.total_pages` tells you when to stop.

For a full initial import, request page 1, then page 2 and so on until the last page. The included backend example has a helper for this. Store or update records by their `id`, so overlapping refreshes do not create duplicates.

For ongoing display, polling from your backend every few minutes is a reasonable starting point. Share each fetched result across dashboard components instead of making a separate API call for each card. Avoid a full-history download every time a user opens a page.

There are currently no webhooks or modified-since filters. Membership date filters refer to end dates, so refreshing only today's end dates will not detect every change to older membership records. Choose refresh windows appropriate to your dashboard and periodically reconcile the complete membership list if you store a local copy. Pagination is not a frozen snapshot while new records arrive; deduplicate by ID and reconcile as needed.

The application allows 120 authenticated requests per minute per running server process across all endpoints. If you receive HTTP 429, respect the `Retry-After` header, currently 60 seconds. This limit is a safeguard rather than a global distributed quota across all hosting instances.

## Step 10 Run the supplied backend example

The `.mjs` example uses Node.js 20.6 or later and has no third-party package dependencies. This is optional; your developer may use another backend language.

After production activation, keep `credentials.env` and `backend-example.mjs` in a private working directory and run:

```text
node --env-file=credentials.env backend-example.mjs
```

The example checks all three endpoints and prints only record counts. It does not print the API key or individual client records. Running it before production deployment will report HTTP 404. It does not change source data or send emails.

For your application, import `getResource` or `getAllPages` from this module into a server-only part of your code. Do not bundle it into a frontend. Keep the key in your hosting platform's private environment settings rather than packaging the credentials file into publicly served assets.

## Step 11 Troubleshoot by HTTP status

| Result | Meaning and action |
| --- | --- |
| `200` with JSON | Connection succeeded. Display `data` and handle an empty list normally. |
| `400` | Check date format, date order, page/limit values and repeated parameters. Do not pass `website_id` or `websiteId`; scope is fixed by the key. |
| `401` | Check that the full key was copied correctly and the header begins `Bearer `. Check expiry. Ask Dello Digital to verify activation or arrange a replacement if needed. |
| `404` or HTML | Confirm API activation and the `/api/v1/` URL. Do not use the `/responses` browser page. |
| `405` | Use GET. This API does not allow writes. |
| `413` | Narrow the analytics date range. |
| `429` | Wait for `Retry-After` seconds, then reduce polling or simultaneous requests. |
| `500` or `503` | Retry after a short delay. If persistent, contact Dello Digital with the information below. |
| Browser CORS error | Move the request to an authenticated backend/serverless function. Do not expose the key to bypass CORS. |
| Empty memberships | Check that membership end dates have been recorded in the source dashboard. |

For support, send the endpoint path, time of request, HTTP status and sanitized error message. Never send the API key, an Authorization header, a private Postman environment or screenshots containing credentials in an ordinary support message. Avoid including client personal data unless specifically needed for the investigation.

## Step 12 Maintain the integration

Keep access restricted to authorized dashboard users. Use HTTPS for the production API, keep credentials out of logs and source control, and arrange a key replacement before expiry.

If the key is disclosed, contact Dello Digital to revoke and replace it. The server currently supports one configured integration key, so a rotation replaces the old key; coordinate the client's backend environment update and restart/redeployment with the provider.

## Completion checklist

- Dello Digital has confirmed production activation.
- The developer has stored the key only on the backend.
- All three endpoints return HTTP 200 with the supplied key.
- Missing/wrong-key requests return HTTP 401 after activation.
- Enquiries and memberships display the expected fields and support pagination.
- The enquiry chart uses `data.enquiries.daily`.
- Membership labels use `effective_status` and UK end-date rules.
- Empty results, rate limits and errors are handled.
- Source data is visible only to authorized users of the client's dashboard.
- The expiry date and the person responsible for replacement have been recorded.
