const Course = require("../model/course");
const User = require("../model/user");
const { StatusCodes } = require("http-status-codes");
const baseURL = process.env.BASE_URL;
const path = require("path");
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);

const ffmpegStream = require('ffmpeg-stream');

const fs = require ('fs')

// using beka works  perfectly
const createCourse = async (req, res) => {
  const {
    courseId,
    paymentType,
    price,
    courseDescription,
    aboutCourse,
    categories,
    courseDuration,
    LessonName,
    userId,
    courseName,
    lessons,
    createCourseas
  } = req.body;

  try {
    let lessonFiles = [];
    let lessonFiless = [];

    // Process uploaded lesson files if available
    if (req.files && req.files["files"]) {
      lessonFiless = req.files["files"].map((file) => ({
        LessonUrl: baseURL + "/uploads/course/" + file.filename,
      }));
    }
    if (lessons) {
      lessons.forEach((item, index) => {
        const lessonData = {
          LessonUrl: lessonFiless[index] && lessonFiless[index].LessonUrl ,
          LesssonText: item.lessonText,
          LessonType: item.lessonTitle,
        };
        lessonFiles.push(lessonData);
      });
    }

    console.log(lessonFiles);
    let coverPage;
    if (req.files && req.files["coverPage"]) {
      const coverPageFile = req.files["coverPage"][0];
      coverPage =
        baseURL + "/uploads/course/coverpage/" + coverPageFile.filename;
    }
    const existingCourse = await Course.findOne({ _id: courseId });
    if (existingCourse) {
      const newChapter = {
        LessonName: LessonName,
        LessonFile: lessonFiles,
      };

      existingCourse.chapter.push(newChapter);

      if (coverPage) {
        existingCourse.coverPage.push(coverPage);
      }

      const updatedCourse = await existingCourse.save();
      return res.status(200).json(updatedCourse);
    } else {
      const course = new Course({
        coverPage,
        courseId,
        courseName,
        paymentType,
        price,
        courseDescription,
        aboutCourse,
        categories,
        courseDuration,
        createUser: userId,
        createCourseas
      });

      const savedCourse = await course.save();
      return res.status(201).json(savedCourse);
    }
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

async function getAllCourses(req, res) {
  try {
    // Parse query parameters for pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10; // Default limit is 10

    // Calculate skip value based on page and limit
    const skip = (page - 1) * limit;

    // Get filter parameters from query
    const { createCourseas, paymentType, status, categories } = req.query;

    // Build the filter object
    const filter = {};
    const filter1 = {
      status: "Approved" // Filter by "Approved" status
    };
    if (createCourseas) filter.createCourseas = createCourseas;
    if (paymentType) filter.paymentType = paymentType;
    if (status) filter.status = status;
    if (categories) filter.categories = { $in: categories.split(',') };

    // Get total number of courses that match the filter
    const totalCourses = await Course.countDocuments(filter); 
   
    // Query for courses with pagination and filtering
    const courses = await Course.find(filter)
      .populate("createUser")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();



    const approvedCoursesCategories = await Course.distinct('categories', filter1);

    res.status(200).json({
      courses,
      currentPage: page,
      totalPages: Math.ceil(totalCourses / limit),
      totalCourses,
      categories: approvedCoursesCategories// Add all categories to the response
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
}


async function getCourseById(req, res) {
  const courseId = req.params.id;
  try {
    const course = await Course.findById(courseId)
      .populate("createUser")
      .populate({
        path: "userWhoHasBought",
        select: "fullname email phoneNumber role",
        populate: {
          path: "enrolledCourses",
          select: "progress"
        }
      })
      .populate("reviews");
      
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    res.status(200).json(course);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server Error" });
  }
}



async function streamCourseVideo(req, res) {
  const courseId = req.params.id;
  const lessonId = req.params.lessonId;

  try {
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const lesson = course.chapter.find(chapter => chapter._id.toString() === lessonId);
    if (!lesson) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    const lessonUrl = lesson.LessonFile[0].LessonUrl;
    const videoPath = path.join(__dirname, '../', lessonUrl.replace(baseURL, ''));

    // Check if the file exists
    if (!fs.existsSync(videoPath)) {
      console.error("Video file not found:", videoPath);
      return res.status(404).json({ message: "Video file not found" });
    }

    console.log("Streaming video from path:", videoPath);

    // Set response headers
    res.setHeader('Content-Type', 'video/mp4');

    // Stream the video using fluent-ffmpeg
    const command = ffmpeg(videoPath)
      .outputOptions([
        '-movflags frag_keyframe+empty_moov',
        '-preset ultrafast',
        '-f mp4'
      ])
      .on('start', (commandLine) => {
        console.log('Spawned ffmpeg with command:', commandLine);
      })
      .on('error', (err, stdout, stderr) => {
        console.error('ffmpeg error:', err.message);
        console.error('ffmpeg stderr:', stderr);
        res.status(500).end();
      })
      .on('end', () => {
        console.log('ffmpeg stream ended');
      });

    command.pipe(res, { end: true });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server Error" });
  }
}

const dashDir = path.join(__dirname, '../uploads/course/dash');
if (!fs.existsSync(dashDir)) {
  fs.mkdirSync(dashDir, { recursive: true });
}

const createDashStream = async (req, res) => {
  const courseId = req.params.id;
  const lessonId = req.params.lessonId;

  try {
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const lesson = course.chapter.find(chapter => chapter._id.toString() === lessonId);
    if (!lesson) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    const lessonUrl = lesson.LessonFile[0].LessonUrl;
    const videoPath = path.join(__dirname, '../', lessonUrl.replace(baseURL, ''));
    const outputDir = path.join(dashDir, `${courseId}_${lessonId}`);

    // Check if the file exists
    if (!fs.existsSync(videoPath)) {
      console.error("Video file not found:", videoPath);
      return res.status(404).json({ message: "Video file not found" });
    }

    // Check if the DASH files already exist, if not, create them
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });

      // Use ffmpeg to generate the fragmented MP4 files
      await new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .outputOptions([
            '-c:v libx264',
            '-profile:v main',
            '-crf 20',
            '-g 48',
            '-keyint_min 48',
            '-sc_threshold 0',
            '-b:v 800k',
            '-maxrate 856k',
            '-bufsize 1200k',
            '-hls_time 4',
            '-hls_playlist_type vod',
            '-f dash'
          ])
          .output(`${outputDir}/manifest.mpd`)
          .on('end', resolve)
          .on('error', reject)
          .run();
      });
    }

    const manifestPath = `${outputDir}/manifest.mpd`;
    res.setHeader('Content-Type', 'application/dash+xml');
    res.sendFile(manifestPath);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server Error" });
  }
};


