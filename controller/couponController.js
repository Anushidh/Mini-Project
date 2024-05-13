const Coupon = require('../model/couponModel');
const Cart = require('../model/cartModel');
const Order = require('../model/orderModel');
const couponHelper = require('../helper/couponHelper');
const cartHelper = require('../helper/cartHelper');
const userHelper = require('../helper/userHelper');

const getCouponPage = async (req, res) => {
  try {
    const page = req.query.page || 1;
    const limit = 7;
    const skip = (page - 1) * limit;

    const couponsCount = await couponHelper.countCoupons();
    const allCoupons = await couponHelper.findAllCoupons(skip, limit);

    for (let i = 0; i < allCoupons.length; i++) {
      if (allCoupons[i].expiryDate) {
        allCoupons[i].discount = cartHelper.currencyFormat(allCoupons[i].discount);
        allCoupons[i].expiryDate = dateFormat(allCoupons[i].expiryDate);
      }
    }

    const totalPages = Math.ceil(couponsCount / limit);

    res.render('admin/coupon', {
      coupons: allCoupons,
      currentPage: page,
      totalPages: totalPages,
    });
  } catch (error) {
    console.error(error);
  }
};

const addCoupon = async (req, res) => {
  try {
    const existingCoupon = await Coupon.findOne({ couponName: req.body.couponName });
    if (existingCoupon) {
      return res.status(400).json({ message: 'A coupon with the same name already exists' });
    }
    if(req.body.couponAmount > 20) {
      return res.status(400).json({ message: 'Discount cannot be greater than 20' });
    }
    const coupon = await couponHelper.addCouponToDb(req.body)
    res.status(200).json({ message: 'coupon added successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

const editCoupon = async (req, res) => {
  try {
    const { couponId, couponName, createdOn, expiryDate, discount } = req.body;
    if (!couponId || !couponName || !createdOn || !expiryDate || discount === undefined || !discount) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (discount > 20) {
      return res.status(400).json({ message: 'Discount cannot be greater than 20' });
    }
    const existingCoupon = await Coupon.findById(couponId);
    if (!existingCoupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }
    const sameNameCoupon = await Coupon.findOne({ couponName, _id: { $ne: couponId } });
    if (sameNameCoupon) {
      return res.status(400).json({ message: 'A coupon with the same name already exists' });
    }
    const updatedCouponData = {
      couponName,
      createdOn,
      expiryDate,
      discount,
    };
    const coupon = await Coupon.findByIdAndUpdate(couponId, updatedCouponData, {
      new: true,
      runValidators: true,
    });
    res.status(200).json({ message: 'Coupon updated successfully', coupon });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

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
    let couponApplied;
    const userId = req.session.user._id;
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found for this user' });
    }
    req.session.originalTotal = cart.totalPrice;
    console.log(req.session.originalTotal);
    const couponCode = req.body.couponCode;
    const coupon = await Coupon.findOne({ couponCode });
    if (!coupon) {
      return res.status(400).json({ success: false, message: 'Invalid coupon code' });
    } else {
      req.session.coupon = couponCode;
    }
    if (req.session.coupon) {
      if (cart.totalPrice <= 500) {
        return res.status(400).json({ success: false, message: 'Minimum purchase amount not met for this coupon' });
      }
      if (coupon.expiryDate < new Date()) {
        return res.status(400).json({ success: false, message: 'Coupon has expired' });
      }
      if (coupon.usedBy.includes(userId)) {
        return res.status(400).json({ success: false, message: 'Coupon has already been used' });
      }
      const discountAmount = (cart.totalPrice * coupon.discount) / 100; 
      cart.totalPrice -= discountAmount;
      console.log(cart.totalPrice);
      cart.coupon = couponCode;
      couponApplied = req.session.coupon;
      await Coupon.updateOne({ couponCode }, { $push: { usedBy: userId } });
      await cart.save();
      return res.status(200).json({ success: true, message: 'Coupon applied successfully', cart, session: req.session, couponApplied });
    }
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
    const couponCode = req.session.coupon;
    const coupon = await Coupon.findOne({ couponCode });
    if (!coupon) {
      return res.status(400).json({ success: false, message: 'Invalid coupon code' });
    }
    if (cart.coupon !== couponCode) {
      return res.status(400).json({ success: false, message: 'Coupon is not applied to this cart' });
    }
    cart.totalPrice = req.session.originalTotal;
    cart.coupon = null;
    req.session.coupon = null;
    await Coupon.updateOne({ couponCode }, { $pull: { usedBy: userId } });
    await cart.save();
    return res.status(200).json({ success: true, message: 'Coupon removed successfully', cart, session: req.session });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
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
  editCoupon,
}