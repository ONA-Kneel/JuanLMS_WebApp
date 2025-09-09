import mongoose from 'mongoose';

const semestralDraftSchema = new mongoose.Schema({
  schoolID: { type: String, required: true, index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  studentName: { type: String },
  subjectCode: { type: String, required: true },
  subjectName: { type: String },
  classID: { type: String, required: true },
  section: { type: String, required: true },
  academicYear: { type: String, required: true },
  termName: { type: String, required: true },
  facultyID: { type: String, required: true },
  grades: {
    quarter1: { type: Number, min: 0, max: 100, default: null },
    quarter2: { type: Number, min: 0, max: 100, default: null },
    quarter3: { type: Number, min: 0, max: 100, default: null },
    quarter4: { type: Number, min: 0, max: 100, default: null },
    semesterFinal: { type: Number, min: 0, max: 100, default: null },
    remarks: { type: String, default: '' }
  },
  breakdownByQuarter: { type: Object, default: {} },
  isLocked: { type: Boolean, default: false },
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

semestralDraftSchema.index({ schoolID: 1, subjectCode: 1, academicYear: 1, termName: 1 }, { unique: false });
semestralDraftSchema.pre('save', function(next) { this.lastUpdated = new Date(); next(); });

// Important: collection name is 'semestralgrades' for drafts
const SemestralDraft = mongoose.model('semestralgrades', semestralDraftSchema);
export default SemestralDraft;


