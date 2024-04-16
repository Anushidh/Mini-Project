const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        required: true
    },
    // parentCategory: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'Category'
    // },
    isBlocked:{
        type:Boolean,
        default:false
    }
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);
