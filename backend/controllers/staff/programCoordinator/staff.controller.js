const Staff = require('../../../models/Staff');
const bcrypt = require('bcryptjs');

// Create a new staff member
exports.createStaff = async (req, res) => {
    try {
        const { _id, staffName, username, password, phone, email, roles } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const staff = new Staff({
            _id,
            staffName,
            username,
            email,
            phone,
            password: hashedPassword,
            roles
        });
        await staff.save();
        res.status(201).json({ message: 'Staff member created successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// Add list of staff members
exports.createStaffMembers = async (req, res) => {
    try {
        const staffMembers = req.body;
        for (let staff of staffMembers) {
      staff.password = await bcrypt.hash(staff.password, 10);
    }
        await Staff.insertMany(staffMembers);
        res.status(201).json({ message: 'Staff members created successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// Get all staff members
exports.getAllStaff = async (req, res) => {
    try {
        const staff = await Staff.find();
        res.status(200).json(staff);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// Get a staff member by ID
exports.getStaffById = async (req, res) => {
    try {
        const staff = await Staff.findById(req.params.id);
        if (!staff) {
            return res.status(404).json({ message: 'Staff member not found' });
        }
        res.status(200).json(staff);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// Update a staff member
exports.updateStaff = async (req, res) => {
  try {
    const { staffName, username, password, phone, email,roles } = req.body;

    const staff = await Staff.findById(req.params.id);

    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    // ✅ update only if exists
    if (staffName) staff.staffName = staffName;
    if (username) staff.username = username;
    if (phone) staff.phone = phone;
    if (email) staff.email = email;
    if (roles) staff.roles = roles;

    // ✅ hash password only if provided
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      staff.password = hashedPassword;
    }

    await staff.save();

    res.status(200).json({
      message: 'Staff member updated successfully',
      data: staff
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Delete a staff member
exports.deleteStaff = async (req, res) => {
    try {
        const staff = await Staff.findOneAndDelete({ _id: req.params.id });
        if (!staff) {
            return res.status(404).json({ message: 'Staff member not found' });
        }
        res.status(200).json({ message: 'Staff member deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};