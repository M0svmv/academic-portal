const Enrollment = require("../models/Enrollment");
const Semester = require("../models/Semester");
const Student = require("../models/Student");
const Transcript = require("../models/Transcript");
const CourseOffering = require("../models/CourseOffering");
const SemesterWork = require("../models/SemesterWork");


const {getCurrentSemester} = require("./semester.utils");
const {assignAllowedCredits, validateCredits, sumCredits} = require("./credits.utils");

const {CREDITS_LIMITS, GPA_THRESHOLDS} = require("../constants/limits.constants");





exports.isEnrollmentOpen = (semester) => {
  const now = new Date();

  if (!semester?.timeLine?.preRegistration) return false;

  return (
    now >= semester.timeLine.preRegistration.start &&
    now <= semester.timeLine.preRegistration.end &&
    semester.settings.allowEnrollment !== false
  );
};


exports.getSemesterPreRegValidation = async () => {
  const currentSemester = await getCurrentSemester();

  if (!currentSemester) {
    throw new Error("No active semester found");
  }

  const today = new Date();

  if (
    today < currentSemester.timeLine.preRegistration.start ||
    today > currentSemester.timeLine.preRegistration.end ||
    currentSemester.settings.allowEnrollment === false
  ) {
    throw new Error("you can't enroll now");
  }

  

  return currentSemester;

  
};





exports.getStudentWithRules = async (studentId) => {
  const [student, transcript] = await Promise.all([
  Student.findById(studentId),
  Transcript.findOne({ studentId }),
]);

if (!student) throw new Error("Student not found");
if (!transcript) throw new Error("Transcript not found");

  student.allowedCredits = assignAllowedCredits(transcript.GPA, transcript.completedCourses.length);

  student.transcript = transcript;
  return student;
};



exports.getOfferings = async (courses, semesterId) => {
  const offeringIds = courses.map((c) => c.courseOfferingId);

  const offerings = await CourseOffering.find({
    _id: { $in: offeringIds },
    semesterId,
    status: { $in: ["open", "proposed"] },
  }).populate("courseId", "courseCredits");

  if (offerings.length !== offeringIds.length) {
    throw new Error("One or more courses are not available");
  }

  return offerings;
};


exports.validatePrerequisites = async (studentId, newCourses) => {
  const [transcript,preReqCourses] = await Promise.all([Transcript.findOne({ studentId }),
     CourseOffering.find({
    _id: { $in: newCourses.map(c => c.courseOfferingId) }
  }).populate("courseId")
  ]);

  const required = preReqCourses
    .map(c => c.courseId.prerequisiteCourses)
    .flat();

  const completed = transcript.completedCourses
    .filter(c => c.status !== "failed")
    .map(c => c.courseId.toString());

  const uniqueRequired = [...new Set(required.map(r => r.toString()))];

  const missing = uniqueRequired.filter(
    (r) => !completed.includes(r)
  );

  if (missing.length > 0) {
    throw new Error(
      JSON.stringify({ message: "Missing prerequisites", missing })
    );
  }

  return true;
};


exports.computeChanges = async (studentId, courses, offerings, semesterId) => {
  const enrollment = await Enrollment.findOne({
    studentId,
    semesterId,
  });

  const oldCourses = enrollment
    ? enrollment.courses.map(c => c.courseOfferingId.toString())
    : [];

  const newCourses = courses.map(c => c.courseOfferingId.toString());

  const addedCourses = newCourses.filter(id => !oldCourses.includes(id));
  const removedCourses = oldCourses.filter(id => !newCourses.includes(id));

  const currentCredits = sumCredits(offerings);

  return { addedCourses, removedCourses, currentCredits };
};



exports.updateCounters = async (added, removed, student) => {
  await CourseOffering.updateMany(
    { _id: { $in: added } },
    { $inc: { enrolledCount: 1 } }
  );

  await CourseOffering.updateMany(
    { _id: { $in: removed } },
    { $inc: { enrolledCount: -1 } }
  );

  const isGraduating =
    student.transcript.level === "senior" ||
    student.transcript.level === "senior-2";

  if (isGraduating && added.length > 0) {
    await CourseOffering.updateMany(
      { _id: { $in: added } },
      { $inc: { graduatesEnrolledCount: 1 } }
    );
  }
};



exports.syncSemesterWork = async (studentId, semesterId, added, removed, offerings) => {
  const offeringMap = {};
  offerings.forEach(o => {
    offeringMap[o._id.toString()] = o;
  });

  if (added.length > 0) {
    await SemesterWork.insertMany(
      added.map(id => ({
        _id: studentId + "-" + id,
        studentId,
        semesterId,
        courseId: offeringMap[id].courseId._id,
      }))
    );
  }

  if (removed.length > 0) {
    await SemesterWork.deleteMany({
      _id: { $in: removed.map(c => studentId + "-" + c) },
    });
  }
};



exports.saveEnrollment = async (
  studentId,
  semesterId,
  courses,
  student,
  currentCredits
) => {
  let enrollment = await Enrollment.findOne({ studentId, semesterId });

  if (!enrollment) {
    enrollment = new Enrollment({
      studentId,
      semesterId,
      courses,
      status: "pending",
      currentEnrolledCredits: currentCredits,
      allowedCredits: student.allowedCredits,
    });
  } else {
    enrollment.courses = courses;
    enrollment.currentEnrolledCredits = currentCredits;
    enrollment.allowedCredits = student.allowedCredits;
    enrollment.status = "pending";
  }

  await enrollment.save();
  return enrollment;
};




