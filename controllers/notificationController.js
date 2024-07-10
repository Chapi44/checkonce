const Notification = require("../model/notification");

const createNotification = async (type, userId, message) => {
  try {
    const notification = await Notification.create({
      type,
      userId,
      message,
      createdAt: new Date()
    });
    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};

const sendNotification = async (notification) => {
  // Here you can implement sending notifications via email, push notification, etc.
  console.log("Sending notification:", notification);
};

const notifyCourseCreated = async (courseId, userId) => {
  const message = `A new course (ID: ${courseId}) has been created. Check it out!`;
  await createNotification("course_created", userId, message);
};

const notifyCourseEnrolled = async (userId, courseId) => {
  const message = `You have successfully enrolled in the course (ID: ${courseId}).`;
  await createNotification("course_enrolled", userId, message);
};

const notifyCourseApproved = async (courseId, userId) => {
  const message = `The course (ID: ${courseId}) you created has been approved.`;
  await createNotification("course_approved", userId, message);
};

const notifyInstructorApproved = async (userId) => {
  const message = "Your instructor registration has been approved.";
  await createNotification("instructor_approved", userId, message);
};

module.exports = {
  notifyCourseCreated,
  notifyCourseEnrolled,
  notifyCourseApproved,
  notifyInstructorApproved,
  sendNotification
};
