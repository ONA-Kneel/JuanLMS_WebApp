import express from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import database from "../connect.cjs";
import { ObjectId } from "mongodb";
import multer from "multer";
import path from "path";
import fs from "fs";
import emailService from "../services/emailService.js";
import cloudinary, { vpeReportsStorage } from "../config/cloudinary.js";

const router = express.Router();

// Debug endpoint to check VPE authentication
router.get("/debug-auth", authenticateToken, (req, res) => {
  console.log("Debug auth endpoint accessed by user:", {
    id: req.user._id,
    role: req.user.role,
    name: req.user.name,
    email: req.user.email
  });
  
  res.json({
    success: true,
    user: {
      id: req.user._id,
      role: req.user.role,
      name: req.user.name,
      email: req.user.email
    }
  });
});

// Configure multer for Cloudinary storage
const upload = multer({
  storage: vpeReportsStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// POST /api/vpe-reports/send - Send report to VPE (Principal only)
router.post("/send", authenticateToken, upload.single('reportFile'), async (req, res) => {
  try {
    console.log("📤 VPE Report Send Request:", {
      userId: req.user._id,
      userRole: req.user.role,
      timestamp: new Date().toISOString(),
      hasFile: !!req.file,
      fileName: req.file?.originalname
    });

    console.log("🔍 Cloudinary config check:", {
      hasCloudName: !!cloudinary.config().cloud_name,
      hasApiKey: !!cloudinary.config().api_key,
      hasApiSecret: !!cloudinary.config().api_secret
    });

    // Only principals can send reports to VPE
    if (req.user.role !== 'principal') {
      return res.status(403).json({ 
        error: "Access denied. Only principals can send reports to VPE." 
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: "PDF file is required" });
    }

    console.log("📤 File object from multer:", req.file);
    
    // Extract Cloudinary data from req.file
    // Match the lesson upload pattern: prefer secure_url, fallback to path
    const cloudinaryUrl = req.file.secure_url || req.file.path; // This is the Cloudinary URL
    const cloudinaryPublicId = req.file.public_id || req.file.filename; // This is the public_id
    
    console.log("📤 File uploaded to Cloudinary:", {
      originalname: req.file.originalname,
      public_id: cloudinaryPublicId,
      cloudinary_url: cloudinaryUrl
    });

    const { message, schoolYear, termName } = req.body;

    let db;
    try {
      db = database.getDb();
    } catch (dbError) {
      await database.connectToServer();
      db = database.getDb();
    }

    // Check for recent duplicate submissions (within last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentReport = await db.collection('VPEReports').findOne({
      sentBy: req.user._id,
      reportName: req.file.originalname,
      sentAt: { $gte: fiveMinutesAgo }
    });

    if (recentReport) {
      console.log("⚠️ Duplicate report submission detected within 5 minutes");
      return res.status(400).json({ 
        error: "A report with the same name was recently sent. Please wait a few minutes before sending another report." 
      });
    }

    // Get user details from database to ensure we have the correct name
    const userDetails = await db.collection('users').findOne({ _id: new ObjectId(req.user._id) });
    const principalName = userDetails ? 
      `${userDetails.firstname || userDetails.firstName || ''} ${userDetails.lastname || userDetails.lastName || ''}`.trim() : 
      'Unknown Principal';

    // Create report record (file is already uploaded to Cloudinary by multer)
    const reportRecord = {
      reportName: req.file.originalname,
      cloudinaryPublicId: cloudinaryPublicId,
      cloudinaryUrl: cloudinaryUrl,
      message: message || '',
      schoolYear: schoolYear || '',
      termName: termName || '',
      sentBy: req.user._id,
      sentByName: principalName,
      sentAt: new Date(),
      status: 'sent',
      deliveredAt: null
    };

    // Save to database
    console.log("📝 Saving report to database:", reportRecord);
    const result = await db.collection('VPEReports').insertOne(reportRecord);
    const reportId = result.insertedId;
    console.log("✅ Report saved successfully! ID:", reportId);

    // Send email notification to VPE
    try {
      // Get VPE users
      const vpeUsers = await db.collection('users').find({
        role: 'vice president of education',
        status: { $ne: 'archived' }
      }).toArray();

      console.log(`📧 Found ${vpeUsers.length} VPE users to notify`);

      if (vpeUsers.length > 0) {
        // Use Set to track sent emails to prevent duplicates
        const sentEmails = new Set();
        
        for (const vpeUser of vpeUsers) {
          const emailAddress = vpeUser.zohoEmail || vpeUser.email;
          
          // Skip if we've already sent to this email address
          if (sentEmails.has(emailAddress)) {
            console.log(`📧 Skipping duplicate email to: ${emailAddress}`);
            continue;
          }
          
          sentEmails.add(emailAddress);
          
          const subject = `New Faculty Report from Principal - ${schoolYear} ${termName}`;
          const emailContent = `
Dear ${vpeUser.firstName},

A new faculty report has been sent to you by ${req.user.firstname || req.user.firstName || 'Unknown'} ${req.user.lastname || req.user.lastName || 'User'}.

Report Details:
- School Year: ${schoolYear || 'N/A'}
- Term: ${termName || 'N/A'}
- Report Name: ${req.file.originalname}
- Sent Date: ${new Date().toLocaleString()}

${message ? `Message from Principal:\n"${message}"\n` : ''}

Please log in to JuanLMS to view and download the report.

Best regards,
JuanLMS System
          `;

          console.log(`📧 Sending email to VPE: ${emailAddress}`);
          await emailService.sendZohoNotification(
            emailAddress,
            vpeUser.firstName,
            subject,
            emailContent
          );
        }
        
        console.log(`📧 Successfully sent ${sentEmails.size} unique email notifications`);
      }
    } catch (emailError) {
      console.error('Error sending email notification:', emailError);
      // Don't fail the request if email fails
    }

    res.json({
      success: true,
      message: 'Report sent to VPE successfully',
      reportId: reportId
    });

  } catch (error) {
    console.error("VPE Report Send Error:", error);
    
    res.status(500).json({ 
      error: "Failed to send report to VPE", 
      details: error.message 
    });
  }
});

