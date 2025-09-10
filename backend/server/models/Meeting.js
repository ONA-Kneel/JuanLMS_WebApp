import mongoose from 'mongoose';

const MeetingSchema = new mongoose.Schema({
  classID: {
    type: String, // Changed to String to support 'direct-invite' identifier
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
    required: false,
    default: null,
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
  // New fields for direct invitations
  invitedUsers: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
    },
    invitedAt: {
      type: Date,
      default: Date.now,
    },
    joinedAt: {
      type: Date,
      default: null,
    },
  }],
  isDirectInvite: {
    type: Boolean,
    default: false,
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
