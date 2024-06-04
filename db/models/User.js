const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    mobile: String,
    email: {
        type: String,
        required: true,
        minlength: 5,
        maxlength: 255,
        unique: true
    },
    password: String,
    profileImage: String,
    gender: String,
    dateOfBirth: String,
    address: String,
    zipcode: String,
});

module.exports = mongoose.model("users", userSchema);