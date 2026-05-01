const express = require('express');
const router = express.Router();
const transcriptController = require('../controllers/staff/programCoordinator/transcript.controller');
const checkDuplicate = require('../middlewares/checkDuplicate');
const Transcript = require('../models/Transcript');
const authMiddleware = require('../middlewares/auth.middleware');
const roleCheckMiddleware = require('../middlewares/role.middleware');

// Create a new transcript
router.post('/', authMiddleware, roleCheckMiddleware('coordinator','admin'), transcriptController.createTranscript);

// Create a list of transcripts
router.post('/list',authMiddleware, roleCheckMiddleware('coordinator','admin'), transcriptController.createTranscripts);

// Get all transcripts
router.get('/',authMiddleware, roleCheckMiddleware('coordinator','admin'), transcriptController.getAllTranscripts);

// Get a transcript by student ID
router.get('/student/:studentId',authMiddleware, roleCheckMiddleware('coordinator','admin'), transcriptController.getTranscriptByStudentId);

// Update a transcript
router.put('/:id',authMiddleware, roleCheckMiddleware('coordinator','admin'), transcriptController.updateTranscript);

// Delete a transcript
router.delete('/:id',authMiddleware, roleCheckMiddleware('admin'), transcriptController.deleteTranscript);

// Update a course grade in a transcript
router.put('/:transcriptId/courses/:courseId',authMiddleware, roleCheckMiddleware('coordinator','admin'), transcriptController.updateCourseGradeInTranscript);

// Add courses to a transcript
router.put('/:transcriptId/courses',authMiddleware, roleCheckMiddleware('coordinator','admin'), transcriptController.addCoursesToTranscript);

module.exports = router;
