import mongoose from "mongoose";

const registrantSchema = new mongoose.Schema({
  firstName:      { type: String, required: true },
  middleName:     { type: String },
  lastName:       { type: String, required: true },
  personalEmail:  { type: String, required: true, unique: true },
  contactNo:      { type: String, required: true },
  schoolID: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^\d{2}-\d{5}$/.test(v) || /^F00/.test(v) || /^A00/.test(v);
      },
      message: 'Invalid School ID format. Use YY-00000 for students, F00... for faculty, or A00... for admin.'
    }
  },
  registrationDate: { type: Date, default: Date.now },
  status:         { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  processedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  processedAt:    { type: Date },
  rejectionNote:  { type: String },
  rejectionHistory: [{
    date: { type: Date, default: Date.now },
    note: { type: String, required: true },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }]
});

export default mongoose.model("Registrant", registrantSchema, "Registrants"); 