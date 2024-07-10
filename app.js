require("express-async-errors");

const cors = require("cors");
const express = require("express");
const http = require("http");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const path = require("path");
const dotenv = require("dotenv");
const fs = require('fs');

dotenv.config();

const app = express();


const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Create the uploads/course/dash directory if it doesn't exist
const dashDir = 'uploads/course/dash';
if (!fs.existsSync(dashDir)) {
  fs.mkdirSync(dashDir, { recursive: true });
}

app.use(express.static(path.join(__dirname, "public")));
const connectDB = require("./db/connect.js");
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
const authRouter = require("./routes/authRouter");
const userRouter = require("./routes/userroutes.js");
const courseRoutes = require("./routes/courseRoutes.js")
const InstructorRoutes = require('./routes/InstructorRouter.js')
const OrderRoutes = require("./routes/orderRoutes.js");
const ReviewRoutes = require("./routes/ReviewRoutes.js");
const corsOptions = require("./config/corsOptions.js")
const paymentRouter = require("./routes/paymentRouter.js");
const contactUs = require("./routes/contactusRoutes.js")
const tutReview= require("./routes/reviewtutRoutes.js")
const ordertut= require("./routes/ordertutRoutes.js")
// const cloRoutes = require("./routes/createCourseclou.js")
// Middleware
const notFoundMiddleware = require("./middleware/not-found.js");
const errorHandlerMiddleware = require("./middleware/error-handler.js");

app.use(cors(corsOptions));
app.use(morgan("tiny"));
app.use(express.json());
app.use(cookieParser(process.env.JWT_SECRET));
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", userRouter);
app.use('/api/v1/course',courseRoutes)
app.use('/api/v1/Instruct',InstructorRoutes);
app.use('/api/v1/orders',OrderRoutes);
app.use('/api/v1/reviews',ReviewRoutes);
app.use('/api/v1/contact',contactUs);
app.use('/api/v1/tutreview', tutReview)

app.use('/api/v1/tutorder', ordertut)

app.use("/payment", paymentRouter);

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

const port = process.env.PORT || 5000;

const start = async () => {
  try {
    await connectDB(process.env.MONGO);
    app.listen(port, () =>
      console.log(`Server is listening on port ${port}...`)
    );
  } catch (error) {
    console.log(error);
  }
};

start();

