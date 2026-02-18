/**
 * Google Apps Script for Invite Tracker Leaderboard
 * 
 * Instructions:
 * 1. Open Google Sheets
 * 2. Go to Extensions → Apps Script
 * 3. Paste this code
 * 4. Update API_URL and GUILD_ID
 * 5. Run updateAllSheets() function
 */

// ========== CONFIGURATION ==========
const API_URL = 'http://143.14.200.26:3001'; // Change to your API URL (use public URL, not localhost)
const GUILD_ID = '1098556040439660616'; // Your Discord Guild ID
const DISCORD_BOT_TOKEN = ''; // Optional: Discord Bot Token for fetching usernames (leave empty if not available)

// ========== FUNCTIONS ==========

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
    Logger.log('Error fetching leaderboard: ' + error.toString());
    return [];
  }
}

/**
 * Fetch user statistics
 */
function fetchUserStats(userId) {
  try {
    const url = `${API_URL}/api/stats/${userId}?guildId=${GUILD_ID}`;
    
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
      return null;
    }
  } catch (error) {
    Logger.log('Error fetching user stats: ' + error.toString());
    return null;
  }
}

/**
 * Fetch join records for a specific inviter
 */
function fetchJoinRecords(inviterId) {
  try {
    const url = `${API_URL}/api/joins/${inviterId}?guildId=${GUILD_ID}`;
    
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
    Logger.log('Error fetching join records: ' + error.toString());
    return [];
  }
}

/**
 * Get username from Discord API (optional, requires bot token)
 */
function getDiscordUsername(userId) {
  if (!DISCORD_BOT_TOKEN || DISCORD_BOT_TOKEN === '') {
    return userId; // Return user ID if no token
  }
  
  try {
    const url = `https://discord.com/api/v10/users/${userId}`;
    const response = UrlFetchApp.fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    
    const data = JSON.parse(response.getContentText());
    return data.username || userId;
  } catch (error) {
    Logger.log('Error fetching username: ' + error.toString());
    return userId;
  }
}

/**
 * Get or create a sheet by name
 */
function getOrCreateSheet(spreadsheet, sheetName) {
  let sheet = spreadsheet.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }
  
  return sheet;
}

/**
 * Sanitize sheet name (Google Sheets has restrictions)
 */
function sanitizeSheetName(name) {
  // Google Sheets sheet names cannot exceed 100 characters
  // Cannot contain: / \ ? * [ ]
  let sanitized = name.replace(/[\/\\?*\[\]]/g, '_');
  
  if (sanitized.length > 100) {
    sanitized = sanitized.substring(0, 100);
  }
  
  return sanitized || 'Sheet';
}

/**
 * Update summary sheet (first sheet) with leaderboard data
 */
function updateSummarySheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  
  // Get or create summary sheet (use first sheet or create "Summary")
  let summarySheet = spreadsheet.getSheetByName('Summary');
  if (!summarySheet) {
    // Try to use first sheet
    summarySheet = spreadsheet.getSheets()[0];
    if (!summarySheet) {
      summarySheet = spreadsheet.insertSheet('Summary');
    } else {
      // Rename first sheet to Summary
      summarySheet.setName('Summary');
    }
  }
  
  // Clear existing data
  summarySheet.clear();
  
  // Set headers with Name column
  const headers = [['Rank', 'Name', 'User ID', 'Invited Members', 'Total Invites', 'Active Invites', 'Last Updated']];
  summarySheet.getRange(1, 1, 1, 7).setValues(headers);
  summarySheet.getRange(1, 1, 1, 7).setFontWeight('bold');
  
  // Fetch data
  const leaderboard = fetchInviteLeaderboard();
  
  if (leaderboard.length === 0) {
    summarySheet.getRange(2, 1).setValue('No data available');
    return;
  }
  
  // Prepare data rows
  const rows = [];
  for (let i = 0; i < leaderboard.length; i++) {
    const item = leaderboard[i];
    const stats = fetchUserStats(item.inviterId);
    const username = getDiscordUsername(item.inviterId);
    
    rows.push([
      i + 1,                                    // Rank
      username,                                 // Name
      item.inviterId,                          // User ID
      item.invitedMembers || item.totalJoins,  // Invited Members
      stats ? stats.totalInvites : '-',        // Total Invites
      stats ? stats.activeInvites : '-',       // Active Invites
      new Date(),                              // Last Updated
    ]);
    
    // Small delay to avoid rate limiting
    if (i > 0 && i % 10 === 0) {
      Utilities.sleep(1000);
    }
  }
  
  // Write data
  if (rows.length > 0) {
    summarySheet.getRange(2, 1, rows.length, 7).setValues(rows);
    
    // Format date column
    const dateRange = summarySheet.getRange(2, 7, rows.length, 1);
    dateRange.setNumberFormat('yyyy-mm-dd hh:mm:ss');
    
    // Format number columns
    summarySheet.getRange(2, 4, rows.length, 1).setNumberFormat('0'); // Invited Members
    summarySheet.getRange(2, 5, rows.length, 1).setNumberFormat('0'); // Total Invites
    summarySheet.getRange(2, 6, rows.length, 1).setNumberFormat('0'); // Active Invites
    
    // Auto-resize columns
    summarySheet.autoResizeColumns(1, 7);
    
    // Add conditional formatting for top 3
    const top3Range = summarySheet.getRange(2, 1, Math.min(3, rows.length), 7);
    top3Range.setBackground('#fff4cc'); // Light yellow
  }
  
  Logger.log(`Updated summary sheet with ${rows.length} rows`);
  return leaderboard;
}

