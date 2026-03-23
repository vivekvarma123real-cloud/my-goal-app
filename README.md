# 🎯 Habit Tracker — Consistency Protocol

A full-stack habit tracker SaaS with a dark cyberpunk aesthetic.

## Tech Stack

- **Frontend**: Next.js 14 · React · TypeScript · TailwindCSS
- **Backend**: Node.js · Express · TypeScript
- **Database**: Supabase (PostgreSQL)
- **Fonts**: Orbitron, Rajdhani, Share Tech Mono

## Project Structure

```
my-goal-app/
├── app/
│   ├── favicon.ico
│   ├── globals.css        ← color theme, custom checkbox, animations
│   ├── layout.tsx         ← root layout + metadata
│   └── page.tsx           ← full habit tracker UI
├── lib/
│   └── supabase.ts        ← Supabase client + types
├── server/
│   ├── src/
│   │   └── index.ts       ← Express REST API
│   └── package.json
├── public/
├── .env.local             ← add your Supabase keys here
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## Getting Started

### Frontend

```bash
npm install
npm run dev
# → http://localhost:3000
```

### Backend

```bash
cd server
npm install
npm run dev
# → http://localhost:4000
```

### Environment Variables

Create `.env.local` in root:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Features

- ✅ 7-day week view with unique color per day
- ✅ Collapsible goal categories (RICH / MUSCULAR / INTELLIGENT)
- ✅ Add custom habits to any category/day
- ✅ Delete habits on hover
- ✅ Checkbox with pink glow + strikethrough on completion
- ✅ Per-day progress bar + weekly overall bar
- ✅ Today-only view toggle
- ✅ Express REST API for persistence
- ✅ Supabase-ready client

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/habits | All habits |
| GET | /api/habits/:day | Habits for a day |
| POST | /api/habits | Create habit |
| PATCH | /api/habits/:id/toggle | Toggle done |
| DELETE | /api/habits/:id | Delete habit |
