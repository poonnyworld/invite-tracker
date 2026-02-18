# 🎯 Invite Tracker System

<div align="center">

**ระบบติดตามการเข้าร่วมเซิร์ฟเวอร์ Discord จาก Invite Links พร้อม Dashboard และ API Server**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Discord.js](https://img.shields.io/badge/Discord.js-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.js.org/)

</div>

---

## 📋 สารบัญ

- [✨ Features](#-features)
- [🏗️ โครงสร้างโปรเจค](#️-โครงสร้างโปรเจค)
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
- 🔗 **Auto Invite Tracking** - ติดตาม Invite Links ที่ผู้ใช้สร้างอัตโนมัติ
- 👥 **Join Detection** - บันทึกการเข้าร่วมเซิร์ฟเวอร์เมื่อมีคนใช้ Invite
- 📊 **Dashboard Display** - แสดง Leaderboard Top Inviters ในช่องข้อความ
- 📈 **Statistics Command** - คำสั่ง `/invite-stats` สำหรับดูสถิติการเชิญ
- 🔄 **Auto Updates** - Dashboard อัปเดตอัตโนมัติทุก 5 นาที
- 🔄 **Sync Command** - คำสั่ง `/sync-invites` สำหรับ sync invites จากเซิร์ฟเวอร์

### 🌐 API Server
- 📝 **Record Joins** - POST endpoint สำหรับบันทึกการเข้าร่วม
- 📊 **Get Statistics** - GET endpoint สำหรับดูสถิติการเชิญ
- 🏆 **Leaderboard** - GET endpoint สำหรับดู leaderboard
- 🔗 **List Invites** - GET endpoint สำหรับดู invite links ของผู้ใช้
- 🔒 **API Key Authentication** - ป้องกัน API ด้วย API key
- 📈 **Google Sheets Integration** - รองรับการส่งข้อมูลไปยัง Google Sheets

---

## 🏗️ โครงสร้างโปรเจค

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

- **Node.js** 18+ (สำหรับ development)
- **Docker** และ **Docker Compose** (สำหรับ deployment)
- **MongoDB** (local หรือ Atlas)
- **Discord Bot Token** ([สร้างได้ที่นี่](https://discord.com/developers/applications))

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
nano .env  # หรือใช้ editor อื่นๆ
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

1. ไปที่ [Discord Developer Portal](https://discord.com/developers/applications)
2. สร้าง Application ใหม่
3. ไปที่ **Bot** section และสร้าง bot
4. คัดลอก Bot Token ไปใส่ใน `bot/.env`
5. เปิดใช้งาน **Privileged Gateway Intents**:
   - ✅ **Server Members Intent** (จำเป็นสำหรับ tracking joins)
   - ✅ **Message Content Intent** (optional)

6. เชิญ Bot เข้าเซิร์ฟเวอร์ด้วย URL นี้ (แทนที่ `YOUR_CLIENT_ID`):
   ```
   https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=2048&scope=bot%20applications.commands
   ```

### 4️⃣ Run with Docker Compose

```bash
# จากโฟลเดอร์ invite-tracker-system/
docker-compose up -d --build
```

### 5️⃣ Deploy Slash Commands

```bash
docker-compose exec invite-tracker-bot node dist/deploy-commands.js
```

### 6️⃣ Verify Installation

- ✅ Bot ควรจะ online ในเซิร์ฟเวอร์ Discord
- ✅ Dashboard ควรจะแสดงในช่องที่กำหนด (`INVITE_DASHBOARD_CHANNEL_ID`)
- ✅ API ควรจะทำงานที่ `http://localhost:3001`
- ✅ ตรวจสอบ health: `curl http://localhost:3001/api/health`

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

- 📘 [Bot Documentation](./bot/README.md) - คำแนะนำการใช้งาน Bot
- 🌐 [API Documentation](./api/README.md) - API endpoints และการใช้งาน
- 📊 [Google Sheets Integration](./GOOGLE_SHEETS_INTEGRATION.md) - การเชื่อมต่อกับ Google Sheets

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
- สร้างบัญชีที่ [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- สร้าง cluster และคัดลอก connection string
- อัปเดต `MONGO_URI` ใน `.env`

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

ดูรายละเอียดเพิ่มเติมที่ [API Documentation](./api/README.md)

---

## 🤖 Bot Commands

### `/invite-stats [user]`

ดูสถิติการเชิญของคุณหรือผู้ใช้คนอื่น

**Options:**
- `user` (optional): ผู้ใช้ที่ต้องการดูสถิติ (default: คุณ)

**Example:**
```
/invite-stats
/invite-stats user:@username
```

### `/sync-invites [clear-test-data] [test-guild-id]` (Admin Only)

Sync invites ปัจจุบันจากเซิร์ฟเวอร์ไปยัง database

**Permissions Required:** Manage Server

**Options:**
- `clear-test-data` (optional): ลบข้อมูลจาก test server (default: false)
- `test-guild-id` (optional): Test server Guild ID (required ถ้า clear-test-data เป็น true)

**Example:**
```
/sync-invites
/sync-invites clear-test-data:true test-guild-id:123456789012345678
```

ดูรายละเอียดเพิ่มเติมที่ [Bot Documentation](./bot/README.md)

---

## 📊 Dashboard

Dashboard จะแสดงอัตโนมัติในช่องที่กำหนด (`INVITE_DASHBOARD_CHANNEL_ID`) โดยแสดง:

- 🏆 **Top 10 Inviters** - ผู้ใช้ที่เชิญคนได้มากที่สุด
- 📈 **Total Statistics** - สถิติรวมทั้งหมด
- 🔄 **Auto Updates** - อัปเดตอัตโนมัติทุก 5 นาที

---

## ❓ Troubleshooting

### Bot ไม่ทำงาน

- ✅ ตรวจสอบว่า `DISCORD_TOKEN` ถูกต้อง
- ✅ ตรวจสอบว่า Bot มี **Server Members Intent** เปิดอยู่
- ✅ ตรวจสอบว่า Bot มี permission ที่จำเป็นในเซิร์ฟเวอร์
- ✅ ตรวจสอบ MongoDB connection

### Dashboard ไม่แสดง

- ✅ ตรวจสอบว่า `INVITE_DASHBOARD_CHANNEL_ID` ถูกต้อง
- ✅ ตรวจสอบว่า Bot มี permission ส่งข้อความในช่องนั้น
- ✅ ตรวจสอบ logs: `docker-compose logs -f invite-tracker-bot`

### Commands ไม่ทำงาน

- ✅ Deploy commands: `docker-compose exec invite-tracker-bot node dist/deploy-commands.js`
- ✅ ตรวจสอบว่า Bot มี `applications.commands` scope เมื่อเชิญ
- ✅ รอสักครู่สำหรับ global commands (อาจใช้เวลาถึง 1 ชั่วโมง)

### API ไม่ทำงาน

- ✅ ตรวจสอบว่า API server ทำงาน: `curl http://localhost:3001/api/health`
- ✅ ตรวจสอบ logs: `docker-compose logs -f invite-tracker-api`
- ✅ ตรวจสอบ MongoDB connection
- ✅ ตรวจสอบ `API_SECRET_KEY` สำหรับ authenticated endpoints

### MongoDB Connection Issues

- ✅ ตรวจสอบว่า MongoDB ทำงาน: `docker-compose ps mongodb`
- ✅ ตรวจสอบ connection string ใน `.env`
- ✅ สำหรับ Docker: ใช้ `mongodb://mongodb:27017/honorbot`
- ✅ สำหรับ local: ใช้ `mongodb://localhost:27017/honorbot`

---

## 📝 License

ISC

---

## 🙏 Credits

สร้างด้วย ❤️ โดยใช้:
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
