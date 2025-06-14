import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import trackRoutes from './routes/trackRoutes.js';
import strandRoutes from './routes/strandRoutes.js';
import sectionRoutes from './routes/sectionRoutes.js';
import userRoutes from './routes/userRoutes.js';
import schoolYearRoutes from './routes/schoolYearRoutes.js';
import termRoutes from './server/routes/termRoutes';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/tracks', trackRoutes);
app.use('/strands', strandRoutes);
app.use('/sections', sectionRoutes);
app.use('/users', userRoutes);
app.use('/schoolyears', schoolYearRoutes);
app.use('/api/terms', termRoutes);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => console.error('MongoDB connection error:', error));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 