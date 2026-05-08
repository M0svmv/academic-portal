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

  // 🔹 step 1: الأساسي
  const [currentSemester, student] = await Promise.all([
    getCurrentSemester(),
    getStudentWithRules(studentId),
  ]);

  // 🔹 step 2: الداتا المستقلة
  const [offerings, prerequisiteCheck] = await Promise.all([
    getOfferings(courses, currentSemester._id),
    validatePrerequisites(studentId, courses),
  ]);

  // 🔹 step 3: validation
  validateCredits(offerings, student);

  // 🔹 step 4: compute
  const { addedCourses, removedCourses, currentCredits } = await computeChanges(
    studentId,
    courses,
    offerings,
    currentSemester._id,
  );

  // 🔹 step 5: updates (ترتيب مهم)
  await updateCounters(addedCourses, removedCourses, student);

  await syncSemesterWork(
    studentId,
    currentSemester._id,
    addedCourses,
    removedCourses,
    offerings,
  );

  console.log(currentSemester._id);

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
  const [currentSemester, transcript] = await Promise.all([getCurrentSemester(), Transcript.findOne({ studentId })]);

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

  const completedCourses = transcript.completedCourses
    .filter((c) => c.status === "passed")
    .map((c) => c.courseId.toString());

  
  let allowedCredits = await assignAllowedCredits(transcript.GPA, transcript.completedCourses.length);
  

  const offerings = await CourseOffering.find({
    semesterId: currentSemester._id,
    status: { $in: ["open", "proposed"] },
  }).populate(
    "courseId",
    "courseName _id courseCredits courseLevel prerequisiteCourses courseType",
  );

  let availableOfferings = offerings.filter(
    (offer) =>
      !completedCourses.includes(offer.courseId._id.toString()),
  );

  availableOfferings = availableOfferings.filter((offer) => {
    return offer.courseId.prerequisiteCourses.every((prereq) =>
      completedCourses.includes(prereq.toString()),
    );
  });

  return {
    allowedCredits,
    availableOfferings,
  };
};
