import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Class from './models/Class.js';
import User from './models/User.js';
import { ObjectId } from 'mongodb';

dotenv.config({ path: './config.env' });

async function normalizeMembersForAllClasses() {
  await mongoose.connect(process.env.ATLAS_URI);
  console.log('Connected to MongoDB');

  const classes = await Class.find();
  let updatedCount = 0;

  for (const cls of classes) {
    const before = Array.isArray(cls.members) ? [...cls.members] : [];
    const normalized = await normalizeMemberIdentifiers(before);
    // Only update if changed
    if (JSON.stringify(before.sort()) !== JSON.stringify([...normalized].sort())) {
      cls.members = normalized;
      await cls.save();
      updatedCount += 1;
      console.log(`Updated class ${cls.classID} members -> count=${normalized.length}`);
    }
  }

  console.log(`Done. Updated ${updatedCount} class document(s).`);
  await mongoose.disconnect();
}

async function normalizeMemberIdentifiers(rawMembers) {
  if (!rawMembers || !Array.isArray(rawMembers)) return [];
  const results = [];
  for (const candidate of rawMembers) {
    if (!candidate) continue;
    if (typeof candidate === 'string' && !ObjectId.isValid(candidate)) {
      results.push(candidate);
      continue;
    }
    try {
      const idString = typeof candidate === 'string' ? candidate : String(candidate);
      if (ObjectId.isValid(idString)) {
        const user = await User.findById(idString);
        if (user && user.userID) {
          results.push(user.userID);
        }
      }
    } catch {
      // ignore failures
    }
  }
  return Array.from(new Set(results));
}

normalizeMembersForAllClasses()
  .catch(err => {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  });


