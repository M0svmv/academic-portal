

const { CREDITS_LIMITS, GPA_THRESHOLDS } = require("../constants/limits.constants");

exports.assignAllowedCredits = (gpa, completedCoursesLength) => {
  if (gpa === 0 && completedCoursesLength === 0) {
    return CREDITS_LIMITS.STANDARD_CREDITS;
  } else if (gpa < GPA_THRESHOLDS.LOW) {
    return CREDITS_LIMITS.LOW_CREDITS;
  } else if (gpa >= GPA_THRESHOLDS.HIGH) {
    return CREDITS_LIMITS.HIGH_CREDITS;
  }

  return CREDITS_LIMITS.STANDARD_CREDITS;
};



const sumCredits = (offerings) => {
  return offerings.reduce(
    (total, offer) => total + (offer.courseId?.courseCredits || 0),
    0
  );
};

exports.sumCredits = sumCredits;


exports.validateCredits = (offerings, student) => {
  const totalCredits = sumCredits(offerings);

  if (totalCredits > student.allowedCredits) {
    throw new Error(
      `Credit limit exceeded. Allowed: ${student.allowedCredits}, Attempted: ${totalCredits}`
    );
  }

  return totalCredits;
};