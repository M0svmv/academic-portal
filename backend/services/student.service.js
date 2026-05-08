//MODELS
const Student = require("../models/Student");






//UTILS
const password = require("../utils/password.utils");






//SERVICES
exports.updateProfile = async (studentId, data) => {
  const student = await Student.findById(studentId);

  if (!student) {
    const error = new Error("Student not found");
    error.statusCode = 404;
    throw error;
  }

  if (data.password) {
    student.password = await password.hashPassword(data.password);
  }

  if (data.studentPhone) {
    student.studentPhone = data.studentPhone;
  }

  if (data.studentEmail) {
    student.studentEmail = data.studentEmail;
  }

  await student.save();

  return student;
};


