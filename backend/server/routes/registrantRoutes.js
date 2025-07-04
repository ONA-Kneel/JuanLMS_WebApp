import express from 'express';
import Registrant from '../models/Registrant.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import SibApiV3Sdk from 'sib-api-v3-sdk';
import exceljs from 'exceljs';
import { sendEmail } from '../utils/emailUtil.js';
// import nodemailer from 'nodemailer'; // For real email sending
// import exceljs from 'exceljs'; // For real Excel export

const router = express.Router();

// POST /api/registrants/register
router.post('/register', async (req, res) => {
  try {
    const { firstName, middleName, lastName, personalEmail, contactNo } = req.body;
    if (!firstName || !lastName || !personalEmail || !contactNo) {
      return res.status(400).json({ message: 'Please fill in all required fields.' });
    }
    // Validate contactNo: must be 11 digits and only numbers
    if (!/^\d{11}$/.test(contactNo)) {
      return res.status(400).json({ message: 'Contact number must be exactly 11 digits and contain only numbers.' });
    }
    // Check for duplicate personalEmail
    const existing = await Registrant.findOne({ personalEmail });
    if (existing) {
      return res.status(409).json({ message: 'A registration with this email already exists.' });
    }
    const registrant = new Registrant({
      firstName,
      middleName,
      lastName,
      personalEmail,
      contactNo,
    });
    await registrant.save();
    res.status(201).json({ message: 'Registration successful.' });
  } catch (err) {
    console.error('Server error in register endpoint:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/registrants?date=YYYY-MM-DD&status=pending
router.get('/', async (req, res) => {
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
router.post('/:id/approve', async (req, res) => {
  try {
    if (!process.env.BREVO_API_KEY) {
      console.error('BREVO_API_KEY is not set. Please set it in your environment.');
      return res.status(500).json({ message: 'Email system not configured. Contact admin.' });
    }
    const registrant = await Registrant.findById(req.params.id);
    if (!registrant) return res.status(404).json({ message: 'Registrant not found' });
    if (registrant.status !== 'pending') return res.status(400).json({ message: 'Already processed' });
    // Create user (stub, add more fields as needed)
    const tempPassword = 'changeme123';
    const user = new User({
      firstname: registrant.firstName,
      middlename: registrant.middleName,
      lastname: registrant.lastName,
      personalemail: registrant.personalEmail,
      email: registrant.personalEmail, // or generate school email
      contactNo: registrant.contactNo,
      password: tempPassword, // Generate/send real password in production
      role: 'students',
    });
    await user.save();
    registrant.status = 'approved';
    registrant.processedAt = new Date();
    registrant.processedBy = req.body && req.body.adminId ? req.body.adminId : null;
    await registrant.save();
    // Send acceptance email via Brevo using utility
    try {
      await sendEmail({
        toEmail: registrant.personalEmail,
        toName: `${registrant.firstName} ${registrant.lastName}`,
        subject: 'Admission Offer - Welcome to San Juan De Dios Educational Foundation Inc',
        textContent:
`Dear ${registrant.firstName} ${registrant.lastName},\n\nCongratulations! We are pleased to inform you that you have been accepted into our academic institution for the upcoming academic year. Your application demonstrated outstanding qualifications and potential, and we are excited to welcome you into our community.\n\nAs part of your enrollment, your official school credentials have been generated:\n\n- School Email: ${registrant.personalEmail}\n- Temporary Password: ${tempPassword}\n\nPlease use these credentials to log in to the student portal and complete your onboarding tasks.\n\nWe look forward to seeing the great things you will accomplish here.\n\nWarm regards,\nAdmissions Office`
      });
      console.log('Acceptance email sent to', registrant.personalEmail);
    } catch (emailErr) {
      console.error('Error sending acceptance email via Brevo:', emailErr);
      // Rollback: set registrant back to pending and delete user
      registrant.status = 'pending';
      registrant.processedAt = null;
      registrant.processedBy = null;
      await registrant.save();
      await User.deleteOne({ _id: user._id });
      return res.status(500).json({ message: 'Failed to send acceptance email. Approval not completed.' });
    }
    res.json({ message: 'Registrant approved and user created.' });
  } catch (err) {
    console.error('Server error in approve endpoint:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/registrants/:id/reject
router.post('/:id/reject', async (req, res) => {
  try {
    if (!process.env.BREVO_API_KEY) {
      console.error('BREVO_API_KEY is not set. Please set it in your environment.');
      return res.status(500).json({ message: 'Email system not configured. Contact admin.' });
    }
    const { note } = req.body;
    const registrant = await Registrant.findById(req.params.id);
    if (!registrant) return res.status(404).json({ message: 'Registrant not found' });
    if (registrant.status !== 'pending') return res.status(400).json({ message: 'Already processed' });
    registrant.status = 'rejected';
    registrant.note = note || 'incomplete credentials';
    registrant.processedAt = new Date();
    registrant.processedBy = req.body.adminId || null;
    await registrant.save();
    // Send rejection email via Brevo
    try {
      let defaultClient = SibApiV3Sdk.ApiClient.instance;
      let apiKey = defaultClient.authentications['api-key'];
      apiKey.apiKey = process.env.BREVO_API_KEY;
      let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
      let applicantName = `${registrant.firstName} ${registrant.lastName}`;
      let sendSmtpEmail = {
        to: [{ email: registrant.personalEmail, name: applicantName }],
        sender: { email: 'nicolettecborre@gmail.com', name: 'JuanLMS Support' },
        subject: 'Admission Decision',
        textContent:
`Dear ${applicantName},\n\nThank you for your interest in joining our academic institution. After careful consideration of your application, we regret to inform you that we are unable to offer you admission at this time.\n\n${registrant.note}\n\nIf you would like clarification regarding this decision or would like to discuss alternative pathways, we encourage you to contact the Registrar's Office at your convenience.\n\nWe appreciate the effort you put into your application and wish you success in your academic journey.\n\nSincerely,\nAdmissions Office`
      };
      await apiInstance.sendTransacEmail(sendSmtpEmail);
    } catch (emailErr) {
      console.error('Error sending rejection email via Brevo:', emailErr);
    }
    res.json({ message: 'Registrant rejected.' });
  } catch (err) {
    console.error('Server error in reject endpoint:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/registrants/export?date=YYYY-MM-DD
router.get('/export', async (req, res) => {
  try {
    const { date, status } = req.query;
    let filter = {};
    if (date) filter.registrationDate = date;
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
      `No of registrant: ${count}`,
      `Registrants as of (${dateStr}) (${timeStr})`, '', '', '', ''
    ]);
    worksheet.addRow([
      'First Name', 'Middle Name', 'Last Name', 'Personal email', 'Contact number'
    ]);

    // Data rows
    registrants.forEach((r) => {
      worksheet.addRow([
        r.firstName || '',
        r.middleName || '',
        r.lastName || '',
        r.personalEmail || '',
        r.contactNo || ''
      ]);
    });

    // Style header
    worksheet.getRow(1).font = { bold: true, size: 13 };
    worksheet.getRow(2).font = { bold: true, size: 12 };
    worksheet.columns.forEach(col => { col.width = 22; });
    worksheet.getRow(2).alignment = { horizontal: 'center' };

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Registrants of ${dateStr}.xlsx`);

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
      to: [{ email: to }],
      sender: { email: 'nicolettecborre@gmail.com', name: 'JuanLMS Support' },
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