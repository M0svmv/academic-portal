const Semester = require('../../../models/Semester');
const CourseOffering = require('../../../models/courseOffering');
const Enrollment = require('../../../models/Enrollment');
const Transcript = require('../../../models/Transcript');
const SemesterWork = require('../../../models/SemesterWork');
const Student = require('../../../models/Student'); // ✅ FIX

const calculateAllowedCredits = (transcript) => {
  if (!transcript || transcript.completedCourses.length === 0) return 18;
  if (transcript.GPA < 2.0) return 12;
  if (transcript.GPA >= 3.0) return 21;
  return 18;
};

const createEnrollmentsForSemester = async (semesterId) => {
  try {
    const students = await Student.find({}, "_id");

    const transcripts = await Transcript.find(
      {},
      "studentId GPA completedCourses"
    );

    // 🔥 normalize map (string keys)
    const transcriptMap = {};
    transcripts.forEach((t) => {
      transcriptMap[t.studentId.toString()] = t;
    });

    const enrollments = students.map((student) => {
      const studentId = student._id.toString();

      const transcript = transcriptMap[studentId];

      const allowedCredits = calculateAllowedCredits(transcript);

      return {
        studentId: student._id,
        semesterId,
        courses: [],
        status: "not_registered",
        allowedCredits,
        currentEnrolledCredits: 0,
      };
    });

    // 🔥 SAFE UPSERT (no duplicates crash)
    await Enrollment.bulkWrite(
      enrollments.map((enrollment) => ({
        updateOne: {
          filter: {
            studentId: enrollment.studentId,
            semesterId: enrollment.semesterId,
          },
          update: { $setOnInsert: enrollment },
          upsert: true,
        },
      }))
    );

    console.log("✅ Enrollments created successfully");
  } catch (error) {
    console.error("❌ Error creating enrollments:", error.message);
  }
};

exports.createEnrollmentsForSemester = createEnrollmentsForSemester;



