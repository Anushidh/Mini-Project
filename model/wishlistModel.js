const mongoose = require('mongoose');

const wishlistSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true
    },

    products: [
        {
            productItemId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'products',
                required: true
            },
            size: {
                type: String, 
                required: true
            }
        }
    ]
},
{
    timestamps: true
});

module.exports = new mongoose.model("Wishlist", wishlistSchema);
