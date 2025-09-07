//routes/userRoutes.js
// Handles user CRUD, authentication, password reset (with OTP), and email sending for JuanLMS.
// Uses JWT for login, Brevo for OTP email, and MongoDB for user storage.

import e from "express";
import database from "../connect.cjs";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import nodemailer from 'nodemailer';
import SibApiV3Sdk from 'sib-api-v3-sdk';
import User from "../models/User.js";
import { encrypt, decrypt } from "../utils/encryption.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { authenticateToken } from '../middleware/authMiddleware.js';
import SchoolYear from '../models/SchoolYear.js';
import Term from '../models/Term.js';
import StudentAssignment from '../models/StudentAssignment.js';
import FacultyAssignment from '../models/FacultyAssignment.js';
// import bcrypt from "bcryptjs"; // If you want to use hashing in the future

const userRoutes = e.Router();
const JWT_SECRET = process.env.JWT_SECRET || "yourSuperSecretKey123"; // 👈 use env variable in production

// ------------------ CRUD ROUTES ------------------

// Get all active (non-archived) students
userRoutes.get('/users/students', authenticateToken, async (req, res) => {
  try {
    const students = await User.find({ role: 'students', isArchived: { $ne: true } });

    const decryptedStudents = students.map(user => ({
      ...user.toObject(),
      email: user.getDecryptedEmail ? user.getDecryptedEmail() : user.email,
      schoolID: user.getDecryptedSchoolID ? user.getDecryptedSchoolID() : user.schoolID,
      personalemail: user.getDecryptedPersonalEmail ? user.getDecryptedPersonalEmail() : user.personalemail,
      middlename: user.getDecryptedMiddlename ? user.getDecryptedMiddlename() : user.middlename,
      firstname: user.getDecryptedFirstname ? user.getDecryptedFirstname() : user.firstname,
      lastname: user.getDecryptedLastname ? user.getDecryptedLastname() : user.lastname,
      profilePic: user.getDecryptedProfilePic ? user.getDecryptedProfilePic() : user.profilePic,
      password: undefined,
    }));

    res.json(decryptedStudents);
  } catch (err) {
    console.error('Failed to fetch students:', err);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// Get user counts for Admin, Faculty, and Students
userRoutes.get('/user-counts', authenticateToken, async (req, res) => {
  try {
    const adminCount = await User.countDocuments({ role: 'admin', isArchived: { $ne: true } });
    const facultyCount = await User.countDocuments({ role: 'faculty', isArchived: { $ne: true } });
    const studentCount = await User.countDocuments({ role: 'students', isArchived: { $ne: true } });

    res.json({
      admin: adminCount,
      faculty: facultyCount,
      students: studentCount,
    });
  } catch (err) {
    console.error("Failed to fetch user counts:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


// Search students by name (must be before /users/:id)
userRoutes.get("/users/search", authenticateToken, async (req, res) => {
    const query = req.query.q || "";
    let users = [];
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(query)) {
        // Search by emailHash
        const emailHash = crypto.createHash('sha256').update(query.toLowerCase()).digest('hex');
        users = await User.find({ emailHash, isArchived: { $ne: true } });
    } else {
        users = await User.find({
            isArchived: { $ne: true },
            $or: [
                { firstname: { $regex: query, $options: "i" } },
                { middlename: { $regex: query, $options: "i" } },
                { lastname: { $regex: query, $options: "i" } },
                { email: { $regex: query, $options: "i" } }
            ],
        });
    }
    // Decrypt fields
    const decryptedUsers = users.map(user => ({
        ...user.toObject(),
        email: user.getDecryptedEmail ? user.getDecryptedEmail() : user.email,
        schoolID: user.getDecryptedSchoolID ? user.getDecryptedSchoolID() : user.schoolID,
        personalemail: user.getDecryptedPersonalEmail ? user.getDecryptedPersonalEmail() : user.personalemail,
        middlename: user.getDecryptedMiddlename ? user.getDecryptedMiddlename() : user.middlename,
        firstname: user.getDecryptedFirstname ? user.getDecryptedFirstname() : user.firstname,
        lastname: user.getDecryptedLastname ? user.getDecryptedLastname() : user.lastname,
        profilePic: user.getDecryptedProfilePic ? user.getDecryptedProfilePic() : user.profilePic,
        password: undefined,
    }));
    res.json(decryptedUsers);
});

// Retrieve ALL users (paginated)
userRoutes.get("/users", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const filter = { isArchived: { $ne: true } };
        const totalUsers = await User.countDocuments(filter);
        const users = await User.find(filter)
            .skip(skip)
            .limit(limit);
        const decryptedUsers = users.map(user => ({
            ...user.toObject(),
            email: user.getDecryptedEmail ? user.getDecryptedEmail() : user.email,
            schoolID: user.getDecryptedSchoolID ? user.getDecryptedSchoolID() : user.schoolID,
            personalemail: user.getDecryptedPersonalEmail ? user.getDecryptedPersonalEmail() : user.personalemail,
            profilePic: user.getDecryptedProfilePic ? user.getDecryptedProfilePic() : user.profilePic,
            password: undefined,
        }));
        res.json({
            users: decryptedUsers,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalUsers / limit),
                totalUsers,
                usersPerPage: limit
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

// Add GET /users/active for all non-archived users (no pagination, for search/autocomplete)
userRoutes.get("/users/active", async (req, res) => {
    try {
        const users = await User.find({ isArchived: { $ne: true } });
        const decryptedUsers = users.map(user => ({
            ...user.toObject(),
            email: user.getDecryptedEmail ? user.getDecryptedEmail() : user.email,
            schoolID: user.getDecryptedSchoolID ? user.getDecryptedSchoolID() : user.schoolID,
            personalemail: user.getDecryptedPersonalEmail ? user.getDecryptedPersonalEmail() : user.personalemail,
            profilePic: user.getDecryptedProfilePic ? user.getDecryptedProfilePic() : user.profilePic,
            password: undefined,
        }));
        res.json(decryptedUsers);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch active users" });
    }
});

// Add GET /user-counts for dashboard stats
userRoutes.get('/user-counts', authenticateToken, async (req, res) => {
  try {
    // 1. Get active school year
    const activeYear = await SchoolYear.findOne({ status: 'active' });
    if (!activeYear) return res.json({ admin: 0, faculty: 0, student: 0 });

    const schoolYearName = `${activeYear.schoolYearStart}-${activeYear.schoolYearEnd}`;

    // 2. Get active term
    const activeTerm = await Term.findOne({ status: 'active', schoolYear: schoolYearName });
    if (!activeTerm) return res.json({ admin: 0, faculty: 0, student: 0 });

    // 3. Count students assigned for this year/term
    const studentCount = await StudentAssignment.countDocuments({
      schoolYear: schoolYearName,
      termName: activeTerm.termName,
      status: 'active'
    });

    // 4. Count faculty assigned for this year/term
    const facultyCount = await FacultyAssignment.countDocuments({
      schoolYear: schoolYearName,
      termName: activeTerm.termName,
      status: 'active'
    });

    // 5. Count admins (not tied to year/term)
    const adminCount = await User.countDocuments({ role: 'admin', isArchived: { $ne: true } });

    res.json({ admin: adminCount, faculty: facultyCount, student: studentCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user counts' });
  }
});

// Get all archived users
userRoutes.get('/users/archived-users', async (req, res) => {
  const db = database.getDb();
  const archivedUsers = await db.collection('users').find({ isArchived: true }).toArray();
  res.json(archivedUsers);
});

// Retrieve ONE user by ID
userRoutes.route("/users/:id").get(authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: "User not found" });

        // Decrypt sensitive fields
        const decryptedUser = {
            ...user.toObject(),
            email: user.getDecryptedEmail ? user.getDecryptedEmail() : user.email,
            schoolID: user.getDecryptedSchoolID ? user.getDecryptedSchoolID() : user.schoolID,
            personalemail: user.getDecryptedPersonalEmail ? user.getDecryptedPersonalEmail() : user.personalemail,
            profilePic: user.getDecryptedProfilePic ? user.getDecryptedProfilePic() : user.profilePic,
            password: undefined, // Never send password!
        };

        res.json(decryptedUser);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch user" });
    }
});

// Retrieve ONE user by userID (string identifier like F001, A001)
userRoutes.route("/users/by-userid/:userID").get(authenticateToken, async (req, res) => {
    try {
        const user = await User.findOne({ userID: req.params.userID });
        if (!user) return res.status(404).json({ error: "User not found" });

        // Decrypt sensitive fields
        const decryptedUser = {
            ...user.toObject(),
            email: user.getDecryptedEmail ? user.getDecryptedEmail() : user.email,
            schoolID: user.getDecryptedSchoolID ? user.getDecryptedSchoolID() : user.schoolID,
            personalemail: user.getDecryptedPersonalEmail ? user.getDecryptedPersonalEmail() : user.personalemail,
            profilePic: user.getDecryptedProfilePic ? user.getDecryptedProfilePic() : user.profilePic,
            password: undefined, // Never send password!
        };

        res.json(decryptedUser);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch user" });
    }
});

// Create ONE user (with role)
userRoutes.post("/users", authenticateToken, async (req, res) => {
    // Only allow admin to create users
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Only admin can create users.' });
    }
    const {
        firstname,
        middlename,
        lastname,
        email,
        schoolID,
        password,
        personalemail,
        profilePic,
        role,
        userID,
        programAssigned,
        courseAssigned,
        contactNo,
    } = req.body;

    // Simple server-side validation (backend safety)
    if (!firstname || !lastname || !email || !password || !role || !schoolID || !contactNo) {
        return res.status(400).json({ error: "Missing required fields" });
    }
    // Validate contactNo
    if (!/^\d{11}$/.test(contactNo)) {
        return res.status(400).json({ error: "Contact number must be exactly 11 digits and contain only numbers." });
    }

    // Debug: log received schoolID and role
    console.log('Received schoolID:', schoolID, 'for role:', role);
    if (role === 'faculty') {
        if (!/^F\d{3}$/.test(schoolID)) {
            return res.status(400).json({ error: "Faculty ID must be F followed by exactly 3 digits (e.g., F001, F010, F100)." });
        }
    } else if (role === 'admin') {
        if (!/^A\d{3}$/.test(schoolID)) {
            return res.status(400).json({ error: "Admin ID must be A followed by exactly 3 digits (e.g., A001, A010, A100)." });
        }
    } else if (role === 'vice president of education' || role === 'principal') {
        if (!/^N\d{3}$/.test(schoolID)) {
            return res.status(400).json({ error: "VP/Principal ID must be N followed by exactly 3 digits (e.g., N001, N010, N100)." });
        }
    } else if (role === 'students') {
        return res.status(400).json({ error: "Student accounts can only be registered through the public registration form." });
    }

    // Check for duplicate email using emailHash to handle encrypted stored emails
    const baseEmail = email.toLowerCase();
    const computeHash = (val) => crypto.createHash('sha256').update(val).digest('hex');
    const baseHash = computeHash(baseEmail);
    const existingUser = await User.findOne({ emailHash: baseHash });
    if (existingUser) {
        // Suggest a new email if duplicate, ensure uniqueness by hash
        const emailUsername = baseEmail.split('@')[0];
        const emailDomain = baseEmail.split('@')[1];
        let counter = 1;
        let uniqueEmail = baseEmail;
        // Find next available email by appending an incrementing number
        while (true) {
            uniqueEmail = `${emailUsername}${counter}@${emailDomain}`;
            const uniqueHash = computeHash(uniqueEmail);
            const dup = await User.findOne({ emailHash: uniqueHash });
            if (!dup) break;
            counter++;
        }
        return res.status(409).json({
            error: "Duplicate email found.",
            suggestedEmail: uniqueEmail
        });
    }

    try {
        const user = new User({
            firstname,
            middlename,
            lastname,
            email: email.toLowerCase(),
            schoolID,
            password,
            personalemail,
            profilePic,
            role,
            userID,
            programAssigned: programAssigned,
            courseAssigned: courseAssigned,
            contactNo,
            isArchived: false,
            archivedAt: null,
            deletedAt: null,
            archiveAttempts: 0,
            archiveLockUntil: null,
            recoverAttempts: 0,
            recoverLockUntil: null,
            resetOTP: null,
            resetOTPExpires: null,
        });

        console.log("About to save user");
        await user.save(); // Triggers pre-save hook for hashing/encryption
        console.log("User saved:", user);

        const db = database.getDb();
        console.log("About to write audit log");
        await db.collection('AuditLogs').insertOne({
            userId: user._id,
            userName: `${user.getDecryptedFirstname ? user.getDecryptedFirstname() : user.firstname} ${user.getDecryptedLastname ? user.getDecryptedLastname() : user.lastname}`,
            userRole: role,
            action: 'Create Account',
            details: `Created new ${role} account for ${user.getDecryptedEmail ? user.getDecryptedEmail() : user.email}`,
            ipAddress: req.ip || req.connection.remoteAddress,
            timestamp: new Date()
        });
        console.log("Audit log written");

        // Send welcome email via Brevo using EmailService
        let brevoResult = null;
        try {
            const emailService = await import('../services/emailService.js');
            console.log("About to send welcome email");
            brevoResult = await emailService.default.sendWelcomeEmail(
                personalemail,
                firstname,
                email,
                password
            );
            console.log("Welcome email sent:", brevoResult.message);
        } catch (emailErr) {
            console.error('Error sending welcome email via Brevo:', emailErr);
            brevoResult = { success: false, message: 'Failed to send welcome email' };
        }

    // Create Zoho mailbox for the user
    let zohoMailboxResult = null;
    try {
        const { createZohoMailbox } = await import('../services/zohoMail.js');
        
        // Only create Zoho mailbox if ZOHO_ORG_ID is configured
        if (process.env.ZOHO_ORG_ID) {
            console.log("Creating Zoho mailbox for user:", email);
            zohoMailboxResult = await createZohoMailbox(
                email.toLowerCase(),
                firstname,
                lastname,
                password
            );
            console.log("Zoho mailbox created successfully");
        } else {
            console.log("ZOHO_ORG_ID not configured, skipping Zoho mailbox creation");
        }
    } catch (zohoErr) {
        console.error('Error creating Zoho mailbox:', zohoErr.message);
        // Don't fail the user creation if Zoho mailbox creation fails
        // Just log the error and continue
    }

    res.status(201).json({ 
        success: true, 
        user,
        emailServices: {
            brevo: brevoResult || {
                success: false,
                message: "Welcome email sending failed"
            },
            zohoMailbox: zohoMailboxResult ? {
                success: true,
                message: "Zoho mailbox created successfully",
                email: email
            } : {
                success: false,
                message: "Zoho mailbox creation skipped or failed"
            }
        }
    });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create user" });
    }
});

// Update ONE user
userRoutes.route("/users/:id").patch(authenticateToken, async (req, res) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Only admin can update users.' });
    }
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Update only allowed fields
        [
            "firstname", "middlename", "lastname", "email", "schoolID",
            "password", "personalemail", "profilePic", "userID", "role",
            "contactNo"
        ].forEach(field => {
            if (req.body[field] !== undefined) user[field] = req.body[field];
        });
        // Validate schoolID format on update
        if (user.role === 'students') {
            if (!/^\d{12}$/.test(user.schoolID)) {
                return res.status(400).json({ error: "Student LRN must be a 12-digit number." });
            }
        } else {
            if (!/^\d{2}-\d{4}$/.test(user.schoolID)) {
                return res.status(400).json({ error: "School ID must be in the format NN-NNNN for non-students." });
            }
        }
        // Validate contactNo on update
        if (user.contactNo && !/^\d{11}$/.test(user.contactNo)) {
            return res.status(400).json({ error: "Contact number must be exactly 11 digits and contain only numbers." });
        }

        await user.save(); // Triggers pre-save hook

        res.json({ message: "User updated successfully", user });
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ message: "Error updating user", error: error.message });
    }
});

