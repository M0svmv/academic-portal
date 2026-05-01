const express = require('express');
const router = express.Router();
const courseOfferingController = require('../controllers/staff/programCoordinator/courseOffering.controller');
const checkDuplicate = require('../middlewares/checkDuplicate');
const CourseOffering = require('../models/courseOffering');
const authMiddleware = require('../middlewares/auth.middleware');
const roleCheckMiddleware = require('../middlewares/role.middleware');

// Create a new course offering
router.post('/',authMiddleware, roleCheckMiddleware('coordinator'), courseOfferingController.createCourseOffering);

// Create a list of course offerings
router.post('/list',authMiddleware, roleCheckMiddleware('coordinator'), courseOfferingController.createCourseOfferings);

// Get all course offerings
router.get('/',authMiddleware, roleCheckMiddleware('coordinator', 'admin'), courseOfferingController.getAllCourseOfferings);

// Get a course offering by ID
router.get('/:id',authMiddleware, roleCheckMiddleware('coordinator', 'admin'), courseOfferingController.getCourseOfferingById);

// Update a course offering
router.put('/:id',authMiddleware, roleCheckMiddleware('coordinator'), courseOfferingController.updateCourseOffering);

//update course offering status
router.put('/:id/status',authMiddleware, roleCheckMiddleware('coordinator'), courseOfferingController.updateCourseOfferingStatus);

// Delete a course offering
router.delete('/:id',authMiddleware, roleCheckMiddleware('coordinator'), courseOfferingController.deleteCourseOffering);

// assign course instructor
router.post('/:courseOfferingId/assign-instructor',authMiddleware, roleCheckMiddleware('coordinator', 'admin'), courseOfferingController.assignInstructor);

// assign course TA
router.post('/:courseOfferingId/assign-ta',authMiddleware, roleCheckMiddleware('coordinator', 'admin'), courseOfferingController.assignTa);


module.exports = router;