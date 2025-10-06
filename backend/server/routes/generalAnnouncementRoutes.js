import express from "express";
import GeneralAnnouncement from "../models/GeneralAnnouncement.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { getIO } from "../server.js";
import mongoose from "mongoose";

const router = express.Router();

// POST /api/general-announcements - Create a new general announcement
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { title, body, recipientRoles, termName, schoolYear } = req.body;
    const userId = req.user.id; // From auth middleware
    const userRole = req.user.role?.toLowerCase();

    // Validate required fields
    if (!title || !body || !recipientRoles || recipientRoles.length === 0 || !termName || !schoolYear) {
      return res.status(400).json({ 
        message: "Title, body, recipient roles, term name, and school year are required" 
      });
    }

    // Validate character limits
    if (title.length > 100) {
      return res.status(400).json({ 
        message: "Title cannot exceed 100 characters" 
      });
    }

    if (body.length > 2000) {
      return res.status(400).json({ 
        message: "Body cannot exceed 2000 characters" 
      });
    }

    // Filter out the creator's role so they don't receive their own announcement
    const filteredRecipientRoles = recipientRoles.filter(role => {
      // Normalize the creator's role for comparison
      let normalizedCreatorRole = userRole;
      if (userRole === 'student') normalizedCreatorRole = 'students';
      if (userRole === 'vpe' || userRole === 'vice president') normalizedCreatorRole = 'vice president of education';
      
      return role !== normalizedCreatorRole;
    });

    // Ensure at least one recipient remains after filtering
    if (filteredRecipientRoles.length === 0) {
      return res.status(400).json({ 
        message: "At least one recipient (other than yourself) is required" 
      });
    }

    // Create new announcement
    const announcement = new GeneralAnnouncement({
      title,
      body,
      recipientRoles: filteredRecipientRoles,
      termName,
      schoolYear,
      createdBy: userId
    });

    await announcement.save();

    // Create notifications for all users with the specified roles
    try {
      console.log(`[GENERAL-ANNOUNCEMENT] Creating notifications for roles: ${filteredRecipientRoles.join(', ')}`);
      
      // Get all users with the specified roles
      const users = await User.find({
        role: { $in: filteredRecipientRoles },
        status: { $ne: 'archived' }
      });

      console.log(`[GENERAL-ANNOUNCEMENT] Found ${users.length} users to notify`);

      // Create notifications for each user
      const notifications = [];
      for (const user of users) {
        const notification = new Notification({
          recipientId: user._id,
          type: 'general_announcement',
          title: `New General Announcement: ${title}`,
          message: `A new general announcement has been posted: "${title}"`,
          priority: 'high',
          relatedItemId: announcement._id,
          timestamp: new Date()
        });
        
        await notification.save();
        notifications.push(notification);
      }

      console.log(`[GENERAL-ANNOUNCEMENT] Created ${notifications.length} notifications`);

      // Emit real-time notifications to all users
      const io = getIO();
      if (io) {
        for (const notification of notifications) {
          io.to(`user_${notification.recipientId}`).emit('newNotification', {
            notification,
            timestamp: new Date().toISOString()
          });
        }
        console.log(`[GENERAL-ANNOUNCEMENT] Emitted real-time notifications to ${notifications.length} users`);
      }

    } catch (notificationError) {
      console.error('[GENERAL-ANNOUNCEMENT] Error creating notifications:', notificationError);
      // Don't fail the announcement creation if notifications fail
    }

    res.status(201).json({
      message: "Announcement created successfully",
      announcement
    });

  } catch (error) {
    console.error("Error creating announcement:", error);
    res.status(500).json({ 
      message: "Failed to create announcement",
      error: error.message 
    });
  }
});

// GET /api/general-announcements - Get announcements based on user role
router.get("/", authenticateToken, async (req, res) => {
  try {
    const userRole = req.user.role?.toLowerCase();
    const userId = req.user.id;
    
    if (!userRole) {
      return res.status(400).json({ message: "User role not found" });
    }

    // Normalize role for matching (similar to login logic)
    let normalizedRole = userRole;
    if (userRole === 'student') normalizedRole = 'students';
    if (userRole === 'vpe' || userRole === 'vice president') normalizedRole = 'vice president of education';

    // Find announcements that the user can see and haven't acknowledged yet
    const announcements = await GeneralAnnouncement.find({
      recipientRoles: { $in: [normalizedRole] },
      // Exclude announcements that the user has already acknowledged
      'announcementsViews.userId': { $ne: userId }
    })
    .populate('createdBy', 'firstname lastname role')
    .sort({ createdAt: -1 })
    .limit(1); // Only get the most recent announcement

    // Decrypt creator names
    const transformed = announcements.map(a => {
      const obj = a.toObject();
      if (a.createdBy) {
        obj.createdBy = {
          _id: a.createdBy._id,
          firstname: a.createdBy.getDecryptedFirstname ? a.createdBy.getDecryptedFirstname() : a.createdBy.firstname,
          lastname: a.createdBy.getDecryptedLastname ? a.createdBy.getDecryptedLastname() : a.createdBy.lastname,
          role: a.createdBy.role,
        };
      }
      return obj;
    });

    res.json(transformed);

  } catch (error) {
    console.error("Error fetching announcements:", error);
    res.status(500).json({ 
      message: "Failed to fetch announcements",
      error: error.message 
    });
  }
});

