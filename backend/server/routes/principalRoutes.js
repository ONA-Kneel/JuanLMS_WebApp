import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import User from '../models/User.js';
import Class from '../models/Class.js';
import Subject from '../models/Subject.js';

const router = express.Router();

// Get all grade levels
router.get('/grade-levels', authenticateToken, async (req, res) => {
  try {
    // Only principals can access this endpoint
    if (req.user.role !== 'principal') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Principals only.'
      });
    }

    // Return standard grade levels
    const gradeLevels = ['Grade 11', 'Grade 12'];

    res.json({
      success: true,
      gradeLevels: gradeLevels
    });

  } catch (error) {
    console.error('Error fetching grade levels:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch grade levels',
      error: error.message
    });
  }
});

// Get strands by grade level
router.get('/strands', authenticateToken, async (req, res) => {
  try {
    const { gradeLevel } = req.query;
    
    // Only principals can access this endpoint
    if (req.user.role !== 'principal') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Principals only.'
      });
    }

    if (!gradeLevel) {
      return res.status(400).json({
        success: false,
        message: 'Grade level parameter is required'
      });
    }

    // Return common strands for the grade level
    let strands = [];
    
    if (gradeLevel === 'Grade 11' || gradeLevel === 'Grade 12') {
      strands = ['STEM', 'ABM', 'HUMSS', 'GAS', 'TVL'];
    }

    res.json({
      success: true,
      strands: strands,
      gradeLevel: gradeLevel
    });

  } catch (error) {
    console.error('Error fetching strands:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch strands',
      error: error.message
    });
  }
});

// Get sections by grade level and strand
router.get('/sections', authenticateToken, async (req, res) => {
  try {
    const { gradeLevel, strand } = req.query;
    
    // Only principals can access this endpoint
    if (req.user.role !== 'principal') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Principals only.'
      });
    }

    if (!gradeLevel || !strand) {
      return res.status(400).json({
        success: false,
        message: 'Grade level and strand parameters are required'
      });
    }

    // Try to find sections from the database
    let sections = [];
    
    try {
      // Look for classes with matching grade level and strand
      const classes = await Class.find({
        gradeLevel: gradeLevel,
        trackName: { $regex: strand, $options: 'i' }
      }).distinct('sectionName');
      
      if (classes.length > 0) {
        sections = classes;
      } else {
        // Fallback to sample sections
        sections = ['Section A', 'Section B', 'Section C', 'Section D'];
      }
    } catch (dbError) {
      console.log('Database query failed, using fallback sections');
      sections = ['Section A', 'Section B', 'Section C', 'Section D'];
    }

    res.json({
      success: true,
      sections: sections,
      gradeLevel: gradeLevel,
      strand: strand
    });

  } catch (error) {
    console.error('Error fetching sections:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sections',
      error: error.message
    });
  }
});

// Get subjects by grade level, strand, and section
router.get('/subjects', authenticateToken, async (req, res) => {
  try {
    const { gradeLevel, strand, section } = req.query;
    
    // Only principals can access this endpoint
    if (req.user.role !== 'principal') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Principals only.'
      });
    }

    if (!gradeLevel || !strand || !section) {
      return res.status(400).json({
        success: false,
        message: 'Grade level, strand, and section parameters are required'
      });
    }

    // Try to find subjects from the database
    let subjects = [];
    
    try {
      // Look for subjects with matching grade level and strand
      const subjectData = await Subject.find({
        gradeLevel: gradeLevel,
        trackName: { $regex: strand, $options: 'i' }
      }).select('subjectCode subjectName subjectDescription');
      
      if (subjectData.length > 0) {
        subjects = subjectData.map(subject => 
          subject.subjectName || subject.subjectCode || subject.subjectDescription
        );
      } else {
        // Fallback to sample subjects
        subjects = ['Mathematics', 'Science', 'English', 'Filipino', 'Social Studies', 'Physical Education', 'Values Education'];
      }
    } catch (dbError) {
      console.log('Database query failed, using fallback subjects');
      subjects = ['Mathematics', 'Science', 'English', 'Filipino', 'Social Studies', 'Physical Education', 'Values Education'];
    }

    res.json({
      success: true,
      subjects: subjects,
      gradeLevel: gradeLevel,
      strand: strand,
      section: section
    });

  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subjects',
      error: error.message
    });
  }
});

export default router;
