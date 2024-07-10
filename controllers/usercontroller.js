const User = require("../model/user");
const Course = require('../model/course');
const TutorInstructor = require('../model/instructor');
const CustomError = require("../errors"); 
const { StatusCodes } = require("http-status-codes");
const { sendApprovalEmail, sendRejectionEmail } = require('./sendemailController'); 
const moment = require("moment");

require("dotenv").config();

const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, status, gender, location } = req.query;

    // Parse page and limit to integers
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    // Build the filter object
    const filter = {};
    if (role) filter.role = role;
    if (status) filter.status = status;
    if (gender) filter.Gender = gender;
    if (location) filter.Location = location;

    // Calculate total number of users with the applied filters
    const totalUsers = await User.countDocuments(filter);

    // Fetch the users with pagination, filtering, and sorting
    const users = await User.find(filter)
      .sort({ createdAt: -1 }) // Sort by creation date in descending order
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber);

    // Calculate total number of pages
    const totalPages = Math.ceil(totalUsers / limitNumber);

    res.status(StatusCodes.OK).json({
      users,
      currentPage: pageNumber,
      totalPages,
      totalUsers,
    });
  } catch (error) {
    console.error(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Something went wrong" });
  }
};


const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: "Something went wrong" });
  }
};

const updateInstructor = async (req, res) => {
  try {
    const { userName } = req.params;
    const { fullname, phoneNumber, email, password, Gender, Exprience, Location, createCourseas } = req.body;
    
    // Check if instructor exists
    const instructor = await User.findOne({ userName });
    if (!instructor) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Instructor not found" });
    }

    // Handle ID card file update
    if (req.files && req.files['idCard'] && req.files['idCard'].length > 0) {
      // Delete previous ID card images
      if (instructor.idCard && instructor.idCard.length > 0) {
        instructor.idCard.forEach(async (image) => {
          const filename = image.split('/').pop();
          const imagePath = path.join(__dirname, '..', 'uploads', 'instructor', 'idcards', filename);
          try {
            if (fs.existsSync(imagePath)) {
              fs.unlinkSync(imagePath);
              console.log(`Deleted previous ID card: ${imagePath}`);
            } else {
              console.log(`Previous ID card not found: ${imagePath}`);
            }
          } catch (error) {
            console.error(`Error deleting previous ID card: ${imagePath}`, error);
          }
        });
      }

      // Map uploaded ID card image files to their URLs with base URL
      const idCardImages = req.files['idCard'].map(file => baseURL + "/uploads/instructor/idcards/" + file.filename);
      instructor.idCard = idCardImages;
    }

    // Handle instructor license file update
    if (req.files && req.files['instructorLicense'] && req.files['instructorLicense'].length > 0) {
      // Delete previous instructor license images
      if (instructor.instructorLicense && instructor.instructorLicense.length > 0) {
        instructor.instructorLicense.forEach(async (image) => {
          const filename = image.split('/').pop();
          const imagePath = path.join(__dirname, '..', 'uploads', 'instructor', 'instructorlicense', filename);
          try {
            if (fs.existsSync(imagePath)) {
              fs.unlinkSync(imagePath);
              console.log(`Deleted previous instructor license: ${imagePath}`);
            } else {
              console.log(`Previous instructor license not found: ${imagePath}`);
            }
          } catch (error) {
            console.error(`Error deleting previous instructor license: ${imagePath}`, error);
          }
        });
      }

      // Map uploaded instructor license image files to their URLs with base URL
      const instructorLicenseImages = req.files['instructorLicense'].map(file => baseURL + "/uploads/instructor/instructorlicense/" + file.filename);
      instructor.instructorLicense = instructorLicenseImages;
    }

    // Update instructor information
    instructor.fullname = fullname;
    instructor.phoneNumber = phoneNumber;
    instructor.email = email;
    instructor.password = password;
    instructor.Gender = Gender;
    instructor.Exprience = Exprience;
    instructor.Location = Location;
    instructor.createCourseas = createCourseas;

    await instructor.save();

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Instructor updated successfully",
      instructor
    });
  } catch (error) {
    console.error(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};


const getInstructorById = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the instructor by ID
    const instructor = await User.findById(id);

    if (!instructor) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Instructor not found" });
    }

    // Check if the user role is instructor
    if (instructor.role !== 'instructor') {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "User is not an instructor" });
    }

    // Fetch courses created by the instructor
    const courses = await Course.find({ createUser: id });

    let calculatedTotalAmountEarned = 0;

    for (const course of courses) {
      if (course.userWhoHasBought.length > 1000) {

        //this will be changed after mekdi talk 
        // If more than 1000 users enrolled
        if (instructor.productionstudio === "kegebrew University") {
          calculatedTotalAmountEarned += course.totalAmountEarned * 0.5; // 50%
        } else if (instructor.productionstudio === "Indiviual") {
          calculatedTotalAmountEarned += course.totalAmountEarned * 0.6; // 60%
        }
      } else {
        // Less than or equal to 1000 users enrolled
        if (instructor.productionstudio === "kegebrew University") {
          calculatedTotalAmountEarned += course.totalAmountEarned * 0.4; // 40%
        } else if (instructor.productionstudio === "Indiviual") {
          calculatedTotalAmountEarned += course.totalAmountEarned * 0.6; // 60%
        }
      }
    }

    // Save the calculated total amount earned in the database
    instructor.calculatedTotalAmountEarned = calculatedTotalAmountEarned;
    await instructor.save();

    // Return instructor details along with calculated totalAmountEarned
    res.status(StatusCodes.OK).json({
      success: true,
      instructor: {
        ...instructor.toObject(),
        calculatedTotalAmountEarned: calculatedTotalAmountEarned
      }
    });
  } catch (error) {
    console.error("Error fetching instructor by ID:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};

const withdrawAmount = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;

    // Fetch the instructor by ID
    const instructor = await User.findById(id);

    if (!instructor) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Instructor not found" });
    }

    // Check if the user role is instructor
    if (instructor.role !== 'instructor') {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "User is not an instructor" });
    }

    // Check if the instructor has enough funds to withdraw
    if (instructor.calculatedTotalAmountEarned < amount) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "Insufficient funds" });
    }

    // Process the withdrawal
    instructor.calculatedTotalAmountEarned -= amount;
    await instructor.save();

    // Respond with the remaining balance
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Withdrawal successful",
      remainingBalance: instructor.calculatedTotalAmountEarned,
    });
  } catch (error) {
    console.error("Error processing withdrawal:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};

const deleteuser = async (req, res) => {
  try {
    const { id } = req.params;
    const finduser = await User.findByIdAndDelete({ _id: id });
    if (!finduser) {
      return res.status(400).json({ error: "no such user found" });
    }
    return res.status(200).json({ message: "deleted sucessfully" });
  } catch (error) {
    res.status(500).json({ error: "something went wrong" });
  }
};

const updateUser = async (req, res) => {
  try {
    const {userId} = req.body;
    let updatedUser = await User.findById(userId);

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update name, bio, and username if available
    if (req.body.fullname) updatedUser.fullname = req.body.fullname;  
    if (req.body.phoneNumber) updatedUser.phoneNumber = req.body.phoneNumber;
  

    // Update email if available and validate format
    if (req.body.email) {
      const emailAlreadyExists = await User.findOne({ email: req.body.email });
      if (emailAlreadyExists) {
        return res.status(400).json({ error: "Email already exists" });
      }
      updatedUser.email = req.body.email;
    }

    // Update password if available
    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      updatedUser.password = await bcrypt.hash(req.body.password, salt);
    }

    // Handle pictures update if available
    if (req.files && req.files.length > 0) {
      const newPictures = req.files.map(
        (file) => `${process.env.BASE_URL}/uploads/profile/${file.filename}`
      );
      updatedUser.pictures = newPictures;
    }

    await updatedUser.save();

    // Respond with updated user data (excluding password)
    res.status(200).json({
      message: "User updated successfully",
      user: {
        _id: updatedUser._id,
        fullname: updatedUser.fullname,
        email: updatedUser.email,
        phoneNumber: updatedUser.phoneNumber,
        pictures: updatedUser.pictures,
    
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const updateUserPassword = async (req, res) => {
  const { oldPassword, newPassword,userId } = req.body;
  if (!oldPassword || !newPassword) {
    throw new CustomError.BadRequestError("Please provide both values");
  }
  const user = await User.findOne({ _id: userId });

  const isPasswordCorrect = await user.comparePassword(oldPassword);
  if (!isPasswordCorrect) {
    throw new CustomError.UnauthenticatedError("Invalid Credentials");
  }
  user.password = newPassword;

  await user.save();
  res.status(StatusCodes.OK).json({ msg: "Success! Password Updated." });
};

const deleteAllUsers = async (req, res) => {
  try {
    console.log("Before deleting all users");
    const result = await User.deleteMany ({});
    console.log("After deleting all users", result);

    res.status(200).json({ message: "All users deleted successfully" });
  } catch (error) {
    console.error("Error deleting all users:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


const enrollTutorInstructor = async (req, res) => {
  try {
    const { instructorId, userId } = req.body;

    // Check if the instructor exists
    const instructor = await TutorInstructor.findById(instructorId);
    if (!instructor) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: 'Instructor not found' });
    }

    // Check if the user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: 'User not found' });
    }

    // Check if the user is already enrolled with the instructor
    if (user.enrolledInstructors.some(inst => inst.instructor.equals(instructorId))) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: 'User already enrolled with this instructor' });
    }

    // Enroll the user with the instructor
    const enrollment = { instructor: instructorId, enrollmentTime: new Date() };
    user.enrolledInstructors.push(enrollment);
    await user.save();

    // Store the enrolled user's ID in the tutor instructor model
    instructor.userWhoHasEnrolled.push(userId);
    await instructor.save();

    res.status(StatusCodes.OK).json({ message: 'User enrolled with instructor successfully' });
  } catch (error) {
    console.error('Error enrolling user with instructor:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
  }
};


const enrollCourse = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const { userId } = req.body;

    // Check if the course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: 'Course not found' });
    }

    // Check if the user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: 'User not found' });
    }

    // Check if the user is already enrolled in the course
    if (course.userWhoHasBought.includes(userId)) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: 'User already enrolled in the course' });
    }

    // Add the user to the list of users who have bought the course
    course.userWhoHasBought.push(userId);

    // Add the course to the user's enrolled courses with progress set to 0
    const enrolledCourse = { course: courseId, progress: 0, lesson: [] };

    // Push all lesson IDs into the lesson array
    course.chapter.forEach(chap => {
      chap.LessonFile.forEach(lesson => {
        enrolledCourse.lesson.push({
          lessonId: lesson._id.toString(), // Convert ObjectId to string
          lessonTime: new Date().toISOString(), // Set the lesson time to current time
          progress: 0 // Set initial progress to 0
        });
      });
    });

    // Update the total amount earned for the course and the instructor if the course is paid
    if (course.paymentType === 'paid' && course.price) {
      course.totalAmountEarned += course.price;

      const instructor = await User.findById(course.createUser);
      if (instructor) {
        instructor.totalAmountEarned += course.price;
        await instructor.save();
      }
    }

    await course.save();

    user.enrolledCourses.push(enrolledCourse);
    await user.save();

    res.status(StatusCodes.OK).json({ message: 'User enrolled in the course successfully' });
  } catch (error) {
    console.error('Error enrolling user in course:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
  }
};


