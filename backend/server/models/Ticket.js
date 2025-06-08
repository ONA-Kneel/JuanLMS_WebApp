import mongoose from 'mongoose';

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

const Ticket = mongoose.model('Ticket', ticketSchema);
export default Ticket; 