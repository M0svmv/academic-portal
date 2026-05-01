const {
  getSemesterPreRegValidation,
  getStudentWithRules,
  getOfferings,
  validateCredits,
  validatePrerequisites,
  computeChanges,
  updateCounters,
  syncSemesterWork,
  saveEnrollment
} = require("../utils/enrollment.utils");

exports.enrollStudent = async (studentId, body) => {
  const { courses } = body;

  const currentSemester = await getSemesterPreRegValidation();

  const student = await getStudentWithRules(studentId);

  const offerings = await getOfferings(courses, currentSemester._id);

  validateCredits(offerings, student);

  const prerequisiteCheck = await validatePrerequisites(studentId, courses);

  const { addedCourses, removedCourses, currentCredits } =
    await computeChanges(studentId, courses, offerings);

  await updateCounters(addedCourses, removedCourses, student);

  await syncSemesterWork(studentId, currentSemester._id, addedCourses, removedCourses, offerings);

  const enrollment = await saveEnrollment(
    studentId,
    currentSemester._id,
    courses,
    student,
    currentCredits
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