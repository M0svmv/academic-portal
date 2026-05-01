const Staff = require('../../../models/Staff');
const AdvisingList = require('../../../models/AdvisingList');
const Student = require('../../../models/Student');
const Transcript = require('../../../models/Transcript');

// Create a new advising list
exports.createAdvisingList = async (req, res) => {
    try {
        const advisingList = new AdvisingList(req.body);
        await advisingList.save();
        res.status(201).json(advisingList);
    } catch (error) {

        res.status(500).json({ message: "Error creating advising list" });
    }
};

//assign student to advising list
exports.assignStudentToAdvisingList = async (req, res) => {
    try{
        const {_id, studentId} = req.body;
        const advisingList = await AdvisingList.findById(_id);
        const lists = await AdvisingList.find();
        const student = await Student.findById(studentId);
        if(!student){
            return res.status(404).json({ message: "Student not found" });
        }
        if(!advisingList){
            return res.status(404).json({ message: "Advising list not found" });
        }

        if(lists.some(list => list.students.includes(studentId))){
            return res.status(400).json({ message: "Student already assigned to advising list" });
        }
        
        advisingList.students.push(studentId);
await advisingList.save();
        res.status(200).json(advisingList);
    }catch(error){
        console.error(error);
        res.status(500).json({ message: error.message });

    }
}

//assign list of students to advising list
exports.assignStudentsToAdvisingList = async (req, res) => {
  try {
    const { _id, students } = req.body;

    // ✅ extract ids
    const studentIds = students.map(s => s.student);

    // ✅ get current list
    const advisingList = await AdvisingList.findById(_id);
    if (!advisingList) {
      return res.status(404).json({ message: "Advising list not found" });
    }

    // ✅ get other lists only
    const otherLists = await AdvisingList.find({
      _id: { $ne: _id }
    });

    // ✅ check if exists in another list
    const alreadyAssigned = otherLists.some(list =>
      list.students.some(s =>
        studentIds.includes(s.student)
      )
    );

    if (alreadyAssigned) {
      return res.status(400).json({
        message: "Some students are already assigned to another advising list"
      });
    }

    // ✅ prevent duplicates in same list
    const existingStudents = advisingList.students.map(s => s.student);

    const newStudents = studentIds
      .filter(id => !existingStudents.includes(id))
      .map(id => ({ student: id }));

    if (newStudents.length === 0) {
      return res.status(400).json({
        message: "All students already exist in this advising list"
      });
    }

    // ✅ add correctly
    advisingList.students.push(...newStudents);
    await advisingList.calculateStudentsCount();

    await advisingList.save();

    res.status(200).json({
      message: "Students assigned successfully",
      data: advisingList
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// assign advisor to advising list
exports.assignAdvisorToAdvisingList = async (req, res) => {
  try {

    const { _id, advisorId } = req.body;

    const advisingList = await AdvisingList.findById(_id);

    if (!advisingList) {
      return res.status(404).json({
        message: "Advising list not found"
      });
    }

    const advisor = await Staff.findOne({
      _id: advisorId,
      roles: "academic-advisor"
    });

    if (!advisor) {
      return res.status(400).json({
        message: "Staff member is not an academic advisor"
      });
    }

    advisingList.advisor = advisorId;

    await advisingList.save();

    res.status(200).json({
      message: "Advisor assigned successfully",
      advisingList
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: error.message
    });

  }
};

// Create a new advisor
exports.createAdvisor = async (req, res) => {
  try {
    const { _id } = req.body;

    const staff = await Staff.findByIdAndUpdate(
      _id,
      { $addToSet: { roles: "academic-advisor" } }, 
      { new: true }
    ).select("-password");

    if (!staff) {
      return res.status(404).json({
        message: "Staff member not found"
      });
    }

    res.status(200).json({
      message: "Advisor role assigned successfully",
      staff
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all advisors
exports.getAllAdvisors = async (req, res) => {
    try {
        const advisors = await Staff.find({ roles: 'academic-advisor' }).select('staffName email phone');
        const count = advisors.length;
        res.status(200).json({advisorsCount:count,
          advisors:advisors});
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// Get all non-advisors
exports.getAllNonAdvisors = async (req, res) => {
    try {
        const nonAdvisors = await Staff.find({ roles: { $ne: 'academic-advisor' } }).select('staffName username email phone roles');
        const count = nonAdvisors.length; 
        res.status(200).json({nonAdvisorsCount:count,
          nonAdvisors:nonAdvisors});
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// Get an advisor by ID
exports.getAdvisorById = async (req, res) => {
  try {
    const advisor = await Staff.findById(req.params.id);
    if (!advisor) {
      return res.status(404).json({ message: 'Advisor not found' });
    }
    res.status(200).json(advisor);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

//get advising list by ID
exports.getAdvisingList = async (req, res) => {
  try {

    const list = await AdvisingList.findById(req.params.id)
      .populate("advisor", "staffName email")
      .populate({path:"students",populate:{path:"student",select: "studentName studentId"}});

    if (!list) {
      return res.status(404).json({
        message: "Advising list not found"
      });
    }

    res.status(200).json(list);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//get advising list for advisor
exports.getAdvisingListForAdvisor = async (req, res) => {
  try {

    const list = await AdvisingList.findOne({ advisor: req.params.id })
  .populate("advisor", "staffName email")
  .populate({
    path: "students",
    populate: {
      path: "student",
      select: "studentName studentId",
      populate: {
        path: "transcript",
        select: "GPA completedCredits level regulation alerts atRisk"
      }
    }
  });

    if (!list) {
      return res.status(404).json({
        message: "Advising list not found"
      });
    }

    res.status(200).json(list);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//get all advising lists
exports.getAllAdvisingLists = async (req, res) => {
  try {
    const lists = await AdvisingList.find().populate("advisor", "staffName email").select("-students");
    
    res.status(200).json(lists);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
//remove student from advising list
exports.removeStudentFromAdvisingList = async (req, res) => {
  try {
    const { _id, studentId } = req.body;
    const advisingList = await AdvisingList.findById(_id);
    if (!advisingList) {
      return res.status(404).json({ message: "Advising list not found" });
    }
    advisingList.students = advisingList.students.filter((student) => student.student !== studentId);
    advisingList.studentsCount = advisingList.students.length;
    await advisingList.save();
    res.status(200).json(advisingList);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

//get students aren't assigned to any advising list
exports.getUnassignedStudents = async (req, res) => {
  try {
    const lists = await AdvisingList.find().select("students");
    const assignedStudents = lists.flatMap((list) => list.students.map((student) => student.student));
    const unassignedStudents = await Transcript.find({ studentId: { $exists: true }, studentId: { $nin: assignedStudents } }).populate('studentId', 'studentName studentId studentEmail').select('GPA completedCredits level studentId regulation');
    res.status(200).json(unassignedStudents);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};