// Create a new semester
exports.createSemester = async (req, res) => {
  try {


    const existingSemester = await Semester.findOne({ name: req.body.name });
    if (existingSemester) {
      return res.status(400).json({ message: 'Semester already exists' });
    }

    const {
      year,
      term,
      startDate,
      endDate,

    } = req.body;

    


    
    await Semester.updateMany(
      { isCurrent: true },
      { $set: { isCurrent: false } }
    );

    await Semester.updateMany(
      { status: "active" },
      { $set: { status: "completed" } }
    );

    
    const semester = new Semester({
      _id: term+"-"+year,
      name:term+"-"+year,
      startDate,
      endDate,
      isCurrent: true,
      status: "active",
      timeLine:{preRegistration:{
        start: req.body.timeLine.preRegistration.start,
        end: req.body.timeLine.preRegistration.end
       },
      addDrop: {
        start: req.body.timeLine.addDrop.start,
        end: req.body.timeLine.addDrop.end
       },
      finalExams: {
        start: req.body.timeLine.finalExams.start,
        end: req.body.timeLine.finalExams.end
      }},
      settings: {
        allowEnrollment: req.body.settings.allowEnrollment,
        allowWithdrawal: req.body.settings.allowWithdrawal
      }
  
    });

    

    await semester.save();
    await createEnrollmentsForSemester(semester._id);

    res.status(201).json(semester);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all semesters
exports.getAllSemesters = async (req, res) => {
  try {
    const semesters = await Semester.find();
    res.status(200).json(semesters);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a semester by ID
exports.getSemesterById = async (req, res) => {
  try {
    const semester = await Semester.findById(req.params.id);
    if (!semester) {
      return res.status(404).json({ message: 'Semester not found' });
    }
    res.status(200).json(semester);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a semester
exports.updateSemester = async (req, res) => {
  try {
    const semester = await Semester.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!semester) {
      return res.status(404).json({ message: 'Semester not found' });
    }
    res.status(200).json(semester);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a semester
exports.deleteSemester = async (req, res) => {
  try {
    const semester = await Semester.findByIdAndDelete(req.params.id);
    if (!semester) {
      return res.status(404).json({ message: 'Semester not found' });
    }
    res.status(200).json({ message: 'Semester deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


//get all semester data
exports.getSemesterData = async (req, res) => {
  try {
    const semesterId = req.params.id;
    const semester = await Semester.findById(semesterId);
    if (!semester) {
      return res.status(404).json({ message: 'Semester not found' });
    }
    const courseOfferings = await CourseOffering.find({ semesterId });
    const enrollments = await Enrollment.find({ semesterId });
    res.status(200).json({ semester, courseOfferings, enrollments });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//preRegistration timeline
exports.setPreRegistrationTimeline = async (req, res) => {
  try {
    const currentSemester = await Semester.findOne({ isCurrent: true });

    if (!currentSemester) {
      return res.status(404).json({ message: 'Current semester not found' });
    }
    currentSemester.timeLine.preRegistration.start = req.body.start;
    currentSemester.timeLine.preRegistration.end = req.body.end;
    currentSemester.settings.allowEnrollment = true;
    await currentSemester.save();
    res.status(200).json(currentSemester);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//addDrop timeline
exports.addDropTimeline = async (req, res) => {
  try {
    const currentSemester = await Semester.findOne({ isCurrent: true });

    if (!currentSemester) {
      return res.status(404).json({ message: 'Current semester not found' });
    }
    currentSemester.timeLine.addDrop.start = req.body.start;
    currentSemester.timeLine.addDrop.end = req.body.end;
    allowEnrollment = true;
    await currentSemester.save();
    res.status(200).json(currentSemester);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//finalExams timeline
exports.finalExamsTimeline = async (req, res) => {
  try {
    const currentSemester = await Semester.findOne({ isCurrent: true });

    if (!currentSemester) {
      return res.status(404).json({ message: 'Current semester not found' });
    }
    currentSemester.timeLine.finalExams.start = req.body.start;
    currentSemester.timeLine.finalExams.end = req.body.end;
    await currentSemester.save();
    res.status(200).json(currentSemester);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//stop preRegistration timeline
exports.stopPreRegistrationTimeline = async (req, res) => {
  try {
    const currentSemester = await Semester.findOne({ isCurrent: true });

    if (!currentSemester) {
      return res.status(404).json({ message: 'Current semester not found' });
    }
    
    currentSemester.settings.allowEnrollment = false;
    await currentSemester.save();
    res.status(200).json(currentSemester);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//start preRegistration timeline
exports.startPreRegistrationTimeline = async (req, res) => {
  try {
    const currentSemester = await Semester.findOne({ isCurrent: true });

    if (!currentSemester) {
      return res.status(404).json({ message: 'Current semester not found' });
    }
    
    currentSemester.settings.allowEnrollment = true;
    await currentSemester.save();
    res.status(200).json(currentSemester);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


//force stop current semester
exports.forceStopCurrentSemester = async (req, res) => {
  try {
    const currentSemester = await Semester.findOne({ isCurrent: true });

    if (!currentSemester) {
      return res.status(404).json({ message: 'Current semester not found' });
    }

    const semesterWorks = await SemesterWork.find({
      semesterId: currentSemester._id
    });

    // if (!semesterWorks || semesterWorks.length === 0) {
    //   return res.status(400).json({ message: 'No semester works found to transfer' });
    // }

    const bulkOps = [];
    const studentIds = new Set(); // 🔥 نجمع الطلاب

    for (let work of semesterWorks) {
      studentIds.add(work.studentId.toString());

      bulkOps.push({
        updateOne: {
          filter: { studentId: work.studentId },
          update: {
            $push: {
              completedCourses: {
                courseId: work.courseId,
                grade: work.grade.totalGrade,
                semesterId: work.semesterId,
                status: work.grade.totalGrade >= 60 ? "passed" : "failed"
              }
            }
          },
          upsert: true
        }
      });
    }

    // ✅ 1. نفذ كل التحديثات
    if (bulkOps.length > 0) {
      await Transcript.bulkWrite(bulkOps);
    }

    // ✅ 2. احسب GPA بعد ما البيانات اتضافت
    const transcripts = await Transcript.find({
      studentId: { $in: Array.from(studentIds) }
    });

    for (let transcript of transcripts) {
      await transcript.calculateGPA();
    }

    // ✅ 3. اقفل التيرم
    await Semester.updateMany(
      { isCurrent: true },
      {
        $set: {
          isCurrent: false,
          forceEnd: true,
          status: "completed",
          "settings.allowEnrollment": false,   // منع التسجيل
          "settings.allowWithdrawal": false,   // منع الانسحاب
          "settings.announceSchedule": false,
          endDate: new Date()
        }
      }
    );

    res.status(200).json({
      message: 'Semester closed and data transferred successfully'
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



//get current semester
exports.getCurrentSemester = async (req, res) => {
  try {
    const currentSemester = await Semester.findOne({ isCurrent: true });
    if (!currentSemester) {
      return res.status(404).json({ message: 'Current semester not found' });
    }
    res.status(200).json(currentSemester);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
