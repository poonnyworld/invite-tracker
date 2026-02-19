# Invite Tracker API

REST API server for Discord invite tracking system. Provides endpoints for recording and retrieving invite statistics.

## Features

- 📝 **Record Joins** - POST endpoint for recording member joins
- 📊 **Get Statistics** - GET endpoint for user invite statistics
- 🏆 **Leaderboard** - GET endpoint for invite leaderboard
- 🔗 **List Invites** - GET endpoint for user's invite links
- 🔒 **API Key Authentication** - Secure API endpoints

## Prerequisites

- Node.js 18+
- MongoDB (local หรือ Atlas)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env`:

```env
API_PORT=3001
MONGO_URI=mongodb://localhost:27017/honorbot
API_SECRET_KEY=your_api_secret_key_here
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

### 3. Start the Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm run build
npm start
```

The API will be available at `http://localhost:3001` (or your configured port).

## API Endpoints

### POST `/api/joins`

Record a member join event.

**Headers:**
```
X-API-Key: your_api_secret_key
Content-Type: application/json
```

**Body:**
```json
{
  "userId": "123456789012345678",
  "inviterId": "987654321098765432",
  "inviteCode": "abc123",
  "guildId": "111111111111111111",
  "joinedAt": "2024-01-01T00:00:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "userId": "123456789012345678",
    "inviterId": "987654321098765432",
    "inviteCode": "abc123",
    "guildId": "111111111111111111",
    "joinedAt": "2024-01-01T00:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### GET `/api/stats/:userId`

Get invite statistics for a user.

**Query Parameters:**
- `guildId` (optional): Filter by guild ID

**Example:**
```
GET /api/stats/123456789012345678?guildId=111111111111111111
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "123456789012345678",
    "totalInvites": 10,
    "invitedMembers": 25,
    "totalJoins": 25,
    "activeInvites": 5
  }
}
```

**Field Descriptions:**
- `totalInvites`: จำนวน Invite Links ที่สร้าง
- `invitedMembers`: จำนวนผู้ใช้ที่เชิญได้ (จำนวนคนที่ join จาก invites ของคนนี้)
- `totalJoins`: Alias ของ `invitedMembers` (สำหรับ backward compatibility)
- `activeInvites`: จำนวน Invite Links ที่ยังใช้งานได้

### GET `/api/leaderboard`

Get invite leaderboard.

**Query Parameters:**
- `guildId` (required): Guild ID to get leaderboard for
- `limit` (optional): Number of results (default: 10)

**Example:**
```
GET /api/leaderboard?guildId=111111111111111111&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "inviterId": "123456789012345678",
      "invitedMembers": 50,
      "totalJoins": 50
    },
    {
      "inviterId": "987654321098765432",
      "invitedMembers": 30,
      "totalJoins": 30
    }
  ]
}
```

**Field Descriptions:**
- `inviterId`: Discord User ID ของผู้เชิญ
- `invitedMembers`: จำนวนผู้ใช้ที่เชิญได้ (unique users - แต่ละคนนับแค่ 1 ครั้ง)
- `totalJoins`: จำนวนครั้งที่ join ทั้งหมด (รวมคนที่ join หลายครั้ง)
- `uniqueUsers`: จำนวน unique users (เหมือน `invitedMembers`)

### GET `/api/joins/:inviterId`

Get join records (history) for a specific inviter.

**Query Parameters:**
- `guildId` (optional): Filter by guild ID
- `startDate` (optional): Start date filter (ISO 8601 format, e.g., `2024-01-01T00:00:00.000Z`)
- `endDate` (optional): End date filter (ISO 8601 format)
- `limit` (optional): Limit number of results

**Example:**
```
GET /api/joins/123456789012345678?guildId=111111111111111111&startDate=2024-01-01&limit=100
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "userId": "987654321098765432",
      "inviterId": "123456789012345678",
      "inviteCode": "abc123",
      "guildId": "111111111111111111",
      "joinedAt": "2024-01-01T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

