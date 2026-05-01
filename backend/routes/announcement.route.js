const express = require("express");
const router = express.Router();
const announcementController = require("../controllers/staff/programCoordinator/announcement.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const roleCheckMiddleware = require("../middlewares/role.middleware");

// Create a new announcement
router.post(
    "/",
    authMiddleware,
    roleCheckMiddleware("coordinator","admin"),
    announcementController.createAnnouncement
);

// update an announcement
router.put(
    "/:announcementId",
    authMiddleware,
    roleCheckMiddleware("coordinator","admin"),
    announcementController.updateAnnouncement
);

// delete an announcement
router.delete(
    "/:id",
    authMiddleware,
    roleCheckMiddleware("coordinator","admin"),
    announcementController.deleteAnnouncement
);

//get all announcements
router.get(
    "/",
    authMiddleware,
    roleCheckMiddleware("coordinator","admin"),
    announcementController.getAllAnnouncements
);

//get announcements for a specific advising list
router.get(
    "/advising-list/:id",
    authMiddleware,
    roleCheckMiddleware("coordinator","admin"),
    announcementController.getAnnouncementsForAdvisingList
);

module.exports = router;