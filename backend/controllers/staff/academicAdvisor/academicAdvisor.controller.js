const staff = require('../../../models/Staff');
const AdvisingList = require('../../../models/AdvisingList');
const Student = require('../../../models/Student');
const Transcript = require('../../../models/Transcript');
const SemesterWork = require('../../../models/SemesterWork');
const Semester = require('../../../models/Semester');
const Enrollment = require('../../../models/Enrollment');
const CourseOffering = require('../../../models/courseOffering');
const Meeting = require('../../../models/Meeting');
const Announcement = require('../../../models/announcement');
const Course = require('../../../models/Course');
const Schedule = require('../../../models/Schedule');
const AcademicRequest = require('../../../models/AcademicRequest');


const EnrollmentService = require("../../../services/enrollment.service");
const StudentService = require("../../../services/student.service");
const TranscriptService = require("../../../services/transcript.service");

//get department courses
exports.getDepartmentCourses = async (req, res) => {
  try {
    const staffMember = await staff.findById(req.user._id);
    const courses = await Course.find();
    res.status(200).json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


//get advising list
exports.getAdvisingList = async (req, res) => {
  try {
    let currentSemester = await Semester.findOne().sort({ createdAt: -1 });

    if (!currentSemester) {
      return res.status(404).json({ message: "Current semester not found" });
    }

    const advisingList = await AdvisingList.find({ advisor: req.user._id })
      .populate("advisor", "staffName email")
      .populate({
        path: "students",
        populate: {
          path: "student",
          select: "studentName studentId",
          populate: [
            {
              path: "transcript",
              select: "GPA completedCredits level regulation alerts atRisk"
            },
            {
              path: "enrollment",
              match: { semesterId: currentSemester._id  },
              select: "currentEnrolledCredits allowedCredits"
            }
          ]
        }
      });

    res.status(200).json(advisingList);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
//show student details
exports.showStudentDetails = async (req, res) => {
    try {
        const semester = await Semester.findOne({ isCurrent: true });

        const advisingList = await AdvisingList.findOne({
            advisor: req.user._id,
            "students.student": req.params.id
        });

        if (!advisingList) {
            return res.status(403).json({ message: "Not authorized" });
        }


        const studentDetails = await StudentService.getStudentDetails(req.params.id);

        const { transcript, advisor, semesterWorks } = studentDetails

        res.status(200).json({
            semester,
            transcript,
            semesterWorks
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//show student semester works
exports.showStudentSemesterWorks = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        const semester = await Semester.findOne({ isCurrent: true });
        const semesterWorks = await SemesterWork.find({ semesterId: semester._id,studentId: req.params.id });
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        res.status(200).json(semesterWorks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

//get student available courses for enrollment
exports.getStudentAvailableCourses = async (req, res) => {
  try {
    const studentId = req.params.id;

    // 📌 Current semester
    const data = await EnrollmentService.getAvailableCourses(studentId);
    
        res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve available courses" });
  }
};

//get student current enrollment
exports.getCurrentEnrollment = async (req, res) => {
  try {
    const studentId = req.params.id;

    // ✅ Authorization check
    const advisingList = await AdvisingList.findOne({
      advisor: req.user._id,
      "students.student": studentId
    });

    if (!advisingList) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // ✅ Get current semester
    const currentSemester = await Semester.findOne({ isCurrent: true });

    if (!currentSemester) {
      return res.status(404).json({ message: "Current semester not found" });
    }

    // ✅ Get enrollment
    const enrollment = await Enrollment.findOne({
      studentId,
      semesterId: currentSemester._id
    }).populate({
      path: "courses.courseOfferingId",
      populate: {
        path: "courseId",
        select: "courseName courseCredits"
      }
    });

    if (!enrollment) {
      return res.status(404).json({ message: "Enrollment not found" });
    }

    res.status(200).json(enrollment);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//   try {
//     const studentId = req.params.id;
//     const advisingList = await AdvisingList.findOne({
//       advisor: req.user._id,
//       "students.student": studentId
//     });

//     if (!advisingList) {
//       return res.status(403).json({ message: "Not authorized" });
//     }
//     const currentSemester = await Semester.findOne({ isCurrent: true }).select(
//       "semesterId",
//     );
//     console.log("Current semester:", currentSemester);
//     if (!currentSemester) {
//       return res.status(404).json({ message: "Current semester not found" });
//     }
//     const currentEnrollment = await Enrollment.findOne({
//       studentId,
//       semesterId: currentSemester._id,
//     });
//     if (!currentEnrollment) {
//       return res.status(404).json({ message: "Current enrollment not found" });
//     }
//     res.status(200).json(currentEnrollment);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: error.message });
//   }
// };

//enroll student from advising list
exports.enrollStudent = async (req, res) => {
  try {
    const studentId = req.params.id;
    const result = await EnrollmentService.enrollStudent(studentId, req.body);
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: error.message
    });
  }
}

// update enrollment status
exports.updateEnrollmentStatus = async (req, res) => {
  try {
    const studentId = req.params.id;
    const { status } = req.body;

    const enrollment = await Enrollment.findOne({ studentId });

    if (!enrollment) {
      return res.status(404).json({ message: "Enrollment not found" });
    }

    const oldStatus = enrollment.status;

    enrollment.status = status;
    await enrollment.save();

    const currentSemester = await Semester.findOne({ isCurrent: true });

    

      if (status === "declined") {
        title = "Enrollment Rejected";
        content = "تم رفض تسجيلك، يرجى مراجعة المرشد الأكاديمي.";
      }

      if (status === "approved") {
        title = "Enrollment Approved 🎉";
        content = "تم قبول تسجيلك بنجاح، بالتوفيق في دراستك!";
      }

      // 📢 create announcement only if status is relevant
      if (title) {
        await Announcement.create({
          staffId: req.user._id,
          title,
          content,
          target: "specificStudents",
          targetIds: [studentId],
          semesterId: currentSemester?._id,
          type: status === "approved" ? "event" : "warning",
          sendNotification: true
        });
      }
    

    res.status(200).json({
      message: "Enrollment status updated successfully"
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};


// get my meetings requests

exports.getMeetings = async (req, res) => {
  try {
    const meetings = await Meeting.find({ advisorId: req.user._id }).populate("studentId", "studentName studentPhone studentEmail");
    
    res.status(200).json(meetings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
  
}

//get approved meetings
exports.getApprovedMeetings = async (req, res) => {
  try {
    const meetings = await Meeting.find({ advisorId: req.user._id, meetingStatus: { $in: ["approved", "pending"] } }).populate("studentId", "studentName studentPhone studentEmail");
    res.status(200).json(meetings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
  
}


// respond to meeting request
exports.respondToMeeting = async (req, res) => {
  try {

    const meeting = await Meeting.findOne({_id:req.params.id,advisorId:req.user._id});
    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }
    meeting.meetingStatus = req.body.status; // accepted or rejected
    await meeting.save();
    res.status(200).json({ message: "Meeting status updated successfully", data:meeting });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
  
}


// make an announcement to my students
exports.makeAnnouncement = async (req, res) => {
  try {
    const { title, content, type, expiresAt } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: "Title and content are required" });
    }

    const advisingList = await AdvisingList.findOne({ advisor: req.user._id });
    const currentSemester = await Semester.findOne({ isCurrent: true });

    if (!advisingList || !currentSemester) {
      return res.status(404).json({ message: "Advising list or semester not found" });
    }

    const created = await Announcement.create({
      staffId: req.user._id,
      title,
      content,
      type,
      expiresAt,
      advisingListId: advisingList._id,
      semesterId: currentSemester._id,
      target: "advisingList"
    });

    res.status(201).json({
      message: "Announcement sent successfully",
      data: created
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


//update announcement
exports.updateAnnouncement = async (req, res) => {
  try {
    const { announcementId } = req.params;
    const { title, content, type, expiresAt } = req.body;

    const announcement = await Announcement.findOne({
      _id: announcementId,
      staffId: req.user._id
    });

    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    if (title) announcement.title = title;
    if (content) announcement.content = content;
    if (type) announcement.type = type;
    if (expiresAt) announcement.expiresAt = expiresAt;

    await announcement.save();

    res.status(200).json({
      message: "Announcement updated successfully",
      data: announcement
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


//delete announcement
exports.deleteAnnouncement = async (req, res) => {
  try {
    const { announcementId } = req.params;
    const announcement = await Announcement.findOneAndDelete({ _id: announcementId , staffId: req.user._id });
    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }
    res.status(200).json({ message: "Announcement deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
  
}

//get all announcements
exports.getAnnouncements = async (req, res) => {
  try {
    const advisingList = await AdvisingList.findOne({ advisor: req.user._id });
    const currentSemester = await Semester.findOne({ isCurrent: true });

    if (!currentSemester) {
      return res.status(404).json({ message: "Semester not found" });
    }

    const now = new Date();

    const query = {
      semesterId: currentSemester._id,
      $or: [
        { target: "all" },
        {
          target: "advisingList",
          advisingListId: advisingList?._id
        },{
          staffId: req.user._id,
          target: "specificStudents",}
      ],
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gt: now } }
      ]
    };

    const announcements = await Announcement.find(query)
      .populate("staffId", "staffName")
      .sort({ isPinned: -1, createdAt: -1 });

    res.status(200).json(announcements);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// make an announcement to a specific student
exports.makeAnnouncementToStudent = async (req, res) => {
  try {
    const { title, content, type, expiresAt, studentsIds=[] } = req.body;

    const currentSemester = await Semester.findOne({ isCurrent: true });
    

    if (!title || !content) {
      return res.status(400).json({ message: "Title and content are required" });
    }

    const student = await Student.find({ _id: { $in: studentsIds } });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const created = await Announcement.create({
      staffId: req.user._id,
      title,
      content,
      type,
      expiresAt,
      targetIds: studentsIds,
      target: "specificStudents",
      semesterId: currentSemester._id
    });

    res.status(201).json({
      message: "Announcement sent successfully",
      data: created
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.showStudentSchedule = async (req, res) => {
  try {
    const studentId = req.params.id;

    const student = await Student.findById(studentId).select("studentName studentId");
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // 🔒 Authorization
    const advisingList = await AdvisingList.findOne({
      advisor: req.user._id,
      "students.student": studentId
    });

    if (!advisingList) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // 📅 Current semester
    const semester = await Semester.findOne({ isCurrent: true });
    if (!semester) {
      return res.status(404).json({ message: "No current semester" });
    }

    // 📚 Enrollment (واحد بس)
    const enrollment = await Enrollment.findOne({
      semesterId: semester._id,
      studentId
    });

    if (!enrollment) {
      return res.status(404).json({ message: "Enrollment not found" });
    }

    // 🎓 Course offerings
    const courseIds = enrollment.courses.map(c => c.courseOfferingId);

    const offerings = await CourseOffering.find({
      _id: { $in: courseIds }
    })
      .populate("courseId", "courseName")
      .select("courseId schedule");

    // 🕒 Global schedule
    const schedule = await Schedule.findOne();

    res.status(200).json({
      student,
      schedule,
      offerings
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



exports.getMyStudentRequests = async (req, res) => {
  try {
    const currentSemester = await Semester.findOne({ isCurrent: true });
    const requests = await AcademicRequest.find({
      academicAdvisorId: req.user._id,
      semesterId: currentSemester._id,
    })
      .populate("studentId", "studentName studentId")
      .populate("semesterId", "name")
      .populate("droppedCourses", "courseName courseId")
      .populate("addedCourses", "courseName courseId");
    res.status(200).json({ requests });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateRequestStatus = async (req, res) => {
  try {
    const  requestId  = req.params.id;
    const { status, academicAdvisorComment } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const request = await AcademicRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    request.status = status;
    request.academicAdvisorComment = academicAdvisorComment;

    await request.save();

    res.json({
      message: `Request ${status} successfully`,
      data: request,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};