// POST /api/general-announcements/:id/acknowledge - Acknowledge an announcement
router.post("/:id/acknowledge", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role?.toLowerCase();

    console.log('Acknowledgment request:', { announcementId: id, userId, userRole });

    const announcement = await GeneralAnnouncement.findById(id);

    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    console.log('Current announcement views:', announcement.announcementsViews);

    // Normalize role for matching
    let normalizedRole = userRole;
    if (userRole === 'student') normalizedRole = 'students';
    if (userRole === 'vpe' || userRole === 'vice president') normalizedRole = 'vice president of education';

    // Check if user can see this announcement
    if (!announcement.recipientRoles.includes(normalizedRole)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Check if user has already acknowledged this announcement
    const alreadyAcknowledged = announcement.announcementsViews.some(
      view => view.userId.toString() === userId.toString()
    );

    console.log('Already acknowledged check:', { alreadyAcknowledged, userId, existingViews: announcement.announcementsViews.map(v => v.userId.toString()) });

    if (alreadyAcknowledged) {
      return res.status(400).json({ message: "Announcement already acknowledged" });
    }

    // Add user to announcementsViews array
    const newView = {
      userId: new mongoose.Types.ObjectId(userId),
      acknowledgedAt: new Date()
    };
    
    console.log('Adding new view:', newView);
    
    announcement.announcementsViews.push(newView);

    await announcement.save();

    console.log('Announcement saved with new views:', announcement.announcementsViews);

    res.json({
      message: "Announcement acknowledged successfully",
      acknowledgedAt: new Date()
    });

  } catch (error) {
    console.error("Error acknowledging announcement:", error);
    res.status(500).json({ 
      message: "Failed to acknowledge announcement",
      error: error.message 
    });
  }
});

// GET /api/general-announcements/count - Get count of announcements (for debugging)
router.get("/count", authenticateToken, async (req, res) => {
  try {
    const count = await GeneralAnnouncement.countDocuments({});
    res.json({ count });
  } catch (error) {
    console.error("Error counting announcements:", error);
    res.status(500).json({ 
      message: "Failed to count announcements",
      error: error.message 
    });
  }
});

// GET /api/general-announcements/acknowledged - Get announcements that the user has acknowledged
router.get("/acknowledged", authenticateToken, async (req, res) => {
  try {
    const userRole = req.user.role?.toLowerCase();
    const userId = req.user.id;
    
    if (!userRole) {
      return res.status(400).json({ message: "User role not found" });
    }

    // Normalize role for matching (similar to login logic)
    let normalizedRole = userRole;
    if (userRole === 'student') normalizedRole = 'students';
    if (userRole === 'vpe' || userRole === 'vice president') normalizedRole = 'vice president of education';

    // Find announcements that the user can see and has already acknowledged
    const announcements = await GeneralAnnouncement.find({
      recipientRoles: { $in: [normalizedRole] },
      // Only include announcements that the user has acknowledged
      'announcementsViews.userId': { $in: [userId] }
    })
    .populate('createdBy', 'firstname lastname role')
    .sort({ createdAt: -1 });

    // Decrypt creator names
    const transformed = announcements.map(a => {
      const obj = a.toObject();
      if (a.createdBy) {
        obj.createdBy = {
          _id: a.createdBy._id,
          firstname: a.createdBy.getDecryptedFirstname ? a.createdBy.getDecryptedFirstname() : a.createdBy.firstname,
          lastname: a.createdBy.getDecryptedLastname ? a.createdBy.getDecryptedLastname() : a.createdBy.lastname,
          role: a.createdBy.role,
        };
      }
      return obj;
    });

    res.json(transformed);

  } catch (error) {
    console.error("Error fetching acknowledged announcements:", error);
    res.status(500).json({ 
      message: "Failed to fetch acknowledged announcements",
      error: error.message 
    });
  }
});

