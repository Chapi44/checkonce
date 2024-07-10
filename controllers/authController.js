const { StatusCodes } = require("http-status-codes" );
const User = require("../model/user");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const TutorInstructor = require('../model/instructor');

const nodemailer = require('nodemailer');

const baseURL = process.env.BASE_URL;
const emailUser = process.env.EMAIL_USER;
const emailPassword = process.env.EMAIL_PASSWORD;
const baseURL1 = process.env.BASE_URL1;


const transporter = nodemailer.createTransport({
  host: "mail.kegeberewtech.com",
  port: 465,
  secure: true,
  auth: {
    user: emailUser,
    pass: emailPassword,
  },
});


const registercompanyowner = async (req, res) => {
  try {
    let { fullname, email, password, userId } = req.body;
    const role = "company_owner";
    const emailAlreadyExists = await User.findOne({ email });
    
    if (emailAlreadyExists) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "Email already exists" });
    }

    // Create the user in the database
    const user = await User.create({
      fullname,
      email,
      password,
      role,
      userId
    });

    // Generate JWT token for the user
    const secretKey = process.env.JWT_SECRET;
    const tokenExpiration = process.env.JWT_LIFETIME;

    if (!secretKey || !tokenExpiration) {
      throw new Error("JWT secret key or token expiration is not configured.");
    }

    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        role: user.role,
        fullname: user.fullname,
      },
      secretKey,
      { expiresIn: tokenExpiration }
    );

    // Send email to the company owner with login credentials
    const mailOptions = {
      from: emailUser,
      to: email,
      subject: 'Registration Successful - Login Credentials',
      html: `<p>Hello ${fullname},</p>
             <p>Your registration as a company owner is successful.</p>
             <p>Please use the following credentials to log in:</p>
             <p>Email: ${email}</p>
             <p>Password: ${password}</p>
             <p>Thank you!</p>
             <p>Click <a href="https://kegeberewuniversity.com/accounts/login">here</a> to login.</p>`
    };

    transporter.sendMail(mailOptions, function(error, info) {
      if (error) {
        console.error("Error sending email:", error);
      } else {
        console.log("Email sent:", info.response);
      }
    });

    // Return success response with token and user details
    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Successfully registered",
      token,
      user
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};


const sendInvitationEmail = async (email, userId) => {
  const token = jwt.sign({ email, userId }, process.env.JWT_SECRET, { expiresIn: '1d' });
  const registrationLink = `${baseURL1}?s=${token}`;

  const mailOptions = {
    from: emailUser,
    to: email,
    subject: 'Invitation to Register',
    html: `<p>You have been invited to register. Please click on the following link to complete your registration:</p><a href="${registrationLink}">${registrationLink}</a>`,
  };

  await transporter.sendMail(mailOptions);
};


