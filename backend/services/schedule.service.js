const Semester = require("../models/Semester");
const CourseOffering = require("../models/CourseOffering");
const Schedule = require("../models/Schedule");
const SemesterWork = require("../models/SemesterWork");

const {
  validateCurrentSemesterSchedule,
} = require("../utils/schedule.utils");

const { getCurrentSemester } = require("../utils/semester.utils");

const getScheduleData = async (
  offeringsFilter
) => {
  const currentSemester =
    await getCurrentSemester();

  validateCurrentSemesterSchedule(
    currentSemester
  );

  const [schedule, offerings] =
    await Promise.all([
      Schedule.find(),

      CourseOffering.find({
        semesterId:
          currentSemester._id,

        ...offeringsFilter,
      })
        .populate(
          "courseId",
          "courseName"
        )
        .populate(
          "instructorId",
          "staffName"
        )
        .populate(
          "taId",
          "staffName"
        )
        .select(
          "courseId schedule instructorId taId"
        ),
    ]);

  if (offerings.length === 0) {
    const error = new Error(
      "No course schedules available for the current semester"
    );

    error.statusCode = 404;

    throw error;
  }

  return {
    schedule,
    offerings,
  };
};

exports.getCoursesSchedule =
  async () => {
    return await getScheduleData({
      status: {
        $in: ["open", "proposed"],
      },

      "schedule.days.0": {
        $exists: true,
      },
    });
  };

exports.getMySchedule = async (
  studentId
) => {
  const currentSemester =
    await getCurrentSemester();

  const semesterWorks =
    await SemesterWork.find({
      studentId,
      semesterId: currentSemester._id,
    }).select("courseId");

  const enrolledCourseIds =
    semesterWorks.map(
      (sw) => sw.courseId
    );

  return await getScheduleData({
    courseId: {
      $in: enrolledCourseIds,
    },
  });
};