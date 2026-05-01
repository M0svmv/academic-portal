const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    try{
        const authHeader = req.headers.authorization;
        console.log('Authorization header:', authHeader);
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Authorization header missing or malformed' });
        }
        const token = authHeader.split(' ')[1];
        console.log('Extracted token:', token);
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded.roles.includes('student')) {
            return res.status(403).json({ message: 'Forbidden: You do not have the required role to access this resource' });
        }
        req.user = decoded;
        next();
    }catch (error) {
        res.status(401).json({ message: error.message});
    }}