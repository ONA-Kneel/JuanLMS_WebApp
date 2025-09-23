// auditTrailroutes.js
// Handles audit log creation and retrieval for JuanLMS. Only admin/principal can view logs.
// Uses MongoDB for storage and includes pagination and authentication middleware.

import express from 'express';
import { Router } from 'express';
import database from '../connect.cjs';
import { ObjectId } from 'mongodb';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { AUDIT_ACTIONS } from '../middleware/auditLogger.js';
import exceljs from 'exceljs';
import PDFDocument from 'pdfkit';

const router = Router();

// --- Debug middleware for audit routes ---
// Logs every request to audit routes for debugging purposes
router.use((req, res, next) => {
  console.log(`[Audit] ${req.method} ${req.path}`);
  console.log('[Audit] Headers:', req.headers);
  next();
});

// --- GET /audit-logs - Get all audit logs (admin/principal only, paginated) ---
router.get('/audit-logs', authenticateToken, async (req, res) => {
  try {
    // Check authentication and role
    // Only admin, principal, and VPE can access audit logs for security reasons
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    if (!req.user.role) {
      return res.status(403).json({ message: 'User role not found' });
    }
    if (req.user.role !== 'admin' && req.user.role !== 'principal' && req.user.role !== 'vice president of education') {
      return res.status(403).json({ message: 'Access denied. Admin/Principal/VPE only.' });
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
    
    // For principals and VPE, only show student and faculty login/logout logs
    if (req.user.role === 'principal' || req.user.role === 'vice president of education') {
      filter['userRole'] = { $in: ['student', 'students', 'faculty'] };
      filter['action'] = { $in: ['Login', 'Logout'] };
    }
    
    if (action && action !== 'all') {
      filter.action = action;
    }
    if (role && role !== 'all') {
      // Handle role filtering with case variations
      if (role === 'student') {
        // For student role, match both 'student' and 'students'
        filter['userRole'] = { $in: ['student', 'students'] };
      } else {
        filter['userRole'] = role;
      }
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

    // Resolve user display name safely
    const resolvedName = (() => {
      if (req.user?.firstname || req.user?.lastname) {
        return `${req.user.firstname || ''} ${req.user.lastname || ''}`.trim();
      }
      if (req.user?.name) return req.user.name;
      return 'Unknown';
    })();

    console.log('[Audit] /audit-log resolved user:', { id: req.user?._id, name: resolvedName, role: req.user?.role });

    // Audit log structure with role
    const newLog = {
      userId: new ObjectId(req.user._id),
      userName: resolvedName,
      userRole: userRole || req.user.role,
      action,
      details,
      ipAddress,
      timestamp: new Date()
    };

    // Deduplicate: if a matching log exists in the last 10s, return it instead of inserting
    const tenSecondsAgo = new Date(Date.now() - 10 * 1000);
    const existing = await db.collection('AuditLogs').findOne({
      userId: newLog.userId,
      action: newLog.action,
      details: newLog.details,
      timestamp: { $gte: tenSecondsAgo }
    });
    if (existing) {
      console.log('[Audit] Duplicate audit avoided (recent match found). Returning existing.');
      return res.status(200).json(existing);
    }

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

// --- GET /audit-logs/last-logins - Get latest login for every user (admin/principal/VPE only) ---
router.get('/audit-logs/last-logins', authenticateToken, async (req, res) => {
  try {
    // Only admin, principal, and VPE can access
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    if (!req.user.role) {
      return res.status(403).json({ message: 'User role not found' });
    }
    if (req.user.role !== 'admin' && req.user.role !== 'principal' && req.user.role !== 'vice president of education') {
      return res.status(403).json({ message: 'Access denied. Admin/Principal/VPE only.' });
    }

    let db;
    try {
      db = database.getDb();
    } catch (dbError) {
      await database.connectToServer();
      db = database.getDb();
    }

    // Build filter for principals and VPE (only show student and faculty login logs)
    let matchFilter = { action: 'Login' };
    if (req.user.role === 'principal' || req.user.role === 'vice president of education') {
      matchFilter['userRole'] = { $in: ['student', 'students', 'faculty'] };
    }

    // Aggregate latest login per user
    const lastLogins = await db.collection('AuditLogs').aggregate([
      { $match: matchFilter },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: "$userId",
          userName: { $first: "$userName" },
          userRole: { $first: "$userRole" },
          lastLogin: { $first: "$timestamp" }
        }
      },
      { $sort: { lastLogin: -1 } }
    ]).toArray();

    return res.json({ lastLogins });
  } catch (error) {
    console.error('[Audit] Error in /audit-logs/last-logins:', error);
    return res.status(500).json({
      message: 'Failed to fetch last logins',
      error: error.message
    });
  }
});

// --- GET /audit-logs/faculty-last-logins - Get latest login for faculty only (admin/principal/VPE only) ---
router.get('/audit-logs/faculty-last-logins', authenticateToken, async (req, res) => {
  try {
    // Only admin, principal, and VPE can access
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    if (!req.user.role) {
      return res.status(403).json({ message: 'User role not found' });
    }
    if (req.user.role !== 'admin' && req.user.role !== 'principal' && req.user.role !== 'vice president of education') {
      return res.status(403).json({ message: 'Access denied. Admin/Principal/VPE only.' });
    }

    let db;
    try {
      db = database.getDb();
    } catch (error) {
      console.error('[Audit] Database connection error:', error);
      return res.status(500).json({ message: 'Database connection failed' });
    }

    // Match filter for faculty only
    const matchFilter = {
      action: 'Login',
      userRole: { $in: ['faculty', 'Faculty'] }
    };

    // Aggregate latest login per faculty user
    const facultyLogins = await db.collection('AuditLogs').aggregate([
      { $match: matchFilter },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: "$userId",
          userName: { $first: "$userName" },
          userRole: { $first: "$userRole" },
          lastLogin: { $first: "$timestamp" }
        }
      },
      { $sort: { lastLogin: -1 } }
    ]).toArray();

    return res.json({ facultyLogins });
  } catch (error) {
    console.error('[Audit] Error in /audit-logs/faculty-last-logins:', error);
    return res.status(500).json({
      message: 'Failed to fetch faculty last logins',
      error: error.message
    });
  }
});

// --- GET /audit-logs/export - Export audit logs to Excel (admin/principal/VPE) ---
router.get('/audit-logs/export', authenticateToken, async (req, res) => {
  try {
    // Check authentication and role
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    if (!req.user.role) {
      return res.status(403).json({ message: 'User role not found' });
    }
    if (req.user.role !== 'admin' && req.user.role !== 'principal' && req.user.role !== 'vice president of education') {
      return res.status(403).json({ message: 'Access denied. Admin/Principal/VPE only.' });
    }

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
    
    // For principals and VPE, only show student and faculty login/logout logs
    if (req.user.role === 'principal' || req.user.role === 'vice president of education') {
      filter['userRole'] = { $in: ['student', 'students', 'faculty'] };
      filter['action'] = { $in: ['Login', 'Logout'] };
    }
    
    if (action && action !== 'all') {
      filter.action = action;
    }
    if (role && role !== 'all') {
      // Handle role filtering with case variations
      if (role === 'student') {
        // For student role, match both 'student' and 'students'
        filter['userRole'] = { $in: ['student', 'students'] };
      } else {
        filter['userRole'] = role;
      }
    }

    // Fetch all logs matching the filter, most recent first
    const logs = await db.collection('AuditLogs')
      .find(filter)
      .sort({ timestamp: -1 })
      .toArray();

    // Debug: Log the first few logs to see their structure
    console.log('First 3 logs structure:', logs.slice(0, 3).map(log => ({
      _id: log._id,
      timestamp: log.timestamp,
      userName: log.userName,
      userRole: log.userRole,
      action: log.action,
      details: log.details,
      ipAddress: log.ipAddress,
      allFields: Object.keys(log)
    })));

    // Create workbook and worksheet
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Audit Logs');

    // Header rows with San Juan de Dios template (matching ClassContent.jsx format exactly)
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-CA');
    const timeStr = now.toLocaleTimeString();
    
    // Logo and header section (matching ClassContent.jsx structure)
    worksheet.addRow([
      'SAN JUAN DE DIOS EDUCATIONAL FOUNDATION, INC.',
      '', '', '', '', ''
    ]);
    worksheet.addRow([
      '2772-2774 Roxas Boulevard, Pasay City 1300 Philippines',
      '', '', '', '', ''
    ]);
    worksheet.addRow([
      'PAASCU Accredited - COLLEGE',
      '', '', '', '', ''
    ]);
    worksheet.addRow([]); // Empty row
    
    // Report title section (matching ClassContent.jsx format)
    worksheet.addRow([
      'AUDIT TRAIL REPORT',
      '', '', '', '', ''
    ]);
    worksheet.addRow([
      `Date: ${new Date().toLocaleDateString()}`,
      '', '', '', '', ''
    ]);
    worksheet.addRow([]); // Empty row
    
    // Summary information
    worksheet.addRow([
      `Total Logs: ${logs.length}`,
      `Filters: Action=${action || 'All'}, Role=${role || 'All'}`,
      '', '', '', ''
    ]);
    worksheet.addRow([]); // Empty row for spacing

    // Column headers
    worksheet.addRow([
      'Timestamp', 'User Name', 'User Role', 'Action', 'Details', 'IP Address'
    ]);

    // Data rows
    logs.forEach((log) => {
      worksheet.addRow([
        new Date(log.timestamp).toLocaleString('en-US'),
        log.userName || 'Unknown',
        log.userRole || 'Unknown',
        log.action || 'Unknown',
        log.details || 'No details',
        log.ipAddress || 'Unknown'
      ]);
    });

    // Style header rows
    worksheet.getRow(1).font = { bold: true, size: 16 }; // Institution name
    worksheet.getRow(2).font = { bold: true, size: 14 }; // Address
    worksheet.getRow(3).font = { bold: true, size: 12 }; // Accreditation
    worksheet.getRow(5).font = { bold: true, size: 14 }; // Report title
    worksheet.getRow(6).font = { bold: true, size: 12 }; // Generated date
    worksheet.getRow(8).font = { bold: true, size: 12 }; // Summary info
    worksheet.getRow(10).font = { bold: true, size: 12 }; // Column headers
    
    // Style column headers
    worksheet.getRow(10).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF00418B' }
    };
    worksheet.getRow(10).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Add footer information (matching ClassContent.jsx format)
    worksheet.addRow([]); // Empty row
    worksheet.addRow([
      'Hospital Tel. Nos: 831-9731/36;831-5641/49 www.sanjuandedios.org College Tel.Nos.: 551-2756; 551-2763 www.sjdefi.edu.ph',
      '', '', '', '', ''
    ]);
    worksheet.addRow([
      `Report generated by JuanLMS System - ${dateStr} ${timeStr}`,
      '', '', '', '', ''
    ]);

    // Set column widths
    worksheet.columns.forEach((col, index) => {
      if (index === 0) col.width = 20; // Timestamp
      else if (index === 1) col.width = 25; // User Name
      else if (index === 2) col.width = 15; // User Role
      else if (index === 3) col.width = 20; // Action
      else if (index === 4) col.width = 40; // Details
      else if (index === 5) col.width = 15; // IP Address
    });

    // Center align headers
    worksheet.getRow(5).alignment = { horizontal: 'center' };

    // Set response headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="audit_logs_${dateStr}_${timeStr.replace(/:/g, '-')}.xlsx"`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('[Audit] Error in /audit-logs/export:', error);
    return res.status(500).json({
      message: 'Failed to export audit logs',
      error: error.message
    });
  }
});

// --- GET /audit-logs/export-pdf - Export audit logs to PDF (ADMIN ONLY) ---
router.get('/audit-logs/export-pdf', authenticateToken, async (req, res) => {
  try {
    // Check authentication and role - ONLY ADMIN can export to PDF
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    if (!req.user.role) {
      return res.status(403).json({ message: 'User role not found' });
    }
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

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
      // Handle role filtering with case variations
      if (role === 'student') {
        // For student role, match both 'student' and 'students'
        filter['userRole'] = { $in: ['student', 'students'] };
      } else {
        filter['userRole'] = role;
      }
    }

    // Fetch all logs matching the filter, most recent first
    const logs = await db.collection('AuditLogs')
      .find(filter)
      .sort({ timestamp: -1 })
      .toArray();

    // Return audit logs data for frontend HTML generation
    res.json({
      logs: logs,
      totalLogs: logs.length,
      filters: {
        action: action || 'All',
        role: role || 'All'
      },
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Audit] Error in /audit-logs/export-pdf:', error);
    return res.status(500).json({
      message: 'Failed to export audit logs to PDF',
      error: error.message
    });
  }
});

export default router; 