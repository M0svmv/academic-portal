const express = require('express');
const router = express.Router();

const enrollmentController = require('../controllers/staff/programCoordinator/enrollment.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleCheckMiddleware = require('../middlewares/role.middleware');



// Get available courses for a student
router.get("/:id/available-courses",authMiddleware,roleCheckMiddleware('coordinator'), enrollmentController.getStudentAvailableCourses);

// Enroll a student in course offerings
router.post('/enroll/:id',authMiddleware,roleCheckMiddleware('coordinator'), enrollmentController.enrollStudent);

// Get all enrollments for a student
router.get('/student/:studentId',authMiddleware,roleCheckMiddleware('admin','coordinator'), enrollmentController.getEnrollmentsByStudent);

// Get all enrollments for a semester
router.get('/semester/:semesterId',authMiddleware,roleCheckMiddleware('coordinator','admin'), enrollmentController.getEnrollmentsBySemester);















// not used routes
// Drop a course offering
router.post('/drop',authMiddleware,roleCheckMiddleware('coordinator', 'academic-advisor'), enrollmentController.dropCourseOffering);

// Get courses for a student in a semester
router.get('/student/:studentId/semester/:semesterId',authMiddleware,roleCheckMiddleware('coordinator', 'academic-advisor'), enrollmentController.getCoursesByStudentAndSemester);

// Get students in a course offering
router.get('/course/:courseOfferingId',authMiddleware,roleCheckMiddleware('coordinator', 'academic-advisor','lecturer'), enrollmentController.getStudentsByCourseOffering);

// update all courses for a student in a semester
router.put('/update',authMiddleware,roleCheckMiddleware('coordinator', 'academic-advisor'), enrollmentController.updateCoursesForStudent);

// Add a course offering to a student
router.post('/add', enrollmentController.addCourseOfferingForStudent);

// add list of students enrollments in a semester
router.post('/addEnrollmentsForSemester', enrollmentController.addEnrollmentsForSemester);






module.exports = router;