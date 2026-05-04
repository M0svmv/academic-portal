const CourseOffering = require("../../../models/CourseOffering");
const Semester = require("../../../models/Semester");
const SemesterWork = require("../../../models/SemesterWork");

exports.assignCourseFinalGrades = async (req, res) => {
  try {
    const { grades } = req.body;

    const semester = await Semester.findOne({ isCurrent: true });

    const semesterId = semester._id;

    const currentDate = new Date();

    if (semester.timeLine.finalExams.start > currentDate) {
      return res
        .status(400)
        .json({ message: "Final exams are not in progress" });
    }

    const course = await CourseOffering.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (course.finalExamGradesStatus === "approved") {
      return res
        .status(400)
        .json({ message: "Final grades have already been approved" });
    }

    const courseId = course.courseId;

    const bulkOps = [];
    const errors = [];

    for (let g of grades) {
      const updateFields = {};

      // ✅ validations + build update object
      if (g.finalGrade !== undefined) {
        if (g.finalGrade > course.gradingSchema.final) {
          errors.push({
            studentId: g.studentId,
            error: "Final grade exceeds max",
          });
          continue;
        }
        updateFields["grade.finalGrade"] = g.finalGrade;
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

exports.getCourseData = async (req, res) => {
  try {
    const course = await CourseOffering.findById(req.params.id);
    const semester = await Semester.findOne({ isCurrent: true });
    const semesrterWork = await SemesterWork.find({
      courseId: course.courseId,
      semesterId: semester._id,
    }).populate("studentId", "studentName");

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    res.status(200).json({ course, semesterWorks: semesrterWork });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllCourses = async (req, res) => {
  try {
    const semester = await Semester.findOne({ isCurrent: true });
    const courses = await CourseOffering.find({
      semesterId: semester._id,
      enrolledCount: { $gt: 0 },
    })
      .populate("courseId", "courseName")
      .populate("instructorId", "staffName")
      .populate("taId", "staffName");
    res.status(200).json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



exports.updateCourseGrades = async (req, res) => {
  try {
    const { grades } = req.body;

    const semester = await Semester.findOne({ isCurrent: true });

    const semesterId = semester._id;

    const currentDate = new Date();

    if (semester.timeLine.finalExams.end < currentDate) {
      return res
        .status(400)
        .json({ message: "correcting grades is not in progress" });
    }

    const course = await CourseOffering.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }


    const courseId = course.courseId;

    const bulkOps = [];
    const errors = [];

    for (let g of grades) {
      const updateFields = {};

      // ✅ validations + build update object
      if (g.finalGrade !== undefined) {
        if (g.finalGrade > course.gradingSchema.final) {
          errors.push({
            studentId: g.studentId,
            error: "Final grade exceeds max",
          });
          continue;
        }
        updateFields["grade.finalGrade"] = g.finalGrade;
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


exports.approveFinalGrades = async (req, res) => {
  try {
    const semester = await Semester.findOne({ isCurrent: true });
    const course = await CourseOffering.findOne({ _id: req.params.id, semesterId: semester._id }).populate('courseId', 'courseName');

    

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    course.finalExamGradesStatus = 'approved';
    await course.save();
    res.status(200).json({ message: `Grades for course \`${course.courseId.courseName}\` for semester \`${semester.semesterName}\` approved` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
