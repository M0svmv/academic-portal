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




const enrollmentService = require("../../services/enrollment.service");
const recommendationService = require("../../services/recommendations.service");
const studentService = require("../../services/student.service");
const transcriptService = require("../../services/transcript.service");
const {getSemesterPreRegValidation} = require("../../utils/enrollment.utils");




//student Dashboard


// Enroll in courses for the current semester
exports.enrollStudent = async (req, res) => {
  try {

    getSemesterPreRegValidation();
    const result = await enrollmentService.enrollStudent(req.user._id, req.body);
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
    const studentId = req.user._id;
    const student = await Student.findById(studentId).select("-password");
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    res.status(200).json(student);
  } catch (error) {
    console.error(error);
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
    console.error(error);
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
    const currentEnrollment = await enrollmentService.getStudentCurrentEnrollment(req.user._id);
    res.status(200).json(currentEnrollment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};


//get available courses
exports.getAvailableCourses = async (req, res) => {
  try {
    const data = await enrollmentService.getAvailableCourses(req.user._id);

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
    let semester = await Semester.findOne({ isCurrent: true });

    if (!semester) {
      semester = await Semester.findOne().sort({ endDate: -1 });
    }

    const transcript = await Transcript.findOne({
      studentId: req.user._id,
    })
      .populate("studentId", "studentName studentPhone studentEmail username")
      .populate("completedCourses.courseId");

    if (!transcript) {
      return res.status(404).json({ message: "Transcript not found" });
    }

    const semesterWorks = await SemesterWork.find({
      studentId: req.user._id,
      semesterId: semester._id,
    })
      .populate("courseId", "courseName")
      .select("courseId grade");

    let advisor = await AdvisingList.findOne({
      "students.student": req.user._id,
    })
      .populate("advisor", "staffName email phone")
      .select("advisor -_id");

    advisor = advisor ? advisor.advisor : null;

    res.status(200).json({
      semester,
      transcript,
      advisor,
      semesterWorks,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

//request Meeting
exports.requestMeeting = async (req, res) => {
  try {
    const advisor = await AdvisingList.findOne({
      "students.student": req.user._id,
    }).select("advisor -_id");

    const currentSemester = await Semester.findOne({ isCurrent: true });

    if (!advisor || !currentSemester) {
      return res
        .status(404)
        .json({ message: "Advisor or current semester not found" });
    }
    const meeting = new Meeting({
     
      advisorId: advisor.advisor,
      studentId: req.user._id,
      semesterId: currentSemester._id,
      meetingDate: req.body.meetingDate,
      meetingTime: req.body.meetingTime,
      meetingNotes: req.body.meetingNotes || "",
    });
    await meeting.save();
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
    const studentId = req.user._id;

    const advisingList = await AdvisingList.findOne({
      "students.student": studentId
    });

    const currentSemester = await Semester.findOne({ isCurrent: true });
    if (!currentSemester) {
      return res.status(404).json({ message: "Current semester not found" });
    }

    const now = new Date();

    // 🎓 هات الكورسات
    const enrollment = await Enrollment.findOne({
      semesterId: currentSemester._id,
      studentId,semesterId: currentSemester._id
    });

    const courseIds = enrollment
      ? enrollment.courses.map(c => c.courseOfferingId)
      : [];

    console.log("enrolled courseIds =>", courseIds);

    // 🎯 level (مفروض موجود في اليوزر)
    const studentLevel = req.user.level;

    const announcements = await Announcement.find({
  $and: [
    {
      $or: [
        { target: "all" },

        ...(advisingList
          ? [{
              target: "advisingList",
              advisingListId: advisingList._id
            }]
          : []),

        {
          target: "specificStudents",
          targetIds: { $in: [studentId] } // ⚠️ خليها array
        },

        ...(courseIds.length > 0 ? [{
              target: "course",
              courseId: { $in: [...courseIds] }
            }]
          : []),

        ...(studentLevel
          ? [{
              target: "level",
              level: studentLevel
            }]
          : [])
      ]
    },

    // ✅ expiration fix
    {
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gt: now } }
      ]
    }
  ]
})
.populate("staffId", "staffName")
.populate({path:"courseId", select:"courseId", populate: {path: "courseId", select: "courseName"}})
.sort({ updatedAt: -1 });

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
    const transcript = await Transcript.findOne({ studentId });
    
    const courses = await Course.find({courseRegulation: transcript.regulation});
    res.status(200).json({ courses, transcript });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


//get courses schedule
exports.getCoursesSchedule = async (req, res) => {
  try {
    const currentSemester = await Semester.findOne({ isCurrent: true });
    if (!currentSemester || !currentSemester.settings.announceSchedule) {
      return res.status(404).json({ message: "لم يتم نشر جدول المقررات للفصل الدراسي الحالي حتى الآن، يرجى المحاولة لاحقًا" });
    }
    const offerings = await CourseOffering.find({ semesterId: currentSemester._id ,status: { $in: ['open','proposed'] } , "schedule.days.0": { $exists: true }})
      .populate("courseId", "courseName").populate("instructorId", "staffName")
      .select("courseId schedule instructorId");
    if (offerings.length === 0) {
      return res.status(404).json({ message: "No course schedules available for the current semester" });
    };

    const schedule = await Schedule.find();

    res.status(200).json({ schedule, offerings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMySchedule = async (req, res) => {
  try {
    const currentSemester = await Semester.findOne({ isCurrent: true });
    if (!currentSemester || !currentSemester.settings.announceSchedule) {
      return res.status(404).json({ message: "لم يتم نشر جدول المقررات للفصل الدراسي الحالي حتى الآن، يرجى المحاولة لاحقًا" });
    }
    const studentId = req.user._id;
    const semesterWorks = await SemesterWork.find({ studentId, semesterId: currentSemester._id }).select("courseId");
    const enrolledCourseIds = semesterWorks.map(sw => sw.courseId);
    const offerings = await CourseOffering.find({ semesterId: currentSemester._id, courseId: { $in: enrolledCourseIds } })
      .populate("courseId", "courseName")
      .populate("instructorId", "staffName")
      .select("courseId schedule instructorId");
    const schedule = await Schedule.find();
    res.status(200).json({  schedule, offerings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.getMyAcademicRequests = async (req, res) => {
  try {
    const studentId = req.user._id;
    const currentSemester = await Semester.findOne({ isCurrent: true });
    const Requests = await AcademicRequest.find({ studentId, semesterId: currentSemester._id })
      .populate("academicAdvisorId", "staffName")
      .populate("courseId", "courseName")
      .populate("addedCourses", "courseName")
      .populate("droppedCourses", "courseName")
      
      
    res.status(200).json({ Requests });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}


exports.makeWithdrawRequest = async (req, res) => {
  try {
    const studentId = req.user._id;

    const currentSemester = await Semester.findOne({ isCurrent: true });
    if (!currentSemester) {
      return res.status(404).json({ message: "Current semester not found" });
    }

    const advisorDoc = await AdvisingList.findOne({
      "students.student": studentId,
    }).select("advisor -_id");

    if (!advisorDoc) {
      return res.status(404).json({ message: "Advising list not found" });
    }

    const {
      withdrawalReason,
      writtenReason="",
      studentSuggestion="",
      courseId,
    } = req.body;

    if (!courseId || !withdrawalReason) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const newRequest = await AcademicRequest.create({
      studentId,
      academicAdvisorId: advisorDoc.advisor,
      semesterId: currentSemester._id,
      requestType: "Withdrawal",
      courseId,
      withdrawalReason,
      writtenReason,
      studentSuggestion,
    });

    res.status(201).json({
      message: "Withdrawal request submitted successfully",
      data: newRequest,
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
    
 
