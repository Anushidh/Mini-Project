const mongoose = require('mongoose')
const offerSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    startingDate: {
        type: Date,
        required: true
    },
    endingDate: {
        type: Date,
        required: true
    },
    categoryOffer: {
        category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
        offerStatus:{
            type: Boolean,
            default:false
        }
    },
    discount: { 
      type: Number 
    },
    status:{
        type: Boolean,
        default:true
    }
})

offerSchema.pre("save", function (next) {
    const currentDate = new Date();
    if (currentDate > this.endingDate) {
        this.status = false; 
    }
    next();
});


const categoryOffer = mongoose.model('categoryOffer', offerSchema);
module.exports = categoryOffer;