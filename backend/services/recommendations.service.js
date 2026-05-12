const CourseOffering = require("../models/CourseOffering");
const Transcript = require("../models/Transcript");
const Semester = require("../models/Semester");
const Course = require("../models/Course");

const LEVEL_ORDER = [
  "freshman",
  "sophomore",
  "junior",
  "senior-1",
  "senior-2",
  "senior",
];

// cache عشان منحسبش dependency tree كل مرة
const dependencyCache = new Map();

async function getRecommendations(studentId) {
  // parallel fetching
  const [semester, transcript] = await Promise.all([
    Semester.findOne({ isCurrent: true }).lean(),
    Transcript.findOne({ studentId }).lean(),
  ]);

  if (!semester) {
    throw new Error("Current semester not found");
  }

  if (!transcript) {
    throw new Error("Transcript not found");
  }

  // completed passed courses
  const completedCourses = new Set(
    transcript.completedCourses
      .filter((c) => c.status === "passed")
      .map((c) => c.courseId.toString())
  );

  /**
   * ⚡ important optimization
   * نفلتر بالـ regulation من البداية
   * بدل ما نجيب كل المواد
   */
  const validCourses = await Course.find({
    courseRegulation: transcript.regulation,
  })
    .select(
      `
      _id
      courseName
      courseCredits
      courseLevel
      prerequisiteCourses
      courseType
      courseRegulation
    `
    )
    .lean();

  const validCourseIds = validCourses.map((c) => c._id);

  // map أسرع للوصول
  const coursesMap = new Map();

  validCourses.forEach((course) => {
    coursesMap.set(course._id.toString(), course);
  });

  /**
   * ⚡ هات الـ offerings الخاصة بالمواد المناسبة بس
   */
  const offerings = await CourseOffering.find({
    semesterId: semester._id,
    status: { $in: ["open", "proposed"] },
    courseId: { $in: validCourseIds },
  }).lean();

  let results = [];

  for (const offer of offerings) {
    const course = coursesMap.get(
      offer.courseId.toString()
    );

    if (!course) continue;

    // already passed
    if (completedCourses.has(course._id.toString())) {
      continue;
    }

    // prerequisites check
    const prereqsMet = course.prerequisiteCourses.every(
      (pr) => completedCourses.has(pr.toString())
    );

    if (!prereqsMet) continue;

    // base score
    let score = calculateScore(course, transcript);

    // dependency score
    const dependencyData = await getDependencyScore(
      course._id.toString()
    );

    score += dependencyData.score;

    // critical roadmap courses
    if (dependencyData.totalUnlockedCourses >= 5) {
      score += 25;
    }

    if (dependencyData.totalUnlockedCourses >= 10) {
      score += 40;
    }

    results.push({
      course: {
        ...offer,
        courseId: course,
      },

      score,

      recommendationMeta: {
        dependencyScore: dependencyData.score,
        unlockedCourses:
          dependencyData.totalUnlockedCourses,
        unlockDepth: dependencyData.maxDepth,
      },
    });
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

/**
 * ⚡ optimized dependency analysis
 */
async function getDependencyScore(
  courseId,
  visited = new Set(),
  depth = 1
) {
  // cache hit
  if (dependencyCache.has(courseId)) {
    return dependencyCache.get(courseId);
  }

  if (visited.has(courseId)) {
    return {
      score: 0,
      totalUnlockedCourses: 0,
      maxDepth: depth - 1,
    };
  }

  visited.add(courseId);

  const dependentCourses = await Course.find({
    prerequisiteCourses: courseId,
  })
    .select("_id")
    .lean();

  let totalUnlockedCourses =
    dependentCourses.length;

  let score = dependentCourses.length * 30;

  let maxDepth = depth;

  for (const dependentCourse of dependentCourses) {
    const result = await getDependencyScore(
      dependentCourse._id.toString(),
      visited,
      depth + 1
    );

    totalUnlockedCourses +=
      result.totalUnlockedCourses;

    score += result.score * 0.7;

    maxDepth = Math.max(
      maxDepth,
      result.maxDepth
    );
  }

  // deep chains bonus
  score += maxDepth * 10;

  // massive unlock tree
  score += totalUnlockedCourses * 5;

  const finalResult = {
    score,
    totalUnlockedCourses,
    maxDepth,
  };

  // save in cache
  dependencyCache.set(courseId, finalResult);

  return finalResult;
}

function calculateScore(course, transcript) {
  let score = 0;

  const courseLevelIndex = LEVEL_ORDER.indexOf(
    course.courseLevel
  );

  const studentLevelIndex = LEVEL_ORDER.indexOf(
    transcript.level
  );

  const diff =
    studentLevelIndex - courseLevelIndex;

  // same level
  if (diff === 0) {
    score += 30;
  }

  // next level
  else if (diff === -1) {
    score += 15;
  }

  // previous levels
  else if (diff === 1) {
    score += 30;
  } else if (diff === 2) {
    score += 35;
  } else if (diff === 3) {
    score += 40;
  } else if (diff >= 4) {
    score += 45;
  }

  // far mismatch
  else {
    score -= 10;
  }

  // GPA factor
  score += transcript.GPA * 10;

  // at risk penalty
  if (transcript.atRisk) {
    score -= 20;
  }

  // near graduation
  if (
    transcript.completedCredits > 120 &&
    course.courseLevel === "senior"
  ) {
    score += 20;
  }

  // course type weights
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
  }

  return score;
}

module.exports = {
  getRecommendations,
};