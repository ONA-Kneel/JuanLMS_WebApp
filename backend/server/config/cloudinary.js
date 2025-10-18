import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

// Configure Cloudinary - supports both CLOUDINARY_URL and individual env vars
if (process.env.CLOUDINARY_URL) {
  // Use CLOUDINARY_URL format: cloudinary://api_key:api_secret@cloud_name
  cloudinary.config(process.env.CLOUDINARY_URL);
} else {
  // Use individual environment variables
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// Create storage for different file types
export const ticketStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'juanlms/tickets',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
    resource_type: 'auto', // Automatically detect file type
  },
});

export const lessonStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'juanlms/lessons',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xlsx', 'xls'],
    resource_type: 'auto',
  },
});


export const profileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'juanlms/profiles',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    resource_type: 'image',
  },
});

export const assignmentStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'juanlms/assignments',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xlsx', 'xls'],
    resource_type: 'auto',
  },
});

export const submissionStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'juanlms/submissions',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xlsx', 'xls'],
    resource_type: 'auto',
  },
});

export const messageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'juanlms/messages',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx', 'mp4', 'mp3', 'xlsx', 'xls'],
    resource_type: 'auto',
  },
});

export const classImageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'juanlms/class-images',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    resource_type: 'image',
    transformation: [
      { width: 800, height: 600, crop: 'limit', quality: 'auto' }
    ]
  },
});

export const quizImageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'juanlms/quiz-images',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    resource_type: 'image',
    transformation: [
      { width: 1200, height: 800, crop: 'limit', quality: 'auto' }
    ]
  },
});

export const gradeFileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'juanlms/grades',
    allowed_formats: ['xlsx', 'xls', 'csv'],
    resource_type: 'raw', // For Excel/CSV files
  },
});

export const vpeReportsStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'juanlms/vpe-reports',
    allowed_formats: ['pdf'],
    resource_type: 'raw', // For PDF files
  },
});

export default cloudinary;
