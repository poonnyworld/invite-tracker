# 🔧 แก้ไขปัญหา Individual Sheets ไม่แสดงข้อมูล

## ⚠️ ปัญหาที่พบ

- Summary Sheet แสดงข้อมูลถูกต้อง (มี 2 คน แต่ละคนเชิญได้ 1 คน)
- แต่ Individual Sheets (ชีทของแต่ละบุคคล) แสดง "No join records available"

## 🔍 สาเหตุที่เป็นไปได้

### 1. API Endpoint `/api/joins/:inviterId` ไม่ทำงาน

**ตรวจสอบ:**
```bash
curl "http://YOUR_SERVER_IP:3001/api/joins/314323353429213185?guildId=YOUR_GUILD_ID"
```

**ควรได้ response:**
```json
{
  "success": true,
  "data": [
    {
      "userId": "...",
      "inviterId": "314323353429213185",
      "inviteCode": "...",
      "guildId": "...",
      "joinedAt": "..."
    }
  ]
}
```

**ถ้าได้ error:**
- ตรวจสอบว่า API server rebuild แล้ว: `docker-compose up -d --build invite-tracker-api`
- ตรวจสอบ logs: `docker-compose logs invite-tracker-api`

### 2. Configuration ไม่ถูกต้อง

**ตรวจสอบใน Google Apps Script:**
```javascript
const API_URL = 'http://143.14.200.26:3001'; // ต้องเป็น IP address จริง
const GUILD_ID = '1098556040439660616'; // ต้องเป็น Guild ID จริง
```

### 3. ข้อมูลใน Database ไม่มี

**ตรวจสอบ:**
- ตรวจสอบว่า Discord Bot บันทึกข้อมูล join records แล้ว
- ตรวจสอบว่า inviterId ถูกต้อง
- ตรวจสอบว่า guildId ตรงกับ Discord Server

### 4. CORS Error

**ตรวจสอบ:**
- ตรวจสอบว่า `ALLOWED_ORIGINS` ใน `api/.env` มี `https://script.google.com`
- Restart API server

## 🧪 วิธี Debug

### ใน Google Apps Script:

1. **เปิด Execution Logs:**
   - View → Logs
   - รัน `updateAllSheets()` หรือ `updateUserSheet()`
   - ดู logs เพื่อดู error messages

2. **ทดสอบ fetchJoinRecords:**
   ```javascript
   function testFetchJoinRecords() {
     const inviterId = '314323353429213185';
     const records = fetchJoinRecords(inviterId);
     Logger.log('Records: ' + JSON.stringify(records));
     return records;
   }
   ```

3. **ตรวจสอบ API URL:**
   ```javascript
   function testAPI() {
     const url = `${API_URL}/api/health`;
     Logger.log('Testing URL: ' + url);
     const response = UrlFetchApp.fetch(url);
     Logger.log('Response: ' + response.getContentText());
   }
   ```

## ✅ Checklist

- [ ] API endpoint `/api/joins/:inviterId` ทำงาน (ทดสอบด้วย curl)
- [ ] Google Apps Script มี `API_URL` และ `GUILD_ID` ที่ถูกต้อง
- [ ] CORS configuration ถูกต้อง (`https://script.google.com` ใน ALLOWED_ORIGINS)
- [ ] API server rebuild แล้ว
- [ ] ตรวจสอบ Execution Logs ใน Google Apps Script
- [ ] ตรวจสอบว่า Discord Bot บันทึกข้อมูล join records แล้ว

## 🔄 หลังจากแก้ไข

1. อัพเดต Google Apps Script ด้วยโค้ดใหม่ (มี logging เพิ่มเติม)
2. รัน `updateAllSheets()` อีกครั้ง
3. ตรวจสอบ Execution Logs เพื่อดู error messages
4. ถ้ายังมีปัญหา ให้ดู logs เพื่อ debug ต่อ

## 💡 Tips

- ใช้ `testFetchJoinRecords()` เพื่อทดสอบการดึงข้อมูล
- ตรวจสอบ Logs ทุกครั้งที่รัน script
- ถ้า API ไม่ทำงาน ให้ rebuild API container: `docker-compose up -d --build invite-tracker-api`
