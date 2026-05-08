const AdvisingList = require("../models/AdvisingList");
const Semester = require("../models/Semester");
const Enrollment = require("../models/Enrollment");
const Announcement = require("../models/Announcement");

const {
  buildAnnouncementQuery,
} = require("../utils/announcement.utils");

const { getCurrentSemester } = require("../utils/semester.utils");

exports.getAnnouncements = async (studentId) => {


  const [advisingList, currentSemester] = await Promise.all([
    AdvisingList.findOne({
      "students.student": studentId,
    }),

    getCurrentSemester(),
  ]);

  if (!currentSemester) {
    const error = new Error(
      "Current semester not found"
    );
    error.statusCode = 404;
    throw error;
  }

  const enrollment = await Enrollment.findOne({
    semesterId: currentSemester._id,
    studentId,
  });

  const courseIds = enrollment
    ? enrollment.courses.map(
        (c) => c.courseOfferingId
      )
    : [];

  const query = buildAnnouncementQuery({
    studentId,
    advisingList,
    courseIds,
    
  });

  const announcements = await Announcement.find(query)
    .populate("staffId", "staffName")
    .populate({
      path: "courseId",
      select: "courseId",
      populate: {
        path: "courseId",
        select: "courseName",
      },
    })
    .sort({ updatedAt: -1 });

  return announcements;
};