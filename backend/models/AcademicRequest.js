const mongoose = require("mongoose");

const academicRequestSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
    ref: "Student",
  },

  academicAdvisorId: {
    type: String,
    ref: "Staff",
  },
  semesterId: {
    type: String,
    required: true,
    ref: "Semester",
  },
  requestType: {
    type: String,
    required: true,
    enum: ["Withdrawal", "Add Drop", "improve Grade", "Overload"],
  },
  courseId: {
    type: String,
    ref: "Course",
  },
  withdrawalReason: {
    type: String,
    enum: [
      "Academic Difficulty",
      "Health Issues",
      "Not Ready for Final Exam",
      "Absence without Notice",
      "Absence from midterm or practical",
      "Low semester Work Performance",
      "Personal Reasons",
      "Other",
      ""
    ],
    default: "",
  },

  writtenReason: {
    type: String,
  },

  studentSuggestion: {
    type: String,
  },
  academicAdvisorComment: {
    type: String,
  },

  droppedCourses: [
    {
      
        type: String,
        ref: "Course",
      
    },
  ],

  addedCourses: [
    {
      
        type: String,
        ref: "Course",
      
    },
  ],

  status: {
    type: String,
    required: true,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  
},
{
  timestamps: true,
});

module.exports = mongoose.model("AcademicRequest", academicRequestSchema);
