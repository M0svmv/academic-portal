const Announcement = require("../../../models/announcement");
const AdvisingList = require("../../../models/AdvisingList");
const Semester = require("../../../models/Semester");
const Staff = require("../../../models/Staff");

// Create a new announcement
exports.createAnnouncement = async (req, res) => {
  try {
    const currentSemester = await Semester.findOne({ isCurrent: true });
    if (!currentSemester) {
      return res.status(400).json({ message: "No current semester found" });
    }
    const { title, content,type, target="all", advisingListId = "",expiresAt,targetIds=[] } = req.body;
    const staffId = req.user._id;
    const announcement = new Announcement({
      staffId: req.user._id,
      semesterId: currentSemester._id,
      title,
      content,
      target: target,
      targetIds,
      advisingListId,
      type,
      expiresAt,
    });

    
    await announcement.save();
    res.status(201).json(announcement);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.makeAnnouncementToStudent = async (req, res) => {
  try {
    const { title, content, type, expiresAt, studentsIds=[] } = req.body;

    const currentSemester = await Semester.findOne({ isCurrent: true });
    

    if (!title || !content) {
      return res.status(400).json({ message: "Title and content are required" });
    }

    const student = await Student.find({ _id: { $in: studentsIds } });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const created = await Announcement.create({
      staffId: req.user._id,
      title,
      content,
      type,
      expiresAt,
      targetIds: studentsIds,
      target: "specificStudents",
      semesterId: currentSemester._id
    });

    res.status(201).json({
      message: "Announcement sent successfully",
      data: created
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// update an announcement
exports.updateAnnouncement = async (req, res) => {
  try {
    const { announcementId } = req.params;
    const { title, content, type, expiresAt } = req.body;

    const announcement = await Announcement.findOne({
      _id: announcementId,
      staffId: req.user._id
    });

    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    if (title) announcement.title = title;
    if (content) announcement.content = content;
    if (type) announcement.type = type;
    if (expiresAt) announcement.expiresAt = expiresAt;

    await announcement.save();

    res.status(200).json({
      message: "Announcement updated successfully",
      data: announcement
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// delete an announcement
exports.deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const announcement = await Announcement.findOneAndDelete({ _id: id, staffId: req.user._id });
    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }
    res.status(200).json({ message: "Announcement deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// get all announcements
exports.getAllAnnouncements = async (req, res) => {
    try {
        const currentSemester = await Semester.findOne({ isCurrent: true });
        let announcements = [];
        if (currentSemester) {
            announcements = await Announcement.find({ staffId: req.user._id, target:{ $in: ["all", "advisingList", "specificStudents"]}, semesterId: currentSemester._id }).populate("staffId", "staffName").populate("targetIds", "studentName");
        }
        res.status(200).json(announcements.sort((a, b) => b.createdAt - a.createdAt));
    }catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// get announcements for a specific advising list
exports.getAnnouncementsForAdvisingList = async (req, res) => {
  try {
    const advisingList = await AdvisingList.findById(req.params.id);
    const currentSemester = await Semester.findOne({ isCurrent: true });
    let announcements = [];
    if (advisingList) {
      announcements = await Announcement.find({ advisingListId: advisingList._id, target:"advisingList", semesterId: currentSemester._id }).populate("staffId", "staffName");
    }
    res.status(200).json(announcements.sort((a, b) => b.createdAt - a.createdAt));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};