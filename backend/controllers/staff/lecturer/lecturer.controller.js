const Staff = require("../../../models/Staff");
const Student = require("../../../models/Student");
const Transcript = require("../../../models/Transcript");
const CourseOffering = require("../../../models/courseOffering");
const Course = require("../../../models/Course");
const Semester = require("../../../models/Semester");
const SemesterWork = require("../../../models/SemesterWork");
const Announcement = require("../../../models/announcement");
const Schedule = require("../../../models/Schedule");
const { all } = require("../../../routes/lecturer.route");
const { Cursor } = require("mongoose");

//get lecturer courses
exports.getLecturerCourses = async (req, res) => {
  try {
    const lecturer = await Staff.findById(req.user._id).select("-password");
    if (!lecturer) {
      return res.status(404).json({ message: "Lecturer not found" });
    }
    const courses = await CourseOffering.find({
      instructorId: lecturer._id,
    }).populate("courseId");

    res.status(200).json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//get course details
exports.getCourseDetails = async (req, res) => {
  try {
    const course = await CourseOffering.findById(req.params.id).populate(
      "courseId",
    );
    if (course.instructorId !== req.user._id) {
      return res.status(403).json({ message: "Not authorized" });
    }
    const semester = await Semester.findOne({ isCurrent: true });
    const SemesterWorks = await SemesterWork.find({
      courseId: course.courseId,
      semesterId: semester._id,
    })
      .populate("studentId", "studentName")
      .select("studentId grade");

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    res.status(200).json({ course, SemesterWorks });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//grading student
exports.gradeStudents = async (req, res) => {
  try {
    const { grades } = req.body;

    const semester = await Semester.findOne({ isCurrent: true });
    const semesterId = semester._id;

    const course = await CourseOffering.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (course.instructorId !== req.user._id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const courseId = course.courseId;

    const bulkOps = [];
    const errors = [];

    for (let g of grades) {
      const updateFields = {};

      // ✅ validations + build update object
      if (g.midTermGrade !== undefined) {
        if (g.midTermGrade > course.gradingSchema.midTerm) {
          errors.push({ studentId: g.studentId, error: "Midterm exceeds max" });
          continue;
        }
        updateFields["grade.midTermGrade"] = g.midTermGrade;
      }

      if (g.attendanceGrade !== undefined) {
        if (g.attendanceGrade > course.gradingSchema.attendance) {
          errors.push({
            studentId: g.studentId,
            error: "Attendance exceeds max",
          });
          continue;
        }
        updateFields["grade.attendanceGrade"] = g.attendanceGrade;
      }

      if (g.labGrade !== undefined) {
        if (g.labGrade > course.gradingSchema.lab) {
          errors.push({ studentId: g.studentId, error: "Lab exceeds max" });
          continue;
        }
        updateFields["grade.labGrade"] = g.labGrade;
      }

      if (g.practicalGrade !== undefined) {
        if (g.practicalGrade > course.gradingSchema.practical) {
          errors.push({
            studentId: g.studentId,
            error: "Practical exceeds max",
          });
          continue;
        }
        updateFields["grade.practicalGrade"] = g.practicalGrade;
      }

      if (g.bonusGrade !== undefined) {
        if (g.bonusGrade > course.gradingSchema.bonus) {
          errors.push({ studentId: g.studentId, error: "Bonus exceeds max" });
          continue;
        }
        updateFields["grade.bonusGrade"] = g.bonusGrade;
      }

      if (Object.keys(updateFields).length === 0) continue;

      // ✅ add bulk operation
      bulkOps.push({
        updateOne: {
          filter: {
            studentId: g.studentId,
            courseId,
            semesterId,
          },
          update: {
            $set: updateFields,
          },
        },
      });
    }

    // ✅ execute bulk
    if (bulkOps.length > 0) {
      await SemesterWork.bulkWrite(bulkOps);
    }

    // ✅ نحسب التوتال بعد كده
    const updatedWorks = await SemesterWork.find({
      courseId,
      semesterId,
    });

    for (let work of updatedWorks) {
      await work.calculateTotalGrade();
    }

    res.status(200).json({
      message: "Grades processed",
      successCount: bulkOps.length,
      errors,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//assign grading schema
exports.assignGradingSchema = async (req, res) => {
  try {
    const { midTerm, attendance, lab, practical, bonus } = req.body;

    const semester = await Semester.findOne({ isCurrent: true });

    const course = await CourseOffering.findById(req.params.id);

    if (!course || course.semesterId !== semester._id) {
      return res.status(404).json({ message: "Course offering not found" });
    }

    // ✅ update only if provided
    if (midTerm !== undefined) course.gradingSchema.midTerm = midTerm;
    if (attendance !== undefined) course.gradingSchema.attendance = attendance;
    if (lab !== undefined) course.gradingSchema.lab = lab;
    if (practical !== undefined) course.gradingSchema.practical = practical;
    if (bonus !== undefined) course.gradingSchema.bonus = bonus;

    // ✅ validation (المجموع)
    const total =
      (course.gradingSchema.midTerm || 0) +
      (course.gradingSchema.attendance || 0) +
      (course.gradingSchema.lab || 0) +
      (course.gradingSchema.practical || 0) ;

    if (total > 50) {
      return res.status(400).json({
        message: "Total grading exceeds 50",
      });
    }

    await course.save();

    res.status(200).json({
      message: "Grading schema updated successfully",
      gradingSchema: course.gradingSchema,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// assign lectures number
exports.assignLecturesNumber = async (req, res) => {
  try {
    const { lecNum } = req.body;
    const course = await CourseOffering.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: "Course offering not found" });
    }
    course.lecNum = lecNum;
    await course.save();
    res.status(200).json({ message: "Lecture number assigned successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// assign labs number
exports.assignLabsNumber = async (req, res) => {
  try {
    const { labNum } = req.body;
    const course = await CourseOffering.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: "Course offering not found" });
    }
    course.labNum = labNum;
    await course.save();
    res.status(200).json({ message: "Lab number assigned successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// assign lectures dates
exports.assignLectureDates = async (req, res) => {
  try {
    const { lecDate } = req.body;
    const course = await CourseOffering.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: "Course offering not found" });
    }
    course.lecDates.push(lecDate);
    course.lecNum = course.lecDates.length;
    await course.save();
    res.status(200).json({ message: "Lecture dates assigned successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// delete lecture date
exports.deleteLectureDate = async (req, res) => {
  try {
    const { lecDate } = req.body;
    const courseOfferingId = req.params.id;

    const semester = await Semester.findOne({ isCurrent: true });

    const course = await CourseOffering.findOne({
      _id: courseOfferingId,
      semesterId: semester._id,
    });

    if (!course) {
      return res.status(404).json({ message: "Course offering not found" });
    }

    // 🔒 Authorization
    if (course.instructorId !== req.user._id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // ✅ حول التاريخ
    const targetDate = new Date(lecDate);

    // بداية اليوم
    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0, 0, 0, 0);

    // نهاية اليوم
    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    // 🔍 دور على index
    const index = course.lecDates.findIndex((d) => {
      const date = new Date(d);
      return date >= startOfDay && date <= endOfDay;
    });

    if (index === -1) {
      return res.status(404).json({ message: "Lecture date not found" });
    }

    // ✅ حذف من الكورس
    course.lecDates.splice(index, 1);
    course.lecNum = course.lecDates.length;
    await course.save();

    const courseId = course.courseId;

    // ✅ هات الطلبة
    const semesterWorks = await SemesterWork.find({
      courseId,
      semesterId: semester._id,
    });

    // 🔥 حذف attendance من نفس index
    for (let work of semesterWorks) {
      if (work.attendanceTimes.length > index) {
        work.attendanceTimes.splice(index, 1);

        // إعادة حساب الدرجة
        const lecNum = course.lecNum || 1;
        work.attendanceGrade =
          (work.attendanceTimes.reduce((a, b) => a + b, 0) / lecNum) *
          course.gradingSchema.attendance;

        await work.save();
      }
    }

    res.status(200).json({
      message: "Lecture and attendance deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// take lecture attendance
exports.takeLectureAttendance = async (req, res) => {
  try {
    const { lecDate, students } = req.body; // الحاضرين
    const courseOfferingId = req.params.id;

    const semester = await Semester.findOne({ isCurrent: true });

    const course = await CourseOffering.findOne({
      _id: courseOfferingId,
      semesterId: semester._id,
    });
    if (!course) {
      return res.status(404).json({ message: "Course offering not found" });
    }

    // 🔒 Authorization
    if (course.instructorId !== req.user._id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // ✅ إضافة المحاضرة
    course.lecDates.push(lecDate);
    course.lecNum = course.lecDates.length;
    course.save();

    const lecIndex = course.lecDates.length - 1;
    const courseId = course.courseId;

    // ✅ كل الطلبة في الكورس
    const allCourseStudents = await SemesterWork.find({
      courseId,
      semesterId: semester._id,
    });

    // ✅ الحاضرين
    const presentStudents = students.map(String);

    // 🔥 تعديل attendance لكل الطلبة
    for (let student of allCourseStudents) {
      let attendance = student.attendanceTimes || [];

      // ✅ كمل النواقص بصفر لحد المحاضرة الحالية
      while (attendance.length < lecIndex) {
        attendance.push(0);
      }

      // ✅ حاضر ولا غايب
      const isPresent = presentStudents.includes(student.studentId.toString());

      // ✅ حط القيمة في index الصح
      attendance[lecIndex] = isPresent ? 1 : 0;

      student.attendanceTimes = attendance;

      // ✅ حساب الدرجة
      const lecNum = course.lecNum;
      student.grade.attendanceGrade = Math.ceil(
        (attendance.reduce((a, b) => a + b, 0) / lecNum) *
          course.gradingSchema.attendance,
      );

      await student.save();
    }

    // ✅ حفظ الكورس بعد إضافة المحاضرة
    await course.save();

    res.status(200).json({
      message: "Lecture attendance taken successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// get lecture attendance
exports.getLectureAttendance = async (req, res) => {
  try {
    const courseOfferingId = req.params.id;

    const semester = await Semester.findOne({ isCurrent: true });

    const course = await CourseOffering.findOne({
      _id: courseOfferingId,
      semesterId: semester._id,
    });
    if (!course) {
      return res.status(404).json({ message: "Course offering not found" });
    }

    if (course.instructorId !== req.user._id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const courseId = course.courseId;

    const lecDates = course.lecDates;

    const allCourseStudents = await SemesterWork.find({
      courseId,
      semesterId: semester._id,
    })
      .select("studentId attendanceTimes")
      .populate("studentId", "studentName");

    const attendanceData = allCourseStudents.map((s) => ({
      studentId: s.studentId._id,
      studentName: s.studentId.studentName,
      attendanceTimes: s.attendanceTimes,
    }));

    if (attendanceData.length > 0) {
      res.status(200).json({ lecDates, attendanceData });
    } else {
      res.status(404).json({ message: "No attendance data found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// update student attendance (for corrections)
exports.updateStudentAttendance = async (req, res) => {
  try {
    const { courseOfferingId, studentId } = req.params;
    const { lectureIndex, status } = req.body;

    const semester = await Semester.findOne({ isCurrent: true });

    const course = await CourseOffering.findById(courseOfferingId);
    if (!course) {
      return res.status(404).json({ message: "Course offering not found" });
    }

    // 🔒 Authorization
    if (course.instructorId !== req.user._id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const courseId = course.courseId;

    // ❗ Validation
    if (![0, 1].includes(status)) {
      return res.status(400).json({ message: "Status must be 0 or 1" });
    }

    // 🔍 optional check (لو عايز تتأكد إن index مظبوط)
    const studentRecord = await SemesterWork.findOne({
      courseId,
      semesterId: semester._id,
      studentId,
    }).select("attendanceTimes");

    if (!studentRecord) {
      return res
        .status(404)
        .json({ message: "Student not found in this course" });
    }

    if (
      lectureIndex < 0 ||
      lectureIndex >= studentRecord.attendanceTimes.length
    ) {
      return res.status(400).json({ message: "Invalid lecture index" });
    }

    // 🚀 التحديث المباشر
    await SemesterWork.updateOne(
      { courseId, semesterId: semester._id, studentId },
      {
        $set: {
          [`attendanceTimes.${lectureIndex}`]: status,
        },
      },
    );

    res.status(200).json({
      message: "Attendance updated successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// get my courses schedule
exports.getMyCoursesSchedule = async (req, res) => {
  try {
    const lecturer = await Staff.findById(req.user._id).select("-password");
    const semester = await Semester.findOne({ isCurrent: true });
    if (!lecturer) {
      return res.status(404).json({ message: "Lecturer not found" });
    }
    const courses = await CourseOffering.find({
      instructorId: lecturer._id,
      semesterId: semester._id,
    })
      .populate("courseId")
      .select("courseId schedule");
    const schedule = await Schedule.find();
    res.status(200).json({ schedule, courses });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//make announcement
exports.makeAnnouncement = async (req, res) => {
  try {
    const courseOfferingId = req.params.id;
    const {
      title,
      content,
      type,
      target = "course",
      targetIds = [],
      expiresAt,
    } = req.body;

    if (!title || !content || !courseOfferingId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const course = await CourseOffering.findById(courseOfferingId);

    if (!course) {
      return res.status(404).json({ message: "Course offering not found" });
    }

    // 🔒 authorization
    if (req.user._id !== course.instructorId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // 📅 semester check
    const currentSemester = await Semester.findOne({ isCurrent: true });

    if (!currentSemester) {
      return res.status(400).json({
        message: "Course is not in the current semester",
      });
    }

    const created = await Announcement.create({
      staffId: req.user._id,
      semesterId: currentSemester._id,
      target: target,
      title,
      content,
      targetIds,
      type,
      courseId: courseOfferingId,
      expiresAt,
    });

    res.status(201).json({
      message: "Announcement sent successfully",
      data: created,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getCourseAnnouncements = async (req, res) => {
  try {
    const courseOfferingId = req.params.id;
    const currentSemester = await Semester.findOne({ isCurrent: true });
    const announcements = await Announcement.find({
      semesterId: currentSemester._id,
      staffId: req.user._id,
      target: { $in: ["course", "specificStudents"] },
      courseId: courseOfferingId,
    })
      .populate("staffId", "staffName")
      .populate("targetIds", "studentName");
    res.status(200).json(announcements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMyAnnouncements = async (req, res) => {
  try {
    const currentSemester = await Semester.findOne({ isCurrent: true });
    const announcements = await Announcement.find({
      staffId: req.user._id,
      semesterId: currentSemester._id,
      target: { $in: ["course", "specificStudents"] },
    })
      .populate("courseId", "courseName")
      .populate("semesterId", "name");
    res.status(200).json(announcements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateAnnouncement = async (req, res) => {
  try {
    const announcementId = req.params.id;
    const { title, content, type, expiresAt } = req.body;

    const announcement = await Announcement.findById(announcementId);

    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    // 🔒 authorization (لازم يكون هو اللي أنشأه)
    if (announcement.staffId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // ✏️ update fields (partial update)
    if (title) announcement.title = title;
    if (content) announcement.content = content;
    if (type) announcement.type = type;
    if (expiresAt) {
      if (new Date(expiresAt) <= new Date()) {
        return res
          .status(400)
          .json({ message: "Expiration must be in the future" });
      }
      announcement.expiresAt = expiresAt;
    }

    await announcement.save();

    res.status(200).json({
      message: "Announcement updated successfully",
      data: announcement,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteAnnouncement = async (req, res) => {
  try {
    const announcementId = req.params.id;

    const announcement = await Announcement.findById(announcementId);

    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    // 🔒 authorization
    if (announcement.staffId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await announcement.deleteOne();

    res.status(200).json({
      message: "Announcement deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

