const cartHelper = require("../helper/cartHelper");
const User= require("../model/userModel");
const Product = require("../model/productModel");
const Cart = require("../model/cartModel");
const express = require("express");
const ObjectId = require("mongoose").Types.ObjectId


const addToCart = async (req, res) => {
    try {
        // console.log('inside add to cart');
        const { prodId, quantity, size } = req.params;
        let user = req.session.user;
        // console.log(user);
        let response = await cartHelper.addToUserCart(user._id, prodId,quantity, size);
        // console.log('1');
        if (response) {
          // console.log('2');
          cartCount = await cartHelper.getCartCount(user._id)
          res.status(202).json({ status: "true", message: "product added to cart" })
        }
      } catch (error) {
      console.log(error);
        res.status(500).render('user/404');
      }
};

const userCart = async (req, res) => {
  try {
    let user = req.session.user;
    let totalandSubTotal = 0;
    let allCartItems = await cartHelper.getAllCartItems(user._id);
    cartCount = await cartHelper.getCartCount(user._id);
    // wishListCount = await wishlistHelper.getWishListCount(user._id)
    if(req.session.updatedTotal) {
      totalandSubTotal = req.session.updatedTotal;
    } 
    else {
      totalandSubTotal = await cartHelper.totalSubtotal(user._id, allCartItems);
      totalandSubTotal = cartHelper.currencyFormat(totalandSubTotal);
    }
    res.render('user/cart', { loginStatus : req.session.user, allCartItems, cartCount, totalAmount: totalandSubTotal, currencyFormat: cartHelper.currencyFormat });
  } catch (error) {
   console.log(error);
    res.status(500).render('user/404');
  }
}
      
const removeFromCart = (req, res) => {
  try {
    let cartId = req.body.cartId;
    let productId = req.params.id;
    let size = req.body.size;
    // console.log(cartId + " " + productId + " " + size);

    cartHelper.removeAnItemFromCart(cartId, productId, size)
      .then((response) => {
        res.status(202).json({ message: "sucessfully item removed" })
      })
  } catch (error) {
    
    res.status(500).render('user/404');
  }
}

// const getMaxQuantity = async (req, res) => {
//   console.log('inside getMaxQuantity');
//   const { itemId, size } = req.body.data;
//   console.log(itemId + " " + size);
//   try {
//       // Find the product by itemId
//       const product = await Product.findById(itemId);

//       if (!product) {
//           return res.status(404).json({ success: false, error: 'Product not found' });
//       }

//       // Find the size in the productSizes array
//       const sizeInfo = product.productSizes.find(s => s.size === size);

//       if (!sizeInfo) {
//           return res.status(404).json({ success: false, error: 'Size not found for this product' });
//       }

//       const maxQuantity = sizeInfo.quantity;

//       return res.status(200).json({ success: true, maxQuantity });
//   } catch (error) {
//       console.error('Error fetching max quantity:', error);
//       return res.status(500).json({ success: false, error: 'Internal server error' });
//   }
// };


const incDecQuantity = async (req, res) => {
  try {
    console.log('inside indecquantity');
    console.log(req.body.productId + " " + req.body.cartId + " " + req.body.quantity + " "  +req.body.selectedSize);
    let obj = {};
    let user = req.session.user;
    let productId = req.body.productId;
    let quantity = req.body.quantity;
    let cartId = req.body.cartId;
    let selectedSize = req.body.selectedSize;
    // Call getMaxQuantityForUser to get the updated quantity and existing quantity
    let { quantity: maxQuantityAllowed, existingQuantity } = await cartHelper.getMaxQuantityForUser(user._id, selectedSize, productId, quantity);
    console.log(maxQuantityAllowed);
    
    // Check if the total quantity exceeds the maximum allowed
    if (maxQuantityAllowed > 5) {
      throw new Error('Exceeds maximum quantity allowed');
    }
    // let maxQuantityAllowed = await cartHelper.getMaxQuantityForUser(user._id, selectedSize, productId, quantity);
    // console.log(maxQuantityAllowed);
    // if (maxQuantityAllowed > quantity) {
    //   throw new Error('Exceeds maximum quantity allowed');
    // }
    
    obj.quantity = await cartHelper.incDecProductQuantity(user._id, productId, quantity, selectedSize, maxQuantityAllowed);
    console.log(obj.quantity);

    let cartItems = await cartHelper.getAllCartItems(user._id)
    obj.totalAmount = await cartHelper.totalSubtotal(user._id, cartItems)
    obj.totalAmount = obj.totalAmount.toLocaleString('en-in', { style: 'currency', currency: 'INR' })
    // console.log(obj);

    res.status(202).json({ message: obj })

  } catch (error) {
    console.log(error);
    res.status(500).render('user/404');
  }
}



module.exports = {
  addToCart,
  userCart,
  removeFromCart,
  incDecQuantity,
  
}


