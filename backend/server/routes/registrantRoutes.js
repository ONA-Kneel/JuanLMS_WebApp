import express from 'express';
import Registrant from '../models/Registrant.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import SibApiV3Sdk from 'sib-api-v3-sdk';
import exceljs from 'exceljs';
import { sendEmail } from '../utils/emailUtil.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// POST /api/registrants/register
router.post('/register', async (req, res) => {
  try {
    const { firstName, middleName, lastName, personalEmail, contactNo, schoolID } = req.body;
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
      if (existingRegistrant.status === 'rejected') {
        existingRegistrant.firstName = firstName;
        existingRegistrant.middleName = middleName;
        existingRegistrant.lastName = lastName;
        existingRegistrant.contactNo = contactNo;
        existingRegistrant.schoolID = schoolID;
        existingRegistrant.status = 'pending';
        existingRegistrant.registrationDate = new Date();
        existingRegistrant.rejectionNote = '';
        existingRegistrant.processedAt = null;
        existingRegistrant.processedBy = null;
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
    
    const existingSchoolIdUser = await User.findOne({ schoolID });
    if (existingSchoolIdUser) {
      return res.status(409).json({ message: 'An account with this School ID already exists.' });
    }
    
    const existingSchoolIdRegistrant = await Registrant.findOne({ 
      schoolID, 
      status: { $in: ['pending', 'approved'] } 
    });
    if (existingSchoolIdRegistrant) {
      return res.status(409).json({ message: 'A registration with this School ID is already in progress or approved.' });
    }
    
    const registrant = new Registrant({
      firstName,
      middleName,
      lastName,
      personalEmail,
      contactNo,
      schoolID,
    });
    await registrant.save();
    res.status(201).json({ message: 'Registration successful.' });
  } catch (err) {
    console.error('Server error in register endpoint:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/registrants
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { date, status } = req.query;
    let filter = {};
    if (date) filter.registrationDate = date;
    if (status && status !== 'all') filter.status = status;
    const registrants = await Registrant.find(filter).sort({ registrationDate: -1 });
    res.json(registrants);
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

    const isStudentId = /^\d{2}-\d{5}$/.test(registrant.schoolID);
    const isFacultyId = /^F00/.test(registrant.schoolID);
    const isAdminId = /^A00/.test(registrant.schoolID);
    if (!(isStudentId || isFacultyId || isAdminId)) {
      return res.status(400).json({ message: 'Registrant has an invalid or missing School ID.' });
    }
    if (!/^\d{11}$/.test(registrant.contactNo || '')) {
      return res.status(400).json({ message: 'Registrant has an invalid contact number.' });
    }

    const clean = (str) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const schoolEmail = `${clean(registrant.firstName)}.${clean(registrant.lastName)}@students.sjddef.edu.ph`;
    const tempPassword = 'changeme123';

    const user = new User({
      firstname: registrant.firstName,
      middlename: registrant.middleName,
      lastname: registrant.lastName,
      personalemail: registrant.personalEmail,
      email: schoolEmail,
      contactNo: registrant.contactNo,
      schoolID: registrant.schoolID,
      password: tempPassword,
      role: 'students',
    });
    try {
      await user.save();
    } catch (saveErr) {
      console.error('Validation error creating user:', saveErr);
      return res.status(400).json({ message: saveErr.message || 'Failed to create user.' });
    }
    registrant.status = 'approved';
    registrant.processedAt = new Date();
    registrant.processedBy = req.body && req.body.adminId ? req.body.adminId : null;
    await registrant.save();

    if (hasEmailConfig) {
      try {
        await sendEmail({
          toEmail: registrant.personalEmail,
          toName: `${registrant.firstName} ${registrant.lastName}`,
          subject: 'Admission Offer - Welcome to San Juan De Dios Educational Foundation Inc',
          textContent:
`Dear ${registrant.firstName} ${registrant.lastName},\n\nCongratulations! You have been accepted.\n\n- School Email: ${schoolEmail}\n- Temporary Password: ${tempPassword}\n\nPlease log in to the portal.\n\nWarm regards,\nAdmissions Office`
        });
        console.log('Acceptance email sent to', registrant.personalEmail);
      } catch (emailErr) {
        console.error('Error sending acceptance email:', emailErr);
      }
    }
    res.json({ message: 'Registrant approved and user created.' });
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
      console.warn('BREVO_API_KEY is not set.');
    }
    const { note } = req.body;
    const registrant = await Registrant.findById(req.params.id);
    if (!registrant) return res.status(404).json({ message: 'Registrant not found' });
    if (registrant.status !== 'pending') return res.status(400).json({ message: 'Already processed' });

    const rejectionEntry = {
      date: new Date(),
      note: note || 'Application requirements not met',
      processedBy: req.body.adminId || null
    };

    if (!registrant.rejectionHistory) {
      registrant.rejectionHistory = [];
    }

    registrant.rejectionHistory.push(rejectionEntry);
    registrant.status = 'rejected';
    registrant.rejectionNote = note || 'Application requirements not met';
    registrant.processedAt = new Date();
    registrant.processedBy = req.body.adminId || null;

    await registrant.save();

    if (hasEmailConfig) {
      try {
        let defaultClient = SibApiV3Sdk.ApiClient.instance;
        let apiKey = defaultClient.authentications['api-key'];
        apiKey.apiKey = process.env.BREVO_API_KEY;
        let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
        let applicantName = `${registrant.firstName} ${registrant.lastName}`;
        let sendSmtpEmail = {
          to: [{ email: registrant.personalEmail, name: applicantName }],
          sender: { 
            email: process.env.EMAIL_SENDER_ADDRESS, 
            name: process.env.EMAIL_SENDER_NAME 
          },
          replyTo: {
            email: process.env.EMAIL_REPLYTO || process.env.EMAIL_SENDER_ADDRESS
          },
          subject: 'Admission Decision',
          textContent:
`Dear ${applicantName},\n\nThank you for your interest. Unfortunately, we are unable to offer admission.\n\n${registrant.rejectionNote ? `Reason: ${registrant.rejectionNote}\n\n` : ''}Please contact the Registrar's Office for clarification.\n\nSincerely,\nAdmissions Office`
        };
        await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log('Rejection email sent to', registrant.personalEmail);
      } catch (emailErr) {
        console.error('Error sending rejection email:', emailErr);
      }
    }
    res.json({ message: 'Registrant rejected.' });
  } catch (err) {
    console.error('Server error in reject endpoint:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/registrants/export
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const { date, status } = req.query;
    let filter = {};
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      filter.registrationDate = { $gte: startDate, $lt: endDate };
    }
    if (status && status !== 'all') filter.status = status;

    const registrants = await Registrant.find(filter).sort({ registrationDate: -1 });
    const count = registrants.length;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-CA');
    const timeStr = now.toLocaleTimeString();

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Registrants');

    worksheet.addRow([`Registrants Report`,`Generated on: ${dateStr} at ${timeStr}`,`Total Records: ${count}`]);
    let filterInfo = 'Filters: ';
    if (date) filterInfo += `Date: ${date} `;
    if (status && status !== 'all') filterInfo += `Status: ${status}`;
    if (filterInfo === 'Filters: ') filterInfo += 'All records';
    worksheet.addRow([filterInfo]);
    worksheet.addRow(['']);

    worksheet.addRow(['School ID','First Name','Middle Name','Last Name','Personal Email','Contact Number','Registration Date','Status','Rejection Note']);

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

    worksheet.getRow(1).font = { bold: true, size: 14 };
    worksheet.getRow(2).font = { bold: true, size: 12 };
    worksheet.getRow(3).font = { bold: true, size: 12 };
    worksheet.getRow(4).font = { bold: true, size: 12 };

    worksheet.columns.forEach((col, index) => {
      if (index === 0) col.width = 15;
      else if (index === 4) col.width = 30;
      else if (index === 5) col.width = 15;
      else if (index === 6) col.width = 15;
      else if (index === 8) col.width = 25;
      else col.width = 18;
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Registrants_${dateStr}_${timeStr.replace(/:/g, '-')}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Server error in export endpoint:', err);
    res.status(500).json({ message: 'Failed to export registrants', error: err.message });
  }
});

// Test email endpoint
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
      to: [{ email: to, name: 'Test Recipient' }],
      sender: {
        email: process.env.EMAIL_SENDER_ADDRESS,
        name: process.env.EMAIL_SENDER_NAME
      },
      replyTo: {
        email: process.env.EMAIL_REPLYTO || process.env.EMAIL_SENDER_ADDRESS
      },
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

export default router;