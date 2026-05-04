const mongoose = require('mongoose');

const courseOfferingSchema = new mongoose.Schema({
    _id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  courseId: {
    type: String,
    required: true,
    ref: 'Course',
  },
  semesterId: {
    type: String,
    required: true,
    ref: 'Semester',
  },
  instructorId: {
    type: String,
    default: "",
    ref: 'Staff',
  },
  taId:{
    type: String,
    default: "",
    ref: 'Staff',
  },
  status: {
    type: String,
    required: true,
    enum: ['open','proposed', 'closed'],
    default: 'proposed',
  },
  gradingSchema: {
  midTerm: { type: Number, default: 20 },
  final: { type: Number, default: 50 },
  attendance: { type: Number, default: 10 },
  lab: { type: Number, default: 10 },
  practical: { type: Number, default: 10 },
  bonus: { type: Number, default: 0 }
},

finalExamGradesStatus: {
  type: String,
  enum: ['pending', 'approved'],
  default: 'pending'
},

lecDates: [{
  type: Date,
}],

labDates: [{
  type: Date,
}],

lecNum: {
  type: Number,
  min: 0,
  default: 12
},

  labNum: {
    type: Number,
    min: 0,
    default: 12
  },

  schedule: 
    {
      days: [{ type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] }],
      lecLength: {
        type: Number,
        min: 0,},

        lecPeriod:{
          type:Number,
          min: 0,
        }

    },

    finalExamSchedule: {
      date: Date,
      startTime: String
    },

    enrolledCount: {
      type: Number,
      min: 0,
      default: 0
    },

    graduatesEnrolledCount:{
      type: Number,
      default: 0,
      min: 0
    }
  
});

module.exports =
  mongoose.models.CourseOffering ||
  mongoose.model("CourseOffering", courseOfferingSchema);
  