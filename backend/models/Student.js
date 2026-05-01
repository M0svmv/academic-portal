const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    studentName: {
      type: String,
      required: true,
      trim: true,
    },

    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
    },
    studentPhone:{
        type: String,
    },
    studentEmail:{
        type: String,
        unique: false,
        lowercase: true,
        sparse: true
    },

    roles: [
      {
        type: String,
        enum: ["student"],
        default: "student",
      },
    ],
  },
  { timestamps: true }
);

studentSchema.virtual("transcript", {
  ref: "Transcript",
  localField: "_id",
  foreignField: "studentId",
  justOne: true 
});

studentSchema.virtual("enrollment", {
  ref: "Enrollment",
  localField: "_id",
  foreignField: "studentId",
  justOne: true 
});

studentSchema.set("toObject", { virtuals: true });
studentSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Student", studentSchema);