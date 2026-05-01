const CourseOffering = require("../models/courseOffering");
const Transcript = require("../models/Transcript");
const Semester = require("../models/Semester");

async function getRecommendations(studentId) {
  const semester = await Semester.findOne({ isCurrent: true });

  const transcript = await Transcript.findOne({ studentId });

  if (!transcript) throw new Error("Transcript not found");

  const completedCourses = transcript.completedCourses
    .filter(c => c.status === "passed")
    .map(c => c.courseId.toString());

  const offerings = await CourseOffering.find({
    semesterId: semester._id,
    status: { $in: ["open", "proposed"] }
  }).populate("courseId");

  let results = [];

  for (let offer of offerings) {
    const course = offer.courseId;

    // ❌ skip already completed
    if (completedCourses.includes(course._id)) continue;

    // ❌ prerequisites check
    const prereqsMet = course.prerequisiteCourses.every(pr =>
      completedCourses.includes(pr.toString())
    );

    if (!prereqsMet) continue;

    const score = calculateScore(course, transcript);

    results.push({
      course: offer,
      score
    });
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 10);
}

function calculateScore(course, transcript) {
  let score = 0;

  // 🎯 Level match
  if (course.courseLevel === transcript.level) {
    score += 30;
  } else if (isNextLevel(course.courseLevel, transcript.level)) {
    score += 15;
  } else {
    score -= 10;
  }

  // 🎯 GPA factor
  score += transcript.GPA * 10;

  // 🎯 Risk adjustment
  if (transcript.atRisk) {
    score -= 20;
  }

  // 🎯 Credit pressure (students near graduation prefer higher level courses)
  if (transcript.completedCredits > 120 && course.courseLevel === "senior") {
    score += 10;
  }

  return score;
}


function isNextLevel(courseLevel, studentLevel) {
  const order = [
    "freshman",
    "sophomore",
    "junior",
    "senior-1",
    "senior-2",
    "senior"
  ];

  const c = order.indexOf(courseLevel);
  const s = order.indexOf(studentLevel);

  return c === s + 1;
}

module.exports = {
  getRecommendations
};