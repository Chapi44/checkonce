const TutorinstructorReview = require('../model/reviewfortutor');
const Tutorinstructor = require('../model/instructor');
const { StatusCodes } = require('http-status-codes');
const CustomError = require('../errors');


const createReview = async (req, res) => {
  const { tutorInstructor: tutorInstructorId, userId } = req.body;

  const isValidTutorinstructor = await Tutorinstructor.findOne({ _id: tutorInstructorId });

  if (!isValidTutorinstructor) {
    throw new CustomError.NotFoundError(`No tutorinstructor with id: ${tutorInstructorId}`);
  }

  const alreadySubmitted = await TutorinstructorReview.findOne({
    tutorInstructor: tutorInstructorId,
    userId,
  });

  if (alreadySubmitted) {
    throw new CustomError.BadRequestError('Already submitted review for this tutorInstructor');
  }

  const review = await TutorinstructorReview.create(req.body);
  res.status(StatusCodes.CREATED).json({ review });
};

const getAllReviews = async (req, res) => {
  try {
    // Parse query parameters for pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10; // Default limit is 10
    const skip = (page - 1) * limit;

    // Fetch total number of reviews
    const totalReviews = await TutorinstructorReview.countDocuments();

    // Fetch reviews with pagination
    const reviews = await TutorinstructorReview.find({})
      .populate({
        path: 'tutorInstructor',
        select: 'fullName bio categories',
      })
      .skip(skip)
      .limit(limit);

    res.status(StatusCodes.OK).json({
      reviews,
      currentPage: page,
      totalPages: Math.ceil(totalReviews / limit),
      totalCount: totalReviews
    });
  } catch (error) {
    console.error(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};



const getSingleReview = async (req, res) => {
  const { id: reviewId } = req.params;

  const review = await TutorinstructorReview.findOne({ _id: reviewId }).populate({
    path: 'tutorInstructor',
    select: 'fullName bio categories',
  });

  if (!review) {
    throw new CustomError.NotFoundError(`No review with id ${reviewId}`);
  }

  res.status(StatusCodes.OK).json({ review });
};

const updateReview = async (req, res) => {
  const { id: reviewId } = req.params;
  const { rating, title, comment } = req.body;

  const review = await TutorinstructorReview.findOne({ _id: reviewId });

  if (!review) {
    throw new CustomError.NotFoundError(`No review with id ${reviewId}`);
  }

  checkPermissions(req.user, review.user);

  review.rating = rating || review.rating;
  review.title = title || review.title;
  review.comment = comment || review.comment;

  await review.save();
  res.status(StatusCodes.OK).json({ review });
};

const deleteReview = async (req, res) => {
  const { id: reviewId } = req.params;

  const review = await TutorinstructorReview.findOne({ _id: reviewId });

  if (!review) {
    throw new CustomError.NotFoundError(`No review with id ${reviewId}`);
  }

  checkPermissions(req.user, review.user);
  await review.remove();
  res.status(StatusCodes.OK).json({ msg: 'Success! Review removed' });
};

const getSingleTutorinstructorReviews = async (req, res) => {
  const { id: tutorInstructorId } = req.params;
  const reviews = await TutorinstructorReview.find({ tutorInstructor: tutorInstructorId });
  res.status(StatusCodes.OK).json({ reviews, count: reviews.length });
};

module.exports = {
  createReview,
  getAllReviews,
  getSingleReview,
  updateReview,
  deleteReview,
  getSingleTutorinstructorReviews,
};
