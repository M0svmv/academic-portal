const CourseOffering = require('../../../models/courseOffering');
const Course = require('../../../models/Course');
const Semester = require('../../../models/Semester');
const Enrollment = require('../../../models/Enrollment');
const SemesterWork = require('../../../models/SemesterWork');


// Create a new course offering
exports.createCourseOffering = async (req, res) => {
  try {
    const { courseId } = req.body;
    const semester = await Semester.findOne({ isCurrent: true });
    const existingCourse = await Course.findById(courseId);
    if (!existingCourse) {
      return res.status(404).json({ message: 'Course not found' });
    }


    const courseOffering = new CourseOffering(
      {
        _id: courseId + '-' + semester._id,
        courseId,
        semesterId: semester._id
      }
    );

    await courseOffering.save();
    res.status(201).json(courseOffering);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }};

//create list of course offerings 
exports.createCourseOfferings = async (req, res) => {
  try {
    const semester = await Semester.findOne({ isCurrent: true });
    const courses = await Course.find();
    const courseOfferings = courses.map(course => ({
      _id: course._id + '-' + semester._id,
      courseId: course._id,
      semesterId: semester._id
    }));
    await CourseOffering.insertMany(courseOfferings);
    res.status(201).json({ message: 'Course offerings created successfully' });
    
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all course offerings
exports.getAllCourseOfferings = async (req, res) => {
  try {   
    const semester = await Semester.findOne({ isCurrent: true }); 
    const semesterId = semester._id;
    const courseOfferings = await CourseOffering.find({ semesterId }).populate('courseId', 'courseName').populate('instructorId', 'staffName').populate('taId', 'staffName');
    

    res.status(200).json(courseOfferings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }};

// Get a course offering by ID
exports.getCourseOfferingById = async (req, res) => {
  try {
    const courseOffering = await CourseOffering.findById(req.params.id);
    if (!courseOffering) {
      return res.status(404).json({ message: 'Course offering not found' });
    }
    res.status(200).json(courseOffering);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a course offering
exports.updateCourseOffering = async (req, res) => {
  try {
    const courseOffering = await CourseOffering.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!courseOffering) {
      return res.status(404).json({ message: 'Course offering not found' });
    }
    res.status(200).json(courseOffering);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Update course offering status
exports.updateCourseOfferingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const courseOfferingId = req.params.id;

    if (status === 'closed') {

      // 1️⃣ هات كل الـ enrollments اللي فيها الكورس ده
      const enrollments = await Enrollment.find({
        "courses.courseOfferingId": courseOfferingId
      });

      // 2️⃣ loop عليهم وعدلهم
      for (let enrollment of enrollments) {

        // شيل الكورس من الليست
        const updatedCourses = enrollment.courses.filter(
          c => c.courseOfferingId.toString() !== courseOfferingId
        );

        // هات الكريدتس بتاع الكورس
        const offering = await CourseOffering.findById(courseOfferingId)
          .populate("courseId", "courseCredits");

        const credits = offering?.courseId?.courseCredits || 0;

        // حدث البيانات
        enrollment.courses = updatedCourses;
        enrollment.currentEnrolledCredits -= credits;

        await enrollment.save();
      }

      const courseOffering = await CourseOffering.findById(courseOfferingId);



      // 3️⃣ احذف من SemesterWork
      await SemesterWork.deleteMany({
        courseId: (await CourseOffering.findById(courseOfferingId)).courseId
      });

      // 4️⃣ صفر عدد المسجلين
      await CourseOffering.findByIdAndUpdate(courseOfferingId, {
        enrolledCount: 0
      });
    }

    // 🔥 update status
    const courseOffering = await CourseOffering.findByIdAndUpdate(
      courseOfferingId,
      { status },
      { new: true }
    );

    if (!courseOffering) {
      return res.status(404).json({ message: 'Course offering not found' });
    }

    res.status(200).json(courseOffering);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};



// Delete a course offering
exports.deleteCourseOffering = async (req, res) => {
  try {    const courseOffering = await CourseOffering.findByIdAndDelete(req.params.id);
    if (!courseOffering) {
      return res.status(404).json({ message: 'Course offering not found' });
    }
    res.status(200).json({ message: 'Course offering deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// assign course instructor
exports.assignInstructor = async (req, res) => {
  try {

    const { courseOfferingId } = req.params;
    const { instructorId } = req.body;

    const courseOffering = await CourseOffering.findByIdAndUpdate(
      courseOfferingId,
      { instructorId },
      { new: true }
    ).populate('instructorId', 'staffName');

    if (!courseOffering) {
      return res.status(404).json({ message: 'Course offering not found' });
    }

    res.status(200).json({
      message: 'Instructor assigned successfully',
      data: courseOffering
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
exports.assignTa = async (req, res) => {
  try {

    const { courseOfferingId } = req.params;
    const { taId } = req.body;

    const courseOffering = await CourseOffering.findByIdAndUpdate(
      courseOfferingId,
      { taId },
      { new: true }
    ).populate('taId', 'staffName');

    if (!courseOffering) {
      return res.status(404).json({ message: 'Course offering not found' });
    }

    res.status(200).json({
      message: 'TA assigned successfully',
      data: courseOffering
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};










