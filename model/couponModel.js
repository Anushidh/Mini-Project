const mongoose = require('mongoose')

const couponSchema = mongoose.Schema({
    couponName :{
        type: String,
        require : true
    },
    couponCode : {
        type : String,
        require : true,
        unique : true,
        uppercase: true
    },
    discount:{
        type:Number,
        require:true,
        min:0,
        max:100
    },
    createdOn : {
        type : Date,
        require : true
    },
    expiryDate:{
        type:Date,
        require:true
    },
    usedBy:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:'users'
        }
    ],
    isActive:{
        type:String,
        enum : ['Active','Expired'],
        default: 'Active'
    },   
},

{
    timestamps:true
}
)


//checking whether coupon is active or not
couponSchema.pre('save',function(next){
    const now=new Date();
    if(this.expiryDate<now){
        this.isActive="Expired";
    }else{
        this.isActive="Active";
    }
    next();
})

module.exports = new mongoose.model("Coupon",couponSchema)