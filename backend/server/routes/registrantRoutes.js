import express from 'express';
import Registrant from '../models/Registrant.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import SibApiV3Sdk from 'sib-api-v3-sdk';
import exceljs from 'exceljs';
import { sendEmail } from '../utils/emailUtil.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import GroupChat from '../models/GroupChat.js';
// import nodemailer from 'nodemailer'; // For real email sending
// import exceljs from 'exceljs'; // For real Excel export

const router = express.Router();

// POST /api/registrants/register
router.post('/register', async (req, res) => {
  try {
    const { firstName, middleName, lastName, personalEmail, contactNo, schoolID, trackName, strandName, sectionName } = req.body;
    if (!firstName || !lastName || !schoolID) {
      return res.status(400).json({ message: 'Please fill in all required fields.' });
    }
    // Validate schoolID format
    if (!/^\d{2}-\d{5}$/.test(schoolID) && !/^F00/.test(schoolID) && !/^A00/.test(schoolID)) {
      return res.status(400).json({ message: 'Invalid School ID format. Use YY-00000 for students, F00... for faculty, or A00... for admin.' });
    }
    // Validate contactNo if provided: must be 11 digits and only numbers
    if (contactNo && !/^\d{11}$/.test(contactNo)) {
      return res.status(400).json({ message: 'Contact number must be exactly 11 digits and contain only numbers.' });
    }
    
    // Check for existing registrant with same email (only if personalEmail is provided)
    let existingRegistrant = null;
    if (personalEmail) {
      existingRegistrant = await Registrant.findOne({ personalEmail });
      console.log(`[POST /api/registrants/register] Checking for existing registrant with email ${personalEmail}:`, existingRegistrant ? { exists: true, status: existingRegistrant.status, schoolID: existingRegistrant.schoolID } : { exists: false });
    }
    
    if (existingRegistrant) {
      // If registrant exists and was rejected, allow re-registration by updating the existing record
      if (existingRegistrant.status === 'rejected') {
        // Update the existing rejected registrant with new information
        existingRegistrant.firstName = firstName;
        existingRegistrant.middleName = middleName;
        existingRegistrant.lastName = lastName;
        existingRegistrant.contactNo = contactNo;
        existingRegistrant.schoolID = schoolID;
        existingRegistrant.status = 'pending'; // Reset to pending for admin review
        existingRegistrant.registrationDate = new Date(); // Update registration date
        existingRegistrant.rejectionNote = ''; // Clear previous rejection note
        existingRegistrant.processedAt = null; // Clear processing info
        existingRegistrant.processedBy = null; // Clear who processed it
        
        // Keep rejection history for admin reference
        // rejectionHistory array is preserved
        
        await existingRegistrant.save();
        
        return res.status(200).json({ 
          message: 'Re-registration successful. Your application has been updated and is pending review.',
          isReRegistration: true
        });
      } else if (existingRegistrant.status === 'pending') {
        return res.status(409).json({ message: 'A registration with this email is already pending review.' });
      } else if (existingRegistrant.status === 'approved') {
        return res.status(409).json({ message: 'A registration with this email has already been approved.' });
      }
    }
    
    // Check for duplicate schoolID in User model (approved accounts)
    const existingSchoolIdUser = await User.findOne({ schoolID });
    if (existingSchoolIdUser) {
      return res.status(409).json({ message: 'An account with this School ID already exists.' });
    }
    
    // Check for duplicate schoolID in other pending registrants
    const existingSchoolIdRegistrant = await Registrant.findOne({ 
      schoolID, 
      status: { $in: ['pending', 'approved'] } 
    });
    if (existingSchoolIdRegistrant) {
      return res.status(409).json({ message: 'A registration with this School ID is already in progress or approved.' });
    }
    
    // Create new registrant
    const registrant = new Registrant({
      firstName,
      middleName,
      lastName,
      personalEmail,
      contactNo,
      schoolID,
      trackName,
      strandName,
      sectionName
    });
    await registrant.save();
    res.status(201).json({ message: 'Registration successful.' });
  } catch (err) {
    console.error('Server error in register endpoint:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/registrants?date=YYYY-MM-DD&status=pending
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { date, status, page = 1, limit = 10 } = req.query;
    let filter = {};
    
    // Handle date filter - convert to proper date range if needed
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      filter.registrationDate = {
        $gte: startDate,
        $lt: endDate
      };
    }
    
    if (status && status !== 'all') filter.status = status;
    const numericLimit = Math.max(1, parseInt(limit));
    const numericPage = Math.max(1, parseInt(page));
    const skip = (numericPage - 1) * numericLimit;

    const [registrants, total] = await Promise.all([
      Registrant.find(filter)
        .sort({ registrationDate: -1 })
        .skip(skip)
        .limit(numericLimit),
      Registrant.countDocuments(filter)
    ]);

    console.log(`[GET /api/registrants] Found ${registrants.length} registrants (total: ${total}) with filter:`, filter);

    res.json({
      data: registrants,
      pagination: {
        page: numericPage,
        limit: numericLimit,
        total,
        totalPages: Math.ceil(total / numericLimit)
      }
    });
  } catch (err) {
    console.error('Server error in get endpoint:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/registrants/:id/approve
router.post('/:id/approve', authenticateToken, async (req, res) => {
  try {
    const hasEmailConfig = !!process.env.BREVO_API_KEY;
    if (!hasEmailConfig) {
      console.warn('BREVO_API_KEY is not set. Approval will proceed without email notification.');
    }
    const registrant = await Registrant.findById(req.params.id);
    if (!registrant) return res.status(404).json({ message: 'Registrant not found' });
    if (registrant.status !== 'pending') return res.status(400).json({ message: 'Already processed' });
    
    // Validate minimal data before creating the user account
    const isStudentId = /^\d{2}-\d{5}$/.test(registrant.schoolID);
    const isFacultyId = /^F\d{3}$/.test(registrant.schoolID);
    const isAdminId = /^A\d{3}$/.test(registrant.schoolID);
    const isVPEPrincipalId = /^N\d{3}$/.test(registrant.schoolID);
    
    if (!(isStudentId || isFacultyId || isAdminId || isVPEPrincipalId)) {
      return res.status(400).json({ message: 'Registrant has an invalid or missing School ID. Please correct it before approval.' });
    }
    if (registrant.contactNo && !/^\d{11}$/.test(registrant.contactNo)) {
      return res.status(400).json({ message: 'Registrant has an invalid contact number. It must be exactly 11 digits.' });
    }

    // Helper function to clean names for email generation
    const clean = (str) => (str || '').toLowerCase().replace(/[^\p{L}0-9]/gu, '');
    
    // Determine role based on schoolID format
    let role = 'students'; // default
    let schoolEmail = '';
    
    if (isStudentId) {
      role = 'students';
      schoolEmail = `students.${clean(registrant.firstName)}.${clean(registrant.lastName)}@sjdefilms.com`;
    } else if (isFacultyId) {
      role = 'faculty';
      schoolEmail = `faculty.${clean(registrant.firstName)}.${clean(registrant.lastName)}@sjdefilms.com`;
    } else if (isAdminId) {
      role = 'admin';
      schoolEmail = `admin.${clean(registrant.firstName)}.${clean(registrant.lastName)}@sjdefilms.com`;
    } else if (isVPEPrincipalId) {
      // Check if it's VPE or Principal based on the specific ID pattern
      // You may need to adjust this logic based on your specific numbering scheme
      role = 'vice president of education'; // or 'principal' based on your needs
      schoolEmail = `vpe.${clean(registrant.firstName)}.${clean(registrant.lastName)}@sjdefilms.com`;
    }

    // Generate a simple temporary password (letters and numbers only)
    const generateSimplePassword = () => {
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
      const digits = '0123456789';
      let pwd = '';
      // Ensure at least one uppercase, one lowercase, and one digit
      pwd += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
      pwd += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
      pwd += digits[Math.floor(Math.random() * 10)];
      const pool = letters + digits;
      for (let i = 0; i < 7; i++) { // total length 10
        pwd += pool[Math.floor(Math.random() * pool.length)];
      }
      return pwd;
    };
    const tempPassword = generateSimplePassword();
    const user = new User({
      firstname: registrant.firstName,
      middlename: registrant.middleName,
      lastname: registrant.lastName,
      personalemail: registrant.personalEmail,
      email: schoolEmail,
      contactNo: registrant.contactNo,
      schoolID: registrant.schoolID,
      password: tempPassword,
      role: role, // Use the determined role instead of hardcoded 'students'
      changePassAttempts: 0,
    });
    
    try {
      await user.save();
    } catch (saveErr) {
      console.error('Validation error creating user from registrant:', saveErr);
      return res.status(400).json({ message: saveErr.message || 'Failed to create user from registrant.' });
    }

    // Create Zoho mailbox for the user
    let zohoMailboxResult = null;
    try {
      const { createZohoMailbox } = await import('../services/zohoMail.js');
      
      // Only create Zoho mailbox if ZOHO_ORG_ID is configured
      if (process.env.ZOHO_ORG_ID) {
        console.log("Creating Zoho mailbox for registrant:", schoolEmail);
        zohoMailboxResult = await createZohoMailbox(
          schoolEmail.toLowerCase(),
          registrant.firstName,
          registrant.lastName,
          tempPassword
        );
        console.log("Zoho mailbox created successfully for registrant");
      } else {
        console.log("ZOHO_ORG_ID not configured, skipping Zoho mailbox creation");
      }
    } catch (zohoErr) {
      console.error('Error creating Zoho mailbox for registrant:', zohoErr.message);
      // Don't fail the approval if Zoho mailbox creation fails
      // Just log the error and continue
    }
    
    registrant.status = 'approved';
    registrant.processedAt = new Date();
    registrant.processedBy = req.body && req.body.adminId ? req.body.adminId : null;
    await registrant.save();
    
    // Send acceptance email via Brevo using EmailService (only if personalEmail is provided)
    let brevoResult = null;
    if (registrant.personalEmail) {
      try {
        const emailService = await import('../services/emailService.js');
        console.log("About to send acceptance email to registrant");
        brevoResult = await emailService.default.sendWelcomeEmail(
          registrant.personalEmail,
          registrant.firstName,
          schoolEmail,
          tempPassword
        );
        console.log("Acceptance email sent to registrant:", brevoResult.message);
      } catch (emailErr) {
        console.error('Error sending acceptance email via Brevo:', emailErr);
        brevoResult = { success: false, message: 'Failed to send acceptance email' };
      }
    } else {
      brevoResult = { success: false, message: 'No personal email provided, skipping email notification' };
    }

    // Try to auto-join the global forum group (by ID if provided, else by name)
    try {
      let target = null;
      const forumId = process.env.FORUM_GROUP_ID && String(process.env.FORUM_GROUP_ID).trim();
      if (forumId) {
        try {
          target = await GroupChat.findById(forumId);
        } catch (_) {
          // ignore invalid id
        }
      }
      if (!target) {
        const groups = await GroupChat.find({ isActive: true });
        target = groups.find(g => {
          const name = (g.getDecryptedName && g.getDecryptedName()) || g.name;
          const n = (typeof name === 'string' ? name : '').toLowerCase();
          return n === 'sjdef forum' || n === 'all users' || n === 'all users forum';
        }) || null;
      }
      if (target) {
        try {
          const name = (target.getDecryptedName && target.getDecryptedName()) || target.name || '';
          const n = (typeof name === 'string' ? name : '').toLowerCase();
          if (n.includes('forum') || n === 'all users' || n === 'all users forum' || n === 'sjdef forum') {
            if (typeof target.maxParticipants !== 'number' || target.maxParticipants < 100000) {
              target.maxParticipants = 100000;
            }
          }
        } catch (_) {}
        if (!target.isParticipant(String(user._id))) {
          const ok = target.addParticipant(String(user._id));
          if (ok) {
            await target.save();
          }
        }
      }
    } catch (e) {
      console.warn('Auto-join to global forum group failed (approval):', e?.message || e);
    }
    res.json({ 
      message: 'Registrant approved and user created.',
      emailServices: {
        brevo: brevoResult || {
          success: false,
          message: "Acceptance email sending failed"
        },
        zohoMailbox: zohoMailboxResult ? {
          success: true,
          message: "Zoho mailbox created successfully",
          email: schoolEmail
        } : {
          success: false,
          message: "Zoho mailbox creation skipped or failed"
        }
      }
    });
  } catch (err) {
    console.error('Server error in approve endpoint:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/registrants/:id/reject
router.post('/:id/reject', authenticateToken, async (req, res) => {
  try {
    const hasEmailConfig = !!process.env.BREVO_API_KEY;
    if (!hasEmailConfig) {
      console.warn('BREVO_API_KEY is not set. Rejection will proceed without email notification.');
    }
    const { note } = req.body;
    const registrant = await Registrant.findById(req.params.id);
    if (!registrant) return res.status(404).json({ message: 'Registrant not found' });
    if (registrant.status !== 'pending') return res.status(400).json({ message: 'Already processed' });
    
    // Add to rejection history
    const rejectionEntry = {
      date: new Date(),
      note: note || 'Application requirements not met',
      processedBy: req.body.adminId || null
    };
    
    // Initialize rejectionHistory array if it doesn't exist
    if (!registrant.rejectionHistory) {
      registrant.rejectionHistory = [];
    }
    
    registrant.rejectionHistory.push(rejectionEntry);
    registrant.status = 'rejected';
    registrant.rejectionNote = note || 'Application requirements not met';
    registrant.processedAt = new Date();
    registrant.processedBy = req.body.adminId || null;
    
    await registrant.save();
    
    // Send rejection email via Brevo (only if email is configured and personalEmail is provided)
    if (hasEmailConfig && registrant.personalEmail) {
      try {
        let defaultClient = SibApiV3Sdk.ApiClient.instance;
        let apiKey = defaultClient.authentications['api-key'];
        apiKey.apiKey = process.env.BREVO_API_KEY;
        let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
        let applicantName = `${registrant.firstName} ${registrant.lastName}`;
        let sendSmtpEmail = {
          to: [{ email: registrant.personalEmail, name: applicantName }],
          sender: { email: 'juanlms.sjddefi@gmail.com', name: 'JuanLMS Support' },
          subject: 'Admission Decision',
          textContent:
`Dear ${applicantName},\n\nThank you for your interest in joining our academic institution. After careful consideration of your application, we regret to inform you that we are unable to offer you admission at this time.\n\n${registrant.rejectionNote ? `Reason: ${registrant.rejectionNote}\n\n` : ''}If you would like clarification regarding this decision or would like to discuss alternative pathways, we encourage you to contact the Registrar's Office at your convenience.\n\nWe appreciate the effort you put into your application and wish you success in your academic journey.\n\nSincerely,\nAdmissions Office`
        };
        await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log('Rejection email sent to', registrant.personalEmail);
      } catch (emailErr) {
        console.error('Error sending rejection email via Brevo:', emailErr);
        console.warn('Rejection completed but email notification failed.');
      }
    } else {
      if (!hasEmailConfig) {
        console.log('Rejection completed without email notification (email system not configured)');
      } else {
        console.log('Rejection completed without email notification (no personal email provided)');
      }
    }
    res.json({ message: 'Registrant rejected.' });
  } catch (err) {
    console.error('Server error in reject endpoint:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/registrants/export?date=YYYY-MM-DD&status=pending
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const { date, status } = req.query;
    let filter = {};
    
    // Handle date filter - convert to proper date range if needed
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      filter.registrationDate = {
        $gte: startDate,
        $lt: endDate
      };
    }
    
    if (status && status !== 'all') filter.status = status;
    
    const registrants = await Registrant.find(filter).sort({ registrationDate: -1 });
    const count = registrants.length;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-CA');
    const timeStr = now.toLocaleTimeString();

    // Create workbook and worksheet
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Registrants');

    // Header rows
    worksheet.addRow([
      `Registrants Report`,
      `Generated on: ${dateStr} at ${timeStr}`,
      `Total Records: ${count}`,
      '', '', '', '', ''
    ]);
    
    // Add filter info
    let filterInfo = 'Filters: ';
    if (date) filterInfo += `Date: ${date} `;
    if (status && status !== 'all') filterInfo += `Status: ${status}`;
    if (filterInfo === 'Filters: ') filterInfo += 'All records';
    worksheet.addRow([filterInfo, '', '', '', '', '', '', '']);
    worksheet.addRow(['', '', '', '', '', '', '', '']); // Empty row

    // Column headers
    worksheet.addRow([
      'School ID',
      'First Name', 
      'Middle Name', 
      'Last Name', 
      'Personal Email', 
      'Contact Number',
      'Registration Date',
      'Status',
      'Rejection Note'
    ]);

    // Data rows
    registrants.forEach((r) => {
      worksheet.addRow([
        r.schoolID || '',
        r.firstName || '',
        r.middleName || '',
        r.lastName || '',
        r.personalEmail || '',
        r.contactNo || '',
        r.registrationDate ? new Date(r.registrationDate).toLocaleDateString() : '',
        r.status || '',
        r.rejectionNote || ''
      ]);
    });

    // Style headers
    worksheet.getRow(1).font = { bold: true, size: 14 };
    worksheet.getRow(2).font = { bold: true, size: 12 };
    worksheet.getRow(3).font = { bold: true, size: 12 };
    worksheet.getRow(6).font = { bold: true, size: 12 };
    
    // Set column widths
    worksheet.columns.forEach((col, index) => {
      if (index === 0) col.width = 15; // School ID
      else if (index === 4) col.width = 30; // Email
      else if (index === 5) col.width = 15; // Contact
      else if (index === 6) col.width = 15; // Date
      else if (index === 8) col.width = 25; // Rejection Note
      else col.width = 18;
    });
    
    // Center align headers
    worksheet.getRow(6).alignment = { horizontal: 'center' };

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Registrants_${dateStr}_${timeStr.replace(/:/g, '-')}.xlsx`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Server error in export endpoint:', err);
    res.status(500).json({ message: 'Failed to export registrants', error: err.message });
  }
});

// Test email endpoint for debugging
router.post('/test-email', async (req, res) => {
  const { to, subject, text } = req.body;
  if (!process.env.BREVO_API_KEY) {
    return res.status(500).json({ message: 'BREVO_API_KEY is not set.' });
  }
  try {
    let SibApiV3Sdk = require('sib-api-v3-sdk');
    let defaultClient = SibApiV3Sdk.ApiClient.instance;
    let apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = process.env.BREVO_API_KEY;
    let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    let sendSmtpEmail = {
      to: [{ email: registrant.personalEmail, name: applicantName }],
      sender: { email: 'juanlms.sjddefi@gmail.com', name: 'JuanLMS Support' },
      subject: subject || 'Test Email from JuanLMS',
      textContent: text || 'This is a test email from JuanLMS.'
    };
    await apiInstance.sendTransacEmail(sendSmtpEmail);
    res.json({ message: 'Test email sent.' });
  } catch (err) {
    console.error('Error sending test email:', err);
    res.status(500).json({ message: 'Failed to send test email', error: err.message });
  }
});

// Test endpoint to simulate approval process
router.post('/test-approval', async (req, res) => {
  try {
    const { personalEmail } = req.body;
    
    if (!personalEmail) {
      return res.status(400).json({ message: 'Personal email is required' });
    }

    // Find the registrant by personal email
    const registrant = await Registrant.findOne({ personalEmail });
    if (!registrant) {
      return res.status(404).json({ message: 'Registrant not found' });
    }

    if (registrant.status !== 'pending') {
      return res.status(400).json({ message: 'Registrant already processed' });
    }

    // Validate minimal data before creating the user account
    const isStudentId = /^\d{2}-\d{5}$/.test(registrant.schoolID);
    const isFacultyId = /^F\d{3}$/.test(registrant.schoolID);
    const isAdminId = /^A\d{3}$/.test(registrant.schoolID);
    const isVPEPrincipalId = /^N\d{3}$/.test(registrant.schoolID);
    
    if (!(isStudentId || isFacultyId || isAdminId || isVPEPrincipalId)) {
      return res.status(400).json({ message: 'Registrant has an invalid or missing School ID. Please correct it before approval.' });
    }
    if (registrant.contactNo && !/^\d{11}$/.test(registrant.contactNo)) {
      return res.status(400).json({ message: 'Registrant has an invalid contact number. It must be exactly 11 digits.' });
    }

    // Helper function to clean names for email generation
    const clean = (str) => (str || '').toLowerCase().replace(/[^\p{L}0-9]/gu, '');
    
    // Determine role based on schoolID format
    let role = 'students'; // default
    let schoolEmail = '';
    
    if (isStudentId) {
      role = 'students';
      schoolEmail = `students.${clean(registrant.firstName)}.${clean(registrant.lastName)}@sjdefilms.com`;
    } else if (isFacultyId) {
      role = 'faculty';
      schoolEmail = `faculty.${clean(registrant.firstName)}.${clean(registrant.lastName)}@sjdefilms.com`;
    } else if (isAdminId) {
      role = 'admin';
      schoolEmail = `admin.${clean(registrant.firstName)}.${clean(registrant.lastName)}@sjdefilms.com`;
    } else if (isVPEPrincipalId) {
      role = 'vice president of education';
      schoolEmail = `vpe.${clean(registrant.firstName)}.${clean(registrant.lastName)}@sjdefilms.com`;
    }

    // Generate a simple temporary password (letters and numbers only)
    const generateSimplePassword2 = () => {
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
      const digits = '0123456789';
      let pwd = '';
      pwd += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
      pwd += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
      pwd += digits[Math.floor(Math.random() * 10)];
      const pool = letters + digits;
      for (let i = 0; i < 7; i++) {
        pwd += pool[Math.floor(Math.random() * pool.length)];
      }
      return pwd;
    };
    const tempPassword = generateSimplePassword2();

    // Create user account
    const user = new User({
      firstname: registrant.firstName,
      middlename: registrant.middleName,
      lastname: registrant.lastName,
      personalemail: registrant.personalEmail,
      email: schoolEmail,
      contactNo: registrant.contactNo,
      schoolID: registrant.schoolID,
      password: tempPassword,
      role: role,
    });
    
    try {
      await user.save();
    } catch (saveErr) {
      console.error('Validation error creating user from registrant:', saveErr);
      return res.status(400).json({ message: saveErr.message || 'Failed to create user from registrant.' });
    }

    // Create Zoho mailbox for the user
    let zohoMailboxResult = null;
    try {
      const { createZohoMailbox } = await import('../services/zohoMail.js');
      
      // Only create Zoho mailbox if ZOHO_ORG_ID is configured
      if (process.env.ZOHO_ORG_ID) {
        console.log("Creating Zoho mailbox for registrant:", schoolEmail);
        zohoMailboxResult = await createZohoMailbox(
          schoolEmail.toLowerCase(),
          registrant.firstName,
          registrant.lastName,
          tempPassword
        );
        console.log("Zoho mailbox created successfully for registrant");
      } else {
        console.log("ZOHO_ORG_ID not configured, skipping Zoho mailbox creation");
      }
    } catch (zohoErr) {
      console.error('Error creating Zoho mailbox for registrant:', zohoErr.message);
      // Don't fail the approval if Zoho mailbox creation fails
      // Just log the error and continue
    }
    
    registrant.status = 'approved';
    registrant.processedAt = new Date();
    await registrant.save();
    
    // Send acceptance email via Brevo using EmailService (only if personalEmail is provided)
    let brevoResult = null;
    if (registrant.personalEmail) {
      try {
        const emailService = await import('../services/emailService.js');
        console.log("About to send acceptance email to registrant");
        brevoResult = await emailService.default.sendWelcomeEmail(
          registrant.personalEmail,
          registrant.firstName,
          schoolEmail,
          tempPassword
        );
        console.log("Acceptance email sent to registrant:", brevoResult.message);
      } catch (emailErr) {
        console.error('Error sending acceptance email via Brevo:', emailErr);
        brevoResult = { success: false, message: 'Failed to send acceptance email' };
      }
    } else {
      brevoResult = { success: false, message: 'No personal email provided, skipping email notification' };
    }

    res.json({ 
      message: 'Registrant approved and user created.',
      user: {
        email: schoolEmail,
        password: tempPassword,
        role: role
      },
      emailServices: {
        brevo: brevoResult || {
          success: false,
          message: "Acceptance email sending failed"
        },
        zohoMailbox: zohoMailboxResult ? {
          success: true,
          message: "Zoho mailbox created successfully",
          email: schoolEmail
        } : {
          success: false,
          message: "Zoho mailbox creation skipped or failed"
        }
      }
    });
  } catch (err) {
    console.error('Server error in test approval endpoint:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Public endpoints for academic data (no authentication required)
// GET /api/registrants/tracks - Get all tracks for active term
router.get('/tracks', async (req, res) => {
  try {
    // First get the active academic year and term
    const SchoolYear = (await import('../models/SchoolYear.js')).default;
    const Term = (await import('../models/Term.js')).default;
    const Track = (await import('../models/Track.js')).default;
    
    const activeYear = await SchoolYear.findOne({ status: 'active' });
    if (!activeYear) {
      return res.status(404).json({ message: 'No active academic year found' });
    }
    
    const activeTerm = await Term.findOne({ 
      schoolYear: `${activeYear.schoolYearStart}-${activeYear.schoolYearEnd}`,
      status: 'active' 
    });
    
    if (!activeTerm) {
      return res.status(404).json({ message: 'No active term found' });
    }
    
    const tracks = await Track.find({
      schoolYear: `${activeYear.schoolYearStart}-${activeYear.schoolYearEnd}`,
      termName: activeTerm.termName
    });
    
    console.log('Fetched tracks for registration:', {
      schoolYear: `${activeYear.schoolYearStart}-${activeYear.schoolYearEnd}`,
      termName: activeTerm.termName,
      tracksCount: tracks.length,
      tracks: tracks.map(t => ({ _id: t._id, trackName: t.trackName, schoolYear: t.schoolYear, termName: t.termName }))
    });
    
    res.json(tracks);
  } catch (error) {
    console.error('Error fetching tracks:', error);
    res.status(500).json({ message: 'Failed to fetch tracks', error: error.message });
  }
});

// GET /api/registrants/strands - Get all strands for active term
router.get('/strands', async (req, res) => {
  try {
    // First get the active academic year and term
    const SchoolYear = (await import('../models/SchoolYear.js')).default;
    const Term = (await import('../models/Term.js')).default;
    const Strand = (await import('../models/Strand.js')).default;
    
    const activeYear = await SchoolYear.findOne({ status: 'active' });
    if (!activeYear) {
      return res.status(404).json({ message: 'No active academic year found' });
    }
    
    const activeTerm = await Term.findOne({ 
      schoolYear: `${activeYear.schoolYearStart}-${activeYear.schoolYearEnd}`,
      status: 'active' 
    });
    
    if (!activeTerm) {
      return res.status(404).json({ message: 'No active term found' });
    }
    
    const strands = await Strand.find({
      schoolYear: `${activeYear.schoolYearStart}-${activeYear.schoolYearEnd}`,
      termName: activeTerm.termName
    });
    
    console.log('Fetched strands for registration:', {
      schoolYear: `${activeYear.schoolYearStart}-${activeYear.schoolYearEnd}`,
      termName: activeTerm.termName,
      strandsCount: strands.length,
      strands: strands.map(s => ({ _id: s._id, strandName: s.strandName, trackName: s.trackName, schoolYear: s.schoolYear, termName: s.termName }))
    });
    
    res.json(strands);
  } catch (error) {
    console.error('Error fetching strands:', error);
    res.status(500).json({ message: 'Failed to fetch strands', error: error.message });
  }
});

// GET /api/registrants/sections - Get all sections for active term
router.get('/sections', async (req, res) => {
  try {
    // First get the active academic year and term
    const SchoolYear = (await import('../models/SchoolYear.js')).default;
    const Term = (await import('../models/Term.js')).default;
    const Section = (await import('../models/Section.js')).default;
    
    const activeYear = await SchoolYear.findOne({ status: 'active' });
    if (!activeYear) {
      return res.status(404).json({ message: 'No active academic year found' });
    }
    
    const activeTerm = await Term.findOne({ 
      schoolYear: `${activeYear.schoolYearStart}-${activeYear.schoolYearEnd}`,
      status: 'active' 
    });
    
    if (!activeTerm) {
      return res.status(404).json({ message: 'No active term found' });
    }
    
    const sections = await Section.find({
      schoolYear: `${activeYear.schoolYearStart}-${activeYear.schoolYearEnd}`,
      termName: activeTerm.termName
    });
    
    console.log('Fetched sections for registration:', {
      schoolYear: `${activeYear.schoolYearStart}-${activeYear.schoolYearEnd}`,
      termName: activeTerm.termName,
      sectionsCount: sections.length,
      sections: sections.map(s => ({ _id: s._id, sectionName: s.sectionName, trackName: s.trackName, strandName: s.strandName, schoolYear: s.schoolYear, termName: s.termName }))
    });
    
    res.json(sections);
  } catch (error) {
    console.error('Error fetching sections:', error);
    res.status(500).json({ message: 'Failed to fetch sections', error: error.message });
  }
});

// GET /api/registrants/student-options - Get all student options for dropdown
router.get('/student-options', async (req, res) => {
  try {
    // Import StudentAssignment model
    const StudentAssignment = (await import('../models/StudentAssignment.js')).default;
    
    // Get all student assignments with basic info for dropdown
    const studentAssignments = await StudentAssignment.find({
      status: 'active'
    }).select('studentSchoolID studentSchoolEmail studentName firstName lastName trackName strandName sectionName personalEmail');
    
    console.log('Raw student assignments from DB:', studentAssignments.length);
    
    // Transform data for dropdown and filter out invalid entries
    const studentOptions = studentAssignments
      .filter(assignment => 
        assignment.studentSchoolID && 
        (assignment.studentName || (assignment.firstName && assignment.lastName))
      )
      .map(assignment => ({
        studentSchoolID: assignment.studentSchoolID,
        studentSchoolEmail: assignment.studentSchoolEmail || '',
        studentName: assignment.studentName || `${assignment.firstName} ${assignment.lastName}`,
        firstName: assignment.firstName || '',
        lastName: assignment.lastName || '',
        trackName: assignment.trackName || '',
        strandName: assignment.strandName || '',
        sectionName: assignment.sectionName || '',
        personalEmail: assignment.personalEmail || ''
      }));
    
    console.log('Processed student options:', studentOptions.length);
    res.json(studentOptions);
  } catch (error) {
    console.error('Error fetching student options:', error);
    res.status(500).json({ message: 'Failed to fetch student options', error: error.message });
  }
});

// GET /api/registrants/student-details - Get student details from StudentAssignment by school ID and school email
router.post('/student-details', async (req, res) => {
  try {
    const { schoolID, schoolEmail } = req.body;
    
    if (!schoolID || !schoolEmail) {
      return res.status(400).json({ message: 'School ID and School Email are required' });
    }
    
    // Import StudentAssignment model
    const StudentAssignment = (await import('../models/StudentAssignment.js')).default;
    
    // Normalize inputs for comparison
    const normalizedSchoolID = schoolID.trim();
    const normalizedSchoolEmail = schoolEmail.trim().toLowerCase();
    
    // Find student assignment by school ID first
    // Must have both studentSchoolID and studentSchoolEmail present
    const studentAssignment = await StudentAssignment.findOne({
      studentSchoolID: normalizedSchoolID,
      studentSchoolEmail: { 
        $exists: true,
        $ne: null,
        $ne: ''
      }
    });
    
    // Verify both school ID and school email match exactly (case-insensitive)
    if (!studentAssignment) {
      return res.status(404).json({ message: 'Student not found. Please verify that your School ID and School Email match the records in our system.' });
    }
    
    // Double-check: verify the email matches exactly (case-insensitive)
    const assignmentEmail = (studentAssignment.studentSchoolEmail || '').trim().toLowerCase();
    if (assignmentEmail !== normalizedSchoolEmail) {
      console.log(`Email mismatch: provided="${normalizedSchoolEmail}", found="${assignmentEmail}"`);
      return res.status(404).json({ message: 'Student not found. Please verify that your School ID and School Email match the records in our system.' });
    }
    
    // Verify school ID matches
    const assignmentSchoolID = (studentAssignment.studentSchoolID || '').trim();
    if (assignmentSchoolID !== normalizedSchoolID) {
      console.log(`School ID mismatch: provided="${normalizedSchoolID}", found="${assignmentSchoolID}"`);
      return res.status(404).json({ message: 'Student not found. Please verify that your School ID and School Email match the records in our system.' });
    }
    
    // Return student details
    res.json({
      firstName: studentAssignment.firstName,
      middleName: '', // StudentAssignment doesn't have middleName field
      lastName: studentAssignment.lastName,
      personalEmail: schoolEmail, // Use the provided school email
      schoolID: studentAssignment.studentSchoolID,
      trackName: studentAssignment.trackName,
      strandName: studentAssignment.strandName,
      sectionName: studentAssignment.sectionName,
      gradeLevel: studentAssignment.gradeLevel,
      enrollmentType: studentAssignment.enrollmentType
    });
  } catch (error) {
    console.error('Error fetching student details:', error);
    res.status(500).json({ message: 'Failed to fetch student details', error: error.message });
  }
});

export default router; 