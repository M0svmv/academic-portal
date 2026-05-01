const express = require("express");
const router = express.Router();
const taController = require("../controllers/staff/ta/ta.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const roleCheckMiddleware = require("../middlewares/role.middleware");




// Get courses assigned to TA
router.get(
  "/me/courses",
  authMiddleware,
  roleCheckMiddleware("ta"),
  taController.getTACourses
);

router.get('/me/courses/schedule', authMiddleware, roleCheckMiddleware('ta'), taController.getMyCoursesSchedule);

// Get course details for TA's course
router.get(
  "/me/courses/:id",
  authMiddleware,
  roleCheckMiddleware("ta"),
  taController.getCourseDetails
);

// assign labs dates
router.put(
  "/me/courses/:id/labs",
  authMiddleware,
  roleCheckMiddleware("ta"),
  taController.assignLabsDates
);

//make announcement for course
router.post(
  "/me/courses/:id/announcements",
  authMiddleware,
  roleCheckMiddleware("ta"),
  taController.makeAnnouncement
);

router.get(
  "/me/courses/:id/announcements",
  authMiddleware,
  roleCheckMiddleware("ta"),
  taController.getCourseAnnouncements
);

router.put(
  "/me/courses/:id/announcements",
  authMiddleware,
  roleCheckMiddleware("ta"),
  taController.updateAnnouncement
);

router.delete(
  "/me/courses/:id/announcements",
  authMiddleware,
  roleCheckMiddleware("ta"),
  taController.deleteAnnouncement
);

//grading students
router.put('/me/courses/:id/grades', authMiddleware, roleCheckMiddleware('ta'), taController.gradeStudents);

// delete lab date
router.delete(
  "/me/courses/:id/labs",
  authMiddleware,
  roleCheckMiddleware("ta"),
  taController.deleteLabDate
);

// take lab attendance
router.put(
  "/me/courses/:id/attendance",
  authMiddleware,
  roleCheckMiddleware("ta"),
  taController.takeLabAttendance
);



// get lab attendance
router.get(
  "/me/courses/:id/attendance",
  authMiddleware,
  roleCheckMiddleware("ta"),
  taController.getLabAttendance
);

// update student lab attendance (for corrections)
router.put(
  "/me/courses/:courseOfferingId/attendance/:studentId",
  authMiddleware,
  roleCheckMiddleware("ta"),
  taController.updateStudentAttendance
);

module.exports = router;