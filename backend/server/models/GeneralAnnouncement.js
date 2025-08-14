import mongoose from "mongoose";

const generalAnnouncementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  body: {
    type: String,
    required: true,
    trim: true,
    maxlength: [2000, 'Body cannot exceed 2000 characters']
  },
  recipientRoles: {
    type: [String],
    required: true,
    enum: ['admin', 'faculty', 'students', 'vice president of education', 'principal'],
    default: []
  },
  termName: {
    type: String,
    required: true,
    trim: true
  },
  schoolYear: {
    type: String,
    required: true,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  announcementsViews: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    acknowledgedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Index for better query performance
generalAnnouncementSchema.index({ recipientRoles: 1, createdAt: -1 });
generalAnnouncementSchema.index({ createdBy: 1, createdAt: -1 });
generalAnnouncementSchema.index({ termName: 1, schoolYear: 1, createdAt: -1 });
generalAnnouncementSchema.index({ 'announcementsViews.userId': 1 }); // Added index for views

const GeneralAnnouncement = mongoose.model('GeneralAnnouncement', generalAnnouncementSchema, 'generalAnnouncements');

export default GeneralAnnouncement;
