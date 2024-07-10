const createTokenUser = (user) => {
  return {
    fullname: user.fullname,
    userId: user._id,
    role: user.role,
    api_permission: user.api_permission,
  };
};


const createTokenUser1 = (instructor) => {
  return {
    firstName: instructor.firstName,
    lastName: instructor.lastName,
    userId: instructor._id,
    role: instructor.role,
    status:instructor.status

  };
};
module.exports = {createTokenUser, createTokenUser1};