// Delete ONE user
userRoutes.delete("/users/:id", authenticateToken, async (req, res) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Only admin can delete users.' });
    }
    const db = database.getDb();
    const result = await db.collection("users").deleteOne({ _id: new ObjectId(req.params.id) });
    res.json(result);
});

// Archive a user (set isArchived, archivedAt, deletedAt)
userRoutes.post('/users/archive/:userId', async (req, res) => {
    console.log('ARCHIVE ROUTE HIT', req.params, req.body);
    const db = database.getDb();
    const { userId } = req.params;
    const { adminId, adminPassword } = req.body;

    // Debug: print all admins and the adminId being searched for
    const admins = await db.collection('users').find({ role: 'admin' }).toArray();
    console.log('All admins in DB:', admins);
    console.log('Looking for adminId:', adminId);

    const admin = await db.collection('users').findOne({ _id: new ObjectId(adminId), role: 'admin' });
    if (!admin) {
        console.log('Admin not found:', adminId);
        return res.status(403).json({ message: 'Admin not found.' });
    }

    // Use bcrypt.compare for password check
    const passwordMatch = await bcrypt.compare(adminPassword, admin.password);
    if (!passwordMatch) {
        console.log('Invalid admin password for:', adminId);
        return res.status(401).json({ message: 'Invalid admin password.' });
    }

    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (!user) {
        console.log('User not found:', userId);
        return res.status(404).json({ message: 'User not found.' });
    }

    const updateResult = await db.collection('users').updateOne(
        { _id: new ObjectId(userId) },
        {
            $set: {
                isArchived: true,
                archivedAt: new Date(),
                deletedAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            }
        }
    );

    // Create audit log for account archiving
    const decryptedEmail = typeof user.email === 'string' && user.email.includes(':') ? decrypt(user.email) : user.email;
    await db.collection('AuditLogs').insertOne({
        userId: new ObjectId(userId),
        userName: `${user.firstname} ${user.lastname}`,
        userRole: user.role,
        action: 'Archive Account',
        details: `Archived account for ${decryptedEmail}`,
        ipAddress: req.ip || req.connection.remoteAddress,
        timestamp: new Date()
    });

    console.log('Archive update result:', updateResult);
    res.json({ message: 'User archived successfully.' });
});

