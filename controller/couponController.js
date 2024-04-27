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
    console.log(req.body);
    // Check if a coupon with the same name already exists
    const existingCoupon = await Coupon.findOne({ couponName: req.body.couponName });
    if (existingCoupon) {
      return res.status(400).json({ message: 'A coupon with the same name already exists' });
    }
    const coupon = await couponHelper.addCouponToDb(req.body)
    console.log(coupon);
    res.status(200).json({ message: 'coupon added successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

const editCoupon = async (req, res) => {
  try {
    console.log('inside editcoupon');
    const { couponId, couponName, createdOn, expiryDate, discount } = req.body;
    console.log(req.body);
    // Check if any required field is missing
    if (!couponId || !couponName || !createdOn || !expiryDate || discount === undefined || !discount) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if the discount amount is greater than 50
    if (discount > 50) {
      return res.status(400).json({ message: 'Discount amount should be less than or equal to 50' });
    }

    // Check if a coupon with the provided id exists
    const existingCoupon = await Coupon.findById(couponId);
    if (!existingCoupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }
    // Check if another coupon with the same name exists
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
    console.log(coupon);
   
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
    console.log('inside applycoupon');
    let couponApplied;
    const userId = req.session.user._id;
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found for this user' });
    }
    // Store the original total price before applying the coupon
    req.session.originalTotal = cart.totalPrice;

    const couponCode = req.body.couponCode;
    const coupon = await Coupon.findOne({ couponCode });
    if (!coupon) {
      return res.status(400).json({ success: false, message: 'Invalid coupon code' });
    } else {
      req.session.coupon = couponCode;
    }

    if (req.session.coupon) {
      if (cart.totalPrice < coupon.minimumPurchaseAmount) {
        return res.status(400).json({ success: false, message: 'Minimum purchase amount not met for this coupon' });
      }
      if (coupon.expiryDate < new Date()) {
        return res.status(400).json({ success: false, message: 'Coupon has expired' });
      }
      if (coupon.usedBy.includes(userId)) {
        return res.status(400).json({ success: false, message: 'Coupon has already been used' });
      }

      // Apply the coupon discount
      cart.totalPrice -= coupon.discount;
      cart.coupon = couponCode;
      couponApplied = req.session.coupon;

      await Coupon.updateOne({ couponCode }, { $push: { usedBy: userId } });
      await cart.save();
      console.log(cart);
      return res.status(200).json({ success: true, message: 'Coupon applied successfully', cart, session: req.session, couponApplied });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const removeCoupon = async (req, res) => {
  try {
    console.log('inside removecoupon');
    const userId = req.session.user._id;
    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found for this user' });
    }

    const couponCode = req.session.coupon;
    const coupon = await Coupon.findOne({ couponCode });
    console.log(coupon);

    if (!coupon) {
      return res.status(400).json({ success: false, message: 'Invalid coupon code' });
    }

    if (cart.coupon !== couponCode) {
      return res.status(400).json({ success: false, message: 'Coupon is not applied to this cart' });
    }

    // Remove the coupon from the cart
    cart.totalPrice = req.session.originalTotal; // Restore the original total price
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


// const applyOrRemoveCoupon = async (req, res) => {
//   try {
//     const userId = req.session.user._id;
//     const cart = await Cart.findOne({ user: userId });
//     if (!cart) {
//       return res.status(404).json({ success: false, message: 'Cart not found for this user' });
//     }
//     const couponCode = req.body.couponCode;


//     if (!couponCode) {
//       return res.status(400).json({ success: false, message: 'Coupon code is required' });
//     }


//     const coupon = await Coupon.findOne({ couponCode });

//     if (!coupon) {
//       return res.status(400).json({ success: false, message: 'Invalid coupon code' });
//     }


//     if (cart.coupon === couponCode) {

//       cart.totalPrice += coupon.discount;
//       req.session.updatedTotal = cart.totalPrice;

//       cart.coupon = null;
//       req.session.coupon = null;

//       await Coupon.updateOne({ couponCode }, { $pull: { usedBy: userId } });
//       await cart.save();
//       return res.status(200).json({ success: true, message: 'Coupon removed successfully', cart, session: req.session });
//     } else {

//       if (cart.totalPrice < coupon.minimumPurchaseAmount) {
//         return res.status(400).json({ success: false, message: 'Minimum purchase amount not met for this coupon' });
//       }
//       if (coupon.expiryDate < new Date()) {
//         return res.status(400).json({ success: false, message: 'Coupon has expired' });
//       }
//       if (coupon.usedBy.includes(userId)) {
//         return res.status(400).json({ success: false, message: 'Coupon has already been used' });
//       }


//       cart.totalPrice -= coupon.discount;
//       req.session.updatedTotal = cart.totalPrice;
//       cart.coupon = couponCode;
//       req.session.coupon = couponCode;

//       await Coupon.updateOne({ couponCode }, { $push: { usedBy: userId } });
//       await cart.save();
//       // req.session.coupon = null
//       return res.status(200).json({ success: true, message: 'Coupon applied successfully', cart, session: req.session });
//     }
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ success: false, message: 'Internal server error' });
//   }
// };








// const applyCoupon = async (req, res) => {
//   try {
//     console.log('1');
//     const userId = req.session.user._id;
//     const minAmount = 1000;
//     console.log(userId);
//     const couponCode = req.body.couponCode;
//     console.log(couponCode);
//     const cart = await Cart.findOne({ user: userId });
//     if (!cart) {
//       return res.status(404).json({ success: false, message: 'Cart not found for this user' });
//     }
//     if (cart.totalPrice <= minAmount) {
//       return res.status(400).json({ success: false, message: 'Only applicable to purchases greater than 1000'})
//     }
//     // const existingOrder = await Order.findOne({ user: userId });
//     // if (existingOrder) {
//     //   return res.status(400).json({ success: false, message: 'Coupon not applicable for existing users' });
//     // }
//     const coupon = await Coupon.findOne({ couponCode });
//     if (!coupon || coupon.expiryDate < new Date() || coupon.usedBy.includes(userId)) {
//       return res.status(400).json({ success: false, message: 'Invalid coupon code or expired' });
//     }
//     cart.totalPrice -= coupon.discount;
//     req.session.updatedTotal = cart.totalPrice;
//     cart.coupon = couponCode;
//     await Promise.all([cart.save(), coupon.updateOne({ $push: { usedBy: userId } })]);
//     return res.status(200).json({ success: true, message: 'Coupon applied successfully', cart });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ success: false, message: 'Internal server error' });
//   }
// };

// const removeCoupon = async (req, res) => {
//   try {
//     const userId = req.session.user._id;
//     const cart = await Cart.findOne({ user: userId });
//     if (!cart) {
//       return res.status(404).json({ success: false, message: 'Cart not found for this user' });
//     }
//     const couponCode = cart.coupon;
//     console.log(couponCode);
//     const coupon = await Coupon.findOne({ couponCode });
//     if (coupon) {
//       const discountAmount = coupon.discount;
//       req.session.updatedTotal += discountAmount;
//     }
//     cart.totalPrice = req.session.updatedTotal;
//     cart.coupon = null;
//     await Promise.all([
//       cart.save(),
//       Coupon.updateOne({ couponCode: couponCode }, { $pull: { usedBy: userId } })
//     ]);
//     res.status(200).json({ success: true, message: 'Coupon removed successfully', cart: cart });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, message: 'Internal server error' });
//   }
// };

function dateFormat(date) {
  return date.toISOString().slice(0, 10)
}


module.exports = {
  getCouponPage,
  addCoupon,
  deleteCoupon,
  // applyOrRemoveCoupon,
  applyCoupon,
  removeCoupon,
  editCoupon,
}