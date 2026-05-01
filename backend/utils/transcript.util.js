exports.getPassedCourses = (transcript) =>
  (transcript?.completedCourses || [])
    .filter(c => c.status === "passed")
    .map(c => c.courseId.toString());