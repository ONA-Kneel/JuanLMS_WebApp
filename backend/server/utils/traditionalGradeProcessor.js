import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';

// Generate CSV template for traditional grades
export const generateTraditionalGradeTemplate = async (students, subjects, outputPath) => {
  try {
    const csvWriter = createObjectCsvWriter({
      path: outputPath,
      header: [
        { id: 'studentId', title: 'Student ID' },
        { id: 'studentName', title: 'Student Name' },
        { id: 'subjectCode', title: 'Subject Code' },
        { id: 'subjectDescription', title: 'Subject Description' },
        { id: 'prelims', title: 'Prelims' },
        { id: 'midterms', title: 'Midterms' },
        { id: 'final', title: 'Final' },
        { id: 'finalGrade', title: 'Final Grade' },
        { id: 'remark', title: 'Remark' }
      ]
    });

    const records = [];
    
    // Generate records for each student-subject combination
    students.forEach(student => {
      subjects.forEach(subject => {
        records.push({
          studentId: student._id,
          studentName: `${student.firstname} ${student.lastname}`,
          subjectCode: subject.subjectCode || subject.subjectName,
          subjectDescription: subject.subjectDescription || subject.subjectName,
          prelims: '',
          midterms: '',
          final: '',
          finalGrade: '',
          remark: ''
        });
      });
    });

    await csvWriter.writeRecords(records);
    return true;
  } catch (error) {
    console.error('Error generating template:', error);
    throw error;
  }
};

