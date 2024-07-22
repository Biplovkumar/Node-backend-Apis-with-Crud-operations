// middleware/validateObjectId.js
const mongoose = require('mongoose');

const validateObjectId = (req, res, next) => {
    const { id } = req.params;
    const validID = mongoose.Types.ObjectId.isValid(id);
    if (!validID) {
        return res.status(400).json({ result: 'Enter a valid ID' });
    }
    next();
};

module.exports = validateObjectId;
