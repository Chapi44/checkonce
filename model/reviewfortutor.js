const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema(
  {
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: [true, 'Please provide rating'],
    },
    title: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    comment: {
      type: String,
      required: [true, 'Please provide review text'],
    },
    userId: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    tutorInstructor: { // Reference to the tutorInstructor being reviewed
      type: mongoose.Schema.ObjectId,
      ref: 'Tutorinstructor',
      required: true,
    },
  },
  { timestamps: true }
);

ReviewSchema.index({ tutorInstructor: 1, userId: 1 }, { unique: true });

ReviewSchema.statics.calculateAverageRating = async function (tutorInstructorId) {
  const result = await this.aggregate([
    { $match: { tutorInstructor: tutorInstructorId } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        numOfReviews: { $sum: 1 },
      },
    },
  ]);

  try {
    await this.model('Tutorinstructor').findOneAndUpdate(
      { _id: tutorInstructorId },
      {
        averageRating: Math.ceil(result[0]?.averageRating || 0),
        numOfReviews: result[0]?.numOfReviews || 0,
      }
    );
  } catch (error) {
    console.log(error);
  }
};

ReviewSchema.post('save', async function () {
  await this.constructor.calculateAverageRating(this.tutorInstructor);
});

ReviewSchema.post('remove', async function () {
  await this.constructor.calculateAverageRating(this.tutorInstructor);
});

module.exports = mongoose.model('TutorinstructorReview', ReviewSchema);
