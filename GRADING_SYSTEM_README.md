# Excel Grading System

## Overview
The Excel Grading System is a feature that allows faculty members to upload Excel files containing student grades for their assignments. The system provides a user-friendly interface for downloading templates, uploading filled grade sheets, and managing grading data.

## Features

### 1. Excel Template Generation
- Faculty can download pre-filled Excel templates with student names
- Templates include columns for Student Name, Grade, and Feedback
- Automatic population of enrolled students for the selected section

### 2. Excel File Upload
- Support for .xlsx, .xls, and .csv file formats
- File size limit: 5MB
- Real-time validation of uploaded files

### 3. Data Validation
- Validates Excel file format and structure
- Checks for required headers (Student Name, Grade, Feedback)
- Validates grade values (0-100 range)
- Verifies student existence in database
- Confirms student enrollment in the selected section

### 4. Grade Management
- Stores grading data with metadata (faculty, assignment, section, etc.)
- Updates existing submissions with grades and feedback
- Tracks upload history and status
- Allows deletion of grading data

### 5. User Interface
- Tabbed interface in Faculty Grades page
- Assignment and section selection
- Real-time feedback and error messages
- Success notifications
- Loading states and progress indicators

## How to Use (For Faculty)

### Step 1: Access the Grading System
1. Navigate to the Faculty Grades page
2. Click on the "Excel Grading System" tab

### Step 2: Select Assignment and Section
1. Choose an assignment from the left panel
2. Select a section from the available options
3. The system will load existing grading data for the selection

### Step 3: Download Template
1. Click "Download Excel Template"
2. The template will include all enrolled students for the selected section
3. Fill in the grades and feedback in the downloaded file

### Step 4: Upload Grades
1. Click "Choose File" and select your filled Excel file
2. Click "Upload Grades" to process the file
3. Review any validation messages or errors
4. Confirm successful upload

### Step 5: Manage Grading Data
- View uploaded grading data in the table below
- Delete grading data if needed (with confirmation)
- Track upload history and status

## File Format Requirements

### Excel Template Structure
```
| Student Name | Grade | Feedback |
|-------------|-------|----------|
| John Doe    | 85    | Good work |
| Jane Smith  | 92    | Excellent |
```

### Required Headers
- **Student Name**: Full name of the student
- **Grade**: Numeric grade (0-100)
- **Feedback**: Optional text feedback

### Validation Rules
- Grade must be a number between 0 and 100
- Student name must match a student in the database
- Student must be enrolled in the selected section
- File must have the correct header structure

## API Endpoints

### Backend Routes (`/api/grading`)

#### GET `/assignments/:facultyId`
- Fetches faculty assignments for grading
- Requires authentication

#### GET `/section/:sectionId/students`
- Gets students for a specific section
- Query parameters: sectionName, trackName, strandName, gradeLevel, schoolYear, termName

#### GET `/template/:assignmentId`
- Downloads Excel template for an assignment
- Query parameters: section details

#### POST `/upload/:assignmentId`
- Uploads and processes Excel file
- Multipart form data with file and section details

#### GET `/data/:assignmentId`
- Fetches grading data for an assignment
- Requires authentication

#### DELETE `/data/:gradingDataId`
- Deletes grading data
- Requires authentication

## Database Schema

### GradingData Model
```javascript
{
  facultyId: ObjectId,
  assignmentId: ObjectId,
  sectionName: String,
  trackName: String,
  strandName: String,
  gradeLevel: String,
  schoolYear: String,
  termName: String,
  grades: [{
    studentId: ObjectId,
    studentName: String,
    grade: Number,
    feedback: String,
    submittedAt: Date
  }],
  excelFileName: String,
  uploadedAt: Date,
  status: String,
  errorMessage: String
}
```

## Error Handling

### Validation Errors
- Invalid file format
- Missing required headers
- Invalid grade values
- Student not found
- Student not enrolled in section

### System Errors
- File upload failures
- Database connection issues
- Processing errors

### User Feedback
- Modal dialogs for errors and warnings
- Success notifications
- Loading indicators
- Progress feedback

## Security Features

### Authentication
- All API endpoints require valid JWT token
- Faculty can only access their own assignments
- Role-based access control

### File Validation
- File type restrictions
- File size limits
- Content validation
- Malicious file detection

### Data Integrity
- Input sanitization
- Database transaction handling
- Error logging and monitoring

## Integration Points

### Existing Models
- **User**: Student and faculty information
- **Assignment**: Assignment details
- **FacultyAssignment**: Faculty-assignment relationships
- **StudentAssignment**: Student enrollment data
- **Submission**: Existing submission records

### Frontend Components
- **Faculty_Navbar**: Navigation integration
- **ValidationModal**: Error and success messages
- **Faculty_Grades**: Tabbed interface integration

## Troubleshooting

### Common Issues

#### File Upload Fails
- Check file format (.xlsx, .xls, .csv)
- Verify file size (max 5MB)
- Ensure correct header structure

#### Students Not Found
- Verify student names match database records
- Check student enrollment in selected section
- Confirm academic year and term settings

#### Template Download Issues
- Ensure assignment and section are selected
- Check network connection
- Verify authentication token

### Error Messages
- Clear, user-friendly error descriptions
- Specific validation feedback
- Actionable resolution steps

## Future Enhancements

### Planned Features
- Bulk grade editing
- Grade history tracking
- Export functionality
- Advanced filtering and search
- Grade analytics and reporting

### Technical Improvements
- Real-time collaboration
- Offline support
- Mobile optimization
- Performance optimization

## Support

For technical support or questions about the grading system:
- Check the validation messages for specific errors
- Review the file format requirements
- Contact system administrators for database issues
- Refer to this documentation for usage guidelines 