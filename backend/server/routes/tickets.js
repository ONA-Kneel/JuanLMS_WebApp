import express from 'express';
import Ticket from '../models/Ticket.js';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';
import { encrypt, decrypt } from '../utils/encryption.js';
import fs from 'fs';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ticketsRouter = express.Router();

// Initialize upload configuration
async function initializeStorage() {
  const USE_CLOUDINARY = process.env.CLOUDINARY_URL || (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
  
  if (USE_CLOUDINARY) {
    console.log('[TICKETS] Cloudinary credentials found, attempting to use cloud storage');
    try {
      const cloudinaryConfig = await import('../config/cloudinary.js');
      return multer({ storage: cloudinaryConfig.ticketStorage });
    } catch (error) {
      console.error('[TICKETS] Cloudinary setup failed, falling back to local storage:', error.message);
    }
  }
  
  // Local storage fallback
  console.log('[TICKETS] Using local storage');
  const uploadDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  const localStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
  });
  return multer({ storage: localStorage });
}

// Initialize upload middleware
const upload = await initializeStorage();

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
  
  // Handle file URL based on storage type
  let fileUrl = null;
  if (req.file) {
    // Cloudinary provides secure_url, local storage uses filename
    fileUrl = req.file.secure_url || req.file.path || req.file.filename;
  }

  // Validate that the authenticated user matches the userId in the request
  const authenticatedUserIds = [req.user._id, req.user.userID].filter(Boolean);
  if (!authenticatedUserIds.includes(userId)) {
    return res.status(403).json({ error: 'Unauthorized: User ID mismatch' });
  }

  // Validate required fields
  if (!subject || !description) {
    return res.status(400).json({ error: 'Subject and description are required' });
  }

  // Only encrypt files for local storage (not needed for Cloudinary)
  const USE_CLOUDINARY = process.env.CLOUDINARY_URL || (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
  if (req.file && !USE_CLOUDINARY) {
    try {
      const uploadDir = path.join(__dirname, '..', 'uploads');
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
    number: req.body.number || generateTicketNumber(),
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

/* -------------------------------------------------------------------------- */
/*            PATCHED: download/preview ticket attachment by ticketId         */
/* -------------------------------------------------------------------------- */
// GET /api/tickets/file/:ticketId
ticketsRouter.get('/file/:ticketId', authenticateToken, async (req, res) => {
  try {
    const ticketId = req.params.ticketId;
    const t = await Ticket.findById(ticketId);
    if (!t) return res.status(404).json({ error: 'Ticket not found' });

    // Decrypt ONLY the file field safely (not the whole document)
    let filenameCipher = t.file;
    if (!filenameCipher) return res.status(404).json({ error: 'No file attached' });

    let filename;
    try {
      filename = decrypt(filenameCipher);
    } catch {
      // already plain in legacy data
      filename = filenameCipher;
    }
    filename = (filename || '').toString().trim().replace(/^"+|"+$/g, '');

    // Check if it's a Cloudinary URL (starts with https://res.cloudinary.com)
    if (filename.startsWith('https://res.cloudinary.com')) {
      // For Cloudinary URLs, redirect to the direct URL
      return res.redirect(filename);
    }

    // Local file handling (for backward compatibility and development)
    const uploadDir = path.join(__dirname, '..', 'uploads');
    const normalized = path.normalize(filename);
    const candidates = [];

    // Primary location: use the same uploadDir as configured for multer
    candidates.push(path.join(uploadDir, normalized));
    candidates.push(path.join(uploadDir, path.basename(normalized)));

    // Check common subdirectories
    const subdirs = ['quiz-images', 'lessons', 'messages', 'submissions'];
    for (const subdir of subdirs) {
      candidates.push(path.join(uploadDir, subdir, normalized));
      candidates.push(path.join(uploadDir, subdir, path.basename(normalized)));
    }

    // Legacy fallback locations (for backwards compatibility)
    const cwd = process.cwd();
    if (normalized.toLowerCase().includes('uploads')) {
      candidates.push(path.resolve(normalized));
      candidates.push(path.resolve(cwd, normalized));
    }
    candidates.push(path.resolve('uploads', normalized));
    candidates.push(path.resolve(cwd, 'uploads', normalized));
    candidates.push(path.resolve('uploads', path.basename(normalized)));
    candidates.push(path.resolve(cwd, 'uploads', path.basename(normalized)));

    let filePath = null;
    for (const p of candidates) {
      if (p && fs.existsSync(p)) { filePath = p; break; }
    }

    if (!filePath) {
      console.error('[TICKETS:file] File not found.', {
        ticketId,
        filenameFromDB: filename,
        uploadDir,
        tried: candidates
      });
      return res.status(404).json({ 
        error: 'File not found',
        debug: process.env.NODE_ENV === 'development' ? {
          filename,
          uploadDir,
          candidatesChecked: candidates.length
        } : undefined
      });
    }

    // Read and (if needed) decrypt the file contents
    let buffer;
    try {
      const encrypted = fs.readFileSync(filePath, 'utf8');
      const maybeBase64 = decrypt(encrypted);

      // quick base64 sanity-check
      const cleaned = (maybeBase64 || '').toString().replace(/[\r\n]/g, '');
      const looksBase64 = /^[A-Za-z0-9+/=]+$/.test(cleaned) && cleaned.length % 4 === 0;
      if (!looksBase64) throw new Error('not-base64');

      buffer = Buffer.from(cleaned, 'base64');
    } catch {
      // treat as raw binary
      buffer = fs.readFileSync(filePath);
    }

    // Infer content type for preview
    const lower = filename.toLowerCase();
    let contentType = 'application/octet-stream';
    if (lower.endsWith('.pdf')) contentType = 'application/pdf';
    else if (/\.(png)$/.test(lower)) contentType = 'image/png';
    else if (/\.(jpe?g|jfif|pjpeg|pjp)$/.test(lower)) contentType = 'image/jpeg';
    else if (/\.(gif)$/.test(lower)) contentType = 'image/gif';
    else if (/\.(webp)$/.test(lower)) contentType = 'image/webp';
    else if (/\.(svg|svgz)$/.test(lower)) contentType = 'image/svg+xml';
    else if (/\.(bmp)$/.test(lower)) contentType = 'image/bmp';
    else if (/\.(tiff?)$/.test(lower)) contentType = 'image/tiff';
    else if (/\.(apng)$/.test(lower)) contentType = 'image/apng';
    else if (/\.(avif)$/.test(lower)) contentType = 'image/avif';
    else if (/\.(heic|heif)$/.test(lower)) contentType = 'image/heic';

    const downloadName = path.basename(filename);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(downloadName)}`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Type, Content-Length');
    return res.status(200).send(buffer);
  } catch (err) {
    console.error('[TICKETS:file] error:', err);
    return res.status(500).json({ error: 'File not found or decryption failed' });
  }
});

// Get all tickets for a user
// GET /api/tickets/user/:userId
ticketsRouter.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
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
    if (!current) return res.status(404).json({ error: 'Ticket not found' });
    if (current.status === 'closed') {
      return res.status(403).json({ error: 'This ticket is closed and cannot receive new replies.' });
    }
    
    const now = new Date();
    const updateObj = {
      $push: { messages: { sender, senderId, message, timestamp: now } },
      $set: { updatedAt: now }
    };
    
    const ticket = await Ticket.findByIdAndUpdate(req.params.ticketId, updateObj, { new: true });
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
    
    const currentTicket = await Ticket.findById(req.params.ticketId);
    if (!currentTicket) return res.status(404).json({ error: 'Ticket not found' });
    
    const decryptedCurrentTicket = currentTicket.decryptSensitiveData();
    console.log('[OPEN TICKET] Current ticket status:', decryptedCurrentTicket.status);
    
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
    
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    
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
