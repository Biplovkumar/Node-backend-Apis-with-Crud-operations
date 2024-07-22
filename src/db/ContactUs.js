const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
    name: { type: String, required: true }, // Required field
    email: { type: String, required: true, match: /.+\@.+\..+/ }, // Required field with email format validation
    phone: { type: String, required: false }, // Optional field
    subject: { type: String, required: true }, // Required field
    description: { type: String, required: false }, // Optional field
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("contactus", contactSchema);