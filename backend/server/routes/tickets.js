import express from 'express';
import Ticket from '../models/Ticket.js';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';
import { encrypt, decrypt } from '../utils/encryption.js';
import fs from 'fs';
import { authenticateToken } from '../middleware/authMiddleware.js';

const ticketsRouter = express.Router();

// Ensure uploads directory exists
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
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
ticketsRouter.post('/', authenticateToken, upload.single('file'), async (req, res) => {
  const { userId, subject, description } = req.body;
  const now = new Date();
  let fileUrl = req.file ? req.file.filename : null;

  // Validate that the authenticated user matches the userId in the request
  // Check both _id and userID fields from the JWT token
  const authenticatedUserIds = [req.user._id, req.user.userID].filter(Boolean);
  
  if (!authenticatedUserIds.includes(userId)) {
    return res.status(403).json({ error: 'Unauthorized: User ID mismatch' });
  }

  // Validate required fields
  if (!subject || !description) {
    return res.status(400).json({ error: 'Subject and description are required' });
  }

  // Encrypt the uploaded file if present
  if (req.file) {
    try {
      const filePath = path.join(uploadDir, req.file.filename);
      const fileBuffer = fs.readFileSync(filePath);
      const encrypted = encrypt(fileBuffer.toString('base64'));
      fs.writeFileSync(filePath, encrypted, 'utf8');
    } catch (fileError) {
      console.error('[FILE ENCRYPTION ERROR]', fileError);
      return res.status(500).json({ error: 'Failed to process uploaded file' });
    }
  }

  const ticket = new Ticket({
    userId,
    subject,
    description,
    number: req.body.number || generateTicketNumber(), // Use provided number or generate one
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
    res.status(201).json(decryptedTicket);
  } catch (err) {
    console.error('[TICKET ERROR]', err);
    res.status(500).json({ error: 'Failed to save ticket' });
  }
});

// Endpoint to download and decrypt the file by ticketId
ticketsRouter.get('/file/:ticketId', authenticateToken, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    const decryptedTicket = ticket.decryptSensitiveData();
    if (!decryptedTicket.file) return res.status(404).json({ error: 'No file attached' });
    const filePath = path.join(uploadDir, decryptedTicket.file);
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
ticketsRouter.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    // userId is no longer encrypted in the database
    const userId = req.params.userId;
    
    const tickets = await Ticket.find({ userId: userId });
    
    const decryptedTickets = tickets.map(ticket => ticket.decryptSensitiveData());
    res.json(decryptedTickets);
  } catch (err) {
    console.error('[GET USER TICKETS ERROR]', err);
    res.status(500).json({ error: 'Failed to fetch user tickets' });
  }
});

// Reply to a ticket (user or admin)
// POST /api/tickets/:ticketId/reply
// Body: { sender, senderId, message }
ticketsRouter.post('/:ticketId/reply', authenticateToken, async (req, res) => {
  try {
    console.log('[REPLY TO TICKET] Request from user:', req.user._id);
    console.log('[REPLY TO TICKET] Ticket ID:', req.params.ticketId);
    console.log('[REPLY TO TICKET] Body:', req.body);
    
    const { sender, senderId, message } = req.body;
    
    if (!sender || !senderId || !message) {
      return res.status(400).json({ error: 'Sender, senderId, and message are required' });
    }

    // Block replies to closed tickets
    const current = await Ticket.findById(req.params.ticketId);
    if (!current) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    if (current.status === 'closed') {
      return res.status(403).json({ error: 'This ticket is closed and cannot receive new replies.' });
    }
    
    const now = new Date();
    
    // Prepare update object
    const updateObj = {
      $push: { messages: { sender, senderId, message, timestamp: now } },
      $set: { updatedAt: now }
    };
    
    const ticket = await Ticket.findByIdAndUpdate(
      req.params.ticketId,
      updateObj,
      { new: true }
    );
    
    const decryptedTicket = ticket.decryptSensitiveData();
    console.log('[REPLY TO TICKET] Success - Updated ticket:', decryptedTicket._id);
    res.json(decryptedTicket);
  } catch (err) {
    console.error('[REPLY TO TICKET ERROR]', err);
    res.status(500).json({ error: 'Failed to reply to ticket' });
  }
});

