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
import { encrypt } from "../utils/encryption.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { authenticateToken } from '../middleware/authMiddleware.js';
// import bcrypt from "bcryptjs"; // If you want to use hashing in the future

const userRoutes = e.Router();
const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key_here"; // 👈 use env variable in production

// ------------------ CRUD ROUTES ------------------

// Search students by name (must be before /users/:id)
userRoutes.get("/users/search", authenticateToken, async (req, res) => {
    const db = database.getDb();
    const query = req.query.q || "";
    let users = [];
    // If the query looks like an email, match exactly
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(query)) {
        users = await db.collection("users").find({ email: query.toLowerCase() }).toArray();
    } else {
        users = await db.collection("users").find({
        $or: [
            { firstname: { $regex: query, $options: "i" } },
            { middlename: { $regex: query, $options: "i" } },
            { lastname: { $regex: query, $options: "i" } },
                { email: { $regex: query, $options: "i" } }
        ],
    }).toArray();
    }
    if (users.length > 0) {
        res.json(users);
    } else {
        res.json([]);
    }
});

// Retrieve ALL users (paginated)
userRoutes.get("/users", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const totalUsers = await User.countDocuments();
        const users = await User.find()
            .skip(skip)
            .limit(limit);
        const decryptedUsers = users.map(user => ({
            ...user.toObject(),
            email: user.getDecryptedEmail ? user.getDecryptedEmail() : user.email,
            contactno: user.getDecryptedContactNo ? user.getDecryptedContactNo() : user.contactno,
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

// Get all archived users
userRoutes.get('/users/archived-users', async (req, res) => {
  const db = database.getDb();
  const archivedUsers = await db.collection('users').find({ isArchived: true }).toArray();
  res.json(archivedUsers);
});

// Retrieve ONE user by ID
userRoutes.route("/users/:id").get(async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: "User not found" });

        // Decrypt sensitive fields
        const decryptedUser = {
            ...user.toObject(),
            email: user.getDecryptedEmail ? user.getDecryptedEmail() : user.email,
            contactno: user.getDecryptedContactNo ? user.getDecryptedContactNo() : user.contactno,
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
        contactno,
        password,
        personalemail,
        profilePic,
        role,
        userID,
        programAssigned,
        courseAssigned,
        sectionAssigned,
        yearLevelAssigned
    } = req.body;

    // Simple server-side validation (backend safety)
    if (!firstname || !lastname || !email || !password || !role) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    // Check for duplicate email (unencrypted, before saving)
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
        // Suggest a new email if duplicate
        let baseEmail = email.toLowerCase();
        let emailUsername = baseEmail.split('@')[0];
        let emailDomain = baseEmail.split('@')[1];
        let counter = 1;
        let uniqueEmail = baseEmail;
        while (await User.findOne({ email: uniqueEmail })) {
            uniqueEmail = `${emailUsername}${counter}@${emailDomain}`;
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
            contactno,
            password,
            personalemail,
            profilePic,
            role,
            userID,
            programAssigned: programAssigned || null,
            courseAssigned: courseAssigned || null,
            sectionAssigned: sectionAssigned || null,
            yearLevelAssigned: yearLevelAssigned || null,
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
            userName: `${firstname} ${lastname}`,
            userRole: role,
            action: 'Create Account',
            details: `Created new ${role} account for ${email}`,
            ipAddress: req.ip || req.connection.remoteAddress,
            timestamp: new Date()
        });
        console.log("Audit log written");

        // Send welcome email via Brevo (Sendinblue)
        try {
            let defaultClient = SibApiV3Sdk.ApiClient.instance;
            let apiKey = defaultClient.authentications['api-key'];
            apiKey.apiKey = process.env.BREVO_API_KEY;

            let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

            let sendSmtpEmail = {
                to: [{ email: personalemail, name: firstname || '' }],
                sender: { email: 'nicolettecborre@gmail.com', name: 'JuanLMS Support' },
                subject: 'Welcome to JuanLMS!',
                textContent:
                  `Hello ${firstname || ''},\n\n` +
                  `Your JuanLMS account has been created.\n` +
                  `School Email: ${email}\n` +
                  `Password: ${password}\n\n` +
                  `Please log in and change your password after your first login.\n\n` +
                  `Thank you,\nJuanLMS Team`
            };

            console.log("About to send welcome email");
            await apiInstance.sendTransacEmail(sendSmtpEmail);
            console.log("Welcome email sent");
        } catch (emailErr) {
            console.error('Error sending welcome email via Brevo:', emailErr);
        }
        res.status(201).json({ success: true, user });
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
            "firstname", "middlename", "lastname", "email", "contactno",
            "password", "personalemail", "profilePic", "userID", "role",
            "programAssigned", "courseAssigned", "sectionAssigned", "yearLevelAssigned"
        ].forEach(field => {
            if (req.body[field] !== undefined) user[field] = req.body[field];
        });

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

// Get all active (non-archived) users
userRoutes.get('/users', async (req, res) => {
  const db = database.getDb();
  const users = await db.collection('users').find({ isArchived: { $ne: true } }).toArray();
  res.json(users);
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
    await db.collection('AuditLogs').insertOne({
        userId: new ObjectId(userId),
        userName: `${user.firstname} ${user.lastname}`,
        userRole: user.role,
        action: 'Archive Account',
        details: `Archived account for ${user.email}`,
        ipAddress: req.ip || req.connection.remoteAddress,
        timestamp: new Date()
    });

    console.log('Archive update result:', updateResult);
    res.json({ message: 'User archived successfully.' });
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
    // Generate OTP and expiry
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes
    await db.collection('users').updateOne(
        { _id: user._id },
        { $set: { resetOTP: otp, resetOTPExpires: otpExpiry } }
    );
    // Send OTP via Brevo (Sendinblue)
    let defaultClient = SibApiV3Sdk.ApiClient.instance;
    let apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = process.env.BREVO_API_KEY;
    let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    let sendSmtpEmail = {
        to: [{ email: user.personalemail, name: user.firstname || '' }],
        sender: { email: 'nicolettecborre@gmail.com', name: 'JuanLMS Support' },
        subject: 'Your JuanLMS Password Change OTP',
        textContent: `Hello ${user.firstname || ''},\n\nYour OTP for password change is: ${otp}\n\nIf you did not request this, please ignore this email.\n\nThank you,\nJuanLMS Team`
    };
    try {
        await apiInstance.sendTransacEmail(sendSmtpEmail);
    } catch (emailErr) {
        console.error('Error sending OTP email via Brevo:', emailErr);
    }
    return res.json({ message: 'OTP sent to your personal email.' });
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

  // If you already hash passwords, use bcrypt.compare
  const isMatch = user.password === currentPassword; // Replace with bcrypt.compare if hashed

  if (!isMatch) {
    return res.status(400).json({ error: "Current password is incorrect." });
  }

  await db.collection("users").updateOne(
    { _id: new ObjectId(userId) },
    { $set: { password: newPassword }, $unset: { resetOTP: '', resetOTPExpires: '' } }
  );

  res.json({ success: true, message: "Password updated successfully." });
});

// Forgot Password (send OTP or reset link to personal email)
userRoutes.post('/forgot-password', async (req, res) => {
    console.log('Forgot password endpoint hit');
    const db = database.getDb();
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required.' });

    const genericMsg = 'If your email is registered, a reset link or OTP has been sent to your personal email.';

    try {
        // Find user by personal email
        const user = await db.collection('users').findOne({ personalemail: email.toLowerCase() });
        console.log('User found:', user);
        if (!user || !user.personalemail) {
            console.log('User not found or missing personalemail');
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

        // --- Send OTP via Brevo (Sendinblue) ---
        let defaultClient = SibApiV3Sdk.ApiClient.instance;
        let apiKey = defaultClient.authentications['api-key'];
        apiKey.apiKey = process.env.BREVO_API_KEY;

        let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

        // Use a plain object for sendSmtpEmail
        let sendSmtpEmail = {
            to: [{ email: user.personalemail, name: user.firstname || '' }],
            sender: { email: 'nicolettecborre@gmail.com', name: 'JuanLMS Support' },
            subject: 'Your JuanLMS Password Reset OTP',
            textContent: `Hello ${user.firstname || ''},\n\nYour OTP for password reset is: ${otp}\n\nIf you did not request this, please ignore this email.\n\nThank you,\nJuanLMS Team`
        };

        console.log('About to call Brevo sendTransacEmail...');

        try {
            const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
            console.log('OTP email sent to', user.personalemail, 'Result:', result);
        } catch (emailErr) {
            console.error('Error sending OTP email via Brevo:', emailErr);
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
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_PASS,
            },
        });

        transporter.verify(function(error, success) {
            if (error) {
                console.error('Nodemailer transporter error:', error);
                return res.status(500).json({ message: 'Nodemailer transporter error', error });
            } else {
                console.log('Nodemailer transporter is ready');
            }
        });

        await transporter.sendMail({
            from: `"JuanLMS Test" <${process.env.GMAIL_USER}>`,
            to: process.env.GMAIL_USER, // send to yourself for testing
            subject: 'JuanLMS Test Email',
            text: 'This is a test email from JuanLMS backend using Nodemailer and Gmail.',
        });
        console.log('Test email sent to', process.env.GMAIL_USER);
        return res.json({ message: 'Test email sent successfully.' });
    } catch (err) {
        console.error('Error sending test email:', err);
        return res.status(500).json({ message: 'Error sending test email', error: err });
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

    // Find user by personal email
    const user = await db.collection('users').findOne({ personalemail: personalemail.toLowerCase() });
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
    await db.collection('users').updateOne(
        { _id: user._id },
        { $set: { password: newPassword }, $unset: { resetOTP: '', resetOTPExpires: '' } }
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
    // Find user by personal email
    const user = await db.collection('users').findOne({ personalemail: personalemail.toLowerCase() });
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
        return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    // Compare hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match:', isMatch);
    if (!isMatch) {
        return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    // JWT Token Payload (adapt as needed)
    const token = jwt.sign({
        id: user._id,
        name: `${user.firstname} ${user.lastname}`,
        email: email, // original email
        phone: user.getDecryptedContactNo ? user.getDecryptedContactNo() : undefined,
        role: user.role,
        _id: user._id,
        profilePic: user.profilePic || null,
        userID: user.userID
    }, process.env.JWT_SECRET || "your_secret_key_here", { expiresIn: '1d' });

    res.json({ token });

    // Optionally, add audit log here if needed
});

// ------------------ UTILS ------------------

// Get user role from email domain
function getRoleFromEmail(email) {
    const normalized = email.toLowerCase();
    if (normalized.endsWith('@students.sjddef.edu.ph')) return 'students';
    if (normalized.endsWith('@parent.sjddef.edu.ph')) return 'parent';
    if (normalized.endsWith('@admin.sjddef.edu.ph')) return 'admin';
    if (normalized.endsWith('@director.sjddef.edu.ph')) return 'director';
    if (normalized.endsWith('@sjddef.edu.ph') && !normalized.includes('@students.') && !normalized.includes('@parent.') && !normalized.includes('@admin.') && !normalized.includes('@director.')) return 'faculty';
    return 'unknown';
}

// Convert string to Proper Case
function toProperCase(str) {
    return str
        .toLowerCase()
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

export default userRoutes;