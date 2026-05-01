const express = require('express');
const router = express.Router();
const studentAuthController = require('../controllers/student/studentAuth.controller');
const studentProfileController = require('../controllers/student/profile.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleCheckMiddleware = require('../middlewares/role.middleware');

// Student login
router.post('/login', studentAuthController.studentLogin);


router.get('/me/recommendations', authMiddleware, studentProfileController.getRecommendations);
// Get student profile
router.get('/me', authMiddleware, roleCheckMiddleware('student'), studentProfileController.getStudentProfile);

// Update student profile
router.put('/me', authMiddleware, roleCheckMiddleware('student'), studentProfileController.updateStudentProfile);

// Get student transcript
router.get('/me/transcript', authMiddleware, roleCheckMiddleware('student'), studentProfileController.getStudentTranscript);

// Get student details
router.get('/me/details', authMiddleware, roleCheckMiddleware('student'), studentProfileController.getStudentDetails);

// Get current semester enrollment
router.get('/me/enrollments/current', authMiddleware, roleCheckMiddleware('student'), studentProfileController.getCurrentEnrollment);

// Get all enrollments for the student
router.get('/me/enrollments', authMiddleware, roleCheckMiddleware('student'), studentProfileController.getStudentEnrollments);

// Enroll in courses for the current semester
router.post('/me/enroll', authMiddleware, roleCheckMiddleware('student'), studentProfileController.enrollStudent);

//get available courses
router.get('/me/available-courses', authMiddleware, roleCheckMiddleware('student'), studentProfileController.getAvailableCourses);

// request Meeting with advisor
router.post('/me/request-meeting', authMiddleware, roleCheckMiddleware('student'), studentProfileController.requestMeeting);

// get my meetings
router.get('/me/meetings', authMiddleware, roleCheckMiddleware('student'), studentProfileController.getMyMeetings);

// Get announcements for the student
router.get('/me/announcements', authMiddleware, roleCheckMiddleware('student'), studentProfileController.getAnnouncements);

//get department announcements
router.get('/me/department-announcements', authMiddleware, roleCheckMiddleware('student'), studentProfileController.getDepartmentAnnouncements);

//get my advising list announcements
router.get('/me/advising-list-announcements', authMiddleware, roleCheckMiddleware('student'), studentProfileController.getAdvisingListAnnouncements);

//get all courses
router.get('/me/courses', authMiddleware, roleCheckMiddleware('student'), studentProfileController.getAllCourses);

//get courses schedule
router.get('/me/courses/schedule', authMiddleware, roleCheckMiddleware('student'), studentProfileController.getCoursesSchedule);

//get my schedule
router.get('/me/courses/my-schedule', authMiddleware, roleCheckMiddleware('student'), studentProfileController.getMySchedule);

//get my academic requests
router.get('/me/academic-requests', authMiddleware, roleCheckMiddleware('student'), studentProfileController.getMyAcademicRequests);

//make Withdraw Request
router.post('/me/academic-requests/withdraw', authMiddleware, roleCheckMiddleware('student'), studentProfileController.makeWithdrawRequest);

//make Add Drop Request
router.post('/me/academic-requests/add-drop', authMiddleware, roleCheckMiddleware('student'), studentProfileController.makeAddDropRequest);

//make improve grade Request
router.post('/me/academic-requests/improve-grade', authMiddleware, roleCheckMiddleware('student'), studentProfileController.makeImproveGradeRequest);

//make overload Request
router.post('/me/academic-requests/overload', authMiddleware, roleCheckMiddleware('student'), studentProfileController.makeOverloadRequest);

//delete academic request
router.delete('/me/academic-requests/:id', authMiddleware, roleCheckMiddleware('student'), studentProfileController.deleteRequest);




module.exports = router;