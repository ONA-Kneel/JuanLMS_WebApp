import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  recipientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  type: { 
    type: String, 
    required: true, 
    enum: ['announcement', 'assignment', 'quiz', 'activity', 'message'] 
  },
  title: { 
    type: String, 
    required: true 
  },
  message: { 
    type: String, 
    required: true 
  },
  faculty: { 
    type: String, 
    required: true 
  },
  classID: { 
    type: String, 
    required: true 
  },
  className: { 
    type: String, 
    required: false 
  },
  classCode: { 
    type: String, 
    required: false 
  },
  relatedItemId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: false 
  },
  priority: { 
    type: String, 
    default: 'normal', 
    enum: ['low', 'normal', 'high', 'urgent'] 
  },
  read: { 
    type: Boolean, 
    default: false 
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  }
});

// Index for efficient queries
notificationSchema.index({ recipientId: 1, read: 1 });
notificationSchema.index({ timestamp: -1 });

export default mongoose.model("Notification", notificationSchema, "Notifications"); 