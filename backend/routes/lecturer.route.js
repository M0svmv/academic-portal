const express = require('express');
const router = express.Router();
const lecturerController = require('../controllers/staff/lecturer/lecturer.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleCheckMiddleware = require('../middlewares/role.middleware');


//get lecturer courses
router.get('/me/courses', authMiddleware, roleCheckMiddleware('lecturer'), lecturerController.getLecturerCourses);

//get my courses schedule
router.get('/me/courses/schedule', authMiddleware, roleCheckMiddleware('lecturer'), lecturerController.getMyCoursesSchedule);

//make announcement for course
router.get('/me/courses/announcements', authMiddleware, roleCheckMiddleware('lecturer'), lecturerController.getMyAnnouncements);
router.get('/me/courses/:id/announcements', authMiddleware, roleCheckMiddleware('lecturer'), lecturerController.getCourseAnnouncements);
router.post('/me/courses/:id/announcements', authMiddleware, roleCheckMiddleware('lecturer'), lecturerController.makeAnnouncement);
router.put('/me/courses/:id/announcements', authMiddleware, roleCheckMiddleware('lecturer'), lecturerController.updateAnnouncement);
router.delete('/me/courses/:id/announcements', authMiddleware, roleCheckMiddleware('lecturer'), lecturerController.deleteAnnouncement);

//get course details
router.get('/me/courses/:id', authMiddleware, roleCheckMiddleware('lecturer'), lecturerController.getCourseDetails);

//grading students
router.put('/me/courses/:id/grades', authMiddleware, roleCheckMiddleware('lecturer'), lecturerController.gradeStudents);

//assign grading schema
router.put('/me/courses/:id/schema', authMiddleware, roleCheckMiddleware('lecturer'), lecturerController.assignGradingSchema);

// assign lectures number
router.put('/me/courses/:id/lectures', authMiddleware, roleCheckMiddleware('lecturer'), lecturerController.assignLecturesNumber);

// assign lectures dates
router.put('/me/courses/:id/lecture-dates', authMiddleware, roleCheckMiddleware('lecturer'), lecturerController.assignLectureDates);

// delete lectures dates
router.delete('/me/courses/:id/lecture-dates', authMiddleware, roleCheckMiddleware('lecturer'), lecturerController.deleteLectureDate);


// assign labs number
router.put('/me/courses/:id/labs', authMiddleware, roleCheckMiddleware('lecturer'), lecturerController.assignLabsNumber);

// take lecture attendance
router.put('/me/courses/:id/attendance', authMiddleware, roleCheckMiddleware('lecturer'), lecturerController.takeLectureAttendance);

// get lecture attendance
router.get('/me/courses/:id/attendance', authMiddleware, roleCheckMiddleware('lecturer'), lecturerController.getLectureAttendance);

// update student attendance (for corrections)
router.put('/me/courses/:courseOfferingId/attendance/:studentId', authMiddleware, roleCheckMiddleware('lecturer'), lecturerController.updateStudentAttendance);
module.exports = router;