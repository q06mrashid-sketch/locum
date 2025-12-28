# Locum Portal

A production-ready, mobile-first portal that consolidates locum shift offers from Gmail (push sync) and WhatsApp exports.

## Features

- Gmail OAuth + push notifications (Pub/Sub) with history-based incremental sync
- WhatsApp export import (manual .txt upload)
- AI extraction with OpenAI (JSON-only, strict schema validation)
- Mobile-first dashboard with booking actions (draft email / open WhatsApp)
- Supabase Postgres schema and seed templates

## Tech stack

- Next.js (App Router) + TypeScript + Tailwind
- Supabase Postgres (service role on server routes)
- Google Gmail API + Pub/Sub
- OpenAI API

## Environment variables

Set these in `.env.local`:

```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENAI_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
PUBSUB_TOKEN=
APP_BASE_URL=
GMAIL_PUBSUB_TOPIC=
APP_ENCRYPTION_KEY=
```

- `GMAIL_PUBSUB_TOPIC` is the full Pub/Sub topic name: `projects/<project-id>/topics/<topic-name>`.
- `APP_ENCRYPTION_KEY` is used to encrypt Google OAuth tokens at rest.

## Supabase setup

1. Create a Supabase project.
2. Run the SQL migration in `supabase/migrations/0001_init.sql`.
3. Add the service role key and URL to your environment variables.

## Google Cloud + Gmail API setup

1. Create a Google Cloud project.
2. Enable **Gmail API**.
3. Configure OAuth consent screen (internal or external).
4. Create OAuth client credentials (Web Application).
5. Set Authorized redirect URI:
   - `https://<your-domain>/api/auth/google/callback`
6. Create a Pub/Sub topic.
7. Create a Pub/Sub **push subscription** pointing to:
   - `https://<your-domain>/api/gmail/pubsub`
8. Set the push subscription header `X-PubSub-Token` to match `PUBSUB_TOKEN`.

## Gmail watch renewal

Gmail watch expires automatically. Schedule a daily call to renew it.

### Vercel Cron example

```
0 6 * * * https://<your-domain>/api/gmail/renew-watch
```

Or call the route with any external scheduler.

## WhatsApp import

Go to **WhatsApp Import** and upload the exported `.txt` chat (no media). Messages are parsed and stored as raw items.

## AI extraction

Use **Settings → Run Extraction Now** to process new raw items. The AI extractor:

- Outputs JSON-only responses
- Validates the schema with Zod
- Upserts offers using a deterministic fingerprint

## Development

```
npm install
npm run dev
```

## Booking actions

- **Draft Email** opens a mailto link with templated subject/body.
- **Open WhatsApp** opens `wa.me` with pre-filled text.

## Notes

- The app runs in a single-admin mode (first Gmail connection becomes the admin).
- Gmail query can be edited in Settings (default: `newer_than:30d (locum OR shift OR cover OR booking OR rate OR "£")`).
- Google tokens are encrypted before being stored in Postgres.
