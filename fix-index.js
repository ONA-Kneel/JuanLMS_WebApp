const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/server/config.env' });

mongoose.connect(process.env.ATLAS_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    const db = mongoose.connection.db;
    const collection = db.collection('facultyassignments');
    
    // List all indexes
    const indexes = await collection.indexes();
    console.log('Current indexes:');
    indexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    // Drop the problematic index
    try {
      await collection.dropIndex('facultyId_1_trackName_1_strandName_1_sectionName_1_schoolYear_1_termName_1');
      console.log('✅ Dropped old unique index');
    } catch (error) {
      console.log('❌ Error dropping index:', error.message);
    }
    
    // Create new unique index with subjectName
    try {
      await collection.createIndex(
        { 
          facultyId: 1, 
          trackName: 1, 
          strandName: 1, 
          sectionName: 1, 
          subjectName: 1,
          schoolYear: 1,
          termName: 1
        }, 
        { unique: true, name: 'facultyId_1_trackName_1_strandName_1_sectionName_1_subjectName_1_schoolYear_1_termName_1' }
      );
      console.log('✅ Created new unique index with subjectName');
    } catch (error) {
      console.log('❌ Error creating new index:', error.message);
    }
    
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