const registerUsersAsCompany = async (req, res) => {
  
  try {
    const { emails, userIds } = req.body; // Array of emails and userIds
console.log(req.body);
    // Ensure userIds is always an array
    const userIdArray = Array.isArray(userIds) ? userIds : [userIds];

    const invitedEmails = [];
    const existingEmails = [];

    for (const email of emails) {
      let user = await User.findOne({ email });

      if (user) {
        // If the user already exists, update their userId field
        user.userId = [...new Set([...user.userId, ...userIdArray])]; // Merge arrays and remove duplicates
        await user.save();
        existingEmails.push(email);
      } else {
        // If the user does not exist, only send invitation email
        await sendInvitationEmail(email, userIdArray);
        invitedEmails.push(email);
      }
    }

    res.status(StatusCodes.CREATED).json({ invitedEmails, existingEmails });
  } catch (error) {
    console.error(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};


// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: emailUser,
//     pass: emailPassword,
//   },
// });

// const sendInvitationEmail = async (email, userId) => {
//   const token = jwt.sign({ email, userId }, process.env.JWT_SECRET, { expiresIn: '1d' });
//   const registrationLink = `${baseURL}/register?token=${token}`;

//   const mailOptions = {
//     from: emailUser,
//     to: email,
//     subject: 'Invitation to Register',
//     html: `<p>You have been invited to register. Please click on the following link to complete your registration:</p><a href="${registrationLink}">${registrationLink}</a>`,
//   };

//   await transporter.sendMail(mailOptions);
// };

// const registerUsersAsCompany = async (req, res) => {
//   try {
//     const { emails, userId } = req.body; // Array of emails and userId
//     const createdUsers = [];
//     const existingEmails = [];

//     for (const email of emails) {
//       const status = "Pending";
//       const role = "user";

//       const existingUser = await User.findOne({ email });

//       if (existingUser) {
//         existingEmails.push(email);
//       } else {
//         // Create a default password
//         const defaultPassword = "defaultPassword123";
//         const hashedPassword = await bcrypt.hash(defaultPassword, 10);

//         // Create the user with userId
//         const user = await User.create({
//           fullname: "Pending Registration",
//           email,
//           password: hashedPassword,
//           role,
//           phoneNumber: null,
//           status,
//           userId: userId, // Associate user with userId
//         });

//         await sendInvitationEmail(email, userId);
//         createdUsers.push(user);
//       }
//     }

//     res.status(StatusCodes.CREATED).json({ createdUsers, existingEmails });
//   } catch (error) {
//     console.error(error);
//     res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
//   }
// };


const registeruser = async (req, res) => {
  try {
    let { fullname, email, password, phoneNumber, pictures, userId } = req.body;
    const role = "user";
    
    const emailAlreadyExists = await User.findOne({ email });
    
    if (emailAlreadyExists) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "Email already exists" });
    }

    const phoneNumberAlreadyExists = await User.findOne({ phoneNumber });
    if (phoneNumberAlreadyExists) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "Phone number already exists" });
    }

    const user = await User.create({
      fullname,
      email,
      password,
      role,
      pictures,
      phoneNumber,
      userId
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
        userId: user._id,
        email: user.email,
        role: user.role,
        pictures: user.pictures,
        fullname: user.fullname,
        phoneNumber: user.phoneNumber,
      },
      secretKey,
      { expiresIn: tokenExpiration }
    );

    // Set the token as a cookie
    // res.cookie('token', token, {
    //   httpOnly: true, // Prevents client-side access to the cookie
    //   maxAge: 1000 * 60 * 60 * 24 * 7, // Cookie expiry time (7 days in this case)
    //   secure: false, // Uncomment this line if using HTTPS
    //   signed:true,
    //   // sameSite: 'none' // Uncomment this line if using cross-site requests
    // });

    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Successfully registered",
      token,
      user
    });
  } catch (error) {
    console.error(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};


const registerInstructor = async (req, res) => {

  try {
    const { userName,fullname, phoneNumber, email, password, Gender, Exprience, Location,createCourseas,productionstudio } = req.body;
    const role = "instructor";
    const emailAlreadyExists = await User.findOne({ email });
    
    if (emailAlreadyExists) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "Email already exists" });
    }

    const phoneNumberAlreadyExists = await User.findOne({ phoneNumber });
    if (phoneNumberAlreadyExists) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "Phone number already exists" });
    }

    // Check if files are included in the request for ID cards
    if (!req.files || !req.files['idCard'] || req.files['idCard'].length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: 'No ID card files uploaded' });
    }

    // Check if files are included in the request for instructor licenses
    if (!req.files || !req.files['instructorLicense'] || req.files['instructorLicense'].length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: 'No instructor license files uploaded' });
    }

    // Map uploaded ID card image files to their URLs with base URL
    const idCardImages = req.files['idCard'].map(file => baseURL + "/uploads/instructor/idcards/" + file.filename);

    // Map uploaded instructor license image files to their URLs with base URL
    const instructorLicenseImages = req.files['instructorLicense'].map(file => baseURL + "/uploads/instructor/instructorlicense/" + file.filename);

    const instructor = await User.create({
      userName,
      fullname ,
      phoneNumber,
      email,
      password,
      Gender,
      Exprience,
      Location,
      idCard: idCardImages,
      instructorLicense: instructorLicenseImages,
      role,
      createCourseas,
      productionstudio
    });


    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Successfully registered",
      instructor
    });
  } catch (error) {
    console.error(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};


// const signin = async (req, res) => {
//   const { emailOrPhoneNumber, password } = req.body;

//   if (!emailOrPhoneNumber || !password) {
//     return res.status(400).json({ message: "Please provide email or phone number and password" });
//   }

//   const user = await User.findOne({
//     $or: [{ email: emailOrPhoneNumber }, { phoneNumber: emailOrPhoneNumber }]
//   });

//   if (!user) {
//     return res.status(400).json({ message: "Invalid Credentials" });
//   }

//   const match = await bcrypt.compare(password, user.password);

//   if (!match) {
//     return res.status(400).json({ message: "Password is incorrect" });
//   }

//   const secretKey = process.env.JWT_SECRET;
//   const tokenExpiration = process.env.JWT_LIFETIME;

//   if (!secretKey || !tokenExpiration) {
//     return res.status(500).json({ message: "JWT secret key or token expiration not configured" });
//   }

//   // Generate a new session token
//   const sessionToken = new mongoose.Types.ObjectId().toString();
//   user.sessionToken = sessionToken;
//   await user.save();

//   const token = jwt.sign(
//     { 
//       userId: user._id,
//       email: user.email,
//       role: user.role,
//       pictures: user.pictures,
//       fullname: user.fullname,
//       phoneNumber: user.phoneNumber,
//       status: user.status,
//       sessionToken  // Include the session token in the JWT payload
//     },
//     secretKey,
//     { expiresIn: tokenExpiration }
//   );

//   // res.cookie('token', token, {
//   //   httpOnly: true, // Prevents client-side access to the cookie
//   //   maxAge: 1000 * 60 * 60 * 24 * 7, // Cookie expiry time (7 days in this case)
//   //   secure: true, // Uncomment this line if using HTTPS
//   //   sameSite: 'none' // Uncomment this line if using cross-site requests
//   // });

//   res.status(StatusCodes.OK).json({
//     token,
//     user
//   });
// };


const signin = async (req, res) => {
  const { emailOrPhoneNumber, password } = req.body;

  if (!emailOrPhoneNumber || !password) {
    return res.status(400).json({ message: "Please provide email or phone number and password" });
  }

  // Try to find the user in the User collection
  let user = await User.findOne({
    $or: [{ email: emailOrPhoneNumber }, { phoneNumber: emailOrPhoneNumber }]
  });

  // If the user is not found in the User collection, try the TutorInstructor collection
  if (!user) {
    user = await TutorInstructor.findOne({
      $or: [{ email: emailOrPhoneNumber }, { phoneNumber: emailOrPhoneNumber }]
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid Credentials" });
    }
  }

  // Compare password
  const match = await bcrypt.compare(password, user.password);

  if (!match) {
    return res.status(400).json({ message: "Password is incorrect" });
  }

  const secretKey = process.env.JWT_SECRET;
  const tokenExpiration = process.env.JWT_LIFETIME;

  if (!secretKey || !tokenExpiration) {
    return res.status(500).json({ message: "JWT secret key or token expiration not configured" });
  }

  // Generate a new session token
  const sessionToken = new mongoose.Types.ObjectId().toString();
  user.sessionToken = sessionToken;
  await user.save();

  // Generate the JWT payload based on the user type
  const tokenPayload = {
    userId: user._id,
    email: user.email,
    role: user.role,
    pictures: user.pictures,
    fullname: user.fullname || user.fullName,
    phoneNumber: user.phoneNumber,
    status: user.status,
    sessionToken  // Include the session token in the JWT payload
  };

  // Additional fields for TutorInstructor
  if (user.role === 'tutorinstructor') {
    tokenPayload.availableTime = user.availableTime;
    tokenPayload.teachingCapacity = user.teachingCapacity;
    tokenPayload.gender = user.gender;
    tokenPayload.experience = user.experience;
    tokenPayload.location = user.location;
    tokenPayload.idCard = user.idCard;
    // Add other relevant fields if needed
  }

  const token = jwt.sign(tokenPayload, secretKey, { expiresIn: tokenExpiration });

  res.status(StatusCodes.OK).json({
    token,
    user
  });
};


const logout = async (req, res) => {
  try {
    const user = req.user;
    user.sessionToken = null;
    await user.save();
    res.clearCookie('token');
    res.status(StatusCodes.OK).json({ message: "Successfully logged out" });
  } catch (error) {
    console.error(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Internal server error" });
  }
};


const forgotPassword = async (req, res) => {
  try {
    var email = req.body.email;
    console.log(req.body);
    const user = await User.findOne({ email });
    if (!user) {
      console.log("User Not found");
      return res.status(404).json({ error: "User Not found" });
    }

    console.log("forget password");
    var nodemailer = require("nodemailer");
    var transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "enterct35i@gmail.com",
        pass: "eivj sueg qdqg zmsl",
      },
    });
    const forgotPasswordToken = jwt.sign(
      { userEmail: email },
      "Wintu-Yoni@2022",
      {
        expiresIn: "4h",
      }
    );

    // var forgotPasswordLink =
    //   "http://localhost:3000/login/?token=" + forgotPasswordToken;
    console.log("hello", email);
    if (email) {
      console.log(email);

      var forgotPasswordLink = `http://localhost:3000/reset-password/?token=${forgotPasswordToken}`;
      var mailOptions = {
        from: "socialmedia@gmail.com",
        to: email,
        subject: "Reset Password",
        html:
          '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">' +
          '<html xmlns="http://www.w3.org/1999/xhtml"><head>' +
          '<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />' +
          "<title>Forgot Password</title>" +
          "<style> body {background-color: #FFFFFF; padding: 0; margin: 0;}</style></head>" +
          '<body style="background-color: #FFFFFF; padding: 0; margin: 0;">' +
          '<table style="max-width: 650px; background-color: #2F6296; color: #ffffff;" id="bodyTable">' +
          '<tr><td align="center" valign="top">' +
          '<table id="emailContainer" style="font-family: Arial; color: #FFFFFF; text-align: center;">' +
          '<tr><td align="left" valign="top" colspan="2" style="border-bottom: 1px solid #CCCCCC; padding-  bottom: 10px;">' +
          "</td></tr><tr>" +
          '<td align="left" valign="top" colspan="2" style="border-bottom: 1px solid #FFFFFF; padding: 20px 0 10px 0;">' +
          '<span style="font-size: 24px; font-weight: normal;color: #FFFFFF">FORGOT PASSWORD</span></td></tr><tr>' +
          '<td align="left" valign="top" colspan="2" style="padding-top: 10px;">' +
          '<span style="font-size: 18px; line-height: 1.5; color: #333333;">' +
          " We have sent you this email in response to your request to reset your password on <a href='http://localhost:3000'>NeuroGen AI System</a><br/><br/>" +
          'To reset your password for, please follow the link below: <button style="font:inherit; cursor: pointer; border: #272727 2px solid; background-color: transparent; border-radius: 5px;"><a href="' +
          forgotPasswordLink +
          '"style="color: #272727; text-decoration: none;">Reset Password</a></button><br/><br/>' +
          "We recommend that you keep your password secure and not share it with anyone.If you didn't request to this message, simply ignore this message.<br/><br/>" +
          "Saarada Management System </span> </td> </tr> </table> </td> </tr> </table> </body></html>",
      };

      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.log(error);
          return res.json({
            ErrorMessage: error,
          });
        } else {
          console.log("succcesssss");
          return res.json({
            SuccessMessage: "email successfully sent!",
          });
        }
      });
    } else {
      return res.json({
        ErrorMessage: "Email can't be none!",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};


const ResetPassword = async (req, res) => {
  console.log(req.body);
  try {
    const { newPassword, email } = req.body;
    console.log(newPassword, email);
    const encreptedPassword = await bcrypt.hash(newPassword, 10);
    console.log(encreptedPassword);
    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }
    // Use the updateOne method with async/await
    const result = await User.updateOne(
      { email: email },
      { $set: { password: encreptedPassword } }
    );
    console.log(result);

    // Check the result and handle it accordingly
    if (result.modifiedCount === 1) {
      return res.json({ message: "Password reset successful" });
    } else {
      return res
        .status(404)
        .json({ message: "User not found or password not modified" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};


const getAllInstructors = async (req, res) => {
  try {
    // Find all users with role 'instructor'
    const instructors = await User.find({ role: 'instructor' }, { password: 0 }).sort({ createdAt: -1 }); // Exclude password field from response

    if (!instructors || instructors.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "No instructors found" });
    }

    return res.status(StatusCodes.OK).json({ instructors });
  } catch (error) {
    console.error(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};


const getInstructorById = async (req, res) => {
  try {
    const { instructorId } = req.params; // Assuming the ID is passed in the request parameters
    const instructor = await User.findOne({ _id: instructorId, role: 'instructor' }, { password: 0 });

    if (!instructor) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Instructor not found" });
    }

    return res.status(StatusCodes.OK).json({ instructor });
  } catch (error) {
    console.error(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};



const getUsersByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find users associated with the userId
    const users = await User.find({ userId });

    // If no users found, return a not found response
    if (!users || users.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "No users found for the provided userId" });
    }

    // Return the list of users
    res.status(StatusCodes.OK).json({ users });
  } catch (error) {
    console.error(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};



const updateInstructorById = async (req, res) => {
  try {
    const { instructorId } = req.params;
    const updates = req.body;

    // Remove password field if present in update data
    if ('password' in updates) {
      delete updates.password;
    }

    // Check if files are included in the request for ID cards
    if (req.files && req.files['idCard']) {
      const idCardImages = req.files['idCard'].map(file => baseURL + "/uploads/instructor/idcards/" + file.filename);
      updates.idCard = idCardImages;
    }

    // Check if files are included in the request for instructor licenses
    if (req.files && req.files['instructorLicense']) {
      const instructorLicenseImages = req.files['instructorLicense'].map(file => baseURL + "/uploads/instructor/instructorlicense/" + file.filename);
      updates.instructorLicense = instructorLicenseImages;
    }

    const instructor = await User.findOneAndUpdate(
      { _id: instructorId, role: { $in: ['instructor', 'company_owner'] } },
      updates,
      { new: true, runValidators: true }
    );

    if (!instructor) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Instructor not found" });
    }

    return res.status(StatusCodes.OK).json({ success: true, instructor });
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
      if (error.keyPattern.email) {
        return res.status(StatusCodes.CONFLICT).json({
          error: "Duplicate key error",
          message: "The email address is already in use."
        });
      } else if (error.keyPattern.phoneNumber) {
        return res.status(StatusCodes.CONFLICT).json({
          error: "Duplicate key error",
          message: "The phone number is already in use."
        });
      }
    }
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};


const updateUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    let updateData = req.body;

    // Remove password field if present in update data
    if ('password' in updateData) {
      delete updateData.password;
    }

    // Find the user by ID and update with new data
    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true, runValidators: true });

    if (!updatedUser) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "User not found" });
    }

    return res.status(StatusCodes.OK).json({ user: updatedUser });
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
      if (error.keyPattern.email) {
        return res.status(StatusCodes.CONFLICT).json({
          error: "Duplicate key error",
          message: "The email address is already in use."
        });
      } else if (error.keyPattern.phoneNumber) {
        return res.status(StatusCodes.CONFLICT).json({
          error: "Duplicate key error",
          message: "The phone number is already in use."
        });
      }
    }
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};



module.exports = {
  registerInstructor,
  registerUsersAsCompany,
  signin,
  forgotPassword,
  getAllInstructors,
  ResetPassword,
  registeruser,
  getInstructorById,
  getUsersByUserId,
  logout,
  updateInstructorById,
  updateUserById,
  registercompanyowner
};
