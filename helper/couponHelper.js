const Cart = require('../model/cartModel');
const Coupon = require('../model/couponModel');
const voucherCode = require('voucher-code-generator')

const findAllCoupons = async (skip, limit) => {
  try {
    const result = await Coupon.find()
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }); // Sort by createdOn date in descending order
    return result;
  } catch (error) {
    throw error;
  }
};

const countCoupons = async () => {
  try {
    const count = await Coupon.countDocuments();
    return count;
  } catch (error) {
    throw error;
  }
};

const addCouponToDb = async (couponData) => {
  try {
    let couponCode;
    let existingCoupon;
    do {
      couponCode = voucherCode.generate({
        length: 6,
        count: 1,
        charset: voucherCode.charset("alphabetic")
      })[0];
      existingCoupon = await Coupon.findOne({ couponCode });
    } while (existingCoupon);
    if (couponData.discountAmount > 50) {
      throw new Error('Discount amount cannot exceed 50');
    }
    const coupon1 = new Coupon({
      couponName: couponData.couponName,
      couponCode: couponCode, 
      discount: couponData.discountAmount,
      expiryDate: couponData.endDate,
      createdOn: couponData.startDate
    });
    await coupon1.save();
    return coupon1._id;
  } catch (error) {
    throw error;
  }
};



const deleteSelectedCoupon = async (couponId) => {
  try {
      let result = await Coupon.findOneAndDelete({ _id: couponId });
      return result;
  } catch (error) {
      throw error;
  }
};


module.exports = {
  addCouponToDb,
  findAllCoupons,
  deleteSelectedCoupon,
  countCoupons,
}