# 📊 API สำหรับดึงประวัติการเชิญ

## ✅ สามารถดึงประวัติการเชิญได้แล้ว!

ระบบมีการเก็บข้อมูลประวัติการเชิญทั้งหมดในฐานข้อมูล และมี API endpoints สำหรับดึงข้อมูลประวัติดังนี้:

---

## 🔍 API Endpoints

### 1. ดึงประวัติการ join ของผู้เชิญคนใดคนหนึ่ง

**Endpoint:** `GET /api/joins/:inviterId`

**Query Parameters:**
- `guildId` (optional): Filter by Guild ID
- `startDate` (optional): วันที่เริ่มต้น (ISO 8601 format, เช่น `2024-01-01T00:00:00.000Z`)
- `endDate` (optional): วันที่สิ้นสุด (ISO 8601 format)
- `limit` (optional): จำนวนผลลัพธ์สูงสุด

**ตัวอย่าง:**
```bash
# ดึงประวัติทั้งหมด
curl "http://localhost:3001/api/joins/314323353429213185?guildId=1098556040439660616"

# ดึงประวัติในช่วงวันที่
curl "http://localhost:3001/api/joins/314323353429213185?guildId=1098556040439660616&startDate=2024-01-01&endDate=2024-01-31"

# ดึงประวัติล่าสุด 10 รายการ
curl "http://localhost:3001/api/joins/314323353429213185?guildId=1098556040439660616&limit=10"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "userId": "123456789012345678",
      "inviterId": "314323353429213185",
      "inviteCode": "abc123",
      "guildId": "1098556040439660616",
      "joinedAt": "2024-01-15T10:30:00.000Z",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "count": 1
}
```

---

### 2. ดึงประวัติการ join ทั้งหมดของ Guild

**Endpoint:** `GET /api/history/:guildId`

**Query Parameters:**
- `startDate` (optional): วันที่เริ่มต้น
- `endDate` (optional): วันที่สิ้นสุด
- `inviterId` (optional): Filter by inviter ID
- `limit` (optional): จำนวนผลลัพธ์สูงสุด

**ตัวอย่าง:**
```bash
# ดึงประวัติทั้งหมดของ Guild
curl "http://localhost:3001/api/history/1098556040439660616"

# ดึงประวัติในช่วงวันที่
curl "http://localhost:3001/api/history/1098556040439660616?startDate=2024-01-01&endDate=2024-01-31"

# ดึงประวัติของ inviter เฉพาะ
curl "http://localhost:3001/api/history/1098556040439660616?inviterId=314323353429213185"

# ดึงประวัติล่าสุด 50 รายการ
curl "http://localhost:3001/api/history/1098556040439660616?limit=50"
```

---

### 3. ดึงสถิติตามช่วงเวลา

**Endpoint:** `GET /api/stats/:userId/history`

**Query Parameters:**
- `guildId` (optional): Filter by Guild ID
- `startDate` (optional): วันที่เริ่มต้น
- `endDate` (optional): วันที่สิ้นสุด

**ตัวอย่าง:**
```bash
# ดึงสถิติทั้งหมด
curl "http://localhost:3001/api/stats/314323353429213185/history?guildId=1098556040439660616"

# ดึงสถิติในช่วงวันที่
curl "http://localhost:3001/api/stats/314323353429213185/history?guildId=1098556040439660616&startDate=2024-01-01&endDate=2024-01-31"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "314323353429213185",
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

---

## 📅 Date Format

ใช้ ISO 8601 format:
- `2024-01-01` (วันที่เท่านั้น)
- `2024-01-01T00:00:00.000Z` (วันที่และเวลา UTC)
- `2024-01-01T10:30:00+07:00` (วันที่และเวลา timezone)

---

## 💡 Use Cases

### 1. ดึงสถิติรายเดือน
```bash
# มกราคม 2024
curl "http://localhost:3001/api/stats/USER_ID/history?guildId=GUILD_ID&startDate=2024-01-01&endDate=2024-01-31"

# กุมภาพันธ์ 2024
curl "http://localhost:3001/api/stats/USER_ID/history?guildId=GUILD_ID&startDate=2024-02-01&endDate=2024-02-29"
```

### 2. ดึงประวัติล่าสุด
```bash
# ล่าสุด 100 รายการ
curl "http://localhost:3001/api/history/GUILD_ID?limit=100"
```

### 3. ดึงประวัติของ inviter เฉพาะในช่วงเวลา
```bash
curl "http://localhost:3001/api/joins/INVITER_ID?guildId=GUILD_ID&startDate=2024-01-01&endDate=2024-01-31"
```

---

## 🔗 ใช้กับ Google Sheets

คุณสามารถใช้ endpoints เหล่านี้ใน Google Apps Script เพื่อดึงข้อมูลประวัติ:

```javascript
// ดึงประวัติของ inviter
function fetchInviterHistory(inviterId, startDate, endDate) {
  const url = `${API_URL}/api/joins/${inviterId}?guildId=${GUILD_ID}&startDate=${startDate}&endDate=${endDate}`;
  const response = UrlFetchApp.fetch(url);
  const data = JSON.parse(response.getContentText());
  return data.success ? data.data : [];
}

// ดึงสถิติตามช่วงเวลา
function fetchHistoricalStats(userId, startDate, endDate) {
  const url = `${API_URL}/api/stats/${userId}/history?guildId=${GUILD_ID}&startDate=${startDate}&endDate=${endDate}`;
  const response = UrlFetchApp.fetch(url);
  const data = JSON.parse(response.getContentText());
  return data.success ? data.data : null;
}
```

---

## 📝 หมายเหตุ

- ข้อมูลประวัติถูกเก็บตั้งแต่เริ่มใช้ระบบ
- การ filter ตามวันที่จะใช้ฟิลด์ `joinedAt` (เวลาที่ join)
- ถ้าไม่ระบุ `limit` จะดึงข้อมูลทั้งหมด
- ข้อมูลจะเรียงตาม `joinedAt` จากใหม่ไปเก่า (descending)
