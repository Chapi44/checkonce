const express=require('express')
const userController =require('../controllers/usercontroller')
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const {
  authAuthorization ,
  authMiddleware ,
  authAuthorizationstatus
} = require("../middleware/authMiddleware");


const idCardDir = 'uploads/instructor/idcards';
if (!fs.existsSync(idCardDir)) {
    fs.mkdirSync(idCardDir, { recursive: true });
}

const instructorLicenseDir = 'uploads/instructor/instructorlicense';
if (!fs.existsSync(instructorLicenseDir)) {
    fs.mkdirSync(instructorLicenseDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
      // Check the fieldname to determine the destination folder
      if (file.fieldname === 'idCard') {
          cb(null, idCardDir);
      } else if (file.fieldname === 'instructorLicense') {
          cb(null, instructorLicenseDir);
      } else {
          // Default destination if fieldname doesn't match
          cb(null, 'uploads/instructor');
      }
  },
  filename: function (req, file, cb) {
      cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });
const router=express.Router()
router.get('/getallusers',
 userController.getAllUsers)
router.get("/getuserById/:id", userController.getUserById);
router.post(
  "/delete/:id",

  userController.deleteuser
);
router.patch('/update',userController.updateUser)
router.patch(
  "/updateUserPassword", 
  userController.updateUserPassword
);

router.post('/enrolled-courses/:id',  userController.getEnrolledCoursesByUserId);

router.post('/:courseId/enroll',  userController.enrollCourse);

// router.post('/:courseId/enroll/autherized', authAuthorizationstatus, userController.enrollCourseforautherized);


router.post('/courses/:courseId', userController.getEnrolledCourseByUserIdAndCourseId);

router.put("/instructor/approve/:instructorId", userController.approveInstructor);


// router.post('/progress', userController.updateProgress);

router.put('/progress',  userController.updateCourseProgress);

router.put('/updatelessonprogress',  userController.updateLessonProgress);

router.put('/update-final-average', userController.updateFinalAverage);

router.post('/enroll/multiple', userController.enrollCourseForMultipleEmails);


router.put("/instructor/update/:id", upload.array('files', 2), userController.updateInstructor);

// Route to enroll in a tutorInstructor

router.post('/instructor/get', userController.enrollTutorInstructor);

router.put("/reject/:instructorId", userController.rejectInstructor);

router.get("/instructors/:id", userController.getInstructorById);


router.post("/instructor/:id/withdraw", userController.withdrawAmount);


router.get('/users/:id/enrolledInstructors', userController.getEnrolledInstructorsByUserId);

module.exports=router