### GET `/api/history/:guildId`

Get all join history for a guild with optional filters.

**Query Parameters:**
- `startDate` (optional): Start date filter (ISO 8601 format)
- `endDate` (optional): End date filter (ISO 8601 format)
- `inviterId` (optional): Filter by specific inviter
- `limit` (optional): Limit number of results

**Example:**
```
GET /api/history/111111111111111111?startDate=2024-01-01&endDate=2024-01-31
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "userId": "987654321098765432",
      "inviterId": "123456789012345678",
      "inviteCode": "abc123",
      "guildId": "111111111111111111",
      "joinedAt": "2024-01-15T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

### GET `/api/stats/:userId/history`

Get historical statistics for a user within a date range.

**Query Parameters:**
- `guildId` (optional): Filter by guild ID
- `startDate` (optional): Start date filter (ISO 8601 format)
- `endDate` (optional): End date filter (ISO 8601 format)

**Example:**
```
GET /api/stats/123456789012345678/history?guildId=111111111111111111&startDate=2024-01-01&endDate=2024-01-31
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "123456789012345678",
    "totalInvites": 10,
    "invitedMembers": 5,
    "totalJoins": 8,
    "uniqueUsers": 5,
    "activeInvites": 3,
    "dateRange": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-31"
    }
  }
}
```

### GET `/api/invites/:userId`

Get invite links for a user.

**Query Parameters:**
- `guildId` (optional): Filter by guild ID

**Example:**
```
GET /api/invites/123456789012345678?guildId=111111111111111111
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "code": "abc123",
      "inviterId": "123456789012345678",
      "guildId": "111111111111111111",
      "uses": 5,
      "maxUses": 10,
      "expiresAt": null,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### GET `/api/health`

Health check endpoint.

**Response:**
```json
{
  "success": true,
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected"
}
```

## Authentication

All POST endpoints require API key authentication via header:

```
X-API-Key: your_api_secret_key
```

Or via Authorization header:

```
Authorization: Bearer your_api_secret_key
```

## Rate Limiting

API endpoints are rate-limited:
- **100 requests per 15 minutes** per IP address
- Rate limit headers are included in responses

## CORS

CORS is configured to allow requests from specified origins in `ALLOWED_ORIGINS` environment variable.

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `API_PORT` | Port to run the API server | No | 3001 |
| `MONGO_URI` | MongoDB connection string | Yes | - |
| `API_SECRET_KEY` | Secret key for API authentication | Yes | - |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins | No | localhost:3000,3001 |
| `NODE_ENV` | Environment (development/production) | No | development |

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message"
}
```

Common status codes:
- `400` - Bad Request (missing/invalid parameters)
- `401` - Unauthorized (invalid API key)
- `500` - Internal Server Error
- `503` - Service Unavailable (database not connected)

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
   pm2 restart all          # Restart all apps
   pm2 stop all             # Stop all apps
   pm2 save                 # Save current process list
   pm2 startup              # Generate startup script
   ```

### Option 2: Using Docker

1. **Build and start with Docker Compose:**
   ```bash
   docker-compose up -d --build
   ```

2. **View logs:**
   ```bash
   docker-compose logs -f invite-tracker-api
   ```

3. **Stop services:**
   ```bash
   docker-compose down
   ```

### Option 3: Manual Deployment

1. **Clone repository on VPS:**
   ```bash
   git clone <repository-url>
   cd invite-tracker-api
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

### Nginx Reverse Proxy

Example Nginx configuration for API server:

```nginx
server {
    listen 80;
    server_name api.your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Security Recommendations

1. **Use HTTPS:** Set up SSL certificate with Let's Encrypt
2. **Firewall:** Only expose necessary ports (e.g., 80, 443)
3. **API Key:** Use strong, random API secret key
4. **Rate Limiting:** Already configured, but adjust if needed
5. **Environment Variables:** Never commit `.env` files to Git

## License

ISC
