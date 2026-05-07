const {
  getSemesterPreRegValidation,
  getStudentWithRules,
  getOfferings,
  
  validatePrerequisites,
  computeChanges,
  updateCounters,
  syncSemesterWork,
  saveEnrollment
} = require("../utils/enrollment.utils");

const { assignAllowedCredits, validateCredits, sumCredits } = require("../utils/credits.util");

const { getCurrentSemester } = require("../utils/semester.utils");

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
  const { addedCourses, removedCourses, currentCredits } =
    await computeChanges(studentId, courses, offerings, currentSemester._id);

    

  // 🔹 step 5: updates (ترتيب مهم)
  await updateCounters(addedCourses, removedCourses, student);

  await syncSemesterWork(
    studentId,
    currentSemester._id,
    addedCourses,
    removedCourses,
    offerings
  );

  console.log(currentSemester._id)

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