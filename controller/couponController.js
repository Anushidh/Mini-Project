const Coupon = require('../model/couponModel');
const Cart = require('../model/cartModel');
const Order = require('../model/orderModel');
const couponHelper = require('../helper/couponHelper');
const cartHelper = require('../helper/cartHelper');
const userHelper = require('../helper/userHelper');

const getCouponPage = async (req, res) => {
  try {
    let allCoupons = await couponHelper.findAllCoupons()
    for (let i = 0; i < allCoupons.length; i++) {
      if (allCoupons[i].expiryDate) {
        allCoupons[i].discount = cartHelper.currencyFormat(allCoupons[i].discount)
        allCoupons[i].expiryDate = dateFormat(allCoupons[i].expiryDate)
      }
    }
    res.render('admin/coupon', { coupons: allCoupons })
  } catch (error) {
    console.error(error);
  }
}

const addCoupon = async (req, res) => {
  try {
    const coupon = await couponHelper.addCouponToDb(req.body)
    res.status(200).redirect('/admin/coupons')
  } catch (error) {
    console.error(error);
  }
}

const deleteCoupon = async (req, res) => {
  try {
    const result = await couponHelper.deleteSelectedCoupon(req.params.id);
    res.json({ message: "coupon deleted successfully" });
  } catch (error) {
    console.error(error);
  }
};


const applyCoupon = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const couponCode = req.body.couponCode;
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found for this user' });
    }
    const existingOrder = await Order.findOne({ user: userId });
    if (existingOrder) {
      return res.status(400).json({ success: false, message: 'Coupon not applicable for existing users' });
    }
    const coupon = await Coupon.findOne({ couponCode });
    if (!coupon || coupon.expiryDate < new Date() || coupon.usedBy.includes(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid coupon code or expired' });
    }
    cart.totalPrice -= coupon.discount;
    req.session.updatedTotal = cart.totalPrice;
    cart.coupon = couponCode;
    await Promise.all([cart.save(), coupon.updateOne({ $push: { usedBy: userId } })]);
    return res.status(200).json({ success: true, message: 'Coupon applied successfully', cart });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const removeCoupon = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found for this user' });
    }
    const couponCode = cart.coupon;
    console.log(couponCode);
    const coupon = await Coupon.findOne({ couponCode });
    if (coupon) {
      const discountAmount = coupon.discount;
      req.session.updatedTotal += discountAmount;
    }
    cart.totalPrice = req.session.updatedTotal;
    cart.coupon = null;
    await Promise.all([
      cart.save(),
      Coupon.updateOne({ couponCode: couponCode }, { $pull: { usedBy: userId } })
    ]);
    res.status(200).json({ success: true, message: 'Coupon removed successfully', cart: cart });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

function dateFormat(date) {
  return date.toISOString().slice(0, 10)
}


module.exports = {
  getCouponPage,
  addCoupon,
  deleteCoupon,
  applyCoupon,
  removeCoupon,
}