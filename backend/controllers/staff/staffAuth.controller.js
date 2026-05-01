const Staff = require('../../models/Staff');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');


exports.staffLogin = async (req, res) => {
    try {
    const { username, password } = req.body;
    const staff = await Staff.findOne({ username });

    if (!staff) {
        return res.status(401).json({ message: 'Invalid username or password' });
    }
    const isMatch = await bcrypt.compare(password, staff.password);
    if (!isMatch) {
        return res.status(401).json({ message: 'Invalid username or password' });
    }
    const token = jwt.sign({ _id: staff._id, roles: staff.roles }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    res.status(200).json({ token });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}