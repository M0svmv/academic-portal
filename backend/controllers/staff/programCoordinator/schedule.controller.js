const CourseOffering = require("../../../models/courseOffering");
const Course = require("../../../models/Course");
const Semester = require("../../../models/Semester");
const Enrollment = require("../../../models/Enrollment");
const SemesterWork = require("../../../models/SemesterWork");
const Announcement = require("../../../models/announcement");
const Schedule = require("../../../models/Schedule");
const Student = require("../../../models/Student");

//set schedule time schema
exports.setScheduleTimeSchema = async (req, res) => {
  try {
    const { periodsTime } = req.body;

    // هات أول schedule موجود
    let schedule = await Schedule.findOne();

    if (!schedule) {
      // أول مرة → create
      schedule = new Schedule({ periodsTime });
      await schedule.save();

      return res.status(201).json({
        message: "Schedule created successfully",
        schedule,
      });
    }

    // موجود → update
    schedule.periodsTime = periodsTime;
    await schedule.save();

    res.status(200).json({
      message: "Schedule updated successfully",
      schedule,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateSinglePeriod = async (req, res) => {
  try {
    const { index, startTime, endTime } = req.body;

    const schedule = await Schedule.findOne();
    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    // check index
    if (index < 0 || index >= schedule.periodsTime.length) {
      return res.status(400).json({ message: "Invalid period index" });
    }

    // update specific period
    if (startTime) schedule.periodsTime[index].startTime = startTime;
    if (endTime) schedule.periodsTime[index].endTime = endTime;

    await schedule.save();

    res.status(200).json({
      message: "Period updated successfully",
      period: schedule.periodsTime[index],
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getSchedule = async (req, res) => {
  try {
    const currentSemester = await Semester.findOne({ isCurrent: true });
    if (!currentSemester) {
      return res.status(404).json({ message: "Current semester not found" });
    }
    const courseOfferings = await CourseOffering.find({
      semesterId: currentSemester._id,
      status: { $in: ["open", "proposed"] },
    })
      .populate("courseId")
      .populate("instructorId", "staffName")
      .select("courseId schedule instructorId enrolledCount");
    const schedule = await Schedule.find();
    res.status(200).json({ schedule, courseOfferings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//set course schedules
exports.setCourseSchedules = async (req, res) => {
  try {
    const { courseOfferingId } = req.params;
    const { days, lecLength, lecPeriod } = req.body;

    const currentSemester = await Semester.findOne({ isCurrent: true });

    // ✅ الكورس الحالي
    const course =
      await CourseOffering.findById(courseOfferingId).populate("courseId");
    if (!course) {
      return res.status(404).json({ message: "Course offering not found" });
    }

    // ✅ كل الكورسات اللي في نفس الوقت
    const courseOfferings = await CourseOffering.find({
      semesterId: currentSemester._id,
      "schedule.lecPeriod": lecPeriod,
      "schedule.days": { $in: days },
    }).populate("courseId", "courseName");

    // ✅ طلبة الكورس الحالي
    const courseStudents = await SemesterWork.find({
      courseId: course.courseId,
      semesterId: currentSemester._id,
    }).select("studentId");

    let conflictCourses = [];

    // 🔥 check conflicts
    for (let offering of courseOfferings) {
      if (offering._id.toString() === courseOfferingId) continue;

      const semesterWorks = await SemesterWork.find({
        courseId: offering.courseId._id,
        semesterId: currentSemester._id,
      })
        .select("studentId")
        .populate("studentId", "studentName");

      let conflictStudents = semesterWorks.filter((sw) =>
        courseStudents.some(
          (cs) => cs.studentId.toString() === sw.studentId._id.toString(),
        ),
      );

      if (conflictStudents.length > 0) {
        conflictCourses.push({
          courseName: offering.courseId.courseName,
          conflictNumber: conflictStudents.length,
          conflictStudents,
        });
      }
    }

    // ❌ لو فيه conflicts
    if (conflictCourses.length > 0) {
      return res.status(400).json({
        message: "Schedule conflict detected",
        conflictCourses,
      });
    }

    // ✅ update
    const updatedCourse = await CourseOffering.findByIdAndUpdate(
      courseOfferingId,
      { schedule: { days, lecLength, lecPeriod } },
      { new: true },
    );

    res.status(200).json({
      message: "Course schedules set successfully",
      data: updatedCourse,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// delete course schedules
exports.deleteCourseSchedules = async (req, res) => {
  try {
    const { courseOfferingId } = req.params;

    const course = await CourseOffering.findById(courseOfferingId);
    if (!course) {
      return res.status(404).json({ message: "Course offering not found" });
    }

    const updatedCourse = await CourseOffering.findByIdAndUpdate(
      courseOfferingId,
      { schedule: {} },
      { new: true },
    );

    res.status(200).json({
      message: "Course schedules deleted successfully",
      data: updatedCourse,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// announce course schedules
exports.announceCourseSchedules = async (req, res) => {
  try {
    const currentSemester = await Semester.findOne({ isCurrent: true });

    if (!currentSemester) {
      return res.status(404).json({ message: "Current semester not found" });
    }

    // ✅ update flag
    currentSemester.settings.announceSchedule = true;
    await currentSemester.save();

    // ✅ create announcement
    const announcement = new Announcement({
      staffId: req.user._id, // 🔥 مهم
      title: `📅 تم إعلان جداول المقررات - ${currentSemester._id}`,
      content: `
تم الآن نشر جداول المقررات للفصل الدراسي ${currentSemester._id}.

📌 يُرجى مراجعة جدولك الدراسي بعناية.
⚠️ في حال وجود أي تعارض، يُرجى التواصل مع المرشد الأكاديمي في أقرب وقت.

`,
      type: "event",
      target: "all",
      semesterId: currentSemester._id,
      isPinned: true,
      sendNotification: true,
    });

    await announcement.save();

    res.status(200).json({
      message: "Course schedules announced successfully",
      announcement,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.showStudentSchedule = async (req, res) => {
  try {
    const studentId = req.params.id;

    const student = await Student.findById(studentId).select(
      "studentName studentId",
    );
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const semester = await Semester.findOne({ isCurrent: true });
    if (!semester) {
      return res.status(404).json({ message: "No current semester" });
    }

    // خليه findOne بدل find
    const enrollment = await Enrollment.findOne({
      semesterId: semester._id,
      studentId,
    });

    if (!enrollment) {
      return res.status(404).json({ message: "Enrollment not found" });
    }

    const courses = enrollment.courses.map((c) => c.courseOfferingId);

    const offerings = await CourseOffering.find({
      _id: { $in: courses },
    })
      .populate("courseId", "courseName")
      .select("courseId schedule");

    // schedule واحد بس
    const schedule = await Schedule.findOne();

    res.status(200).json({
      student,
      schedule,
      offerings,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
