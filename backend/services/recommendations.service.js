const CourseOffering = require("../models/CourseOffering");
const Transcript = require("../models/Transcript");
const Semester = require("../models/Semester");
const Course = require("../models/Course");

async function getRecommendations(studentId) {
  // current semester
  const semester = await Semester.findOne({ isCurrent: true });

  if (!semester) {
    throw new Error("Current semester not found");
  }

  // student transcript
  const transcript = await Transcript.findOne({ studentId });

  if (!transcript) {
    throw new Error("Transcript not found");
  }

  // passed courses
  const completedCourses = transcript.completedCourses
    .filter((c) => c.status === "passed")
    .map((c) => c.courseId.toString());

  // available offerings
  const offerings = await CourseOffering.find({
    semesterId: semester._id,
    status: { $in: ["open", "proposed"] },
  }).populate("courseId");

  let results = [];

  for (const offer of offerings) {
    const course = offer.courseId;

    if (!course) continue;

    // ❌ already completed
    if (completedCourses.includes(course._id.toString())) {
      continue;
    }

    // ❌ prerequisites check
    const prereqsMet = course.prerequisiteCourses.every((pr) =>
      completedCourses.includes(pr.toString())
    );

    if (!prereqsMet) continue;

    // base score
    let score = calculateScore(course, transcript);

    // dependency analysis
    const dependencyData = await getDependencyScore(course._id);

    score += dependencyData.score;

    // crowded courses bonus
    if (dependencyData.totalUnlockedCourses >= 5) {
      score += 25;
    }

    // extremely critical course
    if (dependencyData.totalUnlockedCourses >= 10) {
      score += 40;
    }

    results.push({
      course: offer,
      score,

      recommendationMeta: {
        dependencyScore: dependencyData.score,
        unlockedCourses: dependencyData.totalUnlockedCourses,
        unlockDepth: dependencyData.maxDepth,
      },
    });
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

/**
 * dependency tree analysis
 * يحسب:
 * - عدد المواد اللي هتتفتح
 * - عمق الشجرة
 * - أهمية المادة
 */
async function getDependencyScore(
  courseId,
  visited = new Set(),
  depth = 1
) {
  const key = courseId.toString();

  if (visited.has(key)) {
    return {
      score: 0,
      totalUnlockedCourses: 0,
      maxDepth: depth - 1,
    };
  }

  visited.add(key);

  // المواد اللي محتاجة المادة دي
  const dependentCourses = await Course.find({
    prerequisiteCourses: courseId,
  });

  let totalUnlockedCourses = dependentCourses.length;

  let score = 0;

  let maxDepth = depth;

  /**
   * 🎯 direct unlock bonus
   * كل مادة بتتفتح بسبب المادة دي
   */
  score += dependentCourses.length * 30;

  for (const dependentCourse of dependentCourses) {
    const result = await getDependencyScore(
      dependentCourse._id,
      visited,
      depth + 1
    );

    totalUnlockedCourses += result.totalUnlockedCourses;

    /**
     * 🎯 recursive chain bonus
     * المواد اللي بعد المواد
     */
    score += result.score * 0.7;

    maxDepth = Math.max(maxDepth, result.maxDepth);
  }

  /**
   * 🎯 deep roadmap bonus
   */
  score += maxDepth * 10;

  /**
   * 🎯 huge dependency tree bonus
   */
  score += totalUnlockedCourses * 5;

  return {
    score,
    totalUnlockedCourses,
    maxDepth,
  };
}

function calculateScore(course, transcript) {
  let score = 0;

  /**
   * 🎯 level matching
   */
  if (course.courseLevel === transcript.level) {
    score += 30;
  }

  /**
   * 🎯 next level
   */
  else if (isNextLevel(course.courseLevel, transcript.level)) {
    score += 15;
  }

  /**
   * 🎯 previous levels
   */
  else if (isPreviousLevel(course.courseLevel, transcript.level, 1)) {
    score += 30;
  } else if (
    isPreviousLevel(course.courseLevel, transcript.level, 2)
  ) {
    score += 35;
  } else if (
    isPreviousLevel(course.courseLevel, transcript.level, 3)
  ) {
    score += 40;
  } else if (
    isPreviousLevel(course.courseLevel, transcript.level, 4)
  ) {
    score += 45;
  }

  /**
   * 🎯 far level penalty
   */
  else {
    score -= 10;
  }

  /**
   * 🎯 GPA factor
   */
  score += transcript.GPA * 10;

  /**
   * 🎯 at risk students
   */
  if (transcript.atRisk) {
    score -= 20;
  }

  /**
   * 🎯 near graduation
   */
  if (
    transcript.completedCredits > 120 &&
    course.courseLevel === "senior"
  ) {
    score += 20;
  }

  /**
   * 🎯 important course types
   */
  switch (course.courseType) {
    case "Core":
      score += 35;
      break;

    case "graduation-project":
      score += 50;
      break;

    case "training":
      score += 20;
      break;

    case "Program Elective":
      score += 10;
      break;

    default:
      score += 0;
  }

  return score;
}

function isPreviousLevel(courseLevel, studentLevel, level) {
  const order = [
    "freshman",
    "sophomore",
    "junior",
    "senior-1",
    "senior-2",
    "senior",
  ];

  const c = order.indexOf(courseLevel);

  const s = order.indexOf(studentLevel);

  return c === s - level;
}

function isNextLevel(courseLevel, studentLevel) {
  const order = [
    "freshman",
    "sophomore",
    "junior",
    "senior-1",
    "senior-2",
    "senior",
  ];

  const c = order.indexOf(courseLevel);

  const s = order.indexOf(studentLevel);

  return c === s + 1;
}

module.exports = {
  getRecommendations,
};