// GET /api/vpe-reports/sent - Get reports sent by principal
router.get("/sent", authenticateToken, async (req, res) => {
  try {
    // Only principals can view their sent reports
    if (req.user.role !== 'principal') {
      return res.status(403).json({ 
        error: "Access denied. Only principals can view sent reports." 
      });
    }

    let db;
    try {
      db = database.getDb();
    } catch (dbError) {
      await database.connectToServer();
      db = database.getDb();
    }

    const reports = await db.collection('VPEReports')
      .find({ sentBy: req.user._id })
      .sort({ sentAt: -1 })
      .limit(50)
      .toArray();

    res.json({
      success: true,
      reports: reports.map(report => ({
        id: report._id,
        reportName: report.reportName,
        message: report.message,
        schoolYear: report.schoolYear,
        termName: report.termName,
        sentAt: report.sentAt,
        status: report.status,
        deliveredAt: report.deliveredAt,
        cloudinaryUrl: report.cloudinaryUrl,
        cloudinaryPublicId: report.cloudinaryPublicId
      }))
    });

  } catch (error) {
    console.error("VPE Reports Fetch Error:", error);
    res.status(500).json({ 
      error: "Failed to fetch sent reports", 
      details: error.message 
    });
  }
});

// GET /api/vpe-reports/received - Get reports received by VPE
router.get("/received", authenticateToken, async (req, res) => {
  try {
    // Only VPE can view received reports
    if (req.user.role !== 'vice president of education') {
      return res.status(403).json({ 
        error: "Access denied. Only VPE can view received reports." 
      });
    }

    let db;
    try {
      db = database.getDb();
    } catch (dbError) {
      await database.connectToServer();
      db = database.getDb();
    }

    const reports = await db.collection('VPEReports')
      .find({})
      .sort({ sentAt: -1 })
      .limit(50)
      .toArray();

    res.json({
      success: true,
      reports: reports.map(report => ({
        id: report._id,
        reportName: report.reportName,
        message: report.message,
        schoolYear: report.schoolYear,
        termName: report.termName,
        sentBy: report.sentByName,
        sentAt: report.sentAt,
        status: report.status,
        deliveredAt: report.deliveredAt,
        cloudinaryUrl: report.cloudinaryUrl,
        cloudinaryPublicId: report.cloudinaryPublicId
      }))
    });

  } catch (error) {
    console.error("VPE Reports Received Fetch Error:", error);
    res.status(500).json({ 
      error: "Failed to fetch received reports", 
      details: error.message 
    });
  }
});

