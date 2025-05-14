import express from 'express';
import { Router } from 'express';
import database from '../connect.cjs';
import { ObjectId } from 'mongodb';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

// Debug middleware for audit routes
router.use((req, res, next) => {
  console.log(`[Audit] ${req.method} ${req.path}`);
  console.log('[Audit] Headers:', req.headers);
  next();
});

// Get all audit logs (admin only)
router.get('/audit-logs', authenticateToken, async (req, res) => {
  try {
    console.log('[Audit] Processing audit logs request');
    console.log('[Audit] User:', req.user);

    // Check if user exists and has appropriate role
    if (!req.user) {
      console.log('[Audit] No user found in request');
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!req.user.role) {
      console.log('[Audit] No role found for user');
      return res.status(403).json({ message: 'User role not found' });
    }
    
    if (req.user.role !== 'admin' && req.user.role !== 'director') {
      console.log('[Audit] Access denied for role:', req.user.role);
      return res.status(403).json({ message: 'Access denied. Admin/Director only.' });
    }

    // Get pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    console.log('[Audit] Query params:', { page, limit, skip });

    let db;
    try {
      db = database.getDb();
    } catch (dbError) {
      console.log('[Audit] Initial DB connection failed, attempting reconnect');
      await database.connectToServer();
      db = database.getDb();
    }

    // Ensure the AuditLogs collection exists
    const collections = await db.listCollections().toArray();
    const collectionExists = collections.some(col => col.name === 'AuditLogs');
    
    if (!collectionExists) {
      console.log('[Audit] Creating AuditLogs collection');
      await db.createCollection('AuditLogs');
    }

    // Get total count for pagination
    const totalCount = await db.collection('AuditLogs').countDocuments();
    console.log('[Audit] Total documents:', totalCount);
    
    // Fetch paginated logs
    const logs = await db.collection('AuditLogs')
      .find({})
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    console.log('[Audit] Retrieved logs count:', logs.length);
    
    // If no logs exist yet, return an empty array with pagination
    if (logs.length === 0) {
      return res.json({
        logs: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalLogs: 0,
          logsPerPage: limit
        }
      });
    }
    
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

// Test route to verify the router is working
router.get('/audit-test', (req, res) => {
  res.json({ message: 'Audit trail routes are working' });
});

// Create audit log (internal use only)
router.post('/audit-log', authenticateToken, async (req, res) => {
  try {
    const { action, details } = req.body;
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

    const newLog = {
      userId: new ObjectId(req.user._id),
      userName: `${req.user.firstname} ${req.user.lastname}`,
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