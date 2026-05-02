const express = require('express');
const router = express.Router();
const semesterWorkController = require('../controllers/staff/programCoordinator/semesterWork.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleCheckMiddleware = require('../middlewares/role.middleware');



// Create a new semester work
router.post('/', semesterWorkController.createSemesterWork);

//update Semester work in a course
router.put('/course/:courseId', semesterWorkController.updateSemesterWork);

// show course students list
router.get('/course/:courseId', semesterWorkController.showCourseStudents);

//update grade in a course
router.put('/:id', semesterWorkController.updateGradeInCourse);

//delete course work
router.delete('/:id', semesterWorkController.deleteSemesterWork);

//assign final grades for a course
router.put('/assignFinalGrades/:id',authMiddleware, roleCheckMiddleware('coordinator', 'admin', 'control-member'), semesterWorkController.assignCourseFinalGrades);

module.exports = router;