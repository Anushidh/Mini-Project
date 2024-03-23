const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
  name: {
    type: String,
    required: true
},
email: {
    type: String,
    required: true,
    unique: true
},
phone: {
    type: Number,
    required: true,
},
password: {
    type: String,
    required: true
 },
isBlocked: {
    type: Boolean,
    default: false
},
isAdmin: {
    type: String,
    default: "0"
},
referralCode: {
    type: String,
},
}, { timestamps : true });

module.exports = mongoose.model("User", userSchema);