// Ensure the directory for DASH segments exists
// const dashDir = path.join(__dirname, '../uploads/course/dash');
// if (!fs.existsSync(dashDir)) {
//   fs.mkdirSync(dashDir, { recursive: true });
// }

// const createDashStream = async (req, res) => {
//   const courseId = req.params.id;
//   const lessonId = req.params.lessonId;
//   const filePath = req.params[0]; // Added to handle requests for specific files

//   try {
//     const course = await Course.findById(courseId);
//     if (!course) {
//       return res.status(404).json({ message: "Course not found" });
//     }

//     const lesson = course.chapter.find(chapter => chapter._id.toString() === lessonId);
//     if (!lesson) {
//       return res.status(404).json({ message: "Lesson not found" });
//     }

//     const outputDir = path.join(dashDir, `${courseId}_${lessonId}`);
//     console.log('Output directory:', outputDir);

//     // Check if the output directory exists, and create it if it doesn't
//     if (!fs.existsSync(outputDir)) {
//       fs.mkdirSync(outputDir, { recursive: true });
//       console.log('Output directory created:', outputDir);
//     }

//     const requestedFilePath = filePath ? path.join(outputDir, filePath) : path.join(outputDir, 'manifest.mpd');
//     console.log('Requested file path:', requestedFilePath);

