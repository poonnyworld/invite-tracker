# 🎯 Invite Tracker System

<div align="center">

**Discord server join tracking via personal invite links (button-based) with UI channel, leaderboard, and API**

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

- 🔗 **Personal Invite Links** - Users get one invite link per person via the **Generate invite link** button (no manual link creation)
- 👥 **Join Tracking** - Only joins from these button-created links are counted
- 📊 **Invite UI Channel** (`INVITE_UI_CHANNEL_ID`) - Status log (last 10 invite successes) + 3 buttons: Check my link, Generate invite link, How many did I invite
- 🏆 **Leaderboard Channel** (`INVITE_LEADERBOARD_CHANNEL_ID`) - All Time and monthly Top 10 (optional)
- 📈 **Statistics** - `/invite-stats` and button **How many did I invite** show invite counts
- 🔄 **Sync Command** - `/sync-invites` (Admin) to sync invites from server

### 🌐 API Server

- 📝 **Record Joins** - POST endpoint for recording joins
- 📊 **Get Statistics** - GET endpoint for viewing invite statistics (supports unique users count)
- 🏆 **Leaderboard** - GET endpoint for viewing leaderboard (counts unique users)
- 🔗 **List Invites** - GET endpoint for viewing user's invite links
- 👥 **Join Records** - GET endpoint for viewing detailed join records per inviter
- 🔒 **API Key Authentication** - Secure API with API key protection
- 📈 **Google Sheets Integration** - Support for multi-sheet Google Sheets integration

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
├── google-sheets-script.js       # Google Apps Script for multi-sheet integration
├── api-test.html                 # API testing interface
├── GOOGLE_SHEETS_INTEGRATION.md  # Google Sheets integration guide
├── GOOGLE_SHEETS_TROUBLESHOOTING.md  # Troubleshooting guide for Google Sheets
├── INDIVIDUAL_SHEETS_FIX.md     # Fix guide for individual sheets
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
INVITE_UI_CHANNEL_ID=your_ui_channel_id_here
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
- ✅ Invite UI (log + control buttons) should display in the configured channel (`INVITE_UI_CHANNEL_ID`)
- ✅ API should be running at `http://localhost:3001`
- ✅ Check health: `curl http://localhost:3001/api/health`

---

## ⚙️ Configuration

### Environment Variables

#### Bot (`bot/.env`)

| Variable                      | Description                   | Required    | Default       |
| ----------------------------- | ----------------------------- | ----------- | ------------- |
| `DISCORD_TOKEN`               | Discord bot token             | ✅ Yes      | -             |
| `CLIENT_ID`                   | Discord application client ID | ✅ Yes      | -             |
| `GUILD_ID`                    | Discord server (guild) ID     | ⚠️ Optional | -             |
| `INVITE_UI_CHANNEL_ID` | Channel for invite log + control buttons | ✅ Yes      | -             |
| `INVITE_LEADERBOARD_CHANNEL_ID` | Channel ID for invite leaderboard (All Time + monthly) | ❌ No | - |
| `INVITE_LINK_CHANNEL_ID`     | Channel used to create invite links (optional; defaults to system channel) | ❌ No | - |
| `MONGO_URI`                   | MongoDB connection string     | ✅ Yes      | -             |
| `API_URL`                     | API server URL                | ❌ No       | -             |
| `API_SECRET_KEY`              | API secret key                | ❌ No       | -             |
| `NODE_ENV`                    | Environment                   | ❌ No       | `development` |

#### API (`api/.env`)

| Variable          | Description               | Required | Default               |
| ----------------- | ------------------------- | -------- | --------------------- |
| `API_PORT`        | Port for API server       | ❌ No    | `3001`                |
| `MONGO_URI`       | MongoDB connection string | ✅ Yes   | -                     |
| `API_SECRET_KEY`  | Secret key for API auth   | ✅ Yes   | -                     |
| `ALLOWED_ORIGINS` | CORS allowed origins      | ❌ No    | `localhost:3000,3001` |
| `NODE_ENV`        | Environment               | ❌ No    | `development`         |

### MongoDB Connection Strings

**Local MongoDB:**

```env
MONGO_URI=mongodb://localhost:27017/honorbot
```

**MongoDB Atlas (Cloud):**

Get your connection string from MongoDB Atlas Dashboard:
1. Go to MongoDB Atlas Dashboard
2. Click **Connect** → **Connect your application**
3. Copy the connection string
4. Replace `<password>` and `<database>` with your actual values

```env
# Get your connection string from MongoDB Atlas Dashboard
# Format: mongodb+srv://<username>:<password>@<cluster-host>/<database>
MONGO_URI=your_mongodb_atlas_connection_string_here
```

**Important:** Never commit your actual MongoDB credentials to Git!

**Docker (automatically set by docker-compose.yml):**

```env
MONGO_URI=mongodb://mongodb:27017/honorbot
```

---

## 📖 Documentation

- 📘 [Bot Documentation](./bot/README.md) - Bot usage guide
- 🌐 [API Documentation](./api/README.md) - API endpoints and usage
- 📊 [Google Sheets Integration](./GOOGLE_SHEETS_INTEGRATION.md) - Google Sheets integration guide

### 📊 Google Sheets Integration

ระบบรองรับการเชื่อมต่อกับ Google Sheets เพื่อแสดงข้อมูลการเชิญแบบหลายชีท:

1. **Summary Sheet**: แสดงสรุปการเชิญทั้งหมด พร้อมคอลัมน์ "Name"
2. **Individual User Sheets**: สร้างชีทแยกสำหรับแต่ละผู้ใช้ แสดงรายละเอียดว่าเชิญใครมาบ้าง เวลาไหนบ้าง

**วิธีตั้งค่า:**

