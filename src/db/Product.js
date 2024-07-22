const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true }, // Required field
    price: { type: Number, required: false }, // Required field
    category: { type: String, required: false }, // Optional field
    userId: { type: String, required: false }, // Optional field
    company: { type: String, required: false }, // Optional field
    quantity: { type: Number, required: false }, // Optional field
    description: { type: String, required: false }, // Optional field
    rating: { type: Number, required: false }, // Optional field
    returnPolicy: { type: String, required: false }, // Optional field
    warranty: { type: String, required: false }, // Optional field
    thumbnail: { type: String, required: false }, // Optional field
    images: { type: [String], required: false }, // Optional field (Array of Strings)
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Product", productSchema);