const mongoose = require('mongoose');
const Transcript = require('./Transcript');

const enrollmentSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
    ref: 'Student',
  },
  semesterId: {
    type: String,
    required: true,
    ref: 'Semester',
  },
  courses: [
    {
      courseOfferingId: {
        type: String,
        ref: 'CourseOffering',
      },
      
    }
  ],

  status: {
        type: String,
        enum: ['not_registered', 'approved', 'pending', 'declined'],
        default: 'pending',
      },
  allowedCredits: {
    type: Number,
    default: 18
  },
  currentEnrolledCredits: {
    type: Number,
    default: 0,
  },

});

enrollmentSchema.index({ studentId: 1, semesterId: 1 }, { unique: true });


module.exports = mongoose.model('Enrollment', enrollmentSchema);