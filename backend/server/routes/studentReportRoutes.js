import express from "express";
import StudentReport from "../models/StudentReport.js";
import User from "../models/User.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const studentReportRoutes = express.Router();

// Test route to verify the server is working
studentReportRoutes.get("/test", (req, res) => {
  res.json({ message: "Student report routes are working!" });
});

// Create a new student report
studentReportRoutes.post("/studentreports", authenticateToken, async (req, res) => {
  try {
    const {
      facultyName,
      studentName,
      studentReport,
      termName,
      schoolYear,
      studentId
    } = req.body;

    // Get faculty ID from the authenticated user
    const facultyId = req.user._id;

    // Validate required fields
    if (!facultyName || !studentName || !studentReport || !termName || !schoolYear || !studentId) {
      return res.status(400).json({ 
        error: "All fields are required: facultyName, studentName, studentReport, termName, schoolYear, studentId" 
      });
    }

    // Verify that the student exists
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Create the student report
    const newReport = new StudentReport({
      facultyName,
      studentName,
      studentReport,
      termName,
      schoolYear,
      facultyId,
      studentId
    });

    const savedReport = await newReport.save();

    res.status(201).json({
      message: "Student report created successfully",
      report: savedReport
    });

  } catch (error) {
    console.error("Error creating student report:", error);
    res.status(500).json({ error: "Failed to create student report" });
  }
});

// Get all student reports (with optional filters)
studentReportRoutes.get("/studentreports", authenticateToken, async (req, res) => {
  try {
    const { facultyId, studentId, schoolYear, termName, page = 1, limit = 10 } = req.query;
    
    const filter = {};
    
    // Add filters if provided
    if (facultyId) filter.facultyId = facultyId;
    if (studentId) filter.studentId = studentId;
    if (schoolYear) filter.schoolYear = schoolYear;
    if (termName) filter.termName = termName;

    // If user is faculty, only show their reports
    if (req.user.role === 'faculty') {
      filter.facultyId = req.user._id;
    }

    const skip = (page - 1) * limit;
    
    const reports = await StudentReport.find(filter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('facultyId', 'firstname lastname email')
      .populate('studentId', 'firstname lastname email schoolID');

    const total = await StudentReport.countDocuments(filter);

    res.json({
      reports,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalReports: total,
        reportsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error("Error fetching student reports:", error);
    res.status(500).json({ error: "Failed to fetch student reports" });
  }
});

// Get a specific student report by ID
studentReportRoutes.get("/studentreports/:id", authenticateToken, async (req, res) => {
  try {
    const report = await StudentReport.findById(req.params.id)
      .populate('facultyId', 'firstname lastname email')
      .populate('studentId', 'firstname lastname email schoolID');

    if (!report) {
      return res.status(404).json({ error: "Student report not found" });
    }

    // Check if user has permission to view this report
    if (req.user.role === 'faculty' && report.facultyId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(report);

  } catch (error) {
    console.error("Error fetching student report:", error);
    res.status(500).json({ error: "Failed to fetch student report" });
  }
});

// Update a student report
studentReportRoutes.put("/studentreports/:id", authenticateToken, async (req, res) => {
  try {
    const report = await StudentReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ error: "Student report not found" });
    }

    // Check if user has permission to update this report
    if (req.user.role === 'faculty' && report.facultyId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Access denied" });
    }

    const updatedReport = await StudentReport.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      message: "Student report updated successfully",
      report: updatedReport
    });

  } catch (error) {
    console.error("Error updating student report:", error);
    res.status(500).json({ error: "Failed to update student report" });
  }
});

// Delete a student report
studentReportRoutes.delete("/studentreports/:id", authenticateToken, async (req, res) => {
  try {
    const report = await StudentReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ error: "Student report not found" });
    }

    // Check if user has permission to delete this report
    if (req.user.role === 'faculty' && report.facultyId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Access denied" });
    }

    await StudentReport.findByIdAndDelete(req.params.id);

    res.json({ message: "Student report deleted successfully" });

  } catch (error) {
    console.error("Error deleting student report:", error);
    res.status(500).json({ error: "Failed to delete student report" });
  }
});

// Get reports by faculty
studentReportRoutes.get("/studentreports/faculty/:facultyId", authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const reports = await StudentReport.find({ facultyId: req.params.facultyId })
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('studentId', 'firstname lastname email schoolID');

    const total = await StudentReport.countDocuments({ facultyId: req.params.facultyId });

    res.json({
      reports,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalReports: total,
        reportsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error("Error fetching faculty reports:", error);
    res.status(500).json({ error: "Failed to fetch faculty reports" });
  }
});

// Get reports by student
studentReportRoutes.get("/studentreports/student/:studentId", authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const reports = await StudentReport.find({ studentId: req.params.studentId })
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('facultyId', 'firstname lastname email');

    const total = await StudentReport.countDocuments({ studentId: req.params.studentId });

    res.json({
      reports,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalReports: total,
        reportsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error("Error fetching student reports:", error);
    res.status(500).json({ error: "Failed to fetch student reports" });
  }
});

export default studentReportRoutes;
