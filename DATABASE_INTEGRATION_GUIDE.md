# Database Integration Guide for Semestral_Grades_Collection

## 🎯 **Overview**
This document outlines the database integration requirements for storing and retrieving student grades using the `Semestral_Grades_Collection` in MongoDB.

## 🗄️ **Database Collection Structure**

### **Collection Name**: `Semestral_Grades_Collection`

### **Document Schema**:
```javascript
{
  _id: ObjectId,                    // MongoDB auto-generated ID
  studentId: String,                // Internal student ID from students collection
  schoolID: String,                 // Student's school ID number (PRIMARY IDENTIFIER)
  studentName: String,              // Full name of the student
  subjectCode: String,              // Subject code (e.g., "INT-CK-25")
  subjectName: String,              // Subject name (e.g., "Introduction to Cooking")
  classID: String,                  // Class ID from classes collection
  section: String,                  // Section name (e.g., "A", "B", "STEM")
  academicYear: String,             // Academic year (e.g., "2024-2025")
  termName: String,                 // Term name (e.g., "Term 1", "Term 2")
  facultyID: String,                // Faculty ID who created/updated the grades
  grades: {
    quarter1: String,               // First quarter grade (0-100)
    quarter2: String,               // Second quarter grade (0-100)
    quarter3: String,               // Third quarter grade (0-100)
    quarter4: String,               // Fourth quarter grade (0-100)
    semesterFinal: String,          // Calculated semester final grade
    remarks: String                 // Remarks (PASSED, FAILED, REPEAT, INCOMPLETE)
  },
  isLocked: Boolean,                // Whether grades can be edited (true = locked)
  timestamp: Date,                  // When grades were first created
  lastUpdated: Date                 // When grades were last modified
}
```

## 🔐 **Security Requirements**

### **Data Hashing**:
- **Student ID**: Hash using bcrypt or similar encryption
- **Grades**: Hash individual grade values
- **Personal Information**: Hash student names and school IDs
- **Timestamps**: Keep as-is for audit purposes

### **Access Control**:
- **Faculty**: Can only access grades for their own classes
- **Students**: Can only access their own grades using schoolID
- **Admin**: Can access all grades for administrative purposes

## 🌐 **Required API Endpoints**

### **1. Save Individual Student Grades**
```
POST /api/semestral-grades/save
```
**Purpose**: Save grades for a single student
**Body**: Single grade document as per schema above
**Response**: Success confirmation with saved document ID

### **2. Save Bulk Grades**
```
POST /api/semestral-grades/save-bulk
```
**Purpose**: Save grades for multiple students in a class
**Body**: Array of grade documents
**Response**: Success confirmation with count of saved documents

### **3. Get Student Grades**
```
GET /api/semestral-grades/student/:schoolID?termName=:term&academicYear=:year
```
**Purpose**: Retrieve grades for a specific student
**Parameters**: 
- `schoolID`: Student's school ID number (PRIMARY IDENTIFIER)
- `termName`: Current term (e.g., "Term 1")
- `academicYear`: Academic year (e.g., "2024-2025")
**Response**: Array of grade documents for the student

### **4. Get Class Grades**
```
GET /api/semestral-grades/class/:classID?termName=:term&academicYear=:year
```
**Purpose**: Retrieve all grades for a specific class
**Parameters**:
- `classID`: Class ID from classes collection
- `termName`: Current term
- `academicYear`: Academic year
**Response**: Array of grade documents for all students in the class

### **5. Update Grades**
```
PUT /api/semestral-grades/:gradeID
```
**Purpose**: Update existing grades (only if not locked)
**Body**: Updated grade document
**Response**: Success confirmation with updated document

### **6. Delete Grades**
```
DELETE /api/semestral-grades/:gradeID
```
**Purpose**: Delete grade records (admin only)
**Response**: Success confirmation

## 🔄 **Data Flow**

### **Faculty Saving Grades**:
1. Faculty enters grades in Individual Student Grade Management
2. Clicks "Save Student Grades" → calls `/api/semestral-grades/save`
3. Grades saved to `Semestral_Grades_Collection` using `schoolID`
4. Grades marked as `isLocked: true`
5. Grades appear in Report on Learning Progress and Achievement table

