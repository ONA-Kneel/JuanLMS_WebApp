import { MongoClient, ObjectId } from "mongodb";

// Update this with your actual connection string and db name
const uri = "mongodb://localhost:27017";
const dbName = "JuanLMS";

async function inferRoleFromDetails(details, userName, userEmail) {
  // Try to infer from details or email
  if (!details && !userEmail) return null;
  if (details && details.includes("@students.sjddef.edu.ph")) return "student";
  if (details && details.includes("@parents.sjddef.edu.ph")) return "parent";
  if (details && details.includes("@admin.sjddef.edu.ph")) return "admin";
  if (details && details.includes("@director.sjddef.edu.ph")) return "director";
  if (details && details.includes("@sjddef.edu.ph")) return "faculty";
  // fallback: try from email
  if (userEmail && userEmail.endsWith("@students.sjddef.edu.ph")) return "student";
  if (userEmail && userEmail.endsWith("@parents.sjddef.edu.ph")) return "parent";
  if (userEmail && userEmail.endsWith("@admin.sjddef.edu.ph")) return "admin";
  if (userEmail && userEmail.endsWith("@director.sjddef.edu.ph")) return "director";
  if (userEmail && userEmail.endsWith("@sjddef.edu.ph")) return "faculty";
  return null;
}

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  const auditLogs = db.collection("AuditLogs");
  const users = db.collection("Users");

  // Process every log in the collection
  const cursor = auditLogs.find({});

  let updatedCount = 0;
  while (await cursor.hasNext()) {
    const log = await cursor.next();

    // Try to get user email from Users collection
    let userEmail = null;
    if (log.userId) {
      const user = await users.findOne({ _id: new ObjectId(log.userId) });
      if (user && user.email) userEmail = user.email;
    }

    const inferredRole = await inferRoleFromDetails(log.details, log.userName, userEmail);

    if (inferredRole && log.userRole !== inferredRole) {
      await auditLogs.updateOne(
        { _id: log._id },
        { $set: { userRole: inferredRole } }
      );
      updatedCount++;
      console.log(`Updated log ${log._id} with userRole: ${inferredRole}`);
    }
  }

  console.log(`Backfill complete. Updated ${updatedCount} logs.`);
  await client.close();
}

main().catch(console.error); 