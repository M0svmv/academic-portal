const Transcript = require("../models/Transcript");


exports.getTranscript = async (studentId) => {
  const transcript = await Transcript.findOne({
    studentId,
  })
    .populate({
      path: "completedCourses",
      populate: {
        path: "courseId",
      },
    })
    .populate("studentId", "studentName");

  if (!transcript) {
    const error = new Error("Transcript not found");
    error.statusCode = 404;
    throw error;
  }

  return transcript;
};