// Recover an archived user (set isArchived to false, clear archivedAt/deletedAt, increment archiveAttempts)
userRoutes.post('/users/archived-users/:userId/recover', async (req, res) => {
    const db = database.getDb();
    const { userId } = req.params;
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (!user) {
        return res.status(404).json({ message: 'User not found.' });
    }
    if (!user.isArchived) {
        return res.status(400).json({ message: 'User is not archived.' });
    }
    const updateResult = await db.collection('users').updateOne(
        { _id: new ObjectId(userId) },
        {
            $set: {
                isArchived: false,
                archivedAt: null,
                deletedAt: null
            },
            $inc: { archiveAttempts: 1 }
        }
    );
    // Create audit log for account recovery
    await db.collection('AuditLogs').insertOne({
        userId: new ObjectId(userId),
        userName: `${user.firstname} ${user.lastname}`,
        userRole: user.role,
        action: 'Recover Account',
        details: `Recovered account for ${user.email}`,
        ipAddress: req.ip || req.connection.remoteAddress,
        timestamp: new Date()
    });
    res.json({ message: 'User recovered successfully.' });
});

// ------------------ PASSWORD CHANGE/RESET ------------------

// Send OTP for password change (authenticated user)
userRoutes.post('/users/:id/request-password-change-otp', async (req, res) => {
    const db = database.getDb();
    const userId = req.params.id;
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (!user || !user.personalemail) {
        return res.status(404).json({ message: 'User not found or missing personal email.' });
    }
    // Decrypt personal email
    const decryptedPersonalEmail = user.getDecryptedPersonalEmail
      ? user.getDecryptedPersonalEmail()
      : (typeof user.personalemail === 'string' ? decrypt(user.personalemail) : '');
    if (!decryptedPersonalEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(decryptedPersonalEmail)) {
      console.error('Invalid or missing personal email for user:', user);
      return res.status(400).json({ message: 'User does not have a valid personal email.' });
    }
    // Generate OTP and expiry
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes
    await db.collection('users').updateOne(
        { _id: user._id },
        { $set: { resetOTP: otp, resetOTPExpires: otpExpiry } }
    );
    // Send OTP via Brevo to Zoho Mail address
    try {
        const emailService = await import('../services/emailService.js');
        await emailService.default.sendOTP(
            user.email, // Send to Zoho Mail address instead of personal email
            user.firstname,
            otp,
            'password_change',
            user.email
        );
    } catch (emailErr) {
        console.error('Error sending OTP email to Zoho Mail via Brevo:', emailErr);
    }
    return res.json({ message: 'OTP sent to your Zoho Mail address.' });
});

