exports.validateWithdrawRequestData = (
  requestData
) => {
  const {withdrawalReason,courseId} = requestData;

  if (!courseId ||!withdrawalReason) {
    const error = new Error(
      "Missing required fields"
    );

    error.statusCode = 400;

    throw error;
  }
};