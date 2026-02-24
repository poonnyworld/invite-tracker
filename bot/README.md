# Discord Invite Tracker Bot

Discord bot สำหรับติดตามการเข้าร่วมเซิร์ฟเวอร์จาก Invite Links ที่ผู้ใช้สร้าง พร้อม Dashboard แสดงสถิติในช่องข้อความ

## Features

- 🔗 **Auto Invite Tracking** - ติดตาม Invite Links ที่ผู้ใช้สร้างอัตโนมัติ
- 👥 **Join Detection** - บันทึกการเข้าร่วมเซิร์ฟเวอร์เมื่อมีคนใช้ Invite
- 📊 **Dashboard Display** - แสดง Leaderboard Top Inviters ในช่องข้อความ
- 📈 **Statistics Command** - คำสั่ง `/invite-stats` สำหรับดูสถิติการเชิญ
- 🔄 **Auto Updates** - Dashboard อัปเดตอัตโนมัติทุก 5 นาที

## Prerequisites

- Node.js 18+
- MongoDB (local หรือ Atlas)
- Discord Bot Token
- Discord Server (Guild) ID

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_guild_id_here
INVITE_UI_CHANNEL_ID=your_dashboard_channel_id_here
MONGO_URI=mongodb://localhost:27017/honorbot
```

### 3. Create Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to **Bot** section and create a bot
4. Copy the bot token to `.env`
5. Enable the following **Privileged Gateway Intents**:
   - ✅ **Server Members Intent** (Required for tracking joins)
   - ✅ **Message Content Intent** (Optional, for future features)

### 4. Invite Bot to Server

Generate invite URL with these permissions:
- View Channels
- Send Messages
- Embed Links
- Read Message History
- Manage Messages (for editing dashboard)

Or use this URL (replace `CLIENT_ID`):
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=2048&scope=bot%20applications.commands
```

### 5. Create Dashboard Channel

1. Create a text channel in your Discord server (e.g., `#invite-dashboard`)
2. Copy the channel ID and add it to `.env` as `INVITE_UI_CHANNEL_ID`
3. Make sure the bot has permission to send messages in this channel

### 6. Deploy Slash Commands

```bash
npm run deploy
```

### 7. Start the Bot

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm run build
npm start
```

## Commands

### `/invite-stats [user]`

View invite statistics for yourself or another user.

- **user** (optional): User to view stats for (defaults to you)

**Example:**
```
/invite-stats
/invite-stats user:@username
```

### `/sync-invites [clear-test-data] [test-guild-id]` (Admin Only)

Sync current server invites to database. Useful when migrating from test server to production server.

**Permissions Required:** Manage Server

**Options:**
- **clear-test-data** (optional): Clear data from test server before syncing (default: false)
- **test-guild-id** (optional): Test server Guild ID to clear (required if clear-test-data is true)

**Usage:**

1. **Sync invites only** (keep test server data):
   ```
   /sync-invites
   ```

2. **Sync invites and clear test server data**:
   ```
   /sync-invites clear-test-data:true test-guild-id:123456789012345678
   ```

**What it does:**
- Fetches all current invites from the server
- Syncs invite data to database (creates new or updates existing)
- Optionally clears data from test server (invites and join records)
- Updates invite cache for accurate tracking

**Note:** This command preserves the original `createdAt` timestamp for existing invites.

## Dashboard

The dashboard automatically displays in the configured channel (`INVITE_UI_CHANNEL_ID`) showing:

- Top 10 users who invited the most members
- Total invites created
- Total members joined
- Updates every 5 minutes automatically

## How It Works

1. **Invite Tracking**: When a user creates an invite link, the bot automatically records it
2. **Join Detection**: When someone joins the server, the bot compares invite usage counts to determine which invite was used
3. **Database Storage**: All data is stored in MongoDB
4. **Dashboard Updates**: The dashboard refreshes automatically every 5 minutes

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DISCORD_TOKEN` | Discord bot token | Yes |
| `CLIENT_ID` | Discord application client ID | Yes |
| `GUILD_ID` | Discord server (guild) ID | Yes |
| `INVITE_UI_CHANNEL_ID` | Channel ID for dashboard display | Yes |
| `MONGO_URI` | MongoDB connection string | Yes |
| `API_URL` | API server URL (optional) | No |
| `API_SECRET_KEY` | API secret key (optional) | No |
| `NODE_ENV` | Environment (development/production) | No |

## Database Collections

### `invites`
Stores invite link information:
- `code`: Invite code
- `inviterId`: User who created the invite
- `guildId`: Server ID
- `uses`: Current number of uses
- `maxUses`: Maximum uses (null = unlimited)
- `expiresAt`: Expiration date (null = never expires)

### `joinrecords`
Stores join records:
- `userId`: User who joined
- `inviterId`: User who created the invite
- `inviteCode`: Invite code used
- `guildId`: Server ID
- `joinedAt`: When the user joined

## Troubleshooting

### Bot not tracking invites

- Make sure the bot has **Server Members Intent** enabled in Discord Developer Portal
- Check that the bot has permission to view invites in the server
- Verify MongoDB connection is working

### Dashboard not updating

- Check that `INVITE_UI_CHANNEL_ID` is set correctly
- Verify the bot has permission to send/edit messages in the channel
- Check bot logs for errors

### Commands not working

- Run `npm run deploy` to register slash commands
- Make sure the bot has `applications.commands` scope when invited
- Wait a few minutes for commands to propagate globally

## Deployment on VPS

### Option 1: Using PM2 (Recommended)

1. **Install PM2 globally:**
   ```bash
   npm install -g pm2
   ```

2. **Build the project:**
   ```bash
   npm run build
   ```

3. **Start with PM2:**
   ```bash
   pm2 start ecosystem.config.js
   ```

4. **Useful PM2 commands:**
   ```bash
   pm2 status              # Check status
   pm2 logs                # View logs
   pm2 restart all         # Restart all apps
   pm2 stop all            # Stop all apps
   pm2 save                # Save current process list
   pm2 startup             # Generate startup script
   ```

### Option 2: Using Docker

1. **Build and start with Docker Compose:**
   ```bash
   docker-compose up -d --build
   ```

2. **View logs:**
   ```bash
   docker-compose logs -f invite-tracker-bot
   ```

3. **Stop services:**
   ```bash
   docker-compose down
   ```

### Option 3: Manual Deployment

1. **Clone repository on VPS:**
   ```bash
   git clone <repository-url>
   cd invite-tracker
   ```

2. **Install dependencies:**
   ```bash
   npm install --production
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   nano .env  # Edit with your values
   ```

4. **Build and start:**
   ```bash
   npm run build
   npm start
   ```

### Setting up MongoDB on VPS

**Option A: MongoDB Atlas (Cloud)**
- Create free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- Create cluster and get connection string
- Update `MONGO_URI` in `.env`

**Option B: Local MongoDB with Docker**
```bash
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -v mongodb_data:/data/db \
  mongo:7
```

**Option C: Install MongoDB directly**
```bash
# Ubuntu/Debian
sudo apt-get install mongodb

# Start MongoDB
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

### Nginx Reverse Proxy (Optional)

If you want to expose the API server through Nginx:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## License

ISC
