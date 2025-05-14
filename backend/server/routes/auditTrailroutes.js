const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Get all audit logs (admin only)
router.get('/audit-logs', auth, adminAuth, async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .sort({ timestamp: -1 })
      .limit(1000); // Limit to last 1000 logs for performance
    res.json(logs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create audit log (internal use only)
router.post('/audit-log', auth, async (req, res) => {
  try {
    const { action, details } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    const newLog = new AuditLog({
      userId: req.user._id,
      userName: `${req.user.firstname} ${req.user.lastname}`,
      action,
      details,
      ipAddress
    });

    await newLog.save();
    res.status(201).json(newLog);
  } catch (error) {
    console.error('Error creating audit log:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 