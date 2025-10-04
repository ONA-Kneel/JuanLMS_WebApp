# Temporary Users Cleanup Guide

## Problem
The system was creating temporary users with `TEMP-*` IDs and `@temp.com` emails when students couldn't be matched during auto-class creation. This caused:
- Database pollution with fake user records
- Classes containing references to temporary user IDs
- Data integrity issues

## Solution Implemented

### 1. Code Changes
We've updated the following files to prevent future temporary user creation:

#### `backend/server/routes/facultyAssignmentRoutes.js`
- ✅ Removed temporary user creation logic
- ✅ Added proper schoolID decryption before using in class members
- ✅ Added warnings when students can't be matched
- ✅ Ensures only real students with valid schoolIDs are added to classes

#### `backend/server/routes/userRoutes.js`
- ✅ Updated sync logic to decrypt schoolID before comparison
- ✅ Prioritizes `studentSchoolID` from assignments over user's schoolID

#### `backend/server/routes/studentAssignmentRoutes.js`
- ✅ Made `studentSchoolID` required for ALL assignments (not just manual ones)
- ✅ Updated validation for both single and bulk creation

### 2. Cleanup Script
Created `backend/cleanup_temp_users.js` to remove existing temporary data:
- Finds all users with `TEMP-*` IDs or `@temp.com` emails
- Removes them from all class member arrays
- Deletes temporary user records from database

## How to Run the Cleanup

### Step 1: Backup Your Database (IMPORTANT!)
Before running the cleanup, create a backup:
```bash
# If using MongoDB locally
mongodump --db juanlms --out ./backup_before_cleanup

# If using MongoDB Atlas or remote
# Use your MongoDB provider's backup tools
```

### Step 2: Run the Cleanup Script
```bash
cd backend
node cleanup_temp_users.js
```

### Step 3: Verify the Results
The script will show:
- Number of temporary users found
- List of temp users being removed
- Classes being updated
- Final summary

### Expected Output:
```
🔄 Connecting to MongoDB...
✅ Connected to MongoDB

🔍 Finding temporary users...
📊 Found X temporary users

📝 Temporary users to be removed:
  1. UserID: TEMP-1234567890-0, Email: temp.student.name@temp.com, Name: Student Name
  ...

🔍 Finding classes with temporary users...
📊 Found X classes with temporary users

🧹 Removing temporary users from classes...
  ✅ Class "Mathematics" (C123): Removed 2 temp user(s), 25 members remaining
  ...

🗑️ Deleting temporary users...
✅ Deleted X temporary users

✨ Cleanup completed successfully!
```

## What Happens After Cleanup

### ✅ Benefits:
1. **Clean Database**: No more temporary user records
2. **Valid Class Members**: Classes only contain real students with proper schoolIDs
3. **Data Integrity**: All student references are valid and traceable
4. **No Future Temp Users**: Code prevents creating new temporary users

### ⚠️ Important Notes:
1. **Students Must Have SchoolIDs**: When creating student assignments, you MUST provide a valid schoolID
2. **Unmatched Students**: If students can't be matched during class creation, they will be excluded with a warning
3. **Manual Intervention**: If unmatched students exist, you need to:
   - Ensure the student has a proper schoolID in student assignments
   - Re-sync the class or manually add the student

## How SchoolID Works Now

### Priority Order:
1. **`assignment.studentSchoolID`** (highest priority) - from StudentAssignment
2. **`student.schoolID`** (decrypted) - from User record
3. **`student.userID`** (fallback) - last resort

### Encryption Handling:
- SchoolIDs are **encrypted** in the database
- Code now properly **decrypts** schoolID before using it
- This prevents encrypted values from appearing in class members

## Validation Changes

### All Student Assignments Now Require SchoolID:
```javascript
// OLD: Only manual assignments required schoolID
if (!studentId && !studentSchoolID) { ... }

// NEW: ALL assignments require schoolID
if (!studentSchoolID) {
  return error: 'Student School ID is required for all assignments'
}
```

## Testing After Cleanup

1. **Check Classes in MongoDB Compass**:
   - Open any class document
   - Look at the `members` array
   - Should NOT see any `TEMP-*` IDs
   - Should see proper schoolIDs (e.g., "24-09015", "25-82673")

2. **Create a New Class**:
   - Assign faculty to a section
   - Auto-created class should only include students with valid schoolIDs
   - Check console logs for warnings about unmatched students

3. **Add Student Assignment**:
   - Try creating without schoolID → Should fail with validation error
   - Create with proper schoolID → Should succeed

## Rollback (If Needed)

If something goes wrong:
```bash
# Restore from backup
mongorestore --db juanlms ./backup_before_cleanup/juanlms
```

## Support

If you encounter issues:
1. Check the console logs for error messages
2. Verify MongoDB connection is working
3. Ensure all environment variables are set correctly
4. Check that students have valid schoolIDs in StudentAssignment collection

---

**Date Created**: October 4, 2025  
**Last Updated**: October 4, 2025

