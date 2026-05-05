const express = require('express');
const router = express.Router();

const scheduleController = require('../controllers/staff/programCoordinator/schedule.controller');
const checkDuplicate = require('../middlewares/checkDuplicate');
const authMiddleware = require('../middlewares/auth.middleware');
const roleCheckMiddleware = require('../middlewares/role.middleware');


// get schedule for a course offering
router.get('/',authMiddleware, roleCheckMiddleware('coordinator', 'admin', 'ta', 'lecturer', 'academic-advisor'), scheduleController.getSchedule);

// announce course schedules
router.post('/announce',authMiddleware, roleCheckMiddleware('coordinator', 'admin'), scheduleController.announceCourseSchedules);

// hide course schedules
router.post('/hideSchedule',authMiddleware, roleCheckMiddleware('coordinator', 'admin'), scheduleController.hideSchedule);

// set schedule time schema
router.post('/set/time',authMiddleware, roleCheckMiddleware('coordinator', 'admin'), scheduleController.setScheduleTimeSchema);


router.put('/set/time/period',authMiddleware, roleCheckMiddleware('coordinator', 'admin'), scheduleController.updateSinglePeriod);



//get student schedule
router.get('/student/:id',authMiddleware, roleCheckMiddleware('coordinator', 'admin'), scheduleController.showStudentSchedule);

// set course offering schedule
router.post('/:courseOfferingId',authMiddleware, roleCheckMiddleware('coordinator', 'admin'), scheduleController.setCourseSchedules);

// delete course offering schedule
router.delete('/:courseOfferingId',authMiddleware, roleCheckMiddleware('coordinator', 'admin'), scheduleController.deleteCourseSchedules);





module.exports = router;