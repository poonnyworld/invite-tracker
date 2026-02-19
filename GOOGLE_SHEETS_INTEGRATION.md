# Google Sheets Integration Guide

คู่มือการเชื่อมต่อข้อมูลการเชิญจาก API ไปยัง Google Sheets อัตโนมัติ

## วิธีที่ 1: ใช้ Google Apps Script (แนะนำ)

### ขั้นตอนการตั้งค่า

1. **สร้าง Google Sheet ใหม่**
   - ไปที่ [Google Sheets](https://sheets.google.com)
   - สร้าง Sheet ใหม่

2. **เปิด Google Apps Script Editor**
   - ใน Google Sheet: `Extensions` → `Apps Script`
   - หรือไปที่ [script.google.com](https://script.google.com)

3. **เพิ่ม Script นี้:**

```javascript
// Configuration
const API_URL = 'http://localhost:3001'; // หรือ URL ของ API server
const GUILD_ID = 'YOUR_DISCORD_GUILD_ID'; // Discord Guild ID ของคุณ

/**
 * Fetch invite leaderboard from API
 */
function fetchInviteLeaderboard() {
  try {
    const url = `${API_URL}/api/leaderboard?guildId=${GUILD_ID}&limit=100`;
    
    const response = UrlFetchApp.fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const data = JSON.parse(response.getContentText());
    
    if (data.success && data.data) {
      return data.data;
    } else {
      Logger.log('Error: ' + JSON.stringify(data));
      return [];
    }
  } catch (error) {
    Logger.log('Error fetching data: ' + error.toString());
    return [];
  }
}

/**
 * Update Google Sheet with leaderboard data
 */
function updateLeaderboardSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // Clear existing data
  sheet.clear();
  
  // Set headers
  const headers = [['Rank', 'User ID', 'Invited Members', 'Last Updated']];
  sheet.getRange(1, 1, 1, 4).setValues(headers);
  sheet.getRange(1, 1, 1, 4).setFontWeight('bold');
  
  // Fetch data
  const leaderboard = fetchInviteLeaderboard();
  
  if (leaderboard.length === 0) {
    sheet.getRange(2, 1).setValue('No data available');
    return;
  }
  
  // Prepare data rows
  const rows = leaderboard.map((item, index) => [
    index + 1,                    // Rank
    item.inviterId,              // User ID
    item.invitedMembers,          // Invited Members
    new Date(),                   // Last Updated
  ]);
  
  // Write data
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 4).setValues(rows);
    
    // Format date column
    const dateRange = sheet.getRange(2, 4, rows.length, 1);
    dateRange.setNumberFormat('yyyy-mm-dd hh:mm:ss');
    
    // Auto-resize columns
    sheet.autoResizeColumns(1, 4);
  }
  
  Logger.log(`Updated ${rows.length} rows`);
}

/**
 * Set up time-driven trigger (runs every hour)
 */
function createTrigger() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'updateLeaderboardSheet') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new trigger (runs every hour)
  ScriptApp.newTrigger('updateLeaderboardSheet')
    .timeBased()
    .everyHours(1)
    .create();
  
  Logger.log('Trigger created: Updates every hour');
}

/**
 * Manual update function (can be called from menu)
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Invite Tracker')
    .addItem('Update Leaderboard', 'updateLeaderboardSheet')
    .addItem('Setup Auto-Update', 'createTrigger')
    .addToUi();
}
```

4. **ตั้งค่า API URL**
   - แก้ไข `API_URL` ใน script ให้ชี้ไปที่ API server ของคุณ
   - ถ้า API อยู่บน VPS: `https://your-domain.com` หรือ `http://your-ip:3001`
   - ถ้า local: `http://localhost:3001` (จะไม่ทำงานถ้า Sheet อยู่บน cloud)

5. **รัน Script**
   - คลิก `Run` → เลือก `updateLeaderboardSheet`
   - อนุญาต permissions เมื่อถูกถาม

6. **ตั้งค่า Auto-Update**
   - รัน function `createTrigger` เพื่อตั้งค่าให้อัปเดตอัตโนมัติทุกชั่วโมง
   - หรือใช้เมนู `Invite Tracker` → `Setup Auto-Update`

## วิธีที่ 2: ใช้ IMPORTDATA (สำหรับ CSV)

ถ้า API server รองรับ CSV format:

```excel
=IMPORTDATA("http://localhost:3001/api/sheets/1441409446126424100?format=csv")
```

**หมายเหตุ:** Google Sheets ไม่สามารถเรียก `localhost` ได้ ต้องใช้ public URL

## วิธีที่ 3: ใช้ IMPORTJSON (Custom Function)

1. **ติดตั้ง IMPORTJSON Library**
   - ใน Apps Script: `Resources` → `Libraries`
   - เพิ่ม Library ID: `1v_l4xN3ICa0lAW315NQEzAHPSoNiFdWHs87lqW33d1vx8W_MO56i8icd`

2. **ใช้ใน Sheet:**
```excel
=IMPORTJSON("http://your-api-url/api/leaderboard?guildId=1441409446126424100&limit=10", "/data", "noHeaders")
```

## วิธีที่ 4: ใช้ Google Sheets API จาก Server

ถ้าต้องการให้ API server เขียนข้อมูลไปยัง Google Sheet โดยตรง:

1. **สร้าง Service Account**
   - ไปที่ [Google Cloud Console](https://console.cloud.google.com)
   - สร้าง Service Account
   - Download JSON key

2. **Share Sheet กับ Service Account**
   - เปิด Sheet → Share
   - เพิ่ม email ของ Service Account (xxx@xxx.iam.gserviceaccount.com)
   - ให้ permission "Editor"

3. **ติดตั้ง Google Sheets API Library**
```bash
npm install googleapis
```

4. **เพิ่ม Code ใน API Server:**
```typescript
import { google } from 'googleapis';

async function updateGoogleSheet(guildId: string) {
  const auth = new google.auth.GoogleAuth({
    keyFile: 'path/to/service-account-key.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = 'YOUR_SHEET_ID';

  // Fetch leaderboard data
  const leaderboard = await getLeaderboard(guildId);

  // Update sheet
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'Sheet1!A1',
    valueInputOption: 'RAW',
    requestBody: {
      values: [
        ['Rank', 'User ID', 'Invited Members'],
        ...leaderboard.map((item, index) => [
          index + 1,
          item.inviterId,
          item.invitedMembers,
        ]),
      ],
    },
  });
}
```

## ตัวอย่าง Sheet Layout

| Rank | User ID | Invited Members | Last Updated |
|------|---------|-----------------|--------------|
| 1 | 123456789012345678 | 2 | 2026-02-18 21:00:00 |
| 2 | 987654321098765432 | 1 | 2026-02-18 21:00:00 |

## Troubleshooting

### API ไม่สามารถเข้าถึงได้จาก Google Sheets

**ปัญหา:** Google Sheets ไม่สามารถเรียก `localhost` ได้

**วิธีแก้:**
1. ใช้ public URL (ถ้า API อยู่บน VPS)
2. ใช้ ngrok เพื่อ expose local API:
   ```bash
   ngrok http 3001
   ```
3. ใช้ Google Apps Script แทน (วิธีที่ 1)

### Permission Denied

**ปัญหา:** Script ไม่มี permission

**วิธีแก้:**
- รัน function `updateLeaderboardSheet` อีกครั้ง
- อนุญาต permissions เมื่อถูกถาม

### Data ไม่ Update

**ปัญหา:** Trigger ไม่ทำงาน

**วิธีแก้:**
- ตรวจสอบ Triggers: `Edit` → `Current project's triggers`
- ลบและสร้าง trigger ใหม่

## Tips

1. **Auto-Format:** ใช้ conditional formatting เพื่อ highlight top 3
2. **Charts:** สร้าง chart จากข้อมูล leaderboard
3. **Notifications:** เพิ่ม email notification เมื่อมีคนใหม่ join
4. **Backup:** Export sheet เป็น CSV เป็นระยะ
