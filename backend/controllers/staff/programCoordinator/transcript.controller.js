const Transcript = require('../../../models/Transcript');
const Student = require('../../../models/Student');
const Course = require('../../../models/Course');


// Create a new transcript
exports.createTranscript = async (req, res) => {
  try {
    const {
      studentId,
      regulation,
      completedCourses
    } = req.body;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const existingTranscript = await Transcript.findOne({ studentId });
    if (existingTranscript) {
      return res.status(400).json({ message: 'Transcript for this student already exists' });
    }

    // نتأكد إن كل الكورسات موجودة
    for (let course of completedCourses) {
      const existingCourse = await Course.findById(course.courseId);
      if (!existingCourse) {
        return res.status(404).json({ message: `Course ${course.courseId} not found` });
      }
    }

    const transcript = new Transcript({
      studentId,
      regulation,
      completedCourses
    });

    await transcript.calculateGPA();

    await transcript.save();

    res.status(201).json({
      message: 'Transcript created successfully',
      data: transcript
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//add list of transcripts
exports.createTranscripts = async (req, res) => {
  try {
    const transcriptsToInsert = [];

    for (const t of req.body) {
      // تحقق لو الطالب موجود بالفعل
      const existing = await Transcript.findOne({ studentId: t.studentId });
      if (!existing) {
        const transcript = new Transcript(t);

        // حساب GPA و level و completedCredits
        await transcript.calculateGPA();

        // أخذ البيانات بدون _id لتجنب duplicate key error
        const { _id, ...data } = transcript.toObject();
        transcriptsToInsert.push(data);
      }
    }

    if (transcriptsToInsert.length === 0) {
      return res.status(400).json({ message: "All students already have transcripts." });
    }

    // الآن نحفظ كل البيانات دفعة واحدة
    const insertedTranscripts = await Transcript.insertMany(transcriptsToInsert);

    res.status(201).json({
      message: "Transcripts created successfully",
      data: insertedTranscripts
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//add course to transcript
exports.addCoursesToTranscript = async (req, res) => {
  try {
    const { transcriptId } = req.params;
    const { completedCourses } = req.body;

    const transcript = await Transcript.findById(transcriptId);
    if (!transcript) {
      return res.status(404).json({ message: 'Transcript not found' });
    }

    // نتأكد إن كل الكورسات موجودة
for (let course of completedCourses) {

  const existingCourse = await Course.findById(course.courseId);

  if (!existingCourse) {
    return res.status(404).json({ 
      message: `Course ${course.courseId} not found` 
    });
  }

  const alreadyExists = transcript.completedCourses.some(c => 
    (c.courseId.toString() === course.courseId &&
    c.semesterId === course.semesterId)||
    c.status === "passed"
  );

  if (alreadyExists) {
    return res.status(400).json({ 
      message: `Course ${course.courseId} already exists in transcript for the same semester` 
    });
  }
}



    transcript.completedCourses.push(...completedCourses);

    await transcript.calculateGPA();

    await transcript.save();

    res.status(200).json({
      message: 'Courses added successfully',
      data: transcript
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//edit course grade in transcript
exports.updateCourseGradeInTranscript = async (req, res) => {
  try {
    const { transcriptId, courseId } = req.params;
    const { grade } = req.body;

    if (grade === undefined) {
      return res.status(400).json({ message: "Grade is required" });
    }

    const transcript = await Transcript.findById(transcriptId);
    if (!transcript) {
      return res.status(404).json({ message: "Transcript not found" });
    }

    const course = transcript.completedCourses.find(
      c => c.courseId === courseId
    );

    if (!course) {
      return res.status(404).json({ message: "Course not found in transcript" });
    }

    course.grade = grade;

    await transcript.calculateGPA();

    await transcript.save();

    res.status(200).json({
      message: "Course grade updated successfully",
      data: transcript
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a transcript by student ID
exports.getTranscriptByStudentId = async (req, res) => {
  try {
    const { studentId } = req.params;
    const transcript = await Transcript.findOne({ studentId }).populate('completedCourses.courseId').populate('studentId', 'studentName');
    if (!transcript) {
      return res.status(404).json({ message: 'Transcript not found' });
    }
    
    res.status(200).json(transcript);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all transcripts
exports.getAllTranscripts = async (req, res) => {
  try {    const transcripts = await Transcript.find().populate('studentId', 'studentName');
    res.status(200).json(transcripts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a transcript
exports.updateTranscript = async (req, res) => {
  try {
    const { id } = req.params;

    const {  regulation } = req.body;

    const transcript = await Transcript.findById(id);
    if (!transcript) {
      return res.status(404).json({ message: "Transcript not found" });
    }

    if (regulation !== undefined) transcript.regulation = regulation;

    await transcript.save();

    res.status(200).json({
      message: "Transcript updated successfully",
      data: transcript,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a transcript
exports.deleteTranscript = async (req, res) => {
  try {    const { id } = req.params;
    const transcript = await Transcript.findByIdAndDelete(id);
    if (!transcript) {
      return res.status(404).json({ message: 'Transcript not found' });
    }
    res.status(200).json({ message: 'Transcript deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


