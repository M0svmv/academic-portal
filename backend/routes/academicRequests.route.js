const express = require("express");
const router = express.Router();
const academicRequestsController = require("../controllers/staff/programCoordinator/academicRequests.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const roleCheckMiddleware = require("../middlewares/role.middleware");

// Get all approved academic requests for the current semester
router.get("/approved", authMiddleware, roleCheckMiddleware("coordinator", "admin"), academicRequestsController.getApprovedAcademicRequests);

// Get all academic requests for the current semester
router.get("/all", authMiddleware, roleCheckMiddleware("coordinator", "admin"), academicRequestsController.getAllAcademicRequests);


 module.exports = router;