### **Faculty Posting All Grades**:
1. Faculty clicks "Post Grades" → calls `/api/semestral-grades/save-bulk`
2. All student grades for the class saved to database using `schoolID`
3. All grades marked as `isLocked: true`
4. Grades visible to students immediately

### **Student Viewing Grades**:
1. Student navigates to Grades page
2. System calls `/api/semestral-grades/student/:schoolID`
3. Grades retrieved from `Semestral_Grades_Collection` using `schoolID`
4. Grades displayed in student dashboard

## 🚨 **Important Notes**

### **ID Consistency - SCHOOL ID ONLY**:
- **Faculty saves** using `student.schoolID` (school registration number)
- **Students read** using `localStorage.getItem('schoolID')` (same school ID)
- **Both use the same identifier**: `schoolID` (e.g., "123332123123")
- **No more ID discrepancies** between faculty and student views

### **Data Persistence**:
- Grades are **permanently stored** in MongoDB
- No more reliance on localStorage
- Data survives page refreshes and browser restarts
- Proper backup and recovery possible

### **Error Handling**:
- Network failures show user-friendly error messages
- Database connection issues logged for debugging
- Fallback to traditional grades endpoint if available

## 🧪 **Testing**

### **Database Connection Test**:
- Use the "Test Database Connection" button in debug sections
- Tests API endpoint availability
- Shows detailed error messages if endpoints not implemented

### **Expected Behavior**:
- **Before Implementation**: Shows "endpoint not implemented" error
- **After Implementation**: Shows successful response with grade data
- **Network Issues**: Shows connection error messages

## 📋 **Implementation Checklist**

- [ ] Create `Semestral_Grades_Collection` in MongoDB
- [ ] Implement data hashing for sensitive fields
- [ ] Create `/api/semestral-grades/save` endpoint
- [ ] Create `/api/semestral-grades/save-bulk` endpoint
- [ ] Create `/api/semestral-grades/student/:schoolID` endpoint
- [ ] Create `/api/semestral-grades/class/:id` endpoint
- [ ] Implement proper access control and authentication
- [ ] Test grade saving and retrieval using schoolID
- [ ] Verify ID matching between faculty and student views
- [ ] Test data persistence across page refreshes

## 🔧 **Backend Implementation Example**

```javascript
// Example MongoDB schema (using Mongoose)
const semestralGradeSchema = new mongoose.Schema({
  studentId: { type: String, required: true, index: true },
  schoolID: { type: String, required: true, index: true }, // PRIMARY IDENTIFIER
  studentName: { type: String, required: true },
  subjectCode: { type: String, required: true },
  subjectName: { type: String, required: true },
  classID: { type: String, required: true, index: true },
  section: { type: String, required: true },
  academicYear: { type: String, required: true, index: true },
  termName: { type: String, required: true, index: true },
  facultyID: { type: String, required: true, index: true },
  grades: {
    quarter1: { type: String, default: '' },
    quarter2: { type: String, default: '' },
    quarter3: { type: String, default: '' },
    quarter4: { type: String, default: '' },
    semesterFinal: { type: String, default: '' },
    remarks: { type: String, default: '' }
  },
  isLocked: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now },
  lastUpdated: { type: Date, default: Date.now }
});

// Create compound indexes for efficient queries
semestralGradeSchema.index({ schoolID: 1, termName: 1, academicYear: 1 });
semestralGradeSchema.index({ classID: 1, termName: 1, academicYear: 1 });
semestralGradeSchema.index({ facultyID: 1, termName: 1, academicYear: 1 });
```

## ✅ **Key Changes Made**

### **Eliminated ID Discrepancies**:
- **Before**: Used `userID` (login ID) and `schoolID` inconsistently
- **After**: Uses `schoolID` consistently across all operations
- **Result**: No more ID mismatch between faculty saving and student reading

### **Simplified Data Flow**:
1. **Faculty**: Saves grades using `student.schoolID`
2. **Database**: Stores grades with `schoolID` as primary identifier
3. **Student**: Retrieves grades using same `schoolID`
4. **Result**: Perfect ID matching, grades display correctly

This integration ensures secure, persistent, and properly structured grade storage with **consistent schoolID usage** between faculty and student views.
