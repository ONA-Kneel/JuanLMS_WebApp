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

    // Header rows
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-CA');
    const timeStr = now.toLocaleTimeString();
    
    worksheet.addRow([
      `Audit Logs Export`,
      `Generated on ${dateStr} at ${timeStr}`, '', '', '', ''
    ]);
    worksheet.addRow([
      `Total Logs: ${logs.length}`,
      `Filters: Action=${action || 'All'}, Role=${role || 'All'}`, '', '', '', ''
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
    worksheet.getRow(1).font = { bold: true, size: 14 };
    worksheet.getRow(2).font = { bold: true, size: 12 };
    worksheet.getRow(4).font = { bold: true, size: 12 };
    
    // Style column headers
    worksheet.getRow(4).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

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
    worksheet.getRow(4).alignment = { horizontal: 'center' };

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

    // Create PDF document with better margins
    const doc = new PDFDocument({ 
      margin: 40,
      size: 'A4'
    });

    // Set response headers for file download
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-CA');
    const timeStr = now.toLocaleTimeString();
    const filename = `audit_logs_${dateStr}_${timeStr.replace(/:/g, '-')}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Pipe PDF to response
    doc.pipe(res);

    // Add San Juan de Dios letterhead
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#333');
    doc.text('SAN JUAN DE DIOS EDUCATIONAL FOUNDATION, INC.', { align: 'center' });
    doc.moveDown(0.3);
    
    doc.fontSize(16).font('Helvetica').fillColor('#333');
    doc.text('2772-2774 Roxas Boulevard, Pasay City 1300 Philippines', { align: 'center' });
    doc.moveDown(0.2);
    
    doc.fontSize(13).font('Helvetica').fillColor('#333');
    doc.text('PAASCU Accredited - COLLEGE', { align: 'center' });
    doc.moveDown(1);
    
    // Add horizontal line
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(0.5);
    
    // Add report title
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#333').text('Audit Logs Export', { align: 'center' });
    doc.moveDown(0.3);
    
    // Add subtitle
    doc.fontSize(12).font('Helvetica').text(`Generated on ${dateStr} at ${timeStr}`, { align: 'center' });
    doc.moveDown(0.3);
    
    // Add summary
    doc.fontSize(10).font('Helvetica').text(`Total Logs: ${logs.length}`, { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(`Filters: Action=${action || 'All'}, Role=${role || 'All'}`, { align: 'center' });
    doc.moveDown(1);

    // Table configuration
    const tableTop = doc.y;
    const tableLeft = 40;
    const tableWidth = 520;
    const columnWidths = [90, 100, 70, 90, 170]; // Timestamp, User Name, Role, Action, Details (wider details column)
    const rowHeight = 30; // Increased row height to accommodate longer text
    const headerHeight = 30;

    // Function to draw table cell
    const drawCell = (text, x, y, width, height, isHeader = false) => {
      doc.save();

      // Header background fill first, then border
      if (isHeader) {
        doc.rect(x, y, width, height).fill('#f3f4f6');
        doc.rect(x, y, width, height).stroke();
      } else {
        // Border only for normal cells
        doc.rect(x, y, width, height).stroke();
      }
      
      // Add text
      const fontSize = isHeader ? 10 : 8;
      doc.fontSize(fontSize).font(isHeader ? 'Helvetica-Bold' : 'Helvetica');
      // Ensure text is visible
      doc.fillColor('black');
      
      // Handle text wrapping for long content - no truncation for details
      let displayText = text || '';
      
      // For details column, show complete text without truncation
      if (width === 170 && !isHeader) {
        // Details column - show full text, wrap if needed
        // No truncation, let the text wrap naturally
        // Use smaller font for details to fit more text
        doc.fontSize(7);
      } else {
        // Other columns - minimal truncation only if absolutely necessary
        if (displayText.length > 25) {
          displayText = displayText.substring(0, 22) + '...';
        }
      }
      
      doc.text(displayText, x + 5, y + (height - fontSize) / 2 - 1, {
        width: width - 10,
        align: 'left',
        lineGap: 1 // Add small line gap for better readability when text wraps
      });

      doc.restore();
    };

    // Draw table headers
    const headers = ['Timestamp', 'User Name', 'Role', 'Action', 'Details'];
    let currentX = tableLeft;
    
    headers.forEach((header, index) => {
      drawCell(header, currentX, tableTop, columnWidths[index], headerHeight, true);
      currentX += columnWidths[index];
    });

    // Draw data rows
    let currentY = tableTop + headerHeight;
    
    logs.forEach((log, index) => {
      // Check if we need a new page
      if (currentY > 700) {
        doc.addPage();
        currentY = 40; // Reset Y position for new page
        
        // Redraw headers on new page
        currentX = tableLeft;
        headers.forEach((header, idx) => {
          drawCell(header, currentX, currentY, columnWidths[idx], headerHeight, true);
          currentX += columnWidths[idx];
        });
        currentY += headerHeight;
      }

      // Prepare row data
      const rowData = [
        new Date(log.timestamp).toLocaleString('en-US'),
        log.userName || 'Unknown',
        log.userRole || 'Unknown',
        log.action || 'Unknown',
        log.details || 'No details'
      ];

      // Draw row cells
      currentX = tableLeft;
      rowData.forEach((cell, idx) => {
        drawCell(cell, currentX, currentY, columnWidths[idx], rowHeight);
        currentX += columnWidths[idx];
      });

      currentY += rowHeight;
    });

    // Add footer with San Juan de Dios information
    doc.moveDown(2);
    
    // Add horizontal line for footer
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(0.3);
    
    // Footer content
    doc.fontSize(8).font('Helvetica').fillColor('#333');
    doc.text('Hospital Tel. Nos: 831-9731/36;831-5641/49 www.sanjuandedios.org College Tel.Nos.: 551-2756; 551-2763 www.sjdefi.edu.ph', 40, doc.y);
    
    doc.moveDown(1);
    doc.fontSize(8).font('Helvetica').text(`Report generated by JuanLMS System - Page ${doc.bufferedPageRange().count}`, { align: 'center' });

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('[Audit] Error in /audit-logs/export-pdf:', error);
    return res.status(500).json({
      message: 'Failed to export audit logs to PDF',
      error: error.message
    });
  }
});

export default router; 