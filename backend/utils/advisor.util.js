const AdvisingList = require("../models/AdvisingList");

exports.getAdvisorByStudent = async (studentId) => {
  const doc = await AdvisingList.findOne({
    "students.student": studentId,
  }).select("advisor -_id");

  return doc?.advisor || null;
};