# 🎯 Invite Tracker System

<div align="center">

**Discord server join tracking system from Invite Links with Dashboard and API Server**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Discord.js](https://img.shields.io/badge/Discord.js-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.js.org/)

</div>

---

## 📋 Table of Contents

- [✨ Features](#-features)
- [🏗️ Project Structure](#️-project-structure)
- [🚀 Quick Start](#-quick-start)
- [⚙️ Configuration](#️-configuration)
- [📖 Documentation](#-documentation)
- [🐳 Docker Deployment](#-docker-deployment)
- [🖥️ VPS Deployment](#️-vps-deployment)
- [🔧 Development](#-development)
- [📊 API Endpoints](#-api-endpoints)
- [🤖 Bot Commands](#-bot-commands)
- [❓ Troubleshooting](#-troubleshooting)

---

## ✨ Features

### 🤖 Discord Bot
- 🔗 **Auto Invite Tracking** - Automatically tracks Invite Links created by users
- 👥 **Join Detection** - Records server joins when someone uses an Invite
- 📊 **Dashboard Display** - Shows Top Inviters Leaderboard in a text channel
- 📈 **Statistics Command** - `/invite-stats` command to view invite statistics
- 🔄 **Auto Updates** - Dashboard updates automatically every 5 minutes
- 🔄 **Sync Command** - `/sync-invites` command to sync invites from server

### 🌐 API Server
- 📝 **Record Joins** - POST endpoint for recording joins
- 📊 **Get Statistics** - GET endpoint for viewing invite statistics
- 🏆 **Leaderboard** - GET endpoint for viewing leaderboard
- 🔗 **List Invites** - GET endpoint for viewing user's invite links
- 🔒 **API Key Authentication** - Secure API with API key protection
- 📈 **Google Sheets Integration** - Support for sending data to Google Sheets

---

## 🏗️ Project Structure

```
invite-tracker-system/
├── bot/                          # Discord Bot
│   ├── src/
│   │   ├── commands/            # Slash commands
│   │   ├── events/              # Discord events
│   │   ├── models/              # MongoDB models
│   │   ├── services/            # Business logic
│   │   └── utils/               # Utilities
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── README.md
├── api/                          # API Server
│   ├── src/
│   │   ├── routes/              # API routes
│   │   ├── models/              # MongoDB models
│   │   └── utils/               # Utilities
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── README.md
├── docker-compose.yml            # Docker Compose configuration
├── docker-compose.prod.yml       # Production override
├── google-sheets-script.js       # Google Apps Script example
├── GOOGLE_SHEETS_INTEGRATION.md  # Google Sheets integration guide
└── README.md                     # This file
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ (for development)
- **Docker** and **Docker Compose** (for deployment)
- **MongoDB** (local or Atlas)
- **Discord Bot Token** ([Create one here](https://discord.com/developers/applications))

### 1️⃣ Clone Repository

```bash
git clone https://github.com/poonnyworld/invite-tracker.git
cd invite-tracker
```

### 2️⃣ Configure Environment Variables

#### Bot Configuration

```bash
cd bot
cp .env.example .env
nano .env  # or use your preferred editor
```

**Required Variables:**
```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_guild_id_here
INVITE_DASHBOARD_CHANNEL_ID=your_dashboard_channel_id_here
MONGO_URI=mongodb://localhost:27017/honorbot
```

#### API Configuration

```bash
cd ../api
cp .env.example .env
nano .env
```

**Required Variables:**
```env
MONGO_URI=mongodb://localhost:27017/honorbot
API_SECRET_KEY=your_api_secret_key_here
```

### 3️⃣ Setup Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to **Bot** section and create a bot
4. Copy the bot token to `bot/.env`
5. Enable **Privileged Gateway Intents**:
   - ✅ **Server Members Intent** (Required for tracking joins)
   - ✅ **Message Content Intent** (Optional)

6. Invite bot to your server using this URL (replace `YOUR_CLIENT_ID`):
   ```
   https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=2048&scope=bot%20applications.commands
   ```

### 4️⃣ Run with Docker Compose

```bash
# From invite-tracker-system/ directory
docker-compose up -d --build
```

### 5️⃣ Deploy Slash Commands

```bash
docker-compose exec invite-tracker-bot node dist/deploy-commands.js
```

### 6️⃣ Verify Installation

- ✅ Bot should be online in your Discord server
- ✅ Dashboard should display in the configured channel (`INVITE_DASHBOARD_CHANNEL_ID`)
- ✅ API should be running at `http://localhost:3001`
- ✅ Check health: `curl http://localhost:3001/api/health`

---

## ⚙️ Configuration

### Environment Variables

#### Bot (`bot/.env`)

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DISCORD_TOKEN` | Discord bot token | ✅ Yes | - |
| `CLIENT_ID` | Discord application client ID | ✅ Yes | - |
| `GUILD_ID` | Discord server (guild) ID | ⚠️ Optional | - |
| `INVITE_DASHBOARD_CHANNEL_ID` | Channel ID for dashboard | ✅ Yes | - |
| `MONGO_URI` | MongoDB connection string | ✅ Yes | - |
| `API_URL` | API server URL | ❌ No | - |
| `API_SECRET_KEY` | API secret key | ❌ No | - |
| `NODE_ENV` | Environment | ❌ No | `development` |

#### API (`api/.env`)

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `API_PORT` | Port for API server | ❌ No | `3001` |
| `MONGO_URI` | MongoDB connection string | ✅ Yes | - |
| `API_SECRET_KEY` | Secret key for API auth | ✅ Yes | - |
| `ALLOWED_ORIGINS` | CORS allowed origins | ❌ No | `localhost:3000,3001` |
| `NODE_ENV` | Environment | ❌ No | `development` |

### MongoDB Connection Strings

**Local MongoDB:**
```env
MONGO_URI=mongodb://localhost:27017/honorbot
```

**MongoDB Atlas (Cloud):**
```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/honorbot
```

**Docker (automatically set by docker-compose.yml):**
```env
MONGO_URI=mongodb://mongodb:27017/honorbot
```

---

## 📖 Documentation

- 📘 [Bot Documentation](./bot/README.md) - Bot usage guide
- 🌐 [API Documentation](./api/README.md) - API endpoints and usage
- 📊 [Google Sheets Integration](./GOOGLE_SHEETS_INTEGRATION.md) - Google Sheets integration guide

---

## 🐳 Docker Deployment

### Quick Start

```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Individual Services

```bash
# Start only MongoDB
docker-compose up -d mongodb

# Start Bot
docker-compose up -d invite-tracker-bot

# Start API
docker-compose up -d invite-tracker-api

# View specific service logs
docker-compose logs -f invite-tracker-bot
docker-compose logs -f invite-tracker-api
```

### Production Deployment

```bash
# Use production override
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

---

## 🖥️ VPS Deployment

### Option 1: Docker Compose (Recommended)

1. **Clone repository:**
   ```bash
   git clone https://github.com/poonnyworld/invite-tracker.git
   cd invite-tracker
   ```

2. **Configure environment:**
   ```bash
   cd bot && cp .env.example .env && nano .env
   cd ../api && cp .env.example .env && nano .env
   ```

3. **Start services:**
   ```bash
   docker-compose up -d --build
   ```

4. **Deploy commands:**
   ```bash
   docker-compose exec invite-tracker-bot node dist/deploy-commands.js
   ```

### Option 2: PM2

1. **Install PM2:**
   ```bash
   npm install -g pm2
   ```

2. **Build projects:**
   ```bash
   cd bot && npm install && npm run build
   cd ../api && npm install && npm run build
   ```

3. **Start with PM2:**
   ```bash
   cd bot && pm2 start ecosystem.config.js
   cd ../api && pm2 start ecosystem.config.js
   ```

4. **Save PM2 configuration:**
   ```bash
   pm2 save
   pm2 startup
   ```

### MongoDB Setup on VPS

**Option A: MongoDB Atlas (Recommended)**
- Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- Create cluster and copy connection string
- Update `MONGO_URI` in `.env`

**Option B: Docker MongoDB**
```bash
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -v mongodb_data:/data/db \
  --restart unless-stopped \
  mongo:7
```

---

## 🔧 Development

### Local Development Setup

#### Bot Development

```bash
cd bot
npm install
npm run dev
```

#### API Development

```bash
cd api
npm install
npm run dev
```

### Available Scripts

#### Bot Scripts
- `npm run dev` - Run bot in development mode with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Run production build
- `npm run deploy` - Deploy slash commands (development)
- `npm run deploy:prod` - Deploy slash commands (production)

#### API Scripts
- `npm run dev` - Run API in development mode with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Run production build

---

## 📊 API Endpoints

### Base URL
```
http://localhost:3001/api
```

### Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/joins` | Record a member join | ✅ Yes |
| `GET` | `/stats/:userId` | Get user statistics | ❌ No |
| `GET` | `/leaderboard` | Get invite leaderboard | ❌ No |
| `GET` | `/invites/:userId` | Get user's invites | ❌ No |
| `GET` | `/health` | Health check | ❌ No |
| `GET` | `/debug/:guildId` | Debug endpoint | ❌ No |
| `GET` | `/sheets/:guildId` | Google Sheets data | ❌ No |

See more details at [API Documentation](./api/README.md)

---

## 🤖 Bot Commands

### `/invite-stats [user]`

View invite statistics for yourself or another user.

**Options:**
- `user` (optional): User to view stats for (default: you)

**Example:**
```
/invite-stats
/invite-stats user:@username
```

### `/sync-invites [clear-test-data] [test-guild-id]` (Admin Only)

Sync current invites from server to database.

**Permissions Required:** Manage Server

**Options:**
- `clear-test-data` (optional): Clear data from test server (default: false)
- `test-guild-id` (optional): Test server Guild ID (required if clear-test-data is true)

**Example:**
```
/sync-invites
/sync-invites clear-test-data:true test-guild-id:123456789012345678
```

See more details at [Bot Documentation](./bot/README.md)

---

## 📊 Dashboard

The dashboard automatically displays in the configured channel (`INVITE_DASHBOARD_CHANNEL_ID`) showing:

- 🏆 **Top 10 Inviters** - Users who invited the most members
- 📈 **Total Statistics** - Overall statistics
- 🔄 **Auto Updates** - Updates automatically every 5 minutes

---

## ❓ Troubleshooting

### Bot Not Working

- ✅ Check that `DISCORD_TOKEN` is correct
- ✅ Check that bot has **Server Members Intent** enabled
- ✅ Check that bot has necessary permissions in server
- ✅ Check MongoDB connection

### Dashboard Not Displaying

- ✅ Check that `INVITE_DASHBOARD_CHANNEL_ID` is correct
- ✅ Check that bot has permission to send messages in that channel
- ✅ Check logs: `docker-compose logs -f invite-tracker-bot`

### Commands Not Working

- ✅ Deploy commands: `docker-compose exec invite-tracker-bot node dist/deploy-commands.js`
- ✅ Check that bot has `applications.commands` scope when invited
- ✅ Wait a few minutes for global commands (may take up to 1 hour)

### API Not Working

- ✅ Check that API server is running: `curl http://localhost:3001/api/health`
- ✅ Check logs: `docker-compose logs -f invite-tracker-api`
- ✅ Check MongoDB connection
- ✅ Check `API_SECRET_KEY` for authenticated endpoints

### MongoDB Connection Issues

- ✅ Check that MongoDB is running: `docker-compose ps mongodb`
- ✅ Check connection string in `.env`
- ✅ For Docker: use `mongodb://mongodb:27017/honorbot`
- ✅ For local: use `mongodb://localhost:27017/honorbot`

---

## 📝 License

ISC

---

## 🙏 Credits

Built with ❤️ using:
- [Discord.js](https://discord.js.org/) - Discord API library
- [Express.js](https://expressjs.com/) - Web framework
- [MongoDB](https://www.mongodb.com/) - Database
- [TypeScript](https://www.typescriptlang.org/) - Programming language
- [Docker](https://www.docker.com/) - Containerization

---

<div align="center">

**Made with ❤️ for Discord Communities**

[Report Bug](https://github.com/poonnyworld/invite-tracker/issues) · [Request Feature](https://github.com/poonnyworld/invite-tracker/issues)

</div>
