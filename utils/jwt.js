const jwt = require('jsonwebtoken');

const createJWT = ({ payload }) => {
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_LIFETIME,
  });
  return token;
};

const isTokenValid = ({ token }) => jwt.verify(token, process.env.JWT_SECRET);

const attachCookiesToResponse = ({ res, user }) => {
  try {
    console.log("attach", user);
    const token = createJWT({ payload: user });
    console.log("hjnjnjn", token);
    const oneDay = 1000 * 60 * 60 * 24;

    res.cookie('token', token, {
      // httpOnly: true,
      expires: new Date(Date.now() + oneDay),
      // secure: process.env.NODE_ENV === 'production',
      secure: false,
      signed: true,
      // sameSite: 'None',
    });
  } catch (error) {
    console.error("Cookie attachment error:", error);
    throw new Error("Error attaching cookies to response");
  }
};



module.exports = {
  createJWT,
  isTokenValid,
  attachCookiesToResponse,
};
