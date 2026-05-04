const express = require('express');
const router = express.Router();
const controlMemberController = require('../controllers/staff/controlMember/controlMember.controller');
const semesterWorkController = require('../controllers/staff/programCoordinator/semesterWork.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleCheckMiddleware = require('../middlewares/role.middleware');

// Get all courses with enrolled students
router.get('/courses', authMiddleware, roleCheckMiddleware('control-member'), controlMemberController.getAllCourses);

// Get all students in a course
router.get('/courses/:id/students', authMiddleware, roleCheckMiddleware('control-member'), controlMemberController.getCourseData);

// Assign final grades to students in a course
router.put('/courses/:id/assign-final-grades', authMiddleware, roleCheckMiddleware('control-member'), controlMemberController.assignCourseFinalGrades);

// approve final grades for a course
router.put('/courses/:id/approve-final-grades', authMiddleware, roleCheckMiddleware('control-member'), controlMemberController.approveFinalGrades);

// Update final grades for students in a course
router.put('/courses/:id/update-grades', authMiddleware, roleCheckMiddleware('control-member'), controlMemberController.updateCourseGrades);





module.exports = router;