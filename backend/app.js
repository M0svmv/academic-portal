const express = require('express');
const app = express();
const corsMiddleware = require('./middlewares/cors.middleware');


// Middlewares
app.use(corsMiddleware);
app.use(express.json());


// Routes
app.use('/api/student', require('./routes/studentProfile.route'));

app.use('/api/students', require('./routes/student.route'));

app.use('/api/courses', require('./routes/course.route'));

app.use('/api/staff', require('./routes/staff.route'));

app.use('/api/transcripts', require('./routes/transcript.route'));

app.use('/api/semesters', require('./routes/semester.route'));

app.use('/api/course-offerings', require('./routes/courseOffering.route'));

app.use('/api/enrollments', require('./routes/enrollment.route'));

app.use('/api/advisors', require('./routes/advising.route'));

app.use('/api/semester-work', require('./routes/semesterWork.route'));

app.use('/api/academic-advisors', require('./routes/academicAdvisor.route'));

app.use('/api/lecturers', require('./routes/lecturer.route'));

app.use('/api/announcements', require('./routes/announcement.route'));

app.use('/api/tas', require('./routes/ta.route'));

app.use('/api/schedule', require('./routes/schedule.route'));

app.use('/api/academic-requests', require('./routes/academicRequests.route'));

app.use('/api/control', require('./routes/controlMember.route'));



module.exports = app;