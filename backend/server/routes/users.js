//routes/users.js

import express from 'express';
import User from '../models/User.js';

const router = express.Router();

router.get('/search', async (req, res) => {
  const query = req.query.q;
  const users = await User.find({
    role: 'students',
    $or: [
      { firstname: new RegExp(query, 'i') },
      { middlename: new RegExp(query, 'i') },
      { lastname: new RegExp(query, 'i') }
    ]
  });
  if (users.length > 0) {
    res.json(users);
  } else {
    res.json({ message: 'No student found' });
  }
});


export default router;