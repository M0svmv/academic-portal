const mongoose = require("mongoose");

const semesterSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  name: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  isCurrent: { type: Boolean, default: true },
  status: {
  type: String,
  enum: ["active", "completed", "archived"],
  default: "active"
},
  timeLine:{
    preRegistration:{
        start:{type:Date},
        end:{type:Date}
    },
    addDrop: { start: Date, end: Date },
    withdrawal: { start: Date, end: Date },
    grading: { start: Date, end: Date },
    finalExams: { start: Date, end: Date },
    
  },
  settings: {
    allowEnrollment: {type: Boolean, default: false},
    allowWithdrawal: {type: Boolean, default: false},
    announceSchedule: {type: Boolean, default: false},
    announceGrades: {type: Boolean, default: false},
  },

  forceEnd:{
    type:Boolean,
    default:false
  }
});

module.exports = mongoose.model("Semester", semesterSchema);
