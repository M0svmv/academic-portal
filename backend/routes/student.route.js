const express = require('express');
const router = express.Router();
const studentAuthController = require('../controllers/student/studentAuth.controller');
const studentController = require('../controllers/staff/programCoordinator/student.controller');

const authMiddleware = require('../middlewares/auth.middleware');
const roleCheckMiddleware = require('../middlewares/role.middleware');
const checkDuplicate = require('../middlewares/checkDuplicate');
const Student = require('../models/Student');

// Student login
router.post('/login', studentAuthController.studentLogin);


// Create a new student
router.post('/',authMiddleware, roleCheckMiddleware('admin'), studentController.createStudent);



// Create a list of students
router.post('/list', authMiddleware, roleCheckMiddleware('admin'), studentController.createStudents);

// Get all students
router.get('/', authMiddleware, roleCheckMiddleware('coordinator','admin'), studentController.getAllStudents);

// Get all students data
router.get('/data', authMiddleware, roleCheckMiddleware('coordinator','admin'), studentController.getAllStudentsData);

// Get students without transcript
router.get('/without-transcript', authMiddleware, roleCheckMiddleware('coordinator','admin'), studentController.getStudentsWithoutTranscript);

// Get a student  by ID
router.get('/:id',authMiddleware, roleCheckMiddleware('coordinator','admin'), studentController.getStudentById);

//get student details by id
router.get('/:id/details', authMiddleware, roleCheckMiddleware('coordinator','admin'), studentController.getStudentDetailsById);

// Update a student
router.put('/:id', authMiddleware, roleCheckMiddleware('admin'), studentController.updateStudent);

// Delete a student
router.delete('/:id', authMiddleware, roleCheckMiddleware('admin'), studentController.deleteStudent);

module.exports = router;