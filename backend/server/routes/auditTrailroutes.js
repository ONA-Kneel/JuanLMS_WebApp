import express from 'express';
import { Router } from 'express';
import { AuditLog } from '../models/AuditLog.js';

const router = Router();

// Get all audit logs (admin only)
router.get('/audit-logs', async (req, res) => {
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
router.post('/audit-log', async (req, res) => {
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

export default router; 