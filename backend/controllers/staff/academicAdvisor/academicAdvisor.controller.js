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
    let currentSemester = await Semester.findOne({ status:"active"});

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


        const transcript = await Transcript.findOne({ studentId: req.params.id }).populate('studentId', 'studentName studentId studentEmail studentPhone').populate('completedCourses.courseId');

        const semesterWorks = await SemesterWork.find({
            studentId: req.params.id,
            semesterId: semester._id
        }).populate("courseId", "courseName").select("courseId grade");

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

    // 🔐 Check advisor authorization
    const advisingList = await AdvisingList.findOne({
      advisor: req.user._id,
      "students.student": studentId
    });

    if (!advisingList) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // 📌 Current semester
    const currentSemester = await Semester.findOne({ isCurrent: true });
    if (!currentSemester) {
      return res.status(404).json({ message: "Current semester not found" });
    }

    const semesterId = currentSemester._id;

    // 📌 Transcript
    const transcript = await Transcript.findOne({ studentId });
    if (!transcript) {
      return res.status(404).json({ message: "Transcript not found" });
    }

    // ✅ IMPORTANT: only passed courses
    const completedCourses = transcript.completedCourses
      .filter(c => c.status === "passed")
      .map(c => c.courseId.toString());

    // 🎯 Allowed credits logic
    if (transcript.GPA === 0 && transcript.completedCourses.length === 0) {
      transcript.allowedCredits = 18;
    } else if (transcript.GPA < 2.0) {
      transcript.allowedCredits = 12;
    } else if (transcript.GPA >= 3.0) {
      transcript.allowedCredits = 21;
    }

    // 📚 Get offerings
    const offerings = await CourseOffering.find({
      semesterId,
      status: { $in: ["open", "proposed"] }
    }).populate(
      "courseId",
      "courseName _id courseCredits courseLevel prerequisiteCourses courseType"
    );

    // ❌ Remove completed courses
    let availableOfferings = offerings.filter(
      offer => offer.courseId && !completedCourses.includes(offer.courseId._id.toString())
    );

    // ✅ Prerequisite check
    availableOfferings = availableOfferings.filter(offer => {
      const prerequisitesMet = offer.courseId.prerequisiteCourses.every(prereq =>
        completedCourses.includes(prereq.toString())
      );
      return prerequisitesMet;
    });

    // 🔥 Optional (very useful): sort by level (same as student first)
    availableOfferings.sort((a, b) => {
      if (a.courseId.courseLevel === transcript.level) return -1;
      if (b.courseId.courseLevel === transcript.level) return 1;
      return 0;
    });

    res.status(200).json({
      allowedCredits: transcript.allowedCredits,
      count: availableOfferings.length,
      availableOfferings
    });

  } catch (error) {
    console.error(error);
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

// exports.getCurrentEnrollment = async (req, res) => {
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
    const { courses } = req.body;

    const advisingList = await AdvisingList.findOne({
            advisor: req.user._id,
            "students.student": req.params.id
        });

        if (!advisingList) {
            return res.status(403).json({ message: "Not authorized" });
        }

    const currentSemester = await Semester.findOne({ isCurrent: true });
    const semesterId = currentSemester._id;

    // check student
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }
    const transcript = await Transcript.findOne({ studentId });

    if (transcript.GPA === 0 && transcript.completedCourses.length === 0) {
      student.allowedCredits = 18;
    } else if (transcript.GPA < 2.0) {
      student.allowedCredits = 12;
    } else if (transcript.GPA >= 3.0) {
      student.allowedCredits = 21;
    }

    const offeringIds = courses.map(c => c.courseOfferingId);

    const offerings = await CourseOffering.find({
      _id: { $in: offeringIds },
      semesterId,
      status: { $in: ["open", "proposed"] }
    }).populate("courseId", "courseCredits");

    if (offerings.length !== offeringIds.length) {
      return res.status(400).json({
        error: "One or more courses are not available"
      });
    }

    console.log(offerings);
    

    const currentCredits = offerings.reduce(
      (total, offer) => total + offer.courseId.courseCredits,
      0
    );

    console.log(currentCredits);

    if (currentCredits > student.allowedCredits) {
      return res.status(400).json({
        message: `Credit limit exceeded. Allowed: ${student.allowedCredits}, Attempted: ${currentCredits}`
      });
    }

    // get current enrollment
    let enrollment = await Enrollment.findOne({ studentId, semesterId });
    

    let oldCourses = [];
    if (enrollment) {
      oldCourses = enrollment.courses.map(c => c.courseOfferingId.toString());
    }

    const newCourses = courses.map(c => c.courseOfferingId.toString());

const preRequiredCourses = await CourseOffering.find({
  _id: { $in: newCourses }
}).populate(
   "courseId"
  
);
const requiredCourses = preRequiredCourses.map(course => course.courseId.prerequisiteCourses).flat();
const completedCourses = transcript.completedCourses
  .filter(course => course.status !== "failed")
  .map(course => course.courseId);
    
    console.log("requiredCourses =>",completedCourses);
    // إزالة التكرار
const uniqueRequiredCourses = requiredCourses.filter((course, index, self) =>
  index === self.findIndex(c => c.toString() === course.toString())
);

// تحويل completed لـ string للمقارنة
const completedIds = completedCourses.map(c => c.toString());

// check missing
const missingCourses = uniqueRequiredCourses.filter(
  req => !completedIds.includes(req.toString())
);

if (missingCourses.length > 0) {
  return res.status(400).json({
    error: "You must complete prerequisites first",
    missingCourses
  });
}

    const addedCourses = newCourses.filter(id => !oldCourses.includes(id));
    const removedCourses = oldCourses.filter(id => !newCourses.includes(id));

    // 🔥 update counters
    await CourseOffering.updateMany(
      { _id: { $in: addedCourses } },
      { $inc: { enrolledCount: 1 } }
    );

    await CourseOffering.updateMany(
      { _id: { $in: removedCourses } },
      { $inc: { enrolledCount: -1 } }
    );

    console.log("addedCourses =>",addedCourses);
    console.log("removedCourses =>",removedCourses);

    // Map offerings by ID for fast lookup
const offeringMap = {};
offerings.forEach(o => {
  offeringMap[o._id.toString()] = o;
});

// Insert new courses
if (addedCourses.length > 0) {
  await SemesterWork.insertMany(
    addedCourses.map(offerId => {
      const offer = offeringMap[offerId];
      if (!offer || !offer.courseId) {
        throw new Error(`Invalid offering or missing courseId for ${offerId}`);
      }
      return {
        _id: studentId + '-' + offerId, // اختياري
        studentId,
        semesterId,
        courseId: offer.courseId._id // لازم
      };
    })
  );
}

// Delete removed courses
if (removedCourses.length > 0) {
  await SemesterWork.deleteMany({
    _id: { $in: removedCourses.map(c => studentId + '-' + c) }
  });
}

    

    // save enrollment
    if (!enrollment) {
      enrollment = new Enrollment({ studentId, semesterId, courses,currentEnrolledCredits: currentCredits, allowedCredits: student.allowedCredits, status: "approved" });
    } else {
      enrollment.courses = courses;
      enrollment.currentEnrolledCredits = currentCredits;
      enrollment.allowedCredits = student.allowedCredits;
      enrollment.status = "approved";
    }

    await enrollment.save();

    res.status(200).json({
      addedCourses,
      removedCourses,
      message: "Enrollment updated successfully",
      totalCredits: currentCredits,
      allowedCredits: student.allowedCredits,
      enrollment
    });
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






