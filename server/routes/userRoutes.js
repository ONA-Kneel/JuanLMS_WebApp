import e from "express";
import database from "../connect.cjs";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";

const userRoutes = e.Router();
const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key_here"; // 👈 use env variable in production

// ------------------ CRUD ROUTES ------------------

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

// Retrieve ONE
userRoutes.get("/users/:id", async (req, res) => {
    const db = database.getDb();
    const data = await db.collection("Users").findOne({ _id: new ObjectId(req.params.id) });
    if (data) {
        res.json(data);
    } else {
        throw new Error("Data was not found >:(");
    }
});

// Create ONE
userRoutes.post("/users", async (req, res) => {
    const db = database.getDb();
    const mongoObject = {
        firstname: req.body.firstname,
        middlename: req.body.middlename,
        lastname: req.body.lastname,
        email: req.body.email.toLowerCase(),
        contactno: req.body.contactno,
        password: req.body.password, // 🔐 optionally hash this
    };
    const result = await db.collection("Users").insertOne(mongoObject);
    res.json(result);
});

// Update ONE
userRoutes.post("/users/:id", async (req, res) => {
    const db = database.getDb();
    const updateObject = {
        $set: {
            firstname: req.body.firstname,
            middlename: req.body.middlename,
            lastname: req.body.lastname,
            email: req.body.email.toLowerCase(),
            contactno: req.body.contactno,
            password: req.body.password,
        },
    };
    const result = await db.collection("Users").updateOne({ _id: new ObjectId(req.params.id) }, updateObject);
    res.json(result);
});

// Delete ONE
userRoutes.delete("/users/:id", async (req, res) => {
    const db = database.getDb();
    const result = await db.collection("Users").deleteOne({ _id: new ObjectId(req.params.id) });
    res.json(result);
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
        }, JWT_SECRET, { expiresIn: '1d' });

        res.json({ token }); // ✅ frontend will decode this
    } else {
        res.status(401).json({ success: false, message: "Invalid email or password" });
    }
});

// ------------------ UTILS ------------------

function getRoleFromEmail(email) {
    const normalized = email.toLowerCase();
    if (normalized.endsWith('@students.sjddef.edu.ph')) return 'student';
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