const express = require('express');
const router = express.Router();

const advisorController = require('../controllers/staff/programCoordinator/advising.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleCheckMiddleware = require('../middlewares/role.middleware');

// create advising list

router.post('/list',authMiddleware,roleCheckMiddleware('admin','coordinator'), advisorController.createAdvisingList);

// assign advisor to advising list

router.post('/assign',authMiddleware,roleCheckMiddleware('admin','coordinator'), advisorController.assignAdvisorToAdvisingList);

//assign student to advising list

router.post('/assign-student', authMiddleware, roleCheckMiddleware('admin','coordinator'), advisorController.assignStudentToAdvisingList);

// assign students to advising list

router.post('/assign-students',authMiddleware,roleCheckMiddleware('admin','coordinator'), advisorController.assignStudentsToAdvisingList);

// Get all advisors
router.get('/', authMiddleware, roleCheckMiddleware('admin', 'coordinator'), advisorController.getAllAdvisors);

// Get all non-advisors
router.get('/non-advisors',authMiddleware,roleCheckMiddleware('admin','coordinator'), advisorController.getAllNonAdvisors);

// Get an advisor by ID
router.get('/:id', authMiddleware, roleCheckMiddleware('admin'), advisorController.getAdvisorById);

// Create a new advisor
router.post('/advisor',authMiddleware,roleCheckMiddleware('admin','coordinator'), advisorController.createAdvisor);


// Get advising list by ID
router.get('/:id/advising-lists',authMiddleware,roleCheckMiddleware('admin','coordinator'), advisorController.getAdvisingList);

// Get advising list for an advisor
router.get('/:id/advisors/advising-lists',authMiddleware,roleCheckMiddleware('admin','coordinator'), advisorController.getAdvisingListForAdvisor);

// Get all advising lists
router.get('/advising-lists/all',authMiddleware,roleCheckMiddleware('admin','coordinator'), advisorController.getAllAdvisingLists);

// remove student from advising list
router.post('/remove-student',authMiddleware,roleCheckMiddleware('admin','coordinator'), advisorController.removeStudentFromAdvisingList);

// get students aren't assigned to any advising list
router.get('/advising-lists/unassigned-students',authMiddleware,roleCheckMiddleware('admin','coordinator'), advisorController.getUnassignedStudents);

module.exports = router;