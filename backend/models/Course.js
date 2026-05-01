const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    courseName: {
      type: String,
      required: true,
      trim: true,
    },
    courseCredits: {
      type: Number,
      required: true,
    },
    courseLevel: {
      type: String,
      required: true,
      enum: ["freshman", "sophomore", "junior","senior-1", "senior-2", "senior"],
    },
    courseRegulation: {
      type: String,
      required: true,
      trim: true,
      enum: ["New", "Last"],
      default: "New",
    },

    courseType: {
      type: String,
      required: true,
      enum: [
        "Core",
        "Program Elective",
        "General Elective 1",
        "General Elective 2",
        "General Elective 3",
        "Engineering Economy Elective",
        "Project Management Elective",
        "Engineering Physics Elective",
        "Engineering Mathematics Elective",
        "graduation-project",
        "training",
      ],
    },
    prerequisiteCourses: [
      {
        type: String,
        ref: "Course",
      },
    ],
  },

  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Course", courseSchema);
