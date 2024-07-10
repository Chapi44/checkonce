const express = require("express");
const router = express.Router();
const authcontroller = require("../controllers/authController");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const {
    authenticate
} = require("../middleware/authentication")



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

// Routes for Instructor CRUD operations
router.post("/registerinsructor", upload.fields([
  { name: 'idCard', maxCount: 1 },
  { name: 'instructorLicense', maxCount: 6 }
]), authcontroller.registerInstructor);

// Other authentication routes
router.post("/registerasacompany", authcontroller.registerUsersAsCompany);
router.post("/registerasacompanyowner", authcontroller.registercompanyowner);

router.post("/login", authcontroller.signin);
router.post('/reguser', authcontroller.registeruser);
router.post("/forgot-password", authcontroller.forgotPassword);
router.post("/reset-password", authcontroller.ResetPassword);
router.get('/instructors', authcontroller.getAllInstructors);
router.get('/instructors/:instructorId', authcontroller.getInstructorById);
router.get("/users/:userId",authcontroller.getUsersByUserId);
router.post('/logout', authenticate, authcontroller.logout);
router.put("/instructors/:instructorId", upload.fields([
    { name: 'idCard', maxCount: 1 },
    { name: 'instructorLicense', maxCount: 6 }
  ]), authcontroller.updateInstructorById);
  router.put("/users/:userId", authcontroller.updateUserById);
router.get('/protected-route', authenticate, (req, res) => {
    res.status(200).json({ message: 'This is a protected route', user: req.user });
  });
  
module.exports = router;
