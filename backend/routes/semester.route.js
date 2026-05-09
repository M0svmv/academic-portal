const express = require('express');
const router = express.Router();
const semesterController = require('../controllers/staff/programCoordinator/semester.controller');
const checkDuplicate = require('../middlewares/checkDuplicate');
const Semester = require('../models/Semester');
const authMiddleware = require('../middlewares/auth.middleware');
const roleCheckMiddleware = require('../middlewares/role.middleware');

// Create a new semester
router.post('/',authMiddleware,roleCheckMiddleware('coordinator', 'admin'), semesterController.createSemester);

// Get all semesters
router.get('/',authMiddleware,roleCheckMiddleware('coordinator', 'admin'), semesterController.getAllSemesters);
//get current semester
router.get('/current',authMiddleware,roleCheckMiddleware('coordinator', 'admin', 'control-member', 'lecturer', 'ta',  'academic-advisor', 'student'),  semesterController.getCurrentSemester);

// Get a semester by ID
router.get('/:id',authMiddleware,roleCheckMiddleware('coordinator', 'admin'),  semesterController.getSemesterById);

// Update a semester
router.put('/:id',authMiddleware,roleCheckMiddleware('coordinator', 'admin'),  semesterController.updateSemester);

// Delete a semester
router.delete('/:id',authMiddleware,roleCheckMiddleware('coordinator', 'admin'),  semesterController.deleteSemester);

// Get semester details with course offerings and enrollments
router.get('/:id/details',authMiddleware,roleCheckMiddleware('coordinator', 'admin'),  semesterController.getSemesterData);

//preRegistration timeline
router.put('/:id/preRegistration',authMiddleware,roleCheckMiddleware('coordinator', 'admin'),  semesterController.setPreRegistrationTimeline);

//start preRegistration timeline
router.put('/:id/startPreRegistration',authMiddleware,roleCheckMiddleware('coordinator', 'admin'),  semesterController.startPreRegistrationTimeline);

//addDrop timeline
router.put('/:id/addDrop',authMiddleware,roleCheckMiddleware('coordinator', 'admin'),  semesterController.addDropTimeline);

//grading timeline
router.put('/:id/grading',authMiddleware,roleCheckMiddleware('coordinator', 'admin'),  semesterController.gradingTimeline);

//withdrawal timeline
router.put('/:id/withdrawal',authMiddleware,roleCheckMiddleware('coordinator', 'admin'),  semesterController.withdrawalTimeline);

//finalExams timeline
router.put('/:id/finalExams',authMiddleware,roleCheckMiddleware('coordinator', 'admin'),  semesterController.finalExamsTimeline);

//stop preRegistration timeline
router.put('/:id/stopPreRegistration',authMiddleware,roleCheckMiddleware('coordinator', 'admin'),  semesterController.stopPreRegistrationTimeline);

//force stop current semester
router.put('/:id/forceStop',authMiddleware,roleCheckMiddleware('coordinator', 'admin'),  semesterController.forceStopCurrentSemester);



module.exports = router;