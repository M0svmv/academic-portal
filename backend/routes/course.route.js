const express = require('express');
const router = express.Router();
const courseController = require('../controllers/staff/programCoordinator/course.controller');
const checkDuplicate = require('../middlewares/checkDuplicate');
const Course = require('../models/Course');
const authMiddleware = require('../middlewares/auth.middleware');
const roleCheckMiddleware = require('../middlewares/role.middleware');

// Create a new course
router.post('/',authMiddleware, roleCheckMiddleware('admin'), courseController.createCourse);

// Create a list of courses
router.post('/list',authMiddleware, roleCheckMiddleware( 'admin'), courseController.createCourses);

// Get all courses
router.get('/',authMiddleware, roleCheckMiddleware('coordinator', 'admin'), courseController.getAllCourses);

// Get a course by ID
router.get('/:id',authMiddleware, roleCheckMiddleware('coordinator', 'admin'), courseController.getCourseById);

// Update a course
router.put('/:id',authMiddleware, roleCheckMiddleware( 'admin'), courseController.updateCourse);

// Delete a course
router.delete('/:id',authMiddleware, roleCheckMiddleware('admin'), courseController.deleteCourse);

module.exports = router;