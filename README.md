# EngageSwap Bot (Reply Society Champs)

A full-stack Telegram bot application for Twitter/X engagement exchange. Users earn points by engaging with others' tweets and spend points to get engagements on their own tweets.

**Telegram Bot:** [@EngageSwapXBot](https://t.me/EngageSwapXBot)

## Features

- **Telegram Bot** - Complete bot with inline keyboards, conversation flows, and admin commands
- **Engagement Exchange** - Earn points by completing tasks, spend them to promote your tweets
- **Admin Dashboard** - Next.js web dashboard for managing users, tweets, tasks, and flagged users
- **Auto Moderation** - Cron jobs for inactive user cleanup and tweet queue management
- **Rate Limiting** - Prevents abuse with per-user rate limits on claims and uses
- **Leaderboard** - Public landing page with top engagers

## Tech Stack

- **Backend**: Node.js + Express + TypeScript
- **Bot**: Telegraf (Telegram Bot framework)
- **Database**: PostgreSQL (via Prisma ORM)
- **Frontend**: Next.js 14 (App Router) + Tailwind CSS
- **Monorepo**: npm workspaces

## Project Structure

```
reply-society-bot/
├── apps/
│   ├── bot/                 # Telegram bot + Express API
│   │   └── src/
│   │       ├── commands/    # Bot command handlers
│   │       ├── jobs/        # Cron jobs
│   │       ├── middleware/  # Rate limiting
│   │       ├── utils/       # Validation helpers
│   │       ├── config.ts    # Environment config
│   │       ├── messages.ts  # All bot message templates
│   │       └── index.ts     # Entry point
│   └── web/                 # Next.js dashboard
│       └── src/
│           ├── app/         # App Router pages
│           │   ├── admin/   # Admin dashboard pages
│           │   └── page.tsx # Public landing page
│           ├── components/  # React components
│           └── lib/         # API client
├── packages/
│   └── db/                  # Prisma schema & client
│       └── prisma/
│           ├── schema.prisma
│           └── seed.ts
├── Dockerfile               # Bot Docker image
├── Dockerfile.web           # Web Docker image
├── railway.json             # Railway deploy config
├── render.yaml              # Render deploy config
└── package.json             # Root workspace config
```

## Bot Commands

### User Commands
| Command | Description |
|---------|-------------|
| `/start` or `/home` | Show dashboard with points, status, and action buttons |
| `/setprofile` | Link your X/Twitter profile |
| `/claim` | Earn points by engaging with others' tweets |
| `/use` | Spend points to get engagements on your tweet |
| `/stats` | View your engagement statistics |

### Admin Commands
| Command | Description |
|---------|-------------|
| `/pending` | List users awaiting approval |
| `/approve <id>` | Approve a user |
| `/reject <id>` | Reject a user |
| `/ban <id>` | Ban a user |
| `/unban <id>` | Unban a user |
| `/adminstats` | View bot-wide statistics |
| `/shamelist` | List users flagged for incomplete tasks |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `BOT_TOKEN` | Telegram Bot API token (from @BotFather) |
| `DATABASE_URL` | PostgreSQL connection string |
| `ADMIN_TELEGRAM_IDS` | Comma-separated list of admin Telegram user IDs |
| `NEXTAUTH_SECRET` | Secret for session encryption |
| `ADMIN_PASSWORD` | Password for the admin dashboard login |
| `TELEGRAM_BOT_USERNAME` | Your bot's Telegram username |
| `NEXT_PUBLIC_BOT_USERNAME` | Bot username (client-side) |
| `NEXT_PUBLIC_API_URL` | Bot API URL for the web dashboard |

## Local Development

### Quick Start with Docker Compose

1. Copy `.env.example` to `.env`
   ```bash
   cp .env.example .env
   ```

2. Fill in `BOT_TOKEN` and `ADMIN_TELEGRAM_IDS` in `.env`

3. Run everything:
   ```bash
   docker-compose up
   ```

4. Bot is live on Telegram — try `/start` in [@EngageSwapXBot](https://t.me/EngageSwapXBot)
5. Dashboard at [http://localhost:3000](http://localhost:3000)

### Manual Setup (without Docker)

#### Prerequisites

- Node.js 20+
- PostgreSQL database
- Telegram Bot Token (create via [@BotFather](https://t.me/BotFather))

#### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/RukonKholifa/Xemet.git
   cd Xemet
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your BOT_TOKEN and ADMIN_TELEGRAM_IDS
   # Also copy .env to apps/web/ for Next.js server-side env vars:
   cp .env apps/web/.env
   ```

4. **Set up the database**
   ```bash
   npm run db:generate
   npx prisma migrate dev --schema=packages/db/prisma/schema.prisma --name init
   npm run db:seed
   ```

5. **Start the bot**
   ```bash
   npm run dev:bot
   ```

6. **Start the web dashboard** (in another terminal)
   ```bash
   npm run dev:web
   ```

## Deploy on Railway

1. Create a new project on [Railway](https://railway.app)
2. Add a PostgreSQL database service
3. Create a new service from this GitHub repo
4. Set environment variables in Railway dashboard:
   - `BOT_TOKEN`
   - `DATABASE_URL` (auto-set if using Railway PostgreSQL)
   - `ADMIN_TELEGRAM_IDS`
   - `TELEGRAM_BOT_USERNAME`
5. Railway will auto-detect the `railway.json` and deploy

### Deploy Web Dashboard
1. Create another service in the same Railway project
2. Set the Dockerfile path to `Dockerfile.web`
3. Set `NEXT_PUBLIC_API_URL` to the bot service URL
4. Set `NEXT_PUBLIC_BOT_USERNAME`

## Deploy on Render

1. Create a new Blueprint on [Render](https://render.com)
2. Connect this GitHub repo
3. Render will use `render.yaml` to create all services
4. Set the required environment variables in the dashboard

## How Points Work

- **Earn**: Use `/claim` to receive engagement tasks (like/reply/repost others' tweets)
- **Spend**: Use `/use` to submit your tweet and choose how many engagements you want
- **1 point = 1 engagement**
- **Max 50 points** per user at any time
- **7-day inactivity** = automatic removal

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev:bot` | Start bot in development mode |
| `npm run dev:web` | Start web dashboard in development mode |
| `npm run build` | Build all packages |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed the database |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |

## License

MIT
