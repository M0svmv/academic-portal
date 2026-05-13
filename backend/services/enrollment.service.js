//MODELS
const Enrollment = require("../models/Enrollment");
const Student = require("../models/Student");
const Transcript = require("../models/Transcript");
const Semester = require("../models/Semester");
const CourseOffering = require("../models/CourseOffering");
const SemesterWork = require("../models/SemesterWork");


//UTILS
const {
  getSemesterPreRegValidation,
  getStudentWithRules,
  getOfferings,

  validatePrerequisites,
  computeChanges,
  updateCounters,
  syncSemesterWork,
  saveEnrollment,
} = require("../utils/enrollment.utils");

const {
  assignAllowedCredits,
  validateCredits,
  sumCredits,
} = require("../utils/credits.utils");

const { getCurrentSemester } = require("../utils/semester.utils");

//CONSTANTS
const { CREDITS_LIMITS, GPA_THRESHOLDS } = require("../constants/limits.constants");
const STATUS = require("../constants/statusCodes.constants");



//SERVICES
exports.enrollStudent = async (studentId, body) => {
  const { courses } = body;

  const [currentSemester, student] = await Promise.all([
    getCurrentSemester(),
    getStudentWithRules(studentId),
  ]);

  const [offerings, prerequisiteCheck] = await Promise.all([
    getOfferings(courses, currentSemester._id),
    validatePrerequisites(studentId, courses),
  ]);

  validateCredits(offerings, student);

  const { addedCourses, removedCourses, currentCredits } = await computeChanges(
    studentId,
    courses,
    offerings,
    currentSemester._id,
  );

  await updateCounters(addedCourses, removedCourses, student);

  await syncSemesterWork(
    studentId,
    currentSemester._id,
    addedCourses,
    removedCourses,
    offerings,
  );

  const enrollment = await saveEnrollment(
    studentId,
    currentSemester._id,
    courses,
    student,
    currentCredits,
  );

  return {
    message: "Enrollment updated successfully",
    enrollment,
    addedCourses,
    removedCourses,
    totalCredits: currentCredits,
    allowedCredits: student.allowedCredits,
  };
};

exports.getStudentCurrentEnrollment = async (studentId) => {
  const currentSemester = await getCurrentSemester();
  const currentEnrollment = await Enrollment.findOne({
    studentId,
    semesterId: currentSemester._id,
  })
    .populate("semesterId", "semesterName")
    .populate({
      path: "courses.courseOfferingId",
      populate: { path: "courseId" },
      select: "courseId",
    });

  if (!currentEnrollment) {
    const error = new Error("Current enrollment not found");
    error.statusCode = STATUS.NOT_FOUND;
    throw error;
  }
  return currentEnrollment;
};


exports.getAvailableCourses = async (studentId) => {
  const [currentSemester, transcript] = await Promise.all([
    getCurrentSemester(),
    Transcript.findOne({ studentId }),
  ]);

  if (!currentSemester) {
    const error = new Error("Current semester not found");
    error.statusCode = 404;
    throw error;
  }

  if (!transcript) {
    const error = new Error("Transcript not found");
    error.statusCode = 404;
    throw error;
  }

  // ⚡ normalize regulation (case insensitive)
  const studentRegulation = String(transcript.regulation)
    .trim()
    .toLowerCase();

  // ⚡ Set بدل array (أسرع بكتير)
  const completedCourses = new Set(
    transcript.completedCourses
      .filter((c) => c.status === "passed")
      .map((c) => c.courseId.toString())
  );

  const allowedCredits = await assignAllowedCredits(
    transcript.GPA,
    transcript.completedCourses.length
  );

  const offerings = await CourseOffering.find({
    semesterId: currentSemester._id,
    status: { $in: ["open", "proposed"] },
  }).populate(
    "courseId",
    "courseName _id courseCredits courseLevel prerequisiteCourses courseType courseRegulation"
  );

  const availableOfferings = offerings.filter((offer) => {
    const course = offer.courseId;

    if (!course) return false;

    // ❌ already passed
    if (completedCourses.has(course._id.toString())) {
      return false;
    }

    // ❌ regulation (case-insensitive)
    if (
      String(course.courseRegulation).trim().toLowerCase() !==
      studentRegulation
    ) {
      return false;
    }

    // ❌ prerequisites
    const prereqs = course.prerequisiteCourses || [];

    return prereqs.every((pr) =>
      completedCourses.has(pr.toString())
    );
  });

  return {
    allowedCredits,
    availableOfferings,
  };
};