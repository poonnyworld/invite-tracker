import { Router, Request, Response } from 'express';
import { JoinRecord } from '../models/JoinRecord';
import { Invite } from '../models/Invite';
import mongoose from 'mongoose';
import { MONGODB_CONNECTED } from '../utils/connectDB';

const router = Router();

// Middleware for API key authentication
const authenticateApiKey = (req: Request, res: Response, next: Function) => {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  const expectedKey = process.env.API_SECRET_KEY;

  if (!expectedKey) {
    return res.status(500).json({
      success: false,
      error: 'API key not configured on server',
    });
  }

  if (!apiKey || apiKey !== expectedKey) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid API key',
    });
  }

  next();
};

// POST /api/joins - Record a join
router.post('/joins', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    if (mongoose.connection.readyState !== MONGODB_CONNECTED) {
      return res.status(503).json({
        success: false,
        error: 'Database not connected',
      });
    }

    const { userId, inviterId, inviteCode, guildId, joinedAt } = req.body;

    if (!userId || !inviterId || !inviteCode || !guildId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, inviterId, inviteCode, guildId',
      });
    }

    const joinRecord = await JoinRecord.create({
      userId,
      inviterId,
      inviteCode,
      guildId,
      joinedAt: joinedAt ? new Date(joinedAt) : new Date(),
    });

    res.json({
      success: true,
      data: joinRecord,
    });
  } catch (error) {
    console.error('[API] Error recording join:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to record join',
    });
  }
});

// GET /api/stats/:userId - Get user statistics
router.get('/stats/:userId', async (req: Request, res: Response) => {
  try {
    if (mongoose.connection.readyState !== MONGODB_CONNECTED) {
      return res.status(503).json({
        success: false,
        error: 'Database not connected',
      });
    }

    const { userId } = req.params;
    const { guildId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required',
      });
    }

    const matchQuery: any = { inviterId: userId };
    if (guildId) {
      matchQuery.guildId = guildId;
    }

    const [totalInvites, totalJoins, activeInvites] = await Promise.all([
      Invite.countDocuments(matchQuery),
      JoinRecord.countDocuments(matchQuery),
      Invite.countDocuments({
        ...matchQuery,
        $and: [
          {
            $or: [
              { maxUses: null },
              { $expr: { $lt: ['$uses', '$maxUses'] } },
            ],
          },
          {
            $or: [
              { expiresAt: null },
              { expiresAt: { $gt: new Date() } },
            ],
          },
        ],
      }),
    ]);

    res.json({
      success: true,
      data: {
        userId,
        totalInvites, // จำนวน Invite Links ที่สร้าง
        invitedMembers: totalJoins, // จำนวนผู้ใช้ที่เชิญได้ (จำนวนคนที่ join จาก invites ของคนนี้)
        totalJoins, // Alias สำหรับ backward compatibility
        activeInvites, // จำนวน Invite Links ที่ยังใช้งานได้
      },
    });
  } catch (error) {
    console.error('[API] Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get stats',
    });
  }
});

// GET /api/leaderboard - Get invite leaderboard
router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    if (mongoose.connection.readyState !== MONGODB_CONNECTED) {
      return res.status(503).json({
        success: false,
        error: 'Database not connected',
      });
    }

    const { guildId, limit = '10' } = req.query;
    const limitNum = parseInt(limit as string, 10);

    if (!guildId) {
      return res.status(400).json({
        success: false,
        error: 'guildId is required',
      });
    }

    const leaderboard = await JoinRecord.aggregate([
      { $match: { guildId } },
      {
        $group: {
          _id: '$inviterId',
          totalJoins: { $sum: 1 },
        },
      },
      { $sort: { totalJoins: -1 } },
      { $limit: limitNum },
    ]);

    res.json({
      success: true,
      data: leaderboard.map((item) => ({
        inviterId: item._id,
        invitedMembers: item.totalJoins, // จำนวนผู้ใช้ที่เชิญได้
        totalJoins: item.totalJoins, // Alias สำหรับ backward compatibility
      })),
    });
  } catch (error) {
    console.error('[API] Error getting leaderboard:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get leaderboard',
    });
  }
});

