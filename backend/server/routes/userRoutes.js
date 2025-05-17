//routes/userRoutes.js
// Handles user CRUD, authentication, password reset (with OTP), and email sending for JuanLMS.
// Uses JWT for login, Brevo for OTP email, and MongoDB for user storage.

import e from "express";
import database from "../connect.cjs";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import nodemailer from 'nodemailer';
import SibApiV3Sdk from 'sib-api-v3-sdk';
// import bcrypt from "bcryptjs"; // If you want to use hashing in the future

const userRoutes = e.Router();
const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key_here"; // 👈 use env variable in production

// ------------------ CRUD ROUTES ------------------

// Search students by name (must be before /users/:id)
userRoutes.get("/users/search", async (req, res) => {
    const db = database.getDb();
    const query = req.query.q || "";
    const users = await db.collection("Users").find({
        role: "students",
        $or: [
            { firstname: { $regex: query, $options: "i" } },
            { middlename: { $regex: query, $options: "i" } },
            { lastname: { $regex: query, $options: "i" } },
        ],
    }).toArray();
    if (users.length > 0) {
        res.json(users);
    } else {
        res.json([]);
    }
});

// Retrieve ALL users
userRoutes.get("/users", async (req, res) => {
    const db = database.getDb();
    const data = await db.collection("Users").find({}).toArray();
    if (data.length > 0) {
        res.json(data);
    } else {
        throw new Error("Data was not found >:(");
    }
});

// Retrieve ONE user by ID
userRoutes.route("/users/:id").get(async (request, response) => {
    let db = database.getDb()
    let data = await db.collection("Users").findOne({ _id: new ObjectId(request.params.id) });

    if (data) {
        response.json(data);
    } else {
        response.status(404).json({ error: "User not found" });
    }

});

// Create ONE user (with role)
userRoutes.post("/users", async (req, res) => {
    const db = database.getDb();

    const {
        firstname,
        middlename,
        lastname,
        email,
        contactno,
        password,
        personalemail,
        profilePic,
        role,   // ✅ <-- accept role
        userID
    } = req.body;

    // Simple server-side validation (backend safety)
    if (!firstname || !lastname || !email || !password || !role) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const mongoObject = {
        firstname,
        middlename,
        lastname,
        email: email.toLowerCase(),
        contactno,
        password, // (✅ you'll hash later)
        personalemail,
        profilePic,
        role, // ✅ <-- save role
        userID
    };

    try {
        const result = await db.collection("Users").insertOne(mongoObject);
        res.status(201).json({ success: true, result });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create user" });
    }
});

// Update ONE user
userRoutes.route("/users/:id").patch(async (req, res) => {

    let db = database.getDb()
    let mongoObject = {
        $set: {
            firstname: req.body.firstname,
            middlename: req.body.middlename,
            lastname: req.body.lastname,
            email: req.body.email.toLowerCase(),
            contactno: req.body.contactno,
            password: req.body.password,
            personalemail: req.body.personalemail,
            profilePic: req.body.profilePic, 
            userID: req.body.userID
        },
    };
    const result = await db.collection("Users").updateOne({ _id: new ObjectId(req.params.id) }, mongoObject);
    res.json(result);
});

// Delete ONE user
userRoutes.delete("/users/:id", async (req, res) => {
    const db = database.getDb();
    const result = await db.collection("Users").deleteOne({ _id: new ObjectId(req.params.id) });
    res.json(result);
});

// ------------------ PASSWORD CHANGE/RESET ------------------

// Change password route (requires current password)
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

  const user = await db.collection("Users").findOne({ _id: new ObjectId(userId) });
  if (!user) return res.status(404).json({ error: "User not found." });

  // If you already hash passwords, use bcrypt.compare
  const isMatch = user.password === currentPassword; // Replace with bcrypt.compare if hashed
  // const isMatch = await bcrypt.compare(currentPassword, user.password);

  if (!isMatch) {
    return res.status(400).json({ error: "Current password is incorrect." });
  }

  // Hash the new password before saving (recommended)
  // const hashedPassword = await bcrypt.hash(newPassword, 10);
  // await db.collection("Users").updateOne({ _id: new ObjectId(userId) }, { $set: { password: hashedPassword } });
  await db.collection("Users").updateOne({ _id: new ObjectId(userId) }, { $set: { password: newPassword } });

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
        const user = await db.collection('Users').findOne({ personalemail: email.toLowerCase() });
        console.log('User found:', user);
        if (!user || !user.personalemail) {
            console.log('User not found or missing personalemail');
            return res.json({ message: genericMsg });
        }

        // --- Generate OTP and expiry ---
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes

        // Store OTP and expiry in user document
        await db.collection('Users').updateOne(
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
    const user = await db.collection('Users').findOne({ personalemail: personalemail.toLowerCase() });
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
    await db.collection('Users').updateOne(
        { _id: user._id },
        { $set: { password: newPassword }, $unset: { resetOTP: '', resetOTPExpires: '' } }
    );

    res.json({ message: 'Password reset successful. You can now log in with your new password.' });
});

// ------------------ JWT LOGIN ROUTE ------------------

// Login route: issues JWT on success, logs audit trail
userRoutes.post('/login', async (req, res) => {
    const db = database.getDb();
    const email = req.body.email.toLowerCase();
    const { password } = req.body;

    // Find user by email and password
    const user = await db.collection("Users").findOne({ email, password });

    if (user) {
        const firstName = toProperCase(user.firstname);
        const middleInitial = user.middlename ? toProperCase(user.middlename.charAt(0)) + '.' : '';
        const lastName = toProperCase(user.lastname);
        const fullName = [firstName, middleInitial, lastName].filter(Boolean).join(' ');
        const role = getRoleFromEmail(email);

        // ✅ JWT Token Payload
        const token = jwt.sign({
            id: user._id,
            name: fullName,
            email: user.email,
            phone: user.contactno,
            role: role,
            _id: user._id, // Include user ID
            profilePic: user.profilePic || null, // Include profile picture
            userID: user.userID
        }, JWT_SECRET, { expiresIn: '1d' });

        res.json({ token });

        // --- Audit log for login (native driver) ---
        try {
            await db.collection('AuditLogs').insertOne({
                userId: user._id,
                userName: `${user.firstname} ${user.lastname}`,
                action: 'Login',
                details: `User ${user.email} logged in.`,
                ipAddress: req.ip || req.connection.remoteAddress,
                timestamp: new Date()
            });
        } catch (err) {
            console.error('Failed to log audit trail:', err);
        }
        // --- End audit log ---
    } else {
        res.status(401).json({ success: false, message: "Invalid email or password" });
    }
});

// ------------------ UTILS ------------------

// Get user role from email domain
function getRoleFromEmail(email) {
    const normalized = email.toLowerCase();
    if (normalized.endsWith('@students.sjddef.edu.ph')) return 'students';
    if (normalized.endsWith('@parents.sjddef.edu.ph')) return 'parent';
    if (normalized.endsWith('@admin.sjddef.edu.ph')) return 'admin';
    if (normalized.endsWith('@director.sjddef.edu.ph')) return 'director';
    if (normalized.endsWith('@sjddef.edu.ph')) return 'faculty';
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