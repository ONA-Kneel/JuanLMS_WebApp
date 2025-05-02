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

}
    let data = await db.collection("Users").updateOne({_id: new ObjectId(request.params.id)},mongoObject)
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
userRoutes.route("/login").post(async (request, response) => {
    const db = database.getDb();
    const { email, password } = request.body;

    // Look for user with matching email + password
    const user = await db.collection("Users").findOne({ email, password });

    if (user) {
        response.json({ success: true, role: getRoleFromEmail(email) });
    } else {
        response.status(401).json({ success: false, message: "Invalid email or password" });
    }
});

// Helper function to determine role based on email
function getRoleFromEmail(email) {
    if (email.endsWith('@students.sjddef.edu.ph')) return 'student';
    if (email.endsWith('@sjddef.edu.ph')) return 'faculty';
    if (email.endsWith('@parents.sjddef.edu.ph')) return 'parent';
    if (email.endsWith('@admin.sjddef.edu.ph')) return 'admin';
    return 'unknown';
}



export default userRoutes