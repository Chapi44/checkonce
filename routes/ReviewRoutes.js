const express = require("express");
const router = express.Router();
// const reviewTut= require("../controllers/reviewtutController")
// const path = require("path");

const {
  authenticateUser,
  authorizePermissions,
} = require("../middleware/authentication");

const {
  createReview,
  getAllReviews,
  getSingleReview,
  updateReview,
  deleteReview,
  getSingleCourseReviews
} = require("../controllers/reviewController");

router.route("/").post( createReview)
router.get("/", getAllReviews);

router
  .route("/:id")
  .get(getSingleReview)
  .patch(authenticateUser, updateReview)
  .delete(
    [authenticateUser],
    deleteReview
  );

  router.get('/courses/:id/reviews', getSingleCourseReviews);

  // router.post('/tutreview', reviewTut.createReview)
  // router.get('/tutreview', reviewTut.getAllReviews)
  // router.get('/tutreview/:id', reviewTut.getSingleReview)
  // router.patch('/tutreview/:id', reviewTut.updateReview)
  // router.delete('/tutreview/:id', reviewTut.deleteReview)


module.exports = router;