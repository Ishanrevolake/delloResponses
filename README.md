This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## GraftGym AI features

See [AI setup and workflows](docs/AI_SETUP.md) to activate the AI workspace, apply the Supabase migration, and configure OpenAI.

## Automatic emails and dashboard chatbot

See [GraftGym automation setup](docs/AUTOMATION_SETUP.md) for client follow-ups, membership expiry dates, the Friday 9 AM UK owner report, and the conversational dashboard assistant.

For Google Gemini configuration, see [Gemini provider setup](docs/GEMINI_SETUP.md).

## GraftGym read-only client API

See [client API handoff guide](docs/GRAFTGYM_CLIENT_API.md) for the website-scoped API key, data endpoints and deployment instructions. The private token is stored in ignored `.env.graftgym-client`; the server configuration uses its hash.