// Change password route (requires current password, after OTP is validated)
userRoutes.patch("/users/:id/change-password", async (req, res) => {
  const db = database.getDb();
  const { currentPassword, newPassword } = req.body;
  const userId = req.params.id;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "All fields are required." });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters." });
  }

  const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });
  if (!user) return res.status(404).json({ error: "User not found." });

  // Use bcrypt to compare hashed password
  const isMatch = await bcrypt.compare(currentPassword, user.password);

  if (!isMatch) {
    return res.status(400).json({ error: "Current password is incorrect." });
  }

  // Hash the new password before saving
  const hashedNewPassword = await bcrypt.hash(newPassword, 10);

  await db.collection("users").updateOne(
    { _id: new ObjectId(userId) },
    { $set: { password: hashedNewPassword }, $unset: { resetOTP: '', resetOTPExpires: '' } }
  );

  res.json({ success: true, message: "Password updated successfully." });
});

// Forgot Password (send OTP or reset link to personal email)
userRoutes.post('/forgot-password', async (req, res) => {
    console.log('Forgot password endpoint hit');
    const db = database.getDb();
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required.' });

    // Validate basic email format
    const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!emailPattern.test(email.trim())) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }

    const genericMsg = 'If your email is registered, a reset link or OTP has been sent to your Zoho Mail address.';

    try {
        // Find user by personalemailHash
        const emailHash = crypto.createHash('sha256').update(email.toLowerCase()).digest('hex');
        const user = await db.collection('users').findOne({ personalemailHash: emailHash });
        console.log('User found:', user);
        if (!user || !user.personalemail) {
            console.log('User not found or missing personalemail');
            // Explicitly inform user that the email is not registered
            return res.status(404).json({ message: 'This email is not registered. Please check that it\'s correct.' });
        }
        // Decrypt personal email
        const decryptedPersonalEmail = user.getDecryptedPersonalEmail
          ? user.getDecryptedPersonalEmail()
          : (typeof user.personalemail === 'string' ? decrypt(user.personalemail) : '');
        if (!decryptedPersonalEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(decryptedPersonalEmail)) {
          console.error('Invalid or missing personal email for user:', user);
          return res.json({ message: genericMsg });
        }
        // --- Generate OTP and expiry ---
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes

        // Store OTP and expiry in user document
        await db.collection('users').updateOne(
            { _id: user._id },
            { $set: { resetOTP: otp, resetOTPExpires: otpExpiry } }
        );

        // --- Send OTP via Brevo to Zoho Mail address ---
        console.log('About to send OTP to Zoho Mail via EmailService...');

        try {
            const emailService = await import('../services/emailService.js');
            const result = await emailService.default.sendOTP(
                user.email, // Send to Zoho Mail address instead of personal email
                user.firstname,
                otp,
                'password_reset',
                user.email
            );
            console.log('OTP email sent to Zoho Mail:', user.email, 'Result:', result);
        } catch (emailErr) {
            console.error('Error sending OTP email to Zoho Mail via Brevo:', emailErr);
        }

        console.log('After sendTransacEmail call');

        return res.json({ message: genericMsg });

    } catch (err) {
        console.error('Error in forgot-password:', err);
        return res.status(500).json({ message: 'Server error. Please try again.' });
    }
});

