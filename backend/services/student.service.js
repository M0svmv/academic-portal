//MODELS
const AdvisingList = require("../models/AdvisingList");
const SemesterWork = require("../models/SemesterWork");
const Transcript = require("../models/Transcript");
const Student = require("../models/Student");






//UTILS
const password = require("../utils/password.utils");
const { getCurrentSemester, getLatestSemester } = require("../utils/semester.utils");






//SERVICES
exports.getStudent = async (studentId) => {
    const student = await Student.findById(studentId).select("-password");
    if (!student) {
        const error = new Error("Student not found");
        error.statusCode = 404;
        throw error;
    }
    return student;
}


exports.getStudentDetails = async (studentId) => {
    let [semester, transcript] = await Promise.all([
        getCurrentSemester(),
        Transcript.findOne({ studentId }).populate("studentId", "studentName studentPhone studentEmail username").populate("completedCourses.courseId")
      
    ])

    if(!semester){
        semester = await getLatestSemester();
    }
    if (!transcript) {
        const error = new Error("Transcript not found");
        error.statusCode = 404;
        throw error;
    }
    
    let [semesterWorks, advisor] = await Promise.all([
        SemesterWork.find({
      studentId: studentId,
      semesterId: semester._id,
    })
      .populate("courseId", "courseName")
      .select("courseId grade"),
        AdvisingList.findOne({
      "students.student": studentId,
    })
      .populate("advisor", "staffName email phone")
      .select("advisor -_id")
    ]);

    advisor = advisor ? advisor.advisor : null;

    return {
      transcript,
      semester,
      semesterWorks,
      advisor,
    };
}

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





