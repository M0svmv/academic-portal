module.exports = (...allowedRoles) => {
    return (req, res, next) => {
        const userRoles = req.user.roles;

        const hasRole = userRoles.some(role => allowedRoles.includes(role));
        if (!hasRole) {
            return res.status(403).json({ message: 'Forbidden: You do not have the required role(s) to access this resource' });
        }

        next();
    }
}