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

// Get courses assigned to TA
exports.getTACourses = async (req, res) => {
  try {
    const semester = await Semester.findOne({ isCurrent: true });
    const TA = await Staff.findById(req.user._id).select("-password");
    
    if (!TA) {
      return res.status(404).json({ message: "TA not found" });
    }
    const courses = await CourseOffering.find({ taId: TA._id, semesterId: semester._id }).populate(
      "courseId",
    );

    res.status(200).json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get course details for TA's course
exports.getCourseDetails = async (req, res) => {
  try {
    const course = await CourseOffering.findById(req.params.id).populate(
      "courseId",
    );
    if (course.taId !== req.user._id) {
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

// assign labs dates
exports.assignLabsDates = async (req, res) => {
  try {
    const { labDate } = req.body;
    const course = await CourseOffering.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: "Course offering not found" });
    }
    course.labDates.push(labDate);
    course.labNum = course.labDates.length;
    await course.save();
    res.status(200).json({ message: "Lab dates assigned successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// delete lab date
exports.deleteLabDate = async (req, res) => {
  try {
    const { labDate } = req.body;
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
    if (course.taId !== req.user._id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // ✅ حول التاريخ
    const targetDate = new Date(labDate);

    // بداية اليوم
    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0, 0, 0, 0);

    // نهاية اليوم
    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    // 🔍 دور على index
    const index = course.labDates.findIndex((d) => {
      const date = new Date(d);
      return date >= startOfDay && date <= endOfDay;
    });

    if (index === -1) {
      return res.status(404).json({ message: "Lab date not found" });
    }

    // ✅ حذف من الكورس
    course.labDates.splice(index, 1);
    course.labNum = course.labDates.length;
    await course.save();

    const courseId = course.courseId;

    // ✅ هات الطلبة
    const semesterWorks = await SemesterWork.find({
      courseId,
      semesterId: semester._id,
    });

    // 🔥 حذف attendance من نفس index
    for (let work of semesterWorks) {
      if (work.labTimes.length > index) {
        work.labTimes.splice(index, 1);

        // إعادة حساب الدرجة
        const labNum = course.labNum || 1;
        work.grade.labGrade = Math.ceil(
          (work.labTimes.reduce((a, b) => a + b, 0) / labNum) *
            course.gradingSchema.lab,
        );

        await work.save();
      }
    }

    res.status(200).json({
      message: "Lab and attendance deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// take lab attendance
exports.takeLabAttendance = async (req, res) => {
  try {
    const { labDate, students } = req.body; // الحاضرين
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
    if (course.taId !== req.user._id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // ✅ إضافة المحاضرة
    course.labDates.push(labDate);
    course.labNum = course.labDates.length;
    course.save();

    const labIndex = course.labDates.length - 1;
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
      let attendance = student.labTimes || [];

      // ✅ كمل النواقص بصفر لحد المحاضرة الحالية
      while (attendance.length < labIndex) {
        attendance.push(0);
      }

      // ✅ حاضر ولا غايب
      const isPresent = presentStudents.includes(student.studentId.toString());

      // ✅ حط القيمة في index الصح
      attendance[labIndex] = isPresent ? 1 : 0;

      student.labTimes = attendance;

      // ✅ حساب الدرجة
      const labNum = course.labNum || 1;
      student.grade.labGrade = Math.ceil(
        (attendance.reduce((a, b) => a + b, 0) / labNum) *
          course.gradingSchema.lab,
      );

      await student.save();
    }

    // ✅ حفظ الكورس بعد إضافة المحاضرة
    await course.save();

    res.status(200).json({
      message: "Lab attendance taken successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// get lab attendance
exports.getLabAttendance = async (req, res) => {
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

    if (course.taId !== req.user._id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const courseId = course.courseId;

    const labDates = course.labDates;

    const allCourseStudents = await SemesterWork.find({
      courseId,
      semesterId: semester._id,
    })
      .select("studentId labTimes")
      .populate("studentId", "studentName");

    const attendanceData = allCourseStudents.map((s) => ({
      studentId: s.studentId._id,
      studentName: s.studentId.studentName,
      labTimes: s.labTimes,
    }));

    if (attendanceData.length > 0) {
      res.status(200).json({ labDates, attendanceData });
    } else {
      res.status(404).json({ message: "No attendance data found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// update student lab attendance (for corrections)
exports.updateStudentAttendance = async (req, res) => {
  try {
    const { courseOfferingId, studentId } = req.params;
    const { labIndex, status } = req.body;

    // ✅ current semester
    const semester = await Semester.findOne({ isCurrent: true });

    // ✅ get course
    const course = await CourseOffering.findById(courseOfferingId);
    if (!course) {
      return res.status(404).json({ message: "Course offering not found" });
    }

    // 🔒 Authorization
    if (course.taId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const courseId = course.courseId;

    // ❗ Validation
    if (![0, 1].includes(status)) {
      return res.status(400).json({ message: "Status must be 0 or 1" });
    }

    if (typeof labIndex !== "number" || labIndex < 0) {
      return res.status(400).json({ message: "Invalid lab index" });
    }

    // ✅ get student record
    const studentRecord = await SemesterWork.findOne({
      courseId,
      semesterId: semester._id,
      studentId,
    });

    if (!studentRecord) {
      return res
        .status(404)
        .json({ message: "Student not found in this course" });
    }

    // ❗ check index range
    if (labIndex >= studentRecord.labTimes.length) {
      return res.status(400).json({ message: "Invalid lab index" });
    }

    // ✅ update attendance
    studentRecord.labTimes[labIndex] = status;

    // ✅ recalculate grade
    const labNum = course.labNum || 1;

    studentRecord.grade.labGrade = Math.ceil(
      (studentRecord.labTimes.reduce((a, b) => a + b, 0) / labNum) *
        course.gradingSchema.lab,
    );

    // ✅ optional: update total grade
    studentRecord.grade.totalGrade =
      studentRecord.grade.finalGrade +
      studentRecord.grade.midTermGrade +
      studentRecord.grade.attendanceGrade +
      studentRecord.grade.labGrade +
      studentRecord.grade.practicalGrade +
      studentRecord.grade.bonusGrade;

    // ✅ save
    await studentRecord.save();

    res.status(200).json({
      message: "Lab attendance updated successfully",
      labTimes: studentRecord.labTimes,
      labGrade: studentRecord.grade.labGrade,
      totalGrade: studentRecord.grade.totalGrade,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//grade students
exports.gradeStudents = async (req, res) => {
  try {
    const { grades } = req.body;

    const semester = await Semester.findOne({ isCurrent: true });
    const semesterId = semester._id;

    const course = await CourseOffering.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (course.taId !== req.user._id) {
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

exports.getMyCoursesSchedule = async (req, res) => {
  try {
    const ta = await Staff.findById(req.user._id).select("-password");
    const semester = await Semester.findOne({ isCurrent: true });
    if (!ta) {
      return res.status(404).json({ message: "TA not found" });
    }
    const courses = await CourseOffering.find({
      taId: ta._id,
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

exports.makeAnnouncement = async (req, res) => {
  try {
    const courseOfferingId = req.params.id;
    const {
      title,
      content,
      type,
      target = "course",
      expiresAt,
      targetIds = [],
    } = req.body;

    if (!title || !content || !courseOfferingId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const course = await CourseOffering.findById(courseOfferingId);

    if (!course) {
      return res.status(404).json({ message: "Course offering not found" });
    }

    // 🔒 authorization
    if (req.user._id !== course.taId) {
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
      type,
      courseId: courseOfferingId,
      expiresAt,
      targetIds,
    });

    res.status(201).json({
      message: "Announcement sent successfully",
      data: created,
    });
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

    // 🔒 لازم يكون نفس الـ TA اللي أنشأ الإعلان
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

exports.getCourseAnnouncements = async (req, res) => {
  try {
    const courseOfferingId = req.params.id;
    const currentSemester = await Semester.findOne({ isCurrent: true });
    const announcements = await Announcement.find({
      semesterId: currentSemester._id,
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
