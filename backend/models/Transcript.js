const mongoose = require("mongoose");

const transcriptSchema = new mongoose.Schema({
  studentId: { type: String, required: true, ref: "Student" },
  department: {
    type: String,
    trim: true,
  },
  GPA: { type: Number, default: 0, MIN: 0.0, MAX: 4.0 },
  completedCredits: { type: Number, default: 0 },
  coreCompletedCredits: { type: Number, default: 0 },
  electiveProgramCompletedCredits: { type: Number, default: 0 },
  elective1CompletedCredits: { type: Number, default: 0 },
  elective2CompletedCredits: { type: Number, default: 0 },
  elective3CompletedCredits: { type: Number, default: 0 },
  engEconomyCompletedCredits: { type: Number, default: 0 },
  projectManagementElectiveCompletedCredits: { type: Number, default: 0 },

  engPhysicsCompletedCredits: { type: Number, default: 0 }, //engineering physics
  engMathCompletedCredits: { type: Number, default: 0 },
  graduationProjectCompletedCredits: { type: Number, default: 0 },
  trainingCompletedCredits: { type: Number, default: 0 }, //engineering math
  level: {
    type: String,

    enum: [
      "freshman",
      "sophomore",
      "junior",
      "senior",
      "senior-1",
      "senior-2",
      "graduated",
    ],
    default: "freshman",
  },
  department: { type: String, trim: true, enum: ["ECE"], default: "ECE" },
  regulation: {
    type: String,
    required: true,
    enum: ["Old", "last", "New"],
    default: "New",
  },
  completedCourses: [
    {
      courseId: { type: String, ref: "Course" },
      grade: { type: Number },
      semesterId: { type: String, ref: "Semester" },
      status: {
        type: String,
        required: true,
        enum: ["passed", "failed"],
        default: "passed",
      },
    },
  ],

  allowedCredits: {
    type: Number,
    default: 18,
  },

  alerts: {
    type: Number,
    default: 0,
  },

  atRisk: {
    type: Boolean,
    default: false,
  },
});

transcriptSchema.methods.calculateGPA = async function () {
  await this.populate("completedCourses.courseId");

  let totalGradePoints = 0;
  let totalCredits = 0;

  this.completedCourses.forEach((course) => {
    const credits = course.courseId.courseCredits;
    const courseType = course.courseId.courseType;
    switch (courseType) {
      case "Core":
        this.coreCompletedCredits += credits;
        break;

      case "Program Elective":
        this.electiveProgramCompletedCredits += credits;
        break;

      case "General Elective 1":
        this.elective1CompletedCredits += credits;
        break;

      case "General Elective 2":
        this.elective2CompletedCredits += credits;
        break;

      case "General Elective 3":
        this.elective3CompletedCredits += credits;
        break;

      case "Engineering Economy Elective":
        this.engEconomyCompletedCredits += credits;
        break;

      case "Project Management Elective":
        this.projectManagementElectiveCompletedCredits += credits;
        break;

      case "Engineering Physics Elective":
        this.engPhysicsCompletedCredits += credits;
        break;

      case "Engineering Mathematics Elective":
        this.engMathCompletedCredits += credits;
        break;

      case "graduation-project":
        this.graduationProjectCompletedCredits += credits;
        break;

      case "training":
        this.trainingCompletedCredits += credits;
        break;

      default:
        console.warn("Unknown course type:", courseType);
        break;
    }
    let courseGPA = 0;
    if (course.grade >= 93 && course.grade <= 100) {
      courseGPA = 4.0;
    } else if (course.grade >= 89 && course.grade <= 92) {
      courseGPA = 3.7;
    } else if (course.grade >= 86 && course.grade <= 88) {
      courseGPA = 3.3;
    } else if (course.grade >= 83 && course.grade <= 85) {
      courseGPA = 3.0;
    } else if (course.grade >= 80 && course.grade <= 82) {
      courseGPA = 2.7;
    } else if (course.grade >= 76 && course.grade <= 79) {
      courseGPA = 2.3;
    } else if (course.grade >= 73 && course.grade <= 75) {
      courseGPA = 2.0;
    } else if (course.grade >= 70 && course.grade <= 72) {
      courseGPA = 1.7;
    } else if (course.grade >= 67 && course.grade <= 69) {
      courseGPA = 1.3;
    } else if (course.grade >= 65 && course.grade <= 66) {
      courseGPA = 1.0;
    } else {
      courseGPA = 0.0;
    }
    totalGradePoints += courseGPA * credits;
    totalCredits += credits;
  });

  this.GPA = totalCredits > 0 ? totalGradePoints / totalCredits : 0;
  this.completedCredits = totalCredits;

  this.GPA = parseFloat(this.GPA.toFixed(2));

  if (this.regulation === "New") {
    if (this.completedCredits >= 165) {
      this.level = "graduated";
    } else if (this.completedCredits >= 120) {
      this.level = "senior";
    } else if (this.completedCredits >= 90) {
      this.level = "junior";
    } else if (this.completedCredits >= 30) {
      this.level = "sophomore";
    } else {
      this.level = "freshman";
    }
  }
  if (this.regulation === "last" || this.regulation === "Old") {
    if (this.completedCredits >= 180) {
      this.level = "graduated";
    } else if (this.completedCredits >= 135) {
      this.level = "senior-2";
    } else if (this.completedCredits >= 90) {
      this.level = "senior-1";
    } else if (this.completedCredits >= 60) {
      this.level = "junior";
    } else if (this.completedCredits >= 30) {
      this.level = "sophomore";
    } else {
      this.level = "freshman";
    }
  }

  if (this.GPA < 2.0) {
    this.alerts += 1;
  }

  if (this.alerts >= 3) {
    this.atRisk = true;
  }

  if (this.GPA >= 2.0) {
    this.alerts = 0;
    this.atRisk = false;
  }
  await this.save();
};

module.exports = mongoose.model("Transcript", transcriptSchema);