// Process uploaded CSV file
export const processTraditionalGradeCSV = async (filePath) => {
  try {
    const results = [];
    
    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => {
          // Validate and clean the data
          const processedData = {
            studentId: data['Student ID']?.trim(),
            studentName: data['Student Name']?.trim(),
            subjectCode: data['Subject Code']?.trim(),
            subjectDescription: data['Subject Description']?.trim(),
            prelims: parseFloat(data['Prelims']) || null,
            midterms: parseFloat(data['Midterms']) || null,
            final: parseFloat(data['Final']) || null,
            finalGrade: parseFloat(data['Final Grade']) || null,
            remark: data['Remark']?.trim() || ''
          };

          // Validate required fields
          if (!processedData.studentId || !processedData.subjectCode) {
            console.warn('Skipping row with missing student ID or subject code:', data);
            return;
          }

          // Validate grade ranges
          if (processedData.prelims !== null && (processedData.prelims < 0 || processedData.prelims > 100)) {
            console.warn('Invalid prelims grade:', processedData.prelims);
            processedData.prelims = null;
          }
          
          if (processedData.midterms !== null && (processedData.midterms < 0 || processedData.midterms > 100)) {
            console.warn('Invalid midterms grade:', processedData.midterms);
            processedData.midterms = null;
          }
          
          if (processedData.final !== null && (processedData.final < 0 || processedData.final > 100)) {
            console.warn('Invalid final grade:', processedData.final);
            processedData.final = null;
          }

          // Calculate final grade if not provided but component grades are available
          if (processedData.finalGrade === null && 
              processedData.prelims !== null && 
              processedData.midterms !== null && 
              processedData.final !== null) {
            processedData.finalGrade = calculateFinalGrade(
              processedData.prelims, 
              processedData.midterms, 
              processedData.final
            );
          }

          // Update remark based on final grade
          if (processedData.finalGrade !== null) {
            processedData.remark = processedData.finalGrade >= 75 ? 'PASSED' : 'FAILED';
          }

          results.push(processedData);
        })
        .on('end', () => {
          resolve(results);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  } catch (error) {
    console.error('Error processing CSV:', error);
    throw error;
  }
};

// Calculate final grade based on component grades
export const calculateFinalGrade = (prelims, midterms, final) => {
  if (prelims === null || midterms === null || final === null) {
    return null;
  }
  
  // 30% prelims + 30% midterms + 40% final
  const finalGrade = (prelims * 0.3) + (midterms * 0.3) + (final * 0.4);
  return Math.round(finalGrade);
};

// Validate grade data
export const validateGradeData = (gradeData) => {
  const errors = [];
  
  if (!gradeData.studentId) {
    errors.push('Student ID is required');
  }
  
  if (!gradeData.subjectCode) {
    errors.push('Subject Code is required');
  }
  
  // Validate grade ranges
  if (gradeData.prelims !== null && (gradeData.prelims < 0 || gradeData.prelims > 100)) {
    errors.push('Prelims grade must be between 0 and 100');
  }
  
  if (gradeData.midterms !== null && (gradeData.midterms < 0 || gradeData.midterms > 100)) {
    errors.push('Midterms grade must be between 0 and 100');
  }
  
  if (gradeData.final !== null && (gradeData.final < 0 || gradeData.final > 100)) {
    errors.push('Final grade must be between 0 and 100');
  }
  
  if (gradeData.finalGrade !== null && (gradeData.finalGrade < 0 || gradeData.finalGrade > 100)) {
    errors.push('Final grade must be between 0 and 100');
  }
  
  return errors;
};

// Generate grade report
export const generateGradeReport = (grades) => {
  const report = {
    totalStudents: grades.length,
    subjects: new Set(),
    averageGrades: {
      prelims: 0,
      midterms: 0,
      final: 0,
      finalGrade: 0
    },
    passRate: 0,
    failedCount: 0
  };
  
  let prelimsSum = 0, midtermsSum = 0, finalSum = 0, finalGradeSum = 0;
  let passedCount = 0;
  
  grades.forEach(grade => {
    report.subjects.add(grade.subjectCode);
    
    if (grade.prelims !== null) {
      prelimsSum += grade.prelims;
    }
    if (grade.midterms !== null) {
      midtermsSum += grade.midterms;
    }
    if (grade.final !== null) {
      finalSum += grade.final;
    }
    if (grade.finalGrade !== null) {
      finalGradeSum += grade.finalGrade;
      if (grade.remark === 'PASSED') {
        passedCount++;
      } else {
        report.failedCount++;
      }
    }
  });
  
  const validGrades = grades.filter(g => g.finalGrade !== null).length;
  
  if (validGrades > 0) {
    report.averageGrades.prelims = Math.round(prelimsSum / validGrades);
    report.averageGrades.midterms = Math.round(midtermsSum / validGrades);
    report.averageGrades.final = Math.round(finalSum / validGrades);
    report.averageGrades.finalGrade = Math.round(finalGradeSum / validGrades);
    report.passRate = Math.round((passedCount / validGrades) * 100);
  }
  
  report.subjects = Array.from(report.subjects);
  
  return report;
};

// Export grades to CSV
export const exportGradesToCSV = async (grades, outputPath) => {
  try {
    const csvWriter = createObjectCsvWriter({
      path: outputPath,
      header: [
        { id: 'studentId', title: 'Student ID' },
        { id: 'studentName', title: 'Student Name' },
        { id: 'subjectCode', title: 'Subject Code' },
        { id: 'subjectDescription', title: 'Subject Description' },
        { id: 'prelims', title: 'Prelims' },
        { id: 'midterms', title: 'Midterms' },
        { id: 'final', title: 'Final' },
        { id: 'finalGrade', title: 'Final Grade' },
        { id: 'remark', title: 'Remark' }
      ]
    });

    const records = grades.map(grade => ({
      studentId: grade.studentId,
      studentName: grade.studentName,
      subjectCode: grade.subjectCode,
      subjectDescription: grade.subjectDescription,
      prelims: grade.prelims || '',
      midterms: grade.midterms || '',
      final: grade.final || '',
      finalGrade: grade.finalGrade || '',
      remark: grade.remark || ''
    }));

    await csvWriter.writeRecords(records);
    return true;
  } catch (error) {
    console.error('Error exporting grades:', error);
    throw error;
  }
}; 