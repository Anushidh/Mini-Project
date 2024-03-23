const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    productName: {
        type: String,
        required: true,
        unique: true
    },
    productDescription: {
        type: String,
        required: true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    regularPrice: {
        type: Number,
        required: true
    },
    productSizes: [{
        size: {
            type: String,
            enum: ["Small", "Medium", "Large"], // Replace with full names
            required: true
        },
        quantity: {
            type: Number,
            required: true
        }
    }],
    salePrice: {
        type: Number,
        required: true
    },
    totalQuantity: {
        type: Number,
        default: 0 // Default value is set to 0
    },
    productImage: [{
        type: String
    }],
    isBlocked: {
        type: Boolean,
        default: false
    },
}, { timestamps: true });




module.exports = mongoose.model('Product', productSchema);
