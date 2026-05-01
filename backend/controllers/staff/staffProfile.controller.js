const Staff = require('../../models/Staff');
const bcrypt = require('bcryptjs');

exports.getStaffProfile = async (req, res) => {
    try {
        const staff = await Staff.findById(req.user._id).select('-password');
        if (!staff) {
            return res.status(404).json({ message: 'Staff member not found' });
        }
        res.status(200).json(staff);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

exports.updateStaff = async (req, res) => {
  try {
    const { staffName, password, phone, email } = req.body;

    const staff = await Staff.findById(req.user._id);

    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    // ✅ update only if exists
    if (staffName) staff.staffName = staffName;
    if (phone) staff.phone = phone;
    if (email) staff.email = email;
   

    // ✅ hash password only if provided
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      staff.password = hashedPassword;
    }

    await staff.save();

    const staffData = staff.toObject();
    delete staffData.password; // Remove password from the response

    res.status(200).json({
      message: 'Staff member updated successfully',
      data:staffData
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};