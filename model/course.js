const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  options: [{
    type: String,
    required: true,
  }],
  finalaverage:{
    type:String,
    default: 0
  },
  // correctOptionIndex: {
  //   type: Number,
  //   required: true,
  // },
  correctAnswers :[{
    type: String,
    required: true,
  }]
});

const lessonFileSchema = new mongoose.Schema({
  LesssonText: String,
  LessonType: {
    type: String,
    required: true,
  },
  LessonUrl: String,
});

const courseSchema = new mongoose.Schema(
  {
    courseName: String,
    paymentType: {
      type: String,
      required: true,
      enum: ['free', 'paid']
    },

createCourseas:{
type:String,
enum:[
  "Buisness",
 "individual",
 "Government", 
 "all", 
 "universities",
 "schools", 
 "Buisness and Government and individual",
" Buisness and Government",
"universities and schools "
]
},
    eligiblesusers: {
      type: String,
    },
    price: Number,
    courseDescription: String,
    aboutCourse: String,
    createUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    totalAmountEarned: {
      type: Number,
      default: 0,
    },
    categories: [String],
    averageRating: {
      type: Number,
      default: 0,
    },
    numOfReviews: {
      type: Number,
      default: 0,
    },
    status: { type: String,enum:["Pending","Approved","Rejected", "draft"], default: 'draft' }, 
    
    rejectionReason: {
      type: String, // New field for rejection reason
    },

    courseDuration: String,
    userWhoHasBought: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    coverPage: [String],
    chapter: [
      {
        LessonName: String,
        LessonFile: [lessonFileSchema], // Include lessonFileSchema as a sub-document
        questions: [questionSchema], // Questions for the lesson

      }
    ]
  },

  {
    timestamps: true // Add createdAt and updatedAt fields
  }
);

courseSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'product',
  justOne: false,
});

const Course = mongoose.model('Course', courseSchema);

module.exports = Course;



