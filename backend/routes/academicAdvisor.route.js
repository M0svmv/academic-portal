const express = require("express");
const router = express.Router();
const academicAdvisorController = require("../controllers/staff/academicAdvisor/academicAdvisor.controller");
const EnrollmentController = require("../controllers/staff/programCoordinator/enrollment.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const roleCheckMiddleware = require("../middlewares/role.middleware");
const Enrollment = require("../models/Enrollment");

//get department courses
router.get(
  "/me/department-courses",
  authMiddleware,
  roleCheckMiddleware("academic-advisor"),
  academicAdvisorController.getDepartmentCourses,
);

//get advising list
router.get(
  "/me/list",
  authMiddleware,
  roleCheckMiddleware("academic-advisor"),
  academicAdvisorController.getAdvisingList,
);

//show student details
router.get(
  "/me/students/:id",
  authMiddleware,
  roleCheckMiddleware("academic-advisor"),
  academicAdvisorController.showStudentDetails,
);

//show student courses schedule
router.get(
  "/me/students/:id/schedule",
  authMiddleware,
  roleCheckMiddleware("academic-advisor"),
  academicAdvisorController.showStudentSchedule,
);

//show student semester works
router.get(
  "/me/student/:id/semester-works",
  authMiddleware,
  roleCheckMiddleware("academic-advisor"),
  academicAdvisorController.showStudentSemesterWorks,
);

//get available courses for enrollment
router.get(
  "/me/students/available-courses/:id",
  authMiddleware,
  roleCheckMiddleware("academic-advisor"),
  academicAdvisorController.getStudentAvailableCourses
);

//get student current enrollment
router.get(
  "/me/students/current-enrollment/:id",
  authMiddleware,
  roleCheckMiddleware("academic-advisor"),
  academicAdvisorController.getCurrentEnrollment
);


// enroll student
router.post(
  "/me/students/enroll/:id",
  authMiddleware,
  roleCheckMiddleware("academic-advisor"),
  academicAdvisorController.enrollStudent,
);

//update student enrollment status
router.put(
  "/me/students/enroll/:id",
  authMiddleware,
  roleCheckMiddleware("academic-advisor"),
  academicAdvisorController.updateEnrollmentStatus,
);

// get my meetings requests
router.get(
  "/me/meetings/requests",
  authMiddleware,
  roleCheckMiddleware("academic-advisor"),
  academicAdvisorController.getMeetings,
);

//get approved meetings
router.get(
  "/me/meetings",
  authMiddleware,
  roleCheckMiddleware("academic-advisor"),
  academicAdvisorController.getApprovedMeetings,
);

//respond to meeting request
router.post(
  "/me/meetings/respond/:id",
  authMiddleware,
  roleCheckMiddleware("academic-advisor"),
  academicAdvisorController.respondToMeeting,
);

// make an announcement to my students
router.post("/me/advising-list/announcement",
  authMiddleware,
  roleCheckMiddleware("academic-advisor"),
  academicAdvisorController.makeAnnouncement,
);

// make an announcement to specific student
router.post("/me/advising-list/announcement/specific-students",
  authMiddleware,
  roleCheckMiddleware("academic-advisor"),
  academicAdvisorController.makeAnnouncementToStudent,
);


//update announcement
router.put(
  "/me/advising-list/announcement/:announcementId",
  authMiddleware,
  roleCheckMiddleware("academic-advisor"),
  academicAdvisorController.updateAnnouncement,
);

//delete announcement
router.delete(
  "/me/advising-list/announcement/:announcementId",
  authMiddleware,
  roleCheckMiddleware("academic-advisor"),
  academicAdvisorController.deleteAnnouncement,
);

//get announcements
router.get(
  "/me/advising-list/announcements",
  authMiddleware,
  roleCheckMiddleware("academic-advisor"),
  academicAdvisorController.getAnnouncements,
);


//get my students academic requests
router.get(
  "/me/academic-requests",
  authMiddleware,
  roleCheckMiddleware("academic-advisor"),
  academicAdvisorController.getMyStudentRequests,
);


//respond to academic request
router.put(
  "/me/academic-requests/respond/:id",
  authMiddleware,
  roleCheckMiddleware("academic-advisor"),
  academicAdvisorController.updateRequestStatus,
);



module.exports = router;