// Test email endpoint (for development)
userRoutes.get('/test-email', async (req, res) => {
    try {
        const apiKeyVal = process.env.BREVO_API_KEY || '';
        const maskedKey = apiKeyVal.length > 8 ? apiKeyVal.slice(0, 4) + '...' + apiKeyVal.slice(-4) : apiKeyVal;
        console.log('BREVO_API_KEY (masked):', maskedKey);
        console.log('About to send Brevo test email');
        let defaultClient = SibApiV3Sdk.ApiClient.instance;
        let apiKey = defaultClient.authentications['api-key'];
        apiKey.apiKey = process.env.BREVO_API_KEY;
        let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
        let sendSmtpEmail = {
            to: [{ email: 'nicolettecborre@gmail.com', name: 'JuanLMS Test' }],
            sender: { email: 'juanlms.sjddefi@gmail.com', name: 'JuanLMS Support' },
            subject: 'JuanLMS Test Email (Brevo)',
            textContent: 'This is a test email from JuanLMS backend using Brevo (Sendinblue).'
        };
        const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log('Brevo test email sent, result:', result);
        return res.json({ message: 'Test email sent successfully via Brevo.' });
    } catch (err) {
        console.error('Error sending test email via Brevo:', err);
        return res.status(500).json({ message: 'Error sending test email via Brevo', error: err.message });
    }
});

