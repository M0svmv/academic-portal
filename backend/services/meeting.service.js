const AdvisingList = require("../models/AdvisingList");
const Semester = require("../models/Semester");
const Meeting = require("../models/Meeting");

const {
  validateMeetingRequest,
} = require("../utils/meeting.utils");

const { getCurrentSemester } = require("../utils/semester.utils");

exports.requestMeeting = async (studentId, meetingData) => {

  const [advisor, currentSemester]= await Promise.all([
    AdvisingList.findOne({
    "students.student": studentId,
  }).select("advisor -_id"), getCurrentSemester()
  ])

  if (!advisor || !currentSemester) {
    const error = new Error(
      "Advisor or current semester not found"
    );
    error.statusCode = 404;
    throw error;
  }

  validateMeetingRequest(meetingData);

  const meeting = new Meeting({
    advisorId: advisor.advisor,
    studentId,
    semesterId: currentSemester._id,
    meetingDate: meetingData.meetingDate,
    meetingTime: meetingData.meetingTime,
    meetingNotes: meetingData.meetingNotes || "",
  });

  await meeting.save();

  return {
    message: "Meeting request sent successfully",
    meeting,
  };
};