const getEnrolledCoursesByUserId = async (req, res) => {
  try {
    const userId = req.params.id;
    console.log('User ID:', userId);

    const user = await User.findById(userId)
      .populate({
        path: 'enrolledCourses.course',
        populate: {
          path: 'createUser',
          model: 'User'
        }
      });
    console.log('User:', user);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Calculate lesson count as the sum of progress values from all lessons
    const enrolledCoursesWithCounts = user.enrolledCourses.map(enrolledCourse => {
      // Calculate total lesson URL count
      let totalLessonUrls = 0;
      enrolledCourse.course.chapter.forEach(chap => {
        if (chap.LessonFile && Array.isArray(chap.LessonFile)) {
          totalLessonUrls += chap.LessonFile.length;
        }
      });
      console.log('Total Lesson URLs:', totalLessonUrls);

      // Multiply total lesson URLs count by 100
      totalLessonUrls *= 100;

      // Calculate lesson count as the sum of progress values from all lessons
      const lessonCount = enrolledCourse.lesson.reduce((totalProgress, lesson) => totalProgress + lesson.progress, 0);
      console.log('Lesson Count:', lessonCount);

      // Calculate progress as a percentage
      const progress = (lessonCount / totalLessonUrls);
      console.log('Progress:', progress);

      return {
        ...enrolledCourse.toObject(),
        lessonCount: lessonCount,
        lessonUrlCount: totalLessonUrls,
        progress: (progress * 100).toFixed(2) // Convert to percentage and limit to 2 decimal places
      };
    });
    console.log('Enrolled Courses with Counts:', enrolledCoursesWithCounts);

    res.status(200).json({ user, enrolledCourses: enrolledCoursesWithCounts });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: "Something went wrong" });
  }
};


