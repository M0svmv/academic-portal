const mongoose = require("mongoose");

const meetingSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
    ref: "Student",
  },
  advisorId: {
    type: String,
    required: true,
    ref: "Staff",
  },
  semesterId: {
    type: String,
    required: true,
    ref: "Semester",
  },
  meetingDate: {
    type: Date,
    required: true,
  },
  meetingTime: {
    type: String,
    required: true,
  },
  meetingStatus: {
    type: String,
    required: true,
    enum: ["pending", "approved", "declined"],
    default: "pending",
  },
  meetingNotes: {
    type: String,
  },
});

module.exports = mongoose.model("Meeting", meetingSchema);
