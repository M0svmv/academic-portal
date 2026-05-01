const AcademicRequest = require("../../../models/AcademicRequest");
const Semester = require("../../../models/Semester");

exports.getApprovedAcademicRequests = async (req, res) => {
  try {
    
    const currentSemester = await Semester.findOne({ isCurrent: true });
    const Requests = await AcademicRequest.find({ semesterId: currentSemester._id, status: "approved" })
      .populate("studentId", "studentName studentId")
      .populate("semesterId", "name")
      .populate("droppedCourses", "courseName")
      .populate("addedCourses", "courseName")
      .populate("academicAdvisorId", "staffName");
    res.status(200).json({ Requests });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

exports.getAllAcademicRequests = async (req, res) => {
  try {
    const currentSemester = await Semester.findOne({ isCurrent: true });
    const Requests = await AcademicRequest.find({ semesterId: currentSemester._id })
      .populate("studentId", "studentName studentId")
      .populate("semesterId", "name")
      .populate("droppedCourses", "courseName")
      .populate("addedCourses", "courseName")
      .populate("academicAdvisorId", "staffName");
    res.status(200).json({ Requests });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}