const express = require('express');
const fs = require('fs');
const router = express.Router();
const multer = require('multer');
const courseController = require('../controllers/courseController');
const path = require('path');

const {
    authAuthorization,
    authMiddleware,
} = require("../middleware/authMiddleware");

// Create the uploads/course directory if it doesn't exist
const courseDir = 'uploads/course';
if (!fs.existsSync(courseDir)) {
    fs.mkdirSync(courseDir, { recursive: true });
}

// Create the uploads/course/coverpage directory if it doesn't exist
const coverPageDir = 'uploads/course/coverpage';
if (!fs.existsSync(coverPageDir)) {
    fs.mkdirSync(coverPageDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Check the fieldname to determine the destination folder
        if (file.fieldname === 'coverPage') {
            cb(null, coverPageDir);
        } else {
            // Default destination if fieldname doesn't match
            cb(null, courseDir);
        }
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 30 * 1024 * 1024 } // 30MB limit
});

// Route to create a new course
router.post('/', upload.fields([
    { name: 'files', maxCount: 10 }, // Assuming this is for other files like lesson files
    { name: 'coverPage', maxCount: 1 } // Handle coverPage files
]), courseController.createCourse);

// Route to get all courses
router.get('/', courseController.getAllCourses);

// Route to get a course by ID
router.get('/:id', courseController.getCourseById);

// Route to get courses by user ID
router.get('/:userId/courses', courseController.getCoursesByUserId);
router.get('/:id/stream/:lessonId', courseController.streamCourseVideo);
// router.get('/:id/stream-dash/:lessonId', courseController.createDashStream);

router.get('/:id/stream-dash/:lessonId', courseController.createDashStream);

// Route to serve DASH segment files
router.get('/dash/:courseId_:lessonId/:filename', (req, res) => {
  const { courseId, lessonId, filename } = req.params;
  const filePath = path.join(__dirname, '../uploads/course/dash', `${courseId}_${lessonId}`, filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ message: "Segment file not found" });
  }
});
// Route to update a course by ID
router.put('/:id', upload.fields([
    { name: 'files', maxCount: 10 }, // Assuming this is for other files like lesson files
    { name: 'coverPage', maxCount: 1 } // Handle coverPage files
]), courseController.updateCourseById);

// Route to delete a course by ID
router.delete('/:id', courseController.deleteCourseById);

// Route to delete all courses
router.post('/cou', courseController.deleteAllCourses);

router.get('/search', courseController.getCoursesByName);

router.delete("/:courseId/chapter/:chapterId", courseController.deleteChapterByChapterIdFirst); 

router.delete("/:courseId/chapter/:chapterId/lesson/:fileId", courseController.deleteLessonFileById);






// Multer setup for lesson file upload
const lessonFileStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/course');
    },
    filename: function (req, file, cb) {
      cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
  });
  
const uploadLessonFile = multer({ 
    storage: lessonFileStorage,
    limits: { fileSize: 30 * 1024 * 1024 } // 30MB limit
});

// Add lesson file to course
router.post('/:id/lessons', uploadLessonFile.single('lessonFile'), courseController.addLessonFile);
  
router.post('/addQuestions', courseController.addQuestion);

router.get("/:courseId/chapter/:chapterId/questions", courseController.getAllQuestions);

router.put('/:courseId/chapters/:chapterId/lessons/:lessonId', uploadLessonFile.single('lessonFile'), courseController.editLessonById);

router.put("/courses/:courseId/chapters/:chapterId/lessonname", courseController.editLessonNameByChapterId);

router.put("/approve/:courseId", courseController.approveCourse);


router.put("/pending/:courseId", courseController.pendingcourse);

router.put("/draft/:courseId", courseController.draftcourse);



router.post('/:courseId/reject', courseController.rejectCourse);

router.get("/courses/approved", courseController.getAllApprovedCourses);

router.get("/courses/rejected", courseController.getRejectedCourses);




router.delete('/courses/:courseId/chapters/:chapterId/questions/:questionId',courseController.deleteQuestion);

module.exports = router;




//edited for cloudinary route thing 

// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//       cb(null, 'temp'); // Temporary storage, files will be uploaded to Cloudinary and then deleted
//     },
//     filename: function (req, file, cb) {
//       cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
//     }
//   });
  
//   // File filter to accept multiple file types
//   const fileFilter = (req, file, cb) => {
//     const filetypes = /jpeg|jpg|png|gif|mp4|avi|mov|mkv|pdf/;
//     const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
//     const mimetype = filetypes.test(file.mimetype);
  
//     if (extname && mimetype) {
//       return cb(null, true);
//     } else {
//       cb(new Error('Invalid file type. Only JPEG, PNG, GIF, MP4, AVI, MOV, MKV, and PDF files are allowed.'));
//     }
//   };
  
//   const upload = multer({
//     storage: storage,
//     fileFilter: fileFilter,
//     limits: { fileSize: 30 * 1024 * 1024 } // 30MB limit
//   });
  
//   // Route to create a new course
//   router.post('/', upload.fields([
//     { name: 'files', maxCount: 10 }, // Handle various files
//     { name: 'coverPage', maxCount: 1 } // Handle coverPage files
//   ]), courseController.createCourse);