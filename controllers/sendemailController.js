const nodemailer = require('nodemailer');
require('dotenv').config(); // To use environment variables from .env file
const emailUser = process.env.EMAIL_USER;
const emailPassword = process.env.EMAIL_PASSWORD;

const transporter = nodemailer.createTransport({
  host: "mail.kegeberewtech.com",
  port: 465,
  secure: true,
  auth: {
    user: emailUser,
    pass: emailPassword,
  },
});

const sendRejectionEmail = (to, reason) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: to,
    subject: 'Instructor Application Rejected',
    text: `Dear Instructor,\n\nYour application has been rejected for the following reason:\n\n${reason}\n\nBest regards,\nYour Team`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log('Error sending email:', error);
    } else {
      console.log('Email sent:', info.response);
    }
  });
};


const sendApprovalEmail = (to) => {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: to,
      subject: 'Instructor Application Approved',
      text: `Dear Instructor,\n\nCongratulations! Your application has been approved.\n\nBest regards,\nYour Team`,
    };
  
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('Error sending email:', error);
      } else {
        console.log('Email sent:', info.response);
      }
    });
  };
module.exports = {
  sendRejectionEmail,
  sendApprovalEmail
};
