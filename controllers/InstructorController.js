const Instructor = require('../model/instructor');
const { sign } = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { StatusCodes } = require('http-status-codes');
const fs = require('fs');
const path = require('path');
const jwt = require("jsonwebtoken");
const { sendApprovalEmail, sendRejectionEmail } = require('./sendemailController'); 
const baseURL = process.env.BASE_URL;

const createtutorInstructor = async (req, res) => {
  try {
    const { userName, fullName, phoneNumber, email, password, gender, price, experience, location, bio,  pictures, availableTime, teachingCapacity,categories,grade,Roomid} = req.body;
    const role = "tutorinstructor";
    const emailAlreadyExists = await Instructor.findOne({ email });
    
    if (emailAlreadyExists) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "Email already exists" });
    }

    const phoneNumberAlreadyExists = await Instructor.findOne({ phoneNumber });
    if (phoneNumberAlreadyExists) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "Phone number already exists" });
    }

    // Validate teaching capacity
    if (!teachingCapacity || teachingCapacity <= 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "Teaching capacity must be provided and greater than 0" });
    }

    // Check if files are included in the request for ID cards
    if (!req.files || !req.files['idCard'] || req.files['idCard'].length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: 'No ID card files uploaded' });
    }

    // // Check if files are included in the request for instructor licenses
    // if (!req.files || !req.files['instructorLicense'] || req.files['instructorLicense'].length === 0) {
    //   return res.status(StatusCodes.BAD_REQUEST).json({ error: 'No instructor license files uploaded' });
    // }

    // Map uploaded ID card image files to their URLs with base URL
    const idCardImages = req.files['idCard'].map(file => baseURL + "/uploads/instructor/idcards/" + file.filename);

    // // Map uploaded instructor license image files to their URLs with base URL
    // const instructorLicenseImages = req.files['instructorLicense'].map(file => baseURL + "/uploads/instructor/instructorlicense/" + file.filename);

    // Create instructor
    const instructor = await Instructor.create({
      userName,
      fullName,
      phoneNumber,
      email,
      grade,
      categories,
      password,
      gender,
      experience,
      bio,
      location,
      idCard: idCardImages,
      // instructorLicense: instructorLicenseImages,
      role,
      availableTime,
      pictures,
      price,
      Roomid,
      teachingCapacity
    });

    const secretKey = process.env.JWT_SECRET;
    const tokenExpiration = process.env.JWT_LIFETIME;

    if (!secretKey) {
      throw new CustomError.InternalServerError("JWT secret key is not configured.");
    }

    if (!tokenExpiration) {
      throw new CustomError.InternalServerError("Token expiration is not configured.");
    }

    const token = jwt.sign(
      { 
        userId: instructor._id,
        email: instructor.email,
        role: instructor.role,
        userName: instructor.userName,
        firstName: instructor.firstName,
        lastName: instructor.lastName,
        phoneNumber: instructor.phoneNumber,
        gender: instructor.gender,
        experience: instructor.experience,
        location: instructor.location,
        idCard: instructor.idCard,
        // instructorLicense: instructor.instructorLicense,
        availableTime: instructor.availableTime,
        pictures: instructor.pictures,
        teachingCapacity: instructor.teachingCapacity
      },
      secretKey,
      { expiresIn: tokenExpiration }
    );

    // Set the token as a cookie
    res.cookie('token', token, {
      httpOnly: true, // Prevents client-side access to the cookie
      maxAge: 1000 * 60 * 60 * 24 * 7, // Cookie expiry time (7 days in this case)
      // secure: true, // Uncomment this line if using HTTPS
      // sameSite: 'none' // Uncomment this line if using cross-site requests
    });

    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Successfully registered",
      token,
      instructor

    });
  } catch (error) {
    console.error(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};

const getAlltutorInstructors = async (req, res) => {
  try {
    // Parse query parameters for pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10; // Default limit is 10
    const skip = (page - 1) * limit;

    // Parse filtering query parameters
    const { status, categories, grade, gender, location } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (categories) filter.categories = { $in: categories.split(',') };
    if (grade) filter.grade = grade;
    if (gender) filter.gender = gender;
    if (location) filter.location = { $in: location.split(',') };

    // Get total number of instructors that match the filter
    const totalInstructors = await Instructor.countDocuments(filter);

    // Fetch instructors with pagination and filtering
    const instructors = await Instructor.find(filter)
      .populate('reviews')
      .sort({ createdAt: -1 }) // Sort by creation date in descending order
      .skip(skip)
      .limit(limit)
      .exec();

    res.status(200).json({
      instructors,
      currentPage: page,
      totalPages: Math.ceil(totalInstructors / limit),
      totalInstructors
    });
  } catch (error) {
    console.error("Error fetching all instructors:", error);
    res.status(500).json({ message: error.message });
  }
};

const getInstructorByRoomId = async (req, res) => {
  try {
    const { roomId, userId } = req.params;
    const instructor = await Instructor.findOne({ Roomid: roomId });

    if (!instructor) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: 'Instructor not found' });
    }

    const isUserEnrolled = instructor.userWhoHasEnrolled.includes(userId);

    if (isUserEnrolled) {
      return res.status(StatusCodes.OK).json({ message: 'User is enrolled', enrolled: true });
    } else {
      return res.status(StatusCodes.OK).json({ message: 'User is not enrolled', enrolled: false });
    }
  } catch (error) {
    console.error("Error fetching instructor by room ID:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};

const logintutorInstructor = async (req, res) => {
  try {
    const { emailOrPhoneNumber, password } = req.body;

    if (!emailOrPhoneNumber || !password) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Please provide email or phone number and password" });
    }

    const user = await Instructor.findOne({
      $or: [{ email: emailOrPhoneNumber }, { phoneNumber: emailOrPhoneNumber }]
    });

    if (!user) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Invalid Credentials" });
    }

    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Password is incorrect" });
    }

    const secretKey = process.env.JWT_SECRET;
    const tokenExpiration = process.env.JWT_LIFETIME;

    if (!secretKey || !tokenExpiration) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "JWT secret key or token expiration not configured" });
    }

    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        role: user.role,
        pictures: user.pictures,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        status: user.status
      },
      secretKey,
      { expiresIn: tokenExpiration }
    );

    // Attach the token as a cookie
    res.cookie('token', token, {
      // httpOnly: true, // Prevents client-side access to the cookie
      maxAge: 1000 * 60 * 60 * 24 * 7, // Cookie expiry time (7 days in this case)
      // secure: true, // Uncomment this line if using HTTPS
      // sameSite: 'none' // Uncomment this line if using cross-site requests
    });

    res.status(StatusCodes.OK).json({ token });
  } catch (error) {
    console.error(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Internal server error" });
  }
};

