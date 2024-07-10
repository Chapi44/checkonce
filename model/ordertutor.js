const mongoose = require('mongoose');

const SingleOrderItemSchema = mongoose.Schema({


//   product: {
//     type: mongoose.Schema.ObjectId,
//     ref: 'Course',
//     required: true,
//   },
  product: {
    type: mongoose.Schema.ObjectId,
    ref: 'Tutorinstructor',
    required: true,
  },
  // emails: {
  //   type: [String],
  //   // required: true,
  // }

});


const OrderSchema = mongoose.Schema(
    {
      subtotal: {
        type: Number,
        required: true,
      },
      total: {
        type: Number,
        required: true,
      },
      orderItems: [SingleOrderItemSchema],
      status: {
        type: String,
        enum: ['pending', 'failed', 'paid', 'delivered', 'canceled'],
        default: 'pending',
      },
      category: {
        type:String
      },
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      encrypted_url:{
          type: String,
          // required: true,
      },
      emails:{
        type: [String],
        

      }
    },
    { timestamps: true }
  );
  
  module.exports = mongoose.model('Ordertut', OrderSchema);