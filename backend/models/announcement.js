const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({

  // 👤 creator
  staffId: { 
    type: String, 
    required: true, 
    ref: 'Staff' 
  },

  // 📝 content
  title: { 
    type: String, 
    required: true,
    trim: true
  },
  content: { 
    type: String, 
    required: true,
    trim: true
  },

  // 🧠 type
  type: {
    type: String,
    enum: ["general", "urgent", "event", "deadline", "warning"],
    default: "general"
  },

  // 🎯 targeting
  target: {
    type: String,
    enum: ["all", "advisingList", "specificStudents", "course", "level"],
    default: "all"
  },
  targetIds: [
    {
      type: String,
      ref: 'Student'
    }
  ],

  advisingListId: { 
    type: String, 
    ref: 'AdvisingList' 
  },
  semesterId: { 
    type: String, 
    ref: 'Semester' 
  },
  courseId: { 
    type: String, 
    ref: 'CourseOffering' 
  },
  level: { 
    type: String,  
  },



  // 📌 display options
  isPinned: {
    type: Boolean,
    default: false
  },

  // 🔔 notifications
  sendNotification: {
    type: Boolean,
    default: true
  },

  // ⏳ timing
  expiresAt: {
    type: Date
  },

  createdAt: { 
    type: Date, 
    default: Date.now 
  }

}, {
  timestamps: true // ممكن تخليها true لو عايز updatedAt تلقائي
});

module.exports =
  mongoose.models.Announcement ||
  mongoose.model("Announcement", announcementSchema);