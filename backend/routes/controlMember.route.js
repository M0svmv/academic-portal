const express = require('express');
const router = express.Router();
const controlMemberController = require('../controllers/staff/controlMember/controlMember.controller');
const semesterWorkController = require('../controllers/staff/programCoordinator/semesterWork.controller');

// Get all courses with enrolled students
router.get('/courses', controlMemberController.getAllCourses);

// Get all students in a course
router.get('/courses/:id/students',controlMemberController.getCourseData);

// Assign final grades to students in a course
router.put('/courses/:id/assign-final-grades', controlMemberController.assignCourseFinalGrades);

// Update final grades for students in a course
router.put('/courses/:id/update-grades', controlMemberController.updateCourseGrades);





module.exports = router;