const cartHelper = require("../helper/cartHelper");
const User = require("../model/userModel");
const Product = require("../model/productModel");
const Cart = require("../model/cartModel");
const Order = require("../model/orderModel");
const express = require("express");
const ObjectId = require("mongoose").Types.ObjectId
const Coupon = require('../model/couponModel');
const Wishlist = require('../model/wishlistModel');

const addToCart = async (req, res) => {
  try {
    // console.log('inside add to cart');
    const { prodId, quantity, size } = req.params;
    const addedQuantity = parseInt(quantity);
    console.log(req.params);
    let user = req.session.user;
    const loggedIn = user;
    // console.log(user);
    const isInWishlist = await Wishlist.findOne({
      user: user._id,
      'products.productItemId': prodId,
      'products.size': size
    });
    if (isInWishlist) {
      // Remove product from wishlist
      await Wishlist.findOneAndUpdate(
        { user: user._id },
        { $pull: { products: { productItemId: prodId, size: size } } }
      );
    }
    let response = await cartHelper.addToUserCart(user._id, prodId, addedQuantity, size);
    // console.log('1');
    if (response) {
      // console.log('2');
      cartCount = await cartHelper.getCartCount(user._id)
      res.status(202).json({ status: "true", message: "product added to cart" })
    }
  } catch (error) {
    console.log(error);
    res.status(500).render('user/404',{loggedIn});
  }
};

const userCart = async (req, res) => {
  try {
    let couponApplied;
    couponApplied = req.session.coupon;
    let user = req.session.user;
    const loggedIn = user;
    let totalandSubTotal = 0;
    let allCartItems = await cartHelper.getAllCartItems(user._id);
    cartCount = await cartHelper.getCartCount(user._id);

    let availableCoupons = await Coupon.find({
      expiryDate: { $gt: new Date() },
      usedBy: { $ne: user._id },
    });
    console.log(availableCoupons);

    if (req.session.updatedTotal) {
      totalandSubTotal = req.session.updatedTotal;
    }
    else {
      totalandSubTotal = await cartHelper.totalSubtotal(user._id, allCartItems);
      totalandSubTotal = cartHelper.currencyFormat(totalandSubTotal);
    }
    res.render('user/cart', { loggedIn, loginStatus: req.session.user, allCartItems, cartCount, totalAmount: totalandSubTotal, currencyFormat: cartHelper.currencyFormat, availableCoupons, couponApplied });
  } catch (error) {
    console.log(error);
    res.status(500).render('user/404',{loggedIn});
  }
}

const removeFromCart = (req, res) => {
  try {
    let cartId = req.body.cartId;
    let productId = req.params.id;
    let size = req.body.size;
    cartHelper.removeAnItemFromCart(cartId, productId, size)
      .then((response) => {
        res.status(202).json({ message: "sucessfully item removed" })
      })
  } catch (error) {
    res.status(500).render('user/404',{loggedIn});
  }
}


const incDecQuantity = async (req, res) => {
  try {
    // console.log('inside indecquantity');
    // console.log(req.body.productId + " " + req.body.cartId + " " + req.body.quantity + " " + req.body.selectedSize);
    let obj = {};
    let user = req.session.user;
    let productId = req.body.productId;
    let quantity = req.body.quantity;
    let cartId = req.body.cartId;
    let selectedSize = req.body.selectedSize;
    // Call getMaxQuantityForUser to get the updated quantity and existing quantity
    let { quantity: maxQuantityAllowed, existingQuantity } = await cartHelper.getMaxQuantityForUser(user._id, selectedSize, productId, quantity);
    // console.log(maxQuantityAllowed);
    // console.log(existingQuantity);
    // console.log('end of maxquantity');
    // Check if the total quantity exceeds the maximum allowed
    if (maxQuantityAllowed > 5) {
      console.log('Exceeds maximum quantity allowed');
      res.status(400).json({ message: 'Maximum quantity allowed is 5', success: false });
    }
    else {
      obj.quantity = await cartHelper.incDecProductQuantity(user._id, productId, quantity, selectedSize, maxQuantityAllowed);
      // console.log(obj.quantity);
      // Check if the "Stock exceeded" message is returned
      if (typeof obj.quantity === 'object' && obj.quantity.message === 'Stock exceeded') {
        res.status(400).json({ message: 'Stock exceeded', success: false });
        return;
      }
      await cartHelper.updateCartItemTotal(cartId, productId, obj.quantity, selectedSize);
      let cartItems = await cartHelper.getAllCartItems(user._id)
      // console.log(cartItems);
      obj.totalAmount = await cartHelper.totalSubtotal(user._id, cartItems)
      obj.totalAmount = obj.totalAmount.toLocaleString('en-in', { style: 'currency', currency: 'INR' })
      // console.log(obj);

      res.status(202).json({ message: obj, success: true });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message, success: false });
  }
}

const clearCart = async (req, res) => {
  try {
    const userId = req.session.user._id;
    console.log(userId);
    const deletedCart = await Cart.deleteOne({ user: userId });
    if (deletedCart.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Cart not found for this user' });
    }
    return res.status(200).json({ success: true, message: 'Cart deleted successfully' });
  } catch (error) {
    console.error('Error clearing cart:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

async function isCouponApplied(couponId, userId) {
  try {
    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      return false;
    }
    const isApplied = coupon.usedBy.some(usedUserId => String(usedUserId) === String(userId));
    return isApplied;
  } catch (error) {
    console.error('Error checking if coupon is applied:', error);
    return false;
  }
}


module.exports = {
  addToCart,
  userCart,
  removeFromCart,
  incDecQuantity,
  clearCart,
}


