const Student = require("../../models/Student");
const Transcript = require("../../models/Transcript");
const Enrollment = require("../../models/Enrollment");
const Semester = require("../../models/Semester");
const Course = require("../../models/Course");
const CourseOffering = require("../../models/courseOffering");
const bcrypt = require("bcryptjs");
const SemesterWork = require("../../models/SemesterWork");
const AdvisingList = require("../../models/AdvisingList");
const Announcement = require("../../models/announcement");
const Meeting = require("../../models/Meeting");
const Schedule = require("../../models/Schedule");
const AcademicRequest = require("../../models/AcademicRequest");




const EnrollmentService = require("../../services/enrollment.service");
const recommendationService = require("../../services/recommendations.service");
const studentService = require("../../services/student.service");
const transcriptService = require("../../services/transcript.service");
const MeetingService = require("../../services/meeting.service");
const AnnouncementService = require("../../services/announcement.service");
const ScheduleService = require("../../services/schedule.service");
const AcademicRequestService = require("../../services/academicRequests.service");

const {getSemesterPreRegValidation} = require("../../utils/enrollment.utils");




//student Dashboard


// Enroll in courses for the current semester
exports.enrollStudent = async (req, res) => {
  try {

    getSemesterPreRegValidation();
    const result = await EnrollmentService.enrollStudent(req.user._id, req.body);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Get course recommendations for the student
exports.getRecommendations = async (req, res) => {
  try {
    const studentId = req.user._id;

    const recommendations = await recommendationService.getRecommendations(studentId);

    res.status(200).json({
      count: recommendations.length,
      recommendations
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get my student profile
exports.getStudentProfile = async (req, res) => {
  try {
    const student = await studentService.getStudent(req.user._id);
    res.status(200).json(student);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// Update student profile
exports.updateStudentProfile = async (req, res) => {
  try {
    await studentService.updateProfile(req.user._id, req.body);
    res.status(200).json({ message: "Student profile updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};
// Get student transcript
exports.getStudentTranscript = async (req, res) => {
  try {  
    const transcript = await transcriptService.getTranscript(req.user._id);
    res.status(200).json(transcript);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// Get all enrollments for the student
exports.getStudentEnrollments = async (req, res) => {
  try {
    const studentId = req.user._id;
    const enrollments = await Enrollment.find({ studentId })
      .populate("semesterId", "semesterName")
      .populate("courses.courseOfferingId", "courseName");
    res.status(200).json(enrollments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};
// Get current enrollment for the student
exports.getCurrentEnrollment = async (req, res) => {
  try {
    const currentEnrollment = await EnrollmentService.getStudentCurrentEnrollment(req.user._id);
    res.status(200).json(currentEnrollment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};


//get available courses
exports.getAvailableCourses = async (req, res) => {
  try {
    const data = await EnrollmentService.getAvailableCourses(req.user._id);

    res.status(200).json(data);
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message,
    });
  }
};


// get student all details
exports.getStudentDetails = async (req, res) => {
  try {
    const studentDetails = await studentService.getStudentDetails(req.user._id)

    res.status(200).json({
      semester: studentDetails.semester,
      transcript: studentDetails.transcript,
      advisor: studentDetails.advisor,
      semesterWorks: studentDetails.semesterWorks,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

//request Meeting
exports.requestMeeting = async (req, res) => {
  try {
    await MeetingService.requestMeeting(req.user._id, req.body);
    res.status(200).json({ message: "Meeting request sent successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//get meetings
exports.getMyMeetings = async (req, res) => {
  try {
    const currentSemester = await Semester.findOne({ isCurrent: true });
    const meetings = await Meeting.find({ studentId: req.user._id,semesterId: currentSemester._id }).populate("advisorId", "staffName");
    
    res.status(200).json(meetings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


//get announcements
exports.getAnnouncements = async (req, res) => {
  try {
   const announcements = await AnnouncementService.getAnnouncements(req.user._id);
   

    res.status(200).json(announcements);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//get department announcements
exports.getDepartmentAnnouncements = async (req, res) => {
  try {
    const currentSemester = await Semester.findOne({ isCurrent: true });
    const announcements = await Announcement.find({ target:"all", semesterId: currentSemester._id }).populate("staffId", "staffName");
    res.status(200).json(announcements.sort((a, b) => b.createdAt - a.createdAt));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// get advising list announcements
exports.getAdvisingListAnnouncements = async (req, res) => {
  try {
    const advisingList = await AdvisingList.findOne({ "students.student": req.user._id });
    const currentSemester = await Semester.findOne({ isCurrent: true });
    let announcements = [];
    if (advisingList){
      announcements = await Announcement.find({ advisingListId: advisingList._id, target:"advisingList", semesterId: currentSemester._id }).populate("staffId", "staffName");
    }
    res.status(200).json(announcements.sort((a, b) => b.createdAt - a.createdAt));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// get all courses
exports.getAllCourses = async (req, res) => {
  try {
    const studentId = req.user._id;

    const [transcript] = await Promise.all([
      Transcript.findOne({ studentId })
    ])
    courses = await Course.find({ courseRegulation: transcript.regulation })
    res.status(200).json({ courses, transcript });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


//get courses schedule
exports.getCoursesSchedule = async (req, res) => {
  try {
    const { schedule, offerings } = await ScheduleService.getCoursesSchedule();

    res.status(200).json({ schedule, offerings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMySchedule = async (req, res) => {
  try {
    const { schedule, offerings } = await ScheduleService.getMySchedule(req.user._id);
    res.status(200).json({  schedule, offerings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.getMyAcademicRequests = async (req, res) => {
  try {
    const Requests = await AcademicRequestService.getMyAcademicRequests(req.user._id);
      
      
    res.status(200).json({ Requests });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}


exports.makeWithdrawRequest = async (req, res) => {
  try {
    const {message, data} = await AcademicRequestService.makeWithdrawRequest(req.user._id, req.body);

    res.status(201).json({
      message,
      data
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.makeAddDropRequest = async (req, res) => {
  try {
    const studentId = req.user._id;

    const currentSemester = await Semester.findOne({ isCurrent: true });

    const advisorDoc = await AdvisingList.findOne({
      "students.student": studentId,
    }).select("advisor -_id");

    const { addedCourses = [], droppedCourses = [], studentSuggestion } = req.body;

    if (addedCourses.length === 0 && droppedCourses.length === 0) {
      return res.status(400).json({ message: "No courses provided" });
    }

    const newRequest = await AcademicRequest.create({
      studentId,
      academicAdvisorId: advisorDoc.advisor,
      semesterId: currentSemester._id,
      requestType: "Add Drop",
      addedCourses,
      droppedCourses,
      studentSuggestion,
    });

    res.status(201).json({
      message: "Add/Drop request submitted",
      data: newRequest,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.makeImproveGradeRequest = async (req, res) => {
  try {
    const studentId = req.user._id;

    const currentSemester = await Semester.findOne({ isCurrent: true });

    const advisorDoc = await AdvisingList.findOne({
      "students.student": studentId,
    }).select("advisor -_id");

    const { courseId, writtenReason, studentSuggestion } = req.body;

    if (!courseId) {
      return res.status(400).json({ message: "Course is required" });
    }

    const newRequest = await AcademicRequest.create({
      studentId,
      academicAdvisorId: advisorDoc.advisor,
      semesterId: currentSemester._id,
      requestType: "improve Grade",
      courseId,
      writtenReason,
      studentSuggestion,
    });

    res.status(201).json({
      message: "Improve grade request submitted",
      data: newRequest,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.makeOverloadRequest = async (req, res) => {
  try {
    const studentId = req.user._id;
    

    const currentSemester = await Semester.findOne({ isCurrent: true });

    const advisorDoc = await AdvisingList.findOne({
      "students.student": studentId,
    }).select("advisor -_id");

    const { addedCourses, writtenReason, studentSuggestion } = req.body;

    if (!addedCourses || addedCourses.length === 0) {
      return res.status(400).json({ message: "Courses required for overload" });
    }

    const newRequest = await AcademicRequest.create({
      studentId,
      academicAdvisorId: advisorDoc.advisor,
      semesterId: currentSemester._id,
      requestType: "Overload",
      addedCourses,
      writtenReason,
      studentSuggestion,
    });

    res.status(201).json({
      message: "Overload request submitted",
      data: newRequest,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.deleteRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    const request = await AcademicRequest.findOneAndDelete({ _id: requestId, studentId: req.user._id });
    if (!request) {
      return res.status(404).json({ message: "Request not found or not authorized" });
    }
    res.status(200).json({ message: "Request deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
    
 
