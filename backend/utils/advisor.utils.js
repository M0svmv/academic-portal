const AdvisingList = require("../models/AdvisingList");

exports.getStudentAdvisor = async (studentId) => {
  const doc = await AdvisingList.findOne({
    "students.student": studentId,
  }).select("advisor -_id");

  return doc?.advisor || null;
};