// GET /api/vpe-reports/download/:id - Download report file
router.get("/download/:id", authenticateToken, async (req, res) => {
  try {
    console.log("Download request - User role:", req.user.role, "User ID:", req.user._id, "Report ID:", req.params.id);
    
    // Only principals and VPE can download reports
    if (req.user.role !== 'principal' && req.user.role !== 'vice president of education') {
      console.log("Access denied for role:", req.user.role);
      return res.status(403).json({ 
        error: "Access denied. Only principals and VPE can download reports." 
      });
    }

    let db;
    try {
      db = database.getDb();
    } catch (dbError) {
      await database.connectToServer();
      db = database.getDb();
    }

    console.log("Looking for report with ID:", req.params.id);
    
    const report = await db.collection('VPEReports').findOne({ 
      _id: new ObjectId(req.params.id)
    });

    if (!report) {
      console.log("Report not found in database");
      return res.status(404).json({ error: "Report not found" });
    }
    
    console.log("Report found in database:", {
      id: report._id,
      reportName: report.reportName,
      hasCloudinaryUrl: !!report.cloudinaryUrl,
      hasFilePath: !!report.filePath
    });

    // Check access permissions
    const isOwner = String(report.sentBy) === String(req.user._id);
    const isVPE = req.user.role === 'vice president of education';
    
    if (!(isOwner || isVPE)) {
      return res.status(403).json({ error: "Access denied to this report" });
    }

    console.log("Report found:", {
      id: report._id,
      reportName: report.reportName,
      hasCloudinaryUrl: !!report.cloudinaryUrl,
      hasFilePath: !!report.filePath,
      cloudinaryUrl: report.cloudinaryUrl
    });

    // Update status to delivered if VPE is downloading
    if (req.user.role === 'vice president of education' && report.status === 'sent') {
      await db.collection('VPEReports').updateOne(
        { _id: new ObjectId(req.params.id) },
        { 
          $set: { 
            status: 'delivered',
            deliveredAt: new Date()
          } 
        }
      );
    }

    // Check if report has Cloudinary URL
    if (report.cloudinaryUrl) {
      // Fetch the file from Cloudinary and stream it with proper filename
      try {
        const response = await fetch(report.cloudinaryUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch file from Cloudinary: ${response.status}`);
        }
        
        // Set proper headers for download with filename
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${report.reportName}"`);
        res.setHeader('Content-Length', response.headers.get('content-length') || '');
        
        // Stream the file to the client
        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));
      } catch (fetchError) {
        console.error('Error fetching from Cloudinary:', fetchError);
        return res.status(500).json({ error: "Failed to download report from Cloudinary" });
      }
    } else if (report.filePath && fs.existsSync(report.filePath)) {
      // Fallback to local file if Cloudinary URL is not available
      res.download(report.filePath, report.reportName);
    } else {
      return res.status(404).json({ error: "Report file not found" });
    }

  } catch (error) {
    console.error("VPE Report Download Error:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ 
      error: "Failed to download report", 
      details: error.message 
    });
  }
});

// DELETE /api/vpe-reports/:id - Delete report (Principal owner only)
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    // Only principals can delete their own reports
    if (req.user.role !== 'principal') {
      return res.status(403).json({ 
        error: "Access denied. Only principals can delete reports." 
      });
    }

    let db;
    try {
      db = database.getDb();
    } catch (dbError) {
      await database.connectToServer();
      db = database.getDb();
    }

    const report = await db.collection('VPEReports').findOne({ 
      _id: new ObjectId(req.params.id)
    });

    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    // Check ownership
    if (String(report.sentBy) !== String(req.user._id)) {
      return res.status(403).json({ error: "You can only delete your own reports" });
    }

    // Delete file from Cloudinary
    if (report.cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(report.cloudinaryPublicId, {
          resource_type: 'raw'
        });
      } catch (cloudinaryError) {
        console.error('Error deleting from Cloudinary:', cloudinaryError);
        // Continue with database deletion even if Cloudinary deletion fails
      }
    }

    // Delete from database
    await db.collection('VPEReports').deleteOne({ 
      _id: new ObjectId(req.params.id)
    });

    res.json({ success: true, message: "Report deleted successfully" });

  } catch (error) {
    console.error("VPE Report Delete Error:", error);
    res.status(500).json({ 
      error: "Failed to delete report", 
      details: error.message 
    });
  }
});

export default router;
