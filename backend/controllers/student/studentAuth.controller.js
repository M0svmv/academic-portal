const Student = require('../../models/Student');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

exports.studentLogin = async (req, res) => {
    try {
    const { username, password } = req.body;
    const student = await Student.findOne({ username });

    if (!student) {
        return res.status(401).json({ message: 'Invalid username or password' });
    }
    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
        return res.status(401).json({ message: 'Invalid username or password' });
    }
    const token = jwt.sign({ _id: student._id, roles: student.roles }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    res.status(200).json({ token });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}