// GET /api/general-announcements/all - Get all announcements (admin/principal/VPE only)
router.get("/all", authenticateToken, async (req, res) => {
  try {
    const userRole = req.user.role?.toLowerCase();
    
    // Only admin, principal, and VPE can see all announcements
    if (!['admin', 'principal', 'vice president of education'].includes(userRole)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const announcements = await GeneralAnnouncement.find({})
      .populate('createdBy', 'firstname lastname role')
      .sort({ createdAt: -1 });

    const transformed = announcements.map(a => {
      const obj = a.toObject();
      if (a.createdBy) {
        obj.createdBy = {
          _id: a.createdBy._id,
          firstname: a.createdBy.getDecryptedFirstname ? a.createdBy.getDecryptedFirstname() : a.createdBy.firstname,
          lastname: a.createdBy.getDecryptedLastname ? a.createdBy.getDecryptedLastname() : a.createdBy.lastname,
          role: a.createdBy.role,
        };
      }
      return obj;
    });

    res.json(transformed);

  } catch (error) {
    console.error("Error fetching all announcements:", error);
    res.status(500).json({ 
      message: "Failed to fetch announcements",
      error: error.message 
    });
  }
});

// GET /api/general-announcements/:id - Get specific announcement
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role?.toLowerCase();

    const announcement = await GeneralAnnouncement.findById(id)
      .populate('createdBy', 'firstname lastname role');

    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    // Normalize role for matching
    let normalizedRole = userRole;
    if (userRole === 'student') normalizedRole = 'students';
    if (userRole === 'vpe' || userRole === 'vice president') normalizedRole = 'vice president of education';

    // Check if user can see this announcement
    if (!announcement.recipientRoles.includes(normalizedRole) && 
        !['admin', 'principal'].includes(userRole)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const obj = announcement.toObject();
    if (announcement.createdBy) {
      obj.createdBy = {
        _id: announcement.createdBy._id,
        firstname: announcement.createdBy.getDecryptedFirstname ? announcement.createdBy.getDecryptedFirstname() : announcement.createdBy.firstname,
        lastname: announcement.createdBy.getDecryptedLastname ? announcement.createdBy.getDecryptedLastname() : announcement.createdBy.lastname,
        role: announcement.createdBy.role,
      };
    }

    res.json(obj);

  } catch (error) {
    console.error("Error fetching announcement:", error);
    res.status(500).json({ 
      message: "Failed to fetch announcement",
      error: error.message 
    });
  }
});

// PUT /api/general-announcements/:id - Update announcement (creator or admin/principal only)
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, body, recipientRoles, termName, schoolYear } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role?.toLowerCase();

    const announcement = await GeneralAnnouncement.findById(id);

    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    // Check permissions: creator or admin/principal
    if (announcement.createdBy.toString() !== userId && 
        !['admin', 'principal'].includes(userRole)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Validate character limits
    if (title && title.length > 100) {
      return res.status(400).json({ 
        message: "Title cannot exceed 100 characters" 
      });
    }

    if (body && body.length > 2000) {
      return res.status(400).json({ 
        message: "Body cannot exceed 2000 characters" 
      });
    }

    // Update fields
    if (title) announcement.title = title;
    if (body) announcement.body = body;
    if (recipientRoles) {
      // Filter out the creator's role when updating
      const filteredRecipientRoles = recipientRoles.filter(role => {
        let normalizedCreatorRole = userRole;
        if (userRole === 'student') normalizedCreatorRole = 'students';
        if (userRole === 'vpe' || userRole === 'vice president') normalizedCreatorRole = 'vice president of education';
        return role !== normalizedCreatorRole;
      });
      announcement.recipientRoles = filteredRecipientRoles;
    }
    if (termName) announcement.termName = termName;
    if (schoolYear) announcement.schoolYear = schoolYear;

    await announcement.save();

    res.json({
      message: "Announcement updated successfully",
      announcement
    });

  } catch (error) {
    console.error("Error updating announcement:", error);
    res.status(500).json({ 
      message: "Failed to update announcement",
      error: error.message 
    });
  }
});

// DELETE /api/general-announcements/:id - Delete announcement (creator or admin/principal only)
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role?.toLowerCase();

    const announcement = await GeneralAnnouncement.findById(id);

    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    // Check permissions: creator or admin/principal
    if (announcement.createdBy.toString() !== userId && 
        !['admin', 'principal'].includes(userRole)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Permanently delete the announcement
    await GeneralAnnouncement.findByIdAndDelete(id);

    res.json({ message: "Announcement deleted successfully" });

  } catch (error) {
    console.error("Error deleting announcement:", error);
    res.status(500).json({ 
      message: "Failed to delete announcement",
      error: error.message 
    });
  }
});

export default router;