// Reset Password (OTP verification and password update)
userRoutes.post('/reset-password', async (req, res) => {
    const db = database.getDb();
    const { personalemail, otp, newPassword } = req.body;

    if (!personalemail || !otp || !newPassword) {
        return res.status(400).json({ message: 'All fields are required.' });
    }
    if (newPassword.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }

    // Find user by personalemailHash
    const emailHash = crypto.createHash('sha256').update(personalemail.toLowerCase()).digest('hex');
    const user = await db.collection('users').findOne({ personalemailHash: emailHash });
    if (!user) return res.status(404).json({ message: 'User not found.' });

    // --- OTP validation ---
    if (
        !user.resetOTP ||
        !user.resetOTPExpires ||
        user.resetOTP !== otp ||
        Date.now() > user.resetOTPExpires
    ) {
        return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    // Update password and clear OTP fields
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await db.collection('users').updateOne(
        { _id: user._id },
        { $set: { password: hashedNewPassword }, $unset: { resetOTP: '', resetOTPExpires: '' } }
    );

    res.json({ message: 'Password reset successful. You can now log in with your new password.' });
});

// Validate OTP only (for password reset flow)
userRoutes.post('/validate-otp', async (req, res) => {
    const db = database.getDb();
    const { personalemail, otp } = req.body;
    if (!personalemail || !otp) {
        return res.status(400).json({ message: 'All fields are required.' });
    }
    // Find user by personalemailHash
    const emailHash = crypto.createHash('sha256').update(personalemail.toLowerCase()).digest('hex');
    const user = await db.collection('users').findOne({ personalemailHash: emailHash });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    // --- OTP validation ---
    if (
        !user.resetOTP ||
        !user.resetOTPExpires ||
        user.resetOTP !== otp ||
        Date.now() > user.resetOTPExpires
    ) {
        return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }
    return res.json({ message: 'OTP is valid.' });
});

// Validate OTP for password change (authenticated user)
userRoutes.post('/users/:id/validate-otp', async (req, res) => {
    const db = database.getDb();
    const userId = req.params.id;
    const { otp } = req.body;
    if (!otp) {
        return res.status(400).json({ message: 'OTP is required.' });
    }
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (
        !user.resetOTP ||
        !user.resetOTPExpires ||
        user.resetOTP !== otp ||
        Date.now() > user.resetOTPExpires
    ) {
        return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }
    return res.json({ message: 'OTP is valid.' });
});

// ------------------ JWT LOGIN ROUTE ------------------

// Login route: issues JWT on success, logs audit trail
userRoutes.post('/login', async (req, res) => {
    const email = req.body.email.toLowerCase();
    const { password } = req.body;

    // Hash the email for lookup
    const emailHash = crypto.createHash('sha256').update(email).digest('hex');

    console.log('Login attempt:', email);
    console.log('Email hash:', emailHash);

    // Find user by emailHash
    const user = await User.findOne({ emailHash });
    console.log('User found:', user);
    if (!user) {
        return res.status(401).json({ success: false, message: "Invalid email" });
    }

    // Check if user is archived
    if (user.isArchived) {
        return res.status(403).json({ success: false, message: "Account is archived. Please contact admin." });
    }

    // Compare hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match:', isMatch);
    if (!isMatch) {
        return res.status(401).json({ success: false, message: "Invalid password" });
    }

    // JWT Token Payload (adapt as needed)
    console.log('[Backend Debug] User role from database:', user.role);
    console.log('[Backend Debug] User role type:', typeof user.role);
    
    const token = jwt.sign({
        id: user._id,
        name: `${user.firstname} ${user.lastname}`,
        email: email, // original email
        schoolID: user.getDecryptedSchoolID ? user.getDecryptedSchoolID() : user.schoolID,
        role: user.role,
        _id: user._id,
        profilePic: user.profilePic || null,
        userID: user.userID
    }, process.env.JWT_SECRET || "yourSuperSecretKey123", { expiresIn: '1d' });

    console.log('[Backend Debug] JWT token created with role:', user.role);

    // Add audit log for successful login
    try {
        const db = database.getDb();
        await db.collection('AuditLogs').insertOne({
            userId: user._id,
            userName: `${user.getDecryptedFirstname ? user.getDecryptedFirstname() : user.firstname} ${user.getDecryptedLastname ? user.getDecryptedLastname() : user.lastname}`,
            userRole: user.role,
            action: 'Login',
            details: `User logged in from ${req.ip || req.connection.remoteAddress}`,
            ipAddress: req.ip || req.connection.remoteAddress,
            timestamp: new Date()
        });
    } catch (auditError) {
        console.error('Failed to create login audit log:', auditError);
        // Don't fail the login if audit logging fails
    }

    res.json({ token });
});














    








// ------------------ LOGOUT ROUTE ------------------

// Logout route: creates audit log for logout
userRoutes.post('/logout', authenticateToken, async (req, res) => {
    console.log('Logout endpoint called');
    console.log('User:', req.user);
    console.log('IP:', req.ip || req.connection.remoteAddress);
    
    try {
        // Add audit log for logout
        const db = database.getDb();
        const auditLog = {
            userId: req.user._id,
            userName: req.user.name || `${req.user.firstname || ''} ${req.user.lastname || ''}`.trim(),
            userRole: req.user.role,
            action: 'Logout',
            details: `User logged out from ${req.ip || req.connection.remoteAddress}`,
            ipAddress: req.ip || req.connection.remoteAddress,
            timestamp: new Date()
        };
        console.log('Creating audit log:', auditLog);
        
        await db.collection('AuditLogs').insertOne(auditLog);
        console.log('Audit log created successfully');

        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('Error during logout:', error);
        res.status(500).json({ message: 'Error during logout' });
    }
});

// ------------------ UTILS ------------------

// Get user role from email domain
function getRoleFromEmail(email) {
    const normalized = email.toLowerCase();
    if (normalized.endsWith('@students.sjdefilms.com')) return 'students';
    if (normalized.endsWith('@VPE.sjdefilms.com')) return 'vice president of education';
    if (normalized.endsWith('@admin.sjdefilms.com')) return 'admin';
    if (normalized.endsWith('@principal.sjdefilms.com')) return 'principal';
    if (normalized.endsWith('@sjdefilms.com') && !normalized.includes('@students.') && !normalized.includes('@parent.') && !normalized.includes('@admin.') && !normalized.includes('@principal.')) return 'faculty';
    return 'unknown';
}

// Get user role from schoolID format
function getRoleFromSchoolID(schoolID) {
    if (!schoolID) return 'unknown';
    if (/^\d{2}-\d{5}$/.test(schoolID)) return 'students';
    if (/^F\d{3}$/.test(schoolID)) return 'faculty';
    if (/^A\d{3}$/.test(schoolID)) return 'admin';
    if (/^N\d{3}$/.test(schoolID)) return 'vice president of education'; // or 'principal' based on specific needs
    return 'unknown';
}

// Utility endpoint to fix user roles based on schoolID (admin only)
userRoutes.post('/fix-roles', authenticateToken, async (req, res) => {
    try {
        // Only admin can access this endpoint
        if (req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied. Admin only.' 
            });
        }

        const users = await User.find({});
        let updatedCount = 0;
        let errors = [];

        for (const user of users) {
            try {
                const decryptedSchoolID = user.getDecryptedSchoolID ? user.getDecryptedSchoolID() : user.schoolID;
                const correctRole = getRoleFromSchoolID(decryptedSchoolID);
                
                if (correctRole !== 'unknown' && correctRole !== user.role) {
                    console.log(`[FIX-ROLES] User ${user.email}: ${user.role} -> ${correctRole} (SchoolID: ${decryptedSchoolID})`);
                    user.role = correctRole;
                    await user.save();
                    updatedCount++;
                }
            } catch (err) {
                errors.push(`Failed to update user ${user.email}: ${err.message}`);
            }
        }

        res.json({
            success: true,
            message: `Role fix completed. Updated ${updatedCount} users.`,
            updatedCount,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (err) {
        console.error('Error fixing user roles:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fix user roles',
            error: err.message
        });
    }
});

// Utility endpoint to find and identify duplicate users (admin only)
userRoutes.get('/find-duplicates', authenticateToken, async (req, res) => {
  try {
    // Only admin can access this endpoint
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Admin only.' 
      });
    }

    // Find users with same names but potentially different roles
    const users = await User.find({});
    const duplicates = [];
    const seen = new Map();

    for (const user of users) {
      try {
        const firstName = user.firstname || '';
        const lastName = user.lastname || '';
        const fullName = `${firstName} ${lastName}`.trim().toLowerCase();
        const schoolID = user.getDecryptedSchoolID ? user.getDecryptedSchoolID() : user.schoolID;
        const role = user.role;
        const email = user.getDecryptedEmail ? user.getDecryptedEmail() : user.email;
        
        if (seen.has(fullName)) {
          const existing = seen.get(fullName);
          duplicates.push({
            name: fullName,
            user1: {
              _id: existing._id,
              userID: existing.userID,
              schoolID: existing.schoolID,
              role: existing.role,
              email: existing.email
            },
            user2: {
              _id: user._id,
              userID: user.userID,
              schoolID: schoolID,
              role: role,
              email: email
            }
          });
        } else {
          seen.set(fullName, {
            _id: user._id,
            userID: user.userID,
            schoolID: schoolID,
            role: role,
            email: email
          });
        }
      } catch (err) {
        console.error(`Error processing user ${user._id}:`, err);
      }
    }

    res.json({
      success: true,
      duplicates: duplicates,
      totalUsers: users.length,
      duplicateCount: duplicates.length
    });

  } catch (err) {
    console.error('Error finding duplicate users:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to find duplicate users',
      error: err.message
    });
  }
});

// Convert string to Proper Case
function toProperCase(str) {
    return str
        .toLowerCase()
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

export default userRoutes;