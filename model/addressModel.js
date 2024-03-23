const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

const addressSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    house: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    state: {
        type: String,
        required: true
    },
    pincode: {
        type: Number,
        required: true
    },
    userId: {
        type: ObjectId,
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Address', addressSchema);
