const AcademicRequest = require("../models/AcademicRequest");
const AdvisingList = require("../models/AdvisingList");

const { getCurrentSemester } = require("../utils/semester.utils");
const {
  validateWithdrawRequestData,
} = require("../utils/academicRequest.utils");

exports.getMyAcademicRequests = async (studentId) => {
  const currentSemester = await getCurrentSemester();
  const Requests = await AcademicRequest.find({
    studentId,
    semesterId: currentSemester._id,
  })
    .populate("academicAdvisorId", "staffName")
    .populate("courseId", "courseName")
    .populate("addedCourses", "courseName")
    .populate("droppedCourses", "courseName");

  return Requests;
};

exports.makeWithdrawRequest = async (studentId, requestData) => {
  const currentSemester = await getCurrentSemester();

  const advisorDoc = await AdvisingList.findOne({
    "students.student": studentId,
  }).select("advisor -_id");

  if (!advisorDoc) {
    const error = new Error("Advising list not found");

    error.statusCode = 404;

    throw error;
  }

  validateWithdrawRequestData(requestData);

  const {
    withdrawalReason,
    writtenReason = "",
    studentSuggestion = "",
    courseId,
  } = requestData;

  const newRequest = await AcademicRequest.create({
    studentId,

    academicAdvisorId: advisorDoc.advisor,

    semesterId: currentSemester._id,

    requestType: "Withdrawal",

    courseId,

    withdrawalReason,

    writtenReason,

    studentSuggestion,
  });

  return {
    message: "Withdrawal request submitted successfully",

    data: newRequest,
  };
};


