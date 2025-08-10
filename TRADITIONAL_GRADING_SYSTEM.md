# Traditional Grading System - JuanLMS WebApp

## Overview
The Traditional Grading System is a comprehensive solution for managing student grades using the traditional Philippine grading system with prelims, midterms, and finals. This system provides faculty with tools to manage grades efficiently and students with easy access to their academic performance.

## Features

### Faculty Features
- **Class & Section Management**: View all assigned classes and sections
- **CSV Template Generation**: Download pre-filled CSV templates for grade entry
- **Bulk Grade Upload**: Upload completed CSV files with student grades
- **Individual Grade Management**: Edit grades directly in the web interface
- **Real-time Calculations**: Automatic calculation of final grades and remarks
- **Grade Validation**: Ensures grades are within valid ranges (0-100)

### Student Features
- **Grade Viewing**: Access personal grades for all subjects
- **Term-based Filtering**: View grades by academic term
- **Performance Summary**: See total subjects, average grade, and overall status
- **Grade Legend**: Color-coded grades for easy interpretation
- **Responsive Design**: Mobile-friendly interface

## Technical Implementation

### Backend Components

#### 1. TraditionalGrade Model (`backend/server/models/TraditionalGrade.js`)
```javascript
{
  studentId: ObjectId,        // Reference to User model
  subjectId: ObjectId,        // Reference to Subject model
  facultyId: ObjectId,        // Reference to User model (faculty)
  sectionName: String,        // Section name
  trackName: String,          // Track name
  strandName: String,         // Strand name
  gradeLevel: String,         // Grade 11 or Grade 12
  schoolYear: String,         // Academic year
  termName: String,           // Term name
  prelims: Number,            // Prelims grade (0-100)
  midterms: Number,           // Midterms grade (0-100)
  finals: Number,             // Finals grade (0-100)
  finalGrade: Number,         // Calculated final grade
  remark: String,             // PASSED/FAILED
  lastUpdated: Date           // Last modification timestamp
}
```

#### 2. API Routes (`backend/server/routes/traditionalGradeRoutes.js`)

**Faculty Routes:**
- `GET /api/traditional-grades/faculty/classes-sections` - Get faculty's assigned classes
- `GET /api/traditional-grades/faculty/students/:classId` - Get students in a class
- `GET /api/traditional-grades/faculty/template/:classId` - Download CSV template
- `POST /api/traditional-grades/faculty/upload` - Upload grades CSV
- `PUT /api/traditional-grades/faculty/update` - Update individual grade

**Student Routes:**
- `GET /api/traditional-grades/student/my-grades` - Get student's own grades

#### 3. Utility Functions (`backend/server/utils/traditionalGradeProcessor.js`)
- CSV template generation
- CSV file processing and validation
- Grade calculations
- Data validation
- Export functionality

### Frontend Components

#### 1. FacultyTraditionalGrades (`frontend/src/component/Faculty/FacultyTraditionalGrades.jsx`)
- Class and section selection dropdown
- CSV template download functionality
- File upload for bulk grade entry
- Interactive grade table with inline editing
- Real-time grade calculations

#### 2. StudentTraditionalGrades (`frontend/src/component/Student/StudentTraditionalGrades.jsx`)
- Term-based grade filtering
- Performance summary cards
- Detailed grade table
- Grade legend and color coding
- Responsive design for mobile devices

## Grade Calculation Formula

The final grade is calculated using the following weights:
- **Prelims**: 30%
- **Midterms**: 30%
- **Finals**: 40%

**Formula:**
```
Final Grade = (Prelims × 0.3) + (Midterms × 0.3) + (Finals × 0.4)
```

**Remarks:**
- **PASSED**: Final Grade ≥ 75
- **FAILED**: Final Grade < 75

## CSV Template Structure

The system generates CSV templates with the following columns:
1. Student ID
2. Student Name
3. Subject ID
4. Subject Code
5. Subject Description
6. Prelims
7. Midterms
8. Finals
9. Final Grade
10. Remark

## Security Features

- **Authentication Required**: All routes require valid JWT tokens
- **Role-based Access**: Faculty can only access their assigned classes
- **Student Isolation**: Students can only view their own grades
- **Input Validation**: Server-side validation of all grade inputs
- **Audit Trail**: All grade modifications are logged

## Installation & Setup

### Backend Dependencies
```bash
cd backend/server
npm install csv-parser csv-writer
```

### Environment Variables
Ensure the following are set in your `.env` file:
```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

### Database Setup
The system automatically creates the necessary collections when first used. Ensure your MongoDB instance is running and accessible.

## Usage Instructions

### For Faculty

1. **Access the System**: Navigate to the Traditional Grades section
2. **Select Class**: Choose the class and section you want to manage
3. **Download Template**: Click "Download CSV Template" to get a pre-filled template
4. **Fill Grades**: Open the CSV file and enter grades for prelims, midterms, and finals
5. **Upload Grades**: Use the file upload feature to submit the completed CSV
6. **Review & Edit**: Use the web interface to review and make individual adjustments

### For Students

1. **Access Grades**: Navigate to the Traditional Grades section
2. **Select Term**: Choose the academic term to view grades
3. **View Performance**: See summary cards with overall performance metrics
4. **Review Details**: Check individual subject grades in the detailed table
5. **Understand Legend**: Use the color-coded legend to interpret grade levels

## API Endpoints Reference

### Authentication
All endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

### Response Format
All API responses follow this structure:
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### Error Handling
Errors are returned with appropriate HTTP status codes and error messages:
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information"
}
```

## File Upload Specifications

- **Supported Formats**: CSV, XLSX, XLS
- **Maximum File Size**: 5MB
- **Required Columns**: Student ID, Subject ID, and at least one grade column
- **Grade Range**: 0-100 (decimal values supported)

## Performance Considerations

- **Database Indexing**: Ensure proper indexes on frequently queried fields
- **File Processing**: Large CSV files are processed asynchronously
- **Caching**: Consider implementing Redis for frequently accessed grade data
- **Pagination**: Implement pagination for large grade datasets

## Troubleshooting

### Common Issues

1. **Template Download Fails**
   - Check if the selected class has students and subjects
   - Verify faculty permissions for the selected class

2. **CSV Upload Errors**
   - Ensure CSV format matches the template exactly
   - Check for missing required columns
   - Validate grade values are within 0-100 range

3. **Grade Calculation Issues**
   - Verify all component grades are numeric
   - Check for null or undefined values

### Debug Mode
Enable debug logging by setting the environment variable:
```
DEBUG=true
```

## Future Enhancements

- **Grade History**: Track grade changes over time
- **Grade Analytics**: Advanced reporting and analytics
- **Notification System**: Alert students when grades are posted
- **Grade Approval Workflow**: Multi-level grade approval process
- **Integration**: Connect with existing LMS features

## Support

For technical support or feature requests, please contact the development team or create an issue in the project repository.

## License

This system is part of the JuanLMS WebApp and follows the same licensing terms. 