// Get all tickets (admin, with optional status filter)
// GET /api/tickets?status=new|opened|closed
ticketsRouter.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('[GET ALL TICKETS] Request from user:', req.user._id);
    const { status } = req.query;
    const VALID_STATUSES = ['new', 'opened', 'closed'];
    let query = {};
    if (status && VALID_STATUSES.includes(status)) {
      query.status = status;
    }
    console.log('[GET ALL TICKETS] Query:', query);
    
    const tickets = await Ticket.find(query);
    console.log('[GET ALL TICKETS] Found tickets:', tickets.length);
    
    const decryptedTickets = [];
    for (const ticket of tickets) {
      try {
        const decryptedTicket = ticket.decryptSensitiveData();
        decryptedTickets.push(decryptedTicket);
      } catch (decryptError) {
        console.error('[GET ALL TICKETS] Decryption error for ticket:', ticket._id, decryptError);
        // Skip tickets that can't be decrypted
        continue;
      }
    }
    
    console.log('[GET ALL TICKETS] Returning decrypted tickets:', decryptedTickets.length);
    res.json(decryptedTickets);
  } catch (err) {
    console.error('[GET ALL TICKETS ERROR]', err);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// Mark ticket as opened (admin)
// POST /api/tickets/:ticketId/open
ticketsRouter.post('/:ticketId/open', authenticateToken, async (req, res) => {
  try {
    console.log('[OPEN TICKET] Request from user:', req.user._id);
    console.log('[OPEN TICKET] Ticket ID:', req.params.ticketId);
    
    // First, get the current ticket to check its status
    const currentTicket = await Ticket.findById(req.params.ticketId);
    if (!currentTicket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    // Decrypt the current ticket to check its actual status
    const decryptedCurrentTicket = currentTicket.decryptSensitiveData();
    console.log('[OPEN TICKET] Current ticket status:', decryptedCurrentTicket.status);
    
    // Only update status if it's currently 'new'
    if (decryptedCurrentTicket.status !== 'new') {
      console.log('[OPEN TICKET] Ticket is already opened/closed, no status update needed');
      const decryptedTicket = currentTicket.decryptSensitiveData();
      return res.json(decryptedTicket);
    }
    
    const now = new Date();
    const ticket = await Ticket.findByIdAndUpdate(
      req.params.ticketId,
      { $set: { status: 'opened', updatedAt: now } },
      { new: true }
    );
    
    const decryptedTicket = ticket.decryptSensitiveData();
    console.log('[OPEN TICKET] Success - Updated ticket status from new to opened:', decryptedTicket._id);
    res.json(decryptedTicket);
  } catch (err) {
    console.error('[OPEN TICKET ERROR]', err);
    res.status(500).json({ error: 'Failed to open ticket' });
  }
});

// Mark ticket as closed (admin)
// POST /api/tickets/:ticketId/close
ticketsRouter.post('/:ticketId/close', authenticateToken, async (req, res) => {
  try {
    console.log('[CLOSE TICKET] Request from user:', req.user._id);
    console.log('[CLOSE TICKET] Ticket ID:', req.params.ticketId);
    
    const now = new Date();
    const ticket = await Ticket.findByIdAndUpdate(
      req.params.ticketId,
      { $set: { status: 'closed', updatedAt: now } },
      { new: true }
    );
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    const decryptedTicket = ticket.decryptSensitiveData();
    console.log('[CLOSE TICKET] Success - Updated ticket:', decryptedTicket._id);
    res.json(decryptedTicket);
  } catch (err) {
    console.error('[CLOSE TICKET ERROR]', err);
    res.status(500).json({ error: 'Failed to close ticket' });
  }
});

// GET /api/tickets/number/:number
// Fetch a ticket by its number
ticketsRouter.get('/number/:number', authenticateToken, async (req, res) => {
  const encryptedNumber = encrypt(req.params.number);
  const ticket = await Ticket.findOne({ number: encryptedNumber });
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  const decryptedTicket = ticket.decryptSensitiveData();
  res.json(decryptedTicket);
});

export default ticketsRouter; 