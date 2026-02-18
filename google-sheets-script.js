/**
 * Google Apps Script for Invite Tracker Leaderboard
 * 
 * Instructions:
 * 1. Open Google Sheets
 * 2. Go to Extensions → Apps Script
 * 3. Paste this code
 * 4. Update API_URL and GUILD_ID
 * 5. Run updateLeaderboardSheet() function
 */

// ========== CONFIGURATION ==========
const API_URL = 'http://localhost:3001'; // Change to your API URL (use public URL, not localhost)
const GUILD_ID = '1441409446126424100'; // Your Discord Guild ID

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
    Logger.log('Error fetching data: ' + error.toString());
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
 * Update Google Sheet with leaderboard data
 */
function updateLeaderboardSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // Clear existing data
  sheet.clear();
  
  // Set headers
  const headers = [['Rank', 'User ID', 'Invited Members', 'Total Invites', 'Active Invites', 'Last Updated']];
  sheet.getRange(1, 1, 1, 6).setValues(headers);
  sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
  
  // Fetch data
  const leaderboard = fetchInviteLeaderboard();
  
  if (leaderboard.length === 0) {
    sheet.getRange(2, 1).setValue('No data available');
    return;
  }
  
  // Prepare data rows
  const rows = [];
  for (let i = 0; i < leaderboard.length; i++) {
    const item = leaderboard[i];
    const stats = fetchUserStats(item.inviterId);
    
    rows.push([
      i + 1,                                    // Rank
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
    sheet.getRange(2, 1, rows.length, 6).setValues(rows);
    
    // Format date column
    const dateRange = sheet.getRange(2, 6, rows.length, 1);
    dateRange.setNumberFormat('yyyy-mm-dd hh:mm:ss');
    
    // Format number columns
    sheet.getRange(2, 3, rows.length, 1).setNumberFormat('0'); // Invited Members
    sheet.getRange(2, 4, rows.length, 1).setNumberFormat('0'); // Total Invites
    sheet.getRange(2, 5, rows.length, 1).setNumberFormat('0'); // Active Invites
    
    // Auto-resize columns
    sheet.autoResizeColumns(1, 6);
    
    // Add conditional formatting for top 3
    const top3Range = sheet.getRange(2, 1, Math.min(3, rows.length), 6);
    top3Range.setBackground('#fff4cc'); // Light yellow
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
 * Create trigger that runs every 5 minutes
 */
function createTrigger5Minutes() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'updateLeaderboardSheet') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new trigger (runs every 5 minutes)
  ScriptApp.newTrigger('updateLeaderboardSheet')
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
    .addItem('🔄 Update Leaderboard', 'updateLeaderboardSheet')
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
