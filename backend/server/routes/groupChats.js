// groupChats.js
// Handles group chat operations: create, join, leave, manage participants, etc.

import express from 'express';
import GroupChat from '../models/GroupChat.js';
import GroupMessage from '../models/GroupMessage.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// --- POST / - Create a new group chat ---
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, createdBy, participants } = req.body;
    
    if (!name || !createdBy || !participants || !Array.isArray(participants)) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (participants.length > 50) {
      return res.status(400).json({ error: "Group cannot have more than 50 participants" });
    }

    // Ensure creator is included in participants
    const allParticipants = participants.includes(createdBy) 
      ? participants 
      : [createdBy, ...participants];

    const newGroupChat = new GroupChat({
      name,
      description: description || "",
      createdBy,
      participants: allParticipants,
      admins: [createdBy], // Creator is automatically an admin
    });

    await newGroupChat.save();

    // Return decrypted group chat data
    res.status(201).json({
      _id: newGroupChat._id,
      name: newGroupChat.getDecryptedName(),
      description: newGroupChat.getDecryptedDescription(),
      createdBy: newGroupChat.getDecryptedCreatedBy(),
      participants: newGroupChat.getDecryptedParticipants(),
      admins: newGroupChat.getDecryptedAdmins(),
      isActive: newGroupChat.isActive,
      maxParticipants: newGroupChat.maxParticipants,
      createdAt: newGroupChat.createdAt,
      updatedAt: newGroupChat.updatedAt,
    });
  } catch (err) {
    console.error("Error creating group chat:", err);
    res.status(500).json({ error: "Server error creating group chat" });
  }
});

// --- GET / - Get all group chats for a user ---
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const groupChats = await GroupChat.find({ isActive: true });
    
    // Filter groups where user is a participant
    const userGroups = groupChats.filter(group => {
      const decryptedParticipants = group.getDecryptedParticipants();
      return decryptedParticipants.includes(userId);
    });

    // Return decrypted data
    const decryptedGroups = userGroups.map(group => ({
      _id: group._id,
      name: group.getDecryptedName(),
      description: group.getDecryptedDescription(),
      createdBy: group.getDecryptedCreatedBy(),
      participants: group.getDecryptedParticipants(),
      admins: group.getDecryptedAdmins(),
      isActive: group.isActive,
      maxParticipants: group.maxParticipants,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    }));

    res.json(decryptedGroups);
  } catch (err) {
    console.error("Error fetching user group chats:", err);
    res.status(500).json({ error: "Server error fetching group chats" });
  }
});

// --- GET /:groupId - Get a specific group chat ---
router.get('/:groupId', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const groupChat = await GroupChat.findById(groupId);
    
    if (!groupChat || !groupChat.isActive) {
      return res.status(404).json({ error: "Group chat not found" });
    }

    res.json({
      _id: groupChat._id,
      name: groupChat.getDecryptedName(),
      description: groupChat.getDecryptedDescription(),
      createdBy: groupChat.getDecryptedCreatedBy(),
      participants: groupChat.getDecryptedParticipants(),
      admins: groupChat.getDecryptedAdmins(),
      isActive: groupChat.isActive,
      maxParticipants: groupChat.maxParticipants,
      createdAt: groupChat.createdAt,
      updatedAt: groupChat.updatedAt,
    });
  } catch (err) {
    console.error("Error fetching group chat:", err);
    res.status(500).json({ error: "Server error fetching group chat" });
  }
});

// --- POST /:groupId/join - Join a group chat ---
router.post('/:groupId/join', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;
    
    const groupChat = await GroupChat.findById(groupId);
    if (!groupChat || !groupChat.isActive) {
      return res.status(404).json({ error: "Group chat not found" });
    }

    if (groupChat.isParticipant(userId)) {
      return res.status(400).json({ error: "You are already in this group!" });
    }

    if (!groupChat.addParticipant(userId)) {
      return res.status(400).json({ error: "Group is full or user already exists" });
    }

    await groupChat.save();
    res.json({ message: "Successfully joined group chat" });
  } catch (err) {
    console.error("Error joining group chat:", err);
    res.status(500).json({ error: "Server error joining group chat" });
  }
});

