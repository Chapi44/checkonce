const express = require('express');
const {
  createReview,
  getAllReviews,
  getSingleReview,
  updateReview,
  deleteReview,
  getSingleTutorinstructorReviews,
} = require('../controllers/reviewtutController');

const router = express.Router();

router.route('/').post(createReview).get(getAllReviews);
router.route('/:id').get(getSingleReview).patch(updateReview).delete(deleteReview);
router.route('/tutorinstructor/:id').get(getSingleTutorinstructorReviews);

module.exports = router;
