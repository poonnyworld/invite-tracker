# Invite Tracker System

ระบบติดตามการเข้าร่วมเซิร์ฟเวอร์ Discord จาก Invite Links พร้อม Dashboard และ API Server

## โครงสร้าง

```
invite-tracker-system/
├── bot/              # Discord Bot
│   ├── src/
│   ├── Dockerfile
│   ├── package.json
│   └── .env
├── api/              # API Server
│   ├── src/
│   ├── Dockerfile
│   ├── package.json
│   └── .env
└── README.md
```

## Quick Start

### 1. Configure Environment Variables

**Bot Configuration:**
```bash
cd bot
cp .env.example .env
nano .env
```

**API Configuration:**
```bash
cd api
cp .env.example .env
nano .env
```

### 2. Run with Docker Compose

จากโฟลเดอร์ `invite-tracker-system/`:

```bash
docker-compose up -d --build
```

หรือใช้ helper script จาก root:
```bash
cd ..
./docker-start.sh
```

### 3. Deploy Slash Commands

```bash
docker-compose exec invite-tracker-bot node dist/deploy-commands.js
```

## Development

### Run Bot Locally

```bash
cd bot
npm install
npm run dev
```

### Run API Locally

```bash
cd api
npm install
npm run dev
```

## Documentation

- Bot: See `bot/README.md`
- API: See `api/README.md`
- Docker: See `../DOCKER.md`
