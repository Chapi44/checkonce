const { isTokenValid } = require("../utils");
const jwt = require('jsonwebtoken');
const User = require('../model/user');
const { StatusCodes } = require('http-status-codes');




const authenticate = async (req, res, next) => {
  const token = req.cookies.token || (req.headers.authorization && req.headers.authorization.split(" ")[1]);

  if (!token) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Invalid token" });
    }

    // Check if the session token matches
    if (user.sessionToken !== decoded.sessionToken) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: "You are logged in from another device" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Internal server error" });
  }
};





const authenticateUser = async (req, res, next) => {
  const token = req.signedCookies.token;

  if (!token) {
    return res.status(401).json({ error: "Authentication Invalid" });
  }

  try {
    const { full_name, userId, role, api_permission } = isTokenValid({ token });
    req.user = { full_name, userId, role, api_permission };
    next();
  } catch (error) {
    return res.status(401).json({ error: "Authentication Invalid" });
  }
};

const authorizePermissions = (...api_permission) => {
  return (req, res, next) => {
    if (!api_permission.includes(req.user.api_permission)) {
      return res
        .status(403)
        .json({ error: "Unauthorized to access this action " });
    }
    next();
  };
};

const authorizePermissions1 = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: "Unauthorized to access this route " });
    }
    next();
  };
};

module.exports = {
  authenticateUser,
  authorizePermissions,
  authorizePermissions1,
     authenticate

};
