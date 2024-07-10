const express = require('express');
const router = express.Router();
const multer = require('multer');
const instructorController = require('../controllers/InstructorController');
const path = require('path');

const {
    authenticateUser,
    authorizePermissions,
  
  }= require("../middleware/authentication")


// Multer configuration for handling image uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Check the fieldname to determine the destination folder
        if (file.fieldname === 'idCard') {
            cb(null, 'uploads/instructor/idcards');
        } else if (file.fieldname === 'instructorLicense') {
            cb(null, 'uploads/instructor/instructorlicense');
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

// Routes for Instructor CRUD operations
router.post("/", upload.fields([
    { name: 'idCard', maxCount: 6 },
    { name: 'instructorLicense', maxCount: 6 }
]), instructorController.createtutorInstructor);

router.get("/", instructorController.getAlltutorInstructors);

router.get("/:id", instructorController.gettutorInstructorById);

router.put("/:id", upload.fields([
    { name: 'idCard', maxCount: 6 },
    { name: 'instructorLicense', maxCount: 6 }
]), instructorController.updatetutorInstructorById);


router.post("/login", instructorController.logintutorInstructor);

router.put("/reject/:id", instructorController.rejecttutorInstructorById);

router.put("/approve/:id", instructorController.approvetutorInstructorById);

router.delete("/:id", instructorController.deletetutorInstructorById);

router.get('/instructors/room/:roomId/:userId', instructorController.getInstructorByRoomId);

module.exports = router;
