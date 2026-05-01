exports.calculateAllowedCredits = (gpa, completedCoursesLength) => {
  if (gpa === 0 && completedCoursesLength === 0) return 18;
  if (gpa < 2.0) return 12;
  if (gpa >= 3.0) return 21;
  return 15; // default fallback
};


exports.sumCredits = (offerings) => {
  return offerings.reduce(
    (total, offer) => total + (offer.courseId?.courseCredits || 0),
    0
  );
};