// auditTrailroutes.js
// Handles audit log creation and retrieval for JuanLMS. Only admin/director can view logs.
// Uses MongoDB for storage and includes pagination and authentication middleware.

import express from 'express';
import { Router } from 'express';
import database from '../connect.cjs';
import { ObjectId } from 'mongodb';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { AUDIT_ACTIONS } from '../middleware/auditLogger.js';

const router = Router();

// --- Debug middleware for audit routes ---
// Logs every request to audit routes for debugging purposes
router.use((req, res, next) => {
  console.log(`[Audit] ${req.method} ${req.path}`);
  console.log('[Audit] Headers:', req.headers);
  next();
});

// --- GET /audit-logs - Get all audit logs (admin/director only, paginated) ---
router.get('/audit-logs', authenticateToken, async (req, res) => {
  try {
    // Check authentication and role
    // Only admin and director can access audit logs for security reasons
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    if (!req.user.role) {
      return res.status(403).json({ message: 'User role not found' });
    }
    if (req.user.role !== 'admin' && req.user.role !== 'director') {
      return res.status(403).json({ message: 'Access denied. Admin/Director only.' });
    }

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Filter parameters
    const action = req.query.action;
    const role = req.query.role;

    let db;
    try {
      db = database.getDb();
    } catch (dbError) {
      await database.connectToServer();
      db = database.getDb();
    }

    // Build filter object
    const filter = {};
    if (action && action !== 'all') {
      filter.action = action;
    }
    if (role && role !== 'all') {
      // Add role-based filtering logic here
      // This assumes the user's role is stored in the audit log
      filter['userRole'] = role;
    }

    // Get total count for pagination
    const totalCount = await db.collection('AuditLogs').countDocuments(filter);
    
    // Fetch paginated logs, most recent first
    const logs = await db.collection('AuditLogs')
      .find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Each audit log structure: userId, userName, action, details, ipAddress, timestamp
    // Return logs and pagination info
    return res.json({
      logs,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalLogs: totalCount,
        logsPerPage: limit
      }
    });
  } catch (error) {
    console.error('[Audit] Error in /audit-logs:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch audit logs',
      error: error.message 
    });
  }
});

// --- GET /audit-test - Test route to verify the router is working ---
router.get('/audit-test', (req, res) => {
  res.json({ message: 'Audit trail routes are working' });
});

// --- POST /audit-log - Create audit log (internal use only) ---
router.post('/audit-log', authenticateToken, async (req, res) => {
  try {
    const { action, details, userRole } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    if (!action || !details) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        required: ['action', 'details']
      });
    }

    let db;
    try {
      db = database.getDb();
    } catch (dbError) {
      await database.connectToServer();
      db = database.getDb();
    }

    // Ensure the AuditLogs collection exists
    const collections = await db.listCollections().toArray();
    const collectionExists = collections.some(col => col.name === 'AuditLogs');
    if (!collectionExists) {
      await db.createCollection('AuditLogs');
    }

    // Audit log structure with role
    const newLog = {
      userId: new ObjectId(req.user._id),
      userName: `${req.user.firstname} ${req.user.lastname}`,
      userRole: userRole || req.user.role, // Store the role that performed the action
      action,
      details,
      ipAddress,
      timestamp: new Date()
    };

    const result = await db.collection('AuditLogs').insertOne(newLog);
    return res.status(201).json({ ...newLog, _id: result.insertedId });
  } catch (error) {
    console.error('[Audit] Error in /audit-log:', error);
    return res.status(500).json({ 
      message: 'Server error',
      error: error.message
    });
  }
});

export default router; 