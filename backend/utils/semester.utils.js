const Semester = require("../models/Semester");

exports.getCurrentSemester = async () => {
  
  return await Semester.findOne({ isCurrent: true });

};

exports.getLatestSemester = async () => {
  const semesters = await Semester.find().sort({ endDate: 1 });
  console.log(semesters);
  return semesters[0];
  
};