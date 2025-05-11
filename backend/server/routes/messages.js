import express from 'express';
import Message from '../models/Message.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const { senderId, receiverId, message } = req.body;
  const newMessage = new Message({ senderId, receiverId, message });
  await newMessage.save();
  res.status(201).json(newMessage);
});

router.get('/:userId/:chatWithId', async (req, res) => {
  const { userId, chatWithId } = req.params;
  try {
    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: chatWithId },
        { senderId: chatWithId, receiverId: userId },
      ]
    }).sort({ timestamp: 1 });

    res.json(messages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: "Server error fetching messages" });
  }
});


export default router;