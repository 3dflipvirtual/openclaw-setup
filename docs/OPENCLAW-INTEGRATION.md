# OpenClaw Integration Architecture

## Overview

This SaaS is a **hosting and management layer** for OpenClaw. It does NOT reimplement agent capabilities — OpenClaw handles all of that natively.

## What the SaaS Does

| Concern | How |
|---------|-----|
| **Auth** | Supabase (Google OAuth) |
| **Payment** | Whop |
| **Onboarding** | Guided wizard: connect Telegram bot, pick personality, enter API keys |
| **Bot linking** | Telegram webhook for code verification during onboarding |
| **Deploy** | Sends config to VPS gateway → writes `openclaw.json` + `SOUL.md` → starts daemon |
| **API key vault** | AES-256-GCM encrypted storage in Supabase `secrets` table |
| **Status** | Queries VPS for agent status (running, stopped, uptime) |

## What OpenClaw Does (natively, on the VPS)

| Concern | How |
|---------|-----|
| **Telegram** | Built-in grammY channel — receives and replies natively |
| **Memory** | `MEMORY.md` + `memory/YYYY-MM-DD.md` + hybrid vector/BM25 search |
| **Tools** | 100+ built-in tools (file system, web, browser, email, etc.) |
| **Skills** | ClawHub marketplace + bundled + workspace custom skills |
| **Autonomy** | HEARTBEAT (periodic activation), cron, hooks, webhooks |
| **Reasoning** | ReAct loop (think → tool → observe) |
| **Browser** | Full Chromium CDP with semantic snapshots |
| **Personality** | `SOUL.md` — plain Markdown, hot-reloadable |

## Architecture

```
┌─────────────────────────────────┐
│  SaaS (Next.js on Vercel)       │
│  - Auth, payment, onboarding    │
│  - Personality picker           │
│  - API key vault                │
│  - Deploy button                │
│  - Status dashboard             │
└──────────┬──────────────────────┘
           │ HTTPS (Bearer token auth)
           ▼
┌─────────────────────────────────┐
│  VPS Gateway (Express on Oracle)│
│  - POST /api/agents             │
│  - Writes openclaw.json         │
│  - Writes SOUL.md               │
│  - Manages PM2 processes        │
└──────────┬──────────────────────┘
           │ PM2 start/stop
           ▼
┌─────────────────────────────────┐
│  OpenClaw Daemon (per user)     │
│  - Telegram via grammY          │
│  - Memory, tools, skills        │
│  - HEARTBEAT + cron             │
│  - Browser control              │
│  - ReAct reasoning loop         │
└─────────────────────────────────┘
```

## Deploy Flow

1. User completes onboarding (connects Telegram bot, picks personality, enters API keys)
2. User clicks Deploy
3. SaaS calls `POST /api/agents` on VPS with: `userId`, `telegramBotToken`, API keys, `soulMd`, `skills`
4. VPS gateway creates workspace at `~/.openclaw-agents/<userId>/`
5. Writes `openclaw.json` (Telegram channel + LLM providers + tools)
6. Writes `SOUL.md` (personality from preset or custom)
7. Starts OpenClaw via PM2
8. OpenClaw takes over — handles all Telegram communication, memory, tools, autonomy

## Key Design Principle

**The SaaS is a thin management layer. OpenClaw is the orchestra.**

We don't reimplement memory, tools, browser control, multi-step reasoning, or proactivity. OpenClaw does all of that better than we ever could. The SaaS provides what OpenClaw can't: multi-tenant auth, payment, one-click deploy, and a friendly onboarding experience for non-technical users.
