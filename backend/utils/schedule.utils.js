exports.validateCurrentSemesterSchedule = (
  currentSemester
) => {
  if (
    !currentSemester ||
    !currentSemester.settings
      ?.announceSchedule
  ) {
    const error = new Error(
      "لم يتم نشر جدول المقررات للفصل الدراسي الحالي حتى الآن، يرجى المحاولة لاحقًا"
    );

    error.statusCode = 404;

    throw error;
  }
};