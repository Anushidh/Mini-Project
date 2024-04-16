const Cart = require('../model/cartModel');
const Coupon = require('../model/couponModel');
const voucherCode = require('voucher-code-generator')

const findAllCoupons = async () => {
  try {
    // console.log('1');
      const result = await Coupon.find();
      // console.log(result);
      return result;
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
  
    // console.log(`Unique coupon code generated: ${couponCode}`);
  
    if (couponData.discountAmount > 50) {
      throw new Error('Discount amount cannot exceed 50');
    }
  
    const coupon1 = new Coupon({
      couponName: couponData.couponName,
      couponCode: couponCode, // Use the generated couponCode here
      discount: couponData.discountAmount,
      expiryDate: couponData.endDate,
      createdOn: couponData.startDate
    });
  
    // console.log(coupon1.couponCode);
    await coupon1.save();
    return coupon1._id;
  } catch (error) {
    throw error;
  }
};



// const addCouponToDb = async (couponData) => {
//   try {
   
//     let couponCode;
//     let unique = false;
//          // Keep generating a coupon code until it is unique
//     while (!unique) {
//       couponCode = voucherCode.generate({
//         length: 6,
//         count: 1,
//         charset: voucherCode.charset("alphabetic")
//       })[0];

//       // Check if the generated coupon code already exists in the database
//       const existingCoupon = await Coupon.findOne({ couponCode });

//       if (!existingCoupon) {
//         unique = true; // Exit the loop if the coupon code is unique
//       }
//     }
//     // console.log(couponCode);
//       const coupon =  new Coupon({
//           couponName: couponData.couponName,
//           couponCode: couponCode,
//           discount: couponData.discountAmount,
//           expiryDate: couponData.endDate,
//           createdOn: couponData.startDate
//       });

//       await coupon.save();
//       // console.log('3');
//       return coupon._id;
//   } catch (error) {
//       throw error;
//   }
// };

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