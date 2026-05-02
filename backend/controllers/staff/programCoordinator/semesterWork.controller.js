const SemesterWork = require("../../../models/SemesterWork");
const Semester = require("../../../models/Semester");
const CourseOffering = require("../../../models/CourseOffering");
// Create a new semester work
exports.createSemesterWork = async (req, res) => {
  try {
    const { studentId, semesterId, courseId, grade } = req.body;

    const semesterWork = new SemesterWork({
      studentId,
      semesterId,
      courseId,
      grade,
    });

    await semesterWork.save();

    res.status(201).json(semesterWork);
  } catch (error) {
    res.status(500).json({ error: "Failed to create semester work" });
  }
};

//update Semester work in a course
exports.updateSemesterWork = async (req, res) => {
  try {
    const { id } = req.params;
    

    const semesterWork = await SemesterWork.findByIdAndUpdate(
      id,
      { ...req.body },
      { new: true },
    );

    if (!semesterWork) {
      return res.status(404).json({ error: "Semester work not found" });
    }

    res.status(200).json(semesterWork);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update semester work" });
  }
};

//show course students list
exports.showCourseStudents = async (req, res) => {
  try {
    const { courseId } = req.params;
    const semester = await Semester.findOne({ isCurrent: true });

    const semesterWorks = await SemesterWork.find({
  courseId,
  semesterId: semester._id
})
  .select("studentId grade")
  .populate({
    path: "studentId",
    select: "studentName studentId studentEmail studentPhone",
    populate: {
      path: "transcript",
      select: "GPA level regulation"
    }
  });

    res.status(200).json(semesterWorks);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve course students" });
  }
};



//update grade in a course
exports.updateGradeInCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { grade } = req.body;

    const semesterWork = await SemesterWork.findByIdAndUpdate(
      id,
      { grade },
      { new: true },
    );

    if (!semesterWork) {
      return res.status(404).json({ error: "Semester work not found" });
    }

    res.status(200).json(semesterWork);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update grade in course" });
  }
};


//delete course work
exports.deleteSemesterWork = async (req, res) => {
  try {
    const { id } = req.params;
    const semesterWork = await SemesterWork.findByIdAndDelete(id);
    if (!semesterWork) {
      return res.status(404).json({ error: "Semester work not found" });
    }
    res.status(200).json({ message: "Semester work deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete semester work" });
  }
};



exports.assignCourseFinalGrades = async (req, res) => {
  try {
      const { grades } = req.body;

      
  
      const semester = await Semester.findOne({ isCurrent: true });
      
      const semesterId = semester._id;

      const currentDate = new Date();

      if (semester.timeLine.finalExams.start > currentDate ) {
        return res.status(400).json({ message: "Final exams are not in progress" });
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
            errors.push({ studentId: g.studentId, error: "Final grade exceeds max" });
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

