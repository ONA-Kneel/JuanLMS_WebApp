import express from 'express';
import Ticket from '../models/Ticket.js';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';

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
  const fileUrl = req.file ? req.file.filename : null;
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
    console.log('[TICKET CREATED]', ticket);
    console.log('[MONGOOSE CONNECTION]', Ticket.db.name);
    res.status(201).json(ticket);
  } catch (err) {
    console.error('[TICKET ERROR]', err);
    res.status(500).json({ error: 'Failed to save ticket' });
  }
});

// Get all tickets for a user
// GET /api/tickets/user/:userId
ticketsRouter.get('/user/:userId', async (req, res) => {
  const tickets = await Ticket.find({ userId: req.params.userId });
  res.json(tickets);
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
  res.json(ticket);
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
  res.json(tickets);
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
  const ticket = await Ticket.findOne({ number: req.params.number });
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  res.json(ticket);
});

export default ticketsRouter; 