// GET /api/invites/:userId - Get invites for a user
router.get('/invites/:userId', async (req: Request, res: Response) => {
  try {
    if (mongoose.connection.readyState !== MONGODB_CONNECTED) {
      return res.status(503).json({
        success: false,
        error: 'Database not connected',
      });
    }

    const { userId } = req.params;
    const { guildId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required',
      });
    }

    const query: any = { inviterId: userId };
    if (guildId) {
      query.guildId = guildId;
    }

    const invites = await Invite.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: invites,
    });
  } catch (error) {
    console.error('[API] Error getting invites:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get invites',
    });
  }
});

// GET /api/health - Health check
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === MONGODB_CONNECTED ? 'connected' : 'disconnected',
  });
});

// GET /api/debug/:guildId - Debug endpoint to check data
router.get('/debug/:guildId', async (req: Request, res: Response) => {
  try {
    if (mongoose.connection.readyState !== MONGODB_CONNECTED) {
      return res.status(503).json({
        success: false,
        error: 'Database not connected',
      });
    }

    const { guildId } = req.params;

    const [inviteCount, joinRecordCount, sampleInvites, sampleJoins] = await Promise.all([
      Invite.countDocuments({ guildId }),
      JoinRecord.countDocuments({ guildId }),
      Invite.find({ guildId }).limit(5).lean(),
      JoinRecord.find({ guildId }).limit(5).lean(),
    ]);

    res.json({
      success: true,
      data: {
        guildId,
        summary: {
          totalInvites: inviteCount,
          totalJoinRecords: joinRecordCount,
        },
        sampleInvites: sampleInvites.map((inv) => ({
          code: inv.code,
          inviterId: inv.inviterId,
          uses: inv.uses,
        })),
        sampleJoinRecords: sampleJoins.map((join) => ({
          userId: join.userId,
          inviterId: join.inviterId,
          inviteCode: join.inviteCode,
          joinedAt: join.joinedAt,
        })),
      },
    });
  } catch (error) {
    console.error('[API] Error in debug endpoint:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get debug info',
    });
  }
});

// GET /api/sheets/:guildId - Get data formatted for Google Sheets
router.get('/sheets/:guildId', async (req: Request, res: Response) => {
  try {
    if (mongoose.connection.readyState !== MONGODB_CONNECTED) {
      return res.status(503).json({
        success: false,
        error: 'Database not connected',
      });
    }

    const { guildId } = req.params;
    const { limit = '100' } = req.query;
    const limitNum = parseInt(limit as string, 10);

    // Get leaderboard
    const leaderboard = await JoinRecord.aggregate([
      { $match: { guildId } },
      {
        $group: {
          _id: '$inviterId',
          totalJoins: { $sum: 1 },
        },
      },
      { $sort: { totalJoins: -1 } },
      { $limit: limitNum },
    ]);

    // Format for Google Sheets (CSV-like format)
    const csvData = leaderboard.map((item, index) => ({
      rank: index + 1,
      inviterId: item._id,
      invitedMembers: item.totalJoins,
    }));

    // Return as CSV or JSON based on Accept header
    const acceptHeader = req.headers.accept || '';
    if (acceptHeader.includes('text/csv')) {
      // CSV format
      const csv = [
        'Rank,User ID,Invited Members',
        ...csvData.map((row) => `${row.rank},${row.inviterId},${row.invitedMembers}`),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="invite-leaderboard.csv"');
      res.send(csv);
    } else {
      // JSON format (default)
      res.json({
        success: true,
        data: csvData,
        headers: ['Rank', 'User ID', 'Invited Members'],
      });
    }
  } catch (error) {
    console.error('[API] Error getting sheets data:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get sheets data',
    });
  }
});

export default router;
