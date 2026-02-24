import { Router, Request, Response } from 'express';
import { JoinRecord } from '../models/JoinRecord';
import { Invite } from '../models/Invite';
import { PersonalInvite } from '../models/PersonalInvite';
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
    const joinMatchQuery = { ...matchQuery, isPersonalInvite: true };

    const [totalInvites, totalJoins, uniqueUsersResult, activeInvites] = await Promise.all([
      Invite.countDocuments(matchQuery),
      JoinRecord.countDocuments(joinMatchQuery),
      // Count unique users (personal invites only)
      JoinRecord.aggregate([
        { $match: joinMatchQuery },
        {
          $group: {
            _id: '$userId',
          },
        },
        { $count: 'uniqueUsers' },
      ]),
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

    const uniqueUsers = uniqueUsersResult[0]?.uniqueUsers || 0;

    res.json({
      success: true,
      data: {
        userId,
        totalInvites, // จำนวน Invite Links ที่สร้าง
        invitedMembers: uniqueUsers, // จำนวนผู้ใช้ที่เชิญได้ (unique users - แต่ละคนนับแค่ 1 ครั้ง)
        totalJoins, // จำนวนครั้งที่ join ทั้งหมด (รวมคนที่ join หลายครั้ง)
        uniqueUsers, // จำนวน unique users
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

// GET /api/leaderboard - Get invite leaderboard (optional query: year, month for monthly)
router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    if (mongoose.connection.readyState !== MONGODB_CONNECTED) {
      return res.status(503).json({
        success: false,
        error: 'Database not connected',
      });
    }

    const { guildId, limit = '10', year, month } = req.query;
    const limitNum = parseInt(limit as string, 10);
    const yearNum = year ? parseInt(year as string, 10) : null;
    const monthNum = month ? parseInt(month as string, 10) : null;

    if (!guildId) {
      return res.status(400).json({
        success: false,
        error: 'guildId is required',
      });
    }

    let dateRange: { start?: Date; end?: Date } = {};
    const matchStage: any = { guildId, isPersonalInvite: true };
    if (yearNum != null && monthNum != null && !isNaN(yearNum) && !isNaN(monthNum)) {
      dateRange.start = new Date(yearNum, monthNum - 1, 1);
      dateRange.end = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);
      matchStage.joinedAt = { $gte: dateRange.start, $lte: dateRange.end };
    }

    const lookupExprAnd: any[] = [
      { $eq: ['$inviterId', '$$inviterId'] },
      { $eq: ['$guildId', guildId] },
      { $eq: ['$isPersonalInvite', true] },
    ];
    if (dateRange.start && dateRange.end) {
      lookupExprAnd.push(
        { $gte: ['$joinedAt', dateRange.start] },
        { $lte: ['$joinedAt', dateRange.end] }
      );
    }
    const lookupMatch = { $expr: { $and: lookupExprAnd } };

    // Count unique users per inviter (not total joins)
    const leaderboard = await JoinRecord.aggregate([
      { $match: matchStage },
      // First group: Get unique inviter-user pairs
      {
        $group: {
          _id: {
            inviterId: '$inviterId',
            userId: '$userId',
          },
        },
      },
      // Second group: Count unique users per inviter
      {
        $group: {
          _id: '$_id.inviterId',
          uniqueUsers: { $sum: 1 }, // Count unique users
        },
      },
      // Get total joins count for each inviter
      {
        $lookup: {
          from: 'joinrecords',
          let: { inviterId: '$_id' },
          pipeline: [
            { $match: lookupMatch },
            { $count: 'total' },
          ],
          as: 'totalJoinsData',
        },
      },
      {
        $addFields: {
          totalJoins: {
            $ifNull: [{ $arrayElemAt: ['$totalJoinsData.total', 0] }, 0],
          },
        },
      },
      { $sort: { uniqueUsers: -1 } },
      { $limit: limitNum },
    ]);

    res.json({
      success: true,
      data: leaderboard.map((item) => ({
        inviterId: item._id,
        invitedMembers: item.uniqueUsers, // จำนวนผู้ใช้ที่เชิญได้ (unique users)
        totalJoins: item.totalJoins, // จำนวนครั้งที่ join ทั้งหมด
        uniqueUsers: item.uniqueUsers, // จำนวน unique users
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
    const guildIdStr = guildId as string | undefined;
    if (guildIdStr) {
      query.guildId = guildIdStr;
    }

    const [invites, personalInvite] = await Promise.all([
      Invite.find(query).sort({ createdAt: -1 }).lean(),
      guildIdStr
        ? PersonalInvite.findOne({ userId, guildId: guildIdStr }).lean()
        : Promise.resolve(null),
    ]);

    const payload: any = { success: true, data: invites };
    if (personalInvite) {
      payload.personalInvite = {
        inviteCode: personalInvite.inviteCode,
        url: `https://discord.gg/${personalInvite.inviteCode}`,
        createdAt: personalInvite.createdAt,
      };
    }

    res.json(payload);
  } catch (error) {
    console.error('[API] Error getting invites:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get invites',
    });
  }
});

// GET /api/joins/:inviterId - Get join records for a specific inviter
router.get('/joins/:inviterId', async (req: Request, res: Response) => {
  try {
    if (mongoose.connection.readyState !== MONGODB_CONNECTED) {
      return res.status(503).json({
        success: false,
        error: 'Database not connected',
      });
    }

    const { inviterId } = req.params;
    const { guildId } = req.query;

    if (!inviterId) {
      return res.status(400).json({
        success: false,
        error: 'inviterId is required',
      });
    }

    const query: any = { inviterId };
    if (guildId) {
      query.guildId = guildId;
    }

    const joinRecords = await JoinRecord.find(query)
      .sort({ joinedAt: -1 })
      .lean();

    res.json({
      success: true,
      data: joinRecords,
    });
  } catch (error) {
    console.error('[API] Error getting join records:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get join records',
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

    // Get leaderboard (count unique users)
    const leaderboard = await JoinRecord.aggregate([
      { $match: { guildId } },
      // First group: Get unique inviter-user pairs
      {
        $group: {
          _id: {
            inviterId: '$inviterId',
            userId: '$userId',
          },
        },
      },
      // Second group: Count unique users per inviter
      {
        $group: {
          _id: '$_id.inviterId',
          uniqueUsers: { $sum: 1 },
        },
      },
      // Get total joins count for each inviter
      {
        $lookup: {
          from: 'joinrecords',
          let: { inviterId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$inviterId', '$$inviterId'] },
                    { $eq: ['$guildId', guildId] },
                  ],
                },
              },
            },
            { $count: 'total' },
          ],
          as: 'totalJoinsData',
        },
      },
      {
        $addFields: {
          totalJoins: {
            $ifNull: [{ $arrayElemAt: ['$totalJoinsData.total', 0] }, 0],
          },
        },
      },
      { $sort: { uniqueUsers: -1 } },
      { $limit: limitNum },
    ]);

    // Format for Google Sheets (CSV-like format)
    const csvData = leaderboard.map((item, index) => ({
      rank: index + 1,
      inviterId: item._id,
      invitedMembers: item.uniqueUsers, // Use unique users count
      totalJoins: item.totalJoins, // Total joins count
    }));

    // Return as CSV or JSON based on Accept header
    const acceptHeader = req.headers.accept || '';
    if (acceptHeader.includes('text/csv')) {
      // CSV format
      const csv = [
        'Rank,User ID,Invited Members,Total Joins',
        ...csvData.map((row) => `${row.rank},${row.inviterId},${row.invitedMembers},${row.totalJoins}`),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="invite-leaderboard.csv"');
      res.send(csv);
    } else {
      // JSON format (default)
      res.json({
        success: true,
        data: csvData,
        headers: ['Rank', 'User ID', 'Invited Members', 'Total Joins'],
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
