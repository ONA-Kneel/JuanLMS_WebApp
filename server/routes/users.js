import express from 'express';
import User from '../models/User.js';

const router = express.Router();

router.get('/search', async (req, res) => {
  const query = req.query.q;
  const users = await User.find({ name: new RegExp(query, 'i') });
  res.json(users);
});

export default router;