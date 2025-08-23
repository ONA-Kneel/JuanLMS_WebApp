// Script to clean up duplicate view entries in assignments
import mongoose from 'mongoose';
import Assignment from './server/models/Assignment.js';
import dotenv from 'dotenv';

dotenv.config({ path: './server/config.env' });

const connectToServer = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/juanlms');
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
};

const cleanupDuplicateViews = async () => {
  try {
    console.log('Starting cleanup of duplicate views...');
    
    // Find all assignments
    const assignments = await Assignment.find({});
    console.log(`Found ${assignments.length} assignments`);
    
    let totalCleaned = 0;
    
    for (const assignment of assignments) {
      if (assignment.views && assignment.views.length > 0) {
        const originalLength = assignment.views.length;
        
        // Remove duplicates by converting to strings, deduplicating, and converting back to ObjectIds
        const uniqueViews = [...new Set(assignment.views.map(view => view.toString()))]
          .map(viewId => new mongoose.Types.ObjectId(viewId));
        
        if (uniqueViews.length !== originalLength) {
          console.log(`Assignment ${assignment._id} (${assignment.title}): ${originalLength} -> ${uniqueViews.length} views`);
          assignment.views = uniqueViews;
          await assignment.save();
          totalCleaned++;
        }
      }
    }
    
    console.log(`Cleanup complete! Cleaned ${totalCleaned} assignments with duplicate views`);
    
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the cleanup
connectToServer().then(cleanupDuplicateViews);



