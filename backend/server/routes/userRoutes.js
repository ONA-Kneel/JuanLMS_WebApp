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
const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key_here"; // 👈 use env variable in production

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
      nickname: user.getDecryptedNickname ? user.getDecryptedNickname() : user.nickname,
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
        nickname: user.getDecryptedNickname ? user.getDecryptedNickname() : user.nickname,
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
            nickname: user.getDecryptedNickname ? user.getDecryptedNickname() : user.nickname,
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
            nickname: user.getDecryptedNickname ? user.getDecryptedNickname() : user.nickname,
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
userRoutes.route("/users/:id").get(async (req, res) => {
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
            nickname: user.getDecryptedNickname ? user.getDecryptedNickname() : user.nickname,
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

        // Send welcome email via Brevo (Sendinblue)
        try {
            let defaultClient = SibApiV3Sdk.ApiClient.instance;
            let apiKey = defaultClient.authentications['api-key'];
            apiKey.apiKey = process.env.BREVO_API_KEY;

            let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

            let sendSmtpEmail = {
                to: [{ email: personalemail, name: firstname || '' }],
                sender: { email: 'juanlms.sjddefi@gmail.com', name: 'JuanLMS Support' },
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
    // Send OTP via Brevo (Sendinblue)
    let defaultClient = SibApiV3Sdk.ApiClient.instance;
    let apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = process.env.BREVO_API_KEY;
    let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    let sendSmtpEmail = {
        to: [{ email: decryptedPersonalEmail, name: user.firstname || '' }],
        sender: { email: 'juanlms.sjddefi@gmail.com', name: 'JuanLMS Support' },
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

    const genericMsg = 'If your email is registered, a reset link or OTP has been sent to your personal email.';

    try {
        // Find user by personalemailHash
        const emailHash = crypto.createHash('sha256').update(email.toLowerCase()).digest('hex');
        const user = await db.collection('users').findOne({ personalemailHash: emailHash });
        console.log('User found:', user);
        if (!user || !user.personalemail) {
            console.log('User not found or missing personalemail');
            return res.json({ message: genericMsg });
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

        // --- Send OTP via Brevo (Sendinblue) ---
        let defaultClient = SibApiV3Sdk.ApiClient.instance;
        let apiKey = defaultClient.authentications['api-key'];
        apiKey.apiKey = process.env.BREVO_API_KEY;

        let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

        // Use a plain object for sendSmtpEmail
        let sendSmtpEmail = {
            to: [{ email: decryptedPersonalEmail, name: user.firstname || '' }],
            sender: { email: 'juanlms.sjddefi@gmail.com', name: 'JuanLMS Support' },
            subject: 'Your JuanLMS Password Reset OTP',
            textContent: `Hello ${user.firstname || ''},\n\nYour OTP for password reset is: ${otp}\n\nIf you did not request this, please ignore this email.\n\nThank you,\nJuanLMS Team`
        };

        console.log('About to call Brevo sendTransacEmail...');

        try {
            const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
            console.log('OTP email sent to', decryptedPersonalEmail, 'Result:', result);
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
        return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    // Check if user is archived
    if (user.isArchived) {
        return res.status(403).json({ success: false, message: "Account is archived. Please contact admin." });
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
        schoolID: user.getDecryptedSchoolID ? user.getDecryptedSchoolID() : user.schoolID,
        role: user.role,
        _id: user._id,
        profilePic: user.profilePic || null,
        userID: user.userID
    }, process.env.JWT_SECRET || "your_secret_key_here", { expiresIn: '1d' });

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

// ------------------ NICKNAME ROUTES ------------------

// Get user's nickname
userRoutes.get('/users/:id/nickname', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const nickname = user.getDecryptedNickname ? user.getDecryptedNickname() : user.nickname;
    res.json({ nickname });
  } catch (error) {
    console.error('Error fetching nickname:', error);
    res.status(500).json({ error: 'Failed to fetch nickname' });
  }
});

// Update user's nickname
userRoutes.patch('/users/:id/nickname', authenticateToken, async (req, res) => {
  try {
    const { nickname } = req.body;
    
    // Validate that the user is updating their own nickname or is an admin
    if (req.user._id !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only update your own nickname' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Validate nickname length
    if (nickname && nickname.length > 50) {
      return res.status(400).json({ error: 'Nickname must be 50 characters or less' });
    }

    user.nickname = nickname;
    await user.save();

    // Return the updated nickname
    const updatedNickname = user.getDecryptedNickname ? user.getDecryptedNickname() : user.nickname;
    res.json({ nickname: updatedNickname, message: 'Nickname updated successfully' });
  } catch (error) {
    console.error('Error updating nickname:', error);
    res.status(500).json({ error: 'Failed to update nickname' });
  }
});

// Get all users with nicknames (for chat display)
userRoutes.get('/users/with-nicknames', authenticateToken, async (req, res) => {
  try {
    const users = await User.find({ isArchived: { $ne: true } });
    
    const usersWithNicknames = users.map(user => ({
      _id: user._id,
      firstname: user.getDecryptedFirstname ? user.getDecryptedFirstname() : user.firstname,
      lastname: user.getDecryptedLastname ? user.getDecryptedLastname() : user.lastname,
      nickname: user.getDecryptedNickname ? user.getDecryptedNickname() : user.nickname,
      role: user.role,
      profilePic: user.getDecryptedProfilePic ? user.getDecryptedProfilePic() : user.profilePic,
    }));

    res.json(usersWithNicknames);
  } catch (error) {
    console.error('Error fetching users with nicknames:', error);
    res.status(500).json({ error: 'Failed to fetch users with nicknames' });
  }
});

// ------------------ PER-CONTACT NICKNAME ROUTES ------------------

// Get nickname for a specific contact
userRoutes.get('/users/:userId/contacts/:contactId/nickname', authenticateToken, async (req, res) => {
  try {
    const { userId, contactId } = req.params;
    
    // Validate that the user is requesting their own contact nicknames
    if (req.user._id !== userId) {
      return res.status(403).json({ error: 'You can only view your own contact nicknames' });
    }

    const UserContactNickname = (await import('../models/UserContactNickname.js')).default;
    const nicknameRecord = await UserContactNickname.findOne({ userId, contactId });
    
    if (!nicknameRecord) {
      return res.json({ nickname: null });
    }

    const nickname = nicknameRecord.getDecryptedNickname ? nicknameRecord.getDecryptedNickname() : nicknameRecord.nickname;
    res.json({ nickname });
  } catch (error) {
    console.error('Error fetching contact nickname:', error);
    res.status(500).json({ error: 'Failed to fetch contact nickname' });
  }
});

// Set or update nickname for a specific contact
userRoutes.patch('/users/:userId/contacts/:contactId/nickname', authenticateToken, async (req, res) => {
  try {
    const { userId, contactId } = req.params;
    const { nickname } = req.body;
    
    // Validate that the user is updating their own contact nicknames
    if (req.user._id !== userId) {
      return res.status(403).json({ error: 'You can only update your own contact nicknames' });
    }

    // Validate nickname length
    if (nickname && nickname.length > 50) {
      return res.status(400).json({ error: 'Nickname must be 50 characters or less' });
    }

    const UserContactNickname = (await import('../models/UserContactNickname.js')).default;
    
    // Check if contact exists
    const contact = await User.findById(contactId);
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Check if user is trying to set nickname for themselves
    if (userId === contactId) {
      return res.status(400).json({ error: 'You cannot set a nickname for yourself' });
    }

    let nicknameRecord = await UserContactNickname.findOne({ userId, contactId });
    
    if (nicknameRecord) {
      // Update existing nickname
      nicknameRecord.nickname = nickname;
      await nicknameRecord.save();
    } else {
      // Create new nickname record
      nicknameRecord = new UserContactNickname({
        userId,
        contactId,
        nickname
      });
      await nicknameRecord.save();
    }

    // Return the updated nickname
    const updatedNickname = nicknameRecord.getDecryptedNickname ? nicknameRecord.getDecryptedNickname() : nicknameRecord.nickname;
    res.json({ nickname: updatedNickname, message: 'Contact nickname updated successfully' });
  } catch (error) {
    console.error('Error updating contact nickname:', error);
    res.status(500).json({ error: 'Failed to update contact nickname' });
  }
});

// Delete nickname for a specific contact
userRoutes.delete('/users/:userId/contacts/:contactId/nickname', authenticateToken, async (req, res) => {
  try {
    const { userId, contactId } = req.params;
    
    // Validate that the user is deleting their own contact nicknames
    if (req.user._id !== userId) {
      return res.status(403).json({ error: 'You can only delete your own contact nicknames' });
    }

    const UserContactNickname = (await import('../models/UserContactNickname.js')).default;
    const nicknameRecord = await UserContactNickname.findOneAndDelete({ userId, contactId });
    
    if (!nicknameRecord) {
      return res.status(404).json({ error: 'Contact nickname not found' });
    }

    res.json({ message: 'Contact nickname deleted successfully' });
  } catch (error) {
    console.error('Error deleting contact nickname:', error);
    res.status(500).json({ error: 'Failed to delete contact nickname' });
  }
});

// Get all contact nicknames for a user
userRoutes.get('/users/:userId/contacts/nicknames', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Validate that the user is requesting their own contact nicknames
    if (req.user._id !== userId) {
      return res.status(403).json({ error: 'You can only view your own contact nicknames' });
    }

    const UserContactNickname = (await import('../models/UserContactNickname.js')).default;
    const nicknameRecords = await UserContactNickname.find({ userId }).populate('contactId', 'firstname lastname role profilePic');
    
    const nicknames = nicknameRecords.map(record => ({
      contactId: record.contactId._id,
      contactName: `${record.contactId.firstname || ''} ${record.contactId.lastname || ''}`.trim(),
      contactRole: record.contactId.role,
      contactProfilePic: record.contactId.profilePic,
      nickname: record.getDecryptedNickname ? record.getDecryptedNickname() : record.nickname
    }));

    res.json(nicknames);
  } catch (error) {
    console.error('Error fetching contact nicknames:', error);
    res.status(500).json({ error: 'Failed to fetch contact nicknames' });
  }
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
    if (normalized.endsWith('@students.sjddef.edu.ph')) return 'students';
    if (normalized.endsWith('@VPE.sjddef.edu.ph')) return 'vice president of education';
    if (normalized.endsWith('@admin.sjddef.edu.ph')) return 'admin';
    if (normalized.endsWith('@principal.sjddef.edu.ph')) return 'principal';
    if (normalized.endsWith('@sjddef.edu.ph') && !normalized.includes('@students.') && !normalized.includes('@parent.') && !normalized.includes('@admin.') && !normalized.includes('@principal.')) return 'faculty';
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