const gettutorInstructorById = async (req, res) => {
  try {
    const { id } = req.params;
    const instructor = await Instructor.findById(id).populate("reviews");

    if (!instructor) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Instructor not found" });
    }

    // Calculate totalAmountEarned based on the number of users who have enrolled
    const totalAmountEarned = instructor.price * instructor.userWhoHasEnrolled.length;
    const calculatedTotalAmountEarned = totalAmountEarned * 0.60; // 60% of the total amount earned

    // Update the instructor object with the calculated fields
    instructor.totalAmountEarned = totalAmountEarned;
    instructor.calculatedTotalAmountEarned = calculatedTotalAmountEarned;

    res.status(StatusCodes.OK).json({
      ...instructor.toObject(),
      totalAmountEarned,
      calculatedTotalAmountEarned
    });
  } catch (error) {
    console.error(error.message);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};


const updatetutorInstructorById = async (req, res) => {
  try {
    const { id } = req.params;
    const { userName, fullName, phoneNumber, email, password, gender, experience, location, availableTime, teachingCapacity, categories, grade,Roomid } = req.body;

    // Check if the instructor exists
    const instructor = await Instructor.findById(id);
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
    instructor.userName = userName || instructor.userName;
    instructor.fullName = fullName || instructor.fullName;
    instructor.phoneNumber = phoneNumber || instructor.phoneNumber;
    instructor.email = email || instructor.email;
    if (password) {
      instructor.password = await bcrypt.hash(password, 10); // Hash the password before saving
    }
    instructor.gender = gender || instructor.gender;
    instructor.experience = experience || instructor.experience;
    instructor.location = location || instructor.location;
    instructor.availableTime = availableTime || instructor.availableTime;
    instructor.teachingCapacity = teachingCapacity || instructor.teachingCapacity;
    instructor.categories = categories || instructor.categories;
    instructor.grade = grade || instructor.grade;
    instructor.Roomid = Roomid || instructor.Roomid;
    instructor.price = price || instructor.price;




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

const approvetutorInstructorById = async (req, res) => {
  try {
    const { id } = req.params;
    const {email}= req.body;
    const updatedInstructor = await Instructor.findByIdAndUpdate(id, { status: "Approved" }, { new: true });

    if (!updatedInstructor) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Instructor not found" });
    }
     // Send approval email
     sendApprovalEmail(email);

    res.status(StatusCodes.OK).json({ instructor: updatedInstructor, message: "Instructor approved successfully" });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

const rejecttutorInstructorById = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason, email } = req.body; // Extract rejection reason from request body

    const updatedInstructor = await Instructor.findByIdAndUpdate(
      id,
      { 
        status: "Rejected",
        rejectionReason: rejectionReason // Save rejection reason
      },
      { new: true }
    );

    if (!updatedInstructor) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Instructor not found" });
    }

    sendRejectionEmail(email, rejectionReason);

    res.status(StatusCodes.OK).json({ instructor: updatedInstructor, message: "Instructor rejected successfully" });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

const deletetutorInstructorById = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedInstructor = await Instructor.findByIdAndDelete(id);

    if (!deletedInstructor) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Instructor not found' });
    }

    // Delete images associated with the instructor
    await deleteInstructorImages(deletedInstructor.idCard, deletedInstructor.instructorLicense);

    res.status(StatusCodes.OK).json({ message: 'Instructor deleted successfully' });
  } catch (error) {
    console.error('Error deleting instructor by ID:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
  }
};

const deleteInstructorImages = async (idCardImages, instructorLicenseImages) => {
  try {
    const deleteImages = async (images, folder) => {
      images.forEach((image) => {
        const filename = path.basename(image);
        const imagePath = path.join(__dirname, '..', 'uploads', 'instructor', folder, filename);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      });
    };

    await deleteImages(idCardImages, 'idcards');
    await deleteImages(instructorLicenseImages, 'instructorlicense');
  } catch (error) {
    console.error('Error deleting instructor images:', error);
  }
};

const gettutorInstructorProfile = async (req, res) => {
  try {
    const { id } = req.user;
    const instructor = await Instructor.findById(id);

    if (!instructor) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Instructor not found"});
    }
      res.status(200).json(vendor);
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: error.message });
    }
};


module.exports = {
    createtutorInstructor,
    getAlltutorInstructors,
    gettutorInstructorById,
    logintutorInstructor,
    updatetutorInstructorById,
    approvetutorInstructorById,
    rejecttutorInstructorById,
    deletetutorInstructorById,
    gettutorInstructorProfile,
    getInstructorByRoomId
}