//     if (fs.existsSync(requestedFilePath)) {
//       const fileExtension = path.extname(requestedFilePath);
//       let contentType;

//       switch (fileExtension) {
//         case '.mpd':
//           contentType = 'application/dash+xml';
//           break;
//         case '.mp4':
//           contentType = 'video/mp4';
//           break;
//         case '.m4s':
//           contentType = 'video/iso.segment';
//           break;
//         default:
//           contentType = 'application/octet-stream';
//       }

//       console.log('Serving file:', requestedFilePath);
//       res.setHeader('Content-Type', contentType);
//       res.sendFile(requestedFilePath);
//     } else {
//       console.log('File not found:', requestedFilePath);
//       res.status(404).json({ message: "File not found" });
//     }
//   } catch (err) {
//     console.log(err);
//     res.status(500).json({ message: "Server Error" });
//   }
// };

const deleteCourseById = async (req, res) => {
  const courseId = req.params.id;
  try {
    // Find the course by ID
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Delete all related lesson files
    for (const chapter of course.chapter) {
      for (const lessonFile of chapter.LessonFile) {
        if (lessonFile.LessonUrl) {
          const filename = lessonFile.LessonUrl.split("/").pop();
          const filePath = path.join(__dirname, "..", "uploads", "course", filename);
          try {
            fs.unlinkSync(filePath);
            console.log(`Deleted lesson file: ${filePath}`);
          } catch (err) {
            console.error(`Error deleting lesson file: ${filePath}`, err);
          }
        }
      }
    }

    // Delete the cover page if it exists
    if (course.coverPage && course.coverPage.length > 0) {
      for (const coverPage of course.coverPage) {
        const filename = coverPage.split("/").pop();
        const filePath = path.join(__dirname, "..", "uploads", "course", "coverpage", filename);
        try {
          fs.unlinkSync(filePath);
          console.log(`Deleted cover page: ${filePath}`);
        } catch (err) {
          console.error(`Error deleting cover page: ${filePath}`, err);
        }
      }
    }

    // Delete the course
    await Course.findByIdAndDelete(courseId);
    res.status(200).json({ message: "Course deleted successfully" });
  } catch (err) {
    console.error("Error deleting course:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

async function deleteAllCourses(req, res) {
  try {
    // Delete all courses
    await Course.deleteMany({});

    res
      .status(StatusCodes.OK)
      .json({ message: "All courses deleted successfully" });
  } catch (error) {
    console.error("Error deleting all courses:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Internal server error" });
  }
}

async function getCoursesByUserId(req, res) {
  const userId = req.params.userId; // Assuming the user ID is passed as a parameter in the URL
  try {
    const courses = await Course.find({ createUser: userId }).sort({
      createdAt: -1,
    });
    if (!courses || courses.length === 0) {
      return res
        .status(404)
        .json({ message: "No courses found for this user" });
    }
    res.status(200).json(courses);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server Error" });
  }
}

const updateCourseById = async (req, res) => {
  try {
    const { id: courseId } = req.params;
    const { userId } = req.body;

    // Find the course by ID
    const updatedCourse = await Course.findById(courseId);

    if (!updatedCourse) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Course not found" });
    }

    // Ensure that the user is the creator of the course
    if (updatedCourse.createUser.toString() !== userId) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "You are not authorized to update this course" });
    }

    // Destructure relevant properties from the request body
    const {
      courseId: newCourseId,
      paymentType,
      price,
      courseDescription,
      aboutCourse,
      categories,
      courseDuration,
      courseName,
    } = req.body;

    // Update course properties if available
    updatedCourse.courseId = newCourseId || updatedCourse.courseId;
    updatedCourse.paymentType = paymentType || updatedCourse.paymentType;
    updatedCourse.price = price || updatedCourse.price;
    updatedCourse.courseDescription = courseDescription || updatedCourse.courseDescription;
    updatedCourse.aboutCourse = aboutCourse || updatedCourse.aboutCourse;
    updatedCourse.categories = categories || updatedCourse.categories;
    updatedCourse.courseDuration = courseDuration || updatedCourse.courseDuration;
    updatedCourse.courseName = courseName || updatedCourse.courseName;

    // Handle cover page update if available
    if (req.files && req.files["coverPage"]) {
      // Delete previous cover page
      if (updatedCourse.coverPage && updatedCourse.coverPage.length > 0) {
        updatedCourse.coverPage.forEach((coverPage) => {
          // Extract filename from the URL
          const filename = coverPage.split("/").pop();
          const imagePath = path.join(__dirname, "..", "uploads", "course", "coverpage", filename);
          try {
            if (fs.existsSync(imagePath)) {
              fs.unlinkSync(imagePath);
              console.log(`Deleted previous cover page: ${imagePath}`);
            } else {
              console.log(`Previous cover page not found: ${imagePath}`);
            }
          } catch (error) {
            console.error(`Error deleting previous cover page: ${imagePath}`, error);
          }
        });
      }

      // Save new cover page
      updatedCourse.coverPage = req.files["coverPage"].map(
        (file) => baseURL + "/uploads/course/coverpage/" + file.filename
      );
    }

    // Save the updated course
    await updatedCourse.save();

    res.status(StatusCodes.OK).json({ message: "Course updated successfully", course: updatedCourse });
  } catch (error) {
    console.error("Error updating course by ID:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};


async function getCoursesByName(req, res) {
  try {
    const courseName = req.query.coursename; // Assuming the course name is passed as a query parameter

    // Perform a case-insensitive search for courses containing the provided name
    const courses = await Course.find({
      title: { $regex: courseName, $options: "i" },
    })
      .populate("createUser")
      .sort({ createdAt: -1 });

    if (!courses || courses.length === 0) {
      return res
        .status(404)
        .json({ message: "No courses found matching the provided name" });
    }

    res.status(200).json(courses);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server Error" });
  }
}

const deleteChapterByChapterIdFirst = async (req, res) => {
  const { courseId, chapterId } = req.params;

  try {
    // Find the course by ID
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Find the chapter by ID
    const chapterIndex = course.chapter.findIndex(
      (chapter) => chapter._id.toString() === chapterId
    );
    if (chapterIndex === -1) {
      return res.status(404).json({ message: "Chapter not found" });
    }

    // Extract the URLs of the files associated with the chapter
    const lessonFiles = course.chapter[chapterIndex].LessonFile;
    const fileUrls = lessonFiles.map((file) => file.LessonUrl);

    // Remove the chapter from the course
    course.chapter.splice(chapterIndex, 1);

    // Delete the associated files from storage
    fileUrls.forEach((url) => {
      const filename = url.split("/").pop();
      const filePath = path.join(__dirname, "..", "uploads", "course", filename);
      try {
        fs.unlinkSync(filePath);
        console.log(`Deleted file: ${filePath}`);
      } catch (err) {
        console.error(`Error deleting file: ${filePath}`, err);
      }
    });

    // Save the updated course
    await course.save();

    return res.status(200).json({ message: "Chapter deleted successfully" });
  } catch (err) {
    console.error("Error deleting chapter:", err);
    return res.status(500).json({ message: "Server Error" });
  }
};


const deleteLessonFileById = async (req, res) => {
  const { courseId, chapterId, fileId } = req.params;

  try {
    // Find the course by ID
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Find the chapter by ID
    const chapter = course.chapter.find(
      (chap) => chap._id.toString() === chapterId
    );
    if (!chapter) {
      return res.status(404).json({ message: "Chapter not found" });
    }

    // Find the lesson file by ID
    const lessonFileIndex = chapter.LessonFile.findIndex(
      (file) => file._id.toString() === fileId
    );
    if (lessonFileIndex === -1) {
      return res.status(404).json({ message: "Lesson file not found" });
    }

    // Extract the URL of the lesson file
    const fileUrl = chapter.LessonFile[lessonFileIndex].LessonUrl;

    // Remove the lesson file from the chapter
    chapter.LessonFile.splice(lessonFileIndex, 1);

    // Delete the associated file from storage
    const filename = fileUrl.split("/").pop();
    const filePath = path.join(__dirname, "..", "uploads", "course", filename);
    try {
      fs.unlinkSync(filePath);
      console.log(`Deleted file: ${filePath}`);
    } catch (err) {
      console.error(`Error deleting file: ${filePath}`, err);
    }

    // Save the updated course
    await course.save();

    return res.status(200).json({ message: "Lesson file deleted successfully" });
  } catch (err) {
    console.error("Error deleting lesson file:", err);
    return res.status(500).json({ message: "Server Error" });
  }
};

const addLessonFile = async (req, res) => {
  const courseId = req.params.id;
  const { chapterId, lessonText, lessonType } = req.body;

  try {
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Course not found" });
    }

    let chapter = course.chapter.id(chapterId);

    if (!chapter) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Chapter not found" });
    }

    let lessonUrl;
    if (req.file && req.file.path) {
      lessonUrl = baseURL + "/uploads/course/" + req.file.filename;
    }

    const newLessonFile = {
      LesssonText: lessonText,
      LessonType: lessonType,
      LessonUrl: lessonUrl,
      questions: [],
    };

    chapter.LessonFile.push(newLessonFile);

    const updatedCourse = await course.save();

    return res.status(StatusCodes.OK).json(updatedCourse);
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message });
  }
};

