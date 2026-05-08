exports.validateMeetingRequest = (meetingData) => {
  const { meetingDate, meetingTime } = meetingData;

  if (!meetingDate || !meetingTime) {
    const error = new Error(
      "Meeting date and time are required"
    );
    error.statusCode = 400;
    throw error;
  }
};