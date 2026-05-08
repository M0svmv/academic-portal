exports.buildAnnouncementQuery = ({
  studentId,
  advisingList,
  courseIds,
  studentLevel,
}) => {
  const now = new Date();

  return {
    $and: [
      {
        $or: [
          { target: "all" },

          ...(advisingList
            ? [
                {
                  target: "advisingList",
                  advisingListId:
                    advisingList._id,
                },
              ]
            : []),

          {
            target: "specificStudents",
            targetIds: { $in: [studentId] },
          },

          ...(courseIds.length > 0
            ? [
                {
                  target: "course",
                  courseId: {
                    $in: courseIds,
                  },
                },
              ]
            : []),

          ...(studentLevel
            ? [
                {
                  target: "level",
                  level: studentLevel,
                },
              ]
            : []),
        ],
      },

      {
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: null },
          { expiresAt: { $gt: now } },
        ],
      },
    ],
  };
};