// --- POST /:groupId/leave - Leave a group chat ---
router.post('/:groupId/leave', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;
    
    const groupChat = await GroupChat.findById(groupId);
    if (!groupChat || !groupChat.isActive) {
      return res.status(404).json({ error: "Group chat not found" });
    }

    if (!groupChat.isParticipant(userId)) {
      return res.status(400).json({ error: "User is not a participant" });
    }

    if (!groupChat.removeParticipant(userId)) {
      return res.status(400).json({ error: "Cannot remove user from group" });
    }

    await groupChat.save();
    res.json({ message: "Successfully left group chat" });
  } catch (err) {
    console.error("Error leaving group chat:", err);
    res.status(500).json({ error: "Server error leaving group chat" });
  }
});

// --- POST /:groupId/add-admin - Add admin (only group admins can do this) ---
router.post('/:groupId/add-admin', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId, newAdminId } = req.body;
    
    const groupChat = await GroupChat.findById(groupId);
    if (!groupChat || !groupChat.isActive) {
      return res.status(404).json({ error: "Group chat not found" });
    }

    if (!groupChat.isAdmin(userId)) {
      return res.status(403).json({ error: "Only admins can add new admins" });
    }

    if (!groupChat.isParticipant(newAdminId)) {
      return res.status(400).json({ error: "User must be a participant to become admin" });
    }

    const decryptedAdmins = groupChat.getDecryptedAdmins();
    if (decryptedAdmins.includes(newAdminId)) {
      return res.status(400).json({ error: "User is already an admin" });
    }

    decryptedAdmins.push(newAdminId);
    groupChat.admins = decryptedAdmins.map(admin => groupChat.constructor.encrypt(admin));
    await groupChat.save();

    res.json({ message: "Successfully added admin" });
  } catch (err) {
    console.error("Error adding admin:", err);
    res.status(500).json({ error: "Server error adding admin" });
  }
});

// --- POST /:groupId/remove-admin - Remove admin (only group creator can do this) ---
router.post('/:groupId/remove-admin', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId, adminToRemoveId } = req.body;
    
    const groupChat = await GroupChat.findById(groupId);
    if (!groupChat || !groupChat.isActive) {
      return res.status(404).json({ error: "Group chat not found" });
    }

    if (groupChat.getDecryptedCreatedBy() !== userId) {
      return res.status(403).json({ error: "Only group creator can remove admins" });
    }

    const decryptedAdmins = groupChat.getDecryptedAdmins();
    const updatedAdmins = decryptedAdmins.filter(admin => admin !== adminToRemoveId);
    
    if (decryptedAdmins.length === updatedAdmins.length) {
      return res.status(400).json({ error: "User is not an admin" });
    }

    groupChat.admins = updatedAdmins.map(admin => groupChat.constructor.encrypt(admin));
    await groupChat.save();

    res.json({ message: "Successfully removed admin" });
  } catch (err) {
    console.error("Error removing admin:", err);
    res.status(500).json({ error: "Server error removing admin" });
  }
});

// --- POST /:groupId/remove-member - Remove a member (only group creator can do this) ---
router.post('/:groupId/remove-member', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId, memberId } = req.body;

    const groupChat = await GroupChat.findById(groupId);
    if (!groupChat || !groupChat.isActive) {
      return res.status(404).json({ error: 'Group chat not found' });
    }

    if (groupChat.getDecryptedCreatedBy() !== userId) {
      return res.status(403).json({ error: 'Only the group creator can remove members' });
    }

    if (memberId === groupChat.getDecryptedCreatedBy()) {
      return res.status(400).json({ error: 'Cannot remove the group creator' });
    }

    if (!groupChat.isParticipant(memberId)) {
      return res.status(400).json({ error: 'User is not a participant' });
    }

    if (!groupChat.removeParticipant(memberId)) {
      return res.status(400).json({ error: 'Failed to remove member' });
    }

    await groupChat.save();
    res.json({
      message: 'Member removed successfully',
      participants: groupChat.getDecryptedParticipants(),
      admins: groupChat.getDecryptedAdmins(),
    });
  } catch (err) {
    console.error('Error removing member:', err);
    res.status(500).json({ error: 'Server error removing member' });
  }
});

// --- DELETE /:groupId - Delete group chat (only creator can do this) ---
router.delete('/:groupId', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;
    
    const groupChat = await GroupChat.findById(groupId);
    if (!groupChat) {
      return res.status(404).json({ error: "Group chat not found" });
    }

    if (groupChat.getDecryptedCreatedBy() !== userId) {
      return res.status(403).json({ error: "Only group creator can delete the group" });
    }

    groupChat.isActive = false;
    await groupChat.save();

    res.json({ message: "Group chat deleted successfully" });
  } catch (err) {
    console.error("Error deleting group chat:", err);
    res.status(500).json({ error: "Server error deleting group chat" });
  }
});

export default router; 