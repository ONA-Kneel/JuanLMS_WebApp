// migrate_decrypt_auditlogs.js
// Run this script ONCE to update old AuditLog entries to use decrypted names/emails

import mongoose from 'mongoose';
import AuditLog from './models/AuditLog.js';
import User from './models/User.js';
import dotenv from 'dotenv';
import { decrypt } from './utils/encryption.js';
dotenv.config();

const MONGO_URI = process.env.ATLAS_URI || 'mongodb://localhost:27017/JuanLMS';

function safeDecrypt(val) {
  if (typeof val === 'string') {
    if (val.includes(':')) {
      try { return decrypt(val); } catch { return val; }
    }
    return val;
  }
  return '';
}

async function migrateAuditLogs() {
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');

  // Only update logs for Create Account and Archive Account
  const logs = await AuditLog.find({
    action: { $in: ['Create Account', 'Archive Account'] }
  });
  console.log(`Found ${logs.length} audit logs to update.`);

  let updated = 0;
  for (const log of logs) {
    const user = await User.findById(log.userId);
    if (!user) continue;
    // Decrypt fields
    const decryptedFirst = safeDecrypt(user.firstname);
    const decryptedLast = safeDecrypt(user.lastname);
    const decryptedEmail = safeDecrypt(user.email);
    // Update log
    log.userName = `${decryptedFirst} ${decryptedLast}`;
    if (log.action === 'Create Account') {
      log.details = `Created new ${user.role} account for ${decryptedEmail}`;
    } else if (log.action === 'Archive Account') {
      log.details = `Archived account for ${decryptedEmail}`;
    }
    await log.save();
    updated++;
  }
  console.log(`Updated ${updated} audit logs.`);
  await mongoose.disconnect();
  console.log('Migration complete.');
}

migrateAuditLogs().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
}); 