const getEnrolledCourseByUserIdAndCourseId = async (req, res) => {
  try {
    const { userId } = req.body;
    const courseId = req.params.courseId;

    const user = await User.findById(userId).populate({
      path: 'enrolledCourses.course',
      populate: {
        path: 'createUser',
        model: 'User'
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const enrolledCourse = user.enrolledCourses.find(course => course.course.equals(courseId));

    if (!enrolledCourse) {
      return res.status(404).json({ error: "Course not found in enrolled courses" });
    }

    const populatedCourse = enrolledCourse.course;

    let totalLessonUrls = 0;
    populatedCourse.chapter.forEach(chap => {
      if (chap.LessonFile && Array.isArray(chap.LessonFile)) {
        totalLessonUrls += chap.LessonFile.length;
      }
    });

    totalLessonUrls *= 100;

    let totalProgress = 0;
    enrolledCourse.lesson.forEach(lesson => {
      if (!isNaN(lesson.progress)) {
        totalProgress += lesson.progress;
      }
    });

    let progress = 0;
    if (totalLessonUrls > 0) {
      progress = ((totalProgress / totalLessonUrls) * 100).toFixed(2);
    } else {
      progress = "0.00";  // Assign default value if totalLessonUrls is zero
    }

    res.status(200).json({
      course: populatedCourse,
      progress,
      _id: enrolledCourse._id,
      lessonCount: totalProgress,
      lessonUrlCount: totalLessonUrls,
      lesson: enrolledCourse.lesson
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};




const approveInstructor = async (req, res) => {
  const { instructorId } = req.params; // Assuming you pass the instructor's ID in the request params
  const {email}=req.body; 
  try {
    const instructor = await User.findById(instructorId);

    if (!instructor) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Instructor not found" });
    }

    if (instructor.role !== "instructor") {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "User is not an instructor" });
    }

    instructor.status = "Approved";
    await instructor.save();

    // Send approval email
    sendApprovalEmail(email);

    return res.status(StatusCodes.OK).json({ message: "Instructor approved successfully" });
  } catch (error) {
    console.error(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};


const rejectInstructor = async (req, res) => {
  const { instructorId } = req.params; // Assuming you pass the instructor's ID in the request params
  const { rejectionReason ,email} = req.body; // Assuming you pass the rejection reason in the request body

  try {
    const instructor = await User.findById(instructorId);

    if (!instructor) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Instructor not found" });
    }

    if (instructor.role !== "instructor") {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "User is not an instructor" });
    }

    instructor.status = "Rejected";
    instructor.rejectionReason = rejectionReason; // Save rejection reason
    await instructor.save();
  //  const email = req.body
    // Send rejection email
    sendRejectionEmail(email, rejectionReason);

    return res.status(StatusCodes.OK).json({ message: "Instructor rejected successfully" });
  } catch (error) {
    console.error(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};

async function updateCourseProgress(req, res) {
  try {
    const { courseId, progress } = req.body; // Assuming courseId and progress are sent in the request body
    const userId = req.user.userId; // Assuming userId is available in the request user object

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const index = user.enrolledCourses.findIndex(course => course.course.equals(courseId));
    if (index !== -1) {
      user.enrolledCourses[index].progress = progress;
      await user.save();
      return res.status(200).json({ message: 'Course progress updated successfully' });
    } else {
      return res.status(404).json({ error: 'Course not found in enrolledCourses' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}



async function updateLessonProgress(req, res) {
  try {
    const { courseId, lessonId, lessonTime, progress } = req.body; // Assuming courseId, lessonId, lessonTime, and progress are sent in the request body
    const {userId} = req.body; // Assuming userId is available in the request user object

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const index = user.enrolledCourses.findIndex(course => course.course.equals(courseId));
    if (index !== -1) {
      // Check if the lesson exists in the enrolled course, if not, add it
      const lessonIndex = user.enrolledCourses[index].lesson.findIndex(lesson => lesson.lessonId === lessonId);
      if (lessonIndex === -1) {
        user.enrolledCourses[index].lesson.push({ lessonId, lessonTime, progress });
      } else {
        // Update existing lesson's time and progress if it's not already at 100%
        if (user.enrolledCourses[index].lesson[lessonIndex].progress < 100) {
          user.enrolledCourses[index].lesson[lessonIndex].lessonTime = lessonTime;
          user.enrolledCourses[index].lesson[lessonIndex].progress = progress;
        }
      }

      await user.save();
      return res.status(200).json({ message: 'Course progress and lesson updated successfully' });
    } else {
      return res.status(404).json({ error: 'Course not found in enrolledCourses' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


const updateFinalAverage = async (req, res) => {
  try {
    const { userId, courseId, chapterId, finalaverage } = req.body;

    // Find the user by userId
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find the enrolled course of the user by courseId
    const enrolledCourse = user.enrolledCourses.find(course => course.course.equals(courseId));
    if (!enrolledCourse) {
      return res.status(404).json({ error: 'Course not found in enrolled courses' });
    }

    console.log('Enrolled Course:', enrolledCourse); // Debugging

    // Ensure the course object contains a course property
    if (!enrolledCourse.course) {
      return res.status(404).json({ error: 'Course object does not contain a course property' });
    }

    // Ensure the course property is an array
    if (!Array.isArray(enrolledCourse.course)) {
      return res.status(404).json({ error: 'Course property is not an array' });
    }

    // Ensure the course object contains a chapter property and it is an array
    if (!enrolledCourse.course.chapter || !Array.isArray(enrolledCourse.course.chapter)) {
      return res.status(404).json({ error: 'Course object does not contain a chapter property or it is not an array' });
    }

    // Find the chapter in the enrolled course
    const chapter = enrolledCourse.course.chapter.find(chap => chap._id.equals(chapterId));
    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found in the enrolled course' });
    }

    // Update the finalaverage for the chapter's questions
    if (chapter.questions && Array.isArray(chapter.questions)) {
      chapter.questions.forEach(question => {
        question.finalaverage = finalaverage;
      });
    }

    // Save the updated user
    await user.save();

    res.status(200).json({ message: 'Final average updated successfully' });
  } catch (error) {
    console.error('Error updating final average:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};



const enrollCourseForMultipleEmails = async (req, res) => {
  try {
    const { emails, courseId } = req.body;

    if (!Array.isArray(emails) || emails.length === 0 || emails.length > 10) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: 'Invalid or too many emails provided' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: 'Course not found' });
    }

    const enrolledCourses = [];

    for (const email of emails) {
      const user = await User.findOne({ email });
      if (!user) {
        console.log(`User with email ${email} not found, skipping...`);
        continue;
      }

      if (course.userWhoHasBought.includes(user._id)) {
        console.log(`User with email ${email} is already enrolled in the course, skipping...`);
        continue;
      }

      course.userWhoHasBought.push(user._id);
      await course.save();

      const enrolledCourse = { course: courseId, progress: 0, lesson: [] };

      // Push all lesson IDs into the lesson array
      course.chapter.forEach(chap => {
        chap.LessonFile.forEach(lesson => {
          enrolledCourse.lesson.push({
            lessonId: lesson._id.toString(), // Convert ObjectId to string
            lessonTime: new Date().toISOString(), // Set the lesson time to current time
            progress: 0 // Set initial progress to 0
          });
        });
      });

      user.enrolledCourses.push(enrolledCourse);
      await user.save();

      enrolledCourses.push({ email, courseId });
    }

    res.status(StatusCodes.OK).json({ message: 'Courses enrolled successfully', enrolledCourses });
  } catch (error) {
    console.error('Error enrolling courses for multiple emails:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
  }
};



const getEnrolledInstructorsByUserId = async (req, res) => {
  try {
    const userId = req.params.id;
    console.log('User ID:', userId);

    const user = await User.findById(userId)
      .populate('enrolledInstructors.instructor');

    console.log('User:', user);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ enrolledInstructors: user.enrolledInstructors });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: "Something went wrong" });
  }
};


module.exports = {
 getAllUsers,
 getUserById,
  deleteuser,
  updateUser,
  deleteAllUsers,
  updateUserPassword,
  getEnrolledCoursesByUserId,
  enrollCourse,
  updateCourseProgress,
  updateLessonProgress,
  updateInstructor,
  getEnrolledCourseByUserIdAndCourseId,
  approveInstructor,
  updateFinalAverage,
  enrollCourseForMultipleEmails,
  enrollTutorInstructor,
  rejectInstructor,
  getInstructorById,
  withdrawAmount,
  getEnrolledInstructorsByUserId
};
