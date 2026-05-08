const Student = require("../../../models/Student");
const Transcript = require("../../../models/Transcript");
const Enrollment = require("../../../models/Enrollment");
const Semester = require("../../../models/Semester");
const SemesterWork = require("../../../models/SemesterWork");
const AdvisingList = require("../../../models/AdvisingList");
const bcrypt = require("bcryptjs");



const studentService = require("../../../services/student.service");

// Create a new student
exports.createStudent = async (req, res) => {
  try {
    const { _id, studentName, username, password,studentPhone,studentEmail } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);
    const student = new Student({
      _id,
      studentName,
      username,
      password: hashedPassword,
      studentPhone: studentPhone || undefined,
      studentEmail: studentEmail || undefined,
      roles: ["student"],
    });
    await student.save();
    const transcript = new Transcript({ studentId: student._id });
    await transcript.save();
    const semester = await Semester.findOne({ isCurrent: true });
    if(semester){
      const enrollment = new Enrollment({ studentId: student._id , semesterId: semester._id });
    await enrollment.save();
    }else{
      const semester = await Semester.findOne().sort({ endDate: -1 });
      const enrollment = new Enrollment({ studentId: student._id,semesterId: semester._id });
      await enrollment.save();
    }
    
    res.status(201).json({ message: "Student created successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

//add list of students
exports.createStudents = async (req, res) => {
  try {
    const students = req.body;
    const semester = await Semester.findOne({ isCurrent: true });
    if (!semester) {
    const semester = await Semester.findOne().sort({ endDate: -1 });
    }
    const transcripts = [];
    const enrollments = [];

    for (let student of students) {
      const transcript = new Transcript({ studentId: student._id });
      transcripts.push(transcript);
      const enrollment = new Enrollment({ studentId: student._id,semesterId: semester._id });
      enrollments.push(enrollment);
      student.roles = ["student"];
      student.password = await bcrypt.hash(student.password, 10);
    }

    await Student.insertMany(students);
    await Transcript.insertMany(transcripts);
    await Enrollment.insertMany(enrollments);

    res.status(201).json({ message: "Students created successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Get all students
exports.getAllStudents = async (req, res) => {
  try {
    const students = await Student.find();
    res.status(200).json(students);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

//get all students data
exports.getAllStudentsData = async (req, res) => {
  try {
    const transcripts = await Transcript.find()
      .populate("studentId", "studentName studentPhone studentEmail username")
      .select(
        "department completedCredits studentId level regulation alerts atRisk GPA ",
      );
    res.status(200).json(transcripts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Get students that don't have a transcript
exports.getStudentsWithoutTranscript = async (req, res) => {
  try {
    const transcripts = await Transcript.find().select("studentId");
    const studentsWithoutTranscript = await Student.find({
      _id: { $nin: transcripts.map((t) => t.studentId) },
    }).select("-password");
    res.status(200).json(studentsWithoutTranscript);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Get a student by ID
exports.getStudentById = async (req, res) => {
  try {
    const student = await studentService.getStudent(req.params.id);
    res.status(200).json(student);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Get a student details by ID
exports.getStudentDetailsById = async (req, res) => {
  try {

    
    const studentDetails = await studentService.getStudentDetails(req.params.id)
    const {semester, transcript, advisor, semesterWorks} = studentDetails
    
    res.status(200).json({
      semester,  
      transcript,
      advisor,
      semesterWorks
      
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a student
exports.updateStudent = async (req, res) => {
  try {
    const { studentName, username, password, studentPhone, studentEmail } =
      req.body;
    
    const student = await Student.findOne({ _id: req.params.id });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    if(studentName)student.studentName = studentName;
    if(username)student.username = username;
    if(studentPhone)student.studentPhone = studentPhone;
    if(studentEmail)student.studentEmail = studentEmail;

    if (password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    student.password = hashedPassword;
    }
    await student.save();
    res.status(200).json({ message: "Student updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Delete a student
exports.deleteStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    await Promise.all([
      SemesterWork.deleteMany({ studentId: req.params.id }),
      Enrollment.deleteMany({ studentId: req.params.id }),
      Transcript.deleteMany({ studentId: req.params.id }),
      Student.findByIdAndDelete(req.params.id),
      AdvisingList.findOneAndUpdate({ "students.student": req.params.id }, { $pull: { students: { student: req.params.id } } }),
    ]);

    res.status(200).json({ message: "Student deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};
