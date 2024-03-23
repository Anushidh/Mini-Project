const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Replace 'User' with your actual user schema name
        
    },
    items: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
        },
        quantity: {
            type: Number,
            min: 1
        },
        size: {
            type: String,
            default:"Small",
            enum: ["Small", "Medium", "Large"] // Replace with full names
        }
    }],
    coupon:{
        type:String,
        default:null  
    },
    totalPrice: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

module.exports = new mongoose.model('Cart', cartSchema);
