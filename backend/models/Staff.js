const mongoose = require('mongoose');


const staffSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    staffName: {
      type: String,
      required: true,
      trim: true
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    email: {
      type: String,
      unique: false,
      trim: true,
      sparse: true
    },
    phone: {
      type: String,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    department: {
      type: String,
      trim: true
    },

    roles: [
      {
        type: String,
        enum: ['coordinator', 'lecturer', 'ta', 'admin', 'academic-advisor', 'control-member'],
        required: true
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Staff', staffSchema);

