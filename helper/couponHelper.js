const Cart = require('../model/cartModel');
const Coupon = require('../model/couponModel');
const voucherCode = require('voucher-code-generator')

const findAllCoupons = async () => {
  try {
    console.log('1');
      const result = await Coupon.find();
      // console.log(result);
      return result;
  } catch (error) {
      throw error;
  }
};


const addCouponToDb = async (couponData) => {
  try {
   
      // console.log('2');
      let couponCode = voucherCode.generate({
          length: 6,
          count: 1,
          charset: voucherCode.charset("alphabetic")
      });
    // console.log(couponCode);
      const coupon =  new Coupon({
          couponName: couponData.couponName,
          couponCode: couponCode[0],
          discount: couponData.discountAmount,
          expiryDate: couponData.endDate,
          createdOn: couponData.startDate
      });

      await coupon.save();
      // console.log('3');
      return coupon._id;
  } catch (error) {
      throw error;
  }
};

const deleteSelectedCoupon = async (couponId) => {
  try {
    console.log('inside deleteselectedcoupon');
      let result = await Coupon.findOneAndDelete({ _id: couponId });
      console.log(result);
      return result;
  } catch (error) {
      throw error;
  }
};


module.exports = {
  addCouponToDb,
  findAllCoupons,
  deleteSelectedCoupon,

}