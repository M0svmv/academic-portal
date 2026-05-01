const checkDuplicate = (Model, fields) => {
    return async (req, res, next) => {
 const conditions = fields.filter(field => req.body[field]).map(field => ({ [field]: req.body[field] }));
        if (conditions.length === 0) {
            return next();
        }
        try {
            const existing = await Model.findOne({ $or: conditions });
            if (existing) {
                const duplicateFields = [];
                fields.forEach(field => {
                    if ( req.body[field] && existing[field] === req.body[field]) {
                        duplicateFields.push(field);
                    }
                });
                return res.status(400).json({ message: `Duplicate ${duplicateFields.join(', ')} found` });
            }
            next();
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    };
};

module.exports = checkDuplicate;