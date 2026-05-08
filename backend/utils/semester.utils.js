const Semester = require("../models/Semester");

exports.getCurrentSemester = async () => {
  
  return await Semester.findOne({ isCurrent: true });

};

exports.getLatestSemester = async () => {
  return await Semester.findOne().sort({ endDate: -1 });
};