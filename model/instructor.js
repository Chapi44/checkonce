const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const Schema = mongoose.Schema;

const instructorSchema = new mongoose.Schema({
  userName: { type: String },
  fullName: { type: String },
  categories: { type: [String] },
  bio: { type: String },
  grade: { type: String },
  phoneNumber: { type: String },
  email: { type: String },
  teachingCapacity: { type: String },
  price: Number,
  availableTime: {
    type: [String], // Example: ["Monday 9:00 AM - 12:00 PM", "Wednesday 1:00 PM - 4:00 PM"]
  },
  userWhoHasBought: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  userWhoHasEnrolled: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: 'Pending' },
  rejectionReason: {
    type: String, // New field for rejection reason
  },
  averageRating: {
    type: Number,
    default: 0,
  },
  numOfReviews: {
    type: Number,
    default: 0,
  },
  password: { type: String },
  gender: { type: String },
  experience: { type: String },
  location: { type: [String] },
  idCard: { type: [String], default: [] },
  instructorLicense: { type: [String], default: [] },
  Roomid: { type: String },
  role: {
    type: String,
    default: 'tutorinstructor'
  },
  totalAmountEarned: { type: Number, default: 0 }, // New field
  calculatedTotalAmountEarned: { type: Number, default: 0 },
}, {
  timestamps: true // Add timestamps option
});

instructorSchema.virtual('reviews', {
  ref: 'TutorinstructorReview',
  localField: '_id',
  foreignField: 'tutorInstructor',
  justOne: false,
});

instructorSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

instructorSchema.methods.comparePassword = async function (candidatePassword) {
  const isMatch = await bcrypt.compare(candidatePassword, this.password);
  return isMatch;
};

const tutorInstructor = mongoose.model('Tutorinstructor', instructorSchema, "Tutorinstructor");

module.exports = tutorInstructor;
