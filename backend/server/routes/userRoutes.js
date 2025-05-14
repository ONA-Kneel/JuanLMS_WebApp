//routes/userRoutes.js
import e from "express";
import database from "../connect.cjs";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
// import bcrypt from "bcryptjs"; // If you want to use hashing in the future

const userRoutes = e.Router();
const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key_here"; // 👈 use env variable in production

// ------------------ CRUD ROUTES ------------------

// Search students by name (must be before /users/:id)
userRoutes.get("/users/search", async (req, res) => {
    const db = database.getDb();
    const query = req.query.q || "";
    const users = await db.collection("Users").find({
        role: "student",
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

// Retrieve ALL
userRoutes.get("/users", async (req, res) => {
    const db = database.getDb();
    const data = await db.collection("Users").find({}).toArray();
    if (data.length > 0) {
        res.json(data);
    } else {
        throw new Error("Data was not found >:(");
    }
});

// RetrieveOne
userRoutes.route("/users/:id").get(async (request, response) => {
    let db = database.getDb()
    let data = await db.collection("Users").findOne({ _id: new ObjectId(request.params.id) });

    if (data) {
        response.json(data);
    } else {
        response.status(404).json({ error: "User not found" });
    }

});

// Create ONE (with role)
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


// UpdateOne
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

// Delete ONE
userRoutes.delete("/users/:id", async (req, res) => {
    const db = database.getDb();
    const result = await db.collection("Users").deleteOne({ _id: new ObjectId(req.params.id) });
    res.json(result);
});

// Change password route
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

// ------------------ JWT LOGIN ROUTE ------------------

userRoutes.post('/login', async (req, res) => {
    const db = database.getDb();
    const email = req.body.email.toLowerCase();
    const { password } = req.body;

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

        res.json({ token }); // ✅ frontend will decode this

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

function getRoleFromEmail(email) {
    const normalized = email.toLowerCase();
    if (normalized.endsWith('@student.sjddef.edu.ph')) return 'student';
    if (normalized.endsWith('@parents.sjddef.edu.ph')) return 'parent';
    if (normalized.endsWith('@admin.sjddef.edu.ph')) return 'admin';
    if (normalized.endsWith('@director.sjddef.edu.ph')) return 'director';
    if (normalized.endsWith('@sjddef.edu.ph')) return 'faculty';
    return 'unknown';
}

function toProperCase(str) {
    return str
        .toLowerCase()
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

export default userRoutes;