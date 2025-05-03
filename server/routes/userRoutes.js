import e from "express";
import database from "../connect.cjs"
import { ObjectId } from "mongodb"


let userRoutes = e.Router()

// RetrieveALL
userRoutes.route("/users").get(async (request, response) => {
    let db = database.getDb()
    let data = await db.collection("Users").find({}).toArray()
    if (data.length > 0) {
        response.json(data)
    }
    else {
        throw new Error("Data was not found >:(")
    }
})
// ---------------------------------------------------------------

// RetrieveOne
userRoutes.route("/users/:id").get(async (request, response) => {
    let db = database.getDb()
    let data = await db.collection("Users").findOne({ _id: new ObjectId(request.params.id) })
    if (Object.keys(data).length > 0) {
        response.json(data)
    }
    else {
        throw new Error("Data was not found >:(")
    }
})
// ---------------------------------------------------------------

// CreateOne
userRoutes.route("/users").post(async (request, response) => {
    let db = database.getDb()
    let mongoObject = {
        firstname: request.body.firstname,
        middlename: request.body.middlename,
        lastname: request.body.lastname,
        email: request.body.email,
        contactno: request.body.contactno,
        password: request.body.password,
    }
    let data = await db.collection("Users").insertOne(mongoObject)
    response.json(data)
})
// ---------------------------------------------------------------

// UpdateOne
userRoutes.route("/users/:id").post(async (request, response) => {
    let db = database.getDb()
    let mongoObject = {
        $set: {
            firstname: request.body.firstname,
            middlename: request.body.middlename,
            lastname: request.body.lastname,
            email: request.body.email,
            contactno: request.body.contactno,
            password: request.body.password,
        }

    };
    let data = await db.collection("Users").updateOne({ _id: new ObjectId(request.params.id) }, mongoObject)
    response.json(data)
})
// ---------------------------------------------------------------

// DeleteOne
userRoutes.route("/users/:id").delete(async (request, response) => {
    let db = database.getDb()
    let data = await db.collection("Users").deleteOne({ _id: new ObjectId(request.params.id) })
    response.json(data)
})
// ---------------------------------------------------------------

// Login Route
userRoutes.post('/login', async (req, res) => {
    const db = database.getDb();
    const email = req.body.email.toLowerCase();  // normalize email
    const { password } = req.body;

    const user = await db.collection("Users").findOne({ email, password });

    if (user) {
        const firstName = toProperCase(user.firstname);
        const middleInitial = user.middlename ? toProperCase(user.middlename.charAt(0)) + '.' : '';
        const lastName = toProperCase(user.lastname);

        const fullName = [firstName, middleInitial, lastName].filter(Boolean).join(' ');

        res.json({
            success: true,
            role: getRoleFromEmail(email),
            name: fullName,
            email: user.email,
            phone: user.contactno
        });
    } else {
        res.status(401).json({ success: false, message: "Invalid email or password" });
    }
});

function getRoleFromEmail(email) {
    const normalizedEmail = email.toLowerCase();
    console.log('Checking role for email:', normalizedEmail);

    if (normalizedEmail.endsWith('@students.sjddef.edu.ph')) return 'student';
    if (normalizedEmail.endsWith('@parents.sjddef.edu.ph')) return 'parent';
    if (normalizedEmail.endsWith('@admin.sjddef.edu.ph')) return 'admin';
    if (normalizedEmail.endsWith('@director.sjddef.edu.ph')) return 'director';
    if (normalizedEmail.endsWith('@sjddef.edu.ph')) return 'faculty';

    return 'unknown';
}

function toProperCase(str) {
    return str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}




export default userRoutes