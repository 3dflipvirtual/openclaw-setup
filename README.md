This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## OpenClaw on a VPS

OpenClaw runs as a long-lived service on an always-on server (e.g. Oracle Cloud VM). The SaaS calls the VPS HTTP API to create, configure, and delete agents; the Telegram webhook forwards messages to the VPS.

- **VPS env**: Set **`OPENCLAW_VPS_URL`** (e.g. `https://openclaw.example.com`) and **`OPENCLAW_VPS_API_KEY`** in Vercel. The VPS must expose the API described in `docs/VPS-API.md`.
- **Flow**: User deploys from the app → SaaS calls `POST /api/agents` with user config (Telegram token, API keys) → Telegram messages are forwarded to `POST /api/telegram-hook` on the VPS.

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
