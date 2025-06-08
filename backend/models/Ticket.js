export const messageSchema = {
  sender: String,
  senderId: String,
  message: String,
  timestamp: Date
};

export const ticketSchema = {
  userId: String,
  subject: String,
  description: String,
  number: String,
  status: String,
  createdAt: Date,
  updatedAt: Date,
  messages: [messageSchema]
}; 