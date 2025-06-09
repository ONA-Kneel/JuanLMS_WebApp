import express from 'express';
import Ticket from '../models/Ticket.js';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';
import { encrypt, decrypt } from '../utils/encryption.js';
import fs from 'fs';

const ticketsRouter = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

function generateTicketNumber() {
  let num = '';
  for (let i = 0; i < 12; i++) {
    num += Math.floor(Math.random() * 10);
  }
  return `SJDD${num}`;
}

// Create a new ticket
// POST /api/tickets
// Body: { userId, subject, description, file }
ticketsRouter.post('/', upload.single('file'), async (req, res) => {
  const { userId, subject, description } = req.body;
  const now = new Date();
  let fileUrl = req.file ? req.file.filename : null;

  // Encrypt the uploaded file if present
  if (req.file) {
    const filePath = path.join('uploads', req.file.filename);
    const fileBuffer = fs.readFileSync(filePath);
    const encrypted = encrypt(fileBuffer.toString('base64'));
    fs.writeFileSync(filePath, encrypted, 'utf8');
  }

  const ticket = new Ticket({
    userId,
    subject,
    description,
    number: generateTicketNumber(),
    status: 'new',
    createdAt: now,
    updatedAt: now,
    file: fileUrl,
    messages: [{
      sender: 'user',
      senderId: userId,
      message: description,
      timestamp: now
    }]
  });
  try {
    await ticket.save();
    const decryptedTicket = ticket.decryptSensitiveData();
    console.log('[TICKET CREATED]', decryptedTicket);
    console.log('[MONGOOSE CONNECTION]', Ticket.db.name);
    res.status(201).json(decryptedTicket);
  } catch (err) {
    console.error('[TICKET ERROR]', err);
    res.status(500).json({ error: 'Failed to save ticket' });
  }
});

// Endpoint to download and decrypt the file by ticketId
ticketsRouter.get('/file/:ticketId', async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    const decryptedTicket = ticket.decryptSensitiveData();
    if (!decryptedTicket.file) return res.status(404).json({ error: 'No file attached' });
    const filePath = path.join('uploads', decryptedTicket.file);
    const encrypted = fs.readFileSync(filePath, 'utf8');
    const decryptedBase64 = decrypt(encrypted);
    const fileBuffer = Buffer.from(decryptedBase64, 'base64');
    res.setHeader('Content-Disposition', `attachment; filename=file`);
    res.send(fileBuffer);
  } catch (err) {
    res.status(404).json({ error: 'File not found or decryption failed' });
  }
});

// Get all tickets for a user
// GET /api/tickets/user/:userId
ticketsRouter.get('/user/:userId', async (req, res) => {
  const encryptedUserId = encrypt(req.params.userId);
  const tickets = await Ticket.find({ userId: encryptedUserId });
  const decryptedTickets = tickets.map(ticket => ticket.decryptSensitiveData());
  res.json(decryptedTickets);
});

// Reply to a ticket (user or admin)
// POST /api/tickets/:ticketId/reply
// Body: { sender, senderId, message }
ticketsRouter.post('/:ticketId/reply', async (req, res) => {
  const { sender, senderId, message } = req.body;
  const now = new Date();
  const ticket = await Ticket.findByIdAndUpdate(
    req.params.ticketId,
    {
      $push: { messages: { sender, senderId, message, timestamp: now } },
      $set: { updatedAt: now }
    },
    { new: true }
  );
  const decryptedTicket = ticket.decryptSensitiveData();
  res.json(decryptedTicket);
});

// Get all tickets (admin, with optional status filter)
// GET /api/tickets?status=new|opened|closed
ticketsRouter.get('/', async (req, res) => {
  const { status } = req.query;
  const VALID_STATUSES = ['new', 'opened', 'closed'];
  let query = {};
  if (status && VALID_STATUSES.includes(status)) {
    query.status = status;
  }
  const tickets = await Ticket.find(query);
  const decryptedTickets = tickets.map(ticket => ticket.decryptSensitiveData());
  res.json(decryptedTickets);
});

// Mark ticket as opened (admin)
// POST /api/tickets/:ticketId/open
ticketsRouter.post('/:ticketId/open', async (req, res) => {
  const now = new Date();
  const ticket = await Ticket.findByIdAndUpdate(
    req.params.ticketId,
    { $set: { status: 'opened', updatedAt: now } },
    { new: true }
  );
  res.json(ticket);
});

// Mark ticket as closed (admin)
// POST /api/tickets/:ticketId/close
ticketsRouter.post('/:ticketId/close', async (req, res) => {
  const now = new Date();
  const ticket = await Ticket.findByIdAndUpdate(
    req.params.ticketId,
    { $set: { status: 'closed', updatedAt: now } },
    { new: true }
  );
  res.json(ticket);
});

// GET /api/tickets/number/:number
// Fetch a ticket by its number
ticketsRouter.get('/number/:number', async (req, res) => {
  const encryptedNumber = encrypt(req.params.number);
  const ticket = await Ticket.findOne({ number: encryptedNumber });
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  const decryptedTicket = ticket.decryptSensitiveData();
  res.json(decryptedTicket);
});

export default ticketsRouter; 