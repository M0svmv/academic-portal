const Enrollment = require('../../../models/Enrollment');
const CourseOffering = require('../../../models/courseOffering');
const Student = require('../../../models/Student');
const Semester = require('../../../models/Semester');
const Transcript = require('../../../models/Transcript');
const SemesterWork = require('../../../models/SemesterWork');


const EnrollmentService = require('../../../services/enrollment.service');


//get student available courses
exports.getStudentAvailableCourses = async (req, res) => {
  try {
    const studentId = req.params.id;

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

    // ✅ IMPORTANT: only passed courses (زي التاني)
    const completedCourses = transcript.completedCourses
      .filter(c => c.status === "passed")
      .map(c => c.courseId.toString());

    // 🎯 Allowed credits (زي التاني)
    if (transcript.GPA === 0 && transcript.completedCourses.length === 0) {
      transcript.allowedCredits = 18;
    } else if (transcript.GPA < 2.0) {
      transcript.allowedCredits = 12;
    } else if (transcript.GPA >= 3.0) {
      transcript.allowedCredits = 21;
    }

    // 📚 Offerings (زودنا courseType زي التاني)
    const offerings = await CourseOffering.find({
      semesterId,
      status: { $in: ["open", "proposed"] }
    }).populate(
      "courseId",
      "courseName _id courseCredits courseLevel prerequisiteCourses courseType"
    );

    // ❌ remove completed courses
    let availableOfferings = offerings.filter(
      offer =>
        offer.courseId &&
        !completedCourses.includes(offer.courseId._id.toString())
    );

    // ✅ prerequisites check
    availableOfferings = availableOfferings.filter(offer =>
      offer.courseId.prerequisiteCourses.every(prereq =>
        completedCourses.includes(prereq.toString())
      )
    );

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
  

// Enroll a student in course offerings
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


// Get all enrollments for a student
exports.getEnrollmentsByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const currentSemester = await Semester.findOne({ isCurrent: true });

    const enrollments = await Enrollment.find({ studentId, semesterId: currentSemester._id });

    res.status(200).json(...enrollments);

  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve enrollments' });
  }
};


// Get all enrollments for a semester
exports.getEnrollmentsBySemester = async (req, res) => {
  try {
    const { semesterId } = req.params;

    const enrollments = await Enrollment.find({ semesterId });

    res.status(200).json(enrollments);

  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve enrollments' });
  }
};


// Drop course offering
exports.dropCourseOffering = async (req, res) => {
  try {
    const { studentId, semesterId, courseOfferingId } = req.body;

    const enrollment = await Enrollment.findOneAndUpdate(
      { studentId, semesterId },
      { $pull: { courses: { courseOfferingId } } },
      { new: true }
    );

    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    res.status(200).json(enrollment);

  } catch (error) {
    res.status(500).json({ error: 'Failed to drop course offering' });
  }
};


// Get courses for a student in a semester
exports.getCoursesByStudentAndSemester = async (req, res) => {
  try {
    const { studentId, semesterId } = req.params;

    const enrollment = await Enrollment.findOne({
      studentId,
      semesterId
    });

    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    res.status(200).json(enrollment.courses);

  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve courses' });
  }
};


// Get students in a course offering
exports.getStudentsByCourseOffering = async (req, res) => {
  try {
    const { courseOfferingId } = req.params;

    const enrollments = await Enrollment.find({
      'courses.courseOfferingId': courseOfferingId
    }).select('studentId').populate('studentId', 'studentName');

    res.status(200).json(enrollments);

  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve students' });
  }
};


// Update all courses for student in semester
exports.updateCoursesForStudent = async (req, res) => {
  try {
    const { studentId, semesterId, courses } = req.body;

    // Check student
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const courseIds = courses.map(c => c.courseOfferingId);

    const offerings = await CourseOffering.find({ _id: { $in: courseIds } });

    if (offerings.length !== courseIds.length) {
      return res.status(404).json({ error: 'One or more course offerings not found' });
    }

    const enrollment = await Enrollment.findOneAndUpdate(
      { studentId, semesterId },
      { $set: { courses } },
      { new: true }
    );

    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    res.status(200).json(enrollment);

  } catch (error) {
    res.status(500).json({ error: 'Failed to update courses' });
  }
};


// Add single course offering
exports.addCourseOfferingForStudent = async (req, res) => {
  try {
    const { studentId, semesterId, courseOfferingId } = req.body;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const courseOffering = await CourseOffering.findById(courseOfferingId);
    if (!courseOffering) {
      return res.status(404).json({ error: 'Course offering not found' });
    }

    const enrollment = await Enrollment.findOneAndUpdate(
      { studentId, semesterId },
      { $addToSet: { courses: { courseOfferingId } } },
      { new: true }
    );

    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    res.status(200).json(enrollment);

  } catch (error) {
    res.status(500).json({ error: 'Failed to add course offering' });
  }
};


//add list of students enrollments in a semester
exports.addEnrollmentsForSemester = async (req, res) => {
  try {
    const { semesterId, enrollments } = req.body;

    const semester = await Semester.findById(semesterId);
    if (!semester) {
      return res.status(404).json({ error: 'Semester not found' });
    }

    const newEnrollments = await Enrollment.insertMany(enrollments);

    res.status(200).json(newEnrollments);

  } catch (error) {
    res.status(500).json({ error: 'Failed to add enrollments' });
  }
};

exports.createEnrollmentsForSemester = async (semesterId) => {
  try {
    const students = await Student.find({}, "_id");
    const transcripts = await Transcript.find();

    // map سريع
    const transcriptMap = {};
    transcripts.forEach((t) => {
      transcriptMap[t.studentId] = t;
    });

    const enrollments = students.map((student) => {
      const transcript = transcriptMap[student._id];

      let allowedCredits = 18;

      if (transcript) {
        if (transcript.GPA === 0 && transcript.completedCourses.length === 0) {
          allowedCredits = 18;
        } else if (transcript.GPA < 2.0) {
          allowedCredits = 12;
        } else if (transcript.GPA >= 3.0) {
          allowedCredits = 21;
        }
      }

      return {
        studentId: student._id,
        semesterId,
        courses: [],
        status: "not_registered", 
        allowedCredits,
        currentEnrolledCredits: 0,
      };
    });

    // 🔥 منع التكرار
    await Enrollment.insertMany(enrollments, { ordered: false });

    console.log("Enrollments created successfully");
  } catch (error) {
    console.error("Error creating enrollments:", error.message);
  }
};
