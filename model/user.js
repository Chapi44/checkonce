const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  fullname: {
    type: String,
    // required: true
  },
  enrolledCourses: [{
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course'
    },
    progress: {
      type: Number,
      default: 0 // Progress in percentage (0-100)
    },
    lesson:[{
      lessonId:String,
      lessonTime:String,
      progress:Number
    }]
  }],
  enrolledInstructors: [{
    instructor: {
      type: Schema.Types.ObjectId,
      ref: 'Tutorinstructor'
    },
    enrollmentTime: {
      type: Date,
      default: Date.now
    }
  }],
  email: {
    type: String,
    // required: true,
    // unique: true
  },
  password: {
    type: String,
    // required: true
  },
  phoneNumber: {
    type: String,
    // required: true
  },
  images: {
    type: [String]
  },
  coursesBought: [{
    type: Schema.Types.ObjectId,
    ref: 'course'
  }],
  cart: [{
    type: Schema.Types.ObjectId,
    ref: 'course'
  }],
  Gender:{ 
    type:String,
    enum: ['male', 'female'],
  },
  Exprience:{ type:String},
  Location:{ type:String},
  idCard: {  
     type: [String],
    default: [],
   },
  instructorLicense: {   
    type: [String],
    default: [],
  },
  role: {
    type: String,
    enum: ['admin', 'user', 'instructor', "company_owner"],
    default: 'user',
    required: true
  },
  userId:{
    type: [String],
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
    productionstudio:{
      type:String,
      enum:["kegebrew University","Indiviual" ],
      default: 'Indiviual'
      
      },
    
  
  api_permission:{
    type: String,
    
  },
  totalAmountEarned: {
    type: Number,
    default: 0,
  },
  calculatedTotalAmountEarned:{
     type: String,
     default: 0,
  },
  sessionToken: { type: String },  // Add this line

 status: { type: String,enum:["Pending","Approved","Rejected"], default: 'Pending' }, 
  
},  {
  timestamps: true // Add createdAt and updatedAt fields
});

UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});


UserSchema.methods.comparePassword = async function (candidatePassword) {
  const isMatch = await bcrypt.compare(candidatePassword, this.password);
  return isMatch;
};

UserSchema.methods.updateCourseProgress = async function (courseId, progress) {
  const index = this.enrolledCourses.findIndex(course => course.course.equals(courseId));
  if (index !== -1) {
    this.enrolledCourses[index].progress = progress;
    await this.save();
    return true; // Progress updated successfully
  }
  return false; // Course not found in enrolledCourses
};
module.exports = mongoose.model("User", UserSchema);