/**
 * Update individual user sheet with join details
 */
function updateUserSheet(spreadsheet, inviterId, username) {
  const sheetName = sanitizeSheetName(username || inviterId);
  const sheet = getOrCreateSheet(spreadsheet, sheetName);
  
  // Clear existing data
  sheet.clear();
  
  // Set headers
  const headers = [['User ID', 'Invite Code', 'Joined At']];
  sheet.getRange(1, 1, 1, 3).setValues(headers);
  sheet.getRange(1, 1, 1, 3).setFontWeight('bold');
  
  // Fetch join records
  const joinRecords = fetchJoinRecords(inviterId);
  
  if (joinRecords.length === 0) {
    sheet.getRange(2, 1).setValue('No join records available');
    return;
  }
  
  // Prepare data rows
  const rows = [];
  for (let i = 0; i < joinRecords.length; i++) {
    const record = joinRecords[i];
    const joinDate = new Date(record.joinedAt);
    
    rows.push([
      record.userId,        // User ID
      record.inviteCode,  // Invite Code
      joinDate,           // Joined At
    ]);
  }
  
  // Write data
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 3).setValues(rows);
    
    // Format date column
    const dateRange = sheet.getRange(2, 3, rows.length, 1);
    dateRange.setNumberFormat('yyyy-mm-dd hh:mm:ss');
    
    // Auto-resize columns
    sheet.autoResizeColumns(1, 3);
  }
  
  Logger.log(`Updated sheet "${sheetName}" with ${rows.length} join records`);
}

/**
 * Update all sheets (summary + individual user sheets)
 */
function updateAllSheets() {
  Logger.log('Starting update all sheets...');
  
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  
  // Update summary sheet first
  const leaderboard = updateSummarySheet();
  
  if (!leaderboard || leaderboard.length === 0) {
    Logger.log('No leaderboard data, skipping user sheets');
    return;
  }
  
  // Update individual user sheets
  for (let i = 0; i < leaderboard.length; i++) {
    const item = leaderboard[i];
    const username = getDiscordUsername(item.inviterId);
    
    updateUserSheet(spreadsheet, item.inviterId, username);
    
    // Delay to avoid rate limiting
    Utilities.sleep(500);
  }
  
  Logger.log('All sheets updated successfully!');
}

/**
 * Set up time-driven trigger (runs every hour)
 */
function createTrigger() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'updateAllSheets') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new trigger (runs every hour)
  ScriptApp.newTrigger('updateAllSheets')
    .timeBased()
    .everyHours(1)
    .create();
  
  Logger.log('Trigger created: Updates every hour');
}

/**
 * Create trigger that runs every 5 minutes
 */
function createTrigger5Minutes() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'updateAllSheets') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new trigger (runs every 5 minutes)
  ScriptApp.newTrigger('updateAllSheets')
    .timeBased()
    .everyMinutes(5)
    .create();
  
  Logger.log('Trigger created: Updates every 5 minutes');
}

/**
 * Manual update function (can be called from menu)
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📊 Invite Tracker')
    .addItem('🔄 Update All Sheets', 'updateAllSheets')
    .addItem('📊 Update Summary Only', 'updateSummarySheet')
    .addSeparator()
    .addItem('⏰ Setup Auto-Update (Every Hour)', 'createTrigger')
    .addItem('⏰ Setup Auto-Update (Every 5 Min)', 'createTrigger5Minutes')
    .addToUi();
}

/**
 * Test function to check API connection
 */
function testConnection() {
  try {
    const url = `${API_URL}/api/health`;
    const response = UrlFetchApp.fetch(url);
    const data = JSON.parse(response.getContentText());
    
    Logger.log('API Connection Test:');
    Logger.log('Status: ' + data.status);
    Logger.log('Database: ' + data.database);
    
    return data;
  } catch (error) {
    Logger.log('Connection failed: ' + error.toString());
    return null;
  }
}
