const Course = require('../../../models/Course');

// Create a new course
exports.createCourse = async (req, res) => {
  try {
    const { _id, courseName, courseCredits, courseLevel, courseRegulation, courseType,prerequisiteCourses=[] } = req.body;

    const newCourse = new Course({
      _id,
      courseName,
      courseCredits,
      courseLevel,
      courseRegulation,
      courseType,
      prerequisiteCourses
    });

    await newCourse.save();

    res.status(201).json({ message: 'Course created successfully', data: newCourse });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Create list of courses
exports.createCourses = async (req, res) => {
  try {
    const courses = await Course.insertMany(req.body);
    res.status(201).json({ message: 'Courses created successfully', data: courses });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Get all courses
exports.getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find();
    res.status(200).json(courses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Get a course by Code
exports.getCourseById = async (req, res) => {
  try {
    const course = await Course.findOne({ _id: req.params.id });

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.status(200).json(course);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Update course
exports.updateCourse = async (req, res) => {
  try {
    if (req.body._id!== req.params.id) {
      return res.status(400).json({ message: 'Course ID cannot be updated' });
    }
    const updatedCourse = await Course.findOneAndUpdate(
       { _id: req.params.id },
      req.body,
      { new: true }
    );

    if (!updatedCourse) {
      return res.status(404).json({ message: 'Course not found' });
    }
    

    res.status(200).json({ message: 'Course updated successfully', data: updatedCourse });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Delete course
exports.deleteCourse = async (req, res) => {
  try {
    const deletedCourse = await Course.findOneAndDelete({ _id: req.params.id });

    if (!deletedCourse) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.status(200).json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};