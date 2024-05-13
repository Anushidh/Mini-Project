const cartHelper = require("../helper/cartHelper");
const User = require("../model/userModel");
const Product = require("../model/productModel");
const Cart = require("../model/cartModel");
const Order = require("../model/orderModel");
const express = require("express");
const ObjectId = require("mongoose").Types.ObjectId
const Coupon = require('../model/couponModel');
const Wishlist = require('../model/wishlistModel');


const checkStock = async (req, res) => {
  try {
    console.log('inside checkstock');
    const { productId, size, quantity } = req.body;
    console.log(productId + " " + size + " " + quantity);
    // Find the product by ID
    const product = await Product.findById(productId);
    console.log(product);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Find the size variant
    const sizeVariant = product.productSizes.find(s => s.size === size);
    console.log(sizeVariant);
    if (!sizeVariant) {
      return res.status(404).json({ error: 'Size variant not found' });
    }
    console.log(sizeVariant.quantity);

    if (quantity <= sizeVariant.quantity) {
      // Stock is available, send success: true
      return res.json({ success: true, message: 'Stock is available.' });
    } else {
      return res.json({ success: false, message: `The requested quantity (${quantity}) is not available. Only ${sizeVariant.quantity} items left in stock for size ${size}.` });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const addToCart = async (req, res) => {
  try {
    console.log('inside addtocart');
    console.log(req.params);
    const { prodId, quantity, size } = req.params;
    const addedQuantity = parseInt(quantity);
    let user = req.session.user;
    const loggedIn = user;

    const isInWishlist = await Wishlist.findOne({
      user: user._id,
      'products.productItemId': prodId,
      'products.size': size,
    });

    if (isInWishlist) {
      await Wishlist.findOneAndUpdate(
        { user: user._id },
        { $pull: { products: { productItemId: prodId, size: size } } }
      );
    }

    const maxUser = 5;
    let cart = await Cart.findOne({ user: user._id });
    console.log(cart);
    if (!cart) {
      console.log('1');
      const product = await Product.findOne({ _id: prodId });
      if (!product || product.isBlocked) {
        return res
          .status(404)
          .json({ error: true, message: 'Product not found or blocked' });
      }
      const productSize = product.productSizes.find(
        (sizeObj) => sizeObj.size === size
      );
      if (addedQuantity > productSize.quantity) {
        return res
          .status(400)
          .json({
            error: true,
            message: 'Requested quantity exceeds available quantity',
          });
      }
      const totalPrice = product.salePrice * addedQuantity;
      cart = new Cart({ user: user._id, items: [] });
      cart.items.push({
        productId: prodId,
        quantity: addedQuantity,
        size,
        total: totalPrice,
      });
    } else {
      console.log('2');
      let existingItem = cart.items.find(
        (item) =>
          String(item.productId) === String(prodId) && item.size === size
      );
      if (existingItem) {
        console.log('inside existing item');
        const newQuantity = addedQuantity + existingItem.quantity;
        if (newQuantity > maxUser) {
          return res
            .status(400)
            .json({
              error: true,
              message: 'Requested quantity exceeds available quantity',
            });
        }
        const product = await Product.findOne({ _id: prodId });
        if (!product || product.isBlocked) {
          return res
            .status(404)
            .json({ error: true, message: 'Product not found or blocked' });
        }
        const productSize = product.productSizes.find(
          (sizeObj) => sizeObj.size === size
        );
        if (newQuantity > productSize.quantity) {
          return res
            .status(400)
            .json({
              error: true,
              message: 'Requested quantity exceeds available quantity',
            });
        }
        existingItem.quantity = newQuantity;
        existingItem.total = product.salePrice * newQuantity;
      } else {
        console.log('inside else case');
        const product = await Product.findOne({ _id: prodId });
        console.log('1');
        if (!product || product.isBlocked) {
          return res
            .status(404)
            .json({ error: true, message: 'Product not found or blocked' });
        }
        const productSize = product.productSizes.find(
          (sizeObj) => sizeObj.size === size
        );
        console.log('2');
        if (addedQuantity > productSize.quantity) {
          return res.status(400).json({ error: true, message: 'Requested quantity exceeds available quantity', });
        }
        console.log('3');
        const totalPrice = product.salePrice * addedQuantity;
        console.log('4');
        cart.items.push({
          productId: prodId,
          quantity: addedQuantity,
          size,
          total: totalPrice,
        });
      }
    }
    console.log('5');
    cart.totalPrice = cart.items.reduce((acc, curr) => acc + curr.total, 0);
    console.log('6');
    await cart.save();
    console.log('7');
    res.status(202).json({ status: 'true', message: 'product added to cart' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: true, message: error.message });
  }
};


const userCart = async (req, res) => {
  try {
    let couponApplied;
    couponApplied = req.session.coupon;
    let user = req.session.user;
    const userId = req.session.user._id;
    const loggedIn = user;
    let totalandSubTotal = 0;
    let allCartItems = await cartHelper.getAllCartItems(user._id);
    cartCount = await cartHelper.getCartCount(user._id);
    let cart = await Cart.findOne({ user: userId })
    let availableCoupons = await Coupon.find({
      expiryDate: { $gt: new Date() },
      usedBy: { $ne: user._id },
    });
    if (req.session.coupon) {
      totalandSubTotal = cart.totalPrice;
      await cart.save();
    }
    else {
      totalandSubTotal = await cartHelper.totalSubtotal(user._id, allCartItems);
      totalandSubTotal = cartHelper.currencyFormat(totalandSubTotal);
    }
    res.render('user/cart', { loggedIn, loginStatus: req.session.user, allCartItems, cartCount, totalAmount: totalandSubTotal, currencyFormat: cartHelper.currencyFormat, availableCoupons, couponApplied });
  } catch (error) {
    console.log(error);
    res.status(500).render('user/404', { loggedIn });
  }
}

const removeFromCart = async (req, res) => {
  try {
    let cartId = req.body.cartId;
    let productId = req.params.id;
    let size = req.body.size;
    const result = await cartHelper.removeAnItemFromCart(cartId, productId, size)
    if (result.modifiedCount > 0) {
      const updatedCart = await Cart.findById(cartId).populate('items.productId');
      const cartTotal = updatedCart.items.reduce((total, item) => {
        const product = item.productId;
        const itemTotal = product.price * item.quantity;
        return total + itemTotal;
      }, 0);
      res.status(202).json({ message: "Successfully item removed", cartTotal });
    } else {
      res.status(404).json({ message: "Item not found in cart" });
    }
  } catch (error) {
    res.status(500).render('user/404', { loggedIn });
  }
}


const incDecQuantity = async (req, res) => {
  try {
    let obj = {};
    let user = req.session.user;
    let productId = req.body.productId;
    let quantity = req.body.quantity;
    let cartId = req.body.cartId;
    let selectedSize = req.body.selectedSize;
    let { quantity: maxQuantityAllowed, existingQuantity } = await cartHelper.getMaxQuantityForUser(user._id, selectedSize, productId, quantity);
    if (maxQuantityAllowed > 5) {
      res.status(400).json({ message: 'Maximum quantity allowed is 5', success: false });
    }
    else {
      obj.quantity = await cartHelper.incDecProductQuantity(user._id, productId, quantity, selectedSize, maxQuantityAllowed);
      if (typeof obj.quantity === 'object' && obj.quantity.message === 'Stock exceeded') {
        res.status(400).json({ message: 'Stock exceeded', success: false });
        return;
      }
      await cartHelper.updateCartItemTotal(cartId, productId, obj.quantity, selectedSize);
      let cartItems = await cartHelper.getAllCartItems(user._id)
      obj.totalAmount = await cartHelper.totalSubtotal(user._id, cartItems)
      obj.totalAmount = obj.totalAmount.toLocaleString('en-in', { style: 'currency', currency: 'INR' })
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
  checkStock,
}


