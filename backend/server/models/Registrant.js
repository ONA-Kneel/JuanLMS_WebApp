import mongoose from "mongoose";

const registrantSchema = new mongoose.Schema({
  firstName:      { type: String, required: true },
  middleName:     { type: String },
  lastName:       { type: String, required: true },
  personalEmail:  { type: String, required: true, unique: true },
  contactNo:      { type: String, required: true },
  registrationDate: { type: Date, default: Date.now },
  status:         { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  processedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  processedAt:    { type: Date },
  rejectionNote:  { type: String },
});

export default mongoose.model("Registrant", registrantSchema, "Registrants"); 