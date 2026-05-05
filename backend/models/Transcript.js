const mongoose = require("mongoose");

const transcriptSchema = new mongoose.Schema({
  studentId: { type: String, required: true, ref: "Student" },
  department: {
    type: String,
    trim: true,
    default: "ECE",
    enum: ["ECE"],
  },
  GPA: { type: Number, default: 0, min: 0.0, max: 4.0 },
  completedCredits: { type: Number, default: 0 },
  
  coreCompletedCredits: { type: Number, default: 0 },
  electiveProgramCompletedCredits: { type: Number, default: 0 },
  elective1CompletedCredits: { type: Number, default: 0 },
  elective2CompletedCredits: { type: Number, default: 0 },
  elective3CompletedCredits: { type: Number, default: 0 },
  engEconomyCompletedCredits: { type: Number, default: 0 },
  projectManagementElectiveCompletedCredits: { type: Number, default: 0 },

  engPhysicsCompletedCredits: { type: Number, default: 0 },
  engMathCompletedCredits: { type: Number, default: 0 },
  graduationProjectCompletedCredits: { type: Number, default: 0 },
  trainingCompletedCredits: { type: Number, default: 0 },
  
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

  allowedCredits: { type: Number, default: 18 },
  totalAlerts: { type: Number, default: 0 },
  alerts: { type: Number, default: 0 },
  atRisk: { type: Boolean, default: false },
});

transcriptSchema.methods.calculateGPA = async function () {
  await this.populate("completedCourses.courseId");

  let totalGradePoints = 0;
  let totalCreditsForGPA = 0;

  // تصفير عدادات الساعات المجتازة لإعادة الحساب بدقة
  this.coreCompletedCredits = 0;
  this.electiveProgramCompletedCredits = 0;
  this.elective1CompletedCredits = 0;
  this.elective2CompletedCredits = 0;
  this.elective3CompletedCredits = 0;
  this.engEconomyCompletedCredits = 0;
  this.projectManagementElectiveCompletedCredits = 0;
  this.engPhysicsCompletedCredits = 0;
  this.engMathCompletedCredits = 0;
  this.graduationProjectCompletedCredits = 0;
  this.trainingCompletedCredits = 0;
  this.completedCredits = 0;

  // 1. استخلاص آخر محاولة لكل مادة فقط (تجنب التكرار في المقام)
  const lastAttemptsMap = {};
  this.completedCourses.forEach((course) => {
    if (course.courseId) {
      lastAttemptsMap[course.courseId._id.toString()] = course;
    }
  });

  const uniqueCourses = Object.values(lastAttemptsMap);

  uniqueCourses.forEach((course) => {
    const credits = course.courseId.courseCredits || 0;
    const courseType = course.courseId.courseType;
    const courseStatus = course.status;

    // 2. حساب الساعات المجتازة (للمواد الناجحة فقط)
    if (courseStatus === "passed") {
      this.completedCredits += credits;
      
      switch (courseType) {
        case "Core": this.coreCompletedCredits += credits; break;
        case "Program Elective": this.electiveProgramCompletedCredits += credits; break;
        case "General Elective 1": this.elective1CompletedCredits += credits; break;
        case "General Elective 2": this.elective2CompletedCredits += credits; break;
        case "General Elective 3": this.elective3CompletedCredits += credits; break;
        case "Engineering Economy Elective": this.engEconomyCompletedCredits += credits; break;
        case "Project Management Elective": this.projectManagementElectiveCompletedCredits += credits; break;
        case "Engineering Physics Elective": this.engPhysicsCompletedCredits += credits; break;
        case "Engineering Mathematics Elective": this.engMathCompletedCredits += credits; break;
        case "graduation-project": this.graduationProjectCompletedCredits += credits; break;
        case "training": this.trainingCompletedCredits += credits; break;
      }
    }

    // 3. حساب النقاط للمعدل (حتى لو راسب تدخل في الـ GPA بآخر درجة)
    let courseGPA = 0;
    if (course.grade >= 93) courseGPA = 4.0;
    else if (course.grade >= 89) courseGPA = 3.7;
    else if (course.grade >= 86) courseGPA = 3.3;
    else if (course.grade >= 83) courseGPA = 3.0;
    else if (course.grade >= 80) courseGPA = 2.7;
    else if (course.grade >= 76) courseGPA = 2.3;
    else if (course.grade >= 73) courseGPA = 2.0;
    else if (course.grade >= 70) courseGPA = 1.7;
    else if (course.grade >= 67) courseGPA = 1.3;
    else if (course.grade >= 65) courseGPA = 1.0;
    else courseGPA = 0.0;

    // النقاط = (نقاط المادة * عدد ساعاتها)
    totalGradePoints += (courseGPA * credits);
    // المقام = مجموع ساعات آخر محاولة لكل المواد (سواء نجاح أو رسوب)
    totalCreditsForGPA += credits;
  });

  // 4. الحساب النهائي للـ GPA
  this.GPA = totalCreditsForGPA > 0 ? totalGradePoints / totalCreditsForGPA : 0;
  this.GPA = parseFloat(this.GPA.toFixed(2));

  // تحديث المستوى (Level) بناءً على الساعات المجتازة فقط (Passed)
  if (this.regulation === "New") {
    if (this.completedCredits >= 165) this.level = "graduated";
    else if (this.completedCredits >= 120) this.level = "senior";
    else if (this.completedCredits >= 90) this.level = "junior";
    else if (this.completedCredits >= 30) this.level = "sophomore";
    else this.level = "freshman";
  } else {
    if (this.completedCredits >= 180) this.level = "graduated";
    else if (this.completedCredits >= 135) this.level = "senior-2";
    else if (this.completedCredits >= 90) this.level = "senior-1";
    else if (this.completedCredits >= 60) this.level = "junior";
    else if (this.completedCredits >= 30) this.level = "sophomore";
    else this.level = "freshman";
  }

  // منطق التنبيهات الأكاديمية
  if (this.GPA < 2.0) {
    this.alerts += 1;
    this.totalAlerts += 1;
  } else {
    this.alerts = 0;
    this.atRisk = false;
  }

  if (this.alerts >= 3) this.atRisk = true;

  await this.save();
};

module.exports = mongoose.model("Transcript", transcriptSchema);