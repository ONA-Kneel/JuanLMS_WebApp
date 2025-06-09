import mongoose from 'mongoose';
import { encrypt, decrypt } from '../utils/encryption.js';

const messageSchema = new mongoose.Schema({
  sender: String,
  senderId: String,
  message: String,
  timestamp: Date
}, { _id: false });

const ticketSchema = new mongoose.Schema({
  userId: String,
  subject: String,
  description: String,
  number: String,
  status: String,
  createdAt: Date,
  updatedAt: Date,
  file: String,
  messages: [messageSchema]
}, { collection: 'Tickets' });

// Pre-save middleware to encrypt sensitive data
ticketSchema.pre('save', function(next) {
  if (this.isModified('userId')) {
    this.userId = encrypt(this.userId);
  }
  if (this.isModified('number')) {
    this.number = encrypt(this.number);
  }
  if (this.isModified('description')) {
    this.description = encrypt(this.description);
  }
  if (this.isModified('file') && this.file) {
    this.file = encrypt(this.file);
  }
  if (this.isModified('messages')) {
    this.messages = this.messages.map(msg => ({
      ...msg,
      senderId: encrypt(msg.senderId),
      message: encrypt(msg.message)
    }));
  }
  next();
});

// Method to decrypt sensitive data
ticketSchema.methods.decryptSensitiveData = function() {
  const ticket = this.toObject();
  ticket.userId = decrypt(ticket.userId);
  ticket.number = decrypt(ticket.number);
  ticket.description = decrypt(ticket.description);
  if (ticket.file) ticket.file = decrypt(ticket.file);
  ticket.messages = ticket.messages.map(msg => ({
    ...msg,
    senderId: decrypt(msg.senderId),
    message: decrypt(msg.message)
  }));
  return ticket;
};

const Ticket = mongoose.model('Ticket', ticketSchema);
export default Ticket; 