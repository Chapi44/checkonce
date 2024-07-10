const Review = require('../model/review');
const Course = require('../model/course');

const { StatusCodes } = require('http-status-codes');
const CustomError = require('../errors');
const { checkPermissions } = require('../utils');

const createReview = async (req, res) => {
  const { course: courseId, userId } = req.body;

  const isValidCourse = await Course.findOne({ _id: courseId });

  if (!isValidCourse) {
    throw new CustomError.NotFoundError(`No course with id : ${courseId}`);
  }

  const alreadySubmitted = await Review.findOne({
    course: courseId,
    user: userId,
  });

  if (alreadySubmitted) {
    throw new CustomError.BadRequestError(
      'Already submitted review for this course'
    );
  }

  // req.body.user = req.user.userId;
  const review = await Review.create(req.body);
  res.status(StatusCodes.CREATED).json({ review });
};

const getAllReviews = async (req, res) => {
  try {
    // Parse query parameters for pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10; // Default limit is 10
    const skip = (page - 1) * limit;

    // Fetch total number of reviews
    const totalReviews = await Review.countDocuments();

    // Fetch reviews with pagination
    const reviews = await Review.find({})
      .populate({
        path: 'course',
        select: 'courseDescription courseName price coverPage',
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

  const review = await Review.findOne({ _id: reviewId }).populate({
    path: 'course',
    select: 'courseDescription courseName price coverPage',
  });

  if (!review) {
    throw new CustomError.NotFoundError(`No review with id ${reviewId}`);
  }

  res.status(StatusCodes.OK).json({ review });
};

const updateReview = async (req, res) => {
  const { id: reviewId } = req.params;
  const { rating, title, comment } = req.body;

  const review = await Review.findOne({ _id: reviewId });

  if (!review) {
    throw new CustomError.NotFoundError(`No review with id ${reviewId}`);
  }

  checkPermissions(req.user, review.user);

  // Update the review with the fields provided in the request body
  review.rating = rating || review.rating; // If rating is provided, update it; otherwise, keep the existing rating
  review.title = title || review.title; // If title is provided, update it; otherwise, keep the existing title
  review.comment = comment || review.comment; // If comment is provided, update it; otherwise, keep the existing comment

  await review.save();
  res.status(StatusCodes.OK).json({ review });
};


const deleteReview = async (req, res) => {
  const { id: reviewId } = req.params;

  const review = await Review.findOne({ _id: reviewId });

  if (!review) {
    throw new CustomError.NotFoundError(`No review with id ${reviewId}`);
  }

  checkPermissions(req.user, review.user);
  await review.remove();
  res.status(StatusCodes.OK).json({ msg: 'Success! Review removed' });
};

const getSingleCourseReviews = async (req, res) => {
  const { id: courseId } = req.params;
  const reviews = await Review.find({ course: courseId });
  res.status(StatusCodes.OK).json({ reviews, count: reviews.length });
};

module.exports = {
  createReview,
  getAllReviews,
  getSingleReview,
  updateReview,
  deleteReview,
  getSingleCourseReviews,
};
