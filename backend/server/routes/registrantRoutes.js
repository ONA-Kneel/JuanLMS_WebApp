import express from 'express';
import Registrant from '../models/Registrant.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import SibApiV3Sdk from 'sib-api-v3-sdk';
import exceljs from 'exceljs';
import { sendEmail } from '../utils/emailUtil.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
// import nodemailer from 'nodemailer'; // For real email sending
// import exceljs from 'exceljs'; // For real Excel export

const router = express.Router();

// POST /api/registrants/register
router.post('/register', async (req, res) => {
  try {
    const { firstName, middleName, lastName, personalEmail, contactNo, schoolID, trackName, strandName, sectionName } = req.body;
    if (!firstName || !lastName || !personalEmail || !contactNo || !schoolID) {
      return res.status(400).json({ message: 'Please fill in all required fields.' });
    }
    // Validate schoolID format
    if (!/^\d{2}-\d{5}$/.test(schoolID) && !/^F00/.test(schoolID) && !/^A00/.test(schoolID)) {
      return res.status(400).json({ message: 'Invalid School ID format. Use YY-00000 for students, F00... for faculty, or A00... for admin.' });
    }
    // Validate contactNo: must be 11 digits and only numbers
    if (!/^\d{11}$/.test(contactNo)) {
      return res.status(400).json({ message: 'Contact number must be exactly 11 digits and contain only numbers.' });
    }
    
    // Check for existing registrant with same email
    const existingRegistrant = await Registrant.findOne({ personalEmail });
    
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
    if (date) filter.registrationDate = date;
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
    if (!/^\d{11}$/.test(registrant.contactNo || '')) {
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

    // Generate a secure temporary password that meets Zoho requirements
    const generateSecurePassword = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
      let password = '';
      // Ensure at least one uppercase, lowercase, number, and special character
      password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
      password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
      password += '0123456789'[Math.floor(Math.random() * 10)];
      password += '!@#$%^&*'[Math.floor(Math.random() * 8)];
      // Add 8 more random characters
      for (let i = 0; i < 8; i++) {
        password += chars[Math.floor(Math.random() * chars.length)];
      }
      // Shuffle the password
      return password.split('').sort(() => Math.random() - 0.5).join('');
    };
    const tempPassword = generateSecurePassword();
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
    
    // Send acceptance email via Brevo using EmailService
    let brevoResult = null;
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
    
    // Send rejection email via Brevo (only if email is configured)
    if (hasEmailConfig) {
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
      console.log('Rejection completed without email notification (email system not configured)');
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
    if (!/^\d{11}$/.test(registrant.contactNo || '')) {
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

    // Generate a secure temporary password that meets Zoho requirements
    const generateSecurePassword = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
      let password = '';
      // Ensure at least one uppercase, lowercase, number, and special character
      password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
      password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
      password += '0123456789'[Math.floor(Math.random() * 10)];
      password += '!@#$%^&*'[Math.floor(Math.random() * 8)];
      // Add 8 more random characters
      for (let i = 0; i < 8; i++) {
        password += chars[Math.floor(Math.random() * chars.length)];
      }
      // Shuffle the password
      return password.split('').sort(() => Math.random() - 0.5).join('');
    };
    const tempPassword = generateSecurePassword();

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
    
    // Send acceptance email via Brevo using EmailService
    let brevoResult = null;
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

export default router; 