const mongoose = require('mongoose');

// Define schema
const contactSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  workEmail: {
    type: String,
    required: true
  },
  companyName:{
    type:String
  },
  
companySize:{
type:Number
},
  phoneNumber: {
    type: String,
    required: true
  },
  jobTitle: {
    type: String,
    required: true
  },
  expectedLearners: {
    type: Number,
    required: true
  },
  message: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create model
const Contact = mongoose.model('Contact', contactSchema);

module.exports = Contact;
