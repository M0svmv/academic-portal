const mongoose = require("mongoose");




const semesterWorkSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  studentId: {
    type: String,
    required: true,
    ref: "Student",
  },
  semesterId: {
    type: String,
    required: true,
    ref: "Semester",
  },

  courseId: {
    type: String,
    required: true,
    ref: "Course",
  },
  grade: {
    totalGrade: { type: Number, default: 0 },
    finalGrade: { type: Number, default: 0 },
    midTermGrade: { type: Number, default: 0 },
    attendanceGrade: { type: Number, default: 0 },
    labGrade: { type: Number, default: 0 },
    practicalGrade: { type: Number, default: 0 },
    bonusGrade: { type: Number, default: 0 },
  },

  attendanceTimes:[{
    type: Number,
    enum: [0, 1],
    default: 0
  }]
    
  ,
  labTimes: [{
    type: Number,
    enum: [0, 1],
    default: 0
  }]
});



semesterWorkSchema.methods.calculateTotalGrade = async function () {
  this.grade.totalGrade =
    this.grade.finalGrade +
    this.grade.midTermGrade +
    this.grade.attendanceGrade +
    this.grade.labGrade +
    this.grade.practicalGrade +
    this.grade.bonusGrade;
  await this.save();
};

module.exports = mongoose.model("SemesterWork", semesterWorkSchema);
