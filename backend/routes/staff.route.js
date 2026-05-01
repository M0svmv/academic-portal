const express = require('express');
const router = express.Router();
const staffAuthController = require('../controllers/staff/staffAuth.controller');
const staffController = require('../controllers/staff/programCoordinator/staff.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleCheckMiddleware = require('../middlewares/role.middleware');
const staffProfileController = require('../controllers/staff/staffProfile.controller');

// Staff login
router.post('/login', staffAuthController.staffLogin);

router.get('/me', authMiddleware, roleCheckMiddleware('coordinator', 'lecturer', 'ta', 'admin', 'academic-advisor'), staffProfileController.getStaffProfile);

router.put('/me', authMiddleware, roleCheckMiddleware('coordinator', 'lecturer', 'ta', 'admin', 'academic-advisor'), staffProfileController.updateStaff);
// Create a new staff member
router.post('/', staffController.createStaff);

// Create multiple staff members
router.post('/list',authMiddleware,roleCheckMiddleware('coordinator', 'admin'),  staffController.createStaffMembers);

// Get all staff members
router.get('/',authMiddleware,roleCheckMiddleware('coordinator', 'admin'),  staffController.getAllStaff);

// Get a staff member by ID
router.get('/:id',authMiddleware,roleCheckMiddleware('coordinator', 'admin'),  staffController.getStaffById);

// Update a staff member
router.put('/:id', staffController.updateStaff);

// Delete a staff member
router.delete('/:id',authMiddleware,roleCheckMiddleware('coordinator', 'admin'), staffController.deleteStaff);

module.exports = router;