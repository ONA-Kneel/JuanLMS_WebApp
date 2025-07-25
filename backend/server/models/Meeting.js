import mongoose from 'mongoose';

const MeetingSchema = new mongoose.Schema({
  classID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  scheduledTime: {
    type: Date,
    required: true,
  },
  duration: {
    type: Number,
    required: true,
    default: 60,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  meetingType: {
    type: String,
    enum: ['instant', 'scheduled'],
    default: 'scheduled',
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['scheduled', 'ongoing', 'ended'],
    default: 'scheduled',
  },
});

export default mongoose.model('Meeting', MeetingSchema);