const editLessonById = async (req, res) => {
  const courseId = req.params.courseId;
  const chapterId = req.params.chapterId;
  const lessonId = req.params.lessonId;
  const { lessonText, lessonType } = req.body;

  try {
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Course not found" });
    }

    let chapter = course.chapter.id(chapterId);

    if (!chapter) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Chapter not found" });
    }

    let lesson = chapter.LessonFile.id(lessonId);

    if (!lesson) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Lesson not found" });
    }

    // Delete previous lesson file if it exists
    if (lesson.LessonUrl) {
      const filename = lesson.LessonUrl.split("/").pop();
      const filePath = path.join(__dirname, "..", "uploads", "course", filename);
      try {
        fs.unlinkSync(filePath);
        console.log(`Deleted previous lesson file: ${filePath}`);
      } catch (err) {
        console.error(`Error deleting previous lesson file: ${filePath}`, err);
      }
    }

    // Update lesson details
    lesson.LesssonText = lessonText || lesson.LesssonText;
    lesson.LessonType = lessonType || lesson.LessonType;

    // Upload file if available
    if (req.file && req.file.path) {
      lesson.LessonUrl = baseURL + "/uploads/course/" + req.file.filename;
    }

    // Save the updated course
    const updatedCourse = await course.save();

    return res.status(StatusCodes.OK).json(updatedCourse);
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message });
  }
};