1. เปิด Google Sheet → Extensions → Apps Script
2. Copy โค้ดจาก `google-sheets-script.js`
3. แก้ไข `API_URL` และ `GUILD_ID` ให้ตรงกับของคุณ:
   ```javascript
   const API_URL = 'http://YOUR_SERVER_IP:3001';
   const GUILD_ID = 'YOUR_DISCORD_GUILD_ID';
   ```
4. รัน function `updateAllSheets()` เพื่อสร้างชีททั้งหมด
5. รัน `createTrigger5Minutes()` เพื่อตั้งค่าอัปเดตอัตโนมัติทุก 5 นาที

**หมายเหตุ:**
- ต้องแก้ไข `API_URL` และ `GUILD_ID` ให้เป็นค่าจริง (ไม่ใช่ placeholder)
- ตรวจสอบว่า `ALLOWED_ORIGINS` ใน `api/.env` มี `https://script.google.com`
- ใช้ Execution Logs ใน Google Apps Script เพื่อ debug

ดูรายละเอียดเพิ่มเติมที่ [Google Sheets Integration Guide](./GOOGLE_SHEETS_INTEGRATION.md)

### 🧪 API Testing

ใช้ไฟล์ `api-test.html` เพื่อทดสอบ API endpoints:

1. เปิดไฟล์ `api-test.html` ในเบราว์เซอร์
2. แก้ไข Base URL ถ้าจำเป็น (default: `http://localhost:3001/api`)
3. ทดสอบ endpoints ต่างๆ ได้ทันที

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

   When used in the shared dev setup, the API is exposed on host port **3013** and MongoDB on **27020** to avoid port conflicts.

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

| Method | Endpoint                | Description                                      | Auth Required |
| ------ | ----------------------- | ------------------------------------------------ | ------------- |
| `POST` | `/joins`                | Record a member join                             | ✅ Yes        |
| `GET`  | `/stats/:userId`        | Get user statistics (unique users + total joins) | ❌ No         |
| `GET`  | `/stats/:userId/history` | Get historical stats with date range              | ❌ No         |
| `GET`  | `/leaderboard`          | Get invite leaderboard (optional `?year=&month=` for monthly) | ❌ No         |
| `GET`  | `/invites/:userId`      | Get user's invites                               | ❌ No         |
| `GET`  | `/joins/:inviterId`     | Get join records for inviter (with date filter)  | ❌ No         |
| `GET`  | `/history/:guildId`     | Get all join history for guild (with filters)    | ❌ No         |
| `GET`  | `/health`               | Health check                                     | ❌ No         |
| `GET`  | `/debug/:guildId`       | Debug endpoint                                   | ❌ No         |
| `GET`  | `/sheets/:guildId`      | Google Sheets data (CSV/JSON format)             | ❌ No         |

See more details at [API Documentation](./api/README.md)

---

## 🤖 Bot Commands

### Invite controls (buttons in `INVITE_UI_CHANNEL_ID`)

Users interact via buttons only (no typing):

- **Check my link** – Shows your personal invite link or prompts you to generate one
- **Generate invite link** – Creates your one-time personal link (never expires, unlimited uses). If you already have one, shows it instead
- **How many did I invite** – Shows how many members you have invited

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

## 📊 Invite UI & Leaderboard

### Invite UI Channel (`INVITE_UI_CHANNEL_ID`)

The bot posts two messages in this channel:

1. **Invite Controls** – Embed with 3 buttons (use buttons only; no slash command for generating links):
   - **Check my link** – View your personal invite link (if you have one)
   - **Generate invite link** – Create your personal invite link (one per user, never expires)
   - **How many did I invite** – See how many members you invited

2. **Status Log - Invite Successes** – Last 10 successful invites from personal links. Updates every 1 minute and when someone joins via a personal link.

### Leaderboard Channel (`INVITE_LEADERBOARD_CHANNEL_ID`, optional)

If set, the bot posts a message with two embeds:

- **Invite Rankings - All Time (Top 10)**
- **Invite Rankings - (Month Year) (Top 10)**

Updates every 5 minutes.

### Invite Counting Logic

- **Only button-created links** – Joins are counted only when the invite was created via **Generate invite link**. Old or manually created links are not counted.
- **Unique users** – Each invited member is counted once per inviter, even if they leave and rejoin.
- **Personal link** – One link per user per server; links do not expire and have unlimited uses.

---

## ❓ Troubleshooting

### Bot Not Working

- ✅ Check that `DISCORD_TOKEN` is correct
- ✅ Check that bot has **Server Members Intent** enabled
- ✅ Check that bot has necessary permissions in server
- ✅ Check MongoDB connection

### Invite UI Not Displaying

- ✅ Check that `INVITE_UI_CHANNEL_ID` is correct
- ✅ Check that bot has permission to send messages and embed links in that channel
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
- ✅ Use `api-test.html` for interactive API testing
- ✅ Rebuild API container if new endpoints are added: `docker-compose up -d --build invite-tracker-api`

### Google Sheets Not Updating

- ✅ Check that `API_URL` and `GUILD_ID` are set correctly in Google Apps Script (not placeholders)
- ✅ Check that `ALLOWED_ORIGINS` in `api/.env` includes `https://script.google.com`
- ✅ Check Execution Logs in Google Apps Script (View → Logs)
- ✅ Test API connection: Run `testConnection()` function in Google Apps Script
- ✅ Verify API is accessible from outside: `curl http://YOUR_SERVER_IP:3001/api/health`

### Port Conflicts

- ✅ If MongoDB port 27017 is already in use, change port mapping in `docker-compose.yml` (default: 27018)
- ✅ If API port 3001 conflicts, change `API_PORT` in `api/.env`
- ✅ For VPS deployment, ensure firewall allows necessary ports

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