const addQuestion = async (req, res) => {
  console.log(req.body);
  const { courseId, chapterId, type, questionText, options, correctAnswers } =
    req.body;

  try {
    // Find the course by courseId
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Find the chapter by chapterId
    const chapter = course.chapter.id(chapterId);
    if (!chapter) {
      return res.status(404).json({ message: "Chapter not found" });
    }

    const newQuestion = {
      type,
      questionText,
      options,
      correctAnswers,
    };

    // Add the question to the lesson's questions array
    chapter.questions.push(newQuestion);

    // Save the updated course
    await course.save();

    return res.status(200).json(course);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};


const getAllQuestions = async (req, res) => {
  const { courseId, chapterId } = req.params;

  try {
    // Find the course by courseId
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Find the chapter by chapterId
    const chapter = course.chapter.id(chapterId);
    if (!chapter) {
      return res.status(404).json({ message: "Chapter not found" });
    }

    // Extract questions from the chapter
    const questions = chapter.questionsGroup;

    return res.status(200).json(questions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const editLessonNameByChapterId = async (req, res) => {
  try {
    const { courseId, chapterId } = req.params;
    const { LessonName } = req.body;

    // Find the course by ID
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Course not found' });
    }

    // Find the chapter by ID
    const chapter = course.chapter.id(chapterId);
    if (!chapter) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Chapter not found' });
    }

    // Update the LessonName
    chapter.LessonName = LessonName || chapter.LessonName;

    // Save the updated course
    await course.save();

    res.status(StatusCodes.OK).json({ message: 'Lesson name updated successfully', course });
  } catch (error) {
    console.error('Error updating lesson name by chapter ID:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
  }
};

const approveCourse = async (req, res) => {
  const { courseId } = req.params;

  try {
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Course not found" });
    }

    // Update the status to "Approved"
    course.status = "Approved";
    await course.save();

    return res.status(StatusCodes.OK).json({ message: "Course approved successfully" });
  } catch (error) {
    console.error(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};

const pendingcourse = async (req, res) => {
  const { courseId } = req.params;

  try {
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Course not found" });
    }

    // Update the status to "Approved"
    course.status = "Pending";
    await course.save();

    return res.status(StatusCodes.OK).json({ message: "Course Pending successfully" });
  } catch (error) {
    console.error(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};

const draftcourse = async (req, res) => {
  const { courseId } = req.params;

  try {
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Course not found" });
    }

    // Update the status to "Approved"
    course.status = "draft";
    await course.save();

    return res.status(StatusCodes.OK).json({ message: "Course draft successfully" });
  } catch (error) {
    console.error(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};


const rejectCourse = async (req, res) => {
  const { courseId } = req.params;
  const { rejectionReason } = req.body;

  try {
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Course not found" });
    }

    // Update the status to "Rejected" and save the rejection reason
    course.status = "Rejected";
    course.rejectionReason = rejectionReason;
    await course.save();

    return res.status(StatusCodes.OK).json({ message: "Course rejected successfully" });
  } catch (error) {
    console.error(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};


const getAllApprovedCourses = async (req, res) => {
  try {
    // Parse query parameters for pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10; // Default limit is 10

    // Calculate skip value based on page and limit
    const skip = (page - 1) * limit;

    // Get createCourseas parameter from query
    const createCourseasParam = req.query.createCourseas;

    // Query for approved courses with pagination
    let approvedCoursesQuery = Course.find({ status: "Approved" })
      .populate("createUser")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Filter approved courses based on createCourseasParam
    if (createCourseasParam) {
      approvedCoursesQuery = approvedCoursesQuery.where('createCourseas').equals(createCourseasParam);
    }

    const approvedCourses = await approvedCoursesQuery.exec();

    res.status(StatusCodes.OK).json(approvedCourses);
  } catch (error) {
    console.error(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};

const getRejectedCourses = async (req, res) => {
  try {
    const rejectedCourses = await Course.find({ status: "Rejected" });

    return res.status(StatusCodes.OK).json(rejectedCourses);
  } catch (error) {
    console.error(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};

const deleteQuestion = async (req, res) => {
  const { courseId, chapterId, questionId } = req.params;

  try {
    // Find the course by courseId
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Course not found" });
    }

    // Find the chapter by chapterId
    const chapter = course.chapter.id(chapterId);
    if (!chapter) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Chapter not found" });
    }

    // Find the index of the question in the chapter
    const questionIndex = chapter.questions.findIndex(q => q._id.equals(questionId));
    if (questionIndex === -1) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Question not found" });
    }

    // Remove the question from the chapter's questions array
    chapter.questions.splice(questionIndex, 1);

    // Save the updated course
    await course.save();

    return res.status(StatusCodes.OK).json({ message: "Question deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};

module.exports = {
  createCourse,
  getAllCourses,
  getCourseById,
  deleteCourseById,
  deleteAllCourses,
  getCoursesByUserId,
  updateCourseById,
  getCoursesByName,
  deleteChapterByChapterIdFirst,
  deleteLessonFileById,
  editLessonById,
  addLessonFile,
  addQuestion,
  editLessonNameByChapterId,
  getAllQuestions,
  approveCourse,
  getAllApprovedCourses,
  deleteQuestion,
  rejectCourse,
  getRejectedCourses,
  streamCourseVideo,
  createDashStream,
  pendingcourse,
  draftcourse
};



//this is using cloudinary but it doesnot function 
// const cloudinary = require('cloudinary').v2;

// // Configure Cloudinary
// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// // Function to delete temporary files
// const deleteTempFiles = (files) => {
//   files.forEach((file) => {
//     fs.unlink(file.path, (err) => {
//       if (err) {
//         console.error(`Failed to delete temporary file: ${file.path}`, err);
//       } else {
//         console.log(`Deleted temporary file: ${file.path}`);
//       }
//     });
//   });
// };

// const createCourse = async (req, res) => {
//   const {
//     courseId,
//     paymentType,
//     price,
//     courseDescription,
//     aboutCourse,
//     categories,
//     courseDuration,
//     LessonName,
//     userId,
//     courseName,
//     lessons,
//     createCourseas
//   } = req.body;

//   try {
//     // Validate courseId
//     if (courseId && !mongoose.Types.ObjectId.isValid(courseId)) {
//       return res.status(400).json({ message: 'Invalid courseId' });
//     }

//     let lessonFiles = [];
//     let lessonFiless = [];

//     // Process uploaded lesson files if available
//     if (req.files && req.files["files"]) {
//       const uploadPromises = req.files["files"].map((file) => {
//         return cloudinary.uploader.upload(file.path, {
//           folder: 'course',
//         });
//       });
//       const uploadResults = await Promise.all(uploadPromises);
//       lessonFiless = uploadResults.map((result) => ({
//         LessonUrl: result.secure_url,
//       }));
//     }

//     if (lessons) {
//       lessons.forEach((item, index) => {
//         const lessonData = {
//           LessonUrl: lessonFiless[index] && lessonFiless[index].LessonUrl,
//           LessonText: item.lessonText,
//           LessonType: item.lessonTitle,
//         };
//         lessonFiles.push(lessonData);
//       });
//     }

//     let coverPage;
//     if (req.files && req.files["coverPage"]) {
//       const coverPageFile = req.files["coverPage"][0];
//       const coverPageUploadResult = await cloudinary.uploader.upload(coverPageFile.path, {
//         folder: 'course/coverpage',
//       });
//       coverPage = coverPageUploadResult.secure_url;
//     }

//     if (courseId) {
//       const existingCourse = await Course.findById(courseId);
//       if (existingCourse) {
//         const newChapter = {
//           LessonName: LessonName,
//           LessonFile: lessonFiles,
//         };

//         existingCourse.chapter.push(newChapter);

//         if (coverPage) {
//           existingCourse.coverPage.push(coverPage);
//         }

//         const updatedCourse = await existingCourse.save();

//         // Clean up temporary files
//         deleteTempFiles(req.files["files"] || []);
//         if (req.files["coverPage"]) deleteTempFiles(req.files["coverPage"]);

//         return res.status(200).json(updatedCourse);
//       } else {
//         return res.status(404).json({ message: 'Course not found' });
//       }
//     } else {
//       const course = new Course({
//         coverPage,
//         courseName,
//         paymentType,
//         price,
//         courseDescription,
//         aboutCourse,
//         categories,
//         courseDuration,
//         createUser: userId,
//         createCourseas
//       });

//       const savedCourse = await course.save();

//       // Clean up temporary files
//       deleteTempFiles(req.files["files"] || []);
//       if (req.files["coverPage"]) deleteTempFiles(req.files["coverPage"]);

//       return res.status(201).json(savedCourse);
//     }
//   } catch (err) {
//     console.error(err);

//     // Clean up temporary files in case of an error
//     deleteTempFiles(req.files["files"] || []);
//     if (req.files["coverPage"]) deleteTempFiles(req.files["coverPage"]);

//     return res.status(400).json({ message